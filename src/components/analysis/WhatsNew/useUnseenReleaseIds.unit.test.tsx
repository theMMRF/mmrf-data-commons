import React from 'react';
import { renderHook } from '@testing-library/react';
import type { Release } from './releases';
import {
  LAST_SEEN_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  useUnseenReleaseIds,
} from './useUnseenReleaseIds';

const releases: Release[] = [
  { id: 'c', date: '2026-09-01', title: 'C', source: 'virtual-lab', changes: ['c'] },
  { id: 'b', date: '2026-08-01', title: 'B', source: 'virtual-lab', changes: ['b'] },
  { id: 'a', date: '2026-07-01', title: 'A', source: 'virtual-lab', changes: ['a'] },
];

const unseenOnMount = (options?: { strict?: boolean }) => {
  const { result, unmount } = renderHook(() => useUnseenReleaseIds(releases), {
    wrapper: options?.strict ? React.StrictMode : undefined,
  });
  const ids = [...result.current];
  unmount();
  return ids;
};

describe('useUnseenReleaseIds', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps the markers when the Analysis Center remounts in the same visit', () => {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, '2026-07-01');

    expect(unseenOnMount()).toEqual(['c', 'b']);
    expect(window.localStorage.getItem(LAST_SEEN_STORAGE_KEY)).toBe('2026-09-01');
    expect(unseenOnMount()).toEqual(['c', 'b']);
  });

  it('keeps the markers through a Strict Mode double effect', () => {
    expect(unseenOnMount({ strict: true })).toEqual(['c']);
  });

  it('clears the markers on the next visit', () => {
    unseenOnMount();
    window.sessionStorage.clear();

    expect(unseenOnMount()).toEqual([]);
  });

  it('recomputes when a newer release ships during the visit', () => {
    window.localStorage.setItem(LAST_SEEN_STORAGE_KEY, '2026-08-01');
    window.sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ newest: '2026-08-01', unseen: [] }),
    );

    expect(unseenOnMount()).toEqual(['c']);
  });
});
