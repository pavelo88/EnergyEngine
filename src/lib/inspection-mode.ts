'use client';

export type InspectionMode = 'online' | 'offline';

const MODE_KEY = 'energy_engine_inspection_mode';
const OFFLINE_EMAIL_KEY = 'energy_engine_offline_email';

export const normalizeInspectionEmail = (value: string) =>
  value
    .normalize('NFKC')
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

export const getInspectionMode = (): InspectionMode => {
  if (typeof window === 'undefined') return 'online';
  const raw = localStorage.getItem(MODE_KEY);
  return raw === 'offline' ? 'offline' : 'online';
};

export const setInspectionMode = (mode: InspectionMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent('inspection-mode-changed', { detail: mode }));
};

export const getStoredOfflineEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(OFFLINE_EMAIL_KEY);
  if (!raw) return null;
  const normalized = normalizeInspectionEmail(raw);
  return normalized || null;
};

export const setStoredOfflineEmail = (email: string) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeInspectionEmail(email);
  if (!normalized) return;
  localStorage.setItem(OFFLINE_EMAIL_KEY, normalized);
};

export const resolveInspectorEmail = (firebaseEmail?: string | null): string | null => {
  const normalizedFirebase = normalizeInspectionEmail(firebaseEmail || '');
  if (normalizedFirebase) return normalizedFirebase;
  return getStoredOfflineEmail();
};

export const canUseCloudSync = (isOnline: boolean, firestoreReady: boolean, firebaseEmail?: string | null) => {
  if (!isOnline || !firestoreReady) return false;
  if (!resolveInspectorEmail(firebaseEmail)) return false;
  return getInspectionMode() !== 'offline';
};
