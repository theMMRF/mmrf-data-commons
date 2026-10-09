import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { GdcFile } from '@/core';
import FilesTableContainer from './FilesTableContainer';
import { handleJSONDownload } from '../utils';
import { downloadTSV } from '@/components/Table/utils';

// Keep the real file mapping, search, sorting, pagination, links and download
// button. Replace presentation-only wrappers and browser export side effects.
jest.mock('@/utils/index', () => ({
  capitalize: (value: string) => value,
  statusBooleansToDataStatus: () => 'success',
}));
jest.mock('../utils', () => ({ handleJSONDownload: jest.fn() }));
jest.mock('@/components/Table/utils', () => ({ downloadTSV: jest.fn() }));
jest.mock('@gen3/core', () => ({ GEN3_FENCE_API: '/user' }));
jest.mock('@/utils/icons', () => ({ DownloadIcon: () => null }));
jest.mock('@mantine/core', () => ({
  Button: ({ href, children }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('@/components/FileAccessBadge', () => ({
  FileAccessBadge: ({ access }: { access: string }) => <span>{access}</span>,
}));
jest.mock('@/components/FunctionButton', () => ({
  __esModule: true,
  default: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));
jest.mock('@/components/tailwindComponents', () => ({
  HeaderTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}));
jest.mock('@/components/Table/VerticalTable', () => ({
  __esModule: true,
  default: ({
    data,
    columns,
    additionalControls,
    tableTotalDetail,
    pagination,
    handleChange,
    setSorting,
  }: any) => (
    <div>
      {tableTotalDetail}
      {additionalControls}
      <label>
        Search files
        <input
          onChange={(event) => handleChange({ newSearch: event.target.value })}
        />
      </label>
      <button
        onClick={() => handleChange({ newPageNumber: pagination.page + 1 })}
      >
        Next
      </button>
      <button onClick={() => setSorting([{ id: 'file_name', desc: true }])}>
        Sort descending
      </button>
      <span data-testid="page">{pagination.page}</span>
      <span data-testid="pagination-label">{pagination.label}</span>
      <table>
        <tbody>
          {data.map((row: any) => (
            <tr key={row.file_uuid}>
              {columns.map((column: any) => (
                <td key={column.id}>
                  {column.cell
                    ? column.cell({
                        row: { original: row },
                        getValue: () => row[column.accessorKey],
                      })
                    : row[column.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}));

const file = (id: string, name = `${id}.cram`): GdcFile => ({
  file_id: `dg.MMRF/${id}`,
  file_name: name,
  file_size: 1234,
  access: 'controlled',
  acl: ['test-project'],
  data_category: 'Sequencing Reads',
  data_type: 'Aligned Reads',
  data_format: 'CRAM',
  experimental_strategy: 'WGS',
  state: 'released',
  md5sum: 'test-checksum',
  submitterId: id,
  createdDatetime: '',
  updatedDatetime: '',
});

beforeEach(() => jest.clearAllMocks());

it('shows all 559 live case files in the count and paginates their rows', () => {
  const files = Array.from({ length: 559 }, (_, i) => file(`case-a-${i}`));
  render(<FilesTableContainer files={files} />);
  expect(screen.getByTestId('text-total-item-count')).toHaveTextContent('559');
  expect(screen.getAllByRole('row')).toHaveLength(10);
  expect(screen.getByRole('link', { name: 'case-a-0.cram' })).toHaveAttribute(
    'href',
    '/files/dg.MMRF%2Fcase-a-0',
  );
  expect(screen.getAllByRole('link', { name: 'Download' })[0]).toHaveAttribute(
    'href',
    '/user/data/download/dg.MMRF%2Fcase-a-0?redirect=true&expires_in=9600',
  );
  expect(screen.getByTestId('pagination-label')).toHaveTextContent('file');
  fireEvent.click(screen.getByText('Next'));
  expect(
    screen.getByRole('link', { name: 'case-a-10.cram' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'case-a-0.cram' }),
  ).not.toBeInTheDocument();
});

it('searches and sorts the supplied files, retaining intended unavailable placeholders', async () => {
  const files = [
    file('a', 'alpha.cram'),
    file('z', 'zulu.this_file_is_unavailable.txt'),
  ];
  render(<FilesTableContainer files={files} />);
  fireEvent.click(screen.getByText('Sort descending'));
  await waitFor(() =>
    expect(screen.getAllByRole('row')[0]).toHaveTextContent(
      'zulu.this_file_is_unavailable.txt',
    ),
  );
  fireEvent.change(screen.getByLabelText('Search files'), {
    target: { value: 'unavailable' },
  });
  expect(screen.getAllByRole('row')).toHaveLength(1);
  expect(screen.getByTestId('text-total-item-count')).toHaveTextContent('1');
  fireEvent.change(screen.getByLabelText('Search files'), {
    target: { value: 'no match' },
  });
  expect(screen.queryAllByRole('row')).toHaveLength(0);
  expect(screen.getByTestId('text-total-item-count')).toHaveTextContent('0');
});

it('exports the real case files rather than the mock fixture or current page', () => {
  const files = Array.from({ length: 12 }, (_, i) => file(`real-${i}`));
  render(<FilesTableContainer files={files} />);
  fireEvent.click(screen.getByRole('button', { name: 'Download JSON' }));
  fireEvent.click(screen.getByRole('button', { name: 'Download TSV' }));
  const jsonRows = jest.mocked(handleJSONDownload).mock.calls[0][1];
  const tsvRows = jest.mocked(downloadTSV).mock.calls[0][0].tableData;
  expect(jsonRows.map((row: any) => row.file_uuid)).toEqual(
    files.map((f) => f.file_id),
  );
  expect(tsvRows).toEqual(jsonRows);
});

it('replaces the dataset when live files update and resets controls when the case changes', () => {
  const { rerender } = render(
    <FilesTableContainer key="case-a" files={[file('a')]} />,
  );
  rerender(<FilesTableContainer key="case-a" files={[file('updated')]} />);
  expect(
    screen.queryByRole('link', { name: 'a.cram' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'updated.cram' }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search files'), {
    target: { value: 'updated' },
  });
  fireEvent.click(screen.getByText('Next'));
  rerender(<FilesTableContainer key="case-b" files={[file('b')]} />);
  expect(screen.getByRole('link', { name: 'b.cram' })).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'updated.cram' }),
  ).not.toBeInTheDocument();
  expect(screen.getByTestId('page')).toHaveTextContent('1');
  expect(screen.getByLabelText('Search files')).toHaveValue('');
});

it('renders an empty case without injecting fixture records', () => {
  render(<FilesTableContainer files={[]} />);
  expect(screen.getByTestId('text-total-item-count')).toHaveTextContent('0');
  expect(screen.queryAllByRole('row')).toHaveLength(0);
  expect(
    screen.queryByRole('link', { name: 'Download' }),
  ).not.toBeInTheDocument();
});
