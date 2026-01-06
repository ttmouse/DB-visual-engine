
import { GoogleGenAI } from "@google/genai";
import { AGENTS, SINGLE_STEP_REVERSE_PROMPT } from "../constants";
import { AgentRole, LayoutElement } from "../types";
import { promptManager } from "./promptManager";

export interface ReverseEngineeringResult {
  image_analysis: {
    subject: string;
    environment: string;
    lighting: string;
    technical_specs: string;
    colors: string;
  };
  generated_prompt: string;
  negative_prompt: string;
}

let ai: GoogleGenAI | null = null;
let currentConfig = { apiKey: '', baseUrl: '', mode: 'custom' as 'official' | 'custom' };

// Default Model Configuration
// Updated to use stable models compatible with official API
let modelConfig = {
  reasoning: "gemini-3-flash-preview",
  fast: "gemini-3-flash-preview",
  image: "gemini-3-pro-image-preview"
};



const translateErrorMessage = (error: any): string => {
  const msg = error?.toString() || "";

  // Specific 400 error translation for invalid image format/base64 issues
  if (msg.includes("400") || msg.includes("INVALID_ARGUMENT")) {
    if (msg.includes("Image") || msg.includes("image") || msg.includes("format") || msg.includes("decode")) {
      return "图片格式不被支持或数据损坏，请尝试更换图片 (400 Invalid Image)";
    }
    return "请求参数无效，通常是图片格式问题 (400 Bad Request)";
  }

  // Quota errors
  if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("exhausted")) {
    return "API 调用额度已耗尽 (429 Quota Exceeded)";
  }

  // Network errors
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("connection")) {
    return "网络连接失败，请检查网络设置";
  }

  // 500 errors
  if (msg.includes("500") || msg.includes("Internal")) {
    return "服务器内部错误，请稍后重试 (500 Internal Error)";
  }

  return msg;
};

export const configureClient = (apiKey: string, baseUrl: string, mode: 'official' | 'custom' = 'custom') => {
  if (!apiKey) return;
  if (mode === 'custom' && !baseUrl) return;

  currentConfig = { apiKey, baseUrl, mode };

  if (mode === 'official') {
    // Official Google AI API
    ai = new GoogleGenAI({
      apiKey: apiKey
    });
  } else {
    // Custom endpoint
    // Google SDK expects the base API root (e.g. http://127.0.0.1:8045)
    // Strip trailing /v1 if present
    let finalUrl = baseUrl;
    if (finalUrl.endsWith('/v1')) {
      finalUrl = finalUrl.substring(0, finalUrl.length - 3);
    } else if (finalUrl.endsWith('/v1/')) {
      finalUrl = finalUrl.substring(0, finalUrl.length - 4);
    }

    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        baseUrl: finalUrl
      }
    });
  }
};

export const configureModels = (config: { reasoning?: string; fast?: string; image?: string }) => {
  modelConfig = {
    reasoning: config.reasoning || modelConfig.reasoning,
    fast: config.fast || modelConfig.fast,
    image: config.image || modelConfig.image
  };
};

const initModelsFromStorage = () => {
  const r = localStorage.getItem('berryxia_model_reasoning');
  const f = localStorage.getItem('berryxia_model_fast');
  const i = localStorage.getItem('berryxia_model_image');

  if (r || f || i) {
    configureModels({ reasoning: r || undefined, fast: f || undefined, image: i || undefined });
  }
};

// Initialize with env vars if available
if (process.env.GEMINI_API_KEY && process.env.API_ENDPOINT) {
  configureClient(process.env.GEMINI_API_KEY, process.env.API_ENDPOINT);
}
initModelsFromStorage();

const getClient = () => {
  if (!ai) {
    const storedUrl = localStorage.getItem('berryxia_base_url');
    const storedMode = (localStorage.getItem('berryxia_api_mode') || 'custom') as 'official' | 'custom';
    const storedKey = storedMode === 'official'
      ? (localStorage.getItem('berryxia_api_key_official') || localStorage.getItem('berryxia_api_key'))
      : (localStorage.getItem('berryxia_api_key_custom') || localStorage.getItem('berryxia_api_key'));

    if (storedKey) {
      configureClient(storedKey, storedUrl || '', storedMode);
    }
  }
  if (!ai) throw new Error("Google AI Client not configured. Please set API Key and Endpoint.");
  return ai;
};

