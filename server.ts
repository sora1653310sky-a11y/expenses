import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

// Persistent storage file paths
const DATA_DIR = path.resolve(__dirname, 'data');
const STORAGE_FILE = path.resolve(DATA_DIR, 'cloud_memory.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory + Disk persistent stores
let roomStore: Record<string, RoomSyncPayload> = {};
let roomPasswords: Record<string, string> = {}; // roomId -> password
let backupStore: Record<string, Array<{ id: string; timestamp: number; note: string; data: any }>> = {};

// Load existing persisted data on startup
try {
  if (fs.existsSync(STORAGE_FILE)) {
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.roomStore) roomStore = parsed.roomStore;
    if (parsed.roomPasswords) roomPasswords = parsed.roomPasswords;
    if (parsed.backupStore) backupStore = parsed.backupStore;
    console.log(`[Storage] Loaded persistent cloud memory: ${Object.keys(roomStore).length} rooms, ${Object.keys(backupStore).length} backup stores.`);
  }
} catch (err) {
  console.warn('[Storage] Failed to read storage file, initializing fresh:', err);
}

// Debounced or immediate save to disk
let saveTimeout: NodeJS.Timeout | null = null;
function persistDataToDisk(immediate = false) {
  if (saveTimeout) clearTimeout(saveTimeout);
  const doSave = () => {
    try {
      const payload = {
        savedAt: Date.now(),
        roomStore,
        roomPasswords,
        backupStore,
      };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`[Storage] Saved cloud memory to disk (${Object.keys(roomStore).length} rooms)`);
    } catch (e) {
      console.error('[Storage] Error persisting cloud memory to disk:', e);
    }
  };

  if (immediate) {
    doSave();
  } else {
    saveTimeout = setTimeout(doSave, 150);
  }
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to check room password
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

// Sync endpoint: Get current room state
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

// Sync endpoint: Push updates to room state
app.post('/api/sync/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { transactions, budgets, babyInfo, familySettings, updatedBy, version, password, newPassword } = req.body;

  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({
      success: false,
      isPasswordProtected: true,
      hasPassword: true,
      error: auth.reason,
    });
  }

  // Update or set room password if specified
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

  // Accept valid transactions array (safeguard against resetting existing transactions to empty)
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

  persistDataToDisk(true);

  return res.json({
    success: true,
    lastUpdatedAt: now,
    version: newVersion,
    roomId,
    hasPassword: !!roomPasswords[roomId],
  });
});

// Cloud Backup endpoint: save snapshot
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
  // Keep up to 20 snapshots
  if (backupStore[roomId].length > 20) {
    backupStore[roomId] = backupStore[roomId].slice(0, 20);
  }

  persistDataToDisk();

  return res.json({ success: true, snapshotId: snapshot.id, totalBackups: backupStore[roomId].length });
});

// Cloud Backup endpoint: list snapshots
app.get('/api/backup/:roomId', (req: Request, res: Response) => {
  const { roomId } = req.params;
  const auth = verifyRoomAuth(req, roomId);
  if (!auth.authorized) {
    return res.status(401).json({ error: auth.reason, isPasswordProtected: true });
  }

  const backups = backupStore[roomId] || [];
  // Return metadata without giant payload for listing
  const list = backups.map(b => ({
    id: b.id,
    timestamp: b.timestamp,
    note: b.note,
    dataSize: JSON.stringify(b.data).length,
    transactionCount: b.data?.transactions?.length || 0,
  }));
  return res.json({ backups: list });
});

// Cloud Backup endpoint: restore specific snapshot
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

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BabyLedger app server running at http://0.0.0.0:${PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
