'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  ReceiptText,
  PieChart,
  Sparkles,
  CalendarCheck,
  WalletCards,
  Settings,
  PanelLeft,
  PanelLeftClose,
  Plus,
  X,
  ChevronRight,
} from 'lucide-react';
import { calculateBudgetStatuses } from '@/lib/utils';

export const Sidebar = () => {
  const {
    activeTab,
    setActiveTab,
    isSidebarOpen,
    isMobileNavOpen,
    setIsMobileNavOpen,
    toggleSidebar,
    openQuickAdd,
    budgets,
    transactions,
    bills,
    currentMonth,
    t,
  } = useApp();

  // Alert counts for badges
  const budgetStatuses = calculateBudgetStatuses(budgets, transactions, currentMonth);
  const budgetAlerts = budgetStatuses.filter((b) => b.status === 'WARNING' || b.status === 'EXCEEDED').length;
  const unpaidBillsCount = bills.filter((b) => b.status === 'UNPAID').length;

  const sections = [
    {
      titleKey: 'nav.sectionCashflow',
      defaultTitle: 'Dòng tiền & Báo cáo',
      items: [
        {
          id: 'dashboard',
          key: 'nav.dashboard',
          defaultLabel: 'Tổng quan',
          icon: LayoutDashboard,
          desc: 'Tổng tài sản & diễn biến thu chi',
        },
        {
          id: 'transactions',
          key: 'nav.transactionsAndReports',
          defaultLabel: 'Sổ giao dịch & Báo cáo',
          icon: ReceiptText,
          desc: 'Lịch sử thu chi & biểu đồ phân tích',
        },
        {
          id: 'wallets',
          key: 'nav.wallets',
          defaultLabel: 'Ví & Tài khoản',
          icon: WalletCards,
          desc: 'Tiền mặt, ngân hàng, thẻ & sổ tiết kiệm',
        },
        {
          id: 'bills',
          key: 'nav.bills',
          defaultLabel: 'Hóa đơn định kỳ',
          icon: CalendarCheck,
          desc: 'Tiền nhà, điện nước, internet',
          badge: unpaidBillsCount > 0 ? unpaidBillsCount : null,
          badgeColor: 'bg-rose-500 text-white',
        },
      ],
    },
    {
      titleKey: 'nav.sectionPlanning',
      defaultTitle: 'Kế hoạch & Dự báo',
      items: [
        {
          id: 'budgets',
          key: 'nav.budgets',
          defaultLabel: 'Ngân sách chi tiêu',
          icon: PieChart,
          desc: 'Quy tắc 50/30/20 & hạn mức danh mục',
          badge: budgetAlerts > 0 ? budgetAlerts : null,
          badgeColor: 'bg-amber-500 text-white',
        },
        {
          id: 'whatif',
          key: 'nav.whatif',
          defaultLabel: 'Mô phỏng What-If',
          icon: Sparkles,
          desc: 'Kịch bản cắt giảm & tối ưu tài chính',
        },
      ],
    },
    {
      titleKey: 'nav.sectionSystem',
      defaultTitle: 'Hệ thống',
      items: [
        {
          id: 'settings',
          key: 'nav.settings',
          defaultLabel: 'Cài đặt hệ thống',
          icon: Settings,
          desc: 'Sao lưu, bảo mật & xuất nhập dữ liệu',
        },
      ],
    },
  ];

  const handleSelectTab = (id) => {
    setActiveTab(id);
    // The mobile drawer closes after a choice; the desktop dock stays as the user left it
    setIsMobileNavOpen(false);
  };

  // Escape closes the mobile drawer
  React.useEffect(() => {
    if (!isMobileNavOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setIsMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileNavOpen, setIsMobileNavOpen]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Sidebar Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center shrink-0">
            <PanelLeft className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white truncate">
              {t('nav.featureIndex', 'Danh mục tính năng')}
            </h2>
            <p className="text-[10px] text-slate-400 truncate">FinTrack Pro</p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
          title={t('nav.closeSidebar', 'Thu gọn danh mục')}
          aria-label={t('nav.closeSidebar', 'Thu gọn danh mục')}
        >
          <PanelLeftClose className="w-4 h-4 hidden lg:block" />
          <X className="w-4 h-4 lg:hidden" />
        </button>
      </div>

      {/* Quick Action Button */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <button
          type="button"
          onClick={() => {
            openQuickAdd('EXPENSE');
            setIsMobileNavOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('app.quickAdd', 'Nhập nhanh giao dịch')}</span>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 px-3 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t(section.titleKey, section.defaultTitle)}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || (item.id === 'transactions' && activeTab === 'reports');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer text-left group ${isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white font-medium'
                      }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-500'
                          }`}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate">{t(item.key, item.defaultLabel)}</span>
                      </div>
                    </div>

                    {item.badge ? (
                      <span
                        className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-white/20 text-white' : item.badgeColor
                          }`}
                      >
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-80 text-white' : 'opacity-0 group-hover:opacity-40 text-slate-400'
                          }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
        <span className="font-semibold">FinTrack Pro</span>
        <span>v2.4</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer (Slide-Over) */}
      {isMobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar Dock */}
      {isSidebarOpen && (
        <aside className="hidden lg:block w-72 shrink-0 border-r border-slate-200 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] z-20 shadow-xs">
          {sidebarContent}
        </aside>
      )}
    </>
  );
};
