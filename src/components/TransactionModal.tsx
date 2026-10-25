import React, { useEffect, useState } from 'react';
import { Calendar, FileText, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';
import { CategoryInfo, CategoryKey, MemberRole, SplitMethod, Transaction, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: Transaction | null;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, editTarget }) => {
  const { addTransaction, updateTransaction, deleteTransaction, couple } = useApp();

  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<CategoryKey>('nursing');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState<MemberRole>('dad');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('split_50_50');
  const [note, setNote] = useState<string>('');
  const [tagInput, setTagInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (editTarget) {
      setType(editTarget.type);
      setCategory(editTarget.category);
      setAmount(String(editTarget.amount));
      setTitle(editTarget.title);
      setDate(editTarget.date);
      setPaidBy(editTarget.paidBy);
      setSplitMethod(editTarget.splitMethod);
      setNote(editTarget.note || '');
      setTags(editTarget.tags || []);
    } else {
      setType('expense');
      setCategory('nursing');
      setAmount('');
      setTitle('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaidBy(couple.currentRole);
      setSplitMethod('split_50_50');
      setNote('');
      setTags([]);
    }
  }, [editTarget, isOpen, couple.currentRole]);

  if (!isOpen) return null;

  const currentCategories: Record<string, CategoryInfo> = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const activeCategoryInfo: CategoryInfo | undefined = currentCategories[category] || Object.values(currentCategories)[0];

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense') {
      setCategory('nursing');
      setSplitMethod('split_50_50');
    } else {
      setCategory('subsidy');
      setSplitMethod('joint_fund');
    }
  };

  const handleSelectPreset = (presetTitle: string) => {
    setTitle(presetTitle);
  };

  const handleAddAmount = (add: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + add));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('請輸入有效金額！');
      return;
    }
    if (!title.trim()) {
      alert('請輸入項目名稱！');
      return;
    }

    if (editTarget) {
      updateTransaction(editTarget.id, {
        type,
        category,
        title: title.trim(),
        amount: numAmount,
        date,
        paidBy,
        splitMethod,
        note: note.trim(),
        tags,
      });
    } else {
      addTransaction({
        type,
        category,
        title: title.trim(),
        amount: numAmount,
        date,
        paidBy,
        recordedBy: couple.currentRole,
        splitMethod,
        note: note.trim(),
        tags,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              {editTarget ? '編輯寶寶帳務' : '記一筆寶寶收支'}
            </h2>
            <span className="text-xs text-stone-500 dark:text-slate-400">
              · 由 {couple.currentRole === 'dad' ? couple.dadName : couple.momName} 記錄
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {/* 1. Transaction Type Toggle (Segmented control) */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 dark:bg-slate-950 p-1 border border-stone-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-amber-500 text-stone-900 dark:text-slate-950 shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              支出記錄 (Expense)
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
              }`}
            >
              收入 / 補助 (Income)
            </button>
          </div>

          {/* 2. Amount Input with Quick Add Buttons */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5">
              金額 (NT$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-lg">
                $
              </span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 py-3 pl-9 pr-4 text-2xl font-bold tracking-tight text-stone-900 dark:text-white placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono tabular-nums transition-colors"
                autoFocus={!editTarget}
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[100, 500, 1000, 2000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddAmount(val)}
                  className="rounded-lg bg-stone-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="rounded-lg bg-stone-100/70 dark:bg-slate-800 px-2 py-1 text-xs text-stone-600 dark:text-slate-300 hover:text-stone-800 dark:hover:text-white transition-colors cursor-pointer"
              >
                清除
              </button>
            </div>
          </div>

          {/* 3. Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-600 dark:text-slate-400">
                {type === 'expense' ? '支出分類' : '收入分類'}
              </label>
              {activeCategoryInfo && (
                <span className="text-[11px] text-stone-500 dark:text-slate-400">
                  {activeCategoryInfo.description}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.values(currentCategories).map(cat => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-amber-950 dark:text-white shadow-xs ring-1 ring-amber-500'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 text-stone-600 dark:text-slate-400 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg mb-1.5 transition-transform"
                      style={{
                        backgroundColor: isSelected ? cat.color : cat.bgLight,
                        color: isSelected ? '#ffffff' : cat.color,
                      }}
                    >
                      <CategoryIcon category={cat.key} className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium truncate w-full">{cat.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Presets Suggestions for Quick Fill */}
            {activeCategoryInfo && activeCategoryInfo.presets.length > 0 && (
              <div className="mt-2.5">
                <span className="text-[11px] text-stone-500 dark:text-slate-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" /> 常見項目推薦：
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeCategoryInfo.presets.map((preset: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="rounded-md bg-stone-100 dark:bg-slate-800/80 px-2 py-0.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 dark:border-slate-700/60 transition-colors truncate max-w-[200px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Title Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5">
              項目摘要 / 品名
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例如：日本明治配方奶粉、公托月費、口服疫苗"
              className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
          </div>

          {/* 5. Date & Payer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> 記帳日期
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:bg-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Paid By */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5">
                實際付款人 / 入帳戶
              </label>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-stone-100 dark:bg-slate-950 p-1 border border-stone-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaidBy('dad')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors truncate ${
                    paidBy === 'dad' ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  }`}
                >
                  {couple.dadAvatar} 爸爸
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('mom')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors truncate ${
                    paidBy === 'mom' ? 'bg-pink-600 text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  }`}
                >
                  {couple.momAvatar} 媽媽
                </button>
                <button
                  type="button"
                  onClick={() => setPaidBy('joint')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors truncate ${
                    paidBy === 'joint' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                  }`}
                >
                  🏠 共同戶
                </button>
              </div>
            </div>
          </div>

          {/* 6. Split Method (For couple settlement) */}
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5">
                夫妻分攤方式 (用於月底平帳對帳)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMethod('split_50_50')}
                  className={`p-2 rounded-xl border text-xs text-left transition-all ${
                    splitMethod === 'split_50_50'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-stone-900 dark:text-white font-semibold'
                      : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-semibold text-stone-900 dark:text-white">夫妻共同平攤 (依薪資比例)</div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">一人代墊，月底依薪水比例結算</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMethod('paid_in_full')}
                  className={`p-2 rounded-xl border text-xs text-left transition-all ${
                    splitMethod === 'paid_in_full'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-stone-900 dark:text-white font-semibold'
                      : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-semibold text-stone-900 dark:text-white">付款人全額 (100%)</div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">送給寶寶的個人禮物</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitMethod('joint_fund')}
                  className={`p-2 rounded-xl border text-xs text-left transition-all ${
                    splitMethod === 'joint_fund'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-stone-900 dark:text-white font-semibold'
                      : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400 hover:bg-stone-50'
                  }`}
                >
                  <div className="font-semibold text-stone-900 dark:text-white">共同育兒基金</div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-400 mt-0.5">由共有儲蓄帳戶扣款</div>
                </button>
              </div>
            </div>
          )}

          {/* 7. Tags & Note */}
          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" /> 備註說明
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="例如：好市多特價囤貨、已扣健保補助、下月續訂等"
              className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3.5 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-stone-400" /> 自訂標籤 (選填)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="輸入標籤後點新增 (如：囤貨、自費)"
                className="flex-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:bg-white focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-700 dark:text-slate-300 hover:bg-stone-200"
              >
                新增
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-xs font-medium text-stone-700 dark:text-slate-300 border border-stone-200"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            {editTarget && (
              <button
                type="button"
                onClick={() => {
                  deleteTransaction(editTarget.id);
                  onClose();
                }}
                title="刪除此筆記錄"
                className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-colors shadow-sm cursor-pointer"
            >
              {editTarget ? '儲存修改' : '確認記帳'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
