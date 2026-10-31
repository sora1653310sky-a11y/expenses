import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { INITIAL_BABY_INFO, INITIAL_BUDGET, INITIAL_COUPLE_PROFILE, INITIAL_TRANSACTIONS } from '../constants/initialData';
import { THEMES } from '../constants/themes';
import {
  BabyInfo,
  CloudBackupItem,
  CoupleProfile,
  LocalSnapshotItem,
  MonthlyBudget,
  MonthlySalaryRecord,
  RoomSyncState,
  SecuritySettings,
  ThemeConfig,
  ThemeId,
  ThemeMode,
  Transaction,
  TrashItem,
} from '../types';
import {
  broadcastLocalChange,
  clearAllLocalStorage,
  createCloudBackup as apiCreateCloudBackup,
  fetchCloudBackups as apiFetchCloudBackups,
  fetchRoomSyncState,
  loadFromLocalStorage,
  pushRoomSyncState,
  restoreCloudBackup as apiRestoreCloudBackup,
  saveToLocalStorage,
  StorageKeys,
  subscribeToLocalBroadcast,
  SyncPayload,
} from '../utils/syncManager';
import {
  writeTransactionToFirestore,
  deleteTransactionFromFirestore,
  writeRoomMetaToFirestore,
  subscribeToRoomTransactions,
  subscribeToRoomMeta,
  testFirestoreConnection,
  bulkUploadTransactionsToFirestore,
  sanitizeRoomId,
} from '../utils/firebase';

const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  isPrivacyMode: false,
  isMaskBabyName: false,
  isAppLockEnabled: false,
  pinCode: '',
  autoLockDelay: 180, // 3 minutes default
  isBackgroundBlurEnabled: false, // Default: DISABLED so it never disrupts normal usage
  backgroundBlurDelay: 0, // 0 = immediate, 60 = 1 min, 180 = 3 min
  roomPassword: '',
};

interface AppContextType {
  // Transactions
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  // Budget
  budget: MonthlyBudget;
  updateBudget: (newBudget: MonthlyBudget) => void;

  // Baby & Couple
  babyInfo: BabyInfo;
  updateBabyInfo: (info: BabyInfo) => void;
  couple: CoupleProfile;
  switchRole: (role: 'dad' | 'mom') => void;
  updateCouple: (profile: Partial<CoupleProfile>) => void;
  saveMonthlySalary: (month: string, role: 'dad' | 'mom', amount: number) => void;
  saveBothMonthlySalaries: (month: string, dadSalary: number, momSalary: number) => void;

