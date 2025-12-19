import { useCallback, useRef, useState } from "react";
import { type IChartApi, type Time } from "lightweight-charts";
import { type CandlestickData } from "lightweight-charts";

interface ViewportState {
  userViewportSet: boolean;
  lastViewportRange: { from: Time; to: Time } | null;
  isDataInitialized: boolean;
}

export const useChartViewport = () => {
  const [viewportState, setViewportState] = useState<ViewportState>({
    userViewportSet: false,
    lastViewportRange: null,
    isDataInitialized: false,
  });

  const handleViewportChange = useCallback((
    visibleRange: { from: Time; to: Time } | null,
    chartRef: React.MutableRefObject<IChartApi | null>,
    isDataInitialized: boolean
  ) => {
    if (process.env.NODE_ENV === "development") {
      console.log("[useChartViewport] Viewport change detected:", {
        hasVisibleRange: !!visibleRange,
        isDataInitialized,
        userViewportSet: viewportState.userViewportSet,
      });
    }

    if (visibleRange && isDataInitialized) {
      if (!viewportState.userViewportSet) {
        if (process.env.NODE_ENV === "development") {
          console.log("[useChartViewport] First user viewport interaction");
        }
        setViewportState(prev => ({
          ...prev,
          userViewportSet: true,
          lastViewportRange: visibleRange,
        }));
      } else {
        setViewportState(prev => ({
          ...prev,
          lastViewportRange: visibleRange,
        }));
      }
    }
  }, [viewportState.userViewportSet]);

  const manageViewport = useCallback((
    chartRef: React.MutableRefObject<IChartApi | null>,
    chartData: { candlestick: CandlestickData[] },
    viewportSizeOverride?: number,
    responsiveViewportSize?: number,
    scrollToLatest?: boolean
  ) => {
    if (!chartRef.current || chartData.candlestick.length === 0) return;

    const viewportSize = viewportSizeOverride || responsiveViewportSize || 40;
    const dataLength = chartData.candlestick.length;

    if (process.env.NODE_ENV === "development") {
      console.log("[useChartViewport] Managing viewport:", {
        candlestickCount: dataLength,
        isDataInitialized: viewportState.isDataInitialized,
        userViewportSet: viewportState.userViewportSet,
        scrollToLatest,
        viewportSize,
      });
    }

    if (!viewportState.isDataInitialized) {
      setViewportState(prev => ({ ...prev, isDataInitialized: true }));
    }

    if (scrollToLatest || !viewportState.userViewportSet) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useChartViewport] Setting viewport to latest data");
      }

      const startIndex = Math.max(0, dataLength - viewportSize);
      const from = chartData.candlestick[startIndex].time;
      const to = chartData.candlestick[dataLength - 1].time;
      chartRef.current.timeScale().setVisibleRange({ from, to });

      if (scrollToLatest) {
        setViewportState(prev => ({ ...prev, userViewportSet: false }));
      }
    } else if (viewportState.lastViewportRange) {
      if (process.env.NODE_ENV === "development") {
        console.log("[useChartViewport] Restoring user viewport");
      }

      try {
        const currentRange = chartRef.current.timeScale().getVisibleRange();
        const needsRestore =
          !currentRange ||
          Math.abs(Number(currentRange.from) - Number(viewportState.lastViewportRange.from)) > 1000;

        if (process.env.NODE_ENV === "development") {
          console.log("[useChartViewport] Viewport restoration check:", {
            hasCurrentRange: !!currentRange,
            currentFrom: currentRange?.from,
            expectedFrom: viewportState.lastViewportRange.from,
            difference: currentRange && viewportState.lastViewportRange
              ? Math.abs(Number(currentRange.from) - Number(viewportState.lastViewportRange.from))
              : "N/A",
            needsRestore,
          });
        }

        if (needsRestore) {
          chartRef.current.timeScale().setVisibleRange(viewportState.lastViewportRange);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.log("[useChartViewport] Failed to restore viewport:", error);
        }
      }
    }
  }, [
    viewportState.isDataInitialized,
    viewportState.userViewportSet,
    viewportState.lastViewportRange,
  ]);

  const resetViewport = useCallback(() => {
    setViewportState({
      userViewportSet: false,
      lastViewportRange: null,
      isDataInitialized: false,
    });
  }, []);

  return {
    viewportState,
    handleViewportChange,
    manageViewport,
    resetViewport,
  };
};