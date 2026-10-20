import React from 'react';
import { DemoUtil } from './DemoUtil';
import { useIsDemoApp } from '@/hooks/useIsDemoApp';
import {
  TabbedCohortBuilder,
  TabbedCohortBuilderConfiguration,
} from '@gen3/frontend';
import config from './config/tabbedCohortBuilder.json';
import styles from './CohortBuilder.module.css';

const CohortBuilderApp = () => {
  const isDemoMode = useIsDemoApp();
  return (
    <>
      {isDemoMode ? (
        <DemoUtil text="Demo mode is not available for this app" />
      ) : (
        <div className={`${styles.cohortBuilder} flex flex-col mt-4`}>
          <aside
            aria-labelledby="cgs-reference-title"
            className={`${styles.cgsReference} mx-3 mb-4 rounded-md border border-base-light bg-base-lightest p-4 font-content text-sm text-base-contrast`}
          >
            <h2
              id="cgs-reference-title"
              className="mb-1 font-heading text-sm font-semibold"
            >
              Consensus Genomic Staging (CGS)
            </h2>
            <p>
              Avet-Loiseau, H. et al.{' '}
              <a
                href="https://ascopubs.org/doi/10.1200/JCO-24-01893"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                International Myeloma Society/International Myeloma Working
                Group consensus recommendations on the definition of high-risk
                multiple myeloma.
                <span className="sr-only"> (opens in a new tab)</span>
              </a>{' '}
              <cite>J. Clin. Oncol.</cite> 43, 2739–2751 (2025).
            </p>
          </aside>
          <TabbedCohortBuilder
            {...(config as unknown as TabbedCohortBuilderConfiguration)}
          />
        </div>
      )}
    </>
  );
};

export default CohortBuilderApp;
