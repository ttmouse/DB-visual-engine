# Changelog

All notable changes to this project will be documented in this file.

---

## [2026-01-08] - Volcengine 火山引擎完整集成

### 🚀 新功能

#### 火山引擎 API 支持
- **模型自动发现**：输入 API Key 后可自动查询账户下可用模型列表
- **模型选择器**：在设置面板中通过下拉框选择图像生成和视觉理解模型
- **逆向工程**：支持使用火山引擎视觉模型进行图片逆向提示词

#### 新增文件
- `api/volcengine.ts` - 图像生成 API 代理
- `api/volcengine-chat.ts` - Chat/Vision API 代理
- `api/volcengine-models.ts` - 模型列表 API 代理

### 📝 改进

#### 图像生成
- 支持 8 种宽高比：1:1, 4:3, 3:4, 16:9, 9:16, 2:3, 3:2, 21:9
- 支持 4K 高画质模式 (quality: "High")
- 参考图 I2I 模式支持

#### UI 优化
- 聊天区域模型名称根据 API 模式动态显示
- 火山引擎模式下显示专属比例选项
- 测试连接使用真实模型验证
- 禁止图片被意外选中 (灰蒙蒙状态)

### 🔧 Bug 修复
- 修复 `refinePromptWithFeedback` 在火山模式下无效的问题
- 修复 4K 选项在火山模式下未生效的问题
- 修复缺失的比例尺寸映射 (2:3, 3:2, 21:9)

### 📊 火山引擎模型配置

| 功能 | 默认模型 |
|:---|:---|
| 图像生成 (T2I) | `seedream-4-5-251128` |
| 视觉理解 (逆向) | `seed-1-6-250915` |

### 📂 修改的文件清单

```
api/
├── volcengine.ts           # 新增 - 图像生成代理
├── volcengine-chat.ts      # 新增 - Chat/Vision 代理
└── volcengine-models.ts    # 新增 - 模型列表代理

services/
└── geminiService.ts        # 修改 - 添加火山引擎分支逻辑

components/
├── ApiKeyModal.tsx         # 修改 - 模型发现UI、测试连接
└── AspectRatioSelector.tsx # 修改 - 火山引擎比例选项

config/
├── vite.config.ts          # 修改 - 开发代理路由
└── vercel.json             # 修改 - 生产重写规则

index.html                  # 修改 - 禁止图片选中CSS

App.tsx                     # 修改 - 模型名称显示逻辑
```

---

## [Earlier Updates]

*Previous changelog entries will be added as they are documented.*