  // Theme
  themeId: ThemeId;
  themeMode: ThemeMode;
  currentTheme: ThemeConfig;
  setThemeId: (id: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;

  // Room Sync & Backup (雲端記憶與防護)
  syncState: RoomSyncState;
  setRoomId: (roomId: string) => void;
  toggleAutoSync: () => void;
  syncNow: () => Promise<boolean>;
  cloudBackups: CloudBackupItem[];
  refreshCloudBackups: () => Promise<void>;
  createBackup: (note?: string) => Promise<boolean>;
  restoreBackupById: (snapshotId: string) => Promise<boolean>;
  restoreFromData: (data: any) => boolean;

  // Anti-Data-Loss: Trash & Local Time Machine Snapshots (舊紀錄防誤刪與歷史時光機)
  trashItems: TrashItem[];
  restoreTrashItem: (trashId: string) => void;
  permanentlyDeleteTrashItem: (trashId: string) => void;
  clearAllTrash: () => void;
  localSnapshots: LocalSnapshotItem[];
  createLocalSnapshot: (reason?: string) => void;
  restoreLocalSnapshot: (snapshotId: string) => boolean;
  deleteLocalSnapshot: (snapshotId: string) => void;

  // Security & Privacy Controls (資訊外洩防護)
  securitySettings: SecuritySettings;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  isAppLocked: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => boolean;
  roomPassword: string;
  setRoomPassword: (pwd: string) => void;
  isWindowHidden: boolean;
  restoreWindowVisibility: () => void;
  formatAmount: (amount: number, options?: { showSign?: boolean; prefix?: string; forceShow?: boolean }) => string;
  maskBabyName: (name: string) => string;
  wipeAllData: () => void;

  // Status & Notification
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from localStorage with seed fallbacks and snapshot recovery
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const loaded = loadFromLocalStorage<Transaction[]>(StorageKeys.TRANSACTIONS, []);
    if (Array.isArray(loaded) && loaded.length > 0) {
      return loaded;
    }
    // Safety recovery: check local snapshots if primary storage was unexpectedly cleared
    const snapshots = loadFromLocalStorage<any[]>(StorageKeys.LOCAL_SNAPSHOTS, []);
    if (
      Array.isArray(snapshots) &&
      snapshots.length > 0 &&
      Array.isArray(snapshots[0]?.transactions) &&
      snapshots[0].transactions.length > 0
    ) {
      return snapshots[0].transactions;
    }
    return INITIAL_TRANSACTIONS;
  });
  const [budget, setBudget] = useState<MonthlyBudget>(() =>
    loadFromLocalStorage(StorageKeys.BUDGET, INITIAL_BUDGET)
  );
  const [babyInfo, setBabyInfo] = useState<BabyInfo>(() =>
    loadFromLocalStorage(StorageKeys.BABY_INFO, INITIAL_BABY_INFO)
  );
  const [couple, setCouple] = useState<CoupleProfile>(() =>
    loadFromLocalStorage(StorageKeys.COUPLE, INITIAL_COUPLE_PROFILE)
  );

  // Live state refs to guarantee background sync and async handlers always read latest state
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const budgetRef = useRef(budget);
  budgetRef.current = budget;
  const babyInfoRef = useRef(babyInfo);
  babyInfoRef.current = babyInfo;
  const coupleRef = useRef(couple);
  coupleRef.current = couple;

  // Themes
  const [themeId, setThemeIdState] = useState<ThemeId>(() =>
    loadFromLocalStorage<ThemeId>(StorageKeys.THEME_ID, 'linen')
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    loadFromLocalStorage<ThemeMode>(StorageKeys.THEME_MODE, 'light')
  );

  // Security & Privacy Settings
  const [securitySettings, setSecuritySettingsState] = useState<SecuritySettings>(() => {
    const loaded = loadFromLocalStorage<Partial<SecuritySettings>>(StorageKeys.SECURITY, {});
    const hasExplicitChoice = loadFromLocalStorage<boolean>('baby_ledger_auto_shield_explicit', false);
    const isBackgroundBlurEnabled = hasExplicitChoice ? Boolean(loaded?.isBackgroundBlurEnabled) : false;
    return {
      ...INITIAL_SECURITY_SETTINGS,
      ...loaded,
      isBackgroundBlurEnabled,
      backgroundBlurDelay: loaded?.backgroundBlurDelay ?? 0,
    };
  });

  const [roomPassword, setRoomPasswordState] = useState<string>(() =>
    loadFromLocalStorage<string>(StorageKeys.ROOM_PASSWORD, '')
  );

  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    // If app lock is configured, check if we should lock immediately
    const loaded = loadFromLocalStorage<Partial<SecuritySettings>>(StorageKeys.SECURITY, {});
    return Boolean(loaded?.isAppLockEnabled && loaded?.pinCode);
  });

  const [isWindowHidden, setIsWindowHidden] = useState(false);

  const getInitialRoomId = () => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        let queryRoom = params.get('room') || params.get('r');
        if (!queryRoom && window.location.hash) {
          const hashStr = window.location.hash.replace(/^#[/?]*/, '');
          const hashParams = new URLSearchParams(hashStr);
          queryRoom = hashParams.get('room') || hashParams.get('r');
        }
        if (queryRoom && queryRoom.trim()) {
          const clean = sanitizeRoomId(queryRoom);
          saveToLocalStorage(StorageKeys.ROOM_ID, clean);
          return clean;
        }
      }
    } catch (e) {
      // ignore
    }
    const stored = loadFromLocalStorage<string>(StorageKeys.ROOM_ID, 'BABY-8823');
    return sanitizeRoomId(stored);
  };

  // Room & Synchronization
  const [syncState, setSyncState] = useState<RoomSyncState>(() => ({
    roomId: getInitialRoomId(),
    isAutoSync: loadFromLocalStorage<boolean>(StorageKeys.AUTO_SYNC, true),
    lastSyncedAt: loadFromLocalStorage<number | null>(StorageKeys.LAST_SYNC_TIME, null),
    lastSyncedBy: null,
    status: 'idle',
    version: 1,
  }));

  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isFirstFirestoreLoadRef = useRef(true);

  // Anti-Data-Loss: Trash & Local Time Machine Snapshots
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() =>
    loadFromLocalStorage<TrashItem[]>(StorageKeys.TRASH, [])
  );
  const trashItemsRef = useRef(trashItems);
  trashItemsRef.current = trashItems;

  const [localSnapshots, setLocalSnapshots] = useState<LocalSnapshotItem[]>(() =>
    loadFromLocalStorage<LocalSnapshotItem[]>(StorageKeys.LOCAL_SNAPSHOTS, [])
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    saveToLocalStorage(StorageKeys.TRANSACTIONS, transactions);
  }, [transactions]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.BUDGET, budget);
  }, [budget]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.BABY_INFO, babyInfo);
  }, [babyInfo]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.COUPLE, couple);
  }, [couple]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.THEME_ID, themeId);
  }, [themeId]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.THEME_MODE, themeMode);
  }, [themeMode]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.ROOM_ID, syncState.roomId);
    saveToLocalStorage(StorageKeys.AUTO_SYNC, syncState.isAutoSync);
    // Keep ?room=ROOM_ID in the browser address bar so copying the URL always shares the exact active room
    if (typeof window !== 'undefined' && syncState.roomId) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== syncState.roomId) {
        url.searchParams.set('room', syncState.roomId);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [syncState.roomId, syncState.isAutoSync]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.SECURITY, securitySettings);
  }, [securitySettings]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.ROOM_PASSWORD, roomPassword);
  }, [roomPassword]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.TRASH, trashItems);
  }, [trashItems]);

  useEffect(() => {
    saveToLocalStorage(StorageKeys.LOCAL_SNAPSHOTS, localSnapshots);
  }, [localSnapshots]);

  // Automatic baseline safety snapshot if none exists
  useEffect(() => {
    if (localSnapshots.length === 0 && transactions.length > 0) {
      const baseline: LocalSnapshotItem = {
        id: `snap_init_${Date.now()}`,
        timestamp: Date.now(),
        reason: '系統自動建立初始安全保護點',
        transactionCount: transactions.length,
        data: {
          transactions,
          budget,
          babyInfo,
          couple,
        },
      };
      setLocalSnapshots([baseline]);
      saveToLocalStorage(StorageKeys.LOCAL_SNAPSHOTS, [baseline]);
    }
  }, []);



  // Security Settings Updater
  const updateSecuritySettings = useCallback((settings: Partial<SecuritySettings>) => {
    if (settings.isBackgroundBlurEnabled !== undefined) {
      saveToLocalStorage('baby_ledger_auto_shield_explicit', true);
    }
    setSecuritySettingsState(prev => {
      const next = { ...prev, ...settings };
      saveToLocalStorage(StorageKeys.SECURITY, next);
      return next;
    });
  }, []);

  const togglePrivacyMode = useCallback(() => {
    setSecuritySettingsState(prev => {
      const next = !prev.isPrivacyMode;
      showToast(next ? '🛡️ 已開啟防窺保護模式 (金額與姓名已遮罩)' : '👁️ 已關閉防窺保護模式');
      return { ...prev, isPrivacyMode: next };
    });
  }, [showToast]);

  const lockApp = useCallback(() => {
    setIsAppLocked(true);
    showToast('🔒 帳本已安全鎖定');
  }, [showToast]);

  const unlockApp = useCallback(
    (pin: string): boolean => {
      if (pin === securitySettings.pinCode) {
        setIsAppLocked(false);
        showToast('🔓 歡迎回來，已成功解鎖！');
        return true;
      }
      return false;
    },
    [securitySettings.pinCode, showToast]
  );

  const setRoomPassword = useCallback((pwd: string) => {
    setRoomPasswordState(pwd);
  }, []);

  const restoreWindowVisibility = useCallback(() => {
    setIsWindowHidden(false);
  }, []);

  // Format amount with Privacy Masking
  const formatAmount = useCallback(
    (amount: number, options?: { showSign?: boolean; prefix?: string; forceShow?: boolean }): string => {
      if (securitySettings.isPrivacyMode && !options?.forceShow) {
        return '••••••';
      }
      const isNegative = amount < 0;
      const absAmount = Math.abs(amount).toLocaleString();
      const prefix = options?.prefix ?? '$';

      if (options?.showSign) {
        if (amount > 0) return `+${prefix}${absAmount}`;
        if (amount < 0) return `-${prefix}${absAmount}`;
        return `${prefix}0`;
      }
      return isNegative ? `-${prefix}${absAmount}` : `${prefix}${absAmount}`;
    },
    [securitySettings.isPrivacyMode]
  );

  const maskBabyName = useCallback(
    (name: string): string => {
      if (!securitySettings.isPrivacyMode && !securitySettings.isMaskBabyName) {
        return name || '寶寶';
      }
      return '寶寶';
    },
    [securitySettings.isPrivacyMode, securitySettings.isMaskBabyName]
  );

  // Inactivity auto-lock timer
  useEffect(() => {
    if (!securitySettings.isAppLockEnabled || !securitySettings.pinCode || securitySettings.autoLockDelay <= 0) {
      return;
    }

    let timer: any = null;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setIsAppLocked(true);
      }, securitySettings.autoLockDelay * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, resetTimer));
    };
  }, [securitySettings.isAppLockEnabled, securitySettings.pinCode, securitySettings.autoLockDelay]);

  // Window visibility change (Conceal on tab switch / background)
  useEffect(() => {
    let blurTimer: any = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (securitySettings.isBackgroundBlurEnabled) {
          const delaySec = securitySettings.backgroundBlurDelay ?? 0;
          if (delaySec <= 0) {
            setIsWindowHidden(true);
          } else {
            blurTimer = setTimeout(() => {
              if (document.visibilityState === 'hidden') {
                setIsWindowHidden(true);
              }
            }, delaySec * 1000);
          }
        }
        if (securitySettings.isAppLockEnabled && securitySettings.autoLockDelay === 0) {
          setIsAppLocked(true);
        }
      } else {
        // Tab restored to active - cancel any pending blur timer
        if (blurTimer) {
          clearTimeout(blurTimer);
          blurTimer = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [securitySettings.isBackgroundBlurEnabled, securitySettings.backgroundBlurDelay, securitySettings.isAppLockEnabled, securitySettings.autoLockDelay]);

  // Keyboard shortcut: Shift + P to toggle privacy mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        togglePrivacyMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePrivacyMode]);

  // Emergency panic wipe
  const wipeAllData = useCallback(() => {
    clearAllLocalStorage();
    setTransactions([]);
    setBudget(INITIAL_BUDGET);
    setBabyInfo(INITIAL_BABY_INFO);
    setCouple(INITIAL_COUPLE_PROFILE);
    setRoomPasswordState('');
    setSecuritySettingsState(INITIAL_SECURITY_SETTINGS);
    setIsAppLocked(false);
    showToast('所有本機資料已徹底抹除銷毀！');
  }, [showToast]);

    // Handle Theme switching and root element style
  const currentTheme = THEMES[themeId] || THEMES.linen;
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const isDark = themeMode === 'dark';
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Set data-theme attribute on root for CSS palette switching
    root.setAttribute('data-theme', themeId);

    // Apply CSS variables for dynamic theming
    const c = isDark ? (currentTheme.darkColors || currentTheme.colors) : currentTheme.colors;
    root.style.setProperty('--color-bg', c.bg);
    root.style.setProperty('--color-card', c.card);
    root.style.setProperty('--color-card-subtle', c.cardSubtle);
    root.style.setProperty('--color-border', c.border);
    root.style.setProperty('--color-primary', c.primary);
    root.style.setProperty('--color-primary-hover', c.primaryHover);
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-text-muted', c.textMuted);

    // Set clean body background and text
    body.style.backgroundColor = c.bg;
    body.style.color = c.text;

    // Update mobile browser address bar / notch theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0f172a' : c.primary);
    }
  }, [themeId, themeMode, currentTheme]);

  // Cross-tab broadcast listener
  useEffect(() => {
    const unsubscribe = subscribeToLocalBroadcast((event: any) => {
      if (!event || !event.type) return;
      if (event.type === 'SYNC_STATE_UPDATED') {
        const payload = event.payload;
        if (payload?.transactions) setTransactions(payload.transactions);
        if (payload?.budget) setBudget(payload.budget);
        if (payload?.babyInfo) setBabyInfo(payload.babyInfo);
        if (payload?.couple) setCouple(payload.couple);
      }
    });
    return unsubscribe;
  }, []);

  // Push local updates to server (sync helper)
  const isSyncingRef = useRef(false);
  const pushToServer = useCallback(
    async (
      customTransactions?: Transaction[],
      customBudget?: MonthlyBudget,
      customBaby?: BabyInfo,
      customCouple?: CoupleProfile
    ) => {
      if (!syncState.roomId || isSyncingRef.current) return false;
      isSyncingRef.current = true;
      setSyncState(prev => ({ ...prev, status: 'syncing' }));

      try {
        const txs = customTransactions ?? transactionsRef.current;
        const bgt = customBudget ?? budgetRef.current;
        const baby = customBaby ?? babyInfoRef.current;
        const cpl = customCouple ?? coupleRef.current;
        const updater = cpl.currentRole === 'dad' ? cpl.dadName : cpl.momName;

        const payload: SyncPayload = {
          transactions: txs,
          budgets: bgt,
          babyInfo: baby,
          familySettings: { couple: cpl },
          updatedBy: updater,
          version: syncState.version + 1,
        };

        const res = await pushRoomSyncState(syncState.roomId, payload, roomPassword || undefined);

        if (res.success) {
          const now = res.lastUpdatedAt || Date.now();
          setSyncState(prev => ({
            ...prev,
            status: 'synced',
            lastSyncedAt: now,
            lastSyncedBy: updater,
            version: prev.version + 1,
          }));
          saveToLocalStorage(StorageKeys.LAST_SYNC_TIME, now);
          broadcastLocalChange('SYNC_STATE_UPDATED', {
            transactions: txs,
            budget: bgt,
            babyInfo: baby,
            couple: cpl,
          });
          return true;
        } else {
          if (res.isPasswordProtected) {
            showToast('此房間受密碼保護，請至「安全中心」設定相應房間密碼！');
          }
          setSyncState(prev => ({ ...prev, status: 'error', errorMessage: res.error }));
          return false;
        }
      } catch (err: any) {
        setSyncState(prev => ({ ...prev, status: 'error', errorMessage: err?.message || '同步異常' }));
        return false;
      } finally {
        isSyncingRef.current = false;
      }
    },
    [syncState.roomId, syncState.version, roomPassword, showToast]
  );

  // Helper for non-destructive intelligent state merge from server
  const mergeRemoteData = useCallback(
    (remoteData: any, remoteTime: number, remoteUpdater?: string) => {
      if (!remoteData || typeof remoteData !== 'object') return;

      let needsPushBack = false;

      // 1. Transactions merge: Respect deleted items and latest changes
      if (Array.isArray(remoteData.transactions)) {
        const deletedIds = new Set(trashItemsRef.current.map(t => t.transaction.id));
        setTransactions(prevLocal => {
          const localMap = new Map(prevLocal.filter(t => !deletedIds.has(t.id)).map(t => [t.id, t]));
          let hasChanges = false;

          // If remote is newer and has fewer items, remote may have deletions
          const isRemoteNewer = remoteTime > (localMap.size > 0 ? 0 : 0);

          remoteData.transactions.forEach((rtx: Transaction) => {
            if (!rtx || !rtx.id) return;
            // Never resurrect locally deleted items
            if (deletedIds.has(rtx.id)) return;

            const localTx = localMap.get(rtx.id);
            if (!localTx) {
              localMap.set(rtx.id, rtx);
              hasChanges = true;
            } else {
              const rTime = rtx.updatedAt || rtx.createdAt || 0;
              const lTime = localTx.updatedAt || localTx.createdAt || 0;
              if (rTime > lTime) {
                localMap.set(rtx.id, rtx);
                hasChanges = true;
              }
            }
          });

          // Check if local has items remote doesn't have (and aren't deleted)
          const remoteIds = new Set(remoteData.transactions.map((t: any) => t.id));
          const localOnly = prevLocal.filter(t => !remoteIds.has(t.id) && !deletedIds.has(t.id));
          if (localOnly.length > 0 && !isRemoteNewer) {
            needsPushBack = true;
          }

          if (hasChanges || prevLocal.some(t => deletedIds.has(t.id))) {
            const merged = Array.from(localMap.values())
              .filter(t => !deletedIds.has(t.id))
              .sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              });
            saveToLocalStorage(StorageKeys.TRANSACTIONS, merged);
            return merged;
          }
          return prevLocal;
        });
      }

      // 2. Budget merge: only if valid categoryBudgets exist
      if (
        remoteData.budgets &&
        typeof remoteData.budgets === 'object' &&
        Object.keys(remoteData.budgets).length > 0 &&
        remoteData.budgets.totalBudget !== undefined &&
        remoteData.budgets.categoryBudgets
      ) {
        setBudget(prev => {
          const next = { ...prev, ...remoteData.budgets };
          saveToLocalStorage(StorageKeys.BUDGET, next);
          return next;
        });
      }

      // 3. Baby info merge: only if valid name exists
      if (remoteData.babyInfo && typeof remoteData.babyInfo === 'object' && remoteData.babyInfo.name) {
        setBabyInfo(prev => {
          const next = { ...prev, ...remoteData.babyInfo };
          saveToLocalStorage(StorageKeys.BABY_INFO, next);
          return next;
        });
      }

      // 4. Couple profile merge: only if valid dadName exists
      if (
        remoteData.familySettings?.couple &&
        typeof remoteData.familySettings.couple === 'object' &&
        remoteData.familySettings.couple.dadName
      ) {
        setCouple(prev => {
          const remoteCouple = remoteData.familySettings.couple;
          const next = {
            ...prev,
            ...remoteCouple,
            currentRole: prev.currentRole, // Preserve active role on this device
            monthlySalaries: {
              ...(prev.monthlySalaries || {}),
              ...(remoteCouple.monthlySalaries || {}),
            },
          };
          saveToLocalStorage(StorageKeys.COUPLE, next);
          return next;
        });
      }

      setSyncState(prev => ({
        ...prev,
        status: 'synced',
        lastSyncedAt: remoteTime,
        lastSyncedBy: remoteUpdater || prev.lastSyncedBy,
        version: remoteData.version || prev.version + 1,
      }));
      saveToLocalStorage(StorageKeys.LAST_SYNC_TIME, remoteTime);

      if (needsPushBack) {
        setTimeout(() => pushToServer(), 300);
      }
    },
    [pushToServer]
  );

  // Manual Trigger Sync Now
  const syncNow = useCallback(async () => {
    if (!syncState.roomId) {
      showToast('請先設定或加入家庭房間代碼！');
      return false;
    }
    setSyncState(prev => ({ ...prev, status: 'syncing' }));

    const remote = await fetchRoomSyncState(syncState.roomId, roomPassword || undefined);
    if (remote.isPasswordProtected) {
      setSyncState(prev => ({ ...prev, status: 'error', errorMessage: remote.error }));
      showToast('房間受密碼保護，請至「安全中心」輸入存取密碼！');
      return false;
    }

    if (remote.found && remote.data) {
      mergeRemoteData(remote.data, remote.data.lastUpdatedAt || Date.now(), remote.data.lastUpdatedBy);
      showToast(`已成功同步房間 [${syncState.roomId}] 雙方最新帳務！`);
      return true;
    } else {
      const success = await pushToServer();
      if (success) {
        showToast(`已建立並上傳家庭帳本到房間 [${syncState.roomId}]！`);
      } else {
        showToast('同步伺服器連線異常，已切換離線模式保存。');
      }
      return success;
    }
  }, [syncState.roomId, roomPassword, mergeRemoteData, pushToServer, showToast]);

  // Immediate Startup Sync (Restores memory on app reload/reopen)
  useEffect(() => {
    let isMounted = true;
    const initSync = async () => {
      try {
        const queryRoom = typeof window !== 'undefined'
          ? (new URLSearchParams(window.location.search).get('room') || new URLSearchParams(window.location.search).get('r'))
          : null;
        const targetRoom = queryRoom && queryRoom.trim() ? queryRoom.trim().toUpperCase() : syncState.roomId;

        if (queryRoom && queryRoom.trim()) {
          saveToLocalStorage(StorageKeys.ROOM_ID, targetRoom);
          if (syncState.roomId !== targetRoom) {
            setSyncState(prev => ({ ...prev, roomId: targetRoom }));
          }
          showToast(`已透過夫妻專屬邀請連結連線至家庭房間 [${targetRoom}]！`);
        }
        if (typeof window !== 'undefined' && targetRoom) {
          const url = new URL(window.location.href);
          if (url.searchParams.get('room') !== targetRoom) {
            url.searchParams.set('room', targetRoom);
            window.history.replaceState({}, '', url.toString());
          }
        }

        const remote = await fetchRoomSyncState(targetRoom, roomPassword || undefined);
        if (!isMounted) return;

        if (remote.found && remote.data) {
          mergeRemoteData(remote.data, remote.data.lastUpdatedAt || Date.now(), remote.data.lastUpdatedBy);
        } else {
          // Push initial local data to server so server disk always has data
          await pushToServer();
        }
      } catch (e) {
        console.warn('Initial sync notice:', e);
      }
    };

    initSync();
    return () => {
      isMounted = false;
    };
  }, [syncState.roomId, roomPassword, mergeRemoteData, pushToServer, showToast]);

  // Real-time Firestore onSnapshot synchronization for couple shared ledger
  useEffect(() => {
    const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
    let isSubscribed = true;
    isFirstFirestoreLoadRef.current = true;

    // Verify Firestore connection on mount
    testFirestoreConnection().catch(() => {});

    // 1. Real-time onSnapshot listener for transactions
    const unsubTransactions = subscribeToRoomTransactions(
      safeRoomId,
      (remoteTxs) => {
        if (!isSubscribed) return;
        const isFirstLoad = isFirstFirestoreLoadRef.current;
        isFirstFirestoreLoadRef.current = false;

        const deletedIds = new Set(trashItemsRef.current.map(t => t.transaction.id));
        const currentLocal = transactionsRef.current;

        if (remoteTxs && remoteTxs.length > 0) {
          const localMap = new Map(currentLocal.filter(t => !deletedIds.has(t.id)).map(t => [t.id, t]));
          let hasDiff = false;
          let newRemoteCount = 0;

          // Merge remote transactions
          for (const rtx of remoteTxs) {
            if (!rtx || !rtx.id || deletedIds.has(rtx.id)) continue;
            const ltx = localMap.get(rtx.id);
            if (!ltx) {
              localMap.set(rtx.id, rtx);
              hasDiff = true;
              newRemoteCount++;
            } else {
              const rTime = rtx.updatedAt || rtx.createdAt || 0;
              const lTime = ltx.updatedAt || ltx.createdAt || 0;
              if (rTime > lTime) {
                localMap.set(rtx.id, rtx);
                hasDiff = true;
              }
            }
          }

          // Non-destructive preservation: Keep any non-deleted local transactions not yet in Firestore
          const remoteIds = new Set(remoteTxs.map(t => t.id));
          const localOnly = currentLocal.filter(t => !remoteIds.has(t.id) && !deletedIds.has(t.id));
          if (localOnly.length > 0) {
            localOnly.forEach(t => localMap.set(t.id, t));
            // Automatically backup un-synced local transactions to Firestore room
            bulkUploadTransactionsToFirestore(safeRoomId, localOnly);
          }

          const merged = Array.from(localMap.values()).sort((a, b) => {
            const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return (b.createdAt || 0) - (a.createdAt || 0);
          });

          if (hasDiff || isFirstLoad || currentLocal.length !== merged.length) {
            setTransactions(merged);
            saveToLocalStorage(StorageKeys.TRANSACTIONS, merged);
            setSyncState(prev => ({
              ...prev,
              status: 'synced',
              lastSyncedAt: Date.now(),
            }));
            if (!isFirstLoad && newRemoteCount > 0) {
              const partnerRole =
                coupleRef.current.currentRole === 'dad' ? coupleRef.current.momName : coupleRef.current.dadName;
              showToast(`伴侶 (${partnerRole || '對方'}) 剛剛同步了 ${newRemoteCount} 筆帳務！`);
            }
          } else {
            setSyncState(prev => ({
              ...prev,
              status: 'synced',
            }));
          }
        } else if (remoteTxs.length === 0) {
          // If remote Firestore has 0 transactions but local has transactions:
          // NEVER wipe local transactions! Back them up to Firestore room instead.
          if (currentLocal.length > 0) {
            bulkUploadTransactionsToFirestore(safeRoomId, currentLocal);
            writeRoomMetaToFirestore(safeRoomId, {
              budget: budgetRef.current,
              babyInfo: babyInfoRef.current,
              familySettings: { couple: coupleRef.current },
              updatedBy: coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName,
            });
          }
          setSyncState(prev => ({
            ...prev,
            status: 'synced',
            lastSyncedAt: Date.now(),
          }));
        }
      },
      (err) => {
        console.warn('Firestore transaction sync notice:', err);
      }
    );

    // 2. Real-time onSnapshot listener for room metadata (budget, babyInfo, couple profile, and instant deletion broadcast)
    const unsubMeta = subscribeToRoomMeta(
      safeRoomId,
      (meta) => {
        if (!isSubscribed || !meta) return;

        // Immediate deletion broadcast from partner
        if (meta.lastDeletedTxId && meta.lastDeletedAt) {
          const delId = meta.lastDeletedTxId;
          const current = transactionsRef.current;
          if (current.some(t => t.id === delId)) {
            const next = current.filter(t => t.id !== delId);
            setTransactions(next);
            saveToLocalStorage(StorageKeys.TRANSACTIONS, next);
            // Track in local trash as well so it's never resurrected
            setTrashItems(prev => {
              if (prev.some(tr => tr.transaction.id === delId)) return prev;
              const found = current.find(t => t.id === delId);
              if (!found) return prev;
              const nextTrash: TrashItem[] = [
                {
                  id: `trash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  deletedAt: meta.lastDeletedAt || Date.now(),
                  transaction: found,
                },
                ...prev,
              ].slice(0, 50);
              saveToLocalStorage(StorageKeys.TRASH, nextTrash);
              return nextTrash;
            });
            const partnerRole =
              coupleRef.current.currentRole === 'dad' ? coupleRef.current.momName : coupleRef.current.dadName;
            showToast(`伴侶 (${partnerRole || '對方'}) 剛剛刪除了一筆帳務，已即時同步！`);
          }
        }

        if (meta.budget && typeof meta.budget === 'object' && meta.budget.totalBudget !== undefined) {
          setBudget(prev => {
            const next = { ...prev, ...meta.budget };
            saveToLocalStorage(StorageKeys.BUDGET, next);
            return next;
          });
        }
        if (meta.babyInfo && typeof meta.babyInfo === 'object' && meta.babyInfo.name) {
          setBabyInfo(prev => {
            const next = { ...prev, ...meta.babyInfo };
            saveToLocalStorage(StorageKeys.BABY_INFO, next);
            return next;
          });
        }
        if (meta.familySettings?.couple && typeof meta.familySettings.couple === 'object') {
          setCouple(prev => {
            const remoteCouple = meta.familySettings!.couple;
            const next = {
              ...prev,
              ...remoteCouple,
              currentRole: prev.currentRole, // Preserve active perspective
              monthlySalaries: {
                ...(prev.monthlySalaries || {}),
                ...(remoteCouple.monthlySalaries || {}),
              },
            };
            saveToLocalStorage(StorageKeys.COUPLE, next);
            return next;
          });
        }
      },
      (err) => {
        console.warn('Firestore meta sync notice:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubTransactions();
      unsubMeta();
    };
  }, [syncState.roomId, showToast]);

  // Fallback Polling loop for server redundancy
  useEffect(() => {
    if (!syncState.isAutoSync || !syncState.roomId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      if (isSyncingRef.current) return;
      try {
        const remote = await fetchRoomSyncState(syncState.roomId, roomPassword || undefined);
        if (!isMounted || remote.isPasswordProtected) return;

        if (remote.found && remote.data) {
          const r = remote.data;
          const remoteTime = r.lastUpdatedAt || 0;
          const localTime = syncState.lastSyncedAt || 0;

          if (remoteTime > localTime + 1000) {
            mergeRemoteData(r, remoteTime, r.lastUpdatedBy);
          }
        }
      } catch (e) {
        // quiet background fail
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [syncState.isAutoSync, syncState.roomId, syncState.lastSyncedAt, roomPassword, mergeRemoteData]);

  // Transactions CRUD with real-time Firestore mutations
  const addTransaction = useCallback(
    (txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newTx: Transaction = {
        ...txData,
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;

      // Real-time Firestore write
      writeTransactionToFirestore(safeRoomId, newTx);
      writeRoomMetaToFirestore(safeRoomId, { updatedBy: updater });

      setTransactions(prev => {
        const next = [newTx, ...prev].sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        saveToLocalStorage(StorageKeys.TRANSACTIONS, next);
        broadcastLocalChange('SYNC_STATE_UPDATED', {
          transactions: next,
          budget: budgetRef.current,
          babyInfo: babyInfoRef.current,
          couple: coupleRef.current,
        });
        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(next), 100);
        }
        return next;
      });
      showToast(`已成功記下一筆【${txData.title}】$${txData.amount.toLocaleString()}`);
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const updateTransaction = useCallback(
    (id: string, partial: Partial<Transaction>) => {
      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;

      setTransactions(prev => {
        const next = prev.map(t => {
          if (t.id === id) {
            const updated = { ...t, ...partial, updatedAt: Date.now() };
            writeTransactionToFirestore(safeRoomId, updated);
            return updated;
          }
          return t;
        }).sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
        saveToLocalStorage(StorageKeys.TRANSACTIONS, next);
        broadcastLocalChange('SYNC_STATE_UPDATED', {
          transactions: next,
          budget: budgetRef.current,
          babyInfo: babyInfoRef.current,
          couple: coupleRef.current,
        });
        writeRoomMetaToFirestore(safeRoomId, { updatedBy: updater });
        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(next), 100);
        }
        return next;
      });
      showToast('記帳資料已更新！');
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;

      // Real-time Firestore delete with updater attribution for instant broadcast
      deleteTransactionFromFirestore(safeRoomId, id, updater);

      let removedTx: Transaction | undefined;
      setTransactions(prev => {
        removedTx = prev.find(t => t.id === id);
        const next = prev.filter(t => t.id !== id);
        saveToLocalStorage(StorageKeys.TRANSACTIONS, next);
        broadcastLocalChange('SYNC_STATE_UPDATED', {
          transactions: next,
          budget: budgetRef.current,
          babyInfo: babyInfoRef.current,
          couple: coupleRef.current,
        });
        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(next), 100);
        }
        return next;
      });

      if (removedTx) {
        const item = removedTx;
        setTrashItems(prev => {
          const nextTrash: TrashItem[] = [
            {
              id: `trash_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              deletedAt: Date.now(),
              transaction: item,
            },
            ...prev,
          ].slice(0, 50);
          saveToLocalStorage(StorageKeys.TRASH, nextTrash);
          return nextTrash;
        });
        showToast(`已刪除帳務「${removedTx.title}」！`);
      }
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const restoreTrashItem = useCallback(
    (trashId: string) => {
      const found = trashItems.find(t => t.id === trashId);
      if (!found) return;

      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;

      writeTransactionToFirestore(safeRoomId, found.transaction);
      writeRoomMetaToFirestore(safeRoomId, { updatedBy: updater });

      setTransactions(prev => {
        const next = [found.transaction, ...prev.filter(t => t.id !== found.transaction.id)];
        saveToLocalStorage(StorageKeys.TRANSACTIONS, next);
        broadcastLocalChange('SYNC_STATE_UPDATED', {
          transactions: next,
          budget: budgetRef.current,
          babyInfo: babyInfoRef.current,
          couple: coupleRef.current,
        });
        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(next), 100);
        }
        return next;
      });

      setTrashItems(prev => {
        const nextTrash = prev.filter(t => t.id !== trashId);
        saveToLocalStorage(StorageKeys.TRASH, nextTrash);
        return nextTrash;
      });

      showToast(`已成功救回【${found.transaction.title}】$${found.transaction.amount.toLocaleString()}！`);
    },
    [trashItems, syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const permanentlyDeleteTrashItem = useCallback(
    (trashId: string) => {
      setTrashItems(prev => {
        const next = prev.filter(t => t.id !== trashId);
        saveToLocalStorage(StorageKeys.TRASH, next);
        return next;
      });
      showToast('已自回收區徹底清除');
    },
    [showToast]
  );

  const clearAllTrash = useCallback(() => {
    setTrashItems([]);
    saveToLocalStorage(StorageKeys.TRASH, []);
    showToast('已清空回收區所有記錄');
  }, [showToast]);

  const createLocalSnapshot = useCallback(
    (reason?: string) => {
      const snapshot: LocalSnapshotItem = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        reason: reason || `本機防遺失歷史快照 (${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })})`,
        transactionCount: transactions.length,
        data: {
          transactions,
          budget,
          babyInfo,
          couple,
        },
      };
      setLocalSnapshots(prev => {
        const next = [snapshot, ...prev].slice(0, 15);
        saveToLocalStorage(StorageKeys.LOCAL_SNAPSHOTS, next);
        return next;
      });
      showToast('已建立本機防遺失快照點！');
    },
    [transactions, budget, babyInfo, couple, showToast]
  );

  const restoreLocalSnapshot = useCallback(
    (snapshotId: string): boolean => {
      const snapshot = localSnapshots.find(s => s.id === snapshotId);
      if (!snapshot) {
        showToast('找不到該快照點');
        return false;
      }
      const { transactions: txs, budget: bgt, babyInfo: baby, couple: cpl } = snapshot.data;
      if (txs) setTransactions(txs);
      if (bgt) setBudget(bgt);
      if (baby) setBabyInfo(baby);
      if (cpl) setCouple(cpl);
      if (syncState.isAutoSync && syncState.roomId) {
        setTimeout(() => pushToServer(txs, bgt, baby, cpl), 100);
      }
      showToast(`已成功還原至快照【${snapshot.reason}】！`);
      return true;
    },
    [localSnapshots, syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const deleteLocalSnapshot = useCallback(
    (snapshotId: string) => {
      setLocalSnapshots(prev => {
        const next = prev.filter(s => s.id !== snapshotId);
        saveToLocalStorage(StorageKeys.LOCAL_SNAPSHOTS, next);
        return next;
      });
      showToast('已刪除該本機快照點');
    },
    [showToast]
  );

  // Budget
  const updateBudget = useCallback(
    (newBudget: MonthlyBudget) => {
      setBudget(newBudget);
      saveToLocalStorage(StorageKeys.BUDGET, newBudget);
      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;
      writeRoomMetaToFirestore(safeRoomId, { budget: newBudget, updatedBy: updater });

      if (syncState.isAutoSync && syncState.roomId) {
        setTimeout(() => pushToServer(transactionsRef.current, newBudget, babyInfoRef.current, coupleRef.current), 100);
      }
      showToast('每月預算設定已儲存！');
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  // Baby info
  const updateBabyInfo = useCallback(
    (info: BabyInfo) => {
      setBabyInfo(info);
      saveToLocalStorage(StorageKeys.BABY_INFO, info);
      const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
      const updater = coupleRef.current.currentRole === 'dad' ? coupleRef.current.dadName : coupleRef.current.momName;
      writeRoomMetaToFirestore(safeRoomId, { babyInfo: info, updatedBy: updater });

      if (syncState.isAutoSync && syncState.roomId) {
        setTimeout(() => pushToServer(transactionsRef.current, budgetRef.current, info, coupleRef.current), 100);
      }
      showToast('寶寶資料已更新！');
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  // Couple profile & Role switch
  const switchRole = useCallback((role: 'dad' | 'mom') => {
    setCouple(prev => ({ ...prev, currentRole: role }));
  }, []);

  const updateCouple = useCallback(
    (profile: Partial<CoupleProfile>) => {
      setCouple(prev => {
        const next = { ...prev, ...profile };
        saveToLocalStorage(StorageKeys.COUPLE, next);
        const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
        const updater = next.currentRole === 'dad' ? next.dadName : next.momName;
        writeRoomMetaToFirestore(safeRoomId, { familySettings: { couple: next }, updatedBy: updater });

        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(transactionsRef.current, budgetRef.current, babyInfoRef.current, next), 100);
        }
        return next;
      });
      showToast('家庭成員設定已更新！');
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const saveMonthlySalary = useCallback(
    (month: string, role: 'dad' | 'mom', amount: number) => {
      setCouple(prev => {
        const existing = prev.monthlySalaries?.[month] || {
          month,
          dadSalary: prev.dadSalary ?? 40000,
          momSalary: prev.momSalary ?? 31000,
          dadSubmitted: false,
          momSubmitted: false,
        };
        const updatedRecord: MonthlySalaryRecord = {
          ...existing,
          dadSalary: role === 'dad' ? amount : existing.dadSalary,
          momSalary: role === 'mom' ? amount : existing.momSalary,
          dadSubmitted: role === 'dad' ? true : existing.dadSubmitted,
          momSubmitted: role === 'mom' ? true : existing.momSubmitted,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        const nextMonthly = {
          ...(prev.monthlySalaries || {}),
          [month]: updatedRecord,
        };
        const next = { ...prev, monthlySalaries: nextMonthly };
        saveToLocalStorage(StorageKeys.COUPLE, next);

        const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
        const updater = next.currentRole === 'dad' ? next.dadName : next.momName;
        writeRoomMetaToFirestore(safeRoomId, { familySettings: { couple: next }, updatedBy: updater });

        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(undefined, undefined, undefined, next), 100);
        }
        return next;
      });
      const roleLabel = role === 'dad' ? couple.dadName : couple.momName;
      showToast(`已成功記錄 ${month} ${roleLabel} 薪水 NT$ ${amount.toLocaleString()}！`);
    },
    [couple.dadName, couple.momName, syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  const saveBothMonthlySalaries = useCallback(
    (month: string, dadSalary: number, momSalary: number) => {
      setCouple(prev => {
        const updatedRecord: MonthlySalaryRecord = {
          month,
          dadSalary,
          momSalary,
          dadSubmitted: true,
          momSubmitted: true,
          updatedAt: new Date().toISOString().slice(0, 10),
        };
        const nextMonthly = {
          ...(prev.monthlySalaries || {}),
          [month]: updatedRecord,
        };
        const next = { ...prev, monthlySalaries: nextMonthly };
        saveToLocalStorage(StorageKeys.COUPLE, next);

        const safeRoomId = sanitizeRoomId(syncState.roomId || 'BABY-8823');
        const updater = next.currentRole === 'dad' ? next.dadName : next.momName;
        writeRoomMetaToFirestore(safeRoomId, { familySettings: { couple: next }, updatedBy: updater });

        if (syncState.isAutoSync && syncState.roomId) {
          setTimeout(() => pushToServer(undefined, undefined, undefined, next), 100);
        }
        return next;
      });
      showToast(`已儲存 ${month} 夫妻雙方薪水與平帳比例！`);
    },
    [syncState.isAutoSync, syncState.roomId, pushToServer, showToast]
  );

  // Themes
  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    saveToLocalStorage(StorageKeys.THEME_ID, id);
    const theme = THEMES[id];
    if (theme) {
      showToast(`已切換色彩風格為「${theme.name}」`);
    }
  }, [showToast]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    saveToLocalStorage(StorageKeys.THEME_MODE, mode);
    showToast(mode === 'dark' ? '🌙 已手動切換為夜間深色模式' : '☀️ 已手動切換為質感亮色模式');
  }, [showToast]);

  const toggleThemeMode = useCallback(() => {
    setThemeModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveToLocalStorage(StorageKeys.THEME_MODE, next);
      showToast(next === 'dark' ? '🌙 已手動切換為夜間深色模式' : '☀️ 已手動切換為質感亮色模式');
      return next;
    });
  }, [showToast]);

  // Room pairing code
  const setRoomId = useCallback((newRoomId: string) => {
    let raw = newRoomId.trim();
    if (raw.includes('room=') || raw.includes('r=')) {
      const match = raw.match(/[?&](?:room|r)=([A-Za-z0-9_-]+)/i);
      if (match && match[1]) raw = match[1];
    }
    const clean = sanitizeRoomId(raw);
    isFirstFirestoreLoadRef.current = true;
    saveToLocalStorage(StorageKeys.ROOM_ID, clean);
    setSyncState(prev => ({
      ...prev,
      roomId: clean,
      status: 'syncing',
      lastSyncedAt: null,
    }));
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('room') !== clean) {
        url.searchParams.set('room', clean);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const toggleAutoSync = useCallback(() => {
    setSyncState(prev => ({ ...prev, isAutoSync: !prev.isAutoSync }));
  }, []);

  // Cloud Backup
  const refreshCloudBackups = useCallback(async () => {
    if (!syncState.roomId) return;
    const res = await apiFetchCloudBackups(syncState.roomId, roomPassword || undefined);
    if (res.backups) {
      setCloudBackups(res.backups);
    }
  }, [syncState.roomId, roomPassword]);

  const createBackup = useCallback(
    async (note?: string) => {
      if (!syncState.roomId) {
        showToast('請先加入家庭房間後再進行雲端備份！');
        return false;
      }
      const dataToSave = {
        transactions,
        budget,
        babyInfo,
        couple,
        themeId,
        themeMode,
        backupTime: Date.now(),
      };
      const creator = couple.currentRole === 'dad' ? couple.dadName : couple.momName;
      const res = await apiCreateCloudBackup(
        syncState.roomId,
        dataToSave,
        note || `手動雲端備份 (${new Date().toLocaleString('zh-TW')})`,
        creator,
        roomPassword || undefined
      );
      if (res.success) {
        showToast('雲端數據備份成功！已安全封存至伺服器。');
        await refreshCloudBackups();
        return true;
      } else {
        showToast('備份失敗：' + (res.error || '網路連線異常'));
        return false;
      }
    },
    [syncState.roomId, transactions, budget, babyInfo, couple, themeId, themeMode, roomPassword, refreshCloudBackups, showToast]
  );

  const restoreBackupById = useCallback(
    async (snapshotId: string) => {
      if (!syncState.roomId) return false;
      const res = await apiRestoreCloudBackup(syncState.roomId, snapshotId, roomPassword || undefined);
      if (res.success && res.backup?.data) {
        const d = res.backup.data;
        if (d.transactions) setTransactions(d.transactions);
        if (d.budget) setBudget(d.budget);
        if (d.babyInfo) setBabyInfo(d.babyInfo);
        if (d.couple) setCouple(d.couple);
        showToast('已成功從雲端備份點還原所有帳務與預算！');
        return true;
      }
      showToast('無法還原該備份：' + (res.error || '存取權限受限'));
      return false;
    },
    [syncState.roomId, roomPassword, showToast]
  );

  const restoreFromData = useCallback(
    (data: any): boolean => {
      try {
        if (!data || typeof data !== 'object') return false;
        if (Array.isArray(data.transactions)) {
          setTransactions(data.transactions);
        }
        if (data.budget) setBudget(data.budget);
        if (data.babyInfo) setBabyInfo(data.babyInfo);
        if (data.couple) setCouple(data.couple);
        if (data.themeId && THEMES[data.themeId as ThemeId]) {
          setThemeIdState(data.themeId);
        }
        showToast('本地備份檔案還原成功！');
        return true;
      } catch (e) {
        showToast('還原失敗：檔案格式不正確');
        return false;
      }
    },
    [showToast]
  );

  return (
    <AppContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        budget,
        updateBudget,
        babyInfo,
        updateBabyInfo,
        couple,
        switchRole,
        updateCouple,
        saveMonthlySalary,
        saveBothMonthlySalaries,
        themeId,
        themeMode,
        currentTheme,
        setThemeId,
        setThemeMode,
        toggleThemeMode,
        syncState,
        setRoomId,
        toggleAutoSync,
        syncNow,
        cloudBackups,
        refreshCloudBackups,
        createBackup,
        restoreBackupById,
        restoreFromData,
        trashItems,
        restoreTrashItem,
        permanentlyDeleteTrashItem,
        clearAllTrash,
        localSnapshots,
        createLocalSnapshot,
        restoreLocalSnapshot,
        deleteLocalSnapshot,
        securitySettings,
        updateSecuritySettings,
        isPrivacyMode: securitySettings.isPrivacyMode,
        togglePrivacyMode,
        isAppLocked,
        lockApp,
        unlockApp,
        roomPassword,
        setRoomPassword,
        isWindowHidden,
        restoreWindowVisibility,
        formatAmount,
        maskBabyName,
        wipeAllData,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
