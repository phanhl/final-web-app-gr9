'use client';
import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import dynamic from 'next/dynamic';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { QuickAddModal } from '@/components/QuickAddModal';

// Views other than the dashboard are code-split: Recharts, SheetJS and the simulator load only when opened
const ViewLoading = () => (<div className="flex justify-center py-16" role="status" aria-live="polite">
  <span className="inline-block w-7 h-7 border-4 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
</div>);
const lazyView = (load) => dynamic(load, { loading: ViewLoading });
const TransactionsView = lazyView(() => import('@/components/TransactionsView').then(m => m.TransactionsView));
const BudgetsView = lazyView(() => import('@/components/BudgetsView').then(m => m.BudgetsView));
const WhatIfSimulatorView = lazyView(() => import('@/components/WhatIfSimulatorView').then(m => m.WhatIfSimulatorView));
const BillsView = lazyView(() => import('@/components/BillsView').then(m => m.BillsView));
const WalletsView = lazyView(() => import('@/components/WalletsView').then(m => m.WalletsView));
const SettingsView = lazyView(() => import('@/components/SettingsView').then(m => m.SettingsView));
const BankStatementModal = dynamic(() => import('@/components/BankStatementModal').then(m => m.BankStatementModal));

function MainContent() {
  const { activeTab, t, statementModalOpen } = useApp();
  return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
    <Navigation />

    {/* Khung chung căn giữa: sidebar + nội dung dùng CHUNG max-w với header để không bị lệch */}
    <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
      {/* Left Sidebar (Desktop Dock & Mobile Drawer) */}
      <Sidebar />

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-24 lg:pb-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {(activeTab === 'transactions' || activeTab === 'reports') && <TransactionsView />}
          {activeTab === 'budgets' && <BudgetsView />}
          {activeTab === 'whatif' && <WhatIfSimulatorView />}
          {activeTab === 'bills' && <BillsView />}
          {activeTab === 'wallets' && <WalletsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Desktop-only footer - split layout: copyright left, tech stack right */}
        <footer className="hidden lg:block border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-5 text-xs text-slate-500 dark:text-slate-400 print:hidden">
          <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <p className="text-left font-medium">© 2026 FinTrack Pro • {t('footer.tagline', 'Hệ thống Quản lý Chi tiêu Cá nhân & Ngân sách Thông minh')}</p>
            <p className="text-right font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              Next.js 15 • Tailwind CSS • Recharts
            </p>
          </div>
        </footer>
      </div>
    </div>

    <QuickAddModal />
    {statementModalOpen && <BankStatementModal />}
  </div>);
}
export default function Home() {
  return (<AppProvider>
    <MainContent />
  </AppProvider>);
}
