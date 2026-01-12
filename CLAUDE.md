# unimage-engine - AI Visual Engine Frontend
React + Vite + TypeScript + TailwindCSS + GoogleGemini + IDBKeyval

<directory>
api/ - API configuration and client wrappers
components/ - UI components and visualizers (32 children)
constants/ - Global constants and configuration
docs/ - Project documentation
hooks/ - Custom React hooks (12 children)
services/ - Business logic and external service integrations (11 children)
utils/ - Utility functions and helpers
public/ - Static assets
node_modules/ - Dependencies
src/ - (Empty or Legacy?)
</directory>

<config>
App.tsx - Main Application Entry Component
index.tsx - Application Bootstrapper
vite.config.ts - Vite Build Configuration
package.json - Dependency & Script Management
tsconfig.json - TypeScript Configuration
tailwind.config.js - (Implied) Tailwind Configuration
CLAUDE.md - L1 Project Constitution (Structural Truth)
docs/system_capabilities.md - System Capabilities (Functional Truth)
</config>

法则: 极简·稳定·导航·版本精确

[WORKFLOW]:
1. 架构调整 (Structural Change) -> 更新 CLAUDE.md / L2 / L3
2. 功能变更 (Functional Change) -> 更新 docs/system_capabilities.md
3. 双重验证: 每次提交前，需通过 L3 检查结构依赖，通过 Capabilities 检查回归风险。
