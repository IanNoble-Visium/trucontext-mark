"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  // Potentially add props for initial range, step, etc.
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

  // Fetch min/max timestamps from the backend
  const fetchTimeRange = useCallback(async () => {
    setIsLoading(true);
    try {
      // We need an API endpoint to get the min/max timestamps from the current dataset
      // Let's assume /api/graph-data can be extended or a new endpoint /api/time-range is created
      const response = await fetch('/api/graph-data?range=true'); // Placeholder: Modify API later
      if (!response.ok) {
        throw new Error('Failed to fetch time range');
      }
      const data = await response.json();

      // Assuming API returns { minTimestamp: number, maxTimestamp: number } in milliseconds
      const currentTime = Date.now();

      // Ensure we don't use future dates
      let minTs = data.minTimestamp || currentTime - 48 * 60 * 60 * 1000; // Default to 48 hours ago
      let maxTs = data.maxTimestamp || currentTime; // Default to now

      // Cap at current time to avoid future dates
      if (minTs > currentTime) minTs = currentTime - 48 * 60 * 60 * 1000;
      if (maxTs > currentTime) maxTs = currentTime;

      console.log(`TimeSlider: Received time range from API: ${new Date(minTs).toISOString()} - ${new Date(maxTs).toISOString()}`);

      if (minTs >= maxTs) {
         // Handle case with no data or single timestamp
         const safeStart = maxTs - 48 * 60 * 60 * 1000;
         setMinTimestamp(safeStart);
         setMaxTimestamp(maxTs);
         setCurrentTimeRange([safeStart, maxTs]);
         // Use debounced function to prevent immediate feedback loop
         debouncedTimeRangeChange(safeStart, maxTs);
         console.log(`TimeSlider: Using default range due to invalid data: ${new Date(safeStart).toISOString()} - ${new Date(maxTs).toISOString()}`);
      } else {
        setMinTimestamp(minTs);
        setMaxTimestamp(maxTs);

        // Use a reasonable default range (last 24 hours) instead of the full range
        const defaultStart = Math.max(minTs, maxTs - 24 * 60 * 60 * 1000);

        setCurrentTimeRange([defaultStart, maxTs]);
        // Use debounced function to prevent immediate feedback loop
        debouncedTimeRangeChange(defaultStart, maxTs);
        console.log(`TimeSlider: Using time range: ${new Date(defaultStart).toISOString()} - ${new Date(maxTs).toISOString()}`);
      }

    } catch (error: any) {
      console.error("Failed to fetch time range:", error);
      // Use default range on error - ensure we use past dates
      const currentTime = Date.now();
      const oneMonthAgo = currentTime - 30 * 24 * 60 * 60 * 1000;
      const oneYearAgo = currentTime - 365 * 24 * 60 * 60 * 1000;

      setMinTimestamp(oneYearAgo);
      setMaxTimestamp(currentTime);

      // Use a reasonable default range (last 24 hours)
      const errorStart = currentTime - 24 * 60 * 60 * 1000;

      setCurrentTimeRange([errorStart, currentTime]);
      // Use debounced function to prevent immediate feedback loop
      debouncedTimeRangeChange(errorStart, currentTime);
      console.log(`TimeSlider: Using fallback range due to error: ${new Date(errorStart).toISOString()} - ${new Date(currentTime).toISOString()}`);
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
  }, [debouncedTimeRangeChange, toast]);

  useEffect(() => {
    fetchTimeRange();
    // Need a way to refetch when dataset changes (e.g., after upload)
    // This might involve a global state or context, or a prop passed down.
  }, [fetchTimeRange]);

  // Use React's useRef for debouncing to maintain reference across renders
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const initialRenderRef = React.useRef<boolean>(true);

  // Debounced version of onTimeRangeChange
  const debouncedTimeRangeChange = useCallback((start: number, end: number) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      // Only trigger if the range is valid and different from the current range
      if (start > 0 && end > 0 && start < end) {
        console.log(`TimeSlider: Debounced update with range ${new Date(start).toISOString()} - ${new Date(end).toISOString()}`);

        // Only call onTimeRangeChange if this is not the initial render
        // This prevents the feedback loop on component mount
        if (!initialRenderRef.current) {
          onTimeRangeChange(start, end);
        } else {
          console.log('TimeSlider: Skipping initial callback to prevent feedback loop');
          initialRenderRef.current = false;
        }
      } else {
        console.log('TimeSlider: Invalid time range, not updating');
      }
    }, 1000); // 1 second debounce
  }, [onTimeRangeChange]);

  // Handle slider changes
  const handleSliderChange = (val: [number, number]) => {
    // Only update if the values are valid
    if (val[0] > 0 && val[1] > 0 && val[0] < val[1]) {
      setCurrentTimeRange(val);
      // Use debounced function to prevent too many API calls
      debouncedTimeRangeChange(val[0], val[1]);
    } else {
      console.log('TimeSlider: Ignoring invalid slider values');
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    if (isLoading || timestamp === 0) return '...';
    return new Date(timestamp).toLocaleString();
  };

  // --- Animation Logic (Improved with better throttling) ---
  const startAnimation = () => {
    if (isLoading || minTimestamp === maxTimestamp) return;
    setIsPlaying(true);

    // Ensure we're not using future dates
    const currentTime = Date.now();
    const safeMinTimestamp = Math.min(minTimestamp, currentTime);
    const safeMaxTimestamp = Math.min(maxTimestamp, currentTime);

    // Start animation from the beginning of the current range
    let currentEndTime = safeMinTimestamp;

    // Reduce the number of steps and increase the interval for less frequent updates
    const step = (safeMaxTimestamp - safeMinTimestamp) / 20; // Reduced to 20 steps
    let lastUpdateTime = 0;

    console.log(`TimeSlider: Starting animation from ${new Date(safeMinTimestamp).toISOString()} to ${new Date(safeMaxTimestamp).toISOString()}`);

    const interval = setInterval(() => {
      const now = Date.now();

      // Only update if at least 1000ms have passed since the last update
      if (now - lastUpdateTime < 1000 && lastUpdateTime > 0) {
        return;
      }

      lastUpdateTime = now;
      currentEndTime += step;

      if (currentEndTime >= safeMaxTimestamp) {
        currentEndTime = safeMaxTimestamp;
        stopAnimation(); // Stop when reaching the end
        return;
      }

      // Update slider to show progress up to currentEndTime
      setCurrentTimeRange([safeMinTimestamp, currentEndTime]);

      // Use debounced function to prevent too many API calls during animation
      debouncedTimeRangeChange(safeMinTimestamp, currentEndTime);
      console.log(`TimeSlider: Animation step to ${new Date(currentEndTime).toISOString()}`);
    }, 1000); // Increased to 1000ms (1 second) for less frequent updates

    setAnimationInterval(interval);
  };

  const stopAnimation = () => {
    setIsPlaying(false);
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [animationInterval]);
  // --- End Animation Logic ---

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
            step={(maxTimestamp - minTimestamp) / 500} // Adjust step for smoother sliding
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

