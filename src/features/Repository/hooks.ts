import { FileCountsQueryParameters, FilesSizeData, } from './types';
import {
  Accessibility,
  CombineMode,
  convertFilterSetToGqlFilter,
  CoreState,
  customQueryStrForField,
  EmptyFilterSet,
  Includes,
  RawDataAndTotalCountsParams,
  selectCohortFilterCombineMode,
  selectCohortFilterExpanded,
  selectCurrentCohortFilters,
  setCohortFilterCombineMode,
  toggleCohortBuilderCategoryFilter,
  useCoreDispatch,
  useCoreSelector,
} from '@gen3/core';
import { getByPath } from '@gen3/frontend';
import { useState } from 'react';
import { useDeepCompareEffect } from 'use-deep-compare';
import {
  COHORT_FILTER_INDEX,
  useGetCohortCentricAggsQuery,
  useGetCohortCentricQuery,
} from '@/core';
import {
  CohortCentricAggsQueryRequest,
  FacetQueryResponse,
} from '@/features/types';
import { useRawDataAndTotalCountQuery } from '@/core/features/cohortQuery/cohortQuerySlice';

export const useGetFacetValuesQuery = (
  args: CohortCentricAggsQueryRequest,
): FacetQueryResponse => {


  const { data, isSuccess, isFetching, isError } = useGetCohortCentricAggsQuery(args);

  return {
    data: data ?? {},
    isError,
    isFetching,
    isSuccess,
  };
};

// The file index's case id, counted distinctly for the repository's case total.
const caseIdField = 'cases.case_id';

const buildFileStatsQuery = (
  type: string,
  fileSizeField: string,
  fileItemIdField: string,
  indexPrefix: string = '',
) => {

  return `query repositoryTotals ($filter: JSON, $accessibility: Accessibility) {
    ${indexPrefix}_aggregation {
        ${type} (accessibility: $accessibility, filter: $filter) {
            ${customQueryStrForField(fileItemIdField, '{_totalCount }')}
            ${customQueryStrForField(caseIdField, '{ _cardinalityCount(precision_threshold: 40000) }')}
            ${customQueryStrForField(fileSizeField, ' {  histogram {sum} }')}
        }
    }
}`;
};
interface FileCountsQueryResponse {
  [aggregationKey: `${string}_aggregation`]: Record<
    string,
    Record<string, any>
  >;
}

export const useTotalFileSizeQuery = ({
  repositoryFilters,
  repositoryIndex,
  fileSizeField,
  cohortItemIdField,
  fileItemIdField,
  projectId,
  accessibility = Accessibility.ALL,
  repositoryIndexPrefix = '',
}: FileCountsQueryParameters) => {
  const [totals, setTotals] = useState<FilesSizeData>({
    totalFileSize: 0,
    totalCaseCount: 0,
    totalFileCount: 0,
  });
  const query = buildFileStatsQuery(
    repositoryIndex,
    fileSizeField,
    fileItemIdField,
    repositoryIndexPrefix,
  );

  // add case_id filter to repository filters
  const repositoryFilterWithCases = { mode: repositoryFilters.mode, root: {
    ...repositoryFilters.root}
  }

  const cohortFilters = useCoreSelector(selectCurrentCohortFilters);
  let cohortFilter = cohortFilters?.[COHORT_FILTER_INDEX] ?? EmptyFilterSet;
  if (projectId) {
    cohortFilter = {
      mode: 'and',
      root: {
        'project.project_id': {
          operator: 'in',
          field: 'project.project_id',
          operands: [projectId],
        } as Includes,
      },
    };
  }
  const cohortFilterGQL = convertFilterSetToGqlFilter(cohortFilter);
  const { data, isSuccess, isFetching, isError } = useGetCohortCentricQuery({
      cohortFilter: cohortFilterGQL,
      query,
      filter: convertFilterSetToGqlFilter(repositoryFilterWithCases),
      caseIdsFilterPath: "cases.case_id",
    caseIdField: "case_id",
      limit: 0,
  });

  useDeepCompareEffect(() => {
    if (isSuccess) {
      const response = data.data as unknown as FileCountsQueryResponse;
      const countsRoot = getByPath(
        response?.[`${repositoryIndexPrefix}_aggregation`]?.[repositoryIndex],
        cohortItemIdField,
      );
      const totalFileSize =
        response?.[`${repositoryIndexPrefix}_aggregation`]?.[repositoryIndex]?.[
          fileSizeField
        ]?.histogram?.[0]?.sum || 0;
      // Distinct cases among the matching files, so file-level and sample-level
      // filters (e.g. cases.samples.disease_stage) both narrow the count.
      const totalCaseCount =
        getByPath(
          response?.[`${repositoryIndexPrefix}_aggregation`]?.[repositoryIndex],
          caseIdField,
        )?._cardinalityCount || 0;
      const totalFileCount =
        response?.[`${repositoryIndexPrefix}_aggregation`]?.[repositoryIndex]?.[
          fileItemIdField
        ]?._totalCount || 0;
      setTotals({
        totalFileSize,
        totalCaseCount,
        totalFileCount,
      });
    }
  }, [data, isSuccess]);

  return {
    data: totals,
    isError,
    isFetching,
    isSuccess,
  };
};

export const useFilterExpandedState = (index: string, field: string) => {
  return useCoreSelector((state: CoreState) =>
    selectCohortFilterExpanded(state, index, field),
  );
};

export const useSetCohortFilterCombineState = (index: string) => {
  const dispatch = useCoreDispatch();
  return (field: string, mode: CombineMode) => {
    dispatch(setCohortFilterCombineMode({ index, field, mode }));
  };
};

export const useCohortFilterCombineState = (index: string, field: string) => {
  return useCoreSelector((state: CoreState) =>
    selectCohortFilterCombineMode(state, index, field),
  );
};

export const useToggleExpandFilter = (index: string) => {
  const dispatch = useCoreDispatch();
  return (field: string, expanded: boolean) => {
    dispatch(toggleCohortBuilderCategoryFilter({ index, field, expanded }));
  };
};

export type ExplorerDataQueryHook = (
  args: RawDataAndTotalCountsParams,
) => ReturnType<typeof useRawDataAndTotalCountQuery>;

export const useGetRepositoryData  = (
  projectId?: string) : ExplorerDataQueryHook   => {
  const cohortFilters = useCoreSelector(selectCurrentCohortFilters);
  let cohortFilter = cohortFilters?.[COHORT_FILTER_INDEX] ?? EmptyFilterSet;
  if (projectId) {
    cohortFilter = { mode: 'and', root: { "project.project_id" : { operator: "in", field: "project.project_id", operands: [projectId]} as Includes}};
  }
  const cohortFilterGQL = convertFilterSetToGqlFilter(cohortFilter);

    return (args: RawDataAndTotalCountsParams) =>
      useRawDataAndTotalCountQuery({
        cohortFilter: cohortFilterGQL,
        caseIdsFilterPath: 'cases.case_id',
        ...args,
      });
  }
