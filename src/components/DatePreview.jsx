'use client';
import React from 'react';
import { formatDate } from '@/lib/utils';

/**
 * Spells out the date picked in an <input type="date|datetime-local">.
 * The native picker follows the *browser* locale (Chrome in English shows 10/02/2026 for 2 October),
 * so this line shows the same value in the app language, e.g. "T6, 02/10/2026 23:45".
 */
export const DatePreview = ({ value, language = 'vi' }) => {
    if (!value) return null;
    const text = formatDate(value, value.length > 10 ? 'full' : 'dateWithDay', language);
    if (!text || text === value) return null;
    return (<span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1" aria-live="polite">
      {text}
    </span>);
};
