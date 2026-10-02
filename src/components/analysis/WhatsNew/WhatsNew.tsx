import React, { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AnalysisToolConfiguration } from '@gen3/frontend';
import { withClientBasePath } from '@/lib/basePath';
import { RELEASES, type Release } from './releases';
import { useUnseenReleaseIds } from './useUnseenReleaseIds';

interface WhatsNewProps {
  /** Tools visible in this Analysis Center; updates link only to these. */
  tools: ReadonlyArray<AnalysisToolConfiguration>;
  releases?: ReadonlyArray<Release>;
  /** Number of releases shown before "Show earlier updates". */
  initialCount?: number;
}

const releaseDateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const formatReleaseDate = (date: string) =>
  releaseDateFormat.format(new Date(`${date}T00:00:00Z`));

const sourceLabel = ({ source, version }: Release) => {
  if (source === 'virtual-lab') return 'Virtual Lab';
  return version
    ? `ProteinPaint ${version} from St. Jude`
    : 'ProteinPaint from St. Jude';
};

const ToolLink = ({ tool }: { tool: AnalysisToolConfiguration }) => (
  <li>
    <Link
      href={{ pathname: '/', query: { app: tool.appId } }}
      className="group inline-flex items-center gap-1.5 rounded border border-secondary-darkest bg-base-max py-0.5 pl-1 pr-2 font-heading text-[11px] font-bold leading-5 text-secondary no-underline transition-colors hover:border-primary hover:bg-base-lightest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {typeof tool.icon === 'string' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={withClientBasePath(tool.icon)}
          alt=""
          aria-hidden="true"
          className="h-4 w-4 object-contain"
        />
      ) : (
        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center">
          {tool.icon}
        </span>
      )}
      <span>
        <span className="sr-only">Open </span>
        {tool.title}
      </span>
    </Link>
  </li>
);

const ReleaseEntry = ({
  release,
  isNew,
  tools,
}: {
  release: Release;
  isNew: boolean;
  tools: ReadonlyArray<AnalysisToolConfiguration>;
}) => {
  const titleId = `whats-new-${release.id}`;

  return (
    <li className="group/release relative pb-6 pl-5 last:pb-0">
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-[4.5px] top-3 w-px bg-base-lighter group-last/release:hidden"
      />
      <span
        aria-hidden="true"
        className={`absolute left-0 top-[5px] h-[10px] w-[10px] rounded-full border-2 ${
          isNew
            ? 'border-accent bg-accent'
            : 'border-secondary-darkest bg-base-max'
        }`}
      />
      <article aria-labelledby={titleId}>
        <p className="flex items-center gap-2 font-heading text-[11px] font-bold uppercase leading-5 tracking-[0.08em] text-secondary">
          <time dateTime={release.date} className="tabular-nums">
            {formatReleaseDate(release.date)}
          </time>
          {isNew && (
            <span className="rounded-sm bg-accent-lightest px-1.5 text-[10px] tracking-[0.1em]">
              New
            </span>
          )}
        </p>
        <h3
          id={titleId}
          className="mt-0.5 font-heading text-[15px] font-bold leading-snug text-black"
        >
          {release.title}
        </h3>
        <p className="font-content text-[11px] leading-5 text-base-darkest">
          {sourceLabel(release)}
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-4 font-content text-xs leading-5 text-black marker:text-accent">
          {release.changes.map((change) => (
            <li key={change}>{change}</li>
          ))}
        </ul>
        {tools.length > 0 && (
          <ul
            aria-label={`Tools in “${release.title}”`}
            className="mt-3 flex flex-wrap gap-1.5"
          >
            {tools.map((tool) => (
              <ToolLink key={tool.appId} tool={tool} />
            ))}
          </ul>
        )}
      </article>
    </li>
  );
};

/** Recent production changes, shown beside the Analysis Center tools. */
export default function WhatsNew({
  tools,
  releases = RELEASES,
  initialCount = 2,
}: WhatsNewProps) {
  const [showAll, setShowAll] = useState(false);
  const unseen = useUnseenReleaseIds(releases);
  const listId = useId();

  const toolsByAppId = useMemo(
    () =>
      new Map(
        tools
          .filter((tool) => tool.appId)
          .map((tool) => [tool.appId as string, tool]),
      ),
    [tools],
  );

  if (releases.length === 0) return null;

  const shown = showAll ? releases : releases.slice(0, initialCount);
  const earlierCount = releases.length - initialCount;

  return (
    <section aria-labelledby="whats-new-heading" className="font-content">
      <h2
        id="whats-new-heading"
        className="mt-2 font-heading text-2xl font-bold uppercase leading-8 text-black"
      >
        What&rsquo;s new
      </h2>
      <div aria-hidden="true" className="mb-4 w-[70px] border-t-4 border-accent" />
      <p className="mb-5 text-xs leading-5 text-base-darkest">
        Changes to Virtual Lab and its ProteinPaint tools, newest first.
      </p>
      <ol id={listId}>
        {shown.map((release) => (
          <ReleaseEntry
            key={release.id}
            release={release}
            isNew={unseen.has(release.id)}
            tools={(release.appIds ?? []).flatMap((appId) => {
              const tool = toolsByAppId.get(appId);
              return tool ? [tool] : [];
            })}
          />
        ))}
      </ol>
      {earlierCount > 0 && (
        <button
          type="button"
          aria-expanded={showAll}
          aria-controls={listId}
          onClick={() => setShowAll((value) => !value)}
          className="mt-5 ml-5 font-heading text-xs font-bold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {showAll
            ? 'Show fewer updates'
            : `Show ${earlierCount} earlier ${earlierCount === 1 ? 'update' : 'updates'}`}
        </button>
      )}
    </section>
  );
}
