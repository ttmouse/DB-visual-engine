
import OpenAI from 'openai';
import { AGENTS } from "../constants";
import { AgentRole, LayoutElement } from "../types";

let client: OpenAI | null = null;
let currentConfig = { apiKey: '', baseUrl: '' };

// Default Model Configuration
let modelConfig = {
  reasoning: "gemini-3-pro-high",
  fast: "gemini-3-flash",
  image: "gemini-3-pro-image"
};

const isQuotaError = (error: any): boolean => {
  const msg = error?.toString() || "";
  return msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("insufficient_quota");
};

export const configureClient = (apiKey: string, baseUrl: string) => {
  if (!apiKey || !baseUrl) return;

  // Robustness: Ensure baseUrl ends with /v1 to match local proxy requirements
  let finalUrl = baseUrl;
  if (!finalUrl.includes('/v1')) {
    finalUrl = finalUrl.endsWith('/') ? `${finalUrl}v1` : `${finalUrl}/v1`;
  }

  currentConfig = { apiKey, baseUrl: finalUrl };
  client = new OpenAI({
    apiKey: apiKey,
    baseURL: finalUrl,
    dangerouslyAllowBrowser: true
  });
};

export const configureModels = (config: { reasoning?: string; fast?: string; image?: string }) => {
  modelConfig = {
    reasoning: config.reasoning || modelConfig.reasoning,
    fast: config.fast || modelConfig.fast,
    image: config.image || modelConfig.image
  };
};

const initModelsFromStorage = () => {
  const r = localStorage.getItem('DB_model_reasoning');
  const f = localStorage.getItem('DB_model_fast');
  const i = localStorage.getItem('DB_model_image');
  if (r || f || i) {
    configureModels({ reasoning: r || undefined, fast: f || undefined, image: i || undefined });
  }
};

// Initialize with env vars if available (Client)
if (process.env.GEMINI_API_KEY && process.env.API_ENDPOINT) {
  configureClient(process.env.GEMINI_API_KEY, process.env.API_ENDPOINT);
}
// Initialize models from storage
initModelsFromStorage();


const getClient = () => {
  if (!client) {
    // Try to recover from localStorage if not initialized (fallback)
    const storedKey = localStorage.getItem('DB_api_key');
    const storedUrl = localStorage.getItem('DB_base_url');
    if (storedKey && storedUrl) {
      configureClient(storedKey, storedUrl);
    }
  }
  if (!client) throw new Error("API Client not configured. Please set API Key and Endpoint.");
  return client;
};

export async function* streamAgentAnalysis(
  role: AgentRole,
  imageBase64: string,
  previousContext: string
) {
  const openai = getClient();
  const agent = AGENTS[role];

  // Use Reasoning model for smart agents
  const model = modelConfig.reasoning;

  const fullPrompt = `
    ${agent.systemInstruction}
    ---
    ${previousContext ? `以下是前序分析步骤的上下文汇总：\n${previousContext}` : "这是流水线的第一阶段。"}
  `;

  try {
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      console.log(`[DEBUG] Agent ${role} chunk:`, JSON.stringify(chunk));
      const delta = chunk.choices[0]?.delta;
      const legacyText = (chunk.choices[0] as any)?.text;
      const content = delta?.content || legacyText || "";
      if (content) yield content;
    }
  } catch (error) {
    console.error(`Agent ${role} error:`, error);
    if (isQuotaError(error)) yield `\n\n[⚠️ 配额限制]：请求过载或额度不足。`;
    else yield `\n\n[错误]：引擎在 ${role} 阶段异常 (${error})。`;
  }
}

export async function translatePrompt(text: string, targetLang: 'CN' | 'EN'): Promise<string> {
  const openai = getClient();
  // Use Fast model for utility tasks
  const model = modelConfig.fast;

  const prompt = targetLang === 'EN'
    ? `Translate this 7-layer prompt into professional English for Midjourney/Stable Diffusion. Keep the Markdown structure exactly same.\n\n${text}`
    : `将此 7 层架构提示词翻译为中文，保持 Markdown 标题结构：\n\n${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Translate error:", error);
    return text;
  }
}

export async function detectLayout(imageBase64: string): Promise<LayoutElement[]> {
  const openai = getClient();
  // Use Fast model for layout
  const model = modelConfig.fast;

  const prompt = "Detect all major visual elements in this image and return their 2D bounding boxes and hierarchy labels (Primary, Secondary, Graphic). Return ONLY valid JSON array.";

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });
    const content = response.choices[0]?.message?.content || "[]";
    // Handle potential markdown backticks wrapping json
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error("Layout analysis failed", e);
    return [];
  }
}

export async function* streamConsistencyCheck(originalImage: string, generatedImage: string) {
  const openai = getClient();
  // QA needs good vision -> Reasoning model
  const model = modelConfig.reasoning;

  const prompt = `${AGENTS[AgentRole.CRITIC].systemInstruction}\n\nCompare Source vs Replica.`;
  try {
    const stream = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${originalImage}` } },
            { type: "image_url", image_url: { url: `data:image/png;base64,${generatedImage}` } } // Generated image might be PNG
          ]
        }
      ],
      stream: true
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) yield content;
    }
  } catch (error) { yield "质检不可用。"; }
}

export async function refinePromptWithFeedback(originalPrompt: string, feedback: string): Promise<string> {
  const openai = getClient();
  // Use Fast model for simple text refinement
  const model = modelConfig.fast;

  const prompt = `Refine the following 7-layer prompt based on this feedback:\n${feedback}\n\nOriginal Prompt:\n${originalPrompt}`;
  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }]
    });
    return response.choices[0]?.message?.content || originalPrompt;
  } catch (error) { return originalPrompt; }
}

export async function generateImageFromPrompt(promptContext: string, aspectRatio: string, refImage?: string | null, mimeType: string = "image/jpeg"): Promise<string | null> {
  const openai = getClient();
  // Use Image model
  const model = modelConfig.image;

  // Map aspect ratio to standard sizes
  const sizeMap: Record<string, string> = {
    "1:1": "1024x1024",
    "16:9": "1280x720",
    "9:16": "720x1280",
    "4:3": "1216x896",
    "3:4": "896x1216"
  };
  const size = sizeMap[aspectRatio] || "1024x1024";

  const messages: any[] = [{ role: "user", content: promptContext }];

  // Note: The extra_body protocol provided doesn't explicitly mention how refImage is passed in chat completion
  // but typically for multimodal models it would be an image_url content part.
  // However, if the user protocol is strict about chat.completions.create just for generation commands,
  // we follow the text prompting structure. 
  // If refImage is needed, we would add it to messages content array.

  if (refImage) {
    messages[0].content = [
      { type: "text", text: promptContext },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${refImage}` } }
    ];
  }

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      // @ts-ignore - OpenAI types might not know about extra_body strictly yet or generic enough
      extra_body: { size: size }
    });

    const content = response.choices[0]?.message?.content;

    // Post-process: try to extract base64 or url if it's wrapped in markdown or just raw
    if (!content) return null;

    // If content is a URL, we might need to fetch it to get base64 for our app display 
    // (since our app uses base64 for local preview mostly).
    if (content.startsWith("http")) {
      return null; // TODO: Implement URL to Base64 if needed, or hope proxy returns Base64.
    }

    return content; // Assume Proxy returns raw base64 string in content as is common in some ad-hoc adapters
  } catch (error) {
    console.error("Image gen error:", error);
    throw error;
  }
}
