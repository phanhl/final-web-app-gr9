'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { LANGUAGES, LanguageOption } from '@/lib/i18n';
import { Language } from '@/types';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  variant?: 'header' | 'floating';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'header' }) => {
  const { language, setLanguage, t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t('app.language', 'Ngôn ngữ')}
        title={t('app.language', 'Đổi ngôn ngữ: Tiếng Việt, English')}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-150 border cursor-pointer select-none text-xs font-semibold ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
            : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs'
        }`}
      >
        <span className="text-sm leading-none" role="img" aria-label={currentLang.name}>
          {currentLang.flag}
        </span>
        <span className="font-bold tracking-wider">{currentLang.short}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-xl shadow-slate-900/10 dark:shadow-black/40 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-emerald-500" />
            <span>{t('app.language', 'Chọn ngôn ngữ')}</span>
          </div>

          <div className="p-1 space-y-0.5">
            {LANGUAGES.map((item) => {
              const isSelected = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelectLanguage(item.code)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{item.flag}</span>
                    <div className="text-left">
                      <div className="leading-snug">{item.nativeName}</div>
                      {item.name !== item.nativeName && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                          {item.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
