export type ReleaseSource = 'virtual-lab' | 'proteinpaint';

export interface Release {
  /** Stable key; also used to remember which updates a user has seen. */
  id: string;
  /** Production release date, YYYY-MM-DD. */
  date: string;
  title: string;
  source: ReleaseSource;
  /** ProteinPaint version, shown when `source` is `proteinpaint`. */
  version?: string;
  changes: ReadonlyArray<string>;
  /** Analysis Center app IDs to link from this update. */
  appIds?: ReadonlyArray<string>;
}

/**
 * Production releases, newest first. Only list changes that are live on
 * virtuallab.themmrf.org, and do not link apps that production hides.
 */
export const RELEASES: ReadonlyArray<Release> = [
  {
    id: '2026-09-29-proteinpaint-2.214',
    date: '2026-09-29',
    title: 'More reliable group comparisons',
    source: 'proteinpaint',
    version: '2.214',
    changes: [
      'Differential expression group sizes load reliably and stay within your cohort.',
      '“Not” filters on gene expression now select the opposite samples.',
      'Downloaded p-value tables list every significant gene.',
      'Violin and box plot legends show summary statistics.',
      'Fusions with several partner breakpoints open a breakpoint diagram.',
    ],
    appIds: ['DE', 'ProteinPaint'],
  },
  {
    id: '2026-09-28-cgs-risk',
    date: '2026-09-28',
    title: 'Filter cohorts by CGS risk',
    source: 'virtual-lab',
    changes: [
      'The Cohort Builder has a CGS Risk tab for IMS/IMWG Consensus Genomic Staging.',
      'Require cases to match any or all of the CGS criteria you select.',
      'CGS cohorts select the same cases in the ProteinPaint tools.',
      'Differential Gene Expression offers your saved cohorts as groups.',
      'The cohort filter bar shows AND or OR between filters.',
    ],
    appIds: ['CohortBuilder', 'DE'],
  },
  {
    id: '2026-08-05-differential-gene-expression',
    date: '2026-08-05',
    title: 'Differential Gene Expression is available',
    source: 'virtual-lab',
    changes: [
      'Compare expression between two groups of cases in an interactive volcano plot.',
    ],
    appIds: ['DE'],
  },
  {
    id: '2026-07-23-proteinpaint-2.199',
    date: '2026-07-23',
    title: 'Steadier charts',
    source: 'proteinpaint',
    version: '2.199',
    changes: [
      'The Correlation Plot keeps its controls after an error, so you can adjust and retry.',
      'Changing one chart no longer interrupts others that are still loading.',
      'Bar chart legends stay visible when every bar is hidden.',
    ],
    appIds: ['Correlation'],
  },
  {
    id: '2026-07-10-correlation-plot',
    date: '2026-07-10',
    title: 'Correlation Plot is available',
    source: 'virtual-lab',
    changes: [
      'Plot clinical and genomic variables against each other.',
      'Select samples on the plot and save them as a cohort.',
      'Cohort Comparison survival curves load again.',
    ],
    appIds: ['Correlation', 'CohortComparison'],
  },
  {
    id: '2026-06-24-sign-in-page',
    date: '2026-06-24',
    title: 'A new sign-in page',
    source: 'virtual-lab',
    changes: [
      'The sign-in page previews the tools and links to the access application.',
      'Signing in takes you straight to the Analysis Center.',
    ],
  },
  {
    id: '2026-06-11-survival-terms',
    date: '2026-06-11',
    title: 'Survival by genomic variables',
    source: 'virtual-lab',
    changes: [
      'Survival plots can group cases by genomic variables, such as mutation status.',
      'Accept the terms of use in the site, once per version of the terms.',
    ],
  },
  {
    id: '2026-05-05-genome-browser',
    date: '2026-05-05',
    title: 'Genome Browser and Gene Expression Clustering',
    source: 'virtual-lab',
    changes: [
      'The Genome Browser shows mutations and copy number changes across a region.',
      'ProteinPaint returns as its own tool for protein-level mutation views.',
      'Gene Expression Clustering shows the most variable genes in your cohort.',
      'Select samples in ProteinPaint, Genome Browser, or OncoMatrix to make a cohort.',
    ],
    appIds: ['GB', 'ProteinPaint', 'GeneExpression', 'OncoMatrix'],
  },
];
