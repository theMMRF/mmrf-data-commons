import React, { useCallback, useRef, useState } from 'react';
import { init, EChartsOption, ECharts } from "echarts";
import { useDeepCompareEffect } from "use-deep-compare";
import { useResizeObserver } from '@mantine/hooks';

export interface EChartWrapperProps {
  readonly option: EChartsOption;
  readonly chartRef?: React.MutableRefObject<HTMLElement>;
  readonly height: number;
  readonly width: number;
}

const EChartWrapper: React.FC<EChartWrapperProps> = ({
  option,
  chartRef: forwardedChartRef,
  height,
  width,
}: EChartWrapperProps) => {
  const [chartRoot, setChartRoot] = useState<ECharts | undefined>(undefined);
  const [containerRef, rect] = useResizeObserver<HTMLDivElement>();
  const chartRef = useRef<HTMLDivElement>(null);
  const setChartRef = useCallback(
    (node: HTMLDivElement | null) => {
      chartRef.current = node;
      if (forwardedChartRef && node) {
        forwardedChartRef.current = node;
      }
    },
    [forwardedChartRef],
  );

  useDeepCompareEffect(() => {
    let chart: ECharts | undefined;

    if (
      chartRef.current !== null &&
      height !== 0 &&
      width !== 0
    ) {
      chart = init(chartRef.current, null, {
        renderer: "svg",
        height,
        width,
      });

      chart.setOption(option);
      chart.resize();
      setChartRoot(chart);
    }

    return () => {
      chart?.dispose();
    };
  }, [height, width, option]);

  useDeepCompareEffect(() => {
    if (chartRoot && rect.height && rect.width) {
      chartRoot.resize();
    }
  }, [rect]);


  return (
    <div ref={containerRef} style={{ height, width, margin: "0 auto" }}>
      <div ref={setChartRef} role="img" />
    </div>
  );
};

export default EChartWrapper;
