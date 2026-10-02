import { useEffect, useState } from 'react';
import type { Release } from './releases';

export const LAST_SEEN_STORAGE_KEY = 'mmrf-virtual-lab:whats-new:last-seen';

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
    // Storage can be unavailable (private browsing, blocked cookies).
  }
};

/**
 * Marks releases the user has not seen on a previous visit, then records the
 * newest release as seen. The marks stay for the rest of the current visit.
 */
export const useUnseenReleaseIds = (
  releases: ReadonlyArray<Release>,
): ReadonlySet<string> => {
  const [unseen, setUnseen] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (releases.length === 0) return;
    setUnseen(findUnseenReleaseIds(releases, readLastSeen()));
    writeLastSeen(releases[0].date);
  }, [releases]);

  return unseen;
};
