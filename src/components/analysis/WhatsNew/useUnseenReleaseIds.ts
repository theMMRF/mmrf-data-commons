import { useEffect, useState } from 'react';
import type { Release } from './releases';

export const LAST_SEEN_STORAGE_KEY = 'mmrf-virtual-lab:whats-new:last-seen';
export const SESSION_STORAGE_KEY = 'mmrf-virtual-lab:whats-new:session';

interface SessionSnapshot {
  /** Newest release date when the snapshot was taken. */
  newest: string;
  unseen: string[];
}

/**
 * Releases dated after `lastSeenDate`. A first-time visitor sees only the
 * newest release marked, rather than the whole history.
 */
export const findUnseenReleaseIds = (
  releases: ReadonlyArray<Release>,
  lastSeenDate: string | null,
): ReadonlySet<string> => {
  if (releases.length === 0) return new Set();
  if (!lastSeenDate) return new Set([releases[0].id]);
  return new Set(
    releases
      .filter((release) => release.date > lastSeenDate)
      .map((release) => release.id),
  );
};

// Storage can be unavailable (private browsing, blocked cookies); every
// accessor below degrades to "nothing stored".
const readLastSeen = (): string | null => {
  try {
    return window.localStorage.getItem(LAST_SEEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeLastSeen = (date: string) => {
  try {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, date);
  } catch {
    /* empty */
  }
};

const readSessionSnapshot = (): SessionSnapshot | null => {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.newest === 'string' && Array.isArray(parsed?.unseen)
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const writeSessionSnapshot = (snapshot: SessionSnapshot) => {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* empty */
  }
};

/**
 * Marks releases the user had not seen before this visit. The marks are
 * snapshotted per browser session, so they survive leaving and returning to
 * the Analysis Center, while the newest release is recorded as seen for the
 * next visit.
 */
export const useUnseenReleaseIds = (
  releases: ReadonlyArray<Release>,
): ReadonlySet<string> => {
  const [unseen, setUnseen] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (releases.length === 0) return;
    const newest = releases[0].date;
    let snapshot = readSessionSnapshot();
    if (snapshot?.newest !== newest) {
      snapshot = {
        newest,
        unseen: [...findUnseenReleaseIds(releases, readLastSeen())],
      };
      writeSessionSnapshot(snapshot);
      writeLastSeen(newest);
    }
    setUnseen(new Set(snapshot.unseen));
  }, [releases]);

  return unseen;
};
