import React, { useMemo, useState, useEffect } from 'react';
import {
  CheckCircle2,
  Handshake,
  X,
  Calculator,
  Save,
  HelpCircle,
  Percent,
  Wallet,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Calendar,
  UserCheck,
  Clock,
  ChevronDown,
  ChevronUp,
  History,
  Copy,
  Edit3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MonthlySalaryRecord } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CoupleSettlementModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    transactions,
    couple,
    updateCouple,
    saveMonthlySalary,
    saveBothMonthlySalaries,
    addTransaction,
    formatAmount,
    switchRole,
  } = useApp();

  // Selected Month (default: current year-month e.g. 2026-10)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Month list generator (Current month + previous 5 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isCurrent = i === 0;
      options.push({
        value: val,
        label: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月${isCurrent ? ' (當月)' : ''}`,
      });
    }
    options.push({ value: 'all', label: '全期間累計總額' });
    return options;
  }, []);

  // Retrieve current month's salary record
  const currentRecord = useMemo((): MonthlySalaryRecord => {
    if (selectedMonth === 'all') {
      return {
        month: 'all',
        dadSalary: couple.dadSalary ?? 40000,
        momSalary: couple.momSalary ?? 31000,
        dadSubmitted: true,
        momSubmitted: true,
      };
    }
    const record = couple.monthlySalaries?.[selectedMonth];
    if (record) return record;

    // Fallback: check previous month or baseline default
    return {
      month: selectedMonth,
      dadSalary: couple.dadSalary ?? 40000,
      momSalary: couple.momSalary ?? 31000,
      dadSubmitted: false,
      momSubmitted: false,
    };
  }, [couple.monthlySalaries, couple.dadSalary, couple.momSalary, selectedMonth]);

  // Form input states for the selected month
  const [dadInput, setDadInput] = useState<number>(currentRecord.dadSalary);
  const [momInput, setMomInput] = useState<number>(currentRecord.momSalary);
  const [settlementMode, setSettlementMode] = useState<'salary_ratio' | 'split_50_50'>(
    couple.settlementMode ?? 'salary_ratio'
  );

  // Sync inputs when selectedMonth or couple records change
  useEffect(() => {
    setDadInput(currentRecord.dadSalary);
    setMomInput(currentRecord.momSalary);
  }, [currentRecord, selectedMonth]);

  // Show / hide advanced sections
  const [showHistory, setShowHistory] = useState(false);
  const [showEditBoth, setShowEditBoth] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  // Simulator state (User test verification e.g. 8000 expense)
  const [simTotalExpense, setSimTotalExpense] = useState<number>(8000);
  const [simDadPaid, setSimDadPaid] = useState<number>(4000);
  const [simMomPaid, setSimMomPaid] = useState<number>(4000);

  // Clean names to guarantee exactly one icon without duplicate emojis
  const cleanDadName = couple.dadName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '爸爸';
  const cleanMomName = couple.momName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '媽媽';

  // Determine current user's role and inputs
  const isDad = couple.currentRole === 'dad';
  const currentUserRoleName = isDad ? cleanDadName : cleanMomName;
  const currentRoleSalaryInput = isDad ? dadInput : momInput;
  const setCurrentRoleSalaryInput = (val: number) => {
    if (isDad) setDadInput(val);
    else setMomInput(val);
  };
  const isCurrentRoleSubmitted = isDad ? currentRecord.dadSubmitted : currentRecord.momSubmitted;

  // Handler: Save current user's monthly salary
  const handleSaveMySalary = () => {
    if (selectedMonth === 'all') return;
    const amount = isDad ? dadInput : momInput;
    saveMonthlySalary(selectedMonth, couple.currentRole, amount);
  };

  // Handler: Save both spouses' monthly salaries
  const handleSaveBothSalaries = () => {
    if (selectedMonth === 'all') {
      updateCouple({
        dadSalary: dadInput,
        momSalary: momInput,
        settlementMode,
      });
      return;
    }
    saveBothMonthlySalaries(selectedMonth, dadInput, momInput);
    setShowEditBoth(false);
  };

  // Handler: Copy previous month's salary
  const handleCopyPrevMonthSalary = () => {
    if (selectedMonth === 'all') return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevRecord = couple.monthlySalaries?.[prevMonthStr];

    if (prevRecord) {
      setDadInput(prevRecord.dadSalary);
      setMomInput(prevRecord.momSalary);
      saveBothMonthlySalaries(selectedMonth, prevRecord.dadSalary, prevRecord.momSalary);
    } else {
      setDadInput(couple.dadSalary ?? 40000);
      setMomInput(couple.momSalary ?? 31000);
      saveBothMonthlySalaries(selectedMonth, couple.dadSalary ?? 40000, couple.momSalary ?? 31000);
    }
  };

  // Main Settlement Calculation
  const settlement = useMemo(() => {
    let dadPaidShared = 0;
    let momPaidShared = 0;
    let jointPaidTotal = 0;
    let dadPersonalGift = 0;
    let momPersonalGift = 0;

    const currentTxs = transactions.filter(t => {
      if (selectedMonth !== 'all' && !t.date.startsWith(selectedMonth)) return false;
      return t.type === 'expense';
    });

    currentTxs.forEach(t => {
      if (t.splitMethod === 'split_50_50') {
        if (t.paidBy === 'dad') dadPaidShared += t.amount;
        else if (t.paidBy === 'mom') momPaidShared += t.amount;
      } else if (t.splitMethod === 'paid_in_full') {
        if (t.paidBy === 'dad') dadPersonalGift += t.amount;
        else if (t.paidBy === 'mom') momPersonalGift += t.amount;
      } else if (t.splitMethod === 'joint_fund') {
        jointPaidTotal += t.amount;
      }
    });

    const totalShared = dadPaidShared + momPaidShared;

    // Monthly-specific salary and ratios
    const safeDadSalary = Math.max(0, Number(dadInput) || 0);
    const safeMomSalary = Math.max(0, Number(momInput) || 0);
    const totalSalary = safeDadSalary + safeMomSalary;

    let dadRatio = 0.5;
    let momRatio = 0.5;

    if (settlementMode === 'salary_ratio' && totalSalary > 0) {
      dadRatio = safeDadSalary / totalSalary;
      momRatio = safeMomSalary / totalSalary;
    }

    // Exact formula requested by user:
    // 爸爸薪資佔比 = 爸爸當月薪水 / 雙方加總薪水
    // 媽媽薪資佔比 = 媽媽當月薪水 / 雙方加總薪水
    // 爸爸應分攤 = 平帳總費用 * 爸爸薪資佔比
    // 媽媽應分攤 = 平帳總費用 * 媽媽薪資佔比 (totalShared - dadFairShare)
    const dadFairShare = Math.round(totalShared * dadRatio);
    const momFairShare = totalShared - dadFairShare;

    // Difference between what was actually paid and fair share
    // If difference > 0, Dad overpaid -> Mom owes Dad
    // If difference < 0, Dad underpaid -> Dad owes Mom
    const difference = dadPaidShared - dadFairShare;
    const transferAmount = Math.abs(difference);
    const payerOwes = difference > 0 ? 'mom' : difference < 0 ? 'dad' : 'balanced';

    return {
      dadPaidShared,
      momPaidShared,
      totalShared,
      totalSalary,
      safeDadSalary,
      safeMomSalary,
      dadRatio,
      momRatio,
      dadRatioPct: (dadRatio * 100).toFixed(1),
      momRatioPct: (momRatio * 100).toFixed(1),
      dadFairShare,
      momFairShare,
      jointPaidTotal,
      dadPersonalGift,
      momPersonalGift,
      payerOwes,
      transferAmount,
      difference,
    };
  }, [transactions, selectedMonth, dadInput, momInput, settlementMode]);

  // Simulator Calculation (For user's example e.g. 8000 expense verification)
  const simResult = useMemo(() => {
    const totalSalary = (dadInput || 0) + (momInput || 0);
    const dadRatio = totalSalary > 0 ? (dadInput || 0) / totalSalary : 0.5;
    const momRatio = totalSalary > 0 ? (momInput || 0) / totalSalary : 0.5;

    const dadFairShare = Math.round(simTotalExpense * dadRatio);
    const momFairShare = simTotalExpense - dadFairShare;

    const diff = simDadPaid - dadFairShare;
    const transferAmount = Math.abs(diff);
    const debtor = diff > 0 ? 'mom' : diff < 0 ? 'dad' : 'balanced';

    return {
      totalSalary,
      dadRatio,
      momRatio,
      dadRatioPct: (dadRatio * 100).toFixed(1),
      momRatioPct: (momRatio * 100).toFixed(1),
      dadFairShare,
      momFairShare,
      transferAmount,
      debtor,
    };
  }, [simTotalExpense, simDadPaid, simMomPaid, dadInput, momInput]);

  if (!isOpen) return null;

  const handleRecordSettlement = () => {
    if (settlement.transferAmount === 0) {
      alert('雙方支出已完全平衡，無需轉帳！');
      return;
    }

    const debtorName = settlement.payerOwes === 'mom' ? couple.momName : couple.dadName;
    const creditorName = settlement.payerOwes === 'mom' ? couple.dadName : couple.momName;

    const formulaDescription =
      settlementMode === 'salary_ratio'
        ? `依 ${selectedMonth} 當月薪資佔比（${couple.dadName} ${settlement.dadRatioPct}% : ${couple.momName} ${settlement.momRatioPct}%）平攤`
        : '依各半 50/50 平均平攤';

    addTransaction({
      type: 'income',
      category: 'other_income',
      title: `夫妻月底平帳：${debtorName} 轉給 ${creditorName}`,
      amount: settlement.transferAmount,
      date: new Date().toISOString().slice(0, 10),
      paidBy: settlement.payerOwes === 'mom' ? 'mom' : 'dad',
      recordedBy: couple.currentRole,
      splitMethod: 'paid_in_full',
      note: `${selectedMonth === 'all' ? '全期間' : selectedMonth} 月度育兒開銷平帳（${formulaDescription}，共同代墊總額 $${settlement.totalShared.toLocaleString()}）`,
      tags: ['平帳結算', '夫妻對帳', settlementMode === 'salary_ratio' ? '薪水比例分攤' : '均分50/50'],
    });

    onClose();
  };

  // List of recorded historical months for table view
  const recordedMonthsList = useMemo(() => {
    const map = couple.monthlySalaries || {};
    const months = Object.keys(map).sort().reverse();
    return months.map(m => map[m]);
  }, [couple.monthlySalaries]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-5 sm:px-6 py-4 bg-stone-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">夫妻每月薪資平帳對帳</h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                每月輸入各自當月薪水，系統自動按雙方薪水比例結算平帳
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-5 flex-1">
          {/* Top Controls: Month Selector & Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-50/70 dark:bg-slate-950/60 border border-stone-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-600 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>對帳月份</span>
              </span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-stone-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSettlementMode('salary_ratio')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  settlementMode === 'salary_ratio'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                依薪水比例 (推薦)
              </button>
              <button
                type="button"
                onClick={() => setSettlementMode('split_50_50')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  settlementMode === 'split_50_50'
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                夫妻各半 (50/50)
              </button>
            </div>
          </div>

          {/* Monthly Salary Input & Registration Panel (Core User Request) */}
          {selectedMonth !== 'all' && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/40 dark:bg-amber-500/5 p-4 space-y-4">
              {/* Submission Status Alert Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-500/20 text-xs">
                <div className="flex items-center gap-2">
                  {currentRecord.dadSubmitted && currentRecord.momSubmitted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span className="font-medium text-stone-800 dark:text-slate-200">
                    {currentRecord.dadSubmitted && currentRecord.momSubmitted
                      ? `🎉 ${selectedMonth} 夫妻雙方當月薪資皆已登記完成！`
                      : currentRecord.dadSubmitted
                      ? `爸爸已登記，等待媽媽輸入 ${selectedMonth} 薪水`
                      : currentRecord.momSubmitted
                      ? `媽媽已登記，等待爸爸輸入 ${selectedMonth} 薪水`
                      : `請輸入 ${selectedMonth} 各自當月薪水，自動依比例平帳`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrevMonthSalary}
                  title="沿用上個月的薪資數值"
                  className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <Copy className="w-3 h-3" />
                  <span>沿用上月</span>
                </button>
              </div>

              {/* Role-Specific Quick Register Box */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{isDad ? couple.dadAvatar : couple.momAvatar}</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-white">
                      我是 {currentUserRoleName} · 登記我本月 ({selectedMonth}) 實領薪水
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchRole(isDad ? 'mom' : 'dad')}
                    className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white underline"
                  >
                    切換為{isDad ? cleanMomName : cleanDadName}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">
                      NT$
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={currentRoleSalaryInput}
                      onChange={e => setCurrentRoleSalaryInput(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-950 pl-10 pr-3 py-2 text-sm font-mono font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      placeholder="例如 40000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveMySalary}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors whitespace-nowrap flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存我的薪資</span>
                  </button>
                </div>
              </div>

              {/* Spouse Salaries Side-by-Side Status & Toggle Edit Both */}
              <div className="grid grid-cols-2 gap-3">
                {/* Dad Status */}
                <div
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentRecord.dadSubmitted
                      ? 'border-blue-300 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20'
                      : 'border-stone-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <span>{couple.dadAvatar || '👨🏻'}</span>
                      <span>{cleanDadName}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                      佔 {settlement.dadRatioPct}%
                    </span>
                  </div>
                  <div className="text-base font-extrabold font-mono text-stone-900 dark:text-white">
                    ${settlement.safeDadSalary.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                    {currentRecord.dadSubmitted ? '✅ 當月已確認' : '⏳ 待更新當月薪資'}
                  </div>
                </div>

                {/* Mom Status */}
                <div
                  className={`p-3 rounded-xl border text-left transition-all ${
                    currentRecord.momSubmitted
                      ? 'border-pink-300 bg-pink-50/60 dark:border-pink-900/50 dark:bg-pink-950/20'
                      : 'border-stone-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-pink-700 dark:text-pink-400 flex items-center gap-1">
                      <span>{couple.momAvatar || '👩🏻'}</span>
                      <span>{cleanMomName}</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300">
                      佔 {settlement.momRatioPct}%
                    </span>
                  </div>
                  <div className="text-base font-extrabold font-mono text-stone-900 dark:text-white">
                    ${settlement.safeMomSalary.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">
                    {currentRecord.momSubmitted ? '✅ 當月已確認' : '⏳ 待更新當月薪資'}
                  </div>
                </div>
              </div>

              {/* Dynamic Ratio Bar for Selected Month */}
              <div>
                <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400 mb-1">
                  <span>
                    {selectedMonth} 薪資加總: <strong>${settlement.totalSalary.toLocaleString()}</strong>
                  </span>
                  <span>
                    當月平帳分攤: {couple.dadName} {settlement.dadRatioPct}% ↔ {couple.momName}{' '}
                    {settlement.momRatioPct}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                  <div
                    className="bg-blue-500 transition-all duration-300"
                    style={{ width: `${settlement.dadRatio * 100}%` }}
                    title={`${couple.dadName}: ${settlement.dadRatioPct}%`}
                  />
                  <div
                    className="bg-pink-500 transition-all duration-300"
                    style={{ width: `${settlement.momRatio * 100}%` }}
                    title={`${couple.momName}: ${settlement.momRatioPct}%`}
                  />
                </div>
              </div>

              {/* Optional: Expand to edit both simultaneously */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditBoth(!showEditBoth)}
                  className="text-[11px] text-stone-500 dark:text-slate-400 hover:text-amber-700 flex items-center gap-1 underline font-medium"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{showEditBoth ? '收合雙方編輯' : '手動編輯雙方當月薪資'}</span>
                </button>

                {showEditBoth && (
                  <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-blue-700 mb-1">
                          {couple.dadName} 薪水
                        </label>
                        <input
                          type="number"
                          value={dadInput}
                          onChange={e => setDadInput(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-pink-700 mb-1">
                          {couple.momName} 薪水
                        </label>
                        <input
                          type="number"
                          value={momInput}
                          onChange={e => setMomInput(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveBothSalaries}
                      className="w-full py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold transition-colors"
                    >
                      確認並儲存 {selectedMonth} 雙方薪水
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main Settlement Recommendation Result Card */}
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-b from-amber-50/90 to-stone-50/60 dark:from-amber-500/10 dark:to-transparent p-5 text-center shadow-xs">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              {selectedMonth === 'all' ? '全期間累計' : selectedMonth} 對帳試算結果
            </span>

            {settlement.totalShared === 0 ? (
              <div className="mt-3">
                <CheckCircle2 className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <div className="text-base font-bold text-stone-900 dark:text-white">
                  尚無此月份需平攤的開銷
                </div>
                <div className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  請先在記帳頁面新增支出，並將分攤方式選為「夫妻共同平攤 (依薪資比例)」。
                </div>
              </div>
            ) : settlement.transferAmount === 0 ? (
              <div className="mt-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <div className="text-base font-bold text-stone-900 dark:text-white">收支已完全平衡</div>
                <div className="text-xs text-stone-500 dark:text-slate-400 mt-1">
                  雙方代墊金額剛好符合本月薪水比例（{settlement.dadRatioPct}% : {settlement.momRatioPct}%），無須轉帳！
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="text-xs text-stone-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-1.5">
                  <span className="text-amber-800 dark:text-amber-300 font-bold">
                    {settlement.payerOwes === 'mom' ? couple.momName : couple.dadName}
                  </span>
                  <span>需補貼轉帳給</span>
                  <span className="text-emerald-800 dark:text-emerald-400 font-bold">
                    {settlement.payerOwes === 'mom' ? couple.dadName : couple.momName}
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-700 dark:text-amber-400 my-2 tabular-nums">
                  {formatAmount(settlement.transferAmount)}
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                  補貼後，雙方對本月需平帳總額 <strong>${settlement.totalShared.toLocaleString()}</strong> 即完全達成「
                  {settlementMode === 'salary_ratio'
                    ? `當月薪水佔比 (${settlement.dadRatioPct}% : ${settlement.momRatioPct}%)`
                    : '各半 50/50'}
                  」的公平分攤！
                </p>
              </div>
            )}
          </div>

          {/* Two-Column Actual Paid & Fair Share Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* Dad's side */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-700 dark:text-blue-400 font-bold flex items-center gap-1">
                  <span>{couple.dadAvatar || '👨🏻'}</span>
                  <span>{cleanDadName}</span>
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  佔比 {settlement.dadRatioPct}%
                </span>
              </div>

              <div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400">本月代墊總額</div>
                <div className="text-lg font-bold font-mono text-stone-900 dark:text-white tabular-nums">
                  {formatAmount(settlement.dadPaidShared)}
                </div>
              </div>

              <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/30 flex justify-between text-xs">
                <span className="text-stone-500 dark:text-slate-400">應分攤金額:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-white">
                  ${settlement.dadFairShare.toLocaleString()}
                </span>
              </div>

              <div className="text-[11px] text-stone-400 dark:text-slate-500">
                個人全額禮物: ${settlement.dadPersonalGift.toLocaleString()}
              </div>
            </div>

            {/* Mom's side */}
            <div className="rounded-xl border border-pink-200 bg-pink-50/70 dark:border-pink-900/40 dark:bg-pink-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-pink-700 dark:text-pink-400 font-bold flex items-center gap-1">
                  <span>{couple.momAvatar || '👩🏻'}</span>
                  <span>{cleanMomName}</span>
                </span>
                <span className="text-[10px] bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  佔比 {settlement.momRatioPct}%
                </span>
              </div>

              <div>
                <div className="text-[11px] text-stone-500 dark:text-slate-400">本月代墊總額</div>
                <div className="text-lg font-bold font-mono text-stone-900 dark:text-white tabular-nums">
                  {formatAmount(settlement.momPaidShared)}
                </div>
              </div>

              <div className="pt-2 border-t border-pink-200/60 dark:border-pink-900/30 flex justify-between text-xs">
                <span className="text-stone-500 dark:text-slate-400">應分攤金額:</span>
                <span className="font-mono font-bold text-stone-900 dark:text-white">
                  ${settlement.momFairShare.toLocaleString()}
                </span>
              </div>

              <div className="text-[11px] text-stone-400 dark:text-slate-500">
                個人全額禮物: ${settlement.momPersonalGift.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Transparent Formula & Math Step-by-Step Card */}
          <div className="rounded-xl bg-stone-50 dark:bg-slate-950/80 p-4 border border-stone-200 dark:border-slate-800 text-xs space-y-3">
            <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>平帳計算公式與步驟拆解：</span>
            </div>

            {/* Step 1 */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800/80 space-y-1">
              <div className="font-semibold text-stone-700 dark:text-slate-300 flex items-center justify-between">
                <span>步驟 1 · 當月薪水加總與各自佔比</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  合計 ${settlement.totalSalary.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed font-mono">
                {couple.dadName} 佔比 = ${settlement.safeDadSalary.toLocaleString()} ÷ $
                {settlement.totalSalary.toLocaleString()} ={' '}
                <strong className="text-blue-600 dark:text-blue-400">{settlement.dadRatioPct}%</strong>
                <br />
                {couple.momName} 佔比 = ${settlement.safeMomSalary.toLocaleString()} ÷ $
                {settlement.totalSalary.toLocaleString()} ={' '}
                <strong className="text-pink-600 dark:text-pink-400">{settlement.momRatioPct}%</strong>
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800/80 space-y-1">
              <div className="font-semibold text-stone-700 dark:text-slate-300 flex items-center justify-between">
                <span>步驟 2 · 各自應分攤費用 (乘以平帳總額)</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  總額 ${settlement.totalShared.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed font-mono">
                {couple.dadName} 應付 = ${settlement.totalShared.toLocaleString()} × {settlement.dadRatioPct}%
                ={' '}
                <strong className="text-stone-900 dark:text-white">
                  ${settlement.dadFairShare.toLocaleString()}
                </strong>
                <br />
                {couple.momName} 應付 = ${settlement.totalShared.toLocaleString()} × {settlement.momRatioPct}%
                ={' '}
                <strong className="text-stone-900 dark:text-white">
                  ${settlement.momFairShare.toLocaleString()}
                </strong>
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-stone-200/60 dark:border-slate-800/80 space-y-1">
              <div className="font-semibold text-stone-700 dark:text-slate-300 flex items-center justify-between">
                <span>步驟 3 · 代墊差額與轉帳金額結算</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  差額結清
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                {settlement.payerOwes === 'balanced' ? (
                  '雙方代墊剛好等於應付金額，已完全平衡。'
                ) : (
                  <>
                    {settlement.payerOwes === 'mom' ? couple.dadName : couple.momName} 本月代墊超過應承擔份額，由{' '}
                    <strong className="text-amber-700 dark:text-amber-400">
                      {settlement.payerOwes === 'mom' ? couple.momName : couple.dadName}
                    </strong>{' '}
                    補貼轉帳{' '}
                    <strong className="font-mono text-stone-900 dark:text-white">
                      ${settlement.transferAmount.toLocaleString()}
                    </strong>{' '}
                    給{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400">
                      {settlement.payerOwes === 'mom' ? couple.dadName : couple.momName}
                    </strong>
                    。
                  </>
                )}
              </p>
            </div>

            {settlement.jointPaidTotal > 0 && (
              <div className="flex justify-between text-stone-500 dark:text-slate-400 pt-1 text-[11px]">
                <span>共同基金直接支付開銷 (不列入代墊平帳)：</span>
                <span className="font-mono font-semibold">${settlement.jointPaidTotal.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Historical Monthly Salaries & Ratio Overview Table */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between p-3.5 bg-stone-50/80 dark:bg-slate-950/60 hover:bg-stone-100/70 dark:hover:bg-slate-900/60 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-stone-800 dark:text-slate-200">
                  📅 歷史各月份薪水與分攤比例一覽表
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-slate-800 text-stone-600 dark:text-slate-400">
                  {recordedMonthsList.length} 個月
                </span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{showHistory ? '收合一覽' : '展開一覽'}</span>
              </span>
            </button>

            {showHistory && (
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-stone-200 dark:border-slate-800 space-y-2">
                <div className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed mb-2">
                  每個月份的薪水皆獨立保存，系統會依照該月份各自填寫的薪資即時計算平帳比例：
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-slate-800 text-[11px] text-stone-500 dark:text-slate-400">
                        <th className="py-2 px-2 font-medium">月份</th>
                        <th className="py-2 px-2 font-medium">{couple.dadName} 薪水</th>
                        <th className="py-2 px-2 font-medium">{couple.momName} 薪水</th>
                        <th className="py-2 px-2 font-medium">分攤比例</th>
                        <th className="py-2 px-2 font-medium text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-slate-800/80 font-mono">
                      {recordedMonthsList.map(rec => {
                        const tot = (rec.dadSalary || 0) + (rec.momSalary || 0);
                        const dPct = tot > 0 ? ((rec.dadSalary / tot) * 100).toFixed(1) : '50.0';
                        const mPct = tot > 0 ? ((rec.momSalary / tot) * 100).toFixed(1) : '50.0';
                        const isCurrentSelected = selectedMonth === rec.month;
                        return (
                          <tr
                            key={rec.month}
                            className={`hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                              isCurrentSelected ? 'bg-amber-50/50 dark:bg-amber-500/10 font-bold' : ''
                            }`}
                          >
                            <td className="py-2 px-2 text-stone-800 dark:text-slate-200 flex items-center gap-1 font-sans">
                              <span>{rec.month}</span>
                              {isCurrentSelected && (
                                <span className="text-[10px] text-amber-600 font-bold">●</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-blue-600 dark:text-blue-400">
                              ${rec.dadSalary.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-pink-600 dark:text-pink-400">
                              ${rec.momSalary.toLocaleString()}
                            </td>
                            <td className="py-2 px-2 text-stone-600 dark:text-slate-300 font-sans text-[11px]">
                              {dPct}% : {mPct}%
                            </td>
                            <td className="py-2 px-2 text-right font-sans">
                              <button
                                type="button"
                                onClick={() => setSelectedMonth(rec.month)}
                                className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                                  isCurrentSelected
                                    ? 'bg-amber-500 text-white font-bold'
                                    : 'text-amber-700 dark:text-amber-400 hover:bg-stone-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {isCurrentSelected ? '檢視中' : '切換'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Calculator Sandbox (User test scenario for $8,000) */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="w-full flex items-center justify-between p-3.5 bg-stone-50/80 dark:bg-slate-950/60 hover:bg-stone-100/70 dark:hover:bg-slate-900/60 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-stone-800 dark:text-slate-200">
                  🧮 自訂費用試算模擬器（驗證 $8,000 或任何開銷）
                </span>
              </div>
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                {showSimulator ? '收合試算' : '展開試算'}
              </span>
            </button>

            {showSimulator && (
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-stone-200 dark:border-slate-800 space-y-4">
                <div className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                  輸入任何想要測試的平帳金額（例如 <strong>8,000 元</strong>
                  ），系統會依當前設定的當月薪水比例（
                  {couple.dadName} {simResult.dadRatioPct}% : {couple.momName} {simResult.momRatioPct}%）即時驗算！
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1">
                      需平帳總費用 (如 8000)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={simTotalExpense}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSimTotalExpense(val);
                        // Default simulate half paid each
                        setSimDadPaid(Math.round(val / 2));
                        setSimMomPaid(val - Math.round(val / 2));
                      }}
                      className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1">
                      {couple.dadName} 代墊金額
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={simDadPaid}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSimDadPaid(val);
                        setSimMomPaid(Math.max(0, simTotalExpense - val));
                      }}
                      className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1">
                      {couple.momName} 代墊金額
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={simMomPaid}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setSimMomPaid(val);
                        setSimDadPaid(Math.max(0, simTotalExpense - val));
                      }}
                      className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Simulation Result Preview */}
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-300">
                    模擬試算結論（平帳費用 ${simTotalExpense.toLocaleString()}）：
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-blue-200/60">
                      <div className="text-blue-700 dark:text-blue-400 font-semibold">
                        {couple.dadName} (薪資 ${dadInput.toLocaleString()} · {simResult.dadRatioPct}%)
                      </div>
                      <div className="mt-0.5 font-mono">
                        應分攤: <strong>${simResult.dadFairShare.toLocaleString()}</strong>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-pink-200/60">
                      <div className="text-pink-700 dark:text-pink-400 font-semibold">
                        {couple.momName} (薪資 ${momInput.toLocaleString()} · {simResult.momRatioPct}%)
                      </div>
                      <div className="mt-0.5 font-mono">
                        應分攤: <strong>${simResult.momFairShare.toLocaleString()}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-600 dark:text-slate-400 font-medium pt-1">
                    👉 差額結算：
                    {simResult.debtor === 'balanced' ? (
                      '雙方代墊金額剛好符合分攤比例，無須轉帳。'
                    ) : (
                      <>
                        <strong>{simResult.debtor === 'mom' ? couple.momName : couple.dadName}</strong> 需轉帳{' '}
                        <strong className="text-amber-700 dark:text-amber-400 font-mono">
                          ${simResult.transferAmount.toLocaleString()}
                        </strong>{' '}
                        給{' '}
                        <strong>{simResult.debtor === 'mom' ? couple.dadName : couple.momName}</strong>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-100 dark:border-slate-800 px-5 sm:px-6 py-4 flex gap-3 bg-stone-50/70 dark:bg-slate-900/80">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:text-stone-900 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
          >
            關閉
          </button>
          {settlement.transferAmount > 0 && (
            <button
              onClick={handleRecordSettlement}
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm transition-colors flex items-center justify-center gap-1.5"
            >
              <Handshake className="w-4 h-4" />
              <span>記錄平帳轉帳 (${settlement.transferAmount.toLocaleString()})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
