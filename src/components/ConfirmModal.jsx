'use client';
import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const ConfirmModal = ({ config, onClose }) => {
    const { t } = useApp();

    useEffect(() => {
        if (!config) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [config, onClose]);

    if (!config) return null;

    const {
        title = t('common.confirmTitle', 'Xác nhận hành động'),
        message = t('common.confirmMsg', 'Bạn có chắc chắn muốn thực hiện hành động này?'),
        confirmText = t('common.delete', 'Xóa'),
        cancelText = t('common.cancel', 'Hủy'),
        variant = 'danger', // 'danger' | 'warning' | 'info'
        onConfirm,
    } = config;

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
        }
        onClose();
    };

    const isDanger = variant === 'danger';
    const isWarning = variant === 'warning';

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 backdrop-blur-md animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close X button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4">
                    {/* Icon indicator */}
                    <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                            isDanger
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
                                : isWarning
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60'
                                : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                        }`}
                    >
                        {isDanger ? (
                            <Trash2 className="w-6 h-6" />
                        ) : isWarning ? (
                            <AlertTriangle className="w-6 h-6" />
                        ) : (
                            <HelpCircle className="w-6 h-6" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-0.5">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                    {Boolean(cancelText) && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-sm font-semibold transition-all cursor-pointer shadow-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                            isDanger
                                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/20'
                                : isWarning
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-500/20'
                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20'
                        }`}
                    >
                        {isDanger && <Trash2 className="w-4 h-4" />}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
