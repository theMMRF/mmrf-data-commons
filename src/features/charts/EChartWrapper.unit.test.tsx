import React from 'react';
import { render, screen } from '@testing-library/react';
import { init } from 'echarts';
import EChartWrapper from './EChartWrapper';
import { handleDownloadPNG, handleDownloadSVG } from './utils';

jest.mock('echarts', () => ({ init: jest.fn() }));
jest.mock('@mantine/hooks', () => ({
  useResizeObserver: () => [null, { height: 0, width: 0 }],
}));

describe('EChartWrapper download ref lifecycle', () => {
  const chart = {
    setOption: jest.fn(),
    resize: jest.fn(),
    dispose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(init)
      .mockReturnValue(chart as unknown as ReturnType<typeof init>);
  });

  it('initializes from explicit dimensions before the observer reports a size', () => {
    render(<EChartWrapper option={{}} height={200} width={300} />);

    expect(init).toHaveBeenCalledWith(screen.getByRole('img'), null, {
      renderer: 'svg',
      height: 200,
      width: 300,
    });
  });

  it('initializes when explicit dimensions change from zero to nonzero', () => {
    const { rerender } = render(
      <EChartWrapper option={{}} height={0} width={0} />,
    );
    expect(init).not.toHaveBeenCalled();

    rerender(<EChartWrapper option={{}} height={200} width={300} />);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('clears the registered download ref and skips downloads after unmount', async () => {
    const chartRef = React.createRef<HTMLElement>();
    const { unmount } = render(
      <EChartWrapper
        option={{}}
        chartRef={chartRef}
        height={200}
        width={300}
      />,
    );
    expect(chartRef.current).toBe(screen.getByRole('img'));

    unmount();

    expect(chart.dispose).toHaveBeenCalledTimes(1);
    expect(chartRef.current).toBeNull();
    const createElement = jest.spyOn(document, 'createElement');
    try {
      await expect(
        handleDownloadSVG(chartRef, 'chart.svg'),
      ).resolves.toBeUndefined();
      await expect(
        handleDownloadPNG(chartRef, 'chart.png'),
      ).resolves.toBeUndefined();
      expect(createElement).not.toHaveBeenCalled();
    } finally {
      createElement.mockRestore();
    }
  });

  it('clears a replaced forwarded ref while registering the current node', () => {
    const previousRef = React.createRef<HTMLElement>();
    const currentRef = React.createRef<HTMLElement>();
    const { rerender } = render(
      <EChartWrapper
        option={{}}
        chartRef={previousRef}
        height={200}
        width={300}
      />,
    );

    rerender(
      <EChartWrapper
        option={{}}
        chartRef={currentRef}
        height={200}
        width={300}
      />,
    );

    expect(previousRef.current).toBeNull();
    expect(currentRef.current).toBe(screen.getByRole('img'));
  });
});
