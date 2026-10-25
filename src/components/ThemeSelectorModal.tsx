import React from 'react';
import { Check, Moon, Palette, Sun, X } from 'lucide-react';
import { THEMES } from '../constants/themes';
import { useApp } from '../context/AppContext';
import { ThemeId } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { themeId, setThemeId, themeMode, setThemeMode } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-stone-900 dark:text-white">主題風格與質感色系</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* Quick Dark / Light Switch */}
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/80 p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-white">介面明暗基調切換 (手動模式)</div>
              <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                切換後永久儲存，不會因系統或時間變更自動跑掉
              </div>
            </div>

            <div className="flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-stone-200 dark:border-slate-800 shadow-xs">
              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>質感亮色</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-slate-800 text-amber-400 shadow-xs'
                    : 'text-stone-600 dark:text-slate-400 hover:text-stone-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>夜間深色</span>
              </button>
            </div>
          </div>

          {/* Preset Theme Selection */}
          <div>
            <div className="text-xs font-semibold text-stone-600 dark:text-slate-400 mb-3">
              精選育兒與金融質感主題色系
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(THEMES) as ThemeId[]).map(id => {
                const t = THEMES[id];
                const isSelected = themeId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-500 shadow-xs'
                        : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-stone-300 hover:bg-stone-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900 dark:text-white">{t.name}</span>
                        {!t.isDarkDefault ? (
                          <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                            亮色系
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-stone-600 dark:text-slate-300 bg-stone-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            暗色系
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                    </div>

                    <div className="text-[11px] text-stone-500 dark:text-slate-400 mb-3">{t.accentName}</div>

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1.5 mt-auto">
                      <div
                        className="h-5 w-7 rounded-md border border-stone-300 dark:border-slate-700 shadow-2xs"
                        style={{ backgroundColor: t.colors.bg }}
                        title="背景底色"
                      />
                      <div
                        className="h-5 w-7 rounded-md border border-stone-300 dark:border-slate-700 shadow-2xs"
                        style={{ backgroundColor: t.colors.card }}
                        title="卡片面色"
                      />
                      <div
                        className="h-5 w-7 rounded-md shadow-2xs"
                        style={{ backgroundColor: t.colors.primary }}
                        title="主強調色"
                      />
                      <div
                        className="h-5 w-7 rounded-md shadow-2xs"
                        style={{ backgroundColor: t.colors.accent }}
                        title="輔助點綴色"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-slate-800 px-6 py-3.5 flex justify-end bg-stone-50/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm transition-colors"
          >
            套用並儲存
          </button>
        </div>
      </div>
    </div>
  );
};
