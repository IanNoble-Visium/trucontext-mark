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
      const minTs = data.minTimestamp || Date.now() - 48 * 60 * 60 * 1000; // Default to 48 hours ago
      const maxTs = data.maxTimestamp || Date.now(); // Default to now

      if (minTs >= maxTs) {
         // Handle case with no data or single timestamp
         setMinTimestamp(maxTs - 48 * 60 * 60 * 1000);
         setMaxTimestamp(maxTs);
         setCurrentTimeRange([maxTs - 48 * 60 * 60 * 1000, maxTs]);
         onTimeRangeChange(maxTs - 48 * 60 * 60 * 1000, maxTs);
      } else {
        setMinTimestamp(minTs);
        setMaxTimestamp(maxTs);
        setCurrentTimeRange([minTs, maxTs]);
        onTimeRangeChange(minTs, maxTs); // Initial full range
      }

    } catch (error: any) {
      console.error("Failed to fetch time range:", error);
      // Use default range on error
      const now = Date.now();
      const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
      setMinTimestamp(fortyEightHoursAgo);
      setMaxTimestamp(now);
      setCurrentTimeRange([fortyEightHoursAgo, now]);
      onTimeRangeChange(fortyEightHoursAgo, now);
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
  }, [onTimeRangeChange, toast]);

  useEffect(() => {
    fetchTimeRange();
    // Need a way to refetch when dataset changes (e.g., after upload)
    // This might involve a global state or context, or a prop passed down.
  }, [fetchTimeRange]);

  // Use React's useRef for debouncing to maintain reference across renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        onTimeRangeChange(start, end);
      } else {
        console.log('TimeSlider: Invalid time range, not updating');
      }
    }, 1000); // Increase to 1000ms (1 second) for better debouncing
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

    // Start animation from the beginning of the current range
    let currentEndTime = currentTimeRange[0];

    // Reduce the number of steps and increase the interval for less frequent updates
    const step = (maxTimestamp - minTimestamp) / 50;
    let lastUpdateTime = 0;

    const interval = setInterval(() => {
      const now = Date.now();

      // Only update if at least 500ms have passed since the last update
      if (now - lastUpdateTime < 500 && lastUpdateTime > 0) {
        return;
      }

      lastUpdateTime = now;
      currentEndTime += step;

      if (currentEndTime >= maxTimestamp) {
        currentEndTime = maxTimestamp;
        stopAnimation(); // Stop when reaching the end
      }

      // Update slider to show progress up to currentEndTime
      setCurrentTimeRange([minTimestamp, currentEndTime]);

      // Use debounced function to prevent too many API calls during animation
      debouncedTimeRangeChange(minTimestamp, currentEndTime);
    }, 500); // Increased to 500ms for less frequent updates

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

