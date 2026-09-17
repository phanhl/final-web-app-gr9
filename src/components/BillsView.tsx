'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { RecurringBill } from '@/types';
import {
  CalendarCheck,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CreditCard,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Zap,
  Home,
  Wifi,
  Tv,
  Droplets,
  DollarSign,
  X,
  Bell,
} from 'lucide-react';
import { formatCurrency, formatNumberWithDots, getLocalDateString, formatDisplayDate } from '@/lib/utils';
import { IconHelper } from './IconHelper';

export const BillsView: React.FC = () => {
  const {
    bills,
    wallets,
    categories,
    addBill,
    editBill,
    deleteBill,
    payBill,
    navTargetBillId,
    setNavTargetBillId,
    billToAutoPayId,
    setBillToAutoPayId,
  } = useApp();

  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  // Form State
  const [billName, setBillName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billCategory, setBillCategory] = useState(categories[0]?.id || '');
  const [billDueDay, setBillDueDay] = useState('15');
  const [billFrequency, setBillFrequency] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [billNote, setBillNote] = useState('');
  const [billReminderDays, setBillReminderDays] = useState('3');
  const [billStatus, setBillStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [billLastPaidDate, setBillLastPaidDate] = useState(getLocalDateString());

  // Pay Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<RecurringBill | null>(null);
  const [payWalletId, setPayWalletId] = useState(wallets[0]?.id || '');
  const [payDate, setPayDate] = useState(getLocalDateString());

  // Auto-scroll and auto-open Pay Modal from Trung tâm Cảnh báo
  useEffect(() => {
    if (navTargetBillId) {
      setTimeout(() => {
        const el = document.getElementById(`bill-card-${navTargetBillId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [navTargetBillId]);

  useEffect(() => {
    if (billToAutoPayId) {
      const target = bills.find((b) => b.id === billToAutoPayId);
      if (target) {
        setBillToPay(target);
        setPayWalletId(wallets[0]?.id || '');
        setPayDate(getLocalDateString());
        setPayModalOpen(true);
      }
      setBillToAutoPayId(null);
    }
  }, [billToAutoPayId, bills, wallets, setBillToAutoPayId]);

  // Current date & day in month
  const [currentDateInfo, setCurrentDateInfo] = useState(() => {
    const now = new Date();
    return {
      day: now.getDate(),
      formatted: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    };
  });

  useEffect(() => {
    const now = new Date();
    setCurrentDateInfo({
      day: now.getDate(),
      formatted: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    });
  }, []);

  const today = currentDateInfo.day;
  const formattedToday = currentDateInfo.formatted;

  // KPI Calculations
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.amount, 0);
  const paidBills = bills.filter((b) => b.status === 'PAID');
  const unpaidBills = bills.filter((b) => b.status === 'UNPAID');

  const totalPaid = paidBills.reduce((sum, b) => sum + b.amount, 0);
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

  // Upcoming or Overdue reminder
  const upcomingBills = unpaidBills.filter((b) => (b.dueDay - today) <= (b.reminderDaysBefore ?? 3));

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(billAmount);
    const dueDayNum = Number(billDueDay);
    if (!billName.trim() || !amountNum || amountNum <= 0) {
      alert('Vui lòng nhập đầy đủ tên và số tiền hóa đơn');
      return;
    }

    const cat = categories.find((c) => c.id === billCategory);

    if (editingBill) {
      editBill(editingBill.id, {
        name: billName,
        amount: amountNum,
        categoryId: billCategory,
        categoryName: cat?.name || 'Hóa đơn',
        dueDay: dueDayNum,
        frequency: billFrequency,
        note: billNote,
        reminderDaysBefore: Number(billReminderDays) || 3,
        status: billStatus,
        lastPaidDate: billStatus === 'PAID' ? (billLastPaidDate || getLocalDateString()) : undefined,
      });
    } else {
      addBill({
        name: billName,
        amount: amountNum,
        categoryId: billCategory,
        categoryName: cat?.name || 'Hóa đơn',
        dueDay: dueDayNum,
        frequency: billFrequency,
        status: billStatus,
        lastPaidDate: billStatus === 'PAID' ? (billLastPaidDate || getLocalDateString()) : undefined,
        note: billNote,
        reminderDaysBefore: Number(billReminderDays) || 3,
      });
    }

    setBillModalOpen(false);
    setEditingBill(null);
  };

  const handleConfirmPay = () => {
    if (!billToPay) return;
    payBill(billToPay.id, payWalletId, payDate || getLocalDateString());
    setPayModalOpen(false);
    setBillToPay(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Chi Phí Định Kỳ & Lịch Hóa Đơn
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quản lý và theo dõi ngày đến hạn các hóa đơn cố định (tiền nhà, điện nước, internet, dịch vụ đăng ký)
          </p>
        </div>

        <button
          onClick={() => {
            setEditingBill(null);
            setBillName('');
            setBillAmount('');
            setBillCategory(categories.find((c) => c.id === 'cat-bills')?.id || categories[0]?.id || '');
            setBillDueDay('15');
            setBillFrequency('MONTHLY');
            setBillNote('');
            setBillReminderDays('3');
            setBillStatus('UNPAID');
            setBillLastPaidDate(getLocalDateString());
            setBillModalOpen(true);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm hóa đơn định kỳ</span>
        </button>
      </div>

      {/* 2. KPI SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Tổng hóa đơn hàng tháng</span>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {formatCurrency(totalBillsAmount)}
          </p>
          <span className="text-[11px] text-slate-400">{bills.length} khoản chi cố định định kỳ</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Đã thanh toán tháng {new Date().getMonth() + 1}</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalPaid)}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {paidBills.length} / {bills.length} hóa đơn đã hoàn tất
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase">Còn phải thanh toán</span>
          <p
            className={`text-2xl font-black mt-1 ${
              totalUnpaid > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'
            }`}
          >
            {formatCurrency(totalUnpaid)}
          </p>
          <span className="text-[11px] text-slate-400">
            {unpaidBills.length > 0 ? `Còn ${unpaidBills.length} hóa đơn cần trả` : 'Đã thanh toán đầy đủ'}
          </span>
        </div>
      </div>

      {/* 2.5 REMINDER BANNER */}
      {upcomingBills.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Nhắc nhở hóa đơn cần thanh toán ({upcomingBills.length} khoản)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {upcomingBills
                  .map((b) => {
                    const diff = b.dueDay - today;
                    const diffLabel =
                      diff === 0
                        ? 'Đến hạn hôm nay!'
                        : diff < 0
                        ? `Quá hạn ${Math.abs(diff)} ngày`
                        : `Còn ${diff} ngày (Hạn ngày ${b.dueDay})`;
                    return `${b.name} (${formatCurrency(b.amount)} - ${diffLabel})`;
                  })
                  .join(' • ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. BILLS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-blue-500" />
            <span>Lịch nhắc thanh toán trong tháng</span>
          </h3>
          <span className="text-xs text-slate-400">Hôm nay là ngày {formattedToday}</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {bills.map((bill) => {
            const isPaid = bill.status === 'PAID';
            const daysLeft = bill.dueDay - today;
            const isHighlighted = navTargetBillId === bill.id;

            return (
              <div
                key={bill.id}
                id={`bill-card-${bill.id}`}
                className={`p-5 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
                  isHighlighted
                    ? 'ring-4 ring-blue-500/80 dark:ring-blue-400/80 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Left: Info */}
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                      isPaid
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : daysLeft <= 0
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 animate-pulse'
                        : daysLeft <= (bill.reminderDaysBefore ?? 3)
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-6 h-6" /> : `N${bill.dueDay}`}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{bill.name}</h4>
                      {isHighlighted && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-600 text-white animate-pulse">
                          Đang xem từ cảnh báo
                        </span>
                      )}
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Đã trả ngày {formatDisplayDate(bill.lastPaidDate)}
                        </span>
                      ) : daysLeft < 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                          Quá hạn {Math.abs(daysLeft)} ngày! (Hạn N{bill.dueDay})
                        </span>
                      ) : daysLeft === 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse">
                          Hôm nay đến hạn!
                        </span>
                      ) : daysLeft <= (bill.reminderDaysBefore ?? 3) ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          Cần đóng trong {daysLeft} ngày (Hạn N{bill.dueDay})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Còn {daysLeft} ngày (Hạn N{bill.dueDay})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>Đến hạn ngày {bill.dueDay} hàng tháng</span>
                      <span>•</span>
                      <span>Nhắc trước {bill.reminderDaysBefore ?? 3} ngày</span>
                      <span>•</span>
                      <span>{bill.categoryName || 'Hóa đơn'}</span>
                      {bill.note && (
                        <>
                          <span>•</span>
                          <span className="italic">{bill.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Action */}
                <div className="flex items-center space-x-4 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 dark:text-white">
                      {formatCurrency(bill.amount)}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {bill.frequency === 'MONTHLY' ? 'Hàng tháng' : 'Định kỳ'}
                    </p>
                  </div>

                  {!isPaid ? (
                    <button
                      onClick={() => {
                        setBillToPay(bill);
                        setPayWalletId(wallets[0]?.id || '');
                        setPayDate(getLocalDateString());
                        setPayModalOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Thanh toán ngay</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        editBill(bill.id, { status: 'UNPAID', lastPaidDate: undefined });
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
                      title="Đặt lại chưa thanh toán"
                    >
                      <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                      <span>Đặt lại</span>
                    </button>
                  )}

                  {/* Edit / Delete */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingBill(bill);
                        setBillName(bill.name);
                        setBillAmount(String(bill.amount));
                        setBillCategory(bill.categoryId);
                        setBillDueDay(String(bill.dueDay));
                        setBillFrequency(bill.frequency);
                        setBillNote(bill.note || '');
                        setBillReminderDays(String(bill.reminderDaysBefore ?? 3));
                        setBillStatus(bill.status);
                        setBillLastPaidDate(bill.lastPaidDate || getLocalDateString());
                        setBillModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xác nhận xóa hóa đơn ${bill.name}?`)) {
                          deleteBill(bill.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT BILL */}
      {/* ========================================================================= */}
      {billModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingBill ? 'Chỉnh sửa hóa đơn' : 'Thêm hóa đơn định kỳ mới'}
              </h3>
              <button
                onClick={() => setBillModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Tên hóa đơn cố định
                </label>
                <input
                  type="text"
                  required
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="Ví dụ: Tiền điện EVN, Internet Viettel, Tiền thuê nhà..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Số tiền thanh toán (VNĐ)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatNumberWithDots(billAmount)}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '');
                    if (cleaned.length <= 18) {
                      setBillAmount(cleaned);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="0"
                  className="w-full text-xl font-bold px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Ngày đến hạn trong tháng
                  </label>
                  <select
                    value={billDueDay}
                    onChange={(e) => setBillDueDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Ngày {d} hàng tháng
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Nhắc trước khi đến hạn
                  </label>
                  <select
                    value={billReminderDays}
                    onChange={(e) => setBillReminderDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  >
                    <option value="0">Đúng ngày đến hạn</option>
                    <option value="1">Trước 1 ngày</option>
                    <option value="2">Trước 2 ngày</option>
                    <option value="3">Trước 3 ngày</option>
                    <option value="5">Trước 5 ngày</option>
                    <option value="7">Trước 7 ngày</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Tần suất lặp lại
                  </label>
                  <select
                    value={billFrequency}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(e) => setBillFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  >
                    <option value="MONTHLY">Hàng tháng</option>
                    <option value="QUARTERLY">Hàng quý (3 tháng)</option>
                    <option value="YEARLY">Hàng năm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Danh mục gắn kèm
                  </label>
                  <select
                    value={billCategory}
                    onChange={(e) => setBillCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                  >
                    {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Status and Last Paid Date */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Trạng thái thanh toán tháng này:
                  </label>
                  <select
                    value={billStatus}
                    onChange={(e) => setBillStatus(e.target.value as 'UNPAID' | 'PAID')}
                    className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold dark:text-white"
                  >
                    <option value="UNPAID">Chưa thanh toán</option>
                    <option value="PAID">Đã thanh toán</option>
                  </select>
                </div>

                {billStatus === 'PAID' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Ngày đã thanh toán (có thể điều chỉnh tùy ý):
                    </label>
                    <input
                      type="date"
                      value={billLastPaidDate}
                      onChange={(e) => setBillLastPaidDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Ghi chú thêm (Mã khách hàng, cú pháp)
                </label>
                <input
                  type="text"
                  value={billNote}
                  onChange={(e) => setBillNote(e.target.value)}
                  placeholder="Ví dụ: Mã KH: PD09887723..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBillModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
                >
                  Lưu hóa đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PAY BILL CONFIRMATION */}
      {/* ========================================================================= */}
      {payModalOpen && billToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                Xác nhận thanh toán hóa đơn
              </h3>
              <button
                onClick={() => setPayModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500">Khoản thanh toán:</p>
                <h4 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                  {billToPay.name}
                </h4>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {formatCurrency(billToPay.amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Trừ tiền từ Ví / Tài khoản:
                </label>
                <select
                  value={payWalletId}
                  onChange={(e) => setPayWalletId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Khả dụng: {formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Ngày thanh toán thực tế:
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold dark:text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Mặc định là ngày hôm nay ({formattedToday}). Bạn có thể tùy chỉnh ngày nếu đã đóng trước đó.
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hệ thống sẽ tự động trừ số tiền này khỏi ví đã chọn và ghi nhận một giao dịch chi tiêu vào sổ.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPay}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm"
              >
                Xác nhận thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
