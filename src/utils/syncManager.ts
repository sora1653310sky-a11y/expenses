import { BabyInfo, CloudBackupItem, CoupleProfile, MonthlyBudget, Transaction } from '../types';

export interface SyncPayload {
  transactions: Transaction[];
  budgets: MonthlyBudget;
  babyInfo: BabyInfo;
  familySettings: {
    couple: CoupleProfile;
  };
  updatedBy: string;
  version: number;
}

const LOCAL_STORAGE_KEYS = {
  TRANSACTIONS: 'baby_ledger_transactions_v2',
  BUDGET: 'baby_ledger_budget_v2',
  BABY_INFO: 'baby_ledger_baby_v2',
  COUPLE: 'baby_ledger_couple_v2',
  THEME_ID: 'baby_ledger_theme_id_v2',
  THEME_MODE: 'baby_ledger_theme_mode_v2',
  ROOM_ID: 'baby_ledger_room_id_v2',
  ROOM_PASSWORD: 'baby_ledger_room_password_v2',
  AUTO_SYNC: 'baby_ledger_auto_sync_v2',
  LAST_SYNC_TIME: 'baby_ledger_last_sync_time_v2',
  SECURITY: 'baby_ledger_security_settings_v2',
  TRASH: 'baby_ledger_trash_v2',
  LOCAL_SNAPSHOTS: 'baby_ledger_snapshots_v2',
};

// BroadcastChannel for cross-tab instant synchronization
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('baby_ledger_sync_channel');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported in this environment');
}

export function subscribeToLocalBroadcast(callback: (event: any) => void) {
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    callback(event.data);
  };
  channel.addEventListener('message', handler);
  return () => {
    channel?.removeEventListener('message', handler);
  };
}

export function broadcastLocalChange(type: string, payload?: any) {
  if (channel) {
    channel.postMessage({ type, payload, timestamp: Date.now() });
  }
}

// Local storage helpers
export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage:`, e);
  }
}

export function clearAllLocalStorage(): void {
  try {
    Object.values(LOCAL_STORAGE_KEYS).forEach(k => {
      localStorage.removeItem(k);
    });
  } catch (e) {
    console.error('Error clearing localStorage:', e);
  }
}

export const StorageKeys = LOCAL_STORAGE_KEYS;

// API calls to full-stack Express server
export async function fetchRoomSyncState(
  roomId: string,
  password?: string
): Promise<{ found: boolean; isPasswordProtected?: boolean; hasPassword?: boolean; data?: any; error?: string }> {
  try {
    const headers: Record<string, string> = {};
    if (password) headers['x-room-password'] = password;

    const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}`, { headers });
    const json = await res.json();
    return {
      found: Boolean(json.found),
      isPasswordProtected: Boolean(json.isPasswordProtected),
      hasPassword: Boolean(json.hasPassword),
      data: json.data || (json.found ? json : null),
      error: json.error,
    };
  } catch (err: any) {
    return { found: false, error: err.message || '網路同步請求失敗' };
  }
}

export async function pushRoomSyncState(
  roomId: string,
  payload: SyncPayload,
  password?: string,
  newPassword?: string
): Promise<{ success: boolean; isPasswordProtected?: boolean; hasPassword?: boolean; error?: string; lastUpdatedAt?: number }> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (password) headers['x-room-password'] = password;

    const res = await fetch(`/api/sync/${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...payload, password, newPassword }),
    });
    const result = await res.json();
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || '雲端同步上傳失敗' };
  }
}

export async function createCloudBackup(roomId: string, data: any, note: string, createdBy: string, password?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (password) headers['x-room-password'] = password;

    const res = await fetch(`/api/backup/${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data, note, createdBy }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchCloudBackups(roomId: string, password?: string): Promise<{ backups: CloudBackupItem[]; isPasswordProtected?: boolean }> {
  try {
    const headers: Record<string, string> = {};
    if (password) headers['x-room-password'] = password;

    const res = await fetch(`/api/backup/${encodeURIComponent(roomId)}`, { headers });
    return await res.json();
  } catch (err) {
    return { backups: [] };
  }
}

export async function restoreCloudBackup(roomId: string, snapshotId: string, password?: string) {
  try {
    const headers: Record<string, string> = {};
    if (password) headers['x-room-password'] = password;

    const res = await fetch(`/api/backup/${encodeURIComponent(roomId)}/${encodeURIComponent(snapshotId)}`, { headers });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Download full state as standalone JSON backup file
export function exportJsonBackupFile(data: any, fileNamePrefix: string = '萌寶記帳_雲端安全備份') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${fileNamePrefix}_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
