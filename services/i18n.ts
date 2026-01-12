export type Language = 'CN' | 'EN';

export type I18nKey =
  | 'nav.logo'
  | 'nav.pro'
  | 'nav.promptLab'
  | 'nav.gallery'
  | 'nav.help'
  | 'nav.sound.enabled'
  | 'nav.sound.disabled'
  | 'nav.sound.title'
  | 'nav.language'
  | 'settings.title'
  | 'panel.visualAssets'
  | 'panel.promptStudio'
  | 'panel.promptEditor'
  | 'panel.compare'
  | 'panel.newTask'
  | 'panel.downloadHD'
  | 'studio.mode.full'
  | 'studio.mode.quick'
  | 'studio.version.select'
  | 'studio.history'
  | 'studio.placeholder'
  | 'studio.reverse'
  | 'studio.generate'
  | 'studio.generate.multiple'
  | 'studio.generating'
  | 'studio.copy'
  | 'studio.chat'
  | 'studio.aiInput.placeholder'
  | 'studio.aiInput.analyzing'
  | 'studio.translateToCN'
  | 'studio.translateToEN'
  | 'studio.mention.original'
  | 'studio.mention.generated'
  | 'reverse.quick.title'
  | 'reverse.full.title'
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
  | 'toast.promptHistoryAdded'
  | 'toast.storageFull'
  | 'toast.promptGenerationComplete'
  | 'toast.analysisFailed'
  | 'toast.apiError'
  | 'toast.pleaseUploadImage'
  | 'toast.refinementApplied'
  | 'toast.regeneratingSuccess'
  | 'toast.regenerateFailed'
  | 'toast.generateImageFirst'
  | 'toast.executingQA'
  | 'toast.uploadImageFirst'
  | 'toast.generatingImagesSimple'
  | 'toast.translatingSimple'
  | 'toast.chatHelp'
  | 'toast.reverseGenerated'
  | 'panel.addReference'
  | 'history.reverse'
  | 'history.applyRefinement'
  | 'chat.pleaseGenerateFirst'
  | 'chat.executingQA'
  | 'chat.uploadImageFirst'
  | 'chat.generatingImages'
  | 'chat.translating'
  | 'chat.help'
  | 'mode.reverse.full.description'
  | 'mode.reverse.quick.description'
  | 'api.official'
  | 'api.custom'
  | 'api.keyStatus'
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
  | 'docs.title'
  | 'docs.subtitle'
  | 'docs.version'
  | 'agent.auditor'
  | 'agent.descriptor'
  | 'agent.architect'
  | 'agent.synthesizer'
  | 'agent.critic'
  | 'agent.sora'
  | 'common.yes'
  | 'common.no'
  | 'common.ok'
  | 'common.cancel'
  | 'common.close'
  | 'common.save'
  | 'common.delete'
  | 'common.download'
  | 'gallery.title'
  | 'gallery.keyboardHint'
  | 'refine.optimize'
  | 'refine.optimizePrompt'
  | 'refine.optimizeAndGenerate'
  | 'refine.optimizePromptOnly'
  | 'gallery.addToComparison'
  | 'gallery.addedToComparisonLeft'
  | 'toast.imageAddedToReference'
  | 'comparison.original'
  | 'comparison.selected'
  | 'comparison.generated'
  | 'toast.loading'
  | 'toast.loadFailed'
  | 'toast.addedToComparison'
  | 'gallery.openHoverTab'
  | 'history.noRecords'
  | 'studio.reverse.quickPrompt'
  | 'studio.reverse.fullPrompt'
  | 'studio.reverse.fullAuto'
  | 'studio.reverse.quickAuto'
  | 'studio.translate.tooltip'
  | 'studio.placeholder.analyzing'
  | 'studio.mention.tooltip'
  | 'studio.mention.tooltipDisabled'
  | 'studio.version.label'
  | 'studio.version.default'
  | 'studio.version.title'
  | 'gallery.tooltip.edit'
  | 'gallery.tooltip.timeline'
  | 'gallery.label.timeline'
  | 'gallery.tooltip.aggregation'
  | 'gallery.label.aggregation'
  | 'gallery.search.placeholder'
  | 'gallery.tooltip.allImages'
  | 'gallery.empty'
  | 'gallery.loading'
  | 'gallery.tooltip.close';

