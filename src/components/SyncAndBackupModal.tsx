import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Baby,
  Check,
  CheckCircle2,
  Clock,
  Cloud,
  Copy,
  Database,
  Download,
  FileCheck,
  HardDrive,
  History,
  Info,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  User as UserIcon,
  X,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { exportJsonBackupFile } from '../utils/syncManager';
import { generateCoupleInviteMessage, getShareableInviteUrl } from '../utils/shareUtils';
import { sanitizeRoomId } from '../utils/firebase';
import {
  auth,
  findGoogleDriveBackup,
  googleSignIn,
  googleSignOut,
  readFromGoogleDrive,
  saveToGoogleDrive,
  GoogleDriveBackupFile,
} from '../utils/googleDrive';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'sync' | 'backup' | 'family';
  initialSubTab?: 'gdrive' | 'cloud' | 'timemachine' | 'trash' | 'offline';
  onOpenShareModal?: () => void;
}

export const SyncAndBackupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialTab = 'sync',
  initialSubTab = 'gdrive',
  onOpenShareModal,
}) => {
  const {
    syncState,
    setRoomId,
    toggleAutoSync,
    syncNow,
    cloudBackups,
    refreshCloudBackups,
    createBackup,
    restoreBackupById,
    restoreFromData,
    transactions,
    budget,
    babyInfo,
    updateBabyInfo,
    couple,
    updateCouple,
    roomPassword,
    setRoomPassword,
    trashItems,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    clearAllTrash,
    localSnapshots,
    createLocalSnapshot,
    restoreLocalSnapshot,
    deleteLocalSnapshot,
    formatAmount,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'sync' | 'backup' | 'family'>(initialTab);
  const [backupSubTab, setBackupSubTab] = useState<'gdrive' | 'cloud' | 'timemachine' | 'trash' | 'offline'>(initialSubTab);

  const [inputRoomId, setInputRoomId] = useState(syncState.roomId || '');
  const [inputRoomPassword, setInputRoomPassword] = useState(roomPassword || '');
  const [cloudBackupNote, setCloudBackupNote] = useState('');
  const [localSnapshotNote, setLocalSnapshotNote] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Google Drive state
  const [googleUser, setGoogleUser] = useState<User | null>(auth.currentUser);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [gdriveBackup, setGdriveBackup] = useState<GoogleDriveBackupFile | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Family settings form
  const [babyName, setBabyName] = useState(babyInfo.name);
  const [babyBirth, setBabyBirth] = useState(babyInfo.birthDate);
  const [dadName, setDadName] = useState(couple.dadName);
  const [momName, setMomName] = useState(couple.momName);

  useEffect(() => {
    if (isOpen) {
      refreshCloudBackups();
      setInputRoomId(syncState.roomId);
      setInputRoomPassword(roomPassword || '');
      setBabyName(babyInfo.name);
      setBabyBirth(babyInfo.birthDate);
      setDadName(couple.dadName);
      setMomName(couple.momName);
      if (initialTab) setActiveTab(initialTab);
      if (initialSubTab) setBackupSubTab(initialSubTab);

      // Check Google auth state
      const unsubscribe = auth.onAuthStateChanged(user => {
        setGoogleUser(user);
      });
      return unsubscribe;
    }
  }, [isOpen, syncState.roomId, refreshCloudBackups, babyInfo, couple, roomPassword, initialTab, initialSubTab]);

  if (!isOpen) return null;

  const handleJoinRoom = () => {
    let raw = inputRoomId.trim();
    if (!raw) return;
    // Auto extract room code if user pasted full invite URL
    if (raw.includes('room=') || raw.includes('r=')) {
      const match = raw.match(/[?&](?:room|r)=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) {
        raw = match[1];
      }
    }
    const clean = sanitizeRoomId(raw);
    setInputRoomId(clean);
    setRoomId(clean);
    showToast(`已成功加入家庭房間 [${clean}]！`);
  };

  const handleGenerateRoom = () => {
    const code = `BABY-${Math.floor(1000 + Math.random() * 9000)}`;
    setInputRoomId(code);
    setRoomId(code);
    showToast(`已生成新家庭房間代碼：${code}`);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncNow();
    setIsSyncing(false);
  };

  const handleCopyInvite = () => {
    const text = generateCoupleInviteMessage({
      roomId: syncState.roomId,
      babyName: babyInfo.name,
      currentRole: couple.currentRole,
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('已複製夫妻專屬邀請連結與房間代碼！');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCloudSnapshot = async () => {
    setIsBackingUp(true);
    await createBackup(cloudBackupNote || undefined);
    setCloudBackupNote('');
    setIsBackingUp(false);
  };

  const handleCreateLocalSnapshot = () => {
    createLocalSnapshot(localSnapshotNote || undefined);
    setLocalSnapshotNote('');
  };

  const handleDownloadJson = () => {
    const backupData = {
      app: 'BabyLedger',
      version: 2,
      exportTime: new Date().toISOString(),
      roomId: syncState.roomId,
      babyInfo,
      couple,
      budget,
      transactions,
    };
    exportJsonBackupFile(backupData, `萌寶記帳_${babyInfo.name || '備份'}`);
    showToast('已下載 JSON 完整備份檔案！');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const ok = restoreFromData(parsed);
        if (ok) {
          onClose();
        }
      } catch (err) {
        showToast('無法解析此 JSON 備份檔');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveFamily = (e: React.FormEvent) => {
    e.preventDefault();
    updateBabyInfo({
      ...babyInfo,
      name: babyName.trim(),
      birthDate: babyBirth,
    });
    updateCouple({
      dadName: dadName.trim(),
      momName: momName.trim(),
    });
    showToast('家庭成員設定已儲存！');
  };

  // Google Drive Handlers
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      showToast(`Google 帳號 (${res.user.email}) 登入成功！`);
      // Check existing backup
      try {
        const backupFile = await findGoogleDriveBackup(res.accessToken);
        setGdriveBackup(backupFile);
      } catch (e) {
        // quiet error
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      const code = err.code || '';
      const msg = err.message || '';
      if (code === 'auth/unauthorized-domain') {
        showToast('此網址尚未列入 Firebase 已授權網域 (Authorized domains)，請在 Firebase Console 中加入此網址。');
      } else if (code === 'auth/popup-closed-by-user') {
        showToast('已取消 Google 登入視窗');
      } else if (msg.includes('access_denied') || msg.includes('403') || msg.includes('disallowed_useragent')) {
        showToast('存取遭拒：若專案處於測試中，請至 Google Cloud Console 將另一半的 Gmail 加入「測試使用者」清單！');
      } else {
        showToast('Google 登入或授權失敗：' + (err.message || '請確認權限或網路'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleSignOut();
    setGoogleUser(null);
    setGoogleToken(null);
    setGdriveBackup(null);
    showToast('已登出 Google 帳號');
  };

  const handleSaveToGoogleDrive = async () => {
    if (!googleToken) {
      showToast('請先登入 Google 雲端硬碟帳號');
      return;
    }
    setIsGoogleLoading(true);
    try {
      const payload = {
        app: 'BabyLedger',
        version: 2,
        exportTime: new Date().toISOString(),
        roomId: syncState.roomId,
        babyInfo,
        couple,
        budget,
        transactions,
      };
      const res = await saveToGoogleDrive(googleToken, payload);
      setGdriveBackup({
        id: res.fileId,
        name: '萌寶記帳_Google雲端備份.json',
        modifiedTime: res.modifiedTime,
      });
      showToast('已成功備份至您的 Google 雲端硬碟！');
    } catch (err: any) {
      showToast('備份至 Google Drive 失敗：' + err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRestoreFromGoogleDrive = async () => {
    if (!googleToken) {
      showToast('請先登入 Google 雲端硬碟帳號');
      return;
    }
    if (!confirm('確定要從 Google 雲端硬碟還原帳本嗎？目前本機資料將被 Google 雲端中的檔案覆蓋。')) {
      return;
    }
    setIsGoogleLoading(true);
    try {
      const res = await readFromGoogleDrive(googleToken);
      const ok = restoreFromData(res.data);
      if (ok) {
        showToast('已成功從 Google 雲端硬碟還原帳本！');
        onClose();
      }
    } catch (err: any) {
      showToast('從 Google Drive 還原失敗：' + err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 px-6 py-4 bg-stone-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">資料同步與防遺失保護中心</h2>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Google 雲端記憶 · 夫妻雙機即時連線 · 歷史時光機
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800 bg-stone-50/60 dark:bg-slate-950 px-6">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>夫妻雲端即時同步</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors mr-6 flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>雲端硬碟與防遺失</span>
            {trashItems.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-mono">
                {trashItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('family')}
            className={`py-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'family'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-900'
            }`}
          >
            <Baby className="w-3.5 h-3.5" />
            <span>家庭成員設定</span>
          </button>
        </div>

        {/* Tab 1: Sync */}
        {activeTab === 'sync' && (
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {/* Quick Share to Partner Banner */}
            <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-r from-rose-50/70 to-amber-50/60 dark:from-rose-950/20 dark:to-slate-900 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                  <span>📱 提供給另一半使用</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 font-semibold">雙方同步</span>
                </div>
                <p className="text-[11px] text-stone-600 dark:text-slate-300 mt-0.5">
                  複製專屬邀請文案傳至 LINE，另一半輸入同一個房間碼即可同步記帳與月底平帳！
                </p>
              </div>
              {onOpenShareModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShareModal();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-xs shrink-0 transition-colors ml-3"
                >
                  查看共享指南
                </button>
              )}
            </div>

            {/* Room code setup */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4">
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-2">
                家庭共享房間代碼 (Family Room Code)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={e => setInputRoomId(e.target.value)}
                  placeholder="輸入房間碼 (例如 BABY-8823) 或貼上完整邀請網址"
                  className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-mono font-bold text-stone-900 dark:text-white uppercase focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-xs transition-colors whitespace-nowrap cursor-pointer"
                >
                  加入房間
                </button>
                <button
                  type="button"
                  onClick={handleGenerateRoom}
                  className="px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                  title="生成隨機房間碼"
                >
                  換新房間
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-stone-500 dark:text-slate-400">
                💡 貼心提示：可直接在此貼上伴侶分享給您的完整連結或房間代碼，系統會自動辨識並連線同步！
              </p>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-stone-600 dark:text-slate-400">
                  當前房間：<strong className="text-amber-700 dark:text-amber-400 font-mono font-bold">{syncState.roomId}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已複製！' : '複製分享代碼'}</span>
                </button>
              </div>

              {/* Room Security Password Field */}
              <div className="mt-3.5 pt-3 border-t border-stone-200/80 dark:border-slate-800">
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> 房間安全保護密碼
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {roomPassword ? '🔒 已加密保護' : '🔓 目前為公開房間'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputRoomPassword}
                    onChange={e => setInputRoomPassword(e.target.value)}
                    placeholder="若設定了密碼，雙方需輸入一致"
                    className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-stone-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setRoomPassword(inputRoomPassword.trim());
                      showToast(inputRoomPassword.trim() ? '已儲存房間密碼！' : '已清除房間密碼');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-800 text-xs font-bold text-white transition-colors"
                  >
                    儲存
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Sync Toggle & Status */}
            <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-white">自動同步雙方帳戶</div>
                  <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5">
                    只要一方記帳，另一方手機隨時自動同步接收最新收支
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAutoSync}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    syncState.isAutoSync ? 'bg-amber-600' : 'bg-stone-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      syncState.isAutoSync ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-stone-200/80 dark:border-slate-850 pt-3 flex items-center justify-between text-xs">
                <div className="text-stone-500 dark:text-slate-400">
                  {syncState.lastSyncedAt ? (
                    <span>
                      最後同步：{new Date(syncState.lastSyncedAt).toLocaleTimeString('zh-TW')}
                      {syncState.lastSyncedBy ? ` (${syncState.lastSyncedBy})` : ''}
                    </span>
                  ) : (
                    <span>尚未執行雲端同步</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white disabled:opacity-50 transition-colors shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? '同步中...' : '立即手動同步'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Anti-Data-Loss Center */}
        {activeTab === 'backup' && (
          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            {/* Direct Answer Banner */}
            <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/90 via-stone-50/60 to-emerald-50/80 dark:from-amber-950/30 dark:via-slate-900/50 dark:to-emerald-950/20 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-xs">
                  <Database className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <span>Google 雲端記憶 ＋ 多層防遺失保護</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 font-semibold">
                      全天候生效中
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-slate-300 leading-relaxed">
                    支援<strong>登入 Google 雲端帳號</strong>直接將帳本儲存在您的個人的 Google Drive 中，同時具備伺服器硬碟持久化、本機時光機快照與誤刪救回，全方位確保歷史數據萬無一失。
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-tabs selector */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-stone-100 dark:bg-slate-800/60 text-xs">
              <button
                type="button"
                onClick={() => setBackupSubTab('gdrive')}
                className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  backupSubTab === 'gdrive'
                    ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Database className="w-3 h-3 text-amber-600" />
                <span>Google雲端</span>
              </button>

              <button
                type="button"
                onClick={() => setBackupSubTab('cloud')}
                className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  backupSubTab === 'cloud'
                    ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Cloud className="w-3 h-3 text-emerald-600" />
                <span>房間封存</span>
              </button>

              <button
                type="button"
                onClick={() => setBackupSubTab('timemachine')}
                className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  backupSubTab === 'timemachine'
                    ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <History className="w-3 h-3 text-blue-600" />
                <span>時光機</span>
              </button>

              <button
                type="button"
                onClick={() => setBackupSubTab('trash')}
                className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  backupSubTab === 'trash'
                    ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>回收區</span>
                {trashItems.length > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white rounded-full px-1">
                    {trashItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setBackupSubTab('offline')}
                className={`py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 ${
                  backupSubTab === 'offline'
                    ? 'bg-white dark:bg-slate-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 hover:text-stone-800 dark:text-slate-400'
                }`}
              >
                <Download className="w-3 h-3 text-stone-600" />
                <span>離線檔案</span>
              </button>
            </div>

            {/* Sub-Tab 0: Google Drive Storage */}
            {backupSubTab === 'gdrive' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-amber-600" />
                      <span>Google 雲端硬碟記憶庫 (Google Drive Storage)</span>
                    </div>
                    {googleUser && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold">
                        已登入連線
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                    登入您的 Google 帳號後，軟體將在獲得您授權下，將寶寶帳本直接儲存在您個人的 <strong>Google 雲端硬碟</strong> 中。換手機或更換瀏覽器時，只要登入同一個 Google 帳號，歷史紀錄即可一鍵讀取恢復！
                  </p>

                  {/* Google Auth Status Box */}
                  {!googleUser ? (
                    <div className="pt-2 flex flex-col items-center justify-center p-5 border border-dashed border-stone-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 space-y-3">
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed text-left w-full space-y-1">
                        <div className="font-bold flex items-center gap-1">
                          <span>💡 提醒：夫妻平時記帳「不需要登入 Google」即可自動同步！</span>
                        </div>
                        <div>
                          雙方只要透過家庭房間碼即可即時同步資料。此處 Google 登入僅為個人雲端硬碟備份選用。
                        </div>
                        <div className="text-stone-600 dark:text-slate-400">
                          若點擊登入時 Google 彈出「錄製自拍影片」，此為 Google 帳戶自我防護提示，可直接點選<strong>「暫時不要」</strong>跳過。
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 dark:text-slate-300 text-center">
                        如需將帳本額外備份至您的 Google 雲端硬碟，請點擊下方：
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isGoogleLoading}
                        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-800 dark:text-white hover:bg-stone-50 shadow-sm transition-all active:scale-98"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>{isGoogleLoading ? '登入驗證中...' : '使用 Google 帳號登入'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* User Profile Card */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          {googleUser.photoURL ? (
                            <img src={googleUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-stone-200" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                              {googleUser.displayName?.[0] || 'G'}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-stone-900 dark:text-white">
                              {googleUser.displayName || 'Google 雲端使用者'}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-slate-400">
                              {googleUser.email}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleGoogleSignOut}
                          className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>登出</span>
                        </button>
                      </div>

                      {/* Drive File Status */}
                      <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-xs">
                        <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between">
                          <span>雲端記憶備份檔案</span>
                          <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">
                            萌寶記帳_Google雲端備份.json
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                          {gdriveBackup ? (
                            <span>最後更新於：{new Date(gdriveBackup.modifiedTime).toLocaleString('zh-TW')}</span>
                          ) : (
                            <span>尚未在 Google Drive 建立過備份檔，點擊下方按鈕即可完成首次備份。</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveToGoogleDrive}
                          disabled={isGoogleLoading}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isGoogleLoading ? '處理中...' : '備份至 Google Drive'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRestoreFromGoogleDrive}
                          disabled={isGoogleLoading}
                          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-50 shadow-xs transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                          <span>從 Google Drive 還原</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Firebase & Google OAuth Configuration Diagnostic Card */}
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-stone-950 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Firebase & Google OAuth 設定與授權檢核</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300 font-mono">
                      專案: gen-lang-client-0780624612
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 dark:text-slate-300 space-y-2.5">
                    {/* Item 1: Test Users */}
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-950/70 border border-stone-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-white text-[10px]">1</span>
                          <span>OAuth 同意畫面「測試使用者 (Test users)」清單</span>
                        </strong>
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          測試狀態必要
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                        因 Google Drive 屬於敏感權限範圍，若 GCP 專案處於<strong>「測試中 (Testing)」</strong>狀態，只有在清單中的 Google 帳號能授權登入。
                      </p>
                      <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-stone-200 dark:border-slate-800 font-mono text-stone-700 dark:text-slate-300">
                        📍 設定路徑：Google Cloud Console ➔ API 和服務 ➔ OAuth 同意畫面 ➔ 測試使用者 ➔ <strong>新增另一半的 Google 信箱</strong>
                      </div>
                    </div>

                    {/* Item 2: Authorized Domains */}
                    <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-950/70 border border-stone-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-stone-900 dark:text-white flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">2</span>
                          <span>Firebase Authorized Domains (已授權網域)</span>
                        </strong>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          安全防護
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                        Firebase 登入視窗只允許在已授權的網域中執行。請確認 Firebase Console 中已列入目前軟體正式網址：
                      </p>
                      <div className="text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-stone-200 dark:border-slate-800 font-mono text-stone-700 dark:text-slate-300 break-all select-all">
                        {typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}
                      </div>
                      <div className="text-[10px] text-stone-400 dark:text-slate-500">
                        📍 設定路徑：Firebase Console ➔ Authentication ➔ Settings ➔ Authorized domains ➔ 新增網域
                      </div>
                    </div>

                    {/* Item 3: Clarification for spouse daily sync */}
                    <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>💡 重點說明：夫妻日常記帳同步不需要登入 Google</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-relaxed">
                        只要雙方在相同房間代碼（如 <code className="font-mono font-bold">BABY-8823</code>）下，記帳資料即由伺服器自動即時同步，<strong>另一半完全無需登入 Google 即可自由記帳、看報表與平帳！</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 1: Cloud Snapshots */}
            {backupSubTab === 'cloud' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                      建立伺服器歷史封存點
                    </label>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400">
                      儲存於房間 [{syncState.roomId}] 永久保存
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cloudBackupNote}
                      onChange={e => setCloudBackupNote(e.target.value)}
                      placeholder="備註 (例如：滿月慶祝後、換新手機前備份)"
                      className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCloudSnapshot}
                      disabled={isBackingUp}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white disabled:opacity-50 shadow-xs transition-colors shrink-0"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{isBackingUp ? '備份中...' : '一鍵封存'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 mb-2">
                    <span className="font-bold text-stone-800 dark:text-slate-300">
                      伺服器備份清單 ({cloudBackups.length})
                    </span>
                    <button
                      type="button"
                      onClick={refreshCloudBackups}
                      className="hover:text-amber-700 dark:hover:text-amber-400 font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>刷新</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 divide-y divide-stone-100 dark:divide-slate-850 max-h-56 overflow-y-auto">
                    {cloudBackups.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500">
                        目前尚無伺服器備份點。點擊上方「一鍵封存」即可將目前全部紀錄永久固化！
                      </div>
                    ) : (
                      cloudBackups.map(b => (
                        <div key={b.id} className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-slate-900/60 text-xs transition-colors">
                          <div>
                            <div className="font-semibold text-stone-900 dark:text-white">
                              {b.note}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{new Date(b.timestamp).toLocaleString('zh-TW')}</span>
                              <span>·</span>
                              <span>{b.transactionCount} 筆交易</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`確定要還原備份「${b.note}」嗎？現有資料將被該備份狀態覆蓋。`)) {
                                restoreBackupById(b.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-stone-300 font-medium transition-colors"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>還原</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 2: Local Time Machine */}
            {backupSubTab === 'timemachine' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-stone-700 dark:text-slate-300">
                      建立本機時光機快照點
                    </label>
                    <span className="text-[10px] text-stone-500 dark:text-slate-400">
                      完全保存在本機，離線斷網亦可隨時還原
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localSnapshotNote}
                      onChange={e => setLocalSnapshotNote(e.target.value)}
                      placeholder="快照標籤 (例如：核對發票前、大掃除前)"
                      className="flex-1 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCreateLocalSnapshot}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-xs transition-colors shrink-0"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>記錄快照點</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-stone-500 dark:text-slate-400 mb-2">
                    <span className="font-bold text-stone-800 dark:text-slate-300">
                      本機歷史版本清單 ({localSnapshots.length}/15)
                    </span>
                    <span className="text-[11px] text-stone-400">最新版本排在最前</span>
                  </div>

                  <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 divide-y divide-stone-100 dark:divide-slate-850 max-h-56 overflow-y-auto">
                    {localSnapshots.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-500">
                        尚無本機快照。每次異動或點擊上方按鈕，系統將自動為您保留時光機紀錄。
                      </div>
                    ) : (
                      localSnapshots.map(snap => (
                        <div key={snap.id} className="p-3 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-slate-900/60 text-xs transition-colors">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-stone-900 dark:text-white truncate">
                              {snap.reason}
                            </div>
                            <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{new Date(snap.timestamp).toLocaleString('zh-TW')}</span>
                              <span>·</span>
                              <span>{snap.transactionCount} 筆交易紀錄</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`確定要將資料回滾至「${snap.reason}」嗎？現有資料將被替代。`)) {
                                  restoreLocalSnapshot(snap.id);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-300 dark:border-slate-700 bg-stone-50 dark:bg-slate-900 hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-700 dark:text-stone-300 font-medium transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 text-blue-600" />
                              <span>回滾</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLocalSnapshot(snap.id)}
                              title="刪除此快照點"
                              className="p-1 text-stone-400 hover:text-rose-600 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 3: Trash */}
            {backupSubTab === 'trash' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20 p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>防手滑誤刪：最近刪除項目回收區</span>
                    </div>
                    <p className="text-[11px] text-rose-700 dark:text-rose-400">
                      所有刪除的記帳皆在此安全暫存保留，可一鍵原封不動救回！
                    </p>
                  </div>
                  {trashItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('確定要徹底清空回收區的所有紀錄嗎？清空後將無法救回。')) {
                          clearAllTrash();
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
                    >
                      清空回收區
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 divide-y divide-stone-100 dark:divide-slate-850 max-h-60 overflow-y-auto">
                  {trashItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-400 space-y-1">
                      <p className="font-semibold text-stone-700 dark:text-slate-300">回收區空空如也</p>
                      <p className="text-[11px]">任何不小心刪除的記帳都會先暫存至此，給您完全安心的救回保障。</p>
                    </div>
                  ) : (
                    trashItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-slate-900/60 text-xs transition-colors"
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900 dark:text-white truncate">
                              {item.transaction.title}
                            </span>
                            <span className="font-mono font-bold text-stone-900 dark:text-white">
                              {formatAmount(item.transaction.amount)}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>日期：{item.transaction.date}</span>
                            <span>·</span>
                            <span>刪除於：{new Date(item.deletedAt).toLocaleString('zh-TW')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => restoreTrashItem(item.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-xs transition-colors"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>救回</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => permanentlyDeleteTrashItem(item.id)}
                            title="徹底清除"
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Sub-Tab 4: Offline File Export & Import */}
            {backupSubTab === 'offline' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50/80 dark:bg-slate-950/70 p-4 space-y-3">
                  <div className="text-xs font-bold text-stone-800 dark:text-slate-300">
                    本機萬能離線檔案封存 (Portable JSON Archive)
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400 leading-relaxed">
                    您可以將目前全部寶寶開銷、每月預算及家庭成員設定打包下載為 .json 格式檔案。可隨身碟或手動上傳備份保存。
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadJson}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-600" />
                      <span>下載完整 JSON 備份檔</span>
                    </button>

                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 shadow-xs cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>上傳還原歷史備份檔</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Family Settings */}
        {activeTab === 'family' && (
          <form onSubmit={handleSaveFamily} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Baby className="w-3.5 h-3.5 text-amber-600" /> 寶寶稱呼 / 姓名
              </label>
              <input
                type="text"
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                placeholder="例如：小波波"
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                寶寶出生日期 / 預產期
              </label>
              <input
                type="date"
                value={babyBirth}
                onChange={e => setBabyBirth(e.target.value)}
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs text-stone-900 dark:text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  爸爸稱呼
                </label>
                <input
                  type="text"
                  value={dadName}
                  onChange={e => setDadName(e.target.value)}
                  placeholder="爸爸"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-slate-400 mb-1">
                  媽媽稱呼
                </label>
                <input
                  type="text"
                  value={momName}
                  onChange={e => setMomName(e.target.value)}
                  placeholder="媽媽"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-stone-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-xs transition-colors"
              >
                儲存成員資訊
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
