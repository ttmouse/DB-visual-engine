/**
 * [INPUT]: 依赖 documentationData, Icons, ReactMarkdown
 * [OUTPUT]: 导出 DocumentationModal 组件
 * [POS]: UI Component, 展示系统帮助文档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import ReactMarkdown from 'react-markdown';
import { DOCUMENTATION_CATEGORIES, DocArticle } from '../services/documentationData';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  const [activeArticleId, setActiveArticleId] = useState<string>('changelog');

  // Reset to changelog when opened
  useEffect(() => {
    if (isOpen) {
      setActiveArticleId('changelog');
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
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
          ${isActive
            ? 'text-white shadow-lg shadow-orange-900/20'
            : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
          }`}
      >
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-500 opacity-100" />
        )}

        <div className={`p-1.5 rounded-lg transition-colors relative z-10 ${isActive ? 'bg-white/20' : 'bg-stone-800 group-hover:bg-stone-700'}`}>
          <Icon size={14} />
        </div>
        <span className="relative z-10">{article.title.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="bg-[#1c1917] rounded-[32px] shadow-2xl w-full max-w-6xl overflow-hidden border border-stone-800 flex h-[85vh] ring-1 ring-white/5"
        onClick={e => e.stopPropagation()}
      >

        {/* Sidebar */}
        <div className="w-72 bg-stone-900/30 border-r border-stone-800 flex flex-col shrink-0 backdrop-blur-xl">
          <div className="p-8 pb-6">
            <h3 className="font-bold text-stone-100 flex items-center gap-3 text-lg tracking-tight">
              <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <Icons.Help size={20} className="text-orange-500" />
              </div>
              文档中心
            </h3>
            <p className="text-[11px] text-stone-500 font-medium tracking-wider uppercase mt-2 ml-1">Documentation Center</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar">
            <div className="space-y-8">
              {DOCUMENTATION_CATEGORIES.map((category, idx) => (
                <div key={idx}>
                  <h4 className="px-3 text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-stone-600"></span>
                    {category.title.split('(')[0]}
                  </h4>
                  <div className="space-y-1">
                    {category.articles.map(renderSidebarItem)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-stone-800 bg-stone-900/30">
            <div className="flex items-center justify-between text-[10px] text-stone-500">
              <span className="font-mono">v2.6.0</span>
              <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400">Enterprise</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c0a09] relative">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>

          {/* Header */}
          <div className="h-24 shrink-0 border-b border-stone-800/50 flex items-center justify-between px-10 bg-stone-950/50 backdrop-blur-md sticky top-0 z-20">
            <div>
              <h2 className="text-3xl font-bold text-stone-100 flex items-center gap-3 tracking-tight">
                {currentArticle?.title.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')}
              </h2>
              <div className="flex items-center gap-2 mt-2 text-stone-500 text-xs font-mono">
                <span className="bg-stone-800/50 px-2 py-0.5 rounded text-stone-400">DOCS</span>
                <span>/</span>
                <span className="uppercase">{activeArticleId.replace('-', ' ')}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full transition-all duration-200 text-stone-400 hover:text-stone-100 hover:bg-stone-800 active:scale-95"
            >
              <Icons.X size={22} />
            </button>
          </div>

          {/* Markdown Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="max-w-3xl mx-auto px-8 py-10">
              <div className="prose prose-invert max-w-none
                prose-headings:font-semibold prose-headings:tracking-normal
                prose-h1:text-2xl prose-h1:text-white prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-stone-700/50
                prose-h2:text-xl prose-h2:text-stone-100 prose-h2:mt-8 prose-h2:mb-4 prose-h2:font-medium
                prose-h3:text-base prose-h3:text-stone-200 prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-medium

                prose-p:text-stone-400 prose-p:leading-7 prose-p:my-3 prose-p:text-sm

                prose-strong:text-stone-200 prose-strong:font-semibold

                prose-blockquote:bg-stone-800/30 prose-blockquote:border-l-2 prose-blockquote:border-orange-500/60 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-md prose-blockquote:not-italic prose-blockquote:my-4

                prose-code:text-orange-400 prose-code:bg-stone-800/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none

                prose-ul:my-3 prose-ul:list-none prose-ul:pl-0
                prose-li:text-stone-400 prose-li:my-1.5 prose-li:leading-6 prose-li:pl-0 prose-li:text-sm

                prose-hr:border-stone-700/50 prose-hr:my-6

                prose-img:rounded-lg prose-img:border prose-img:border-stone-700 prose-img:my-4
              ">
                <ReactMarkdown
                  components={{
                    // Simplified blockquote
                    blockquote: ({ node, ...props }) => (
                      <div className="flex gap-3 bg-stone-800/20 border-l-2 border-orange-500/50 py-2 px-4 rounded-r my-4">
                        <div className="text-stone-400 text-sm leading-relaxed">
                          {props.children}
                        </div>
                      </div>
                    ),
                    // Simple list item with small dot
                    li: ({ node, ...props }) => (
                      <li className="pl-0 relative flex gap-2.5 items-start my-1.5 text-stone-400 text-sm leading-6">
                        <span className="shrink-0 w-1 h-1 rounded-full bg-stone-500 mt-2.5" />
                        <span className="flex-1">{props.children}</span>
                      </li>
                    ),
                    // Clean h3 without decorative bar
                    h3: ({ node, ...props }) => (
                      <h3 className="text-base font-medium text-stone-200 mt-6 mb-3">
                        {props.children}
                      </h3>
                    ),
                    // Clean h2 for version headers
                    h2: ({ node, ...props }) => (
                      <h2 className="text-lg font-semibold text-stone-100 mt-8 mb-4 pb-2 border-b border-stone-700/30">
                        {props.children}
                      </h2>
                    )
                  }}
                >
                  {currentArticle?.content || '# Article Not Found'}
                </ReactMarkdown>
              </div>

              {/* Footer Spacer */}
              <div className="h-12" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
