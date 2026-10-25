import React, { useState } from 'react';
import {
  AlertTriangle,
  Apple,
  ArrowRight,
  Baby,
  Check,
  Chrome,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Heart,
  HelpCircle,
  Keyboard,
  Moon,
  Palette,
  QrCode,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Users,
  Wallet,
  Handshake,
  Calculator,
  X,
} from 'lucide-react';
import { THEMES } from '../constants/themes';
import { useApp } from '../context/AppContext';
import { ThemeId } from '../types';
import { generateCoupleInviteMessage, getShareableInviteUrl } from '../utils/shareUtils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'share' | 'privacy' | 'theme' | 'salary';
  onOpenSecurityModal?: () => void;
  onOpenCsvModal?: () => void;
  onOpenSyncModal?: () => void;
  onOpenSettlementModal?: () => void;
  onOpenBabyModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'share',
  onOpenSecurityModal,
  onOpenCsvModal,
  onOpenSyncModal,
  onOpenSettlementModal,
  onOpenBabyModal,
}) => {
  const {
    syncState,
    babyInfo,
    showToast,
    isPrivacyMode,
    togglePrivacyMode,
    maskBabyName,
    themeId,
    setThemeId,
    themeMode,
    toggleThemeMode,
    securitySettings,
    couple,
    updateCouple,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'share' | 'privacy' | 'theme' | 'salary'>(defaultTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

  // Salary settings state
  const [salaryDad, setSalaryDad] = useState<number>(couple.dadSalary ?? 40000);
  const [salaryMom, setSalaryMom] = useState<number>(couple.momSalary ?? 31000);
  const [salaryMode, setSalaryMode] = useState<'salary_ratio' | 'split_50_50'>(
    couple.settlementMode ?? 'salary_ratio'
  );
  const [isSalarySaved, setIsSalarySaved] = useState(false);

  if (!isOpen) return null;

  const directInviteUrl = getShareableInviteUrl(syncState.roomId || 'BABY-8823');
  const inviteMessage = generateCoupleInviteMessage({
    roomId: syncState.roomId || 'BABY-8823',
    babyName: babyInfo.name,
    currentRole: couple.currentRole,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directInviteUrl);
    setCopiedLink(true);
    showToast('已複製夫妻專屬自動同步網址！');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInviteText = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopiedInvite(true);
    showToast('已複製 LINE 邀請訊息，可直接貼到聊天室傳給伴侶！');
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(directInviteUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header (shrink-0 so it never collapses) */}
        <div className="shrink-0 flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-4 sm:px-6 py-3.5 bg-stone-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white flex items-center gap-2 flex-wrap leading-tight">
                <span>系統與介面設定</span>
                {isPrivacyMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                    防窺生效中
                  </span>
                )}
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-slate-400 mt-0.5 leading-normal break-words">
                桌面捷徑、公眾防窺、主題色彩與夫妻薪資平帳
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="關閉設定"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation (Responsive 4-column grid, zero scrollbar overlay, no text blocked) */}
        <div className="shrink-0 border-b border-stone-200/80 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/80 px-2 sm:px-6 py-2.5">
          <div className="grid grid-cols-4 gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('share')}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'share'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/80 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-slate-800 hover:bg-stone-100/70'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">桌面捷徑</span>
              <span className="whitespace-nowrap hidden sm:inline">分享桌面捷徑</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center relative ${
                activeTab === 'privacy'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/80 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-slate-800 hover:bg-stone-100/70'
              }`}
            >
              {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
              <span className="whitespace-nowrap sm:hidden">公眾防窺</span>
              <span className="whitespace-nowrap hidden sm:inline">公眾防窺模式</span>
              {isPrivacyMode && (
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${activeTab === 'privacy' ? 'bg-white' : 'bg-amber-500'}`} />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('theme')}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'theme'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/80 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-slate-800 hover:bg-stone-100/70'
              }`}
            >
              <Palette className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">主題色彩</span>
              <span className="whitespace-nowrap hidden sm:inline">更換主題顏色</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('salary')}
              className={`flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                activeTab === 'salary'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white/80 dark:bg-slate-900/80 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white border border-stone-200/80 dark:border-slate-800 hover:bg-stone-100/70'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap sm:hidden">薪資平帳</span>
              <span className="whitespace-nowrap hidden sm:inline">夫妻薪資平帳</span>
            </button>
          </div>
        </div>

        {/* Content Area (min-h-0 allows proper scrolling without expanding outer container) */}
        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6 flex-1 min-h-0">
          {/* TAB 1: 分享與桌面捷徑 */}
          {activeTab === 'share' && (
            <div className="space-y-6">
              {/* Partner Share Card */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-gradient-to-br from-amber-500/5 to-rose-500/5 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <Heart className="w-4 h-4 fill-rose-500/20" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                        夫妻雙人即時同步邀請
                      </h3>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400">
                        家庭房間碼：<span className="font-mono font-bold text-amber-700 dark:text-amber-400">{syncState.roomId || 'BABY-8823'}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已連線
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 overflow-hidden rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs font-mono text-stone-700 dark:text-slate-300 truncate">
                      {directInviteUrl}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? '已複製' : '複製連結'}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyInviteText}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-300 transition-colors shadow-xs"
                    >
                      {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>複製 LINE 溫馨邀請訊息</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-stone-50 dark:hover:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-300 transition-colors shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      <span>{showQrCode ? '收起 QR Code' : '手機相機掃碼加入'}</span>
                    </button>
                  </div>

                  {showQrCode && (
                    <div className="mt-3 p-4 bg-white dark:bg-slate-950 rounded-xl border border-stone-200 dark:border-slate-800 flex flex-col items-center justify-center animate-in fade-in duration-200">
                      <p className="text-xs text-stone-600 dark:text-slate-400 mb-2 font-medium">
                        請另一半使用手機相機掃描下方 QR Code 即可自動加入家庭帳本：
                      </p>
                      <img
                        src={qrImageUrl}
                        alt="夫妻同步 QR Code"
                        className="w-48 h-48 rounded-lg shadow-sm border border-stone-100 dark:border-slate-800"
                      />
                      <span className="text-[11px] text-stone-400 mt-2">
                        掃描後將自動開啟網頁並綁定房間碼 {syncState.roomId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Desktop Shortcut Install Guide */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                    設為手機桌布捷徑教學 (免下載 App，如原生軟體流暢)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* iOS Guide */}
                  <div className="rounded-xl border border-stone-100 dark:border-slate-800/80 bg-stone-50/60 dark:bg-slate-900/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-white">
                      <Apple className="w-4 h-4 text-stone-700 dark:text-slate-300" />
                      <span>iPhone / iPad (Safari)</span>
                    </div>
                    <ol className="text-xs text-stone-600 dark:text-slate-400 space-y-1.5 list-decimal pl-4">
                      <li>以 Safari 開啟專屬軟體連結</li>
                      <li>點擊瀏覽器底部的「<strong>分享</strong>」圖示（方形向上箭頭）</li>
                      <li>選單往下滑動，點選「<strong>加入主畫面</strong>」</li>
                      <li>點擊右上角「<strong>新增</strong>」即完成！</li>
                    </ol>
                  </div>

                  {/* Android Guide */}
                  <div className="rounded-xl border border-stone-100 dark:border-slate-800/80 bg-stone-50/60 dark:bg-slate-900/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-white">
                      <Chrome className="w-4 h-4 text-amber-600" />
                      <span>Android 手機 (Chrome)</span>
                    </div>
                    <ol className="text-xs text-stone-600 dark:text-slate-400 space-y-1.5 list-decimal pl-4">
                      <li>以 Chrome 瀏覽器開啟專屬軟體連結</li>
                      <li>點擊右上角「<strong>⋮</strong>」功能選單</li>
                      <li>點選「<strong>安裝應用程式</strong>」或「<strong>新增至主螢幕</strong>」</li>
                      <li>點選確認即可在手機桌面找到 App 圖示！</li>
                    </ol>
                  </div>
                </div>

                <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-amber-800 dark:text-amber-300 text-xs">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    加到桌布後點擊圖示，將以<strong>純淨全螢幕</strong>模式啟動，沒有多餘的網址列，記帳更加快速順暢！
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 公眾防窺模式 */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Privacy Mode Main Switch Card */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                        isPrivacyMode
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                          : 'bg-white dark:bg-slate-900 text-stone-600 dark:text-slate-400 border-stone-200 dark:border-slate-800'
                      }`}
                    >
                      {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                        <span>公眾防窺遮罩模式</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isPrivacyMode
                              ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                              : 'bg-stone-100 dark:bg-slate-800 text-stone-500 dark:text-slate-400 border-stone-200 dark:border-slate-700'
                          }`}
                        >
                          {isPrivacyMode ? '保護中 · 金額隱藏' : '已關閉 · 正常顯示'}
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                        公共場合隱蔽收支數字與寶寶全名，防範旁人視線肩窺
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={togglePrivacyMode}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPrivacyMode ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isPrivacyMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Visual Demonstration Comparison Card */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5">
                <div className="text-xs font-bold text-stone-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>防窺效果即時模擬比對</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Normal Display Card */}
                  <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span>一般模式狀態</span>
                      <span className="text-[10px] bg-stone-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-stone-600 dark:text-slate-400">完整可見</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-lg p-2.5 border border-stone-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-500">寶寶姓名</span>
                        <span className="font-semibold text-stone-800 dark:text-slate-200">
                          {babyInfo.name || '小寶貝'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">本月開銷</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">$18,650</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">單筆奶粉</span>
                        <span className="font-mono font-bold text-stone-800 dark:text-slate-200">$1,280</span>
                      </div>
                    </div>
                  </div>

                  {/* Masked Display Card */}
                  <div className="rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-500/5 dark:bg-amber-500/10 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-medium">
                      <span className="flex items-center gap-1">
                        <EyeOff className="w-3.5 h-3.5" />
                        防窺遮罩狀態
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">星號隱蔽</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 rounded-lg p-2.5 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-stone-500">寶寶姓名</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {maskBabyName(babyInfo.name || '小寶貝')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">本月開銷</span>
                        <span className="font-bold text-amber-700 dark:text-amber-400 font-mono tracking-widest">$••••</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">單筆奶粉</span>
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 tracking-widest">$••••</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Convenience & Privacy Tips */}
              <div className="space-y-2.5 text-xs text-stone-600 dark:text-slate-400">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800">
                  <Keyboard className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-800 dark:text-slate-200">
                      快速切換快捷鍵：
                    </span>
                    <span>
                      在任何畫面隨時按下電腦鍵盤上的 <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-slate-800 rounded font-mono font-semibold text-stone-800 dark:text-stone-200">Shift + P</kbd>，即可一秒快速切換防窺狀態。
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-stone-50 dark:bg-slate-900 border border-stone-200/80 dark:border-slate-800">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-800 dark:text-slate-200">
                      智慧分頁離開防護：
                    </span>
                    <span>
                      當您切換至其他網頁或手機跳出應用時，系統會自動啟動背景遮罩保護，防止被身邊旁人無意看見。
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 更換介面主題顏色 */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Quick Dark / Light Switch */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-white">介面明暗基調切換</div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                    清爽柔和高對比亮色，或溫潤護眼的夜間深色模式
                  </div>
                </div>

                <div className="flex rounded-xl bg-white dark:bg-slate-900 p-1 border border-stone-200 dark:border-slate-800 shadow-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (themeMode !== 'light') toggleThemeMode();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                    onClick={() => {
                      if (themeMode !== 'dark') toggleThemeMode();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                <div className="text-xs font-semibold text-stone-600 dark:text-slate-400 mb-3 flex items-center justify-between">
                  <span>精選 6 款育兒與家庭質感色系</span>
                  <span className="text-[11px] text-stone-400">點擊卡片即時套用</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(THEMES) as ThemeId[]).map(id => {
                    const t = THEMES[id];
                    const isSelected = themeId === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setThemeId(id);
                          showToast(`已切換為「${t.name}」主題`);
                        }}
                        className={`flex flex-col p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 ring-1 ring-amber-500 shadow-xs'
                            : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 hover:border-stone-300 hover:bg-stone-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-stone-900 dark:text-white">
                              {t.name}
                            </span>
                            {t.isDarkDefault && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                深色基調
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white">
                              <Check className="h-3 w-3 stroke-[2.5]" />
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-stone-500 dark:text-slate-400 mb-3">
                          {t.accentName}
                        </div>

                        {/* Swatches preview */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-stone-100 dark:border-slate-800/80">
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: t.colors.primary }}
                            title="主強調色 (Primary)"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: t.colors.accent }}
                            title="次強調色 (Accent)"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: t.colors.card }}
                            title="卡片底色 (Card)"
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: t.colors.bg }}
                            title="背景底色 (Background)"
                          />
                          <span className="text-[10px] text-stone-400 ml-auto font-mono">
                            {isSelected ? '使用中' : '選擇'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 夫妻薪資與平帳 */}
          {activeTab === 'salary' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                      夫妻薪資比例平帳機制
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-slate-400 leading-relaxed">
                      以當月夫妻兩人的薪資佔比調整平攤費用：先計算爸爸與媽媽佔薪資總額的百分比，再各自乘以需平帳開銷總額，落實公平負擔與安心理財。
                    </p>
                  </div>
                </div>

                {/* Salary Inputs */}
                <div className="mt-4 pt-4 border-t border-stone-200/60 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dad */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <span>{couple.dadAvatar}</span>
                        <span>{couple.dadName} 每月預設薪水</span>
                      </span>
                      <span className="text-[11px] font-bold font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                        佔比{' '}
                        {salaryDad + salaryMom > 0
                          ? ((salaryDad / (salaryDad + salaryMom)) * 100).toFixed(1)
                          : '50.0'}
                        %
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">
                        NT$
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={salaryDad}
                        onChange={e => setSalaryDad(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 pl-9 pr-3 py-1.5 text-sm font-mono font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="例如 40000"
                      />
                    </div>
                  </div>

                  {/* Mom */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-900/40">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 flex items-center gap-1">
                        <span>{couple.momAvatar}</span>
                        <span>{couple.momName} 每月預設薪水</span>
                      </span>
                      <span className="text-[11px] font-bold font-mono text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded">
                        佔比{' '}
                        {salaryDad + salaryMom > 0
                          ? ((salaryMom / (salaryDad + salaryMom)) * 100).toFixed(1)
                          : '50.0'}
                        %
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400">
                        NT$
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={salaryMom}
                        onChange={e => setSalaryMom(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50/50 dark:bg-slate-950 pl-9 pr-3 py-1.5 text-sm font-mono font-bold text-stone-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-pink-500"
                        placeholder="例如 31000"
                      />
                    </div>
                  </div>
                </div>

                {/* Percentage Preview Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400 mb-1">
                    <span>
                      薪資合計: <strong>${(salaryDad + salaryMom).toLocaleString()}</strong>
                    </span>
                    <span>
                      {couple.dadName}{' '}
                      {salaryDad + salaryMom > 0
                        ? ((salaryDad / (salaryDad + salaryMom)) * 100).toFixed(1)
                        : '50.0'}
                      % ↔ {couple.momName}{' '}
                      {salaryDad + salaryMom > 0
                        ? ((salaryMom / (salaryDad + salaryMom)) * 100).toFixed(1)
                        : '50.0'}
                      %
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden flex shadow-inner">
                    <div
                      className="bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${salaryDad + salaryMom > 0 ? (salaryDad / (salaryDad + salaryMom)) * 100 : 50}%`,
                      }}
                    />
                    <div
                      className="bg-pink-500 transition-all duration-300"
                      style={{
                        width: `${salaryDad + salaryMom > 0 ? (salaryMom / (salaryDad + salaryMom)) * 100 : 50}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Split Mode Choice */}
                <div className="mt-4 pt-4 border-t border-stone-200/60 dark:border-slate-800/80">
                  <span className="text-xs font-semibold text-stone-700 dark:text-slate-300 block mb-2">
                    預設平帳分攤模式
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSalaryMode('salary_ratio')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        salaryMode === 'salary_ratio'
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-stone-900 dark:text-white font-semibold ring-1 ring-amber-500'
                          : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center justify-between">
                        <span>依雙方薪資比例分攤 (推薦)</span>
                        {salaryMode === 'salary_ratio' && (
                          <span className="text-amber-600 font-bold">✓</span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                        依實際薪資佔比計算公平負擔金額
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSalaryMode('split_50_50')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        salaryMode === 'split_50_50'
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-500/10 text-stone-900 dark:text-white font-semibold ring-1 ring-amber-500'
                          : 'border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-stone-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center justify-between">
                        <span>夫妻各半平均 (50/50)</span>
                        {salaryMode === 'split_50_50' && (
                          <span className="text-amber-600 font-bold">✓</span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                        不論薪資高低，共同開銷一人一半
                      </div>
                    </button>
                  </div>
                </div>

                {/* Save and Settlement Link Buttons */}
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      updateCouple({
                        dadSalary: Math.max(0, salaryDad),
                        momSalary: Math.max(0, salaryMom),
                        settlementMode: salaryMode,
                      });
                      setIsSalarySaved(true);
                      showToast('已更新夫妻預設薪水與平帳設定！');
                      setTimeout(() => setIsSalarySaved(false), 2000);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    {isSalarySaved ? '已成功儲存 ✓' : '儲存預設設定'}
                  </button>

                  {onOpenSettlementModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettlementModal();
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Handshake className="w-3.5 h-3.5" />
                      <span>開啟本月平帳對帳單 ➔</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Quick Tools Shortcuts */}
          <div className="pt-4 border-t border-stone-100 dark:border-slate-800">
            <div className="text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-2">
              更多進階功能捷徑
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {onOpenSecurityModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSecurityModal();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      PIN 碼安全中心
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              )}

              {onOpenSyncModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSyncModal();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      雲端備份與房間
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              )}

              {onOpenCsvModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCsvModal();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      匯出 CSV 報表
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              )}

              {onOpenSettlementModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettlementModal();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Handshake className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      夫妻平帳對帳單
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              )}

              {onOpenBabyModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBabyModal();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50/50 dark:bg-slate-900/50 hover:bg-stone-100/70 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{babyInfo.avatar || '👶🏻'}</span>
                    <span className="text-xs font-medium text-stone-700 dark:text-slate-300">
                      修改寶寶名稱 ({babyInfo.name})
                    </span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-stone-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-slate-800 px-5 sm:px-6 py-3 bg-stone-50/60 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="text-[11px] text-stone-400">
            🍼 萌寶記帳 · 為育兒與家庭財務設計
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold shadow-xs transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
