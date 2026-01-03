
import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';

interface LandingPageProps {
  onEnterApp: () => void;
  hasKey: boolean;
  onSelectKey: () => Promise<void>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, hasKey, onSelectKey }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-orange-500/30 selection:text-orange-200 overflow-x-hidden">

      {/* Dynamic Aurora Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              <Icons.Compass size={20} />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-white">DB</span>
          </div>
          <div className="flex items-center gap-4">
            {!hasKey && (
              <button
                onClick={onSelectKey}
                className="px-4 py-1.5 border border-orange-500/50 text-orange-400 text-[10px] font-bold rounded-full hover:bg-orange-500/10 transition-all flex items-center gap-2"
              >
                <Icons.Key size={12} /> 配置 API KEY
              </button>
            )}
            <button
              onClick={onEnterApp}
              className="px-5 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-orange-400 hover:text-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center gap-2"
            >
              立即进入 <Icons.ChevronRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex flex-col justify-center items-center px-6 pt-20">
        <div className="max-w-5xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-mono tracking-widest uppercase mb-4">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            DB Engine v2.5 Online
          </div>

          <h1 className="font-serif text-6xl md:text-8xl lg:text-9xl font-medium tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-stone-600">
            Visual Asset <br />
            <span className="italic bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-200 to-orange-400 animate-gradient-x">Cloning</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-stone-400 font-light leading-relaxed">
            企业级视觉逆向工程平台。从<span className="text-white font-medium"> 静态产品摄影</span> 到 <span className="text-white font-medium">Sora 动态视频</span>，
            我们解码每一帧的光影与物理逻辑。
          </p>

          {!hasKey ? (
            <div className="mt-8 flex flex-col items-center gap-4 p-8 rounded-3xl bg-white/5 border border-white/10 max-w-sm mx-auto backdrop-blur-xl">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl">
                <Icons.Key size={32} />
              </div>
              <h3 className="font-bold text-white">需要配置 API Key</h3>
              <p className="text-stone-500 text-xs leading-relaxed">
                为了保障您的生成配额，发布版本需要您配置自己的 Google Gemini API Key。您的 Key 会被安全存储在浏览器本地环境中。
              </p>
              <button
                onClick={onSelectKey}
                className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-lg"
              >
                立即配置 Key
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[10px] text-stone-600 hover:text-stone-400 underline">获取 API Key 帮助 &rarr;</a>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-8">
              <button
                onClick={onEnterApp}
                className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-sm overflow-hidden transition-transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                  <Icons.Sparkles size={16} /> 开始资产复刻
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 text-center text-stone-600 text-sm font-mono">
        <p>© 2024 DB Visual Engine. Powered by Google Gemini 2.5 & 3 Pro.</p>
      </footer>
    </div>
  );
};
