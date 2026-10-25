import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Pencil,
  Save,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';
import { ExpenseCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';

export const BudgetView: React.FC = () => {
  const { budget, updateBudget, transactions, formatAmount, isPrivacyMode } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [tempTotalBudget, setTempTotalBudget] = useState(String(budget.totalBudget));
  const [tempCategoryBudgets, setTempCategoryBudgets] = useState<Record<string, string>>(() => {
    const res: Record<string, string> = {};
    Object.keys(EXPENSE_CATEGORIES).forEach(k => {
      res[k] = String(budget.categoryBudgets[k as ExpenseCategory] || 0);
    });
    return res;
  });

  // Calculate actual spending for each category in current month (2026-09)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const categoryStats = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    let totalExpense = 0;
    let totalSubsidy = 0;

    transactions
      .filter(t => t.date.startsWith(currentMonthStr))
      .forEach(t => {
        if (t.type === 'expense') {
          expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
          totalExpense += t.amount;
        } else {
          totalSubsidy += t.amount;
        }
      });

    return {
      expensesByCategory,
      totalExpense,
      totalSubsidy,
    };
  }, [transactions, currentMonthStr]);

  const handleSaveBudgets = () => {
    const newTotal = parseFloat(tempTotalBudget) || 0;
    const newCatBudgets: Partial<Record<ExpenseCategory, number>> = {};
    Object.keys(tempCategoryBudgets).forEach(k => {
      newCatBudgets[k as ExpenseCategory] = parseFloat(tempCategoryBudgets[k]) || 0;
    });

    updateBudget({
      ...budget,
      totalBudget: newTotal,
      categoryBudgets: newCatBudgets,
    });
    setIsEditing(false);
  };

  const handleAutoDistribute = () => {
    const total = parseFloat(tempTotalBudget) || 40000;
    const weights: Record<string, number> = {
      childcare: 0.45,
      nursing: 0.15,
      daily: 0.12,
      medical: 0.10,
      food: 0.08,
      play: 0.06,
      other_expense: 0.04,
    };
    const updated: Record<string, string> = {};
    Object.entries(weights).forEach(([key, weight]) => {
      updated[key] = String(Math.round((total * weight) / 100) * 100);
    });
    setTempCategoryBudgets(updated);
  };

  const totalCategoryBudgetsSum = useMemo(() => {
    return Object.values(budget.categoryBudgets).reduce((sum: number, val) => sum + (val || 0), 0);
  }, [budget.categoryBudgets]);

  const overallPercent = budget.totalBudget > 0 ? (categoryStats.totalExpense / budget.totalBudget) * 100 : 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white dark:from-slate-900 dark:to-slate-850 p-5 border border-amber-200/70 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-base font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>每月預算與支出分析</span>
            <span className="text-xs font-mono font-bold text-amber-800 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-500/20">
              {currentMonthStr}
            </span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1">
            智慧控管托育、哺育、醫療等各大核心支出，結合政府補助抵扣計算家庭實質負擔。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 dark:text-slate-400 hover:text-stone-900 bg-white"
              >
                取消
              </button>
              <button
                onClick={handleSaveBudgets}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 text-xs font-semibold text-white hover:bg-amber-500 shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" /> 儲存預算配額
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 shadow-sm transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> 調整預算配額
            </button>
          )}
        </div>
      </div>

      {/* Monthly Budget High-level Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Budget Card */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium">本月總支出預算上限</span>
            <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-stone-900 dark:text-white tabular-nums">
              {formatAmount(budget.totalBudget)}
            </span>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              已用 {formatAmount(categoryStats.totalExpense)}
            </span>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400 mb-1">
              <span>預算消化率</span>
              <span className={`font-mono font-bold ${overallPercent > 100 ? 'text-rose-600 dark:text-red-400' : 'text-stone-700 dark:text-slate-300'}`}>
                {isPrivacyMode ? '••%' : `${overallPercent.toFixed(1)}%`}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  overallPercent > 100 ? 'bg-rose-500' : overallPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subsidy Offset Effect */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium">政府補助與理賠沖抵</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatAmount(categoryStats.totalSubsidy, { showSign: true })}
            </span>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              抵減支出 {categoryStats.totalExpense > 0 ? ((categoryStats.totalSubsidy / categoryStats.totalExpense) * 100).toFixed(0) : 0}%
            </span>
          </div>

          <p className="mt-3 text-xs text-stone-500 dark:text-slate-400">
            沖抵補助後，家庭實質自付金額為{' '}
            <strong className="text-stone-900 dark:text-white font-mono font-bold">
              {formatAmount(Math.max(0, categoryStats.totalExpense - categoryStats.totalSubsidy))}
            </strong>
          </p>
        </div>

        {/* Health Score / Warning */}
        <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400">
            <span className="font-medium">預算健康度</span>
            {overallPercent > 100 ? (
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
          </div>

          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xl font-bold ${
                  overallPercent > 100 ? 'text-rose-600' : overallPercent > 85 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {overallPercent > 100 ? '超支警示 (警戒)' : overallPercent > 85 ? '接近上限 (注意)' : '良好健康 (安全)'}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
              {overallPercent > 100
                ? '本月累計開銷已超過原定預算上限，建議暫緩非必要玩樂或裝飾性消費。'
                : '目前各項寶寶固定與浮動支出均在控制範圍內，符合健康的家庭理財目標。'}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Mode Notice & Quick Tools */}
      {isEditing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>您正處於預算編輯模式，可直接輸入各分類的目標上限金額。</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoDistribute}
              className="text-xs bg-white hover:bg-stone-50 text-amber-900 px-3 py-1.5 rounded-lg border border-amber-200 font-medium shadow-xs"
            >
              依經驗比例自動分配
            </button>
            <div className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-slate-300">
              <span className="font-medium">總預算：</span>
              <input
                type="number"
                value={tempTotalBudget}
                onChange={e => setTempTotalBudget(e.target.value)}
                className="w-24 rounded-lg border border-stone-200 bg-white px-2 py-1 font-mono text-stone-900 text-xs font-semibold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Budget Detail Breakdown Cards */}
      <div className="rounded-2xl border border-stone-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="border-b border-stone-100 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between bg-stone-50/50 dark:bg-slate-900/80">
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">各大支出分類預算 vs 實際支出</h3>
          <span className="text-xs text-stone-500 dark:text-slate-400 font-mono">
            分類預算總和: ${totalCategoryBudgetsSum.toLocaleString()}
          </span>
        </div>

        <div className="divide-y divide-stone-100 dark:divide-slate-800/60">
          {Object.values(EXPENSE_CATEGORIES).map(cat => {
            const actual = categoryStats.expensesByCategory[cat.key] || 0;
            const allocatedBudget = budget.categoryBudgets[cat.key as ExpenseCategory] || 0;
            const ratio = allocatedBudget > 0 ? (actual / allocatedBudget) * 100 : 0;
            const remaining = allocatedBudget - actual;
            const isOver = remaining < 0;

            return (
              <div key={cat.key} className="p-4 sm:p-5 hover:bg-stone-50/60 dark:hover:bg-slate-850/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs"
                      style={{ backgroundColor: cat.bgLight, color: cat.color }}
                    >
                      <CategoryIcon category={cat.key} className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900 dark:text-white">{cat.name}</span>
                        {isOver && (
                          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            超支 {formatAmount(Math.abs(remaining))}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-sm">
                        {cat.description}
                      </div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right">
                    <div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">本月實際支出</div>
                      <div className="text-sm font-bold font-mono text-stone-900 dark:text-white tabular-nums">
                        {formatAmount(actual)}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-stone-500 dark:text-slate-400">目標預算上限</div>
                      {isEditing ? (
                        <input
                          type="number"
                          value={tempCategoryBudgets[cat.key] || '0'}
                          onChange={e =>
                            setTempCategoryBudgets({
                              ...tempCategoryBudgets,
                              [cat.key]: e.target.value,
                            })
                          }
                          className="w-24 rounded-lg border border-stone-300 bg-white px-2 py-0.5 font-mono text-xs text-stone-900 text-right focus:border-amber-500 focus:outline-none"
                        />
                      ) : (
                        <div className="text-sm font-bold font-mono text-stone-700 dark:text-slate-300 tabular-nums">
                          {formatAmount(allocatedBudget)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-[70px]">
                      <div className="text-xs text-stone-500 dark:text-slate-400">預算狀態</div>
                      <div
                        className={`text-xs font-bold font-mono ${
                          isOver ? 'text-rose-600' : ratio > 80 ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {allocatedBudget > 0 ? `${ratio.toFixed(0)}%` : '未設'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-stone-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, ratio)}%`,
                        backgroundColor: isOver ? '#ef4444' : ratio > 80 ? '#f59e0b' : cat.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                    <span>
                      {isOver
                        ? `超出預算額度 ${Math.abs(remaining).toLocaleString()} 元`
                        : `剩餘額度 $${remaining.toLocaleString()}`}
                    </span>
                    <span>上限 ${allocatedBudget.toLocaleString()}</span>
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
