import React, { useState } from 'react';
import { EyeOff, Plus, ShieldCheck } from 'lucide-react';
import { BackgroundPrivacyShield } from './components/BackgroundPrivacyShield';
import { BabyProfileModal } from './components/BabyProfileModal';
import { BudgetView } from './components/BudgetView';
import { CoupleSettlementModal } from './components/CoupleSettlementModal';
import { DashboardView } from './components/DashboardView';
import { ExportCsvModal } from './components/ExportCsvModal';
import { Navbar } from './components/Navbar';
import { PinLockScreen } from './components/PinLockScreen';
import { ReportsView } from './components/ReportsView';
import { SecurityModal } from './components/SecurityModal';
import { SettingsModal } from './components/SettingsModal';
import { ShareAndInstallModal } from './components/ShareAndInstallModal';
import { SyncAndBackupModal } from './components/SyncAndBackupModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { TransactionModal } from './components/TransactionModal';
import { AppProvider, useApp } from './context/AppContext';
import { Transaction } from './types';

const MainContent: React.FC = () => {
  const {
    toastMessage,
    couple,
    babyInfo,
    isAppLocked,
    unlockApp,
    isWindowHidden,
    restoreWindowVisibility,
    isPrivacyMode,
    togglePrivacyMode,
    updateSecuritySettings,
    showToast,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'budget' | 'reports' | 'settlement'>('dashboard');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editTargetTx, setEditTargetTx] = useState<Transaction | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncModalTab, setSyncModalTab] = useState<'sync' | 'backup' | 'family'>('sync');
  const [syncModalSubTab, setSyncModalSubTab] = useState<'gdrive' | 'cloud' | 'timemachine' | 'offline'>('gdrive');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'share' | 'privacy' | 'theme' | 'salary'>('share');

  const handleOpenSettingsModal = (tab: 'share' | 'privacy' | 'theme' | 'salary' = 'share') => {
    setSettingsDefaultTab(tab);
    setIsSettingsModalOpen(true);
  };

  const handleOpenSyncModal = (
    tab: 'sync' | 'backup' | 'family' = 'sync',
    subTab: 'gdrive' | 'cloud' | 'timemachine' | 'offline' = 'gdrive'
  ) => {
    setSyncModalTab(tab);
    setSyncModalSubTab(subTab as any);
    setIsSyncModalOpen(true);
  };

  const handleOpenNewTransaction = () => {
    setEditTargetTx(null);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditTargetTx(tx);
    setIsTxModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      {/* Top Bar following Top Bar Contract */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenSyncModal={() => handleOpenSyncModal('sync', 'gdrive')}
        onOpenSettingsModal={handleOpenSettingsModal}
        onOpenBabyModal={() => setIsBabyModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentTab === 'dashboard' && (
          <DashboardView
            onOpenNewTransaction={handleOpenNewTransaction}
            onEditTransaction={handleEditTransaction}
            onOpenBudgetModal={() => setCurrentTab('budget')}
            onOpenSettlementModal={() => setIsSettlementModalOpen(true)}
            onOpenSyncModal={handleOpenSyncModal}
            onOpenBabyModal={() => setIsBabyModalOpen(true)}
          />
        )}

        {currentTab === 'budget' && <BudgetView />}

        {currentTab === 'reports' && (
          <ReportsView onOpenCsvModal={() => setIsCsvModalOpen(true)} />
        )}

        {currentTab === 'settlement' && (
          <div className="max-w-2xl mx-auto pb-20">
            <CoupleSettlementModal
              isOpen={true}
              onClose={() => setCurrentTab('dashboard')}
            />
          </div>
        )}
      </main>

      {/* Floating Privacy Mode Indicator (Bottom Left) */}
      {isPrivacyMode && (
        <div className="fixed bottom-6 left-6 z-30 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold backdrop-blur-md shadow-sm animate-in fade-in">
          <EyeOff className="w-3.5 h-3.5" />
          <span>防窺模式保護中 (Shift+P)</span>
          <button
            type="button"
            onClick={() => handleOpenSettingsModal('privacy')}
            className="ml-1 text-[11px] underline hover:text-amber-800 dark:hover:text-amber-300"
          >
            設定
          </button>
          <span className="text-amber-300/60">·</span>
          <button
            type="button"
            onClick={togglePrivacyMode}
            className="text-[11px] underline hover:text-amber-800 dark:hover:text-amber-300"
          >
            解除
          </button>
        </div>
      )}

      {/* Mobile Floating Action Button (Thumb zone) */}
      <div className="fixed bottom-6 right-6 z-30 md:hidden">
        <button
          onClick={handleOpenNewTransaction}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 hover:bg-amber-500 text-white shadow-xl shadow-amber-600/25 active:scale-95 transition-transform"
          aria-label="新增記帳"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        defaultTab={settingsDefaultTab}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
        onOpenCsvModal={() => setIsCsvModalOpen(true)}
        onOpenSyncModal={() => handleOpenSyncModal('sync', 'gdrive')}
        onOpenSettlementModal={() => setIsSettlementModalOpen(true)}
        onOpenBabyModal={() => setIsBabyModalOpen(true)}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditTargetTx(null);
        }}
        editTarget={editTargetTx}
      />

      <SyncAndBackupModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        initialTab={syncModalTab}
        initialSubTab={syncModalSubTab}
        onOpenShareModal={() => handleOpenSettingsModal('share')}
      />

      <ShareAndInstallModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      <ExportCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      <CoupleSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
      />

      <SecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
      />

      <BabyProfileModal
        isOpen={isBabyModalOpen}
        onClose={() => setIsBabyModalOpen(false)}
      />

      {/* App PIN Lock Screen */}
      <PinLockScreen
        isLocked={isAppLocked}
        onUnlock={unlockApp}
        babyName={babyInfo.name}
        onForgotPin={() => setIsSecurityModalOpen(true)}
      />

      {/* Background Tab Switch Privacy Shield */}
      <BackgroundPrivacyShield
        isVisible={isWindowHidden}
        onRestore={restoreWindowVisibility}
        onDisableAutoShield={() => {
          updateSecuritySettings({ isBackgroundBlurEnabled: false });
          restoreWindowVisibility();
          showToast('已關閉分頁切換自動遮蔽！可隨時至「設定 ➔ 防窺模式」手動開啟。');
        }}
      />

      {/* Floating Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-stone-900/95 dark:bg-white/95 border border-stone-800 dark:border-stone-200 px-4 py-2.5 text-xs font-semibold text-white dark:text-stone-900 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
