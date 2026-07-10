# electermPlus 跨面板智能 —— 方案

> 目标:让 AI 运维助手从"只看终端输出"升级为**同时读取资源指标 + 数据库只读状态**,
> 做出单一数据源做不到的诊断结论(如"内存趋势平稳但 MySQL 全表扫描拖垮了磁盘 IO")。
> 这是本 fork 相对纯终端工具的核心差异化。

## 1. 现状与缺口

现有 Agent 已能:读终端上下文/输出、提命令(经审批执行)、管书签/标签。工具定义在
`agent-tools.js`(数组 `agentTools`),风险分级在 `command-policy.js`(`read` 级在 diagnose
模式免审批,其余需本地审批)。

缺口:AI **看不到**资源监控面板已经采集的 CPU/内存/磁盘/网络/进程,也**碰不到**书签里
已配置的数据库。用户问"这台为什么慢",AI 只能靠敲命令一点点摸,而这些信息其实就在
隔壁面板里现成躺着。

## 2. 范围:新增 3 个只读工具

全部为 **read 级**(passive,不改任何状态),接入现有 Agent 循环与审批模型:

| 工具 | 作用 | 数据源(已存在) |
|---|---|---|
| `get_resource_metrics` | 读绑定终端所在服务器的 CPU/内存/磁盘/网络/Top 进程/uptime 快照 | `fetchResourceSnapshot(pid)` |
| `run_db_query` | 对书签已配的 DB 凭据执行**只读** SQL(SELECT/SHOW/EXPLAIN/DESCRIBE),看 processlist、慢查询、表大小等 | `common/db-apis.js` dbConnect/dbQuery |
| `list_db_credentials` | 列出当前书签可用的 DB 凭据**名称**(仅 name/type/host,绝不含密码) | 书签 dbConnections |

不做(超范围/破坏隔离):任何 DB 写操作、把密码暴露给 AI、跨书签任意连库。

## 3. 安全设计(最关键 —— 守住 AI 隔离红线)

本 fork 已确立"dbConnections 对 AI 完全隔离"(mcp-handler 屏蔽 + mcpAdd/Edit 剔除)。
跨面板智能必须在**不破坏**这条红线的前提下让 AI"用"数据库:

1. **密码永不进 AI 上下文**:`run_db_query` 的入参只有 `{ credentialId, sql }`。客户端
   在本地把 credentialId 解析成完整凭据(含密码)后交给 DB 服务端建连;AI 只看到
   SQL 文本和查询结果,从头到尾拿不到密码。`list_db_credentials` 只回 name/type/host。
2. **强制只读**:AI 路径复用 `WRITE_RE`,任何 insert/update/delete/drop/... 一律拒绝并
   返回错误。AI 无法通过本工具改数据(与用户手动的 DB 管理器不同,那里有预览确认)。
3. **结果脱敏**:查询结果同样经过现有 `sanitizeAIText` / 行数上限;可选对疑似敏感列
   (password/token/secret 列名)做打码。
4. **审计**:这两个工具的调用记入现有 AI 审计通道(`ai-audit.js`),记录 SQL 与目标库,
   **不记录返回的数据行**。
5. **风险分级**:`get_resource_metrics` = `read`(纯被动,免审批);`run_db_query` /
   `list_db_credentials` 建议也归 `read`,但 run_db_query 额外加"仅当书签配了凭据才可用"
   的前置校验。若你更保守,可把 run_db_query 提到 `medium`(每次查库需一次点击批准)。

## 4. 落点文件

- `src/client/components/ai/agent-tools.js`:新增 3 个工具定义(name/description/parameters)。
- `src/app/common/command-policy.js`:登记 3 个工具的 risk 级别。
- `src/client/store/mcp-handler.js`:新增 `mcpGetResourceMetrics` / `mcpRunDbQuery` /
  `mcpListDbCredentials` 三个 handler(前者调 fetchResourceSnapshot;后二者复用 db-apis +
  本地解析凭据,强制只读 + 审计)。
- `src/client/components/ai/agent.js`:工具分发表挂上新 handler(沿用现有 read 级免审批逻辑)。
- 系统提示(role):补一句"诊断时可综合资源指标与数据库只读状态给结论"。

## 5. 分期

- **M1**:`get_resource_metrics`(纯读、零风险,立刻让"为什么慢"类问题质变)。
- **M2**:`run_db_query` + `list_db_credentials`(只读 SQL + 密码隔离 + 审计)。
- **M3**:诊断编排——AI 自动"资源异常 → 关联到 DB → 定位慢 SQL"的 few-shot 引导 +
  一键"深度体检"入口。

## 6. 风险与对策

- **越权查库**:凭 credentialId 解析,AI 给不出不存在的凭据;只读强制拦截写。
- **大结果拖慢对话**:复用 db 流式 + 行数上限,AI 查询默认更小的 LIMIT。
- **误导性结论**:诊断结论沿用现有"结论+证据"格式,证据里必须引用具体指标/SQL 输出,
  不允许无证据断言。
- **合并上游**:全部改动集中在 fork 自有的 ai/ 与 store/mcp-handler,冲突面小。

## 7. 参考:一次"为什么慢"的理想链路

用户:「prod-db-01 最近很卡」→ AI:
1. `get_resource_metrics` → CPU 30%、内存平稳、但磁盘 %util 95%、iowait 高
2. `list_db_credentials` → 发现该书签配了 MySQL「生产主库」
3. `run_db_query("SHOW FULL PROCESSLIST")` → 3 条 State=Sending data 的慢查询
4. `run_db_query("EXPLAIN <慢SQL>")` → type=ALL 全表扫描,未命中索引
5. 结论:「磁盘 IO 打满源于生产主库 orders 表全表扫描(缺 status 索引),建议加索引;
   附:iostat %util 95% + EXPLAIN type=ALL 为证据」——纯终端工具给不出这个。
