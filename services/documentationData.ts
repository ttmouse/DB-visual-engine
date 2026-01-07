/**
 * [INPUT]: 依赖 Icons (components/Icons)
 * [OUTPUT]: 导出 DOCUMENTATION_CATEGORIES 静态数据
 * [POS]: Static Data Source for DocumentationModal
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Icons } from '../components/Icons';

export interface DocArticle {
    id: string;
    title: string;
    icon: keyof typeof Icons;
    content: string;
}

export interface DocCategory {
    title: string;
    articles: DocArticle[];
}

export const DOCUMENTATION_CATEGORIES: DocCategory[] = [
    {
        title: "更新日志 (Changelog)",
        articles: [
            {
                id: "changelog",
                title: "版本更新",
                icon: "History",
                content: `

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

---

## v2.5.0

### 新增功能
- 新增智能提及功能（@ 原图 / @ 生成图）
- 新增 Official API 模式支持

### 问题修复
- 修复了聊天面板布局问题

---

*更多历史版本请查看项目仓库的 Release 页面*
`
            }
        ]
    },
    {
        title: "新手入门 (Getting Started)",
        articles: [
            {
                id: "quick-start",
                title: "快速开始",
                icon: "Play",
                content: `


欢迎来到 UnImage！只需四步，即可完成您的第一次视觉逆向工程。

### 1. 配置 API Key (Config API Key)

在使用 UnImage 之前，您需要先配置 Gemini API Key。

- 点击主界面右上角的 **API Key** 设置图标。
- 在弹出的窗口中粘贴您的 API Key。
- 点击 **Verify & Save** 保存。

> 如果您还没有 Key，可以前往 Google AI Studio 免费申请。

### 2. 上传图片 (Upload Image)

将您想要分析的图片**拖拽**到主界面的上传区域，或者点击中间的**上传图标**选择文件。

> 支持 JPG, PNG, WEBP 等常见格式。

### 3. 启动分析 (Start Pipeline)

图片上传后，点击底部的 **"开始分析" (Start Pipeline)** 按钮。
系统会自动启动 4 个智能 Agent 对图片进行深度解构：

- **审核员**：检查图片内容
- **描述员**：提取视觉元素
- **架构师**：分析构图结构
- **合成师**：生成绘画提示词

### 4. 获取提示词 (Get Prompt)

等待进度条走完（通常需要 10-20 秒）。
分析完成后，您可以在右侧的 **提示词工作室 (Prompt Studio)** 中看到生成的 Prompt。

点击 **复制** 按钮，即可将提示词用于 Midjourney 或其他生图工具！
`
            },
            {
                id: "core-concepts",
                title: "核心概念",
                icon: "Compass",
                content: `


### 什么是视觉逆向？

不同于简单的“图生文”，UnImage 采用**物理逆向协议**。

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
`
            }
        ]
    },
    {
        title: "功能详解 (Features)",
        articles: [
            {
                id: "reverse-pipeline",
                title: "逆向流水线",
                icon: "RefreshCw",
                content: `


### 标准流水线
点击“开始分析”启动。这是最完整的分析流程，包含完整的 7 层物理逆向协议。
适合：需要高精度还原、复杂构图的图片。

### 快速逆向 (Quick Reverse)
在生成按钮旁点击闪电图标。
跳过部分深度分析步骤，仅提取核心视觉特征。
适合：快速获取灵感、简单图片的分析。

### 进度视图
分析过程中，您可以实时看到每个 Agent 的思维过程。
点击进度条上的节点，可以查看该 Agent 的详细输出报告。
`
            },
            {
                id: "prompt-studio",
                title: "提示词工作室",
                icon: "Edit2",
                content: `


这是您编辑和管理 Prompt 的核心工作台。

### 功能亮点
1.  **实时编辑**：直接修改文本框中的内容，调整生成方向。
2.  **中英切换**：右上角开关。建议在中文模式下修改逻辑，切换到英文模式导出。
3.  **版本历史**：每次修改都会自动保存。点击 **"History"** 图标查看修改记录。

### 调优建议
系统会自动检测 Prompt 中的潜在问题（如风格冲突），并在下方给出**调优建议**。点击建议即可一键应用。
`
            },
            {
                id: "image-gen",
                title: "图像生成",
                icon: "Image",
                content: `


UnImage 内置了高性能生成引擎，让您能立即验证 Prompt 的效果。

### 基本操作
1.  确保提示词工作室中有内容。
2.  点击 **"生成图片"** 按钮。
3.  等待数秒，新图片将展示在左侧。

### 数量选择
点击生成按钮旁的下拉箭头，可以选择生成 **1张**、**2张** 或 **4张** 图片。
多张生成有助于快速探索不同的随机种子效果。
`
            }
        ]
    },
    {
        title: "进阶技巧 (Advanced)",
        articles: [
            {
                id: "ref-style",
                title: "风格与参考图",
                icon: "ScanEye",
                content: `


### 使用参考图
打开 **"Use Reference Image"** 开关。
此时生成新图时，UnImage 会将原图作为 ControlNet/Adapter 的输入，严格通过原图的**边缘**或**深度信息**来约束生成结果。

**适用场景**：
- 需要保持原图的构图不变，只改变材质。
- 需要将真人照片转为动漫风格（漫改）。

### 风格迁移
在提示词中添加或修改风格关键词（如 "Cyberpunk style", "Oil painting"）。
结合参考图模式，可以实现完美的“换皮”效果。
`
            },

            {
                id: "qa-fix",
                title: "质检与修复",
                icon: "ShieldCheck",
                content: `


### 自动质检
点击 **"Run QA" (质量检查)**。
Agent 会扮演“找茬”的角色，逐像素对比原图和生成图，找出：
- 颜色偏差
- 遗漏的物体
- 错误的材质

### 自动修复
质检完成后，点击 **"Auto Fix"**。
系统会根据质检报告，自动修改 Prompt（例如添加 missing details, 修正 color tone），让下一张图更完美。
`
            }
        ]
    }
];
