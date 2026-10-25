import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  Download,
  RotateCcw,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ALL_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';
import { CategoryKey } from '../types';

export const ReportsView: React.FC<{ onOpenCsvModal: () => void }> = ({ onOpenCsvModal }) => {
  const { transactions, couple, formatAmount, isPrivacyMode } = useApp();

  const [timeRange, setTimeRange] = useState<'thisMonth' | 'lastMonth' | 'year' | 'all' | 'custom'>('thisMonth');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  // Real-time date reference
  const now = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [now]);

  const monthStartStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }, [now]);

  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(monthStartStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [isCustomDatePanelOpen, setIsCustomDatePanelOpen] = useState(false);

  // Quick preset helper
  const handleApplyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    const sStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const eStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    setCustomStartDate(sStr);
    setCustomEndDate(eStr);
    setTimeRange('custom');
    setIsCustomDatePanelOpen(true);
  };

  // Filter transactions based on selected time range
  const filteredTransactions = useMemo(() => {
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = `${now.getFullYear()}`;

    return transactions.filter(t => {
      if (timeRange === 'thisMonth') return t.date.startsWith(currentMonth);
      if (timeRange === 'lastMonth') return t.date.startsWith(lastMonth);
      if (timeRange === 'year') return t.date.startsWith(currentYear);
      if (timeRange === 'custom') {
        if (customStartDate && customEndDate) {
          return t.date >= customStartDate && t.date <= customEndDate;
        } else if (customStartDate) {
          return t.date >= customStartDate;
        } else if (customEndDate) {
          return t.date <= customEndDate;
        }
        return true;
      }
      return true;
    });
  }, [transactions, timeRange, now, customStartDate, customEndDate]);

  // Range info label
  const rangeInfoText = useMemo(() => {
    if (timeRange === 'thisMonth') {
      const mon = now.getMonth() + 1;
      return `${now.getFullYear()} 年 ${mon} 月 (本月)`;
    }
    if (timeRange === 'lastMonth') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `${lm.getFullYear()} 年 ${lm.getMonth() + 1} 月 (上月)`;
    }
    if (timeRange === 'year') {
      return `${now.getFullYear()} 全年度`;
    }
    if (timeRange === 'all') {
      return '全部歷史統計';
    }
    if (timeRange === 'custom') {
      if (customStartDate && customEndDate) {
        const d1 = new Date(customStartDate);
        const d2 = new Date(customEndDate);
        const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return `${customStartDate} ~ ${customEndDate} (共 ${diffDays} 天)`;
      }
      return '自訂區間';
    }
    return '';
  }, [timeRange, now, customStartDate, customEndDate]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalExpense = 0;
    let totalIncome = 0;
    const expenseByCat: Record<string, number> = {};
    const incomeByCat: Record<string, number> = {};
    let dadPaid = 0;
    let momPaid = 0;
    let jointPaid = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
        if (t.paidBy === 'dad') dadPaid += t.amount;
        else if (t.paidBy === 'mom') momPaid += t.amount;
        else jointPaid += t.amount;
      } else {
        totalIncome += t.amount;
        incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
      }
    });

    const sortedExpenseCats = Object.entries(expenseByCat)
      .map(([key, amount]) => ({
        key: key as CategoryKey,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        info: ALL_CATEGORIES[key] || { name: key, color: '#94a3b8' },
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedIncomeCats = Object.entries(incomeByCat)
      .map(([key, amount]) => ({
        key: key as CategoryKey,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
        info: ALL_CATEGORIES[key] || { name: key, color: '#10b981' },
      }))
      .sort((a, b) => b.amount - a.amount);

    const topExpenses = [...filteredTransactions]
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      totalExpense,
      totalIncome,
      net: totalExpense - totalIncome,
      dadPaid,
      momPaid,
      jointPaid,
      sortedExpenseCats,
      sortedIncomeCats,
      topExpenses,
    };
  }, [filteredTransactions]);

  // SVG Donut Chart Calculation
  const donutSlices = useMemo(() => {
    let cumulativeAngle = 0;
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    return stats.sortedExpenseCats.map(item => {
      const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
      const angle = (cumulativeAngle / 100) * 360;
      cumulativeAngle += item.percentage;

      return {
        ...item,
        strokeDashoffset,
        circumference,
        angle,
      };
    });
  }, [stats.sortedExpenseCats]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar with Time Filter, Custom Date Range and CSV trigger */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-slate-900 dark:via-slate-850 p-5 border border-amber-200/70 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>寶寶財務視覺化報表</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              多維度分析收支結構、各大類別佔比與夫妻雙方分攤狀況。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Segmented Time Range */}
            <div className="flex items-center gap-1 rounded-xl bg-stone-100 dark:bg-slate-950 p-1 border border-stone-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTimeRange('thisMonth');
                  setIsCustomDatePanelOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === 'thisMonth'
                    ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                本月
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeRange('lastMonth');
                  setIsCustomDatePanelOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === 'lastMonth'
                    ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                上月
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeRange('year');
                  setIsCustomDatePanelOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === 'year'
                    ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                本年度
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeRange('all');
                  setIsCustomDatePanelOpen(false);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === 'all'
                    ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-2xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                全期間
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeRange('custom');
                  setIsCustomDatePanelOpen(prev => !prev);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  timeRange === 'custom'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>自訂區間</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isCustomDatePanelOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <button
              onClick={onOpenCsvModal}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-stone-500 dark:text-slate-300" /> 匯出 CSV
            </button>
          </div>
        </div>

        {/* Custom Date Range Panel (Visible when 'custom' is active or toggled) */}
        {(timeRange === 'custom' || isCustomDatePanelOpen) && (
          <div className="pt-3 border-t border-amber-200/60 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-950/70 p-3.5 rounded-xl border border-stone-200/80 dark:border-slate-800">
              {/* Date Inputs */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  自訂日期區間：
                </span>

                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => {
                      setCustomStartDate(e.target.value);
                      setTimeRange('custom');
                    }}
                    className="rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-stone-900 dark:text-white shadow-2xs focus:border-amber-500 focus:outline-none cursor-pointer"
                  />
                  <span className="text-stone-400 text-xs">至</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => {
                      setCustomEndDate(e.target.value);
                      setTimeRange('custom');
                    }}
                    className="rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-stone-900 dark:text-white shadow-2xs focus:border-amber-500 focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[11px] text-stone-500 dark:text-slate-400 mr-1">快捷區間：</span>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(7)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  近7天
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  近30天
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(90)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  近90天 (一季)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(180)}
                  className="px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-stone-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  近半年
                </button>
              </div>
            </div>

            {/* Range active summary pill */}
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-400 px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                目前統計範圍：<strong className="text-stone-900 dark:text-white font-semibold">{rangeInfoText}</strong>
              </span>
              <span>
                包含 <strong className="text-amber-700 dark:text-amber-400 font-bold">{filteredTransactions.length}</strong> 筆記帳
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-stone-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-medium">期間累計支出</span>
            <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-white tabular-nums">
            {formatAmount(stats.totalExpense)}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-stone-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-medium">期間補助與收入</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatAmount(stats.totalIncome, { showSign: true })}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-xs text-stone-500 dark:text-slate-400 flex items-center justify-between">
            <span className="font-medium">家庭實質淨支出</span>
            <span className="text-[10px] text-stone-400">支出扣除補助</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-stone-900 dark:text-white tabular-nums">
            {formatAmount(Math.max(0, stats.net))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Donut Chart vs Category List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Donut Chart */}
        <div className="lg:col-span-5 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 flex flex-col items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-4 self-start">支出分類結構分佈</h3>

          {stats.totalExpense === 0 ? (
            <div className="py-12 text-center text-xs text-stone-400">該期間尚無支出數據</div>
          ) : (
            <div className="relative flex items-center justify-center my-4">
              <svg width="220" height="220" viewBox="0 0 200 200" className="transform -rotate-90">
                {donutSlices.map((slice) => (
                  <circle
                    key={slice.key}
                    cx="100"
                    cy="100"
                    r="70"
                    fill="transparent"
                    stroke={slice.info.color}
                    strokeWidth="30"
                    strokeDasharray={slice.circumference}
                    strokeDashoffset={slice.strokeDashoffset}
                    transform={`rotate(${slice.angle} 100 100)`}
                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                    onClick={() => setActiveCategoryFilter(activeCategoryFilter === slice.key ? null : slice.key)}
                  />
                ))}
              </svg>

              {/* Donut Center Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs text-stone-500 dark:text-slate-300 font-medium">總支出額</span>
                <span className="text-lg font-bold font-mono text-stone-900 dark:text-white mt-0.5">
                  ${stats.totalExpense.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                  {stats.sortedExpenseCats.length} 個分類
                </span>
              </div>
            </div>
          )}

          <div className="text-xs text-stone-500 dark:text-slate-400 text-center mt-2">
            💡 點擊圖表色塊可快速聚焦篩選單一分類
          </div>
        </div>

        {/* Right: Category Ranked Breakdown */}
        <div className="lg:col-span-7 rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white">支出項目金額與佔比排行</h3>
              {activeCategoryFilter && (
                <button
                  onClick={() => setActiveCategoryFilter(null)}
                  className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline"
                >
                  清除單項篩選
                </button>
              )}
            </div>

            <div className="space-y-3.5">
              {stats.sortedExpenseCats.map(cat => {
                const isFocused = !activeCategoryFilter || activeCategoryFilter === cat.key;
                return (
                  <div
                    key={cat.key}
                    onClick={() => setActiveCategoryFilter(activeCategoryFilter === cat.key ? null : cat.key)}
                    className={`cursor-pointer rounded-xl p-2.5 transition-all ${
                      isFocused ? 'bg-stone-50/90 dark:bg-slate-850/60' : 'opacity-40 hover:opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full inline-block"
                          style={{ backgroundColor: cat.info.color }}
                        />
                        <span className="font-semibold text-stone-800 dark:text-white">{cat.info.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                          {formatAmount(cat.amount)}
                        </span>
                        <span className="font-mono text-stone-500 dark:text-slate-400 w-12 text-right">
                          {isPrivacyMode ? '••%' : `${cat.percentage.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-stone-200/80 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.info.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Couple Contribution Comparison */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1">夫妻雙方支出出資佔比分析</h3>
        <p className="text-xs text-stone-500 dark:text-slate-400 mb-4">
          比較爸爸、媽媽實際出資金額，釐清家庭共同開銷分攤狀況。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20 p-4">
            <div className="text-xs text-blue-700 dark:text-blue-400 font-semibold">{couple.dadName} (爸爸) 出資</div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-white mt-1 tabular-nums">
              {formatAmount(stats.dadPaid)}
            </div>
            <div className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              佔總支出 {isPrivacyMode ? '••%' : stats.totalExpense > 0 ? `${((stats.dadPaid / stats.totalExpense) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>

          <div className="rounded-xl border border-pink-200 bg-pink-50/60 dark:border-pink-900/40 dark:bg-pink-950/20 p-4">
            <div className="text-xs text-pink-700 dark:text-pink-400 font-semibold">{couple.momName} (媽媽) 出資</div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-white mt-1 tabular-nums">
              {formatAmount(stats.momPaid)}
            </div>
            <div className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              佔總支出 {isPrivacyMode ? '••%' : stats.totalExpense > 0 ? `${((stats.momPaid / stats.totalExpense) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">共同育兒基金扣款</div>
            <div className="text-xl font-bold font-mono text-stone-900 dark:text-white mt-1 tabular-nums">
              {formatAmount(stats.jointPaid)}
            </div>
            <div className="text-xs text-stone-500 dark:text-slate-400 mt-1">
              佔總支出 {isPrivacyMode ? '••%' : stats.totalExpense > 0 ? `${((stats.jointPaid / stats.totalExpense) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Stacked comparison bar */}
        {stats.totalExpense > 0 && (
          <div className="h-3 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden flex">
            <div
              style={{ width: `${(stats.dadPaid / stats.totalExpense) * 100}%` }}
              className="h-full bg-blue-500"
              title="爸爸出資"
            />
            <div
              style={{ width: `${(stats.momPaid / stats.totalExpense) * 100}%` }}
              className="h-full bg-pink-500"
              title="媽媽出資"
            />
            <div
              style={{ width: `${(stats.jointPaid / stats.totalExpense) * 100}%` }}
              className="h-full bg-emerald-500"
              title="共同基金"
            />
          </div>
        )}
      </div>

      {/* Top 5 Single Expenses */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-4">單筆最大開銷 TOP 5 排行榜</h3>

        <div className="space-y-2.5">
          {stats.topExpenses.map((t, idx) => {
            const cat = ALL_CATEGORIES[t.category];
            return (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-stone-50/80 dark:bg-slate-850/60 p-3 hover:bg-stone-100/80 transition-colors border border-stone-100 dark:border-transparent"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-200 dark:bg-slate-800 font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-semibold text-stone-900 dark:text-white">{t.title}</div>
                    <div className="text-[11px] text-stone-500 dark:text-slate-400">
                      {cat?.name} · {t.date} · {t.paidBy === 'dad' ? couple.dadName : t.paidBy === 'mom' ? couple.momName : '共同基金'} 付
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-stone-900 dark:text-white tabular-nums">
                    {formatAmount(t.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
