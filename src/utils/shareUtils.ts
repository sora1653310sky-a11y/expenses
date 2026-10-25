/**
 * Share & Invite URL generation utility
 * Dynamically resolves the active host/domain to ensure partner links never 404 (Not Found).
 */

export function getCurrentAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    const pathname = window.location.pathname;

    // Ensure we don't have trailing slash issues or old query strings
    if (origin && origin !== 'null' && !origin.startsWith('file:')) {
      return `${origin}${pathname}`;
    }
  }
  return '';
}

export function getShareableInviteUrl(roomId: string): string {
  const cleanRoom = (roomId || 'BABY-8823').trim().toUpperCase();
  const baseUrl = getCurrentAppBaseUrl();
  if (baseUrl) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}room=${encodeURIComponent(cleanRoom)}`;
  }
  return `?room=${encodeURIComponent(cleanRoom)}`;
}

export function generateCoupleInviteMessage(options: {
  roomId: string;
  babyName?: string;
  currentRole?: 'dad' | 'mom';
  partnerName?: string;
}): string {
  const { roomId, babyName = '寶寶' } = options;
  const cleanRoom = (roomId || 'BABY-8823').trim().toUpperCase();
  const inviteUrl = getShareableInviteUrl(cleanRoom);

  return `【🍼 萌寶記帳 夫妻即時共享邀請】
親愛的，一起來記錄 ${babyName} 的各項開銷與家庭育兒預算吧！

👉 點擊開啟家庭共享記帳（已自動綁定專屬帳本）：
${inviteUrl}

🔑 我們的家庭專屬房間碼：【${cleanRoom}】

💡 溫馨提示：
1. 點開上方連結即可直接使用，雙方記帳幾秒內即時同步！
2. 點擊瀏覽器「分享」➔「加入主畫面」，即可像 App 一樣放在手機桌面隨時記帳。
3. 若開啟後未自動進入，亦可在軟體頂部「夫妻同步」中輸入房間代碼【${cleanRoom}】一鍵連線！`;
}
