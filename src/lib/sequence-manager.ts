'use client';

import { doc, getDoc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore';
import { db as dbLocal } from '@/lib/db-local';
import { normalizeInspectionEmail } from '@/lib/inspection-mode';

type SequenceRequest = {
  type: string;
  userEmail: string;
  firestore: Firestore | null;
  isOnline: boolean;
  year?: number;
};

const getYear = (year?: number) => year || new Date().getFullYear();

export const syncLocalCountersFromCloud = async (
  firestore: Firestore,
  userEmail: string,
  year?: number
) => {
  const normalizedEmail = normalizeInspectionEmail(userEmail);
  if (!normalizedEmail) return;

  const activeYear = getYear(year);
  const userRef = doc(firestore, 'usuarios', normalizedEmail);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const countersByYear = (snap.data()?.inspectionCounters || {}) as Record<string, Record<string, number>>;
  const cloudYearCounters = countersByYear[String(activeYear)] || {};

  for (const [type, rawValue] of Object.entries(cloudYearCounters)) {
    const cloudValue = Number(rawValue);
    if (!Number.isFinite(cloudValue) || cloudValue < 0) continue;
    const localValue = await dbLocal.getSequence(type, normalizedEmail, activeYear);
    await dbLocal.setSequence(type, normalizedEmail, Math.max(localValue, cloudValue), activeYear);
  }
};

export const getNextSequenceForUser = async ({
  type,
  userEmail,
  firestore,
  isOnline,
  year,
}: SequenceRequest): Promise<number> => {
  const normalizedEmail = normalizeInspectionEmail(userEmail);
  const activeYear = getYear(year);

  if (!normalizedEmail) {
    return dbLocal.getNextSequence(type, undefined, activeYear);
  }

  const getLocalFallback = async () => dbLocal.getNextSequence(type, normalizedEmail, activeYear);

  if (!isOnline || !firestore) {
    return getLocalFallback();
  }

  try {
    const userRef = doc(firestore, 'usuarios', normalizedEmail);
    const nextValue = await runTransaction(firestore, async (tx) => {
      const snap = await tx.get(userRef);
      const data = (snap.exists() ? snap.data() : {}) as any;
      const countersByYear = (data?.inspectionCounters || {}) as Record<string, Record<string, number>>;
      const yearKey = String(activeYear);
      const currentValue = Number(countersByYear?.[yearKey]?.[type] || 0);
      const next = currentValue + 1;

      tx.set(
        userRef,
        {
          [`inspectionCounters.${yearKey}.${type}`]: next,
          countersUpdatedAt: serverTimestamp(),
        } as any,
        { merge: true }
      );

      return next;
    });

    await dbLocal.setSequence(type, normalizedEmail, nextValue, activeYear);
    return nextValue;
  } catch (error) {
    console.warn(`Falling back to local sequence for ${type}:`, error);
    return getLocalFallback();
  }
};
