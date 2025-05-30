"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

interface TimelineContextValue {
  startTime: number;
  endTime: number;
  minTimestamp: number;
  maxTimestamp: number;
  isInitialized: boolean;
  isPlaying: boolean;
  handleTimeRangeChange: (start: number, end: number) => void;
  handleDataRangeChange: (min: number, max: number) => void;
  handlePlayingStateChange: (playing: boolean) => void;
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

  // Initialization flag to prevent premature filtering
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Timeline playing state - starts paused by default
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Current selected time window - start with null values until data is loaded
  const [startTime, setStartTime] = useState<number>(safeStartTime);
  const [endTime, setEndTime] = useState<number>(safeCurrentTime);

  // Available data bounds (min/max timestamps in the dataset)
  const [minTimestamp, setMinTimestamp] = useState<number>(safeStartTime);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(safeCurrentTime);

  // Handle changes to the current time selection (called by TimeSlider)
  const handleTimeRangeChange = useCallback((start: number, end: number) => {
    if (!start || !end || isNaN(start) || isNaN(end) || !Number.isFinite(start) || !Number.isFinite(end)) {
      console.error(`TimelineProvider: Invalid time range values: start=${start}, end=${end}`);
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      console.warn(`TimelineProvider: Detected future dates, using safe fallback`);
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

  // Handle changes to the data bounds (called when dataset changes)
  const handleDataRangeChange = useCallback((min: number, max: number) => {
    if (!min || !max || isNaN(min) || isNaN(max) || !Number.isFinite(min) || !Number.isFinite(max)) {
      console.warn(`TimelineProvider: Invalid data range parameters: min=${min}, max=${max}`);
      return;
    }

    if (min >= max) {
      console.warn(`TimelineProvider: Invalid data range: min (${min}) >= max (${max})`);
      return;
    }

    console.log(`TimelineProvider: Setting data range: ${new Date(min).toISOString()} - ${new Date(max).toISOString()}`);

    // Update the available data bounds
    setMinTimestamp(min);
    setMaxTimestamp(max);

    // Only set initial time window if not already initialized
    if (!isInitialized) {
      console.log(`TimelineProvider: Initializing with full data range`);
      setStartTime(min);
      setEndTime(max);
      setIsInitialized(true);
    } else {
      // Constrain existing selection to new bounds if necessary
      const constrainedStart = Math.max(min, Math.min(startTime, max));
      const constrainedEnd = Math.max(min, Math.min(endTime, max));

      if (constrainedStart !== startTime || constrainedEnd !== endTime) {
        setStartTime(constrainedStart);
        setEndTime(constrainedEnd);
      }
    }
  }, [startTime, endTime, isInitialized]);

  // Handle changes to the playing state (called by TimeSlider)
  const handlePlayingStateChange = useCallback((playing: boolean) => {
    console.log(`TimelineProvider: Playing state changed to: ${playing}`);
    setIsPlaying(playing);
  }, []);

  return (
    <TimelineContext.Provider
      value={{
        startTime,
        endTime,
        minTimestamp,
        maxTimestamp,
        isInitialized,
        isPlaying,
        handleTimeRangeChange,
        handleDataRangeChange,
        handlePlayingStateChange,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
};
