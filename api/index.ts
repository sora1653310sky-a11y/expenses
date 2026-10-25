import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(express.json({ limit: '15mb' }));

interface RoomSyncPayload {
  transactions: any[];
  budgets: any;
  babyInfo: any;
  familySettings: any;
  lastUpdatedBy: string;
  lastUpdatedAt: number;
  version: number;
  hasPassword?: boolean;
}

const DATA_DIR = process.env.VERCEL ? '/tmp/data' : path.resolve(process.cwd(), 'data');
const STORAGE_FILE = path.resolve(DATA_DIR, 'cloud_memory.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

let roomStore: Record<string, RoomSyncPayload> = {};
let roomPasswords: Record<string, string> = {};
let backupStore: Record<string, Array<{ id: string; timestamp: number; note: string; data: any }>> = {};

try {
  if (fs.existsSync(STORAGE_FILE)) {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.roomStore) roomStore = parsed.roomStore;
    if (parsed.roomPasswords) roomPasswords = parsed.roomPasswords;
    if (parsed.backupStore) backupStore = parsed.backupStore;
  }
} catch (err) {
  // Fresh initialization
}

function persistDataToDisk() {
  try {
    const payload = {
      savedAt: Date.now(),
      roomStore,
      roomPasswords,
      backupStore,
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Storage] Error persisting to disk:', e);
  }
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', serverless: true, time: new Date().toISOString() });
});

function verifyRoomAuth(req: Request, roomId: string): { authorized: boolean; reason?: string } {
  const storedPassword = roomPasswords[roomId];
  if (!storedPassword) return { authorized: true };

  const providedPassword =
    (req.headers['x-room-password'] as string) ||
    (req.query.password as string) ||
    req.body?.password;

  if (!providedPassword) {
    return { authorized: false, reason: '此房間已設定存取密碼保護，請輸入密碼以同步數據' };
  }
  if (providedPassword !== storedPassword) {
    return { authorized: false, reason: '存取密碼不正確，請重新確認' };
  }
  return { authorized: true };
}

app.get('/api/sync/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const room = roomStore[roomId];
  const hasPassword = !!roomPasswords[roomId];

  if (!room) {
    return res.json({ found: false, data: null, hasPassword });
  }

  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({
      found: true,
      isPasswordProtected: true,
      hasPassword: true,
      error: auth.reason,
    });
  }

  return res.json({
    found: true,
    hasPassword,
    data: room,
    ...room,
  });
});

app.post('/api/sync/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { transactions, budgets, babyInfo, familySettings, updatedBy, password, newPassword } = req.body;

  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({
      success: false,
      isPasswordProtected: true,
      hasPassword: true,
      error: auth.reason,
    });
  }

  if (newPassword !== undefined) {
    if (newPassword.trim() === '') {
      delete roomPasswords[roomId];
    } else {
      roomPasswords[roomId] = newPassword.trim();
    }
  } else if (password && !roomPasswords[roomId]) {
    roomPasswords[roomId] = password.trim();
  }

  const current = roomStore[roomId];
  const newVersion = (current?.version || 0) + 1;
  const now = Date.now();

  const validTransactions = Array.isArray(transactions) && (transactions.length > 0 || !current?.transactions?.length)
    ? transactions
    : (current?.transactions || []);

  const validBudgets = budgets && typeof budgets === 'object' && Object.keys(budgets).length > 0 && budgets.totalBudget !== undefined
    ? budgets
    : (current?.budgets || {});

  const validBabyInfo = babyInfo && typeof babyInfo === 'object' && babyInfo.name
    ? babyInfo
    : (current?.babyInfo || {});

  const validFamilySettings = familySettings && typeof familySettings === 'object' && familySettings.couple?.dadName
    ? familySettings
    : (current?.familySettings || {});

  roomStore[roomId] = {
    transactions: validTransactions,
    budgets: validBudgets,
    babyInfo: validBabyInfo,
    familySettings: validFamilySettings,
    lastUpdatedBy: updatedBy || current?.lastUpdatedBy || '家庭成員',
    lastUpdatedAt: now,
    version: newVersion,
    hasPassword: !!roomPasswords[roomId],
  };

  persistDataToDisk();

  return res.json({
    success: true,
    lastUpdatedAt: now,
    version: newVersion,
    roomId,
    hasPassword: !!roomPasswords[roomId],
  });
});

app.post('/api/backup/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({ success: false, isPasswordProtected: true, error: auth.reason });
  }

  const { note, data, createdBy } = req.body;
  if (!backupStore[roomId]) {
    backupStore[roomId] = [];
  }

  const snapshot = {
    id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    note: note || `雲端自動備份 (${new Date().toLocaleString('zh-TW')})`,
    createdBy: createdBy || '使用者',
    data,
  };

  backupStore[roomId].unshift(snapshot);
  if (backupStore[roomId].length > 20) {
    backupStore[roomId] = backupStore[roomId].slice(0, 20);
  }

  persistDataToDisk();
  return res.json({ success: true, snapshotId: snapshot.id, totalBackups: backupStore[roomId].length });
});

app.get('/api/backup/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.reason, isPasswordProtected: true });
  }

  const backups = backupStore[roomId] || [];
  const list = backups.map(b => ({
    id: b.id,
    timestamp: b.timestamp,
    note: b.note,
    dataSize: JSON.stringify(b.data).length,
    transactionCount: b.data?.transactions?.length || 0,
  }));
  return res.json({ backups: list });
});

app.get('/api/backup/:roomId/:snapshotId', (req: Request, res: Response) => {
  const { roomId, snapshotId } = req.params;
  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.reason, isPasswordProtected: true });
  }

  const backups = backupStore[roomId] || [];
  const found = backups.find(b => b.id === snapshotId);
  if (!found) {
    return res.status(404).json({ error: '找不到該備份點' });
  }
  return res.json({ success: true, backup: found });
});

export default app;
