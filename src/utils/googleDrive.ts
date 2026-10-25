import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth, app } from './firebase';

export { auth, app };

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (never in localStorage per security rule)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onSuccess?: (user: User, token: string) => void,
  onFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onSuccess) onSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onFailure) onFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('未取得 Google 授權存取 Token');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in failed:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Google Drive File Operations
const BACKUP_FILENAME = '萌寶記帳_Google雲端備份.json';

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

/**
 * Find existing backup file in Google Drive created with this app
 */
export async function findGoogleDriveBackup(token: string): Promise<GoogleDriveBackupFile | null> {
  const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`查詢 Google Drive 失敗 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Save / Upload baby ledger snapshot to Google Drive
 */
export async function saveToGoogleDrive(token: string, payload: any): Promise<{ fileId: string; modifiedTime: string }> {
  const existing = await findGoogleDriveBackup(token);
  const jsonContent = JSON.stringify(payload, null, 2);

  if (existing) {
    // Update existing file content (Media upload)
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      throw new Error(`更新 Google Drive 檔案失敗: ${res.statusText}`);
    }

    const updated = await res.json();
    return { fileId: existing.id, modifiedTime: updated.modifiedTime || new Date().toISOString() };
  } else {
    // Create new multipart file with metadata + body
    const metadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
      description: '萌寶記帳 App 夫妻家庭雲端記憶備份檔案',
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!res.ok) {
      throw new Error(`在 Google Drive 建立檔案失敗: ${res.statusText}`);
    }

    const created = await res.json();
    return { fileId: created.id, modifiedTime: created.modifiedTime || new Date().toISOString() };
  }
}

/**
 * Read / Restore ledger data from Google Drive
 */
export async function readFromGoogleDrive(token: string): Promise<{ data: any; modifiedTime: string }> {
  const existing = await findGoogleDriveBackup(token);
  if (!existing) {
    throw new Error('在您的 Google 雲端硬碟中找不到歷史備份檔案');
  }

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`下載 Google Drive 備份檔案失敗: ${res.statusText}`);
  }

  const data = await res.json();
  return { data, modifiedTime: existing.modifiedTime };
}
