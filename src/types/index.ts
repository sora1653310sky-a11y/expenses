export type TransactionType = 'expense' | 'income';

export type ExpenseCategory =
  | 'nursing'       // 哺育用品
  | 'medical'       // 醫療保健
  | 'food'          // 飲食
  | 'childcare'     // 托育費用
  | 'daily'         // 日常用品
  | 'play'          // 玩樂用品
  | 'other_expense';// 其他支出

export type IncomeCategory =
  | 'subsidy'       // 政府補助
  | 'insurance'     // 保險理賠
  | 'gift'          // 親友贈與
  | 'other_income'; // 其他收入來源

export type CategoryKey = ExpenseCategory | IncomeCategory;

export type MemberRole = 'dad' | 'mom' | 'joint';

export type SplitMethod = 'split_50_50' | 'paid_in_full' | 'joint_fund';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: CategoryKey;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paidBy: MemberRole;
  recordedBy: 'dad' | 'mom';
  splitMethod: SplitMethod;
  note?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CategoryInfo {
  key: CategoryKey;
  name: string;
  type: TransactionType;
  color: string;
  bgLight: string;
  iconName: string;
  description: string;
  presets: string[];
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  totalBudget: number;
  categoryBudgets: Partial<Record<ExpenseCategory, number>>;
}

export interface MonthlySalaryRecord {
  month: string; // YYYY-MM
  dadSalary: number;
  momSalary: number;
  dadSubmitted?: boolean;
  momSubmitted?: boolean;
  updatedAt?: string;
  note?: string;
}

export interface CoupleProfile {
  dadName: string;
  dadAvatar: string;
  dadColor: string;
  dadSalary?: number;
  momName: string;
  momAvatar: string;
  momColor: string;
  momSalary?: number;
  currentRole: 'dad' | 'mom';
  jointFundBalance: number;
  settlementMode?: 'salary_ratio' | 'split_50_50';
  monthlySalaries?: Record<string, MonthlySalaryRecord>;
}

export interface BabyInfo {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'unspecified';
  avatar?: string;
}

export type ThemeId = 'linen' | 'cream' | 'sky' | 'rose' | 'obsidian' | 'morandi';
export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  bg: string;
  card: string;
  cardSubtle: string;
  border: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  isDarkDefault: boolean;
  accentName: string;
  colors: ThemePalette;
  darkColors?: ThemePalette;
}

export interface RoomSyncState {
  roomId: string;
  isAutoSync: boolean;
  lastSyncedAt: number | null;
  lastSyncedBy: string | null;
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  errorMessage?: string;
  version: number;
}

export interface CloudBackupItem {
  id: string;
  timestamp: number;
  note: string;
  transactionCount: number;
  dataSize: number;
}

export interface SecuritySettings {
  isPrivacyMode: boolean; // Hide/blur amounts and sensitive info
  isMaskBabyName: boolean; // Mask baby name to "寶寶" in UI
  isAppLockEnabled: boolean; // PIN lock enabled
  pinCode: string; // 4-6 digit numeric PIN
  autoLockDelay: number; // in seconds: 0 = immediate, 60 = 1 min, 180 = 3 min, 300 = 5 min, -1 = disabled
  isBackgroundBlurEnabled: boolean; // Blur screen when tab inactive / switched
  backgroundBlurDelay?: number; // Delay in seconds before triggering blur (0 = immediate, 60 = 1m, 180 = 3m)
  roomPassword?: string; // Room security access password
}

export interface TrashItem {
  id: string;
  deletedAt: number;
  transaction: Transaction;
}

export interface LocalSnapshotItem {
  id: string;
  timestamp: number;
  reason: string;
  transactionCount: number;
  data: {
    transactions: Transaction[];
    budget: MonthlyBudget;
    babyInfo: BabyInfo;
    couple: CoupleProfile;
  };
}
