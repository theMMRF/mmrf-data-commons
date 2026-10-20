## Saving Cohorts as Filters

Clinical Data Analysis cards (Save New Cohort → Create new cohort with selected
cases) and both Cohort Comparison facet-count columns preserve the source cohort
and selected criteria whenever the current cohort bar can display that expression.
Saving skips the case-ID lookup and shows the criteria in the cohort bar. These
cohorts are defined by criteria, so membership can change when data changes.

Use `asFilterRepresentation` on `CasesCohortButtonFromFilters` or
`CohortCreationButton` for case-centric selections. `intersectCohortSelection`
combines criteria without overwriting a source condition on the same field and
preserves AND/OR grouping. Single clinical age bins are normalized to ranges.

The current Gen3 cohort bar renders ordinary field conditions, a single range,
and singleton enum conditions joined with AND. It cannot fully display arbitrary
nested intersections or OR groups. Such selections fall back to static case IDs;
the lookup still applies both the source and selection criteria. This includes
multiple age bins, missing-plus-values selections, and overlapping source and
selected ranges. A source cohort already defined by IDs retains those IDs;
its original criteria cannot be reconstructed.

Other tools intentionally keep their current ID-based behavior:

- ProteinPaint callbacks, imports, explicit case selections, and set-operation
  tables provide IDs, without the original filter expressions.
- Gene and mutation tables resolve selections across genomic indexes.
- Survival selections depend on analysis-specific eligibility and overlap rules.
- Add/remove operations on existing cohorts remain static case-ID operations.

`createStaticCohort` takes precedence over `asFilterRepresentation`.

### Testing this PR

1. Start with a cohort defined by a demographic filter. Select a different
   categorical field in Clinical Data Analysis, then create a new cohort. Check
   that both fields appear in the cohort bar and the count matches the selection.
2. Repeat from each Cohort Comparison facet-count column. Confirm each save uses
   that column's source cohort, even when another cohort is active in the bar.
3. Save a single age bin without an existing age constraint; its range should
   appear. Then use a source age range that overlaps a comparison bucket (e.g.
   45–55 with a 40–50 bucket). The static fallback must contain only their
   intersection, never the whole bucket.
4. Exercise multiple age bins, missing values, AND/OR source cohorts, and a
   source defined by IDs. Confirm saved counts and fallback behavior.
5. Verify add/remove operations and genomic/ProteinPaint selections still save
   the selected cases rather than broadening to the active cohort.