// Helper: Get agent prompt from localStorage or fallback to default
// Helper: Get agent prompt from promptManager
export const getAgentPrompt = (role: AgentRole): string => {
  return promptManager.getActivePromptContent(role, AGENTS[role].systemInstruction);
};

export async function* streamAgentAnalysis(
  role: AgentRole,
  imageBase64: string,
  previousContext: string,
  mimeType: string = "image/jpeg",
  signal?: AbortSignal
) {
  const client = getClient();
  const agent = AGENTS[role];
  const modelId = modelConfig.reasoning;

  // Get prompt from localStorage or default
  const systemPrompt = getAgentPrompt(role);

  const fullPrompt = `
    ${systemPrompt}
    ---
    ${previousContext ? `以下是前序分析步骤的上下文汇总：\n${previousContext}` : "这是流水线的第一阶段。"}
  `;

  try {
    const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log(`[DEBUG] Model: ${modelId}, MimeType: ${mimeType}, ImgLen: ${cleanImage.length}`);

    // per SDK docs: ai.models.generateContentStream with contents as array of parts or simple string
    const response = await client.models.generateContentStream({
      model: modelId,
      contents: [
        { inlineData: { mimeType, data: cleanImage } },
        fullPrompt
      ]
    });

    for await (const chunk of response) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error: any) {
    if (error.name === 'AbortError' || signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    console.error(`Agent ${role} error:`, error);

    // Use the translator
    const userMsg = translateErrorMessage(error);
    yield `\n\n[错误]：${userMsg}`;
  }
}

export async function translatePrompt(text: string, targetLang: 'CN' | 'EN'): Promise<string> {
  const client = getClient();
  const modelId = modelConfig.fast;

  const prompt = targetLang === 'EN'
    ? `Translate this 7-layer prompt into professional English for Midjourney/Stable Diffusion. Keep the Markdown structure exactly same.\n\n${text}`
    : `将此 7 层架构提示词翻译为中文，保持 Markdown 标题结构：\n\n${text}`;

  try {
    const response = await client.models.generateContent({
      model: modelId,
      contents: prompt
    });
    return response.text || text;
  } catch (error) {
    console.error("Translate error:", error);
    return text;
  }
}

export async function detectLayout(imageBase64: string, mimeType: string = "image/jpeg"): Promise<LayoutElement[]> {
  const client = getClient();
  const modelId = modelConfig.fast;
  const prompt = "Detect all major visual elements in this image and return their 2D bounding boxes and hierarchy labels (Primary, Secondary, Graphic). Return ONLY valid JSON array.";

  try {
    const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const response = await client.models.generateContent({
      model: modelId,
      contents: [
        { inlineData: { mimeType, data: cleanImage } },
        prompt
      ]
    });
    const content = response.text || "[]";
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error("Layout analysis failed", e);
    return [];
  }
}

export async function* streamConsistencyCheck(originalImage: string, generatedImage: string) {
  const client = getClient();
  const modelId = modelConfig.reasoning;
  const prompt = `${AGENTS[AgentRole.CRITIC].systemInstruction}\n\nCompare Source vs Replica.`;

  try {
    const cleanOriginal = originalImage.replace(/^data:image\/\w+;base64,/, "");
    const cleanGenerated = generatedImage.replace(/^data:image\/\w+;base64,/, "");

    const response = await client.models.generateContentStream({
      model: modelId,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanOriginal } },
        { inlineData: { mimeType: "image/png", data: cleanGenerated } },
        prompt
      ]
    });
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
    }
  } catch (error) { yield "质检不可用。"; }
}

