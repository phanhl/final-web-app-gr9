'use client';
import React from 'react';
import { Utensils, Car, ShoppingBag, Receipt, Home, Gamepad2, HeartPulse, GraduationCap, TrendingUp, MoreHorizontal, Briefcase, Gift, Coins, Store, PlusCircle, Banknote, Building2, CreditCard, PiggyBank, CircleDot, ShieldCheck, Bike, Plane, Laptop, Flame, Wallet, Calendar, Zap, } from 'lucide-react';
const iconMap = {
    Utensils,
    Car,
    ShoppingBag,
    Receipt,
    Home,
    Gamepad2,
    HeartPulse,
    GraduationCap,
    TrendingUp,
    MoreHorizontal,
    Briefcase,
    Gift,
    Coins,
    Store,
    PlusCircle,
    Banknote,
    Building2,
    CreditCard,
    PiggyBank,
    CircleDot,
    ShieldCheck,
    Bike,
    Plane,
    Laptop,
    Flame,
    Wallet,
    Calendar,
    Zap,
};
export const IconHelper = ({ name, className = 'w-5 h-5', size = 20 }) => {
    const IconComponent = iconMap[name] || CircleDot;
    return <IconComponent className={className} size={size}/>;
};
// Display name of icon (used for tooltip / accessibility when picking an icon)
export const ICON_LABELS = {
    Utensils: { vi: 'Ăn uống', en: 'Food & Dining' },
    ShoppingBag: { vi: 'Mua sắm', en: 'Shopping' },
    Home: { vi: 'Nhà cửa & Tiền thuê', en: 'Housing & Rent' },
    Car: { vi: 'Đi lại & Xe cộ', en: 'Transport & Vehicle' },
    Gamepad2: { vi: 'Giải trí', en: 'Entertainment' },
    HeartPulse: { vi: 'Sức khỏe', en: 'Health' },
    GraduationCap: { vi: 'Giáo dục', en: 'Education' },
    Gift: { vi: 'Quà tặng', en: 'Gifts' },
    Plane: { vi: 'Du lịch', en: 'Travel' },
    Laptop: { vi: 'Công nghệ & Thiết bị', en: 'Tech & Devices' },
    Flame: { vi: 'Gas & Năng lượng', en: 'Gas & Energy' },
    Wallet: { vi: 'Ví & Chi tiêu chung', en: 'Wallet & General' },
    Receipt: { vi: 'Hóa đơn', en: 'Bills' },
    Coins: { vi: 'Tiền & Phí', en: 'Money & Fees' },
    Store: { vi: 'Cửa hàng & Kinh doanh', en: 'Store & Business' },
    MoreHorizontal: { vi: 'Khác', en: 'Other' },
    TrendingUp: { vi: 'Đầu tư', en: 'Investment' },
    Briefcase: { vi: 'Công việc', en: 'Work' },
    Banknote: { vi: 'Tiền mặt', en: 'Cash' },
    Building2: { vi: 'Ngân hàng', en: 'Bank' },
    CreditCard: { vi: 'Thẻ tín dụng', en: 'Credit card' },
    PiggyBank: { vi: 'Tiết kiệm', en: 'Savings' },
    ShieldCheck: { vi: 'Bảo hiểm', en: 'Insurance' },
    Bike: { vi: 'Xe máy & Xe đạp', en: 'Motorbike & Bicycle' },
    Calendar: { vi: 'Định kỳ', en: 'Recurring' },
    Zap: { vi: 'Điện', en: 'Electricity' },
    PlusCircle: { vi: 'Thêm mới', en: 'Add new' },
};
export const getIconLabel = (name, lang = 'vi') => ICON_LABELS[name]?.[lang === 'en' ? 'en' : 'vi'] || name;
