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
let currentConfig = { apiKey: '', baseUrl: '', mode: 'custom' as 'official' | 'custom' | 'volcengine' };

// Default Model Configuration
let modelConfig = {
  reasoning: "gemini-3-flash",
  fast: "gemini-3-flash",
  image: "gemini-3-pro-image-preview"
};

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash-exp'
];

// Centralized default models per API mode
export const getModeDefaultModels = (mode: 'official' | 'custom' | 'volcengine') => {
  switch (mode) {
    case 'official':
      return {
        reasoning: 'gemini-3-flash-preview',
        fast: 'gemini-3-flash-preview',
        image: 'gemini-3-pro-image-preview'
      };
    case 'volcengine':
      return {
        reasoning: 'seed-1-6-250915',      // Vision model for analysis
        fast: 'seed-1-6-250915',           // Vision model for chat
        image: 'seedream-4-5-251128'       // Image generation model
      };
    case 'custom':
    default:
      return {
        reasoning: 'gemini-3-pro-high',
        fast: 'gemini-3-flash',
        image: 'gemini-3-pro-image'
      };
  }
};

const translateErrorMessage = (error: any): string => {
  const msg = error?.toString() || "";

  // Try to extract reset time from quota error
  const extractResetTime = (errorMsg: string): string | null => {
    // Pattern: "quotaResetDelay": "2h59m3.181170982s"
    const delayMatch = errorMsg.match(/quotaResetDelay["\s:]+(\d+h)?(\d+m)?[\d.]+s/i);
    if (delayMatch) {
      const hours = delayMatch[1] ? parseInt(delayMatch[1]) : 0;
      const minutes = delayMatch[2] ? parseInt(delayMatch[2]) : 0;
      if (hours > 0 || minutes > 0) {
        return `${hours > 0 ? hours + '小时' : ''}${minutes > 0 ? minutes + '分钟' : ''}`;
      }
    }
    // Pattern: "Your quota will reset after 2h59m3s"
    const textMatch = errorMsg.match(/reset after\s+(\d+h)?(\d+m)?[\d]+s/i);
    if (textMatch) {
      const hours = textMatch[1] ? parseInt(textMatch[1]) : 0;
      const minutes = textMatch[2] ? parseInt(textMatch[2]) : 0;
      if (hours > 0 || minutes > 0) {
        return `${hours > 0 ? hours + '小时' : ''}${minutes > 0 ? minutes + '分钟' : ''}`;
      }
    }
    return null;
  };

  // Quota / Rate limit errors (429)
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("QUOTA_EXHAUSTED") ||
    msg.includes("exhausted") || msg.includes("quota") || msg.includes("Too Many Requests")) {
    const resetTime = extractResetTime(msg);
    if (resetTime) {
      return `API 请求额度已用完，预计 ${resetTime}后恢复 (429)`;
    }
    return "API 请求额度已用完，通常是 Key 额度耗尽 (429 Quota Exceeded)";
  }

  // Specific 400 error translation for invalid image format/base64 issues
  if (msg.includes("400") || msg.includes("INVALID_ARGUMENT")) {
    if (msg.includes("Image") || msg.includes("image") || msg.includes("format") || msg.includes("decode")) {
      return "图片格式不被支持或数据损坏，请尝试更换图片 (400 Invalid Image)";
    }
    return "请求参数无效，通常是图片格式问题 (400 Bad Request)";
  }

  // 404 errors - model not found
  if (msg.includes("404") || msg.includes("NOT_FOUND")) {
    return "模型不存在或不可用，请检查模型配置 (404 Not Found)";
  }

  // Authentication errors (401/403)
  if (msg.includes("401") || msg.includes("403") || msg.includes("UNAUTHENTICATED") || msg.includes("PERMISSION_DENIED")) {
    return "API 密钥无效或权限不足，请检查设置 (401/403)";
  }

  // Network errors
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("connection") || msg.includes("ECONNREFUSED")) {
    return "网络连接失败，请检查网络设置";
  }

  // 500 errors
  if (msg.includes("500") || msg.includes("Internal") || msg.includes("INTERNAL")) {
    return "服务器内部错误，请稍后重试 (500 Internal Error)";
  }

  // 503 Service Unavailable
  if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
    return "服务暂时不可用，请稍后重试 (503)";
  }

  return msg;
};

