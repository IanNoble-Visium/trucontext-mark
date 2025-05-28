"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface TimelineContextValue {
  startTime: number;
  endTime: number;
  minTimestamp: number;
  maxTimestamp: number;
  handleTimeRangeChange: (start: number, end: number) => void;
  handleDataRangeChange: (min: number, max: number) => void;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export function useTimeline() {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return ctx;
}

export const TimelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
  const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

  const [startTime, setStartTime] = useState<number>(safeStartTime);
  const [endTime, setEndTime] = useState<number>(safeCurrentTime);
  const [minTimestamp, setMinTimestamp] = useState<number>(safeStartTime);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(safeCurrentTime);

  const handleTimeRangeChange = useCallback((start: number, end: number) => {
    if (!start || !end || isNaN(start) || isNaN(end) || !Number.isFinite(start) || !Number.isFinite(end)) {
      console.error(`TimelineProvider: Invalid time range values: start=${start}, end=${end}`);
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();
      setStartTime(safeStartTime);
      setEndTime(safeCurrentTime);
      return;
    }

    const currentTime = Date.now();
    const safeStart = Math.min(start, currentTime);
    const safeEnd = Math.min(end, currentTime);
    if (safeStart <= 0 || safeEnd <= 0 || safeStart >= safeEnd) {
      console.warn(`TimelineProvider: Invalid time range after sanitization: start=${safeStart}, end=${safeEnd}`);
      return;
    }
    setStartTime(safeStart);
    setEndTime(safeEnd);
  }, []);

  const handleDataRangeChange = useCallback((min: number, max: number) => {
    setMinTimestamp(min);
    setMaxTimestamp(max);
    setStartTime(min);
    setEndTime(max);
  }, []);

  return (
    <TimelineContext.Provider
      value={{
        startTime,
        endTime,
        minTimestamp,
        maxTimestamp,
        handleTimeRangeChange,
        handleDataRangeChange,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
};
