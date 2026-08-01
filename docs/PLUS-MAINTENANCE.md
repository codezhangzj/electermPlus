# electermPlus Fork 维护策略

electermPlus 基于上游 [electerm](https://github.com/electerm/electerm) 定制。本文档约定与上游的同步方式,以及 Plus 定制代码的边界,降低每次合并的冲突面。

## 远程仓库

```bash
git remote -v
# electermPlus  https://github.com/codezhangzj/electermPlus.git  (fork,主仓库)
# origin        https://github.com/electerm/electerm.git         (上游)
```

## 同步节奏

- 上游发布频繁,建议**按上游 release tag 同步**,而不是跟踪 master 日常提交。
- 推荐节奏:每 1~2 个上游 minor 版本合并一次;安全修复(SSH/加密相关)随时优先合并。

```bash
git fetch origin --tags
git checkout -b sync/upstream-vX.Y.Z master
git merge vX.Y.Z        # 解决冲突后跑 lint + 单测 + e2e
```

## Plus 定制代码边界

合并冲突时,以下位置是 Plus 专属代码,**保留本侧**:

| 位置 | 内容 |
|---|---|
| `src/client/components/home-dashboard/` | 首页连接工作台 + 资源监控侧栏 |
| `src/client/components/ai/` | AI 助手(diagnose/execute 模式、审批、审计) |
| `src/client/common/plus-locales.js` | Plus 专属 i18n 字符串(base 英文 + zh 覆盖) |
| `src/client/common/resource-alert-prefs.js` | 资源告警阈值与通知 |
| `src/app/lib/ai.js` / `src/app/lib/ai-audit.js` | AI 主进程调用与审计落盘 |
| `src/app/common/command-policy.js` / `ai-safety.js` | 命令白名单策略与内容脱敏 |

对上游文件的侵入点(合并时需人工核对):

- `src/client/components/main/main.jsx`(挂载 home-dashboard、AI 入口)
- `src/client/components/sidebar/`、`sys-menu/`(品牌与入口调整)
- `src/client/store/load-data.js`(合并 plus-locales 到 langMap)
- `src/app/lib/ipc.js`(AI/审计相关 asyncGlobals、apiKeyAI 加密迁移)
- `src/app/lib/user-config-controller.js`(apiKeyAI 字段级加密)
- 已整体移除的上游功能:在线更新/自动升级(`3ff89778`),合并时若上游改动这些文件,直接丢弃即可

## 约定

1. **新增 UI 字符串**一律进 `plus-locales.js`(key 以 `plus` 开头),不要硬编码中文。
2. **新增主进程能力**放独立文件(如 `ai-audit.js`),`ipc.js` 里只做注册,减少冲突面。
3. **AI API Key** 始终以 safeStorage 密文形态出现在渲染进程,新代码不得把明文 key 传给渲染端。
4. 合并后的验证基线:`npm run lint`、`node --test test/unit/*.spec.js`、手动跑一次首页/资源面板/AI 三个 Plus 场景。
5. AI 运维助手同一轮对话中,助手回复显示在命令卡片之前,确保最新的命令审批入口位于该轮对话最底部。

## AI Agent 交互约定

- Agent 对话使用统一时间线,按产生顺序保存助手消息和工具步骤;工具步骤在原位置更新检查、审批、执行与结果状态。
- 任务标题显示当前阶段。停止、调用失败或达到步骤上限的任务允许从原请求重试,重试仍经过现有本地风险策略。
- 同一终端的下一次 Agent 请求只继承最近一个已结束任务的文本上下文;最多保留 12 条消息,每条新增上下文最多 6000 个字符。运行中任务、工具原始结果和审批状态不进入继续上下文。
- 时间线与重试只改变交互和上下文组织,不得绕过 `command-policy.js`、审批卡片或 AI 审计记录。
- “新任务”保留历史记录但创建新的会话标识;只有同一会话标识、同一终端中已结束的 Agent 请求才能进入继续上下文。
- AI 面板内部不重复渲染外层面板标题。输入区保持紧凑,发送按钮是主操作;等待审批卡片在时间线底部吸附显示,已完成步骤默认折叠并降低视觉权重。

## 程序坞图标维护约定

- `docs/design/electerm-plus-dock-icon.svg` 是当前黑色终端程序坞图标的矢量源稿,`docs/design/electerm-plus-dock-icon-1024.png` 是由其导出的透明 1024px 位图母版。后续调整桌面应用图标时,应先更新 SVG,再导出母版并派生安装包和运行时尺寸。
- `build/icons/electerm-plus.png`、`build/icons/electerm-plus-*.png`、`build/icons/electermPlus.iconset/`、`build/icons/electerm-plus.ico` 和 AppX 方形 Logo 必须从同一母版生成,避免各平台显示不同版本。`build/icons/electerm-plus-mac.png` 是仅供 macOS 打包使用的全不透明白底派生图,终端内容必须与透明母版一致。
- `src/app/assets/images/electerm-plus-round-128x128.png` 同时用于开发环境窗口图标和 Linux/AppImage 桌面集成;`src/app/assets/images/electerm-plus.png` 用于启动页展示,两者需要与程序坞图标同步。
- 程序坞图标只允许终端主体、描边、连接和 Plus 使用颜色;终端以外的圆角底座保持纯白,不得重新引入灰色底部渐变,也不得让终端或徽章投影覆盖白底。
- macOS 程序坞图标必须使用全画布不透明的纯白底,由系统裁切外部圆角;不得把透明圆角母版直接交给 macOS 打包,否则新版 macOS 会额外合成浅灰外壳。
- `docs/design/electerm-plus-app-icon.svg` 保留为上一版扁平矢量品牌稿,不是当前黑色终端程序坞图标的生成源。托盘、水印、文字 Logo 和 AppX 宽磁贴属于独立场景,不得仅因更换程序坞图标而自动覆盖。
