/**
 * [INPUT]: 依赖 Icons (components/Icons)
 * [OUTPUT]: 导出 DOCUMENTATION_CATEGORIES 静态数据
 * [POS]: Static Data Source for DocumentationModal
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Icons } from '../components/Icons';
import { Language } from './i18n';

export interface DocArticle {
    id: string;
    titleCN: string;
    titleEN: string;
    icon: keyof typeof Icons;
    contentCN: string;
    contentEN: string;
}

export interface DocCategory {
    titleCN: string;
    titleEN: string;
    articles: DocArticle[];
}

// Helper to get localized content
export const getLocalizedDocContent = (article: DocArticle, lang: Language) => ({
    title: lang === 'CN' ? article.titleCN : article.titleEN,
    content: lang === 'CN' ? article.contentCN : article.contentEN
});

export const getLocalizedCategoryTitle = (category: DocCategory, lang: Language) =>
    lang === 'CN' ? category.titleCN : category.titleEN;

export const DOCUMENTATION_CATEGORIES: DocCategory[] = [
    {
        titleCN: "更新日志",
        titleEN: "Changelog",
        articles: [
            {
                id: "changelog",
                titleCN: "版本更新",
                titleEN: "Release Notes",
                icon: "History",
                contentCN: `
## v2.7.4 (2026-01-08)

### 新增功能
- 新增 **Volcengine (火山引擎 Ark)** API 支持
- API 设置面板新增火山引擎配置选项，支持自定义模型名称

## v2.7.3 (2026-01-08)

### 架构优化
- 创建统一的**ImageDetailViewer**组件，重构详情视图
- 编辑模式全屏详情已迁移到新组件
- 支持单图、对比两种模式，可配置导航和操作按钮

## v2.7.2 (2026-01-08)

### 新增功能
- 相册新增**搜索功能**，支持按提示词关键词过滤图片
- 提示词历史支持**差异预览**，悬停时高亮显示与当前提示词的变化
- 右键添加对比直接生效，无需二次确认

### 问题修复
- 修复对比模式逻辑：右键点击现在正确设置左侧对比图，不再改变当前选中项

## v2.7.1 (2026-01-08)

### 新增功能
- 相册模式支持**删除图片**和快速**添加到对比模式**
- 在AI输入框**粘贴图片**可自动添加到参考区域
- **@按钮**始终显示，无图片时显示禁用状态

### 改进优化
- 优化了相册图片操作按钮的布局和交互
- 改善了右键菜单的功能一致性

## v2.7.0 (2026-01-08)

### 新增功能
- 新增**全局快捷键**支持：G(相册)、H(帮助)、N(新建)、C(对比)、A(参考图)、P(提示词库)
- 相册支持 **Eagle 风格选择模式**：方向键导航、空格打开、Enter 编辑
- 新增**快捷键一览**文档页面

### 改进优化
- 所有浮层支持 ESC 键关闭
- 相册头部紧凑化，增加键盘提示
- 上下导航基于图片 X 坐标，更符合直觉
- 焦点图片自动滚动保持可见

## v2.6.0 (2026-01-07)

### 新增功能
- 新增**更新日志**板块，方便查看版本更新内容
- 优化了图片缩略图生成机制，提升加载性能
- 支持批量生成图片（1张、2张或4张）

### 问题修复
- 修复了拖拽上传图片时偶尔失效的问题
- 修复了 API 错误提示不够明确的问题

### 改进优化
- 优化了历史记录的存储结构
- 提升了整体界面响应速度

## v2.5.0

### 新增功能
- 新增智能提及功能（@ 原图 / @ 生成图）
- 新增 Official API 模式支持

### 问题修复
- 修复了聊天面板布局问题

*更多历史版本请查看项目仓库的 Release 页面*
`,
                contentEN: `
## v2.7.4 (2026-01-08)

### New Features
- Added support for **Volcengine (Ark)** API
- Added Volcengine configuration options in API settings, supporting custom model names

## v2.7.3 (2026-01-08)

### Architecture Improvements
- Created unified **ImageDetailViewer** component, refactored detail views
- Edit mode fullscreen detail now uses new component
- Supports single and comparison modes with configurable navigation and action buttons

## v2.7.2 (2026-01-08)

### New Features
- Gallery now has **search functionality**, filter images by prompt keywords
- Prompt history supports **diff preview**, hover to highlight changes from current prompt
- Right-click add to comparison now works directly without confirmation

### Bug Fixes
- Fixed comparison mode logic: right-click now correctly sets left comparison image without changing current selection

## v2.7.1 (2026-01-08)

### New Features
- Gallery mode now supports **deleting images** and quick **add to comparison mode**
- **Pasting images** in AI input field automatically adds them to reference area
- **@button** is now always visible, shows disabled state when no images available

### Improvements
- Optimized gallery image action buttons layout and interaction
- Improved right-click menu functionality consistency

## v2.7.0 (2026-01-08)

### New Features
- Added **global keyboard shortcuts**: G(Gallery), H(Help), N(New), C(Compare), A(Add Reference), P(Prompt Lab)
- Gallery now supports **Eagle-style selection mode**: arrow key navigation, Space to open, Enter to edit
- Added **Keyboard Shortcuts** documentation page

### Improvements
- All modals now support ESC key to close
- Compact gallery header with keyboard hints
- Up/Down navigation based on image X-coordinate for intuitive movement
- Auto-scroll to keep focused item visible

## v2.6.0 (2026-01-07)

### New Features
- Added **Changelog** section for easy version tracking
- Optimized thumbnail generation for better loading performance
- Support batch image generation (1, 2, or 4 images)

### Bug Fixes
- Fixed occasional drag-and-drop upload failures
- Fixed unclear API error messages

### Improvements
- Optimized history storage structure
- Improved overall UI responsiveness

## v2.5.0

### New Features
- Added smart mention feature (@ Original / @ Generated)
- Added Official API mode support

### Bug Fixes
- Fixed chat panel layout issues

*For more version history, check the project repository's Release page*
`
            }
        ]
    },
    {
        titleCN: "新手入门",
        titleEN: "Getting Started",
        articles: [
            {
                id: "quick-start",
                titleCN: "快速开始",
                titleEN: "Quick Start",
                icon: "Play",
                contentCN: `
欢迎来到 UnImage！只需四步，即可完成您的第一次视觉逆向工程。

### 1. 配置 API Key

在使用 UnImage 之前，您需要先配置 Gemini API Key。

- 点击主界面右上角的 **API Key** 设置图标。
- 在弹出的窗口中粘贴您的 API Key。
- 点击 **Verify & Save** 保存。

> 如果您还没有 Key，可以前往 Google AI Studio 免费申请。

### 2. 上传图片

将您想要分析的图片**拖拽**到主界面的上传区域，或者点击中间的**上传图标**选择文件。

> 支持 JPG, PNG, WEBP 等常见格式。

### 3. 启动分析

图片上传后，点击底部的 **"开始分析"** 按钮。系统会自动启动 4 个智能 Agent 对图片进行深度解构：

- **审核员**：检查图片内容
- **描述员**：提取视觉元素
- **架构师**：分析构图结构
- **合成师**：生成绘画提示词

### 4. 获取提示词

等待进度条走完（通常需要 10-20 秒）。分析完成后，您可以在右侧的 **提示词工作室** 中看到生成的 Prompt。

点击 **复制** 按钮，即可将提示词用于 Midjourney 或其他生图工具！
`,
                contentEN: `
Welcome to UnImage! Complete your first visual reverse engineering in just four steps.

### 1. Configure API Key

Before using UnImage, you need to configure your Gemini API Key.

- Click the **API Key** settings icon in the top right corner.
- Paste your API Key in the popup window.
- Click **Verify & Save** to save.

> If you don't have a Key yet, you can get one for free at Google AI Studio.

### 2. Upload Image

**Drag and drop** the image you want to analyze to the main upload area, or click the **upload icon** to select a file.

> Supports common formats like JPG, PNG, WEBP.

### 3. Start Analysis

After uploading, click the **"Start Analysis"** button at the bottom. The system will automatically launch 4 AI Agents for deep image deconstruction:

- **Auditor**: Checks image content
- **Descriptor**: Extracts visual elements
- **Architect**: Analyzes composition structure
- **Synthesizer**: Generates painting prompts

### 4. Get Your Prompt

Wait for the progress bar to complete (usually 10-20 seconds). Once done, you'll see the generated Prompt in the **Prompt Studio** on the right.

Click the **Copy** button to use the prompt with Midjourney or other image generation tools!
`
            },
            {
                id: "core-concepts",
                titleCN: "核心概念",
                titleEN: "Core Concepts",
                icon: "Compass",
                contentCN: `
### 什么是视觉逆向？

不同于简单的"图生文"，UnImage 采用**物理逆向协议**。

它不只是识别物体，而是像拆解蓝图一样，分析画面的光影、材质、透视和渲染技术，从而能还原出高度逼真的 Prompt。

### Agent 协作

UnImage 并非单一模型，而是一个 **Agent 团队**：

- **Auditor**: 安全官，确保合规。
- **Descriptor**: 视觉翻译官，将像素转化为文字。
- **Architect**: 空间设计师，负责透视和构图。
- **Synthesizer**: 最终的 Prompt 工程师，汇总所有信息。

### 双语模式

我们内置了专为 Midjourney 优化的英文翻译引擎。

- **中文模式**: 适合理解和编辑，符合人类语言习惯。
- **英文模式**: 专为 AI 生图模型优化，关键词权重更精准。
`,
                contentEN: `
### What is Visual Reverse Engineering?

Unlike simple "image-to-text", UnImage uses a **Physical Reverse Protocol**.

It doesn't just recognize objects—it deconstructs the image like a blueprint, analyzing lighting, materials, perspective, and rendering techniques to recreate highly accurate Prompts.

### Agent Collaboration

UnImage isn't a single model, but an **Agent Team**:

- **Auditor**: Safety officer, ensures compliance.
- **Descriptor**: Visual translator, converts pixels to text.
- **Architect**: Spatial designer, handles perspective and composition.
- **Synthesizer**: Final Prompt engineer, aggregates all information.

### Bilingual Mode

We have a built-in English translation engine optimized for Midjourney.

- **Chinese Mode**: Better for understanding and editing, follows human language patterns.
- **English Mode**: Optimized for AI image generation, more precise keyword weighting.
`
            }
        ]
    },
    {
        titleCN: "功能详解",
        titleEN: "Features",
        articles: [
            {
                id: "reverse-pipeline",
                titleCN: "逆向流水线",
                titleEN: "Reverse Pipeline",
                icon: "RefreshCw",
                contentCN: `
### 标准流水线

点击"开始分析"启动。这是最完整的分析流程，包含完整的 7 层物理逆向协议。

适合：需要高精度还原、复杂构图的图片。

### 快速逆向

在生成按钮旁点击闪电图标。跳过部分深度分析步骤，仅提取核心视觉特征。

适合：快速获取灵感、简单图片的分析。

### 进度视图

分析过程中，您可以实时看到每个 Agent 的思维过程。点击进度条上的节点，可以查看该 Agent 的详细输出报告。
`,
                contentEN: `
### Standard Pipeline

Click "Start Analysis" to begin. This is the most complete analysis flow, using the full 7-layer physical reverse protocol.

Best for: High-precision reconstruction, complex compositions.

### Quick Reverse

Click the lightning icon next to the generate button. Skips some deep analysis steps, extracting only core visual features.

Best for: Quick inspiration, simple image analysis.

### Progress View

During analysis, you can see each Agent's thinking process in real-time. Click on progress bar nodes to view detailed output reports from each Agent.
`
            },
            {
                id: "prompt-studio",
                titleCN: "提示词工作室",
                titleEN: "Prompt Studio",
                icon: "Edit2",
                contentCN: `
这是您编辑和管理 Prompt 的核心工作台。

### 功能亮点

1. **实时编辑**：直接修改文本框中的内容，调整生成方向。
2. **中英切换**：右上角开关。建议在中文模式下修改逻辑，切换到英文模式导出。
3. **版本历史**：每次修改都会自动保存。点击 **"History"** 图标查看修改记录。

### 调优建议

系统会自动检测 Prompt 中的潜在问题（如风格冲突），并在下方给出**调优建议**。点击建议即可一键应用。
`,
                contentEN: `
This is your core workspace for editing and managing Prompts.

### Key Features

1. **Live Editing**: Directly modify content in the text box to adjust generation direction.
2. **Language Switch**: Toggle in the top right. Recommend editing logic in Chinese mode, then switching to English for export.
3. **Version History**: Every change is auto-saved. Click the **"History"** icon to view change records.

### Optimization Tips

The system automatically detects potential issues in your Prompt (like style conflicts) and provides **optimization suggestions** below. Click on suggestions to apply with one click.
`
            },
            {
                id: "image-gen",
                titleCN: "图像生成",
                titleEN: "Image Generation",
                icon: "Image",
                contentCN: `
UnImage 内置了高性能生成引擎，让您能立即验证 Prompt 的效果。

### 基本操作

1. 确保提示词工作室中有内容。
2. 点击 **"生成图片"** 按钮。
3. 等待数秒，新图片将展示在左侧。

### 数量选择

点击生成按钮旁的下拉箭头，可以选择生成 **1张**、**2张** 或 **4张** 图片。

多张生成有助于快速探索不同的随机种子效果。
`,
                contentEN: `
UnImage has a built-in high-performance generation engine for immediate Prompt verification.

### Basic Usage

1. Make sure there's content in the Prompt Studio.
2. Click the **"Generate"** button.
3. Wait a few seconds, the new image will appear on the left.

### Quantity Selection

Click the dropdown arrow next to the generate button to select **1**, **2**, or **4** images.

Multiple generation helps quickly explore different random seed effects.
`
            }
        ]
    },
    {
        titleCN: "进阶技巧",
        titleEN: "Advanced",
        articles: [
            {
                id: "ref-style",
                titleCN: "风格与参考图",
                titleEN: "Styles & Reference Images",
                icon: "ScanEye",
                contentCN: `
### 使用参考图

打开 **"Use Reference Image"** 开关。此时生成新图时，UnImage 会将原图作为 ControlNet/Adapter 的输入，严格通过原图的**边缘**或**深度信息**来约束生成结果。

**适用场景**：
- 需要保持原图的构图不变，只改变材质。
- 需要将真人照片转为动漫风格（漫改）。

### 风格迁移

在提示词中添加或修改风格关键词（如 "Cyberpunk style", "Oil painting"）。结合参考图模式，可以实现完美的"换皮"效果。
`,
                contentEN: `
### Using Reference Images

Enable the **"Use Reference Image"** toggle. When generating new images, UnImage will use the original as ControlNet/Adapter input, strictly constraining results through the original's **edges** or **depth information**.

**Use Cases**:
- Keep original composition unchanged, only change materials.
- Convert real photos to anime style.

### Style Transfer

Add or modify style keywords in your prompt (e.g., "Cyberpunk style", "Oil painting"). Combined with reference image mode, you can achieve perfect "reskinning" effects.
`
            },
            {
                id: "qa-fix",
                titleCN: "质检与修复",
                titleEN: "QA & Fix",
                icon: "ShieldCheck",
                contentCN: `
### 自动质检

点击 **"Run QA"**。Agent 会扮演"找茬"的角色，逐像素对比原图和生成图，找出：
- 颜色偏差
- 遗漏的物体
- 错误的材质

### 自动修复

质检完成后，点击 **"Auto Fix"**。系统会根据质检报告，自动修改 Prompt（例如添加 missing details, 修正 color tone），让下一张图更完美。
`,
                contentEN: `
### Auto Quality Check

Click **"Run QA"**. The Agent will play "spot the difference", comparing original and generated images pixel by pixel to find:
- Color deviations
- Missing objects
- Incorrect materials

### Auto Fix

After QA completes, click **"Auto Fix"**. The system will automatically modify the Prompt based on the QA report (e.g., adding missing details, correcting color tone) to make the next image more perfect.
`
            }
        ]
    },
    {
        titleCN: "快捷键",
        titleEN: "Keyboard Shortcuts",
        articles: [
            {
                id: "shortcuts",
                titleCN: "快捷键一览",
                titleEN: "Shortcuts Overview",
                icon: "Key",
                contentCN: `
## 全局快捷键

在主界面可用（输入框外）：

| 快捷键 | 功能 |
|---|---|
| \`G\` | 打开相册 |
| \`H\` | 打开帮助文档 |
| \`N\` | 新建任务 |
| \`C\` | 切换对比模式 |
| \`A\` | 添加参考图片 |
| \`P\` | 打开提示词库 |

## 相册快捷键

### Grid 模式（缩略图）

| 快捷键 | 功能 |
|---|---|
| \`← → ↑ ↓\` | 移动选择框 |
| \`空格\` | 打开大图 |
| \`Enter\` | 编辑当前图片 |
| \`ESC\` | 关闭相册 |

### 大图模式

| 快捷键 | 功能 |
|---|---|
| \`← → ↑ ↓\` | 切换图片 |
| \`Enter\` | 编辑当前图片 |
| \`空格 / ESC\` | 返回缩略图 |

> 提示：当光标在输入框或文本区域内时，快捷键不会触发。
`,
                contentEN: `
## Global Shortcuts

Available on main interface (outside input fields):

| Shortcut | Function |
|---|---|
| \`G\` | Open Gallery |
| \`H\` | Open Help Docs |
| \`N\` | New Task |
| \`C\` | Toggle Compare Mode |
| \`A\` | Add Reference Image |
| \`P\` | Open Prompt Library |

## Gallery Shortcuts

### Grid Mode (Thumbnails)

| Shortcut | Function |
|---|---|
| \`← → ↑ ↓\` | Navigate selection |
| \`Space\` | Open full view |
| \`Enter\` | Edit current image |
| \`ESC\` | Close gallery |

### Full View Mode

| Shortcut | Function |
|---|---|
| \`← → ↑ ↓\` | Switch images |
| \`Enter\` | Edit current image |
| \`Space / ESC\` | Return to thumbnails |

> Note: Shortcuts are disabled when cursor is in input fields or text areas.
`
            }
        ]
    },
    {
        titleCN: "故障排除",
        titleEN: "Troubleshooting",
        articles: [
            {
                id: "connection-issue",
                titleCN: "连接问题排查",
                titleEN: "Connection Troubleshooting",
                icon: "AlertCircle",
                contentCN: `
## 为什么会连接失败？

"Failed to fetch" 通常是由于浏览器安全策略或网络路由引起的。

### 情况 1：HTTPS 页面访问 HTTP 接口 (Mixed Content)
如果通过 Vercel 等平台部署了 HTTPS 页面，但 API 接口是 HTTP (如本地 IP)，浏览器会阻止请求。
**解决方法**：
- **方案 A (推荐)**：使用 **ngrok** 或 **Cloudflare Tunnel** 将 API 映射为 HTTPS 地址。
- **方案 B (临时)**：点击浏览器地址栏左侧的"锁"图标 -> 网站设置 -> 不安全内容 ->允许。

### 情况 2：从其他设备访问 Localhost
如果在 A 电脑运行接口，B 电脑通过网页访问，并在设置填入了 \`http://127.0.0.1:xxx\`，这是错误的。B 电脑会尝试连接自己。
**解决方法**：
- 请填写 A 电脑的**局域网 IP** (例如 \`http://192.168.1.5:xxx\`)。
- 确保 A 电脑防火墙已允许该端口。

### 情况 3：跨域 (CORS)
如果 API 服务未正确配置 CORS 头，浏览器会拒绝连接。请检查服务器配置。
`,
                contentEN: `
## Why Connection Fails?

"Failed to fetch" usually indicates browser security blocks or routing issues.

### Case 1: Mixed Content (HTTPS -> HTTP)
If using HTTPS web (e.g., Vercel) to access HTTP API, modern browsers block it.
**Fix**:
- **A (Recommended)**: Use **ngrok** or **Cloudflare Tunnel** for HTTPS.
- **B (Test Only)**: Browser Settings -> Insecure Content -> Allow.

### Case 2: Remote Accessing Localhost
If accessing via Network, do NOT use \`localhost\` or \`127.0.0.1\` in settings.
**Fix**:
- Use the **LAN IP** of the host machine (e.g., \`192.168.1.5\`).
- Check Firewall rules.
`
            }
        ]
    }
];