export const translations: Record<Language, Record<I18nKey, string>> = {
  CN: {
    'nav.logo': 'UnImage',
    'nav.pro': 'PRO',
    'nav.promptLab': 'Prompt 实验室',
    'nav.gallery': '相册',
    'nav.help': '帮助文档',
    'nav.sound.enabled': '音效已启用',
    'nav.sound.disabled': '音效已关闭',
    'nav.sound.title': '音效',
    'nav.language': '切换语言',
    'settings.title': '设置',
    'panel.visualAssets': 'Visual Assets',
    'panel.promptStudio': 'Prompt Studio',
    'panel.promptEditor': '提示词编辑器',
    'panel.compare': 'Compare',
    'panel.newTask': 'New Task',
    'panel.downloadHD': 'Download HD',
    'panel.addReference': '添加参考图',
    'studio.mode.full': '完整分析',
    'studio.mode.quick': '快速逆向',
    'studio.version.select': '选择版本',
    'studio.history': '历史',
    'studio.placeholder': '输入提示词，或上传图片逆向生成...',
    'studio.reverse': '逆向',
    'studio.generate': '生成',
    'studio.generate.multiple': '生成 {count} 张',
    'studio.generating': '生成中...',
    'studio.copy': '复制',
    'studio.chat': '历史',
    'studio.aiInput.placeholder': '输入 AI 指令...',
    'studio.aiInput.analyzing': '正在分析差异...',
    'studio.translateToCN': '翻译成中文',
    'studio.translateToEN': '翻译成英文',
    'studio.mention.original': '原图',
    'studio.mention.generated': '生成图',
    'reverse.quick.title': '快速单步逆向',
    'reverse.full.title': '完整4步分析',
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
    'toast.generateFailed': '图片生成失败，请重试或检查提示词',
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
    'toast.promptHistoryAdded': '✨ 提示词生成完成！',
    'toast.storageFull': '本地存储已满，请及时清理历史记录',
    'toast.promptGenerationComplete': '✨ 提示词生成完成！',
    'toast.analysisFailed': '分析失败，请重试',
    'toast.apiError': 'API 错误或配额限制',
    'toast.pleaseUploadImage': '请先上传图片',
    'toast.refinementApplied': '已应用所选建议',
    'toast.regeneratingSuccess': '✨ 重新生成完成',
    'toast.regenerateFailed': '重新生成失败',
    'toast.generateImageFirst': '请先生成图片后再进行质检',
    'toast.executingQA': '正在执行质检分析...',
    'toast.uploadImageFirst': '请先上传图片再进行逆向分析',
    'toast.generatingImagesSimple': '正在生成图片...',
    'toast.translatingSimple': '正在翻译...',
    'toast.chatHelp': '我可以帮你：\n- 逆向分析\n- 修改提示词\n- 翻译\n- 生成图片\n\n请告诉我你想要做什么？',
    'toast.reverseGenerated': '✨ 逆向生成完成！',
    'history.reverse': '逆向生成',
    'history.applyRefinement': '应用修订',
    'chat.pleaseGenerateFirst': '请先生成图片后再进行质检',
    'chat.executingQA': '正在执行质检分析...',
    'chat.uploadImageFirst': '请先上传图片再进行逆向分析',
    'chat.generatingImages': '正在生成图片...',
    'chat.translating': '正在翻译...',
    'chat.help': '我可以帮你：\n- 逆向分析\n- 修改提示词\n- 翻译\n- 生成图片\n\n请告诉我你想要做什么？',
    'mode.reverse.full.description': '完整4步骤逆向分析',
    'mode.reverse.quick.description': '快速单步逆向',
    'api.official': 'OFFICIAL',
    'api.custom': 'CUSTOM',
    'api.keyStatus': 'API Key 状态',
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
    'docs.title': '文档中心',
    'docs.subtitle': 'Documentation Center',
    'docs.version': 'v2.7.0',
    'agent.auditor': '场景鉴别与资产分类',
    'agent.descriptor': '微观材质与细节扫描',
    'agent.architect': '空间构成与光影解构',
    'agent.synthesizer': '提示词生成引擎',
    'agent.critic': '复刻精度质检',
    'agent.sora': 'Sora 视频复刻专家',
    'common.yes': '是',
    'common.no': '否',
    'common.ok': '确定',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.save': '保存',
    'common.delete': '删除',
    'common.download': '下载',
    'gallery.title': '相册',
    'gallery.keyboardHint': '← → ↑ ↓ 选择 · 空格 打开 · Enter 编辑 · ESC 关闭',
    'refine.optimize': '优化',
    'refine.optimizePrompt': '优化提示词',
    'refine.optimizeAndGenerate': '优化并生成',
    'refine.optimizePromptOnly': '仅优化提示词',
    'gallery.addToComparison': '添加到对比模式',
    'gallery.addedToComparisonLeft': '已添加到对比模式 (左侧)',
    'toast.imageAddedToReference': '已添加图片到参考区域',
    'comparison.original': '原图',
    'comparison.selected': '自选',
    'comparison.generated': '生成',
    'toast.loading': '正在加载...',
    'toast.loadFailed': '加载失败',
    'toast.addedToComparison': '已添加到对比模式',
    'gallery.openHoverTab': '打开相册',
    'history.noRecords': '暂无历史记录',
    'studio.reverse.quickPrompt': '快速逆向-提示词',
    'studio.reverse.fullPrompt': '完整逆向-提示词',
    'studio.reverse.fullAuto': '完整逆向',
    'studio.reverse.quickAuto': '快速逆向',
    'studio.translate.tooltip': '翻译提示词',
    'studio.placeholder.analyzing': 'AI 正在分析画面...',
    'studio.mention.tooltip': '引用图片',
    'studio.mention.tooltipDisabled': '请先上传或生成图片',
    'studio.version.label': '版本',
    'studio.version.default': '默认',
    'studio.version.title': 'PROMPT VERSIONS',
    'gallery.tooltip.edit': '编辑此图',
    'gallery.tooltip.timeline': '时间流视图',
    'gallery.label.timeline': '时间流',
    'gallery.tooltip.aggregation': '原图聚合视图',
    'gallery.label.aggregation': '聚合',
    'gallery.search.placeholder': '搜索提示词...',
    'gallery.tooltip.allImages': '全部图片',
    'gallery.empty': '暂无图片',
    'gallery.loading': '加载中...',
    'gallery.tooltip.close': '关闭大图',
  },

  EN: {
    'nav.logo': 'UnImage',
    'nav.pro': 'PRO',
    'nav.promptLab': 'Prompt Lab',
    'nav.gallery': 'Gallery',
    'nav.help': 'Help',
    'nav.sound.enabled': 'Sound Enabled',
    'nav.sound.disabled': 'Sound Disabled',
    'nav.sound.title': 'Sound',
    'nav.language': 'Switch Language',
    'settings.title': 'Settings',
    'panel.visualAssets': 'Visual Assets',
    'panel.promptStudio': 'Prompt Studio',
    'panel.promptEditor': 'Prompt Editor',
    'panel.compare': 'Compare',
    'panel.newTask': 'New Task',
    'panel.downloadHD': 'Download HD',
    'panel.addReference': 'Add Reference Image',
    'studio.mode.full': 'Full Analysis',
    'studio.mode.quick': 'Quick Reverse',
    'studio.version.select': 'Select Version',
    'studio.history': 'History',
    'studio.placeholder': 'Enter prompt, or upload image for reverse engineering...',
    'studio.reverse': 'Reverse',
    'studio.generate': 'Generate',
    'studio.generate.multiple': 'Generate {count}',
    'studio.generating': 'Generating...',
    'studio.copy': 'Copy',
    'studio.chat': 'History',
    'studio.aiInput.placeholder': 'Enter AI command...',
    'studio.aiInput.analyzing': 'Analyzing differences...',
    'studio.translateToCN': 'Translate to Chinese',
    'studio.translateToEN': 'Translate to English',
    'studio.mention.original': 'Original Image',
    'studio.mention.generated': 'Generated Image',
    'reverse.quick.title': 'Quick Single-Step Reverse',
    'reverse.full.title': 'Full 4-Step Analysis',
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
    'toast.generateFailed': 'Image generation failed. Please try again or check your prompt.',
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
    'toast.promptHistoryAdded': '✨ Prompt generation complete!',
    'toast.storageFull': 'Local storage full. Please clear history.',
    'toast.promptGenerationComplete': '✨ Prompt generation complete!',
    'toast.analysisFailed': 'Analysis failed. Please try again.',
    'toast.apiError': 'API error or quota limit',
    'toast.pleaseUploadImage': 'Please upload an image first',
    'toast.refinementApplied': 'Applied selected suggestions',
    'toast.regeneratingSuccess': '✨ Regeneration complete',
    'toast.regenerateFailed': 'Regeneration failed',
    'toast.generateImageFirst': 'Please generate image first before QA',
    'toast.executingQA': 'Executing quality check...',
    'toast.uploadImageFirst': 'Please upload image first before reverse analysis',
    'toast.generatingImagesSimple': 'Generating images...',
    'toast.translatingSimple': 'Translating...',
    'toast.chatHelp': 'I can help you with:\n- Reverse analysis\n- Modify prompt\n- Translate\n- Generate images\n\nWhat would you like to do?',
    'toast.reverseGenerated': '✨ Reverse generation complete!',
    'history.reverse': 'Reverse Generation',
    'history.applyRefinement': 'Apply Refinement',
    'chat.pleaseGenerateFirst': 'Please generate image first before QA',
    'chat.executingQA': 'Executing quality check...',
    'chat.uploadImageFirst': 'Please upload image first before reverse analysis',
    'chat.generatingImages': 'Generating images...',
    'chat.translating': 'Translating...',
    'chat.help': 'I can help you with:\n- Reverse analysis\n- Modify prompt\n- Translate\n- Generate images\n\nWhat would you like to do?',
    'mode.reverse.full.description': 'Full 4-step reverse analysis',
    'mode.reverse.quick.description': 'Quick single-step reverse',
    'api.official': 'OFFICIAL',
    'api.custom': 'CUSTOM',
    'api.keyStatus': 'API Key Status',
    'landing.online': 'UnImage Engine v2.5 Online',
    'landing.title': 'Visual Asset\nCloning',
    'landing.subtitle': 'Enterprise-level visual reverse engineering platform. From static product photography to Sora dynamic video, we decode lighting and physics of every frame.',
    'landing.needsApiKey.title': 'API Key Required',
    'landing.needsApiKey.description': 'To ensure your generation quota, released version requires you to configure your own Google Gemini API Key. Your key will be securely stored in browser.',
    'landing.needsApiKey.button': 'Configure Key Now',
    'landing.needsApiKey.help': 'Get API Key Help →',
    'landing.enterApp': 'Start Asset Cloning',
    'landing.configureKey': 'CONFIGURE API KEY',
    'landing.footer': '© 2024 UnImage. Powered by Google Gemini 2.5 & 3 Pro.',
    'docs.title': 'Documentation',
    'docs.subtitle': 'Documentation Center',
    'docs.version': 'v2.7.0',
    'agent.auditor': 'Scene Classification & Asset Auditing',
    'agent.descriptor': 'Micro Texture & Detail Scanning',
    'agent.architect': 'Spatial Composition & Lighting Deconstruction',
    'agent.synthesizer': 'Prompt Generation Engine',
    'agent.critic': 'Replication Quality Assurance',
    'agent.sora': 'Sora Video Replication Expert',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.download': 'Download',
    'gallery.title': 'Gallery',
    'gallery.keyboardHint': '← → ↑ ↓ Navigate · Space Open · Enter Edit · ESC Close',
    'refine.optimize': 'Optimize',
    'refine.optimizePrompt': 'Refine Prompt',
    'refine.optimizeAndGenerate': 'Optimize & Generate',
    'refine.optimizePromptOnly': 'Refine Prompt Only',
    'gallery.addToComparison': 'Add to Comparison',
    'gallery.addedToComparisonLeft': 'Added to Comparison (Left)',
    'toast.imageAddedToReference': 'Image added to reference area',
    'comparison.original': 'ORIGINAL',
    'comparison.selected': 'SELECTED',
    'comparison.generated': 'GENERATED',
    'toast.loading': 'Loading...',
    'toast.loadFailed': 'Load Failed',
    'toast.addedToComparison': 'Added to Comparison',
    'gallery.openHoverTab': 'Open Gallery',
    'history.noRecords': 'No history records',
    'studio.reverse.quickPrompt': 'Quick Reverse - Prompt',
    'studio.reverse.fullPrompt': 'Full Reverse - Prompt',
    'studio.reverse.fullAuto': 'Full Reverse',
    'studio.reverse.quickAuto': 'Quick Reverse',
    'studio.translate.tooltip': 'Translate Prompt',
    'studio.placeholder.analyzing': 'AI is analyzing the scene...',
    'studio.mention.tooltip': 'Mention Image',
    'studio.mention.tooltipDisabled': 'Upload or generate image first',
    'studio.version.label': 'Version',
    'studio.version.default': 'Default',
    'studio.version.title': 'PROMPT VERSIONS',
    'gallery.tooltip.edit': 'Edit Image',
    'gallery.tooltip.timeline': 'Timeline View',
    'gallery.label.timeline': 'Timeline',
    'gallery.tooltip.aggregation': 'Original Aggregation View',
    'gallery.label.aggregation': 'Aggregation',
    'gallery.search.placeholder': 'Search prompts...',
    'gallery.tooltip.allImages': 'All Images',
    'gallery.empty': 'No Images',
    'gallery.loading': 'Loading...',
    'gallery.tooltip.close': 'Close Viewer',
  }
};

export const DEFAULT_LANGUAGE: Language = 'CN';
export const LANGUAGE_STORAGE_KEY = 'unimage_language';

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

export const storeLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('[i18n] Failed to save language to localStorage:', e);
  }
};
