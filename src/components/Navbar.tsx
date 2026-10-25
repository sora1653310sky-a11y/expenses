import React from 'react';
import {
  Cloud,
  CloudOff,
  Lock,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NavbarProps {
  currentTab: 'dashboard' | 'budget' | 'reports' | 'settlement';
  setCurrentTab: (tab: 'dashboard' | 'budget' | 'reports' | 'settlement') => void;
  onOpenNewTransaction: () => void;
  onOpenSyncModal: () => void;
  onOpenSettingsModal: (tab?: 'share' | 'privacy' | 'theme' | 'salary') => void;
  onOpenBabyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenNewTransaction,
  onOpenSyncModal,
  onOpenSettingsModal,
  onOpenBabyModal,
}) => {
  const {
    couple,
    switchRole,
    syncState,
    babyInfo,
    isPrivacyMode,
    lockApp,
    securitySettings,
    maskBabyName,
    themeMode,
    toggleThemeMode,
  } = useApp();

  const isDad = couple.currentRole === 'dad';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/85 backdrop-blur-md transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 text-left hover:opacity-90 transition-opacity"
            title="回到收支總覽"
          >
            <span className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-lg sm:text-2xl shadow-sm shrink-0">
              🍼
            </span>
            <div className="flex flex-col justify-center select-none text-left leading-none py-0.5">
              <span className="font-extrabold text-stone-900 dark:text-white tracking-wider text-xs sm:text-base leading-none">
                萌寶
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 tracking-wider text-[11px] sm:text-sm leading-none mt-1">
                記帳
              </span>
            </div>
          </button>

          {babyInfo.name && (
            <button
              type="button"
              onClick={onOpenBabyModal}
              title="點擊修改寶寶名稱與資料"
              className="hidden lg:flex items-center gap-1.5 text-xs text-stone-500 dark:text-slate-400 border-l border-stone-200 dark:border-slate-800 pl-3 hover:text-amber-600 dark:hover:text-amber-400 transition-colors group cursor-pointer"
            >
              <span>{maskBabyName(babyInfo.name)} 的成長帳本</span>
              <span className="p-0.5 rounded text-stone-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                <Pencil className="w-3 h-3" />
              </span>
            </button>
          )}
        </div>

        {/* Zone 2: Navigation Links (Clean single-line tabs) */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-stone-100/90 dark:bg-slate-900/90 p-1 border border-stone-200/80 dark:border-slate-800">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-850'
            }`}
          >
            收支總覽
          </button>
          <button
            onClick={() => setCurrentTab('budget')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              currentTab === 'budget'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-850'
            }`}
          >
            預算分析
          </button>
          <button
            onClick={() => setCurrentTab('reports')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              currentTab === 'reports'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-850'
            }`}
          >
            財務圖表
          </button>
          <button
            onClick={() => setCurrentTab('settlement')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
              currentTab === 'settlement'
                ? 'bg-white dark:bg-slate-800 text-stone-900 dark:text-white shadow-sm'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-850'
            }`}
          >
            夫妻平帳
          </button>
        </nav>

        {/* Zone 3: Actions (Role Switcher, Sync Indicator, Settings Button, +記帳) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Couple Role Quick Switcher */}
          <div className="flex items-center rounded-xl bg-stone-100/90 dark:bg-slate-900 p-0.5 border border-stone-200/80 dark:border-slate-800 shrink-0">
            <button
              onClick={() => switchRole('dad')}
              title="切換至爸爸記帳視角"
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                isDad
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{couple.dadAvatar || '👨🏻'}</span>
              <span className="hidden sm:inline font-semibold">
                {couple.dadName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '爸爸'}
              </span>
            </button>
            <button
              onClick={() => switchRole('mom')}
              title="切換至媽媽記帳視角"
              className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                !isDad
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200'
              }`}
            >
              <span>{couple.momAvatar || '👩🏻'}</span>
              <span className="hidden sm:inline font-semibold">
                {couple.momName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim() || '媽媽'}
              </span>
            </button>
          </div>

          {/* Cloud Sync Status button */}
          <button
            onClick={onOpenSyncModal}
            title={
              syncState.roomId
                ? `家庭房間 ${syncState.roomId} · 點擊查看同步與備份`
                : '未連接房間 · 點擊設定夫妻同步'
            }
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 px-1.5 sm:px-2.5 py-1.5 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-850 shadow-sm transition-colors shrink-0 max-w-[85px] sm:max-w-none"
          >
            {syncState.status === 'syncing' ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
            ) : syncState.roomId ? (
              <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <CloudOff className="h-3.5 w-3.5 text-stone-400 dark:text-slate-500 shrink-0" />
            )}
            <span className="font-mono font-bold text-[11px] sm:text-xs text-stone-700 dark:text-slate-300 truncate">
              {syncState.roomId || '未同步'}
            </span>
          </button>

          {/* Unified Settings Button (桌面捷徑、公眾防窺、更換主題顏色) */}
          <button
            onClick={() => onOpenSettingsModal('share')}
            title="系統與介面設定"
            className={`relative flex h-9 items-center justify-center gap-1.5 px-2 sm:px-2.5 rounded-xl border transition-all text-xs font-semibold shrink-0 ${
              isPrivacyMode
                ? 'border-amber-400/80 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 shadow-xs'
                : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-850 shadow-sm'
            }`}
          >
            <Settings className="h-4 w-4 text-stone-600 dark:text-slate-300" />
            <span className="hidden sm:inline">設定</span>
            {/* Status indicator badges */}
            {isPrivacyMode && (
              <span
                className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"
                title="防窺模式開啟中"
              />
            )}
            {!isPrivacyMode && securitySettings.isAppLockEnabled && (
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                title="安全保護中"
              />
            )}
          </button>

          {/* Manual Day / Night Mode Toggle - hidden on mobile to avoid overflow */}
          <button
            type="button"
            onClick={toggleThemeMode}
            title={themeMode === 'dark' ? '手動切換至日間亮色模式' : '手動切換至夜間深色模式'}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-stone-700 dark:text-amber-400 hover:bg-stone-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer"
          >
            {themeMode === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Quick Instant Lock CTA if PIN is configured */}
          {securitySettings.isAppLockEnabled && (
            <button
              onClick={lockApp}
              title="立即鎖定 App 螢幕"
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-850 shadow-sm transition-colors"
            >
              <Lock className="h-3.5 w-3.5 text-stone-500" />
            </button>
          )}

          {/* Add Transaction CTA - hidden on mobile (handled by thumb-zone FAB) */}
          <button
            onClick={onOpenNewTransaction}
            className="hidden sm:flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3 sm:px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all whitespace-nowrap active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>記一筆</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Sub-navigation bar */}
      <div className="flex md:hidden border-t border-stone-200/80 dark:border-slate-850 bg-white/95 dark:bg-slate-950 px-2 py-1 justify-around items-center">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'dashboard'
              ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-slate-900'
              : 'text-stone-500 dark:text-slate-400'
          }`}
        >
          收支總覽
        </button>
        <button
          onClick={() => setCurrentTab('budget')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'budget'
              ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-slate-900'
              : 'text-stone-500 dark:text-slate-400'
          }`}
        >
          預算分析
        </button>
        <button
          onClick={() => setCurrentTab('reports')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'reports'
              ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-slate-900'
              : 'text-stone-500 dark:text-slate-400'
          }`}
        >
          財務圖表
        </button>
        <button
          onClick={() => setCurrentTab('settlement')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            currentTab === 'settlement'
              ? 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-slate-900'
              : 'text-stone-500 dark:text-slate-400'
          }`}
        >
          夫妻平帳
        </button>
        <button
          onClick={() => onOpenSettingsModal('share')}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-stone-600 dark:text-slate-400 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-slate-900 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>設定</span>
        </button>
      </div>
    </header>
  );
};
