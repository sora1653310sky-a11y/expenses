import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    securitySettings,
    updateSecuritySettings,
    isPrivacyMode,
    togglePrivacyMode,
    lockApp,
    syncState,
    roomPassword,
    setRoomPassword,
    wipeAllData,
    babyInfo,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'pin' | 'room' | 'danger'>('overview');

  // PIN Form
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Room Password Form
  const [inputRoomPwd, setInputRoomPwd] = useState(roomPassword || '');

  if (!isOpen) return null;

  // Calculate Security Score
  let score = 25; // Base local-first architecture
  const checks = [
    {
      name: '本機端隔離儲存 (零第三方追蹤)',
      passed: true,
      desc: '財務資料僅留存於您的裝置與家庭私有連線，絕無外部廣告追蹤',
    },
    {
      name: '公眾視線防窺遮罩模式',
      passed: isPrivacyMode,
      desc: '隱藏所有收支金額與寶寶全名，防範地鐵、公眾場合肩窺',
    },
    {
      name: 'App 專屬 PIN 碼隱私鎖',
      passed: securitySettings.isAppLockEnabled && !!securitySettings.pinCode,
      desc: '防止手機借閱他人或置於桌面時財務隱私遭查看',
    },
    {
      name: '切換分頁/退至背景防截圖遮罩',
      passed: securitySettings.isBackgroundBlurEnabled,
      desc: '切換多工分頁時自動遮蔽，防止系統多工縮圖洩漏記帳畫面',
    },
    {
      name: '家庭房間專屬存取密碼',
      passed: !!roomPassword,
      desc: '為房間設定保護金鑰，防止他人猜測房間代碼竊取夫妻帳務',
    },
  ];

  if (isPrivacyMode) score += 20;
  if (securitySettings.isAppLockEnabled && securitySettings.pinCode) score += 25;
  if (securitySettings.isBackgroundBlurEnabled) score += 15;
  if (roomPassword) score += 15;

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setPinError('PIN 碼必須為 4 至 6 位純數字');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('兩次輸入的 PIN 碼不一致');
      return;
    }

    updateSecuritySettings({
      isAppLockEnabled: true,
      pinCode: newPin,
    });
    setNewPin('');
    setConfirmPin('');
    showToast('已成功設定 App 隱私安全 PIN 碼！');
  };

  const handleDisablePin = () => {
    updateSecuritySettings({
      isAppLockEnabled: false,
      pinCode: '',
    });
    showToast('已停用 PIN 碼安全鎖');
  };

  const handleSaveRoomPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomPassword(inputRoomPwd.trim());
    showToast(inputRoomPwd.trim() ? '已儲存家庭房間安全密碼！' : '已清除房間密碼');
  };

  const handleWipeData = () => {
    const confirmation = prompt('【極度危險】這將抹除此裝置上所有的寶寶記帳記錄、預算與備份。\n請輸入「確認清除」以執行：');
    if (confirmation === '確認清除') {
      wipeAllData();
      onClose();
    } else {
      showToast('已取消清除操作');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">資訊安全與隱私防護中心</h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                多重安全機制，杜絕家庭財務、育兒開銷與個資外洩
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            安全狀態檢測
          </button>
          <button
            onClick={() => setActiveTab('pin')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 ${
              activeTab === 'pin'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            App 密碼鎖定
          </button>
          <button
            onClick={() => setActiveTab('room')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 ${
              activeTab === 'room'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            房間安全金鑰
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'danger'
                ? 'border-rose-600 text-rose-700 dark:text-rose-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            急難銷毀
          </button>
        </div>

        {/* Tab 1: Security Overview */}
        {activeTab === 'overview' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            {/* Score Card */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">目前安全防護評級</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    score >= 80
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : score >= 60
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                  }`}
                >
                  {score >= 80 ? '頂級防護' : score >= 60 ? '良好防護' : '建議加強'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-extrabold font-mono text-stone-900 dark:text-white">{score}</span>
                <span className="text-xs text-stone-400 font-mono">/ 100 分</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Quick Privacy Toggle */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  {isPrivacyMode ? (
                    <EyeOff className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Eye className="w-4 h-4 text-stone-400" />
                  )}
                  <span className="text-xs font-bold text-stone-900 dark:text-white">
                    公眾視線防窺模式 (Privacy Mask)
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  隱藏全站收支金額與寶寶真實姓名（快捷鍵：<kbd className="px-1 py-0.5 rounded bg-stone-100 font-mono text-[10px] text-stone-700">Shift + P</kbd>）
                </p>
              </div>

              <button
                type="button"
                onClick={togglePrivacyMode}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isPrivacyMode ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivacyMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Background Blur Toggle */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center justify-between shadow-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-stone-600 dark:text-slate-400" />
                  <span className="text-xs font-bold text-stone-900 dark:text-white">
                    離開分頁/切換多工防截圖遮罩
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  當切換至其他 App 或瀏覽器分頁時，自動覆蓋防窺毛玻璃屏障
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateSecuritySettings({
                    isBackgroundBlurEnabled: !securitySettings.isBackgroundBlurEnabled,
                  })
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  securitySettings.isBackgroundBlurEnabled ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    securitySettings.isBackgroundBlurEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Security Checklist */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-800 dark:text-slate-300 block">安全防護項目清單</span>
              <div className="rounded-xl border border-stone-200 dark:border-slate-800 divide-y divide-stone-100 dark:divide-slate-800 bg-white dark:bg-slate-950/40">
                {checks.map((chk, i) => (
                  <div key={i} className="p-3 flex items-start gap-3">
                    {chk.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900 dark:text-white">{chk.name}</span>
                        <span
                          className={`text-[10px] font-semibold ${
                            chk.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                          }`}
                        >
                          {chk.passed ? '已啟用' : '未啟用'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">{chk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: PIN Lock */}
        {activeTab === 'pin' && (
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {securitySettings.isAppLockEnabled && securitySettings.pinCode ? (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        PIN 密碼安全鎖目前已啟用
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        您的記帳資料受密碼保護中
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        lockApp();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-xs font-bold hover:opacity-90 shadow-xs"
                    >
                      立即鎖定
                    </button>
                    <button
                      type="button"
                      onClick={handleDisablePin}
                      className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold"
                    >
                      關閉密碼鎖
                    </button>
                  </div>
                </div>

                {/* Auto-lock timeout selector */}
                <div className="border-t border-emerald-200/70 pt-3">
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> 自動鎖定時間
                  </label>
                  <select
                    value={securitySettings.autoLockDelay}
                    onChange={e =>
                      updateSecuritySettings({
                        autoLockDelay: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-stone-300 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                  >
                    <option value={0}>切換分頁或離開時立即鎖定 (最嚴密)</option>
                    <option value={60}>閒置 1 分鐘後自動鎖定</option>
                    <option value={180}>閒置 3 分鐘後自動鎖定 (推薦)</option>
                    <option value={300}>閒置 5 分鐘後自動鎖定</option>
                    <option value={-1}>僅手動鎖定</option>
                  </select>
                </div>
              </div>
            ) : null}

            {/* Set/Change PIN */}
            <form onSubmit={handleSavePin} className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>{securitySettings.isAppLockEnabled ? '更換新 PIN 碼' : '設定全新 App 安全 PIN 碼'}</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-300">
                請輸入 4 到 6 位數純數字，防止他人隨意翻看您與伴侶的開銷帳本。
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                    設定 PIN 碼 (4~6位)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="例如：1234"
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tracking-widest text-center text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                    再次確認 PIN 碼
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value)}
                    placeholder="再次輸入"
                    className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono tracking-widest text-center text-stone-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {pinError && (
                <div className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {pinError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-xs transition-colors"
              >
                儲存 PIN 碼設定
              </button>
            </form>
          </div>
        )}

        {/* Tab 3: Room Security Password */}
        {activeTab === 'room' && (
          <form onSubmit={handleSaveRoomPassword} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4 space-y-3">
              <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>家庭房間存取保護密碼 (Room Password)</span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-slate-300 leading-relaxed">
                目前家庭房間為 <strong className="font-mono text-amber-700 dark:text-amber-400">{syncState.roomId}</strong>。
                設定專屬密碼後，另一半或新裝置連線同步時必須輸入相同密碼才能存取與備份，防止任何外部人員猜測房間碼竊取帳本！
              </p>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  房間保護密碼 (選填，若留空則為公開房間)
                </label>
                <input
                  type="text"
                  value={inputRoomPwd}
                  onChange={e => setInputRoomPwd(e.target.value)}
                  placeholder="輸入房間自訂密碼 (如：love2026)"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-xs"
                >
                  確認儲存房間密碼
                </button>
                {roomPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputRoomPwd('');
                      setRoomPassword('');
                      showToast('已移除房間密碼保護');
                    }}
                    className="px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-600 hover:bg-stone-100"
                  >
                    解除密碼
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200 text-xs text-stone-600 space-y-1">
              <div className="font-bold text-stone-800">💡 夫妻同步安全建議：</div>
              <div>• 夫妻雙方請約定相同的一組家庭密碼。</div>
              <div>• 雲端同步傳輸時，伺服器會自動比對密碼金鑰，未授權請求將被直接阻絕。</div>
            </div>
          </form>
        )}

        {/* Tab 4: Danger Zone / Emergency Purge */}
        {activeTab === 'danger' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-xs font-bold">急難資料徹底銷毀 (Panic Wipe)</h3>
              </div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
                若您的手機即將交由他人檢查，或遇到緊急隱私外洩風險，可立即抹除此瀏覽器內儲存的全部交易明細、每月預算、家庭設定與房間金鑰。
              </p>
              <div className="text-[10px] text-rose-600 font-semibold">
                ⚠️ 注意：此操作無法復原（除非您曾手動下載過 JSON 離線備份檔案）。
              </div>

              <button
                type="button"
                onClick={handleWipeData}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>立即銷毀本機全部帳務記錄</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-stone-100 dark:border-slate-800 px-6 py-3 flex justify-end bg-stone-50/40 dark:bg-slate-900/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-100 dark:bg-slate-800 text-xs font-semibold text-stone-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
          >
            完成設定並關閉
          </button>
        </div>
      </div>
    </div>
  );
};
