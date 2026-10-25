import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, Filter, X } from 'lucide-react';
import { ALL_CATEGORIES } from '../constants/categories';
import { useApp } from '../context/AppContext';
import { exportTransactionsToCsv, formatPayerName } from '../utils/exportCsv';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportCsvModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { transactions, couple, babyInfo, showToast } = useApp();

  const [dateFilter, setDateFilter] = useState<'all' | 'thisMonth' | 'lastMonth' | 'year' | 'custom'>('thisMonth');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [maskSensitiveNotes, setMaskSensitiveNotes] = useState(false);
  const [anonymousNames, setAnonymousNames] = useState(false);

  const now = useMemo(() => new Date(), []);
  const realCurrentMonth = useMemo(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, [now]);
  const lastMonthDate = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
  const realLastMonth = useMemo(() => `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`, [lastMonthDate]);
  const realCurrentYear = useMemo(() => `${now.getFullYear()}`, [now]);

  const [csvStartDate, setCsvStartDate] = useState<string>(() => `${realCurrentMonth}-01`);
  const [csvEndDate, setCsvEndDate] = useState<string>(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);

  const filteredData = useMemo(() => {
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (dateFilter === 'thisMonth' && !t.date.startsWith(realCurrentMonth)) return false;
      if (dateFilter === 'lastMonth' && !t.date.startsWith(realLastMonth)) return false;
      if (dateFilter === 'year' && !t.date.startsWith(realCurrentYear)) return false;
      if (dateFilter === 'custom') {
        if (csvStartDate && csvEndDate) {
          return t.date >= csvStartDate && t.date <= csvEndDate;
        } else if (csvStartDate) {
          return t.date >= csvStartDate;
        } else if (csvEndDate) {
          return t.date <= csvEndDate;
        }
      }
      return true;
    });
  }, [transactions, dateFilter, typeFilter, realCurrentMonth, realLastMonth, realCurrentYear, csvStartDate, csvEndDate]);

  if (!isOpen) return null;

  const totalAmount = filteredData.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0);

  const handleDownload = () => {
    if (filteredData.length === 0) {
      alert('所選條件下無任何交易數據可匯出！');
      return;
    }
    const prefix = `${anonymousNames ? '寶寶' : babyInfo.name || '寶寶'}_收支對帳報表`;
    exportTransactionsToCsv(filteredData, couple, prefix, { maskSensitiveNotes, anonymousNames });
    showToast(`成功匯出 ${filteredData.length} 筆收支數據為 CSV！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-white">匯出 CSV 財務對帳數據</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <p className="text-xs text-stone-500 dark:text-slate-300 leading-relaxed">
            系統會自動為 CSV 檔案加入 UTF-8 BOM 編碼標籤，能無縫相容 Microsoft Excel、Apple Numbers
            及 Google 試算表，繁體中文字元絕不亂碼。
          </p>

          {/* Filter options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" /> 匯出期間範圍
              </label>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="thisMonth">當月資料 ({realCurrentMonth.replace('-', '年')}月)</option>
                <option value="lastMonth">上月份資料 ({realLastMonth.replace('-', '年')}月)</option>
                <option value="year">本年度累計 ({realCurrentYear}年度)</option>
                <option value="all">所有歷史收支</option>
                <option value="custom">自訂日期區間...</option>
              </select>

              {dateFilter === 'custom' && (
                <div className="mt-2.5 p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/90 dark:bg-slate-950/80 space-y-1.5 animate-in fade-in">
                  <span className="text-[11px] font-medium text-stone-600 dark:text-slate-300 block">自訂匯出區間：</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={csvStartDate}
                      onChange={e => setCsvStartDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-stone-900 dark:text-white"
                    />
                    <span className="text-stone-400 text-xs">至</span>
                    <input
                      type="date"
                      value={csvEndDate}
                      onChange={e => setCsvEndDate(e.target.value)}
                      className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-stone-900 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-stone-400" /> 收支類別篩選
              </label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/80 dark:bg-slate-950 px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
              >
                <option value="all">全部收支項目</option>
                <option value="expense">僅支出 (哺育/醫療/托育/日常等)</option>
                <option value="income">僅收入 (補助/理賠/紅包等)</option>
              </select>
            </div>
          </div>

          {/* Privacy & Anti-Leakage Options */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 p-3.5 space-y-2">
            <span className="text-xs font-bold text-stone-800 dark:text-slate-300 block">
              🛡️ 隱私防外洩脫敏設定 (可選)
            </span>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={maskSensitiveNotes}
                  onChange={e => setMaskSensitiveNotes(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span>隱藏敏感交易備註 (防止特定醫療病歷、私人備註向會計或外人洩露)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={anonymousNames}
                  onChange={e => setAnonymousNames(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span>家庭成員姓名匿名化 (轉換為「家長A / 家長B」，保護個資隱私)</span>
              </label>
            </div>
          </div>

          {/* Export Preview */}
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/70 p-3.5">
            <div className="flex items-center justify-between text-xs text-stone-600 dark:text-slate-400 mb-2">
              <span>
                準備匯出：<strong className="text-stone-900 dark:text-white font-mono">{filteredData.length}</strong> 筆記錄
              </span>
              <span>
                淨金額：<strong className="text-amber-700 dark:text-amber-400 font-mono">${totalAmount.toLocaleString()}</strong>
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-stone-200/80 dark:divide-slate-850 border border-stone-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
              {filteredData.slice(0, 6).map(t => {
                const cat = ALL_CATEGORIES[t.category];
                return (
                  <div key={t.id} className="p-2.5 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white truncate max-w-[220px]">{t.title}</div>
                      <div className="text-stone-500 dark:text-slate-300 mt-0.5">
                        {t.date} · {cat?.name} · {formatPayerName(t.paidBy, couple)}
                      </div>
                    </div>
                    <div className={`font-mono font-bold ${t.type === 'expense' ? 'text-stone-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {t.type === 'expense' ? '-' : '+'}${t.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
              {filteredData.length > 6 && (
                <div className="p-2 text-center text-[10px] text-stone-500 dark:text-slate-300 bg-stone-50 dark:bg-slate-900/50">
                  還有 {filteredData.length - 6} 筆記錄將一併匯出...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-slate-800 px-6 py-4 flex gap-3 bg-stone-50/40 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>立即下載 CSV 檔案</span>
          </button>
        </div>
      </div>
    </div>
  );
};
