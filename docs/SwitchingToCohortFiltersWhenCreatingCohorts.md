## Saving Cohorts as Filters

When a tool already has a case-centric `FilterSet`, it can save that filter
directly instead of resolving the matching cases to a static list of case IDs.
This preserves the selection criteria in the cohort bar.

Use the `asFilterRepresentation` property on
`CasesCohortButtonFromFilters` or `CohortCreationButton`. The Clinical Data
Analysis cards and Cohort Comparison facet tables use this behavior.

Do not enable it for selections that are only available as case IDs or that
must be resolved across genomic indexes. Those cohorts should remain static
case-ID cohorts. Add/remove set operations also remain case-ID based.
