// ---------------------------------------------------------------------------
// Admin Authentication & PIN Protection
// ---------------------------------------------------------------------------

export const ADMIN_PIN = '1337';
const ADMIN_AUTH_SESSION_KEY = 'splittermond_admin_unlocked';

export function isSessionAdminUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSessionAdminUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent('splittermond-admin-auth-changed'));
  } catch (err) {
    console.error('Failed to update admin session auth:', err);
  }
}

export function verifyAdminPin(pin: string): boolean {
  return pin.trim() === ADMIN_PIN;
}
