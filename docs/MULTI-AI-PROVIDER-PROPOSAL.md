# electermPlus 多 AI 供应商支持 —— 方案

> 目标:AI 助手从"只能接 DeepSeek"变为可选择 / 切换多家供应商(新增 GPT、Claude),
> 用户在配置里选供应商即可,凭据沿用现有 safeStorage 加密。

## 1. 现状:已经是"半通用"的

主进程 `src/app/lib/ai.js` 的 `createAIClient` 就是一个**通用 OpenAI 兼容客户端**:
`Authorization: Bearer <key>`,POST `{baseURL}{apiPath}`,请求体 `{model, messages, stream, tools, tool_choice}`,
响应按 `data.choices[0].message` 解析。配置里已有 `baseURLAI / apiPathAI / modelAI / apiKeyAI`。

这意味着两类供应商难度天差地别:

| 供应商 | API 形态 | 接入成本 |
|---|---|---|
| **DeepSeek**(现状) | OpenAI 兼容 | 已支持 |
| **GPT / OpenAI** | **OpenAI 原生**(就是当前格式) | **几乎零代码**——填 baseURL `https://api.openai.com/v1`、path `/chat/completions`、model `gpt-5`/`gpt-4o`、Bearer key 即可 |
| 其它 OpenAI 兼容(Moonshot、通义、本地 Ollama…) | OpenAI 兼容 | 同上,填配置即可 |
| **Claude / Anthropic** | **原生不兼容** | 需适配层(见下) |

**Claude 为什么要适配**:Anthropic 原生是 `POST /v1/messages`,鉴权用 `x-api-key` 头 + `anthropic-version: 2023-06-01` 头(不是 Bearer);请求体要求顶层 `system` 和必填 `max_tokens`;响应是 `content` 块数组而非 `choices`;工具调用格式也不同(`tools` 用 `input_schema`,模型回 `tool_use` 块,结果以 `tool_result` 块塞回 user 轮)。当前 OpenAI 形状的客户端直接发过去会 4xx。
> 注:Anthropic 也有一个 OpenAI 兼容端点,但它是折衷层、对工具调用/思考等有限制,不适合我们 Agent 的多步工具场景。本方案走**原生 Messages API 适配**,更稳。

## 2. 设计:供应商抽象 + 适配器

在 AI 配置里新增一个 `providerAI` 字段(`openai` | `anthropic`),`ai.js` 按它分派:

```
AIchat / AIchatWithTools
   ├─ providerAI = 'openai'    → 现有 createAIClient 路径(DeepSeek/GPT/任何兼容端点)不动
   └─ providerAI = 'anthropic' → anthropic-adapter:
         请求:OpenAI 形状 → Anthropic Messages(抽 system、补 max_tokens、换鉴权头、
                messages 角色映射、tool_calls→tool_use、tool 角色→tool_result 块)
         响应:Anthropic content 块 → OpenAI 形状 {choices:[{message}]}
                (这样流式解析、Agent 循环、审计等上层代码全部不用改)
```

关键是**适配器把 Anthropic 的输入输出翻译成应用其余部分已经在用的 OpenAI 形状**,改动被关在一个文件里。

## 3. 落点文件

- `src/app/lib/ai.js`:`AIchat`/`AIchatWithTools`/流式处理里按 `providerAI` 分派。
- `src/app/lib/ai-anthropic.js`(新增):Anthropic 适配器(建议用官方 `@anthropic-ai/sdk`,或最小自写 fetch)。含请求/响应/流式/工具四类转换。
- `src/client/common/default-setting.js`:新增 `providerAI: 'openai'`(默认,兼容存量配置)。
- `src/client/components/ai/ai-config.jsx`:
  - 顶部加"供应商"选择(DeepSeek / OpenAI GPT / Claude / 自定义),选中即回填 baseURL/apiPath/model/provider 的预设;
  - 现有"测试连接"复用,自动按 provider 走对应路径。
- 所有 `AIchat`/`AIchatWithTools` 调用点(ai-config、ai-chat-history-item、agent、bookmark-form、terminal-command-dropdown)多传一个 `providerAI`。
- 依赖:若走官方 SDK,新增 `@anthropic-ai/sdk`(MIT)。

## 4. 安全 & 兼容

- **凭据加密不变**:`apiKeyAI` 仍走 safeStorage 字段级加密(已落地),多供应商各存各的 key。
- **存量用户无感**:`providerAI` 默认 `openai`,老配置继续按 DeepSeek/OpenAI 兼容跑。
- **AI 配置历史**已按 baseURL/model 存多套,天然支持"存几套不同供应商配置,一键切换"。

## 5. 模型默认值建议(对标现有 DeepSeek 快速/深度双预设)

- **OpenAI GPT**:`gpt-5`(强) / `gpt-4o`(快),baseURL `https://api.openai.com/v1`。
- **Claude**:运维助手偏交互,建议默认 `claude-haiku-4-5`(快、便宜)做"快速模式",`claude-opus-4-8` 做"深度诊断";`claude-sonnet-5` 是均衡选项。全部走 Anthropic 原生适配。

## 6. 分期

- **M1(小、见效最快)**:供应商切换 UI + 预设,打通 **GPT 及任意 OpenAI 兼容端点**。近乎零后端改动,先让"能选、能切"落地。
- **M2**:Anthropic 适配器——非流式 + 流式,覆盖"解释/诊断"等**纯对话**模式(无工具)。
- **M3**:Anthropic **工具调用转换**,覆盖"执行/自动"Agent 模式(OpenAI tool_calls ↔ Anthropic tool_use/tool_result 双向翻译),对齐现有审批/审计。

## 7. 风险与对策

- **工具格式差异**(最大工作量):OpenAI 的 `tool_calls`/`tool` 角色 ↔ Anthropic 的 `tool_use`/`tool_result` 块,需在适配器里双向映射;M3 单独做并配契约测试。
- **流式 SSE 事件不同**:Anthropic 是 `content_block_delta` 等事件,与 OpenAI 的 `choices[].delta` 不同;适配器把增量归一化成现有 `processStream` 期望的形状。
- **max_tokens 必填**:Anthropic 强制要求,适配器给默认值(如 4096,大输出用流式)。
- **合并上游**:改动集中在 fork 自有的 ai.js/ai-config 与新增 ai-anthropic.js,冲突面小。
