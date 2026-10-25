import React, { useState } from 'react';
import {
  AlertTriangle,
  Apple,
  Check,
  Chrome,
  Copy,
  ExternalLink,
  Heart,
  QrCode,
  Share2,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateCoupleInviteMessage, getShareableInviteUrl } from '../utils/shareUtils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'share' | 'install';
}

export const ShareAndInstallModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultTab = 'share',
}) => {
  const { syncState, couple, babyInfo, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'share' | 'install'>(defaultTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">夫妻共享與手機桌面捷徑</h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                邀請伴侶同步記帳 · 免下載一鍵安裝至手機桌布
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

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950 px-6">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 flex items-center gap-1.5 ${
              activeTab === 'share'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>如何提供給另一半</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'install'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>加到手機桌布捷徑 (PWA)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* TAB 1: Share to Partner */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              {/* Critical Solution Banner for 403 Error */}
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      為什麼另一半會出現「403 沒有存取權限 / 沒有被允許的內容」？
                    </h3>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      因為您先前傳送的是 <strong>Google AI Studio 的工程編輯網址</strong>（開頭是 <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px]">studio.google.com</code>），那是只有您本人 Google 帳號才能進入的開發者後台。
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-semibold">
                      ✅ <strong>正確解決方法</strong>：請使用下方專屬為您產生的「<strong>正式軟體網址</strong>」，另一半點擊後即可直接使用，<strong>完全不需要 Google 帳號權限</strong>！
                    </p>
                  </div>
                </div>
              </div>

              {/* Dedicated Partner Link Card */}
              <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/60 via-amber-50/40 to-stone-50/60 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-xs font-bold">1</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-white">傳送正式網址給另一半</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                    房間代碼：{syncState.roomId}
                  </span>
                </div>

                <div className="rounded-xl bg-white dark:bg-slate-950 border border-stone-200 dark:border-slate-800 p-3 space-y-2">
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 font-medium flex items-center justify-between">
                    <span>專屬免設定直連網址（已自動附帶家庭代碼）：</span>
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>{showQrCode ? '隱藏 QR Code' : '顯示手機掃碼 QR Code'}</span>
                    </button>
                  </div>
                  <div className="text-xs font-mono text-stone-800 dark:text-slate-200 bg-stone-50 dark:bg-slate-900 p-2 rounded-lg break-all select-all border border-stone-100 dark:border-slate-800">
                    {directInviteUrl}
                  </div>
                </div>

                {/* QR Code toggle */}
                {showQrCode && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2 animate-in fade-in">
                    <img
                      src={qrImageUrl}
                      alt="家庭共享專屬 QR Code"
                      className="w-48 h-48 rounded-lg shadow-sm"
                    />
                    <p className="text-[11px] text-stone-500 dark:text-slate-400 text-center">
                      請另一半直接開啟手機相機或 LINE 掃描此行動條碼，即可直接開啟軟體！
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyInviteText}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xs transition-colors"
                  >
                    {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInvite ? '已複製！直接貼到 LINE 聊天室' : '一鍵複製 LINE / 微信 完整邀請文案'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 shadow-xs whitespace-nowrap"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '已複製' : '僅複製直連網址'}</span>
                  </button>
                </div>
              </div>

              {/* Step By Step Guide */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/70 dark:bg-slate-950/60 p-4 space-y-3">
                <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>另一半開啟後的 3 步驟（超簡單，免手動輸入代碼）：</span>
                </div>

                <div className="space-y-2.5 text-xs text-stone-600 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold mt-0.5">
                      1
                    </div>
                    <div>
                      <strong className="text-stone-900 dark:text-white">在手機點開您傳送的專屬網址</strong>：
                      另一半使用 iPhone (Safari) 或 Android (Chrome) 開啟，畫面會自動載入帳本資料。
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold mt-0.5">
                      2
                    </div>
                    <div>
                      <strong className="text-stone-900 dark:text-white">系統已自動連線家庭房間</strong>：
                      透過專屬邀請連結開啟時，系統已自動綁定房間代碼 <span className="font-mono font-bold text-amber-700 dark:text-amber-400">[{syncState.roomId}]</span>，任何一人新增記帳，另一人幾秒內自動更新！
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-bold mt-0.5">
                      3
                    </div>
                    <div>
                      <strong className="text-stone-900 dark:text-white">一鍵放在手機桌面</strong>：
                      切換到上方「加到手機桌布捷徑 (PWA)」分頁，跟著說明將圖示加到手機桌面，往後點擊桌面圖示就能直接全螢幕記帳！
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Install to Home Screen Shortcut */}
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 via-stone-50/40 to-amber-50/60 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-900 dark:text-white">
                    免下載商店 App · 一鍵生成手機桌布捷徑
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-slate-300 leading-relaxed">
                  將本軟體加到手機桌面上後，將以<strong>全螢幕獨立視窗</strong>開啟（自動隱藏瀏覽器網址列與按鈕），就像從 App Store 下載的原生 App 一樣流暢好用！
                </p>
              </div>

              {/* iPhone Safari Guide */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                  <Apple className="w-4 h-4" />
                  <span>iPhone / iPad 設置步驟（使用 Safari 瀏覽器）</span>
                </div>

                <div className="space-y-2 text-xs text-stone-600 dark:text-slate-300 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">①</span>
                    <span>用 <strong>Safari</strong> 瀏覽器開啟專屬軟體網址。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">②</span>
                    <span>點擊底部工具列中間的「<strong>分享圖示</strong>」（方塊帶有向上箭頭）。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">③</span>
                    <span>向下滾動選單，點選「<strong>加入主畫面 (Add to Home Screen)</strong>」。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">④</span>
                    <span>點擊右上角「<strong>新增</strong>」，手機桌布即會出現「萌寶記帳」專屬 App 圖示！</span>
                  </div>
                </div>
              </div>

              {/* Android Chrome Guide */}
              <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900 dark:text-white">
                  <Chrome className="w-4 h-4 text-emerald-600" />
                  <span>Android 安卓手機設置步驟（使用 Chrome 瀏覽器）</span>
                </div>

                <div className="space-y-2 text-xs text-stone-600 dark:text-slate-300 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">①</span>
                    <span>用 <strong>Chrome</strong> 瀏覽器開啟專屬軟體網址。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">②</span>
                    <span>點擊右上角「<strong>三個點 (⋮)</strong>」選單圖示。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">③</span>
                    <span>點選「<strong>安裝應用程式</strong>」或「<strong>加到主畫面</strong>」。</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-stone-400">④</span>
                    <span>確認新增後，手機桌面便能直接點擊圖示開啟記帳！</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
