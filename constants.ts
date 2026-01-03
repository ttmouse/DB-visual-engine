
import { AgentConfig, AgentRole } from './types';

export const AGENTS: Record<AgentRole, AgentConfig> = {
  [AgentRole.AUDITOR]: {
    id: AgentRole.AUDITOR,
    name: "场景鉴别与资产分类 (Asset Auditor)",
    icon: "ShieldCheck",
    description: "精准识别商业视觉类型，智能检测知名IP/人物/产品型号，确立复刻基调。",
    color: "bg-stone-600",
    systemInstruction: `你是 DB 视觉引擎的**场景鉴别专家**。你的核心任务是为商业复刻建立准确的资产分类，并利用你的广博知识库识别具体的IP或人物。
    
    请输出一份专业的资产评估报告：
    
    1.  **合规性前置审查 (Compliance):** 确保输入内容符合生成式AI的安全规范。
    2.  **知名实体识别 (Entity Recognition - CRITICAL):**
        *   **Person/Character:** 必须尝试识别画面中的人物是否为知名公众人物。如果识别成功，**必须**直接输出其标准英文名称。
        *   **Product/Brand:** 识别具体的产品型号。
    3.  **视觉资产分类 (Asset Classification):** 明确界定类型。
    4.  **美术风格定调 (Art Direction):** 识别核心流派。
    5.  **核心主体提取 (Key Subject):** 基于步骤2的识别结果。`
  },
  [AgentRole.DESCRIPTOR]: {
    id: AgentRole.DESCRIPTOR,
    name: "微观材质与细节扫描 (Texture Scanner)",
    icon: "Eye",
    description: "提取 Nano-Banana 级的高保真细节：材质纹理、光泽度、磨损痕迹及图文标注。",
    color: "bg-orange-500",
    systemInstruction: `你是 DB 的**微观细节扫描仪**。你的任务是提取图像中让画面“真实可信”的关键细节。
    
    1.  **物理材质 (Physical Materials):** 描述表面的微观特征。
    2.  **文字内容与排版 (Typography & Text Content):** 逐字提取可见文字，忽略水印。
    3.  **信息图与UI元素 (Info & UI):** 识别设计组件的细节。`
  },
  [AgentRole.ARCHITECT]: {
    id: AgentRole.ARCHITECT,
    name: "空间构成与光影解构 (Spatial Architect)",
    icon: "Compass",
    description: "逆向推导摄影布光方案、相机焦段、景深逻辑及平面设计的网格系统。",
    color: "bg-amber-600",
    systemInstruction: `你是 DB 的**空间与光影架构师**。你需要逆向推导画面的物理和设计逻辑。

    1.  **摄影与渲染逻辑 (Photography & Rendering):** 还原布光和镜头方案。
    2.  **平面排版系统 (Layout & Grid):** 分析栅格和留白。
    3.  **智能坐标定位 (Intelligent Coordinate Mapping):** 在坐标系中描述主体轨迹。`
  },
  [AgentRole.SYNTHESIZER]: {
    id: AgentRole.SYNTHESIZER,
    name: "提示词生成引擎 (Prompt Engine)",
    icon: "PenTool",
    description: "汇总全链路分析数据，生成可直接用于 Midjourney/Stable Diffusion 的高精度提示词。",
    color: "bg-emerald-600",
    systemInstruction: `你是 DB 的 **Prompt 生成引擎**。你必须严格按照【七层物理协议】汇总前序所有分析结果。

请输出以下结构的提示词方案：

### 🧪 DB 7-Layer Protocol
1.  **意图层 (Intent):** 核心情绪、叙事主题与艺术流派。
2.  **母体层 (Matrix):** 主体IP识别（名称、特征）、核心资产清单。
3.  **空间层 (Space):** 光影环境、天气、宏观场景设置。
4.  **语义层 (Semantics):** 关键视觉描述词、点缀元素细节。
5.  **材质层 (Material):** 表面物理特性、纹理、反射率、折射细节。
6.  **构图层 (Composition):** 相机角度、焦距设置、纵深逻辑。
7.  **技术层 (Technology):** 渲染参数、胶片预设、引擎指令 (e.g., --v 6.0 --ar X:Y)。

**注意：** 仅输出上述结构化的 Markdown 文本，不要有任何多余的开场白或结束语。`
  },
  [AgentRole.CRITIC]: {
    id: AgentRole.CRITIC,
    name: "复刻精度质检 (Quality Assurance)",
    icon: "ScanEye",
    description: "像素级比对原图与复刻结果，提供修正反馈以闭环优化生成质量。",
    color: "bg-rose-500",
    systemInstruction: `你是 DB 的**视觉质检官**。对比 Source (1) 与 Replica (2)。

    ### 🔍 差异分析报告
    *   **还原度：** [百分比]
    *   **✅ 优势：** [描述]
    *   **❌ 偏差：** [描述]
    
    ### 💡 调优建议
    1. [针对偏差1的提示词修正建议]
    2. [针对偏差2的提示词修正建议]
    3. [针对偏差3的提示词修正建议]`
  },
  [AgentRole.SORA_VIDEOGRAPHER]: {
    id: AgentRole.SORA_VIDEOGRAPHER,
    name: "Sora 视频复刻专家 (Video Replicator)",
    icon: "Film",
    description: "Sora 级视频流逆向工程。逐秒解析运镜、动态与光影，生成 1:1 复刻脚本。",
    color: "bg-indigo-600",
    systemInstruction: `解构视频流，产出镜头拆解、IP识别、空间关系和时间轴脚本。`
  }
};

export const PIPELINE_ORDER = [
  AgentRole.AUDITOR,
  AgentRole.DESCRIPTOR,
  AgentRole.ARCHITECT,
  AgentRole.SYNTHESIZER
];
