import { GdcFile } from '@/core';
import { shouldDisplayReferenceGenome } from './utils';

const file = (fields: Record<string, unknown>) => fields as unknown as GdcFile;

describe('reference genome panel', () => {
  it('shows for files from an alignment-based workflow', () => {
    expect(
      shouldDisplayReferenceGenome(
        file({ fileType: 'aligned_reads', analysis: { workflow_type: 'BWA-mem' } }),
      ),
    ).toBe(true);
  });

  it('hides for unaligned reads, which were never aligned to a genome', () => {
    expect(
      shouldDisplayReferenceGenome(
        file({ fileType: 'aligned_reads', analysis: { workflow_type: 'Unaligned' } }),
      ),
    ).toBe(false);
  });

  it('keeps the existing exclusions', () => {
    expect(
      shouldDisplayReferenceGenome(file({ analysis: { workflow_type: 'Birdseed' } })),
    ).toBe(false);
    expect(
      shouldDisplayReferenceGenome(file({ fileType: 'masked_methylation_array' })),
    ).toBe(false);
  });
});
