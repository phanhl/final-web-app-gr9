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
