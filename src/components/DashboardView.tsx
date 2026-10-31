import React, { useMemo, useState } from 'react';
import {
  Baby,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { ALL_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { BabyProfileModal } from './BabyProfileModal';

interface Props {
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenBudgetModal: () => void;
  onOpenSettlementModal: () => void;
  onOpenSyncModal?: (tab?: 'sync' | 'backup' | 'family', subTab?: 'cloud' | 'timemachine' | 'offline') => void;
  onOpenBabyModal?: () => void;
}

export const DashboardView: React.FC<Props> = ({
  onOpenNewTransaction,
  onEditTransaction,
  onOpenBudgetModal,
  onOpenSettlementModal,
  onOpenSyncModal,
  onOpenBabyModal,
}) => {
  const { transactions, deleteTransaction, budget, couple, babyInfo, formatAmount, maskBabyName, isPrivacyMode, syncState } = useApp();

  const [isLocalBabyModalOpen, setIsLocalBabyModalOpen] = useState(false);
  const handleEditBaby = onOpenBabyModal || (() => setIsLocalBabyModalOpen(true));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPayer, setSelectedPayer] = useState<string>('all');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  // Dynamic real-time date detection
  const now = useMemo(() => new Date(), []);
  const realCurrentYear = now.getFullYear();
  const realCurrentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const realCurrentMonthKey = `${realCurrentYear}-${realCurrentMonth}`;

  // Month selector state: defaults to real-time current month (e.g. 2026-10)
  const [selectedMonth, setSelectedMonth] = useState<string>(realCurrentMonthKey);

  // Month & Year Selector Modal state
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      const y = parseInt(selectedMonth.split('-')[0], 10);
      return isNaN(y) ? realCurrentYear : y;
    }
    return realCurrentYear;
  });

  // Dynamic list of available months (Current month + previous 12 months + next 2 months + all months in transactions)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(realCurrentMonthKey);

    // Range around current month
    for (let i = -2; i <= 12; i++) {
      const d = new Date(realCurrentYear, now.getMonth() - i, 1);
      monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        monthsSet.add(t.date.substring(0, 7));
      }
    });

    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted.map(m => {
      const [year, mon] = m.split('-');
      const isCurrent = m === realCurrentMonthKey;
      return {
        value: m,
        label: `${year} 年 ${parseInt(mon, 10)} 月${isCurrent ? ' (本月)' : ''}`,
      };
    });
  }, [transactions, realCurrentMonthKey, realCurrentYear, now]);

  // Count of transactions per month for visual badges
  const txCountByMonth = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.date && t.date.length >= 7) {
        const ym = t.date.substring(0, 7);
        map[ym] = (map[ym] || 0) + 1;
      }
    });
    return map;
  }, [transactions]);

  // Current display label
  const currentMonthDisplayLabel = useMemo(() => {
    if (selectedMonth === 'all') return '全部歷史記錄';
    const [year, mon] = selectedMonth.split('-');
    const isCurrent = selectedMonth === realCurrentMonthKey;
    return `${year} 年 ${parseInt(mon, 10)} 月${isCurrent ? ' (本月)' : ''}`;
  }, [selectedMonth, realCurrentMonthKey]);

  // Step to previous month
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(realCurrentMonthKey);
      return;
    }
    const [year, mon] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, mon - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(prevKey);
    setPickerYear(prevDate.getFullYear());
  };

  // Step to next month
  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(realCurrentMonthKey);
      return;
    }
    const [year, mon] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, mon, 1);
    const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextKey);
    setPickerYear(nextDate.getFullYear());
  };

  // Calculate stats for current selected month
  const stats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    let dadExpense = 0;
    let momExpense = 0;
    let jointExpense = 0;

    const filtered = transactions.filter(t => {
      if (selectedMonth !== 'all' && !t.date.startsWith(selectedMonth)) {
        return false;
      }
      return true;
    });

    filtered.forEach(t => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        if (t.paidBy === 'dad') dadExpense += t.amount;
        else if (t.paidBy === 'mom') momExpense += t.amount;
        else jointExpense += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

    const netExpense = totalExpense - totalIncome;
    const remainingBudget = Math.max(0, budget.totalBudget - totalExpense);
    const budgetUsagePercent = budget.totalBudget > 0 ? (totalExpense / budget.totalBudget) * 100 : 0;

    // Calculate days remaining and daily safe spend in the selected month
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    let remainingDays = 0;
    let safeDailySpend = 0;
    let isPastMonth = false;

    if (selectedMonth === 'all') {
      remainingDays = 30;
      safeDailySpend = Math.round(remainingBudget / 30);
    } else {
      const [selYear, selMonthNum] = selectedMonth.split('-').map(Number);
      const daysInSelMonth = new Date(selYear, selMonthNum, 0).getDate();

      if (selectedMonth === realCurrentMonthKey) {
        remainingDays = Math.max(1, daysInSelMonth - currentDay + 1);
        safeDailySpend = Math.round(remainingBudget / remainingDays);
      } else if (selectedMonth < realCurrentMonthKey) {
        isPastMonth = true;
        remainingDays = 0;
        safeDailySpend = 0;
      } else {
        remainingDays = daysInSelMonth;
        safeDailySpend = Math.round(remainingBudget / remainingDays);
      }
    }

    return {
      totalExpense,
      totalIncome,
      netExpense,
      dadExpense,
      momExpense,
      jointExpense,
      remainingBudget,
      budgetUsagePercent,
      remainingDays,
      safeDailySpend,
      isPastMonth,
      count: filtered.length,
    };
  }, [transactions, selectedMonth, budget.totalBudget, realCurrentMonthKey]);

  // Filtered and sorted transactions for the list (strictly by date order)
  const displayTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        // Month filter
        if (selectedMonth !== 'all' && !t.date.startsWith(selectedMonth)) return false;
        // Category filter
        if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
        // Payer filter
        if (selectedPayer !== 'all' && t.paidBy !== selectedPayer) return false;
        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const cat = ALL_CATEGORIES[t.category]?.name.toLowerCase() || '';
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchCat = cat.includes(q);
          const matchNote = (t.note || '').toLowerCase().includes(q);
          const matchTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q));
          if (!matchTitle && !matchCat && !matchNote && !matchTags) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        if (timeA !== timeB) {
          return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        }
        return dateSortOrder === 'desc'
          ? (b.createdAt || 0) - (a.createdAt || 0)
          : (a.createdAt || 0) - (b.createdAt || 0);
      });
  }, [transactions, selectedMonth, selectedCategory, selectedPayer, searchTerm, dateSortOrder]);

  // Precomputed daily counts and totals for date group headers
  const dayTotalsMap = useMemo(() => {
    const map = new Map<string, { count: number; expense: number; income: number }>();
    displayTransactions.forEach(t => {
      const entry = map.get(t.date) || { count: 0, expense: 0, income: 0 };
      entry.count++;
      if (t.type === 'expense') entry.expense += t.amount;
      else entry.income += t.amount;
      map.set(t.date, entry);
    });
    return map;
  }, [displayTransactions]);

  // Determine baby age in months/days
  const babyAgeText = useMemo(() => {
    if (!babyInfo.birthDate) return '';
    const birth = new Date(babyInfo.birthDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (diffMonths <= 0) return '新生兒期';
    if (diffMonths < 12) return `${diffMonths} 個月大`;
    const years = Math.floor(diffMonths / 12);
    const rem = diffMonths % 12;
    return rem > 0 ? `${years} 歲 ${rem} 個月` : `${years} 歲`;
  }, [babyInfo.birthDate]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner: Baby Info & Couple Status (Warm Light Aesthetic) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 p-5 border border-amber-200/70 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleEditBaby}
            title="點擊修改寶寶頭貼與資料"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-2xl shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            {babyInfo.avatar || '👶🏻'}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEditBaby}
                className="group flex items-center gap-1.5 text-left cursor-pointer"
                title="點擊修改寶寶名稱"
              >
                <h1 className="text-base font-bold text-stone-900 dark:text-white tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {maskBabyName(babyInfo.name)}
                </h1>
                <span className="p-1 rounded-md text-stone-400 group-hover:text-amber-600 group-hover:bg-amber-100/50 dark:group-hover:bg-amber-950/40 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </span>
              </button>
              {babyAgeText && (
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-100/70 dark:bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {babyAgeText}
                </span>
              )}
              <button
                type="button"
                onClick={handleEditBaby}
                className="text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer ml-1 hidden xs:inline"
              >
                修改名稱
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mt-0.5">
              <span className="font-medium text-stone-700 dark:text-slate-300">
                {couple.dadName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '爸爸'} {couple.dadAvatar || '👨🏻'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-stone-700 dark:text-slate-300">
                {couple.momName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '媽媽'} {couple.momAvatar || '👩🏻'}
              </span>
              <span>共同家庭帳本</span>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onOpenSyncModal?.('sync')}
                className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md text-[11px] hover:bg-amber-200/80 transition-colors cursor-pointer"
                title="點擊查看家庭同步狀態與共享連結"
              >
                <span>☁️ 房間：{syncState.roomId}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Month Switcher with Month Stepper & Custom Year/Month Picker */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Previous Month Button */}
          <button
            type="button"
            onClick={handlePrevMonth}
            title="查看上一月份"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Month Display & Selector Pill */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => {
                if (selectedMonth && selectedMonth !== 'all') {
                  const y = parseInt(selectedMonth.split('-')[0], 10);
                  if (!isNaN(y)) setPickerYear(y);
                }
                setIsMonthPickerOpen(true);
              }}
              title="點擊開啟自選年份與月份"
              className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-950 px-2.5 sm:px-3 py-1.5 border border-stone-200/80 dark:border-slate-800 text-xs shadow-2xs hover:border-amber-400 dark:hover:border-amber-600/60 transition-all cursor-pointer group"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-stone-900 dark:text-white whitespace-nowrap">
                {currentMonthDisplayLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0" />
            </button>
          </div>

          {/* Next Month Button */}
          <button
            type="button"
            onClick={handleNextMonth}
            title="查看下一月份"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-900 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 夫妻對帳 button */}
          <button
            onClick={onOpenSettlementModal}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-850 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <span>夫妻對帳</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards (Warm Crisp Surfaces) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: 本月總支出 */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium truncate">
              {selectedMonth === realCurrentMonthKey
                ? '本月總支出'
                : selectedMonth === 'all'
                ? '歷史總支出'
                : `${selectedMonth.split('-')[1]}月總支出`}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">
              <TrendingDown className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-white tabular-nums">
              {formatAmount(stats.totalExpense)}
            </div>
            <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-400 flex items-center gap-1">
              <span>共 {stats.count} 筆開銷</span>
            </div>
          </div>
        </div>

        {/* Card 2: 總補助與收入 */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium truncate">
              {selectedMonth === realCurrentMonthKey ? '補助與紅包收入' : '補助與紅包總計'}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatAmount(stats.totalIncome, { showSign: true })}
            </div>
            <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-400 truncate">
              實質淨支: {formatAmount(Math.max(0, stats.netExpense))}
            </div>
          </div>
        </div>

        {/* Card 3: 每月預算剩餘 */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium truncate">
              {selectedMonth === realCurrentMonthKey ? '本月預算剩餘' : '當期預算額度'}
            </span>
            <button
              onClick={onOpenBudgetModal}
              className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold hover:underline shrink-0"
            >
              設定配額
            </button>
          </div>
          <div className="mt-2">
            <div
              className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ${
                stats.remainingBudget > 0 ? 'text-stone-900 dark:text-white' : 'text-rose-600 dark:text-red-400'
              }`}
            >
              {formatAmount(stats.remainingBudget)}
            </div>
            <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
              {stats.budgetUsagePercent > 100 ? (
                <span className="text-rose-600 dark:text-red-400 font-semibold">已超出預算！</span>
              ) : (
                <span>剩餘 {Math.round(100 - stats.budgetUsagePercent)}% 可用</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: 建議每日額度 / 結算狀態 */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium truncate">
              {stats.isPastMonth ? '當月結算狀態' : '每日建議花費'}
            </span>
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shrink-0">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2">
            {stats.isPastMonth ? (
              <>
                <div className="text-lg sm:text-xl font-bold text-stone-800 dark:text-slate-200">
                  當月已結束
                </div>
                <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ 已完成整月結算
                </div>
              </>
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-white tabular-nums">
                  {formatAmount(stats.safeDailySpend)}
                </div>
                <div className="mt-1 text-[11px] text-stone-500 dark:text-slate-400">
                  <span>
                    {selectedMonth === 'all'
                      ? '歷史平均日額度'
                      : `剩餘 ${stats.remainingDays} 天控制額度`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-800 dark:text-slate-200">每月預算消化進度</span>
            <span className="text-xs text-stone-500 dark:text-slate-400 font-mono">
              {formatAmount(stats.totalExpense)} / {formatAmount(budget.totalBudget)}
            </span>
          </div>
          <span
            className={`text-xs font-bold font-mono ${
              stats.budgetUsagePercent > 100
                ? 'text-rose-600 dark:text-red-400'
                : stats.budgetUsagePercent > 80
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isPrivacyMode ? '••%' : `${stats.budgetUsagePercent.toFixed(1)}%`}
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              stats.budgetUsagePercent > 100
                ? 'bg-rose-500'
                : stats.budgetUsagePercent > 80
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, stats.budgetUsagePercent)}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3 text-xs text-stone-500 dark:text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
              爸爸付：{formatAmount(stats.dadExpense)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-pink-500 inline-block" />
              媽媽付：{formatAmount(stats.momExpense)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              共同基金：{formatAmount(stats.jointExpense)}
            </span>
          </div>

          <button
            onClick={onOpenBudgetModal}
            className="text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1 self-end sm:self-auto"
          >
            分類預算詳情 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 dark:text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="搜尋項目名稱、備註、標籤..."
            className="w-full rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 py-2.5 pl-9 pr-3 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:border-amber-500 focus:outline-none shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-white"
            >
              清除
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs text-stone-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer shadow-sm"
          >
            <option value="all">全部分類</option>
            <optgroup label="支出分類">
              <option value="nursing">哺育用品</option>
              <option value="medical">醫療保健</option>
              <option value="food">飲食</option>
              <option value="childcare">托育費用</option>
              <option value="daily">日常用品</option>
              <option value="play">玩樂用品</option>
              <option value="other_expense">其他支出</option>
            </optgroup>
            <optgroup label="收入分類">
              <option value="subsidy">政府補助</option>
              <option value="insurance">保險理賠</option>
              <option value="gift">親友贈與</option>
              <option value="other_income">其他收入</option>
            </optgroup>
          </select>

          {/* Member Filter */}
          <select
            value={selectedPayer}
            onChange={e => setSelectedPayer(e.target.value)}
            className="rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs text-stone-700 dark:text-slate-300 focus:border-amber-500 focus:outline-none cursor-pointer shadow-sm"
          >
            <option value="all">全部付款人</option>
            <option value="dad">爸爸 👨🏻</option>
            <option value="mom">媽媽 👩🏻</option>
            <option value="joint">共同基金 🏠</option>
          </select>

          {/* Date Sort Order Toggle */}
          <button
            type="button"
            onClick={() => setDateSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm shrink-0 font-medium"
            title="點擊切換日期排序方向"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{dateSortOrder === 'desc' ? '日期：新到舊 ↓' : '日期：舊到新 ↑'}</span>
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="border-b border-stone-100 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between bg-stone-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">收支交易明細</h3>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              ({displayTransactions.length} 筆)
            </span>
          </div>
          <button
            onClick={onOpenNewTransaction}
            className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> 記一筆
          </button>
        </div>

        {displayTransactions.length === 0 ? (
          <div className="py-12 text-center text-stone-500 dark:text-slate-400">
            <p className="text-sm">尚無符合條件的收支記錄</p>
            <button
              onClick={onOpenNewTransaction}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> 立即新增第一筆寶寶開銷
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-slate-800/60">
            {displayTransactions.map((tx, idx) => {
              const cat = ALL_CATEGORIES[tx.category];
              const isExpense = tx.type === 'expense';
              const payerName =
                tx.paidBy === 'dad'
                  ? couple.dadName
                  : tx.paidBy === 'mom'
                  ? couple.momName
                  : '共同基金';
              const payerColor =
                tx.paidBy === 'dad'
                  ? 'text-blue-600 dark:text-blue-400'
                  : tx.paidBy === 'mom'
                  ? 'text-pink-600 dark:text-pink-400'
                  : 'text-emerald-600 dark:text-emerald-400';

              const prevTx = idx > 0 ? displayTransactions[idx - 1] : null;
              const isNewDateGroup = !prevTx || prevTx.date !== tx.date;
              const daySummary = dayTotalsMap.get(tx.date) || { count: 1, expense: 0, income: 0 };

              // Format date: e.g. "10月28日 週三"
              const formatDateHeader = (dStr: string) => {
                try {
                  const parts = dStr.split('-');
                  if (parts.length === 3) {
                    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
                    const dayOfWeek = weekdays[d.getDay()] || '';
                    return `${Number(parts[1])}月${Number(parts[2])}日 ${dayOfWeek}`;
                  }
                } catch {
                  // fallback
                }
                return dStr;
              };

              return (
                <React.Fragment key={tx.id}>
                  {isNewDateGroup && (
                    <div className="px-4 py-2 bg-stone-100/80 dark:bg-slate-850/80 border-y border-stone-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{formatDateHeader(tx.date)}</span>
                        <span className="text-[11px] font-normal text-stone-400 dark:text-slate-500">
                          ({daySummary.count} 筆)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                        {daySummary.expense > 0 && (
                          <span className="text-stone-600 dark:text-slate-300">
                            支 {formatAmount(daySummary.expense)}
                          </span>
                        )}
                        {daySummary.income > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            收 +{formatAmount(daySummary.income)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 hover:bg-stone-50/70 dark:hover:bg-slate-850/60 transition-colors group">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Category Icon */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs"
                        style={{
                          backgroundColor: cat ? cat.bgLight : 'rgba(0,0,0,0.04)',
                          color: cat ? cat.color : '#475569',
                        }}
                      >
                        <CategoryIcon category={tx.category} className="h-5 w-5" />
                      </div>

                      {/* Title and metadata */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-stone-900 dark:text-white truncate max-w-[200px] sm:max-w-md">
                            {tx.title}
                          </span>
                          {tx.splitMethod === 'split_50_50' && isExpense && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded font-medium hidden sm:inline">
                              夫妻平攤 (薪資比例)
                            </span>
                          )}
                        </div>

                        {/* Clean Unboxed Metadata with · separator */}
                        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-slate-400 mt-0.5 truncate">
                          <span>{cat ? cat.name : tx.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-stone-700 dark:text-slate-300">{tx.date}</span>
                          <span aria-hidden="true">·</span>
                          <span className={payerColor}>{payerName} 付</span>
                          {tx.note && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[140px] text-stone-400">
                                {isPrivacyMode ? '••••' : tx.note}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-sm sm:text-base font-bold font-mono tabular-nums ${
                            isExpense ? 'text-stone-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {formatAmount(isExpense ? -tx.amount : tx.amount, { showSign: true })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditTransaction(tx)}
                          title="編輯此筆帳務"
                          className="p-1.5 text-stone-400 hover:text-stone-800 dark:hover:text-white rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          title="刪除此筆帳務"
                          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <BabyProfileModal
        isOpen={isLocalBabyModalOpen}
        onClose={() => setIsLocalBabyModalOpen(false)}
      />

      {/* In-app Delete Confirmation Modal (Reliable across all webviews & iframes) */}
      {txToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">確認刪除帳務記錄？</h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">刪除後該筆帳務將直接移除並即時同步</p>
              </div>
            </div>

            <div className="rounded-2xl bg-stone-50 dark:bg-slate-950 p-3.5 border border-stone-200/80 dark:border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-stone-800 dark:text-slate-200">{txToDelete.title}</span>
                <span className="font-mono font-bold text-stone-900 dark:text-white">
                  {formatAmount(txToDelete.type === 'expense' ? -txToDelete.amount : txToDelete.amount, { showSign: true })}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 dark:text-slate-400">
                {txToDelete.date} · 由 {txToDelete.paidBy === 'dad' ? couple.dadName : txToDelete.paidBy === 'mom' ? couple.momName : '共同公積金'} 支付
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = txToDelete.id;
                  setTxToDelete(null);
                  deleteTransaction(id);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Year & Month Selection Modal */}
      {isMonthPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl border border-stone-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-5 py-4 bg-stone-50/70 dark:bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">自選收支月份</h3>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">切換查看任意年份與月份之家庭帳本</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth(realCurrentMonthKey);
                    setPickerYear(realCurrentYear);
                    setIsMonthPickerOpen(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedMonth === realCurrentMonthKey
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-2xs'
                      : 'border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>回到本月 ({realCurrentYear}年{parseInt(realCurrentMonth, 10)}月)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonth('all');
                    setIsMonthPickerOpen(false);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedMonth === 'all'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shadow-2xs'
                      : 'border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 text-stone-700 dark:text-slate-300 hover:bg-stone-100'
                  }`}
                >
                  全部歷史記錄
                </button>
              </div>

              {/* Year Selector Stepper */}
              <div className="flex items-center justify-between bg-stone-50/80 dark:bg-slate-950/60 p-2 rounded-2xl border border-stone-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPickerYear(y => y - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="前一年"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-mono text-stone-900 dark:text-white">
                    {pickerYear} 年
                  </span>
                  {pickerYear === realCurrentYear && (
                    <span className="text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                      今年
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPickerYear(y => y + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-600 dark:text-slate-300 hover:bg-stone-100 shadow-2xs active:scale-95 transition-all cursor-pointer"
                  title="後一年"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 12 Months Grid */}
              <div>
                <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-2">
                  請選擇月份：
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(mon => {
                    const monStr = String(mon).padStart(2, '0');
                    const targetKey = `${pickerYear}-${monStr}`;
                    const isSelected = selectedMonth === targetKey;
                    const isCurrent = targetKey === realCurrentMonthKey;
                    const count = txCountByMonth[targetKey] || 0;

                    return (
                      <button
                        key={mon}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(targetKey);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-white shadow-md font-bold'
                            : isCurrent
                            ? 'border-amber-400/90 dark:border-amber-600/70 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-semibold hover:border-amber-500'
                            : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-stone-700 dark:text-slate-300 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs">{mon} 月</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isCurrent && (
                            <span
                              className={`text-[9px] px-1 rounded ${
                                isSelected ? 'bg-amber-600 text-white' : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              本月
                            </span>
                          )}
                          {count > 0 && (
                            <span
                              className={`text-[9px] font-mono ${
                                isSelected ? 'text-amber-100' : 'text-stone-400 dark:text-slate-500'
                              }`}
                            >
                              {count}筆
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Native Month Input fallback */}
              <div className="pt-2 border-t border-stone-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-stone-500 dark:text-slate-400 text-[11px]">或以日曆輪盤選取：</span>
                <input
                  type="month"
                  value={selectedMonth === 'all' ? realCurrentMonthKey : selectedMonth}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedMonth(e.target.value);
                      const y = parseInt(e.target.value.split('-')[0], 10);
                      if (!isNaN(y)) setPickerYear(y);
                      setIsMonthPickerOpen(false);
                    }
                  }}
                  className="rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-2 py-1 text-xs text-stone-800 dark:text-white cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
