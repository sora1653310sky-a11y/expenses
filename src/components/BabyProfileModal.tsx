import React, { useState, useEffect } from 'react';
import { X, Baby, Calendar, Heart, Sparkles, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BabyInfo } from '../types';

interface BabyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = ['👶🏻', '👶', '👧🏻', '🧒🏻', '🐣', '🧸', '🍼', '✨'];

export const BabyProfileModal: React.FC<BabyProfileModalProps> = ({ isOpen, onClose }) => {
  const { babyInfo, updateBabyInfo, showToast } = useApp();

  const [name, setName] = useState(babyInfo.name || '');
  const [birthDate, setBirthDate] = useState(babyInfo.birthDate || '');
  const [gender, setGender] = useState<'boy' | 'girl' | 'unspecified'>(
    babyInfo.gender || 'unspecified'
  );
  const [avatar, setAvatar] = useState(babyInfo.avatar || '👶🏻');

  useEffect(() => {
    if (isOpen) {
      setName(babyInfo.name || '');
      setBirthDate(babyInfo.birthDate || '');
      setGender(babyInfo.gender || 'unspecified');
      setAvatar(babyInfo.avatar || '👶🏻');
    }
  }, [isOpen, babyInfo]);

  if (!isOpen) return null;

  // Calculate preview age
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const now = new Date();
    const diffMonths =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    if (diffMonths < 0) return '尚未出生 (預產期)';
    if (diffMonths === 0) return '剛出生未滿月';
    if (diffMonths < 12) return `${diffMonths} 個月大`;
    const years = Math.floor(diffMonths / 12);
    const rem = diffMonths % 12;
    return rem > 0 ? `${years} 歲 ${rem} 個月大` : `${years} 歲大`;
  };

  const agePreview = calculateAge(birthDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('請輸入寶寶的名稱或暱稱！');
      return;
    }

    const updated: BabyInfo = {
      name: trimmedName,
      birthDate,
      gender,
      avatar,
    };

    updateBabyInfo(updated);
    showToast(`已成功修改寶寶名稱為「${trimmedName}」！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-lg shadow-xs">
              {avatar}
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                修改寶寶名稱與檔案
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                自訂暱稱與生日，全站介面將立即同步更新
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-500/30 bg-gradient-to-r from-amber-50/80 to-stone-50/50 dark:from-amber-500/10 dark:to-transparent flex items-center gap-3 shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 text-2xl shadow-xs shrink-0">
              {avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-stone-900 dark:text-white truncate">
                  {name.trim() || '請輸入寶寶名稱'}
                </span>
                {agePreview && (
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 shrink-0">
                    {agePreview}
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                {gender === 'boy' ? '👦🏻 小王子' : gender === 'girl' ? '👧🏻 小公主' : '⭐ 寶貝'} · 萌寶成長帳本
              </div>
            </div>
          </div>

          {/* 1. Baby Name Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
              寶寶姓名 / 暱稱 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={20}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：小波波、皮皮、可樂、安安..."
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-950 px-3.5 py-2 text-sm font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              {name && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>
            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar text-[11px]">
              <span className="text-stone-400 shrink-0">快速填入:</span>
              {['小波波', '皮皮', '樂樂', '小可愛', '糖糖', '元寶'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="px-2 py-0.5 rounded-md border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800 text-stone-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-700 shrink-0 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Avatar Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
              專屬頭像表情
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {AVATAR_OPTIONS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
                    avatar === em
                      ? 'border-2 border-amber-500 bg-amber-50 dark:bg-amber-500/20 scale-105 shadow-xs'
                      : 'border border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950/60 hover:bg-stone-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Birth Date Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>出生年月日 (用於自動換算年齡與月齡)</span>
              {birthDate && <span className="text-[11px] text-amber-600 font-normal">{agePreview}</span>}
            </label>
            <div className="relative">
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700 bg-stone-50/60 dark:bg-slate-950 px-3.5 py-2 text-sm font-mono text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>

          {/* 4. Gender Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1.5">
              寶寶性別
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setGender('boy')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  gender === 'boy'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-bold'
                    : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400'
                }`}
              >
                <span>👦🏻 男孩</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('girl')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  gender === 'girl'
                    ? 'border-pink-500 bg-pink-50/80 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold'
                    : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400'
                }`}
              >
                <span>👧🏻 女孩</span>
              </button>
              <button
                type="button"
                onClick={() => setGender('unspecified')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  gender === 'unspecified'
                    ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold'
                    : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400'
                }`}
              >
                <span>⭐ 保密</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-slate-700 text-xs font-semibold text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>確認儲存</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
