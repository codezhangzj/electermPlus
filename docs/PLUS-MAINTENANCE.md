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
