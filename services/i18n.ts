/**
 * [INPUT]: 无依赖
 * [OUTPUT]: 导出 i18n 配置（翻译映射表、类型定义、默认语言）
 * [POS]: 国际化核心配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ==================== 类型定义 ====================

export type Language = 'CN' | 'EN';

export type I18nKey =
  // ========== 导航栏 ==========
  | 'nav.logo'
  | 'nav.pro'
  | 'nav.promptLab'
  | 'nav.gallery'
  | 'nav.help'
  | 'nav.sound.enabled'
  | 'nav.sound.disabled'
  | 'nav.language'

  // ========== 面板 ==========
  | 'panel.visualAssets'
  | 'panel.promptStudio'
  | 'panel.promptEditor'
  | 'panel.compare'
  | 'panel.newTask'
  | 'panel.downloadHD'

  // ========== 工作区 ==========
  | 'studio.mode.full'
  | 'studio.mode.quick'
  | 'studio.version.select'
  | 'studio.history'
  | 'studio.placeholder'
  | 'studio.reverse'
  | 'studio.generate'
  | 'studio.generate.multiple'
  | 'studio.copy'
  | 'studio.chat'
  | 'studio.aiInput.placeholder'
  | 'studio.aiInput.analyzing'

  // ========== 逆向分析 ==========
  | 'reverse.quick.title'
  | 'reverse.full.title'

  // ========== Toast 消息 ==========
  | 'toast.operationStopped'
  | 'toast.promptExtracted'
  | 'toast.layoutComplete'
  | 'toast.layoutFailed'
  | 'toast.translating.toCN'
  | 'toast.translating.toEN'
  | 'toast.translateFailed'
  | 'toast.reverseComplete'
  | 'toast.reverseFailed'
  | 'toast.qaComplete'
  | 'toast.qaFailed'
  | 'toast.appliedRefinement'
  | 'toast.applyRefinementFailed'
  | 'toast.generatingImages'
  | 'toast.successGenerated'
  | 'toast.partialGenerated'
  | 'toast.generateFailed'
  | 'toast.noValidImage'
  | 'toast.copied'
  | 'toast.deleted'
  | 'toast.imageDownloaded'
  | 'toast.newImageLoaded'
  | 'toast.newVideoLoaded'
  | 'toast.fileTooLarge'
  | 'toast.quotaExceeded'
  | 'toast.referenceEnabled'
  | 'toast.referenceMainEnabled'
  | 'toast.referenceAdded'
  | 'toast.addReferenceImage'
  | 'toast.promptHistoryAdded'
  | 'toast.storageFull'
  | 'toast.promptGenerationComplete'
  | 'toast.analysisFailed'
  | 'toast.apiError'
  | 'toast.pleaseUploadImage'
  | 'toast.refinementApplied'

  // ========== 模式 ==========
  | 'mode.reverse.full.description'
  | 'mode.reverse.quick.description'

  // ========== API ==========
  | 'api.official'
  | 'api.custom'
  | 'api.keyStatus'

  // ========== Landing Page ==========
  | 'landing.online'
  | 'landing.title'
  | 'landing.subtitle'
  | 'landing.needsApiKey.title'
  | 'landing.needsApiKey.description'
  | 'landing.needsApiKey.button'
  | 'landing.needsApiKey.help'
  | 'landing.enterApp'
  | 'landing.configureKey'
  | 'landing.footer'

  // ========== 文档 ==========
  | 'docs.title'
  | 'docs.subtitle'
  | 'docs.version'

  // ========== Agent 名称 ==========
  | 'agent.auditor'
  | 'agent.descriptor'
  | 'agent.architect'
  | 'agent.synthesizer'
  | 'agent.critic'
  | 'agent.sora'

  // ========== 其他 ==========
  | 'common.yes'
  | 'common.no'
  | 'common.ok'
  | 'common.cancel'
  | 'common.close'
  | 'common.save'
  | 'common.delete'
  | 'common.download';

// ==================== 翻译映射表 ====================

export const translations: Record<Language, Record<I18nKey, string>> = {
  CN: {
    // 导航栏
    'nav.logo': 'UnImage',
    'nav.pro': 'PRO',
    'nav.promptLab': 'Prompt 实验室',
    'nav.gallery': '相册',
    'nav.help': '帮助文档',
    'nav.sound.enabled': '音效已启用',
    'nav.sound.disabled': '音效已关闭',
    'nav.language': '切换语言',

    // 面板
    'panel.visualAssets': 'Visual Assets',
    'panel.promptStudio': 'Prompt Studio',
    'panel.promptEditor': '提示词编辑器',
    'panel.compare': 'Compare',
    'panel.newTask': 'New Task',
    'panel.downloadHD': 'Download HD',

    // 工作区
    'studio.mode.full': '完整分析',
    'studio.mode.quick': '快速逆向',
    'studio.version.select': '选择版本',
    'studio.history': '历史',
    'studio.placeholder': '输入提示词，或上传图片逆向生成...',
    'studio.reverse': '逆向',
    'studio.generate': '生成',
    'studio.generate.multiple': '生成 {count} 张',
    'studio.copy': '复制',
    'studio.chat': '历史',
    'studio.aiInput.placeholder': '输入 AI 指令...',
    'studio.aiInput.analyzing': '正在分析差异...',

    // 逆向分析
    'reverse.quick.title': '快速单步逆向',
    'reverse.full.title': '完整4步分析',

    // Toast 消息
    'toast.operationStopped': '操作已终止',
    'toast.promptExtracted': '📋 已从图片中提取提示词',
    'toast.layoutComplete': '蓝图解构完成',
    'toast.layoutFailed': '布局分析失败',
    'toast.translating.toCN': '正在切换至中文工程模式...',
    'toast.translating.toEN': '正在切换至英文 MJ 模式...',
    'toast.translateFailed': '翻译失败',
    'toast.reverseComplete': '✨ 逆向完成！',
    'toast.reverseFailed': '逆向失败',
    'toast.qaComplete': '质检完成',
    'toast.qaFailed': '质检失败',
    'toast.appliedRefinement': '已应用修订，请查看 Prompt Studio',
    'toast.applyRefinementFailed': '应用修订失败',
    'toast.generatingImages': '正在生成 {count} 张图片...',
    'toast.successGenerated': '成功生成 {count}/{total} 张图片',
    'toast.partialGenerated': '成功生成 {count}/{total} 张图片',
    'toast.generateFailed': '生成失败，模型未返回有效图片',
    'toast.noValidImage': '无法获取原图',
    'toast.copied': '已复制',
    'toast.deleted': '已删除记录',
    'toast.imageDownloaded': '✨ 图片已下载（含提示词元数据）',
    'toast.newImageLoaded': '已加载新图片',
    'toast.newVideoLoaded': '已加载新视频',
    'toast.fileTooLarge': '文件过大 (最大 20MB)',
    'toast.quotaExceeded': '额度不足',
    'toast.referenceEnabled': '已启用参考图生成',
    'toast.referenceMainEnabled': '已启用主图参考生成',
    'toast.referenceAdded': '已添加 {count} 张参考图',
    'toast.addReferenceImage': '添加参考图',
    'toast.promptHistoryAdded': '✨ 提示词生成完成！',
    'toast.storageFull': '本地存储已满，请及时清理历史记录',
    'toast.promptGenerationComplete': '✨ 提示词生成完成！',
    'toast.analysisFailed': '分析失败，请重试',
    'toast.apiError': 'API 错误或配额限制',
    'toast.pleaseUploadImage': '请先上传图片',
    'toast.refinementApplied': '已应用所选建议',

    // 模式
    'mode.reverse.full.description': '完整4步骤逆向分析',
    'mode.reverse.quick.description': '快速单步逆向',

    // API
    'api.official': 'OFFICIAL',
    'api.custom': 'CUSTOM',
    'api.keyStatus': 'API Key 状态',

    // Landing Page
    'landing.online': 'UnImage Engine v2.5 Online',
    'landing.title': 'Visual Asset\nCloning',
    'landing.subtitle': '企业级视觉逆向工程平台。从 静态产品摄影 到 Sora 动态视频，我们解码每一帧的光影与物理逻辑。',
    'landing.needsApiKey.title': '需要配置 API Key',
    'landing.needsApiKey.description': '为了保障您的生成配额，发布版本需要您配置自己的 Google Gemini API Key。您的 Key 会被安全存储在浏览器本地环境中。',
    'landing.needsApiKey.button': '立即配置 Key',
    'landing.needsApiKey.help': '获取 API Key 帮助 →',
    'landing.enterApp': '开始资产复刻',
    'landing.configureKey': '配置 API KEY',
    'landing.footer': '© 2024 UnImage. Powered by Google Gemini 2.5 & 3 Pro.',

    // 文档
    'docs.title': '文档中心',
    'docs.subtitle': 'Documentation Center',
    'docs.version': 'v2.6.0',

    // Agent 名称
    'agent.auditor': '场景鉴别与资产分类',
    'agent.descriptor': '微观材质与细节扫描',
    'agent.architect': '空间构成与光影解构',
    'agent.synthesizer': '提示词生成引擎',
    'agent.critic': '复刻精度质检',
    'agent.sora': 'Sora 视频复刻专家',

    // 通用
    'common.yes': '是',
    'common.no': '否',
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.save': '保存',
    'common.delete': '删除',
    'common.download': '下载',
  },

  EN: {
    // 导航栏
    'nav.logo': 'UnImage',
    'nav.pro': 'PRO',
    'nav.promptLab': 'Prompt Lab',
    'nav.gallery': 'Gallery',
    'nav.help': 'Help',
    'nav.sound.enabled': 'Sound Enabled',
    'nav.sound.disabled': 'Sound Disabled',
    'nav.language': 'Switch Language',

    // 面板
    'panel.visualAssets': 'Visual Assets',
    'panel.promptStudio': 'Prompt Studio',
    'panel.promptEditor': 'Prompt Editor',
    'panel.compare': 'Compare',
    'panel.newTask': 'New Task',
    'panel.downloadHD': 'Download HD',

    // 工作区
    'studio.mode.full': 'Full Analysis',
    'studio.mode.quick': 'Quick Reverse',
    'studio.version.select': 'Select Version',
    'studio.history': 'History',
    'studio.placeholder': 'Enter prompt, or upload image for reverse engineering...',
    'studio.reverse': 'Reverse',
    'studio.generate': 'Generate',
    'studio.generate.multiple': 'Generate {count}',
    'studio.copy': 'Copy',
    'studio.chat': 'History',
    'studio.aiInput.placeholder': 'Enter AI command...',
    'studio.aiInput.analyzing': 'Analyzing differences...',

    // 逆向分析
    'reverse.quick.title': 'Quick Single-Step Reverse',
    'reverse.full.title': 'Full 4-Step Analysis',

    // Toast 消息
    'toast.operationStopped': 'Operation stopped',
    'toast.promptExtracted': '📋 Prompt extracted from image',
    'toast.layoutComplete': 'Layout deconstruction complete',
    'toast.layoutFailed': 'Layout analysis failed',
    'toast.translating.toCN': 'Switching to Chinese engineering mode...',
    'toast.translating.toEN': 'Switching to English MJ mode...',
    'toast.translateFailed': 'Translation failed',
    'toast.reverseComplete': '✨ Reverse engineering complete!',
    'toast.reverseFailed': 'Reverse failed',
    'toast.qaComplete': 'Quality check complete',
    'toast.qaFailed': 'Quality check failed',
    'toast.appliedRefinement': 'Refinement applied. Check Prompt Studio.',
    'toast.applyRefinementFailed': 'Failed to apply refinement',
    'toast.generatingImages': 'Generating {count} images...',
    'toast.successGenerated': 'Successfully generated {count}/{total} images',
    'toast.partialGenerated': 'Generated {count}/{total} images',
    'toast.generateFailed': 'Generation failed. No valid image returned.',
    'toast.noValidImage': 'Cannot retrieve original image',
    'toast.copied': 'Copied',
    'toast.deleted': 'Record deleted',
    'toast.imageDownloaded': '✨ Image downloaded (with prompt metadata)',
    'toast.newImageLoaded': 'New image loaded',
    'toast.newVideoLoaded': 'New video loaded',
    'toast.fileTooLarge': 'File too large (max 20MB)',
    'toast.quotaExceeded': 'Quota exceeded',
    'toast.referenceEnabled': 'Reference image generation enabled',
    'toast.referenceMainEnabled': 'Main image reference generation enabled',
    'toast.referenceAdded': 'Added {count} reference images',
    'toast.addReferenceImage': 'Add Reference Image',
    'toast.promptHistoryAdded': '✨ Prompt generation complete!',
    'toast.storageFull': 'Local storage full. Please clear history.',
    'toast.promptGenerationComplete': '✨ Prompt generation complete!',
    'toast.analysisFailed': 'Analysis failed. Please try again.',
    'toast.apiError': 'API error or quota limit',
    'toast.pleaseUploadImage': 'Please upload an image first',
    'toast.refinementApplied': 'Applied selected suggestions',

    // 模式
    'mode.reverse.full.description': 'Full 4-step reverse analysis',
    'mode.reverse.quick.description': 'Quick single-step reverse',

    // API
    'api.official': 'OFFICIAL',
    'api.custom': 'CUSTOM',
    'api.keyStatus': 'API Key Status',

    // Landing Page
    'landing.online': 'UnImage Engine v2.5 Online',
    'landing.title': 'Visual Asset\nCloning',
    'landing.subtitle': 'Enterprise-level visual reverse engineering platform. From static product photography to Sora dynamic video, we decode the lighting and physics of every frame.',
    'landing.needsApiKey.title': 'API Key Required',
    'landing.needsApiKey.description': 'To ensure your generation quota, the released version requires you to configure your own Google Gemini API Key. Your key will be securely stored in the browser.',
    'landing.needsApiKey.button': 'Configure Key Now',
    'landing.needsApiKey.help': 'Get API Key Help →',
    'landing.enterApp': 'Start Asset Cloning',
    'landing.configureKey': 'CONFIGURE API KEY',
    'landing.footer': '© 2024 UnImage. Powered by Google Gemini 2.5 & 3 Pro.',

    // 文档
    'docs.title': 'Documentation',
    'docs.subtitle': 'Documentation Center',
    'docs.version': 'v2.6.0',

    // Agent 名称
    'agent.auditor': 'Scene Classification & Asset Auditing',
    'agent.descriptor': 'Micro Texture & Detail Scanning',
    'agent.architect': 'Spatial Composition & Lighting Deconstruction',
    'agent.synthesizer': 'Prompt Generation Engine',
    'agent.critic': 'Replication Quality Assurance',
    'agent.sora': 'Sora Video Replication Expert',

    // 通用
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.download': 'Download',
  }
};

// ==================== 默认语言 ====================

export const DEFAULT_LANGUAGE: Language = 'CN';
export const LANGUAGE_STORAGE_KEY = 'unimage_language';

// ==================== 辅助函数 ====================

/**
 * 从 localStorage 获取保存的语言设置
 */
export const getStoredLanguage = (): Language => {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'CN' || stored === 'EN') {
      return stored;
    }
  } catch (e) {
    console.warn('[i18n] Failed to read language from localStorage:', e);
  }
  return DEFAULT_LANGUAGE;
};

/**
 * 保存语言设置到 localStorage
 */
export const storeLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('[i18n] Failed to save language to localStorage:', e);
  }
};
