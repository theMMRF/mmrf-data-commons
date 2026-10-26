import analysisTools from '../../../../config/gen3/analysisTools.json';
import { RELEASES, type Release } from './releases';
import { findUnseenReleaseIds } from './useUnseenReleaseIds';

const configuredAppIds = new Set(
  analysisTools.sections.flatMap((section) =>
    section.tools.map((tool) => tool.appId),
  ),
);

describe('RELEASES', () => {
  it('has unique ids', () => {
    const ids = RELEASES.map((release) => release.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses real calendar dates, newest first', () => {
    for (const { date } of RELEASES) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10)).toBe(
        date,
      );
    }
    const dates = RELEASES.map((release) => release.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('describes at least one change per release', () => {
    for (const release of RELEASES) {
      expect(release.title.trim()).not.toBe('');
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });

  it('names a version for every ProteinPaint release', () => {
    for (const release of RELEASES.filter((r) => r.source === 'proteinpaint')) {
      expect(release.version).toMatch(/^\d+\.\d+(\.\d+)?$/);
    }
  });

  it('links only to configured Analysis Center apps', () => {
    for (const appId of RELEASES.flatMap((release) => release.appIds ?? [])) {
      expect(configuredAppIds).toContain(appId);
    }
  });
});

describe('findUnseenReleaseIds', () => {
  const releases: Release[] = [
    { id: 'c', date: '2026-09-01', title: 'C', source: 'virtual-lab', changes: ['c'] },
    { id: 'b', date: '2026-08-01', title: 'B', source: 'virtual-lab', changes: ['b'] },
    { id: 'a', date: '2026-07-01', title: 'A', source: 'virtual-lab', changes: ['a'] },
  ];

  it('marks only the newest release on a first visit', () => {
    expect([...findUnseenReleaseIds(releases, null)]).toEqual(['c']);
  });

  it('marks every release after the last one seen', () => {
    expect([...findUnseenReleaseIds(releases, '2026-07-01')]).toEqual(['c', 'b']);
  });

  it('marks nothing once the newest release has been seen', () => {
    expect(findUnseenReleaseIds(releases, '2026-09-01').size).toBe(0);
  });

  it('handles an empty list', () => {
    expect(findUnseenReleaseIds([], null).size).toBe(0);
  });
});
