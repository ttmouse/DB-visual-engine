
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { configureClient, configureModels, listVolcengineModels } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiMode, setApiMode] = useState<'official' | 'custom' | 'volcengine'>('custom');

  // Separate states for keys
  const [officialKey, setOfficialKey] = useState('');
  const [customKey, setCustomKey] = useState('');
  const [volcengineKey, setVolcengineKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Derived current key for display/logic
  const currentKey = apiMode === 'official' ? officialKey : (apiMode === 'volcengine' ? volcengineKey : customKey);
  const setApiKey = (val: string) => {
    if (apiMode === 'official') setOfficialKey(val);
    else if (apiMode === 'volcengine') setVolcengineKey(val);
    else setCustomKey(val);
  };

  // Model Config State
  const [reasoningModel, setReasoningModel] = useState('gemini-3-pro-high');
  const [fastModel, setFastModel] = useState('gemini-3-flash');
  const [imageModel, setImageModel] = useState('gemini-3-pro-image');

  const [isTestLoading, setIsTestLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'connection' | 'models'>('connection');

  // Volcengine model discovery
  const [availableModels, setAvailableModels] = useState<{ id: string; type: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [visionModel, setVisionModel] = useState('seed-1-6-250915');

  useEffect(() => {
    if (isOpen) {
      // Load API mode
      const storedMode = (localStorage.getItem('berryxia_api_mode') || 'custom') as 'official' | 'custom' | 'volcengine';
      setApiMode(storedMode);

      // Load keys from separate storage (with fallback to legacy)
      const legacyKey = localStorage.getItem('berryxia_api_key') || process.env.GEMINI_API_KEY || '';

      const storedOfficialKey = localStorage.getItem('berryxia_api_key_official') || (storedMode === 'official' ? legacyKey : '');
      const storedCustomKey = localStorage.getItem('berryxia_api_key_custom') || (storedMode === 'custom' ? legacyKey : '');
      const storedVolcengineKey = localStorage.getItem('berryxia_api_key_volcengine') || '';

      setOfficialKey(storedOfficialKey);
      setCustomKey(storedCustomKey);
      setVolcengineKey(storedVolcengineKey);

      const storedUrl = localStorage.getItem('berryxia_base_url') || process.env.API_ENDPOINT || 'http://127.0.0.1:8045';
      setBaseUrl(storedUrl);

      // Load Models - different defaults for official vs custom vs volcengine
      let defaultReasoning = 'gemini-3-pro-high';
      let defaultFast = 'gemini-3-flash';
      let defaultImage = 'gemini-3-pro-image';

      if (storedMode === 'official') {
        defaultReasoning = 'gemini-3-flash-preview';
        defaultFast = 'gemini-3-flash-preview';
        defaultImage = 'gemini-3-pro-image-preview';
      } else if (storedMode === 'volcengine') {
        // Volcengine specific defaults
        defaultReasoning = 'gemini-3-pro-high'; // Fallback to reasoning? Or user didn't specify. Keep Gemini for text.
        defaultFast = 'gemini-3-flash';
        defaultImage = 'seedream-4-5-251128'; // User provided model
      }

      const r = localStorage.getItem('berryxia_model_reasoning') || defaultReasoning;
      const f = localStorage.getItem('berryxia_model_fast') || defaultFast;
      let i = localStorage.getItem('berryxia_model_image') || defaultImage;

      // Fix broken imagen model in official mode
      if (storedMode === 'official' && i === 'imagen-3.0-generate-001') {
        i = 'gemini-3-pro-image-preview';
      }

      const v = localStorage.getItem('berryxia_model_vision') || 'seed-1-6-250915';
      setReasoningModel(r);
      setFastModel(f);
      setImageModel(i);
      setVisionModel(v);
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!currentKey) {
      setStatus('error');
      setStatusMsg("API Key 不能为空");
      return;
    }
    if (apiMode === 'custom' && !baseUrl) {
      setStatus('error');
      setStatusMsg("自定义模式下 Endpoint 不能为空");
      return;
    }
    setIsTestLoading(true);
    setStatus('idle');
    try {
      if (apiMode === 'volcengine') {
        // Use a real model for auth check via chat completions
        // A simple ping request to verify the API key is valid
        const response = await fetch("/api/volcengine-chat", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: 'seed-1-6-250915',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1
          })
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error(`认证失败 (${response.status})`);
        }
        if (response.status >= 500) {
          throw new Error(`服务器错误 (${response.status})`);
        }

        // If we get here, auth is OK
        setStatus('success');
        setStatusMsg("连接成功！");
      } else {
        let client: GoogleGenAI;

        if (apiMode === 'official') {
          // Official Google AI API - no custom baseUrl
          client = new GoogleGenAI({
            apiKey: currentKey
          });
        } else {
          // Custom endpoint
          let finalUrl = baseUrl;
          if (finalUrl.endsWith('/v1')) {
            finalUrl = finalUrl.substring(0, finalUrl.length - 3);
          } else if (finalUrl.endsWith('/v1/')) {
            finalUrl = finalUrl.substring(0, finalUrl.length - 4);
          }

          client = new GoogleGenAI({
            apiKey: currentKey,
            httpOptions: { baseUrl: finalUrl }
          });
        }

        // Use ai.models.generateContent per SDK docs
        await client.models.generateContent({
          model: fastModel,
          contents: "Ping"
        });

        setStatus('success');
        setStatusMsg("连接成功！");
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      const errStr = e.message || String(e);

      if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
        const isHttps = window.location.protocol === 'https:';
        // Check if using Custom mode
        if (apiMode === 'custom') {
          const isLocalTarget = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
          const isHttpTarget = baseUrl.startsWith('http:');

          if (isHttps && isHttpTarget) {
            setStatusMsg("安全策略拦截：无法在 HTTPS 页面访问 HTTP 接口 (Mixed Content)。请配置 HTTPS。");
          } else if (isLocalTarget && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            setStatusMsg("路由错误：无法从远程设备访问 Localhost 接口。请使用局域网 IP (如 192.168.x.x)。");
          } else {
            setStatusMsg("网络错误：连接被拒绝。请检查 CORS 设置、接口地址或网络连通性。");
          }
        } else {
          // Official / Volcengine
          setStatusMsg("网络错误：无法连接到服务器。请检查网络或代理设置。");
        }
      } else {
        setStatusMsg(`连接失败: ${errStr}`);
      }
    } finally {
      setIsTestLoading(false);
    }
  };

  // Fetch available models for Volcengine
  const handleFetchModels = async () => {
    if (!volcengineKey) {
      setStatus('error');
      setStatusMsg('请先输入火山引擎 API Key');
      return;
    }
    setIsLoadingModels(true);
    setStatus('idle');
    try {
      // Temporarily configure to allow the API call
      configureClient(volcengineKey, '', 'volcengine');
      const models = await listVolcengineModels();
      setAvailableModels(models);
      if (models.length > 0) {
        setStatus('success');
        setStatusMsg(`发现 ${models.length} 个可用模型`);
      } else {
        setStatus('error');
        setStatusMsg('未找到可用模型');
      }
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setStatusMsg(`获取模型失败: ${e.message || '未知错误'}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    if (apiMode === 'custom' && !baseUrl) return;
    // Note: We allow saving even if one key is empty, as long as the current mode's key is valid? 
    // Or just save everything.

    // Save API mode
    localStorage.setItem('berryxia_api_mode', apiMode);
    localStorage.setItem('berryxia_base_url', baseUrl);

    // Save Keys Separately
    localStorage.setItem('berryxia_api_key_official', officialKey);
    localStorage.setItem('berryxia_api_key_custom', customKey);
    localStorage.setItem('berryxia_api_key_volcengine', volcengineKey);

    // Legacy support (optional, but good for safety)
    localStorage.setItem('berryxia_api_key', currentKey);

    // Save Models
    localStorage.setItem('berryxia_model_reasoning', reasoningModel);
    localStorage.setItem('berryxia_model_fast', fastModel);
    localStorage.setItem('berryxia_model_image', imageModel);
    localStorage.setItem('berryxia_model_vision', visionModel);

    configureClient(currentKey, baseUrl, apiMode);
    configureModels({ reasoning: reasoningModel, fast: fastModel, image: imageModel });

    window.location.reload(); // Reload to ensure global state freshness
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-700 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-stone-800 flex justify-between items-center bg-stone-950">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('connection')}
              className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'connection' ? 'text-stone-200 border-b-2 border-orange-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Icons.Settings size={16} />
              Connection
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'models' ? 'text-stone-200 border-b-2 border-orange-500' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Icons.Cpu size={16} />
              Models
            </button>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-200 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'connection' && (
            <>
              {/* API Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">API 模式</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setApiMode('official');
                      setReasoningModel('gemini-3-flash-preview');
                      setFastModel('gemini-3-flash-preview');
                      setImageModel('gemini-3-pro-image-preview');
                    }}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${apiMode === 'official'
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icons.Globe size={16} />
                      <span>官方 API</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setApiMode('volcengine');
                      // No custom defaults for text models yet provided, keep default
                      setImageModel('seedream-4-5-251128');
                    }}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${apiMode === 'volcengine'
                      ? 'bg-blue-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icons.Zap size={16} />
                      <span>火山引擎</span>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setApiMode('custom');
                      setReasoningModel('gemini-3-pro-high');
                      setFastModel('gemini-3-flash');
                      setImageModel('gemini-3-pro-image');
                    }}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${apiMode === 'custom'
                      ? 'bg-orange-600 text-white'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Icons.Server size={16} />
                      <span>自定义</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Endpoint (only show in custom mode) */}
              {apiMode === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Target Endpoint</label>
                  <div className="relative">
                    <Icons.Link size={14} className="absolute left-3 top-3 text-stone-500" />
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="http://127.0.0.1:8045"
                      className="w-full pl-9 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all placeholder:text-stone-600"
                    />
                  </div>
                </div>
              )}

              {/* API Key */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">
                  {apiMode === 'official' ? 'Google AI API Key' : 'Access Key'}
                </label>
                <div className="relative">
                  <Icons.Key size={14} className="absolute left-3 top-3 text-stone-500" />
                  <input
                    type="password"
                    value={currentKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={apiMode === 'official' ? 'AIza...' : 'sk-...'}
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all placeholder:text-stone-600"
                  />
                </div>
                {apiMode === 'official' && (
                  <p className="text-[10px] text-stone-500 mt-1">
                    从 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline">Google AI Studio</a> 获取 API Key
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              {/* Volcengine Model Discovery */}
              {apiMode === 'volcengine' && (
                <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Icons.Zap size={14} />
                      <span className="text-xs font-bold">火山引擎模型发现</span>
                    </div>
                    <button
                      onClick={handleFetchModels}
                      disabled={isLoadingModels}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isLoadingModels ? <Icons.RefreshCw size={12} className="animate-spin" /> : <Icons.RefreshCw size={12} />}
                      获取模型列表
                    </button>
                  </div>

                  {availableModels.length > 0 && (
                    <div className="space-y-2">
                      {/* Image Model Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-blue-300">图像生成模型</label>
                        <select
                          value={imageModel}
                          onChange={e => setImageModel(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-blue-500 outline-none"
                        >
                          {availableModels.filter(m => m.type === 'image').map(m => (
                            <option key={m.id} value={m.id}>{m.id}</option>
                          ))}
                        </select>
                      </div>

                      {/* Vision Model Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-blue-300">视觉理解模型 (逆向)</label>
                        <select
                          value={visionModel}
                          onChange={e => setVisionModel(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs font-mono text-stone-200 focus:border-blue-500 outline-none"
                        >
                          {availableModels.filter(m => m.type === 'vision' || m.type === 'multimodal').map(m => (
                            <option key={m.id} value={m.id}>{m.id} ({m.type})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Standard Model Config (shown for all modes) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Reasoning Model</label>
                <p className="text-[10px] text-stone-600">Used for deep analysis (Agents, Architect, Auditor)</p>
                <input
                  type="text"
                  value={reasoningModel}
                  onChange={e => setReasoningModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Fast Model</label>
                <p className="text-[10px] text-stone-600">Used for translation & UI layout detection</p>
                <input
                  type="text"
                  value={fastModel}
                  onChange={e => setFastModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Image Model</label>
                <p className="text-[10px] text-stone-600">Used for visual generation</p>
                <input
                  type="text"
                  value={imageModel}
                  onChange={e => setImageModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all"
                />
              </div>

              {/* Vision Model (only for Volcengine) */}
              {apiMode === 'volcengine' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Vision Model</label>
                  <p className="text-[10px] text-stone-600">Used for reverse engineering & image analysis</p>
                  <input
                    type="text"
                    value={visionModel}
                    onChange={e => setVisionModel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm font-mono text-stone-200 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {status !== 'idle' && (
            <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${status === 'success' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
              {status === 'success' ? <Icons.CheckCircle2 size={12} /> : <Icons.AlertCircle size={12} />}
              {statusMsg}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestLoading}
              className="flex-1 py-2.5 border border-stone-700 hover:bg-stone-800 text-stone-400 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              {isTestLoading ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Activity size={14} />}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-orange-600 text-white hover:bg-orange-500 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <Icons.Save size={14} />
              Save & Restart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
