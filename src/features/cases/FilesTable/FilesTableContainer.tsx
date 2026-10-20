import React, { useMemo } from 'react';
import FilesTable, { CaseFilesTableDataType } from './FilesTable';
import type { GdcFile } from '@/core';

interface FilesTableProps {
  files: readonly GdcFile[];
}

// CaseSummary handles loading/errors; use the same live files as its header/cart.
const FilesTableWrapper = ({ files }: FilesTableProps) => {
  const tableData = useMemo<CaseFilesTableDataType[]>(
    () =>
      files.map((file) => ({
        file: file,
        file_uuid: file.file_id,
        access: file.access,
        file_name: file.file_name,
        data_category: file.data_category,
        data_type: file.data_type,
        data_format: file.data_format,
        experimental_strategy: file.experimental_strategy || '--',
        platform: file.platform || '--',
        file_size: file.file_size,
        annotations: file.annotations,
      })),
    [files],
  );

  return (
    <FilesTable
      tableData={tableData}
      isFetching={false}
      isSuccess={true}
      isError={false}
    />
  );
};
export default FilesTableWrapper;