// Smart Analysis: Returns direct modification suggestion for the prompt
export async function executeSmartAnalysis(
  originalImage: string,
  generatedImage: string,
  currentPrompt: string
): Promise<string> {
  const client = getClient();
  const modelId = modelConfig.fast;

  const systemPrompt = `你是一个视觉差异分析专家。

你的任务：对比原图和生成图之间的差异，给出**一句话的修改指令**，让用户可以直接用这个指令来修改提示词。

**输入：**
1. 原图（参考目标）
2. 生成图（当前结果）
3. 当前使用的提示词

**输出要求：**
- 只输出**一句简洁的修改指令**（中文）
- 直接说明要怎么改，例如："把光线改为更柔和的漫射光"、"增加背景的暖色调"、"让人物表情更自然"
- 不要输出分析报告、评分或解释
- 如果生成效果已经很好，就说"当前效果已接近原图，可以微调细节"

**当前提示词：**
${currentPrompt}`;

  try {
    const cleanOriginal = originalImage.replace(/^data:image\/\w+;base64,/, "");
    const cleanGenerated = generatedImage.replace(/^data:image\/\w+;base64,/, "");

    const response = await client.models.generateContent({
      model: modelId,
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: cleanOriginal } },
        { inlineData: { mimeType: "image/png", data: cleanGenerated } },
        systemPrompt
      ]
    });

    return response.text?.trim() || "无法分析差异";
  } catch (error) {
    console.error("Smart analysis error:", error);
    return "分析失败，请重试";
  }
}


export async function refinePromptWithFeedback(
  originalPrompt: string,
  feedback: string,
  refImage?: string | null,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const client = getClient();
  const modelId = modelConfig.fast;
  const textPrompt = `你是一个提示词优化专家。根据用户的修改意见，结合现有提示词${refImage ? "和参考图片" : ""}，输出改进后的完整提示词。

**用户修改意见：**
${feedback}

**现有提示词：**
${originalPrompt}

**要求：**  
1. 仅输出修改后的提示词，不需要解释
2. 保持原有的结构格式
3. 根据修改意见进行针对性调整`;

  try {
    let response;
    if (refImage) {
      const cleanRef = refImage.replace(/^data:image\/\w+;base64,/, "");
      response = await client.models.generateContent({
        model: modelId,
        contents: [
          { inlineData: { mimeType, data: cleanRef } },
          textPrompt
        ]
      });
    } else {
      response = await client.models.generateContent({ model: modelId, contents: textPrompt });
    }
    return response.text || originalPrompt;
  } catch (error) {
    console.error("Refine prompt error:", error);
    return originalPrompt;
  }
}

