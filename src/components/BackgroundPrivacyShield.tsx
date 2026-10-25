import React from 'react';
import { EyeOff, Lock, ShieldCheck, XCircle } from 'lucide-react';

interface Props {
  isVisible: boolean;
  onRestore: () => void;
  onDisableAutoShield?: () => void;
}

export const BackgroundPrivacyShield: React.FC<Props> = ({
  isVisible,
  onRestore,
  onDisableAutoShield,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-stone-950/85 dark:bg-slate-950/92 backdrop-blur-2xl text-white p-4 sm:p-6 select-none animate-in fade-in duration-150"
    >
      <div className="relative flex flex-col items-center max-w-md w-full text-center rounded-3xl border border-stone-700/60 dark:border-slate-800 bg-stone-900/90 dark:bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Shield Icon Badge */}
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg">
          <ShieldCheck className="w-8 h-8" />
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-600 text-white shadow-md">
            <Lock className="w-3 h-3" />
          </div>
        </div>

        <div className="flex flex-col items-center leading-tight mb-2 select-none">
          <div className="flex items-center gap-1.5 text-xl sm:text-2xl font-extrabold tracking-widest">
            <span className="text-white">萌寶</span>
            <span className="text-amber-400">記帳</span>
          </div>
          <span className="text-xs text-stone-400 mt-1">分頁離開隱私遮罩</span>
        </div>
        <p className="text-xs text-stone-300 dark:text-slate-300 leading-relaxed mb-6">
          系統偵測到您切換至其他分頁或 App，已為您遮蔽家庭收支數字。若此自動防窺功能在日常操作中造成困擾，您可在此一鍵手動關閉。
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={onRestore}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            點擊解除遮蔽 (繼續使用)
          </button>

          {onDisableAutoShield && (
            <button
              type="button"
              onClick={onDisableAutoShield}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl border border-stone-600 dark:border-slate-700 bg-stone-800/80 hover:bg-stone-700/80 text-stone-200 text-xs font-medium transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              <span>永久關閉自動遮蔽</span>
            </button>
          )}
        </div>

        {/* Helpful Tip */}
        <div className="mt-5 pt-4 border-t border-stone-800 dark:border-slate-800 text-[11px] text-stone-400 dark:text-slate-400 leading-relaxed">
          💡 關閉後切換分頁將不再跳出此畫面，您仍可隨時於<strong>「設定 ➔ 防窺模式」</strong>手動開啟或設定延遲 1~3 分鐘。
        </div>
      </div>
    </div>
  );
};
