import type { FilterSet } from "@gen3/core";

export const formatBucket = (
  bucket: [number, number] | string,
  field: string,
): string => {
  if (field === "diagnoses.age_at_diagnosis" && Array.isArray(bucket)) {
    return `${bucket[0]} to <${bucket[1]} years`;
  }

  return bucket === "_missing" ? "missing" : (bucket as string);
};

export const createFilters = (field: string , bucket: string | [number, number]): FilterSet => {
  if (field === "diagnoses.age_at_diagnosis" && Array.isArray(bucket)) {
    // Use the API's half-open bounds so adjacent age cohorts never overlap.
    return {
      mode: "and",
      root: {
        [field]: {
          operator: "and",
          operands: [
            { field, operator: ">=", operand: bucket[0] },
            { field, operator: "<", operand: bucket[1] },
          ],
        },
      },
    };
  }

  if (bucket === "_missing") {
    return {
      mode: "and",
      root: {
        [field]: {
          field,
          operator: "missing",
        },
      },
    } as FilterSet;
  }

  return {
    mode: "and",
    root: {
      [field]: {
        field: field,
        operands: [bucket],
        operator: "includes",
      },
    },
  } as FilterSet;
};