export const configureClient = (apiKey: string, baseUrl: string, mode: 'official' | 'custom' | 'volcengine' = 'custom') => {
  if (!apiKey) return;
  // Volcengine mode doesn't strictly require baseUrl if we hardcode it, but we can accept it
  if (mode === 'custom' && !baseUrl) return;

  currentConfig = { apiKey, baseUrl, mode };

  if (mode === 'official') {
    // Official Google AI API
    ai = new GoogleGenAI({
      apiKey: apiKey
    });
  } else if (mode === 'volcengine') {
    // Volcengine mode
    try {
      ai = new GoogleGenAI({ apiKey });
    } catch (e) { console.warn("Failed to init AI client for Volcengine mode", e); }
  } else {
    // Custom endpoint
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
  const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine';
  const defaults = getModeDefaultModels(storedMode);

  // Try mode-specific keys first, fallback to global keys for backward compatibility
  let r = localStorage.getItem(`unimage_model_reasoning_${storedMode}`)
    || localStorage.getItem('unimage_model_reasoning');
  let f = localStorage.getItem(`unimage_model_fast_${storedMode}`)
    || localStorage.getItem('unimage_model_fast');
  let i = localStorage.getItem(`unimage_model_image_${storedMode}`)
    || localStorage.getItem('unimage_model_image');

  // Validate: Ensure models are compatible with current mode
  if (storedMode === 'volcengine') {
    // If the stored models look like Gemini models, reset to Volcengine defaults
    if (!r || r.includes('gemini')) r = defaults.reasoning;
    if (!f || f.includes('gemini')) f = defaults.fast;
    if (!i || i.includes('gemini') || i.includes('imagen')) i = defaults.image;
    console.log('[Model Init] Volcengine mode: using', { reasoning: r, fast: f, image: i });
  } else {
    // If the stored models look like Volcengine models, reset to Google defaults
    if (!r || r.includes('seed')) r = defaults.reasoning;
    if (!f || f.includes('seed')) f = defaults.fast;
    if (!i || i.includes('seedream') || i.includes('seededit')) i = defaults.image;
  }

  configureModels({
    reasoning: r || defaults.reasoning,
    fast: f || defaults.fast,
    image: i || defaults.image
  });
};

// Export helper for saving mode-specific model config
export const saveModelConfigForMode = (
  mode: 'official' | 'custom' | 'volcengine',
  config: { reasoning?: string; fast?: string; image?: string; vision?: string }
) => {
  if (config.reasoning) localStorage.setItem(`unimage_model_reasoning_${mode}`, config.reasoning);
  if (config.fast) localStorage.setItem(`unimage_model_fast_${mode}`, config.fast);
  if (config.image) localStorage.setItem(`unimage_model_image_${mode}`, config.image);
  if (config.vision) localStorage.setItem(`unimage_model_vision_${mode}`, config.vision);

  // Also update global keys for backward compatibility
  if (config.reasoning) localStorage.setItem('unimage_model_reasoning', config.reasoning);
  if (config.fast) localStorage.setItem('unimage_model_fast', config.fast);
  if (config.image) localStorage.setItem('unimage_model_image', config.image);
  if (config.vision) localStorage.setItem('unimage_model_vision', config.vision);
};

// Export helper for loading mode-specific model config
export const loadModelConfigForMode = (mode: 'official' | 'custom' | 'volcengine') => {
  const defaults = getModeDefaultModels(mode);

  return {
    reasoning: localStorage.getItem(`unimage_model_reasoning_${mode}`) || defaults.reasoning,
    fast: localStorage.getItem(`unimage_model_fast_${mode}`) || defaults.fast,
    image: localStorage.getItem(`unimage_model_image_${mode}`) || defaults.image,
    vision: localStorage.getItem(`unimage_model_vision_${mode}`) || 'seed-1-6-250915'
  };
};


// Initialize with env vars if available
// Initialize with env vars if available - MOVED to getClient fallback
initModelsFromStorage();

const getClient = () => {
  if (!ai) {
    const storedUrl = localStorage.getItem('unimage_base_url');
    const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine';

    let storedKey = '';
    if (storedMode === 'official') storedKey = localStorage.getItem('unimage_api_key_official') || localStorage.getItem('unimage_api_key') || '';
    else if (storedMode === 'volcengine') storedKey = localStorage.getItem('unimage_api_key_volcengine') || '';
    else storedKey = localStorage.getItem('unimage_api_key_custom') || localStorage.getItem('unimage_api_key') || '';

    if (storedKey) {
      configureClient(storedKey, storedUrl || '', storedMode);
    } else if (process.env.GEMINI_API_KEY && process.env.API_ENDPOINT) {
      // Fallback to Env if no storage config
      configureClient(process.env.GEMINI_API_KEY, process.env.API_ENDPOINT);
    }
  }
  if (!ai) throw new Error("Google AI Client not configured. Please set API Key and Endpoint.");
  return ai;
};

// Helper: Ensure config is loaded from localStorage before mode checks
// This is needed for functions that check currentConfig.mode before calling getClient()
const ensureConfigLoaded = () => {
  if (currentConfig.apiKey) return; // Already configured

  const storedUrl = localStorage.getItem('unimage_base_url');
  const storedMode = (localStorage.getItem('unimage_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine';

  let storedKey = '';
  if (storedMode === 'official') storedKey = localStorage.getItem('unimage_api_key_official') || localStorage.getItem('unimage_api_key') || '';
  else if (storedMode === 'volcengine') storedKey = localStorage.getItem('unimage_api_key_volcengine') || '';
  else storedKey = localStorage.getItem('unimage_api_key_custom') || localStorage.getItem('unimage_api_key') || '';

  if (storedKey) {
    // Only update currentConfig, don't initialize Google client for Volcengine
    currentConfig = { apiKey: storedKey, baseUrl: storedUrl || '', mode: storedMode };
  }
};

// Volcengine Vision API Helper
// Uses Doubao-1.5-vision-pro for multimodal image understanding
async function volcengineVisionCall(
  imageBase64: string,
  prompt: string,
  mimeType: string = "image/png"
): Promise<string> {
  const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await fetch("/api/volcengine-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${currentConfig.apiKey}`
    },
    body: JSON.stringify({
      // Use user-selected vision model from localStorage, with fallback to default
      model: localStorage.getItem('unimage_model_vision') || "seed-1-6-250915",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${cleanImage}`,
              detail: "high"
            }
          }
        ]
      }],
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Volcengine Vision Error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (data.choices && data.choices.length > 0) {
    return data.choices[0].message?.content || "";
  }

  throw new Error("No response from Volcengine Vision API");
}

// Volcengine Models API Helper
// Lists available models for the current API key
export async function listVolcengineModels(): Promise<{ id: string; type: string }[]> {
  ensureConfigLoaded();

  if (currentConfig.mode !== 'volcengine' || !currentConfig.apiKey) {
    return [];
  }

  try {
    const response = await fetch("/api/volcengine-models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${currentConfig.apiKey}`
      }
    });

    if (!response.ok) {
      console.error("Failed to fetch Volcengine models:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      // Categorize models by their prefix
      return data.data.map((m: any) => {
        let type = 'other';
        const id = m.id.toLowerCase();

        if (id.startsWith('seedream') || id.startsWith('seededit')) {
          type = 'image';
        } else if (id.startsWith('seedance')) {
          type = 'video';
        } else if (id.includes('embedding')) {
          type = 'embedding';
        } else if (id.includes('vision') || id.includes('skylark-vision')) {
          type = 'vision';
        } else if (id.startsWith('seed-') || id.includes('flash') || id.includes('pro')) {
          // seed-* models (like seed-1-6) are multimodal, can be used for vision
          type = 'multimodal';
        } else if (id.startsWith('skylark')) {
          type = 'text';
        }

        return { id: m.id, type };
      });
    }

    return [];
  } catch (error) {
    console.error("Error listing Volcengine models:", error);
    return [];
  }
}

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
  if (currentConfig.mode === 'volcengine') {
    yield "Volcengine 模式下暂不支持质检功能 (需 Google Gemini Vision 模型)。";
    return;
  }

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
  ensureConfigLoaded(); // Ensure config is loaded before mode check

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
    // VOLCENGINE MODE: Use Chat API for text refinement
    if (currentConfig.mode === 'volcengine') {
      console.log("[Volcengine] Refining prompt with feedback");

      if (refImage) {
        // Use vision call with image
        const result = await volcengineVisionCall(refImage, textPrompt, mimeType);
        return result || originalPrompt;
      } else {
        // Text-only refinement via chat API
        const visionModel = localStorage.getItem('unimage_model_vision') || 'seed-1-6-250915';
        const response = await fetch("/api/volcengine-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentConfig.apiKey}`
          },
          body: JSON.stringify({
            model: visionModel,
            messages: [{ role: "user", content: textPrompt }],
            max_tokens: 4096
          })
        });

        if (!response.ok) {
          console.error("Volcengine refine error:", response.status);
          return originalPrompt;
        }

        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
          return data.choices[0].message?.content || originalPrompt;
        }
        return originalPrompt;
      }
    }

    // GOOGLE MODE: Use Gemini API
    const client = getClient();
    const modelId = modelConfig.fast;

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
  is4K: boolean = false,
  refImage?: string | null,
  mimeType: string = "image/jpeg",
  signal?: AbortSignal
): Promise<string | null> {
  ensureConfigLoaded(); // Ensure config is loaded before mode check

  // VOLCENGINE LOGIC
  if (currentConfig.mode === 'volcengine') {
    // Use overseas Volcengine image models (AP-Southeast endpoint)
    // seedream-4-5 is the latest and best quality model
    const modelId = modelConfig.image || 'seedream-4-5-251128';
    // Use proxy endpoint for both dev and production to bypass CORS
    const endpoint = "/api/volcengine";

    console.log(`[Volcengine] Generating with Model: ${modelId}`);

    // Map aspect ratio to size
    // Volcengine (Seedream) typically supports: 1024x1024, 768x1024, 1024x768 etc.
    // Volcengine (Seedream) requires > 3.6M pixels (2K resolution)
    let width = 2048;
    let height = 2048;

    const parseAspectRatioFromPrompt = (prompt: string): string => {
      const arMatch = prompt.match(/--ar\s+(\d+):(\d+)/i);
      if (arMatch) {
        const w = parseInt(arMatch[1]);
        const h = parseInt(arMatch[2]);
        if (w > h) return "16:9";
        if (h > w) return "9:16";
        return "1:1";
      }
      const aspectMatch = prompt.match(/aspect\s*ratio[:\s]+(\d+):(\d+)/i);
      if (aspectMatch) {
        const w = parseInt(aspectMatch[1]);
        const h = parseInt(aspectMatch[2]);
        if (w > h) return "16:9";
        if (h > w) return "9:16";
        return "1:1";
      }
      return aspectRatio;
    };

    const finalRatioStr = parseAspectRatioFromPrompt(promptContext);

    // Volcengine size mappings: all must maintain >= 3,686,400 pixels (Request id: ... error)
    if (finalRatioStr === '16:9') { width = 2560; height = 1440; } // 3.68M
    else if (finalRatioStr === '9:16') { width = 1440; height = 2560; } // 3.68M
    else if (finalRatioStr === '4:3') { width = 2304; height = 1728; } // 3.98M
    else if (finalRatioStr === '3:4') { width = 1728; height = 2304; } // 3.98M
    // Increased sizes for previously failing ratios:
    else if (finalRatioStr === '2:3') { width = 1600; height = 2400; } // 3.84M (was 1536x2304=3.5M)
    else if (finalRatioStr === '3:2') { width = 2400; height = 1600; } // 3.84M (was 2304x1536=3.5M)
    else if (finalRatioStr === '21:9') { width = 3024; height = 1296; } // 3.91M (was 2688x1152=3.0M)
    // 1:1 default 2048x2048 = 4.19M

    // Format reference image for Volcengine API
    const formatImageForVolcengine = (imageData: string, imgMimeType: string): string => {
      // If already a complete data URL, return as-is
      if (imageData.startsWith('data:image/')) {
        return imageData;
      }
      // If a URL, return as-is
      if (imageData.startsWith('http')) {
        return imageData;
      }
      // Otherwise, assume raw Base64 and add prefix
      return `data:${imgMimeType};base64,${imageData}`;
    };

    // Prepare reference images array if provided
    let volcengineImages: string[] | undefined;
    if (refImage) {
      const cleanRef = refImage.replace(/^data:image\/\w+;base64,/, "");
      volcengineImages = [formatImageForVolcengine(cleanRef, mimeType)];
      console.log(`[Volcengine] Including 1 reference image for I2I generation`);
    }

    // Apply 4K scaling if enabled (roughly 2x resolution)
    if (is4K) {
      width = Math.round(width * 1.5); // Scale up for 4K quality
      height = Math.round(height * 1.5);
      console.log(`[Volcengine] 4K mode enabled: ${width}x${height}`);
    }

    try {
      // Build request body
      const requestBody: Record<string, any> = {
        model: modelId,
        prompt: promptContext,
        size: `${width}x${height}`,
        guidance_scale: 2.5,
        response_format: "b64_json",
        sequential_image_generation: "disabled",
        stream: false,
        watermark: false,
        // Volcengine quality parameter: "Basic" (2K) or "High" (4K)
        quality: is4K ? "High" : "Basic"
      };

      // Add reference images if present (I2I / Mixed mode)
      if (volcengineImages && volcengineImages.length > 0) {
        requestBody.image = volcengineImages;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentConfig.apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal
      });

      if (!response.ok) {
        const errText = await response.text();
        try {
          // Try to parse the error JSON to give a better message
          const errJson = JSON.parse(errText);
          const errCode = errJson.error?.code;

          if (errCode === 'InputTextSensitiveContentDetected') {
            throw new Error("输入内容包含敏感信息，请修改提示词后重试。");
          }
          if (errCode === 'InvalidParameter' && errJson.error?.message?.includes('size')) {
            throw new Error("图片尺寸不符合要求。");
          }
        } catch (parseErr: any) {
          // If custom error was thrown above, rethrow it
          if (parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr;
          }
          // Otherwise ignore JSON parse errors and throw original
        }
        throw new Error(`Volcengine Error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      // Check standard format data[0].url or data[0].b64_json
      if (data.data && data.data.length > 0) {
        const item = data.data[0];
        if (item.b64_json) return item.b64_json;
        if (item.url) return item.url;
      }
      throw new Error("No image data in response");

    } catch (e: any) {
      console.error("Volcengine gen error", e);
      if (e.name === 'AbortError') throw e; // Pass abort
      throw new Error(`Volcengine Failed: ${e.message}`);
    }
  }

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

  // Select model variant based on aspect ratio and quality
  const baseModel = modelConfig.image || "gemini-3-pro-image";
  let modelId = baseModel;

  // Build model ID based on mode
  if (currentConfig.mode === 'custom') {
    // Custom mode: Build model name with suffixes
    // Base model should be clean (without -4k or ratio suffixes)
    let cleanBase = baseModel
      .replace(/-4k-16x9$/, '')
      .replace(/-4k-9x16$/, '')
      .replace(/-16x9$/, '')
      .replace(/-9x16$/, '')
      .replace(/-4k$/, '');

    // Build model ID: base + 4k (if enabled) + ratio suffix
    modelId = cleanBase;

    // Add 4K suffix if enabled
    if (is4K) {
      modelId += '-4k';
    }

    // Add ratio suffix (1:1 has no suffix)
    if (detectedRatio === "16:9" || detectedRatio === "4:3") {
      modelId += '-16x9';
    } else if (detectedRatio === "9:16" || detectedRatio === "3:4") {
      modelId += '-9x16';
    }
    // 1:1 has no suffix
  }
  // For official mode, we'll pass aspectRatio in the config below

  console.log(`[Image Gen] Mode: ${currentConfig.mode}, Ratio: ${detectedRatio}, 4K: ${is4K}, Model: ${modelId}`);

  try {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // For Google modes, get the client
    const client = getClient();
    let response;

    // Build generation config for official mode
    // Build generationConfig for both Official and Custom modes
    // Custom proxies often support official matching parameters too
    const generationConfig: any = {};
    if (currentConfig.mode === 'official' || currentConfig.mode === 'custom') {
      // API supports aspectRatio parameter
      // Add both camelCase and snake_case to be safe (Spray and Pray)
      generationConfig.aspectRatio = detectedRatio;
      generationConfig.aspect_ratio = detectedRatio;

      // Handle resolution (2K limit for Imagen 3)
      if (is4K) {
        generationConfig.imageSize = '2K';
      }
    }

    console.log('[GeminiService] Final generationConfig:', JSON.stringify(generationConfig, null, 2));

    if (refImage) {
      const cleanRef = refImage.replace(/^data:image\/\w+;base64,/, "");
      response = await client.models.generateContent({
        model: modelId,
        contents: [
          { inlineData: { mimeType, data: cleanRef } },
          promptContext
        ],
        ...(Object.keys(generationConfig).length > 0 && {
          generationConfig: generationConfig,
          config: {
            generationConfig: generationConfig,
            imageGenerationConfig: generationConfig
          }
        } as any)
      });
    } else {
      response = await client.models.generateContent({
        model: modelId,
        contents: promptContext,
        ...(Object.keys(generationConfig).length > 0 && {
          generationConfig: generationConfig,
          config: {
            generationConfig: generationConfig,
            imageGenerationConfig: generationConfig
          }
        } as any)
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
    console.error("Image gen error", error);
    // Translate all errors for user-friendly messages
    const userMsg = translateErrorMessage(error);
    throw new Error(userMsg);
  }
}

export async function executeReverseEngineering(
  imageBase64: string,
  mimeType: string = "image/jpeg",
  promptScript: string = SINGLE_STEP_REVERSE_PROMPT,
  signal?: AbortSignal
): Promise<ReverseEngineeringResult | null> {
  ensureConfigLoaded(); // Ensure config is loaded before mode check
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  try {
    let content = "";

    // VOLCENGINE MODE: Use Doubao Vision API
    if (currentConfig.mode === 'volcengine') {
      console.log("[Volcengine] Executing reverse engineering with Doubao Vision");
      content = await volcengineVisionCall(imageBase64, promptScript, mimeType);
    } else {
      // GOOGLE MODE: Use Gemini API with Fallback strategy
      const client = getClient();
      const initialModel = modelConfig.reasoning;
      // Prepare candidate list (primary + fallbacks)
      const modelsToTry = [initialModel, ...FALLBACK_MODELS.filter(m => m !== initialModel)];

      const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      let lastErr: any = null;
      let success = false;

      for (const modelId of modelsToTry) {
        try {
          // console.debug(`Attempting reverse engineering with ${modelId}...`);
          const response = await client.models.generateContent({
            model: modelId,
            contents: [
              { inlineData: { mimeType, data: cleanImage } },
              promptScript
            ]
          });
          content = response.text || "";
          if (!content) throw new Error("Empty response from AI");

          if (modelId !== initialModel) console.warn(`Fallback mechanism: Successfully switched to ${modelId}`);
          success = true;
          break;
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          // Only retry on network/server/quota errors
          const isRetryable = msg.includes('429') || msg.includes('404') || msg.includes('500') || msg.includes('503') || msg.includes('Overloaded') || msg.includes('fetch');

          if (!isRetryable) break; // Don't retry auth errors (401) or 400

          console.warn(`Model ${modelId} failed (${msg.substring(0, 50)}...), trying next fallback...`);
        }
      }

      if (!success) {
        throw lastErr;
      }
    }

    // Clean JSON block
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(cleanContent) as ReverseEngineeringResult;
    } catch (parseError) {
      console.warn("JSON Parse Error. Falling back to raw text handling. Raw content:", content.substring(0, 100) + "...");

      // Fallback for non-JSON output (custom Markdown prompts)
      return {
        image_analysis: {
          technical_specs: "N/A (Raw Output)",
          environment: "N/A (Raw Output)",
          lighting: "N/A (Raw Output)",
          colors: "N/A (Raw Output)",
          subject: "N/A (Raw Output)"
        },
        generated_prompt: content // Treat the entire response as the prompt/analysis
      } as ReverseEngineeringResult;
    }
  } catch (error: any) {
    // Reduce noise: Warn for anticipated API errors, Error for unexpected crashes
    const errStr = String(error?.message || error);
    if (errStr.includes("429") || errStr.includes("401") || errStr.includes("Exhausted")) {
      console.warn("Reverse engineering API Limit:", errStr);
    } else {
      console.error("Reverse engineering failed:", error);
    }
    // Translate error (e.g. 429) so App.tsx can display friendly message
    const userMsg = translateErrorMessage(error);
    throw new Error(userMsg);
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
