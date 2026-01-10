# DB-visual-engine - AI Image Generation & Reverse Engineering Engine
React + Vite + TypeScript + Gemini SDK + Lucide + IDB-Keyval

<directory>
components/ - UI Components (23 items: Agent/Chat/Image tools)
services/ - Core Business Logic (Gemini/History/Sound)
hooks/ - Custom React Hooks (Pipeline monitoring)
utils/ - Helper Utilities
dist/ - Build Output
</directory>

<config>
package.json - Dependencies & Scripts
vite.config.ts - Vite Configuration
tsconfig.json - TypeScript Configuration
todo.md - Task & Feature Tracking
</config>

法则: 极简·稳定·导航·版本精确·语义纯净

## 语义纯净法则 (Semantic Integrity)
1. **禁止语义交叉占位**：UI 占位数据必须与最终数据的语义源完全一致。
2. **正确示例**：高清图未加载时，可用该图本身的低质量缩略图占位。
3. **错误示例**：原图未加载时，拿生成图的缩略图去占位（这就是语义污染）。
4. **原则**：真实的留白优于虚假的填充。
