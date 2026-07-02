# electermPlus 数据库管理面板 —— 方案 V1

> 目标:在终端客户端内内置一个轻量数据库管理面板(对标 Navicat 的日常高频功能),
> 复用已落地的「数据库凭据 + SSH 隧道」基础设施,保持 MIT 许可证,技术栈与主项目一致
> (Electron 主进程 Node + React 渲染层)。

## 1. 为什么自建而不是集成现成品

调研结论:好用的开源 DB GUI(Beekeeper GPLv3、DBGate GPLv3、Outerbase AGPL)许可证均强传染,
嵌入会污染 MIT 主项目;MIT 的 antares 是 Vue 整包、sqlectron 已归档。因此走「MIT 积木自建」:

- **驱动**:`mysql2`(MIT)。V1 只做 MySQL / MariaDB。
- **SSH 隧道**:复用现有依赖 `@electerm/ssh2`(已在 package.json),用 `forwardOut()` 拿到一条到
  服务器本机 3306 的 stream,直接喂给 `mysql2` 的 `stream` 选项——**不新增任何 SSH 依赖**。
- **UI**:React + 现有 antd(Table 直接可用),SQL 编辑器用已在用的 CodeMirror/Monaco 生态。

## 2. V1 范围(覆盖 ~80% 日常场景)

纳入:
- 连接:从书签的 `dbConnections` 一键连库(复用现有加密凭据),连接经该书签的 SSH 隧道。
- 库/表树:列出 databases → tables,点击查看表结构(列、类型、索引)。
- 数据浏览:选表默认 `SELECT * ... LIMIT 200`,分页 / 排序 / 按列筛选。
- SQL 编辑器:手写 SQL、执行、多结果集、错误回显、执行耗时。
- 行编辑:双击单元格改值、新增行、删除行(生成参数化 UPDATE/DELETE/INSERT,执行前预览 SQL)。
- 导出:当前结果集导出 CSV。

V1 暂不做(留 V2):PostgreSQL/Redis、ER 图、数据同步/结构对比、存储过程调试、导入。

## 3. 架构

```
渲染层 (React)                          主进程 (Node)
─────────────────────────────          ─────────────────────────────
DbManagerPanel (右侧面板新增 tab 'db')
  ├─ ConnList (来自 dbConnections)
  ├─ SchemaTree (库/表)         ──IPC──▶  db-service.js
  ├─ SqlEditor (CodeMirror)              ├─ 连接池 Map<connId, pool>
  ├─ ResultGrid (antd Table)            ├─ @electerm/ssh2 forwardOut → stream
  └─ RowEditor                          │     └─ mysql2.createConnection({ stream })
                                        ├─ query(connId, sql, params)
window.store.db* (manate)              ├─ listSchemas / listTables / describeTable
                                        └─ 只读白名单 + 写操作二次确认
```

关键点:
- **连接生命周期在主进程**:渲染层永远拿不到明文密码,只发 `connId + SQL`。
  凭据用现有 `safeDecrypt` 在主进程解密后建连。
- **走 SSH 隧道**:连库地址永远是"服务器本机视角"(127.0.0.1:3306),不需要数据库暴露公网,
  与一键登录同一安全模型。
- **IPC 复用现有 `async` 通道**:在 `ipc.js` 的 `asyncGlobals` 里加 `dbConnect / dbQuery /
  dbListSchemas / dbListTables / dbDescribe / dbClose`,与 `AIchat`、`appendAIAuditLog` 同款。

## 4. 落点文件

主进程:
- `src/app/lib/db-service.js`(新增):连接池 + ssh2 隧道 + mysql2 查询,导出上述方法。
- `src/app/lib/ipc.js`:注册 db* 到 asyncGlobals。
- `package.json`:新增 `mysql2` 依赖(MIT)。

渲染层:
- `src/client/components/db-manager/`(新增目录):
  `db-manager-panel.jsx` / `schema-tree.jsx` / `sql-editor.jsx` / `result-grid.jsx` / `row-editor.jsx`
- `src/client/store/db-manager.js`(新增):`dbOpenPanel / dbConnect / dbRunSql / dbState`。
- `src/client/components/main/main.jsx`:右侧面板新增 `rightPanelTab === 'db'` 分支。
- 入口:终端一键登录快捷条旁 / 资源侧栏数据库区块加「管理」按钮 → 打开 db 面板并选中该凭据。
- `src/client/common/plus-locales.js`:新增 `plusDbMgr*` i18n key(英文 base + 中文)。

## 5. 安全设计

- 明文密码不出主进程;渲染层只持 `connId`。
- 与 AI 隔离:`db-service` 不注册为 Agent 工具;`dbConnections` 已在 MCP 敏感字段中屏蔽(已落地)。
- 写操作(UPDATE/DELETE/DROP/TRUNCATE 等)执行前在 UI 弹出「预览 SQL + 确认」,与 Agent 审批同风格。
- 复用主进程审计通道(`ai-audit.js` 平行的 `db-audit`),记录连接/写操作,**不记录查询数据行**。
- 连接空闲超时自动回收;面板关闭即断连。

## 6. 分期

- **M1 连接 + 只读浏览**:dbConnect(隧道)、SchemaTree、选表 SELECT + 分页/排序、SQL 编辑器执行。
- **M2 写能力**:单元格编辑、增删行、写操作 SQL 预览确认、CSV 导出、db-audit。
- **M3 打磨**:多结果集 tab、查询历史、结果集大小保护(超行数截断提示)、键盘快捷键。

## 7. 风险与对策

- **打包体积/原生模块**:mysql2 为纯 JS(不含原生 addon),对 electron-builder 友好,无需 rebuild。
- **大结果集卡顿**:强制 LIMIT + 服务端分页 + antd 虚拟滚动;单次最多返回 N 行,超出提示加 LIMIT。
- **长查询阻塞**:每连接串行 + 可取消(mysql2 支持 `connection.destroy()`);UI 显示"执行中/停止"。
- **凭据被 AI 篡改**:已通过 `mcpAdd/EditBookmark` 剔除 `dbConnections` 堵死(已落地)。

## 8. 参考(读代码,不嵌入)

- antares-sql/antares(MIT):结果网格编辑、连接管理交互。
- sqlectron-core(MIT,归档):多驱动统一封装 + ssh2 隧道建连的写法。
