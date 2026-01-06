# services/
> L2 | 父级: ../CLAUDE.md

成员清单
cacheService.ts: 当前任务状态的缓存与恢复 (localStorage/idb)
chatService.ts: 聊天消息构建、技能检测与对话逻辑
documentationData.ts: 静态文档数据源
geminiService.ts: Gemini AI 核心交互 (Prompt/Vision/Stream)
historyService.ts: 历史记录的持久化存储 (IndexedDB)
promptManager.ts: 提示词版本管理与缓存
soundService.ts: 操作反馈音效管理

法则: 成员完整·一行一文件·父级链接·技术词前置

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