export async function generateImageFromPrompt(
  promptContext: string,
  aspectRatio: string,
  refImage?: string | null,
  mimeType: string = "image/jpeg",
  signal?: AbortSignal
): Promise<string | null> {
  const client = getClient();

  // Parse aspect ratio from prompt text (user may have edited it)
  const parseAspectRatioFromPrompt = (prompt: string): string => {
    // Look for --ar X:Y format (Midjourney style)
    const arMatch = prompt.match(/--ar\s+(\d+):(\d+)/i);
    if (arMatch) {
      const w = parseInt(arMatch[1]);
      const h = parseInt(arMatch[2]);
      if (w > h) return "16:9";
      if (h > w) return "9:16";
      return "1:1";
    }
    // Look for "Aspect Ratio: X:Y" format
    const aspectMatch = prompt.match(/aspect\s*ratio[:\s]+(\d+):(\d+)/i);
    if (aspectMatch) {
      const w = parseInt(aspectMatch[1]);
      const h = parseInt(aspectMatch[2]);
      if (w > h) return "16:9";
      if (h > w) return "9:16";
      return "1:1";
    }
    return aspectRatio; // fallback to detected ratio
  };

  const detectedRatio = parseAspectRatioFromPrompt(promptContext);

  // Select model variant based on aspect ratio
  const baseModel = modelConfig.image || "imagen-3.0-generate-001";
  let modelId = baseModel;

  // Custom proxy logic: Append suffixes for specific aspect ratios if needed
  // Only apply this in 'custom' mode to avoid 404s on Official API
  if (currentConfig.mode === 'custom') {
    if (detectedRatio === "16:9" || detectedRatio === "4:3") {
      modelId = baseModel.includes("-4k") ? `${baseModel.replace("-4k", "")}-4k-16x9` : `${baseModel}-16x9`;
    } else if (detectedRatio === "9:16" || detectedRatio === "3:4") {
      modelId = baseModel.includes("-4k") ? `${baseModel.replace("-4k", "")}-4k-9x16` : `${baseModel}-9x16`;
    }
  }

  console.log(`[Image Gen] Detected ratio: ${detectedRatio}, Using model: ${modelId}`);

  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    let response;

    if (refImage) {
      const cleanRef = refImage.replace(/^data:image\/\w+;base64,/, "");
      response = await client.models.generateContent({
        model: modelId,
        contents: [
          { inlineData: { mimeType, data: cleanRef } },
          promptContext
        ]
      });
    } else {
      response = await client.models.generateContent({
        model: modelId,
        contents: promptContext
      });
    }

    const text = response.text;

    // Check if it's a URL or base64. Reject strictly if it looks like Markdown/JSON.
    if (currentConfig.mode === 'official') {
      // Official Mode: Strict URL check. Do NOT accept raw base64 or long text here.
      // Google API usually puts images in inlineData, not text.
      if (text && text.startsWith('http')) {
        return text;
      }
    } else {
      // Custom Mode: Relaxed check for proxy compatibility
      if (text && (text.startsWith('http') || text.length > 200) && !text.trim().startsWith('```')) {
        return text;
      }
    }

    // Try to get inline data from candidates
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      const imagePart = candidates[0].content.parts.find((p: any) => p.inlineData);
      if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
      }
    }

    return null;
  } catch (error: any) {
    // If it's a translated specific error, rethrow explicitly for UI to catch
    if (error.status === 400 || error.toString().includes("400")) {
      const userMsg = translateErrorMessage(error);
      throw new Error(userMsg);
    }
    console.error("Image gen error", error);
    throw error;
  }
}

export async function executeReverseEngineering(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  promptScript: string = SINGLE_STEP_REVERSE_PROMPT,
  signal?: AbortSignal
): Promise<ReverseEngineeringResult | null> {
  const client = getClient();
  const modelId = modelConfig.reasoning;

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  try {
    const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const response = await client.models.generateContent({
      model: modelId,
      contents: [
        { inlineData: { mimeType, data: cleanImage } },
        promptScript
      ]
    });

    const content = response.text || "";
    // Clean JSON block
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent) as ReverseEngineeringResult;
  } catch (error) {
    console.error("Reverse engineering failed:", error);
    return null;
  }
}

// 单步骤逆向提示词生成（专门用于方法对比）
export async function generatePromptOneShot(imageBase64: string, mimeType: string): Promise<string> {
  const client = getClient();

  try {
    const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const result = await client.models.generateContent({
      model: modelConfig.reasoning,
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanImage
          }
        },
        {
          text: `你是专业的视觉逆向工程专家。
          请分析这张图片，生成一个可用于 Nano Banana Pro 的高质量提示词。

          核心原则：
          1. 识别并优先描述主体（如果是知名IP/产品，直接说名字）
          2. 按重要性排序：主体 > 材质 > 光影 > 构图
          3. 提取画面中的文字内容（用引号标注）
          4. 直接输出提示词，不要解释过程

          重点关注 Nano Banana Pro 的特性：
          - 支持复杂的光影描述
          - 材质渲染能力强
          - 理解构图和空间关系

          输出格式示例：
          iPhone 15 Pro in Natural Titanium, brushed metal texture with micro scratches, studio lighting with soft shadows and rim light, floating at 45-degree angle, text "Pro" in silver, minimalist composition, 8K resolution, photorealistic`
        }
      ]
    });

    return result.text || '生成失败';
  } catch (error) {
    console.error('One-shot prompt generation failed:', error);
    return '生成失败，请重试';
  }
}
