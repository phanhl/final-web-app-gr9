'use client';
import React from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { Navigation } from '@/components/Navigation';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { TransactionsView } from '@/components/TransactionsView';
import { BudgetsView } from '@/components/BudgetsView';
import { WhatIfSimulatorView } from '@/components/WhatIfSimulatorView';
import { BillsView } from '@/components/BillsView';
import { ReportsView } from '@/components/ReportsView';
import { WalletsView } from '@/components/WalletsView';
import { SettingsView } from '@/components/SettingsView';
import { QuickAddModal } from '@/components/QuickAddModal';
import { BankStatementModal } from '@/components/BankStatementModal';

function MainContent() {
    const { activeTab, isSidebarOpen, toggleSidebar, t } = useApp();
    return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navigation />

      <div className="flex-1 flex w-full">
        {/* Left Sidebar (Desktop Dock & Mobile Drawer) */}
        <Sidebar />

        {/* Main Content Column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-24 lg:pb-6">
            {activeTab === 'dashboard' && <DashboardView />}
            {(activeTab === 'transactions' || activeTab === 'reports') && <TransactionsView />}
            {activeTab === 'budgets' && <BudgetsView />}
            {activeTab === 'whatif' && <WhatIfSimulatorView />}
            {activeTab === 'bills' && <BillsView />}
            {activeTab === 'wallets' && <WalletsView />}
            {activeTab === 'settings' && <SettingsView />}
          </main>

          {/* Footer chỉ hiện trên desktop - bố cục lệch 2 phía: 2026 lệch trái, Next.js lệch phải */}
          <footer className="hidden lg:block border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 py-5 text-xs text-slate-500 dark:text-slate-400 print:hidden">
            <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              <p className="text-left font-medium">© 2026 FinTrack Pro • {t('footer.tagline', 'Hệ thống Quản lý Chi tiêu Cá nhân & Ngân sách Thông minh')}</p>
              <p className="text-right font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                Next.js 15 • Tailwind CSS • Recharts
              </p>
            </div>
          </footer>
        </div>
      </div>

      <QuickAddModal />
      <BankStatementModal />
    </div>);
}
export default function Home() {
    return (<AppProvider>
      <MainContent />
    </AppProvider>);
}
