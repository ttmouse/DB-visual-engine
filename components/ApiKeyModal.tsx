
import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { configureClient, configureModels } from '../services/geminiService';
import OpenAI from 'openai';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Model Config State
  const [reasoningModel, setReasoningModel] = useState('gemini-3-pro-high');
  const [fastModel, setFastModel] = useState('gemini-3-flash');
  const [imageModel, setImageModel] = useState('gemini-3-pro-image');

  const [isTestLoading, setIsTestLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'connection' | 'models'>('connection');

  useEffect(() => {
    if (isOpen) {
      // Load from localStorage or env
      const storedKey = localStorage.getItem('DB_api_key') || process.env.GEMINI_API_KEY || '';
      const storedUrl = localStorage.getItem('DB_base_url') || process.env.API_ENDPOINT || 'http://127.0.0.1:8045/v1';
      setApiKey(storedKey);
      setBaseUrl(storedUrl);

      // Load Models
      const r = localStorage.getItem('DB_model_reasoning') || 'gemini-3-pro-high';
      const f = localStorage.getItem('DB_model_fast') || 'gemini-3-flash';
      const i = localStorage.getItem('DB_model_image') || 'gemini-3-pro-image';
      setReasoningModel(r);
      setFastModel(f);
      setImageModel(i);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey || !baseUrl) {
      setStatus('error');
      setStatusMsg("配置不能为空");
      return;
    }
    setIsTestLoading(true);
    setStatus('idle');
    try {
      // Auto-append /v1 if missing and not ending in slash
      let finalUrl = baseUrl;
      if (!finalUrl.includes('/v1')) {
        finalUrl = finalUrl.endsWith('/') ? `${finalUrl}v1` : `${finalUrl}/v1`;
      }

      const client = new OpenAI({ apiKey, baseURL: finalUrl, dangerouslyAllowBrowser: true });
      // Simple test query using Fast Model
      await client.chat.completions.create({
        model: fastModel,
        messages: [{ role: "user", content: "Ping" }],
        max_tokens: 5
      });
      setStatus('success');
      setStatusMsg("连接成功！");
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setStatusMsg(`连接失败: ${e.message || '未知错误'}`);
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleSave = () => {
    if (!apiKey || !baseUrl) return;
    localStorage.setItem('DB_api_key', apiKey);
    localStorage.setItem('DB_base_url', baseUrl);

    // Save Models
    localStorage.setItem('DB_model_reasoning', reasoningModel);
    localStorage.setItem('DB_model_fast', fastModel);
    localStorage.setItem('DB_model_image', imageModel);

    configureClient(apiKey, baseUrl);
    configureModels({ reasoning: reasoningModel, fast: fastModel, image: imageModel });

    window.location.reload(); // Reload to ensure global state freshness
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('connection')}
              className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'connection' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Icons.Settings size={16} />
              Connection
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`text-sm font-bold flex items-center gap-2 ${activeTab === 'models' ? 'text-stone-900 border-b-2 border-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Icons.Cpu size={16} />
              Models
            </button>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'connection' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Target Endpoint</label>
                <div className="relative">
                  <Icons.Link size={14} className="absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:8045/v1"
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:border-stone-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Access Key</label>
                <div className="relative">
                  <Icons.Key size={14} className="absolute left-3 top-3 text-stone-400" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:border-stone-400 outline-none transition-all"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Reasoning Model</label>
                <p className="text-[10px] text-stone-400">Used for deep analysis (Agents, Architect, Auditor)</p>
                <input
                  type="text"
                  value={reasoningModel}
                  onChange={e => setReasoningModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:border-stone-400 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Fast Model</label>
                <p className="text-[10px] text-stone-400">Used for translation & UI layout detection</p>
                <input
                  type="text"
                  value={fastModel}
                  onChange={e => setFastModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:border-stone-400 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Image Model</label>
                <p className="text-[10px] text-stone-400">Used for visual generation</p>
                <input
                  type="text"
                  value={imageModel}
                  onChange={e => setImageModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:border-stone-400 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {status !== 'idle' && (
            <div className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${status === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {status === 'success' ? <Icons.CheckCircle2 size={12} /> : <Icons.AlertCircle size={12} />}
              {statusMsg}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTestLoading}
              className="flex-1 py-2.5 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              {isTestLoading ? <Icons.RefreshCw size={14} className="animate-spin" /> : <Icons.Activity size={14} />}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 bg-black text-white hover:bg-stone-800 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
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
