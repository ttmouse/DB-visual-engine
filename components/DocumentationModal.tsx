import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import ReactMarkdown from 'react-markdown';
import { DOCUMENTATION_CATEGORIES, DocArticle } from '../services/documentationData';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [activeArticleId, setActiveArticleId] = useState<string>('quick-start');

  // Reset to quick start when opened
  useEffect(() => {
    if (isOpen) {
      setActiveArticleId('quick-start');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helpers to find content
  const currentArticle = DOCUMENTATION_CATEGORIES
    .flatMap(c => c.articles)
    .find(a => a.id === activeArticleId);

  const renderSidebarItem = (article: DocArticle) => {
    const isActive = activeArticleId === article.id;
    const Icon = Icons[article.icon];

    return (
      <button
        key={article.id}
        onClick={() => setActiveArticleId(article.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
          ${isActive
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
            : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
          }`}
      >
        <div className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-white/20' : 'bg-stone-800 group-hover:bg-stone-700'}`}>
          <Icon size={14} />
        </div>
        <span>{article.title.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-stone-900 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden border border-stone-800 flex h-[85vh]" onClick={e => e.stopPropagation()}>

        {/* Sidebar */}
        <div className="w-64 bg-stone-900/50 border-r border-stone-800 flex flex-col shrink-0">
          <div className="p-6 border-b border-stone-800">
            <h3 className="font-bold text-stone-200 flex items-center gap-2">
              <Icons.Help size={18} className="text-orange-500" />
              文档中心
            </h3>
            <p className="text-[10px] text-stone-500 font-mono mt-1">Documentation Center</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="space-y-6">
              {DOCUMENTATION_CATEGORIES.map((category, idx) => (
                <div key={idx}>
                  <h4 className="px-3 text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3">{category.title}</h4>
                  <div className="space-y-1">
                    {category.articles.map(renderSidebarItem)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-stone-800 bg-stone-900/80">
            <div className="text-[10px] text-stone-600 text-center font-mono">
              UnImage v2.6.0 Enterprise
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-stone-950">
          {/* Header */}
          <div className="h-16 border-b border-stone-800 flex items-center justify-between px-8 bg-stone-950/80 backdrop-blur">
            <h2 className="text-lg font-bold text-stone-200 flex items-center gap-3">
              {currentArticle?.title}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-200">
              <Icons.X size={20} />
            </button>
          </div>

          {/* Markdown Content */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto pb-20">
              <div className="prose prose-invert prose-stone 
                prose-headings:text-stone-100 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg
                prose-p:text-stone-400 prose-p:leading-8 prose-p:my-4
                prose-strong:text-orange-400 prose-strong:font-semibold
                prose-blockquote:bg-stone-900 prose-blockquote:border-l-orange-500 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                prose-code:text-orange-300 prose-code:bg-stone-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-li:text-stone-400 prose-li:marker:text-stone-600 prose-li:my-2 prose-li:leading-7
                prose-hr:border-stone-800
                prose-img:rounded-xl prose-img:border prose-img:border-stone-800 prose-img:shadow-lg
              ">
                <ReactMarkdown>
                  {currentArticle?.content || '# Article Not Found'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
