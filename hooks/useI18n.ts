/**
 * [INPUT]: 依赖 services/i18n (translations, Language 类型)
 * [OUTPUT]: 导出 I18nProvider 和 useI18n Hook
 * [POS]: 国际化核心功能
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, I18nKey, getStoredLanguage, storeLanguage, DEFAULT_LANGUAGE } from '../services/i18n';

// ==================== Context 定义 ====================

interface I18nContextType {
  language: Language;
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// ==================== Provider 组件 ====================

interface I18nProviderProps {
  children: ReactNode;
  defaultLang?: Language;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children, defaultLang }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return defaultLang || getStoredLanguage();
  });

  useEffect(() => {
    if (defaultLang && defaultLang !== language) {
      setLanguageState(defaultLang);
      storeLanguage(defaultLang);
    }
  }, [defaultLang]);

  const t = (key: I18nKey, params?: Record<string, string | number>): string => {
    let text = translations[language][key];

    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storeLanguage(lang);
  };

  const value: I18nContextType = {
    language,
    t,
    setLanguage
  };

  return React.createElement(I18nContext.Provider, { value }, children);
};

// ==================== Hook ====================

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
