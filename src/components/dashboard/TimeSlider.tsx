"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Text,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  HStack,
  IconButton,
  useToast,
  Spinner,
  VStack
} from '@chakra-ui/react';
import { FaPlay, FaPause } from 'react-icons/fa'; // Assuming react-icons is installed

interface TimeSliderProps {
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ onTimeRangeChange }) => {
  // Initialize with default values that won't trigger immediate API calls
  // Use past dates to avoid querying future dates which won't have data
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // One year ago
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // One month ago

  // Use a wider default range to increase chances of finding data
  const [minTimestamp, setMinTimestamp] = useState<number>(oneYearAgo);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(now);
  const [currentTimeRange, setCurrentTimeRange] = useState<[number, number]>([oneMonthAgo, now]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);
  const toast = useToast();

  // Use refs for debouncing and tracking initial render
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRenderRef = useRef<boolean>(true);

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    if (isLoading || timestamp === 0) return '...';
    return new Date(timestamp).toLocaleString();
  };

  // Safe update function that prevents future dates
  const safeUpdateTimeRange = useCallback((start: number, end: number) => {
    const currentTime = Date.now();

    // Ensure we don't use future dates
    const safeStart = Math.min(start, currentTime);
    const safeEnd = Math.min(end, currentTime);

    if (safeStart > 0 && safeEnd > 0 && safeStart < safeEnd) {
      // Only call onTimeRangeChange if this is not the initial render
      if (!initialRenderRef.current) {
        console.log(`TimeSlider: Updating time range to ${new Date(safeStart).toISOString()} - ${new Date(safeEnd).toISOString()}`);
        onTimeRangeChange(safeStart, safeEnd);
      } else {
        console.log('TimeSlider: Skipping initial callback to prevent feedback loop');
        initialRenderRef.current = false;
      }
    } else {
      console.log('TimeSlider: Invalid time range, not updating');
    }
  }, [onTimeRangeChange]);

  // Debounced version of the update function
  const debouncedUpdateTimeRange = useCallback((start: number, end: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      safeUpdateTimeRange(start, end);
    }, 1000); // 1 second debounce
  }, [safeUpdateTimeRange]);

  // Fetch min/max timestamps from the backend
  const fetchTimeRange = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/graph-data?range=true');
      if (!response.ok) {
        throw new Error('Failed to fetch time range');
      }
      const data = await response.json();

      const currentTime = Date.now();

      // Ensure we don't use future dates
      let minTs = data.minTimestamp || currentTime - 48 * 60 * 60 * 1000;
      let maxTs = data.maxTimestamp || currentTime;

      // Cap at current time to avoid future dates
      if (minTs > currentTime) minTs = currentTime - 48 * 60 * 60 * 1000;
      if (maxTs > currentTime) maxTs = currentTime;

      console.log(`TimeSlider: Received time range from API: ${new Date(minTs).toISOString()} - ${new Date(maxTs).toISOString()}`);

      if (minTs >= maxTs) {
         const safeStart = maxTs - 48 * 60 * 60 * 1000;
         setMinTimestamp(safeStart);
         setMaxTimestamp(maxTs);
         setCurrentTimeRange([safeStart, maxTs]);
         safeUpdateTimeRange(safeStart, maxTs);
      } else {
        setMinTimestamp(minTs);
        setMaxTimestamp(maxTs);

        // Use a reasonable default range (last 24 hours) instead of the full range
        const defaultStart = Math.max(minTs, maxTs - 24 * 60 * 60 * 1000);

        setCurrentTimeRange([defaultStart, maxTs]);
        safeUpdateTimeRange(defaultStart, maxTs);
      }
    } catch (error: any) {
      console.error("Failed to fetch time range:", error);

      const currentTime = Date.now();
      const oneYearAgo = currentTime - 365 * 24 * 60 * 60 * 1000;
      const errorStart = currentTime - 24 * 60 * 60 * 1000;

      setMinTimestamp(oneYearAgo);
      setMaxTimestamp(currentTime);
      setCurrentTimeRange([errorStart, currentTime]);
      safeUpdateTimeRange(errorStart, currentTime);

      toast({
        title: 'Error Fetching Time Range',
        description: error.message || 'Could not load time boundaries.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [safeUpdateTimeRange, toast]);

  // Handle slider changes
  const handleSliderChange = useCallback((val: [number, number]) => {
    if (val[0] > 0 && val[1] > 0 && val[0] < val[1]) {
      setCurrentTimeRange(val);
      debouncedUpdateTimeRange(val[0], val[1]);
    } else {
      console.log('TimeSlider: Ignoring invalid slider values');
    }
  }, [debouncedUpdateTimeRange]);

  // Animation logic
  const startAnimation = useCallback(() => {
    if (isLoading || minTimestamp === maxTimestamp) return;
    setIsPlaying(true);

    const currentTime = Date.now();
    const safeMinTimestamp = Math.min(minTimestamp, currentTime);
    const safeMaxTimestamp = Math.min(maxTimestamp, currentTime);

    let currentEndTime = safeMinTimestamp;
    const step = (safeMaxTimestamp - safeMinTimestamp) / 20;
    let lastUpdateTime = 0;

    const interval = setInterval(() => {
      const now = Date.now();

      if (now - lastUpdateTime < 1000 && lastUpdateTime > 0) {
        return;
      }

      lastUpdateTime = now;
      currentEndTime += step;

      if (currentEndTime >= safeMaxTimestamp) {
        currentEndTime = safeMaxTimestamp;
        stopAnimation();
        return;
      }

      setCurrentTimeRange([safeMinTimestamp, currentEndTime]);
      debouncedUpdateTimeRange(safeMinTimestamp, currentEndTime);
    }, 1000);

    setAnimationInterval(interval);
  }, [isLoading, minTimestamp, maxTimestamp, debouncedUpdateTimeRange]);

  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
    }
  }, [animationInterval]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isPlaying, startAnimation, stopAnimation]);

  // Initial fetch
  useEffect(() => {
    fetchTimeRange();
  }, [fetchTimeRange]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [animationInterval]);

  if (isLoading) {
    return <Box p={4} borderWidth="1px" borderRadius="lg"><Spinner size="md" /></Box>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={3} align="stretch">
        <Text fontWeight="medium">Time Range Filter</Text>
        <HStack spacing={4}>
           <IconButton
            aria-label={isPlaying ? 'Pause' : 'Play'}
            icon={isPlaying ? <FaPause /> : <FaPlay />}
            onClick={togglePlayPause}
            size="sm"
            isDisabled={isLoading || minTimestamp === maxTimestamp}
          />
          <Text fontSize="xs" minW="140px" textAlign="center">{formatTimestamp(currentTimeRange[0])}</Text>
          <RangeSlider
            aria-label={['min', 'max']}
            min={minTimestamp}
            max={maxTimestamp}
            step={(maxTimestamp - minTimestamp) / 500}
            value={currentTimeRange}
            onChange={handleSliderChange}
            isDisabled={isLoading || isPlaying}
            flex="1"
          >
            <RangeSliderTrack>
              <RangeSliderFilledTrack />
            </RangeSliderTrack>
            <RangeSliderThumb index={0} />
            <RangeSliderThumb index={1} />
          </RangeSlider>
          <Text fontSize="xs" minW="140px" textAlign="center">{formatTimestamp(currentTimeRange[1])}</Text>
        </HStack>
      </VStack>
    </Box>
  );
};

export default TimeSlider;

