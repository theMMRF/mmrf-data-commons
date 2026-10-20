import React from 'react';
import { AnalysisCenterWithSections } from '@gen3/frontend';
import styles from './AnalysisToolSections.module.css';

/** Local presentation adjustments for the Gen3 tool list rendered on the home page. */
export default function AnalysisToolSections(
  props: React.ComponentProps<typeof AnalysisCenterWithSections>,
) {
  return (
    <div className={styles.toolSections}>
      <AnalysisCenterWithSections {...props} />
    </div>
  );
}
