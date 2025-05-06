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
  VStack,
  Select,
  Tooltip,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Button
} from '@chakra-ui/react';
import {
  FaPlay,
  FaPause,
  FaFastForward,
  FaFastBackward,
  FaStepForward,
  FaStepBackward,
  FaCog,
  FaCalendarAlt
} from 'react-icons/fa'; // Assuming react-icons is installed

interface TimeSliderProps {
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ onTimeRangeChange }) => {
  // Initialize constants first
  const now = Date.now();
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // One year ago
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // One month ago

  // Initialize all state variables at the top
  const [minTimestamp, setMinTimestamp] = useState<number>(oneYearAgo);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(now);
  const [currentTimeRange, setCurrentTimeRange] = useState<[number, number]>([oneMonthAgo, now]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animationInterval, setAnimationInterval] = useState<NodeJS.Timeout | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Initialize hooks
  const toast = useToast();

  // Initialize refs
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRenderRef = useRef<boolean>(true);

  // Format timestamp for display - simple function, no dependencies
  const formatTimestamp = (timestamp: number) => {
    if (isLoading || timestamp === 0) return '...';
    return new Date(timestamp).toLocaleString();
  };

  // Define a simple update function first - no dependencies
  const updateTimeRange = (start: number, end: number, skipInitialCallback: boolean = false) => {
    const currentTime = Date.now();

    // Ensure we don't use future dates
    const safeStart = Math.min(start, currentTime);
    const safeEnd = Math.min(end, currentTime);

    if (safeStart > 0 && safeEnd > 0 && safeStart < safeEnd) {
      // Only call onTimeRangeChange if this is not the initial render or if explicitly told to skip
      if (!initialRenderRef.current || !skipInitialCallback) {
        console.log(`TimeSlider: Updating time range to ${new Date(safeStart).toISOString()} - ${new Date(safeEnd).toISOString()}`);
        onTimeRangeChange(safeStart, safeEnd);
      } else {
        console.log('TimeSlider: Skipping initial callback to prevent feedback loop');
        initialRenderRef.current = false;
      }
    } else {
      console.log('TimeSlider: Invalid time range, not updating');
    }
  };

  // Debounced version of the update function
  const debouncedUpdateTimeRange = useCallback((start: number, end: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      updateTimeRange(start, end);
    }, 1000); // 1 second debounce
  }, []);

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
         updateTimeRange(safeStart, maxTs, true);
      } else {
        setMinTimestamp(minTs);
        setMaxTimestamp(maxTs);

        // Use a reasonable default range (last 24 hours) instead of the full range
        const defaultStart = Math.max(minTs, maxTs - 24 * 60 * 60 * 1000);

        setCurrentTimeRange([defaultStart, maxTs]);
        updateTimeRange(defaultStart, maxTs, true);
      }
    } catch (error: any) {
      console.error("Failed to fetch time range:", error);

      const currentTime = Date.now();
      const oneYearAgo = currentTime - 365 * 24 * 60 * 60 * 1000;
      const errorStart = currentTime - 24 * 60 * 60 * 1000;

      setMinTimestamp(oneYearAgo);
      setMaxTimestamp(currentTime);
      setCurrentTimeRange([errorStart, currentTime]);
      updateTimeRange(errorStart, currentTime, true);

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
  }, [toast]);

  // Handle slider changes
  const handleSliderChange = useCallback((val: [number, number]) => {
    if (val[0] > 0 && val[1] > 0 && val[0] < val[1]) {
      setCurrentTimeRange(val);
      debouncedUpdateTimeRange(val[0], val[1]);
    } else {
      console.log('TimeSlider: Ignoring invalid slider values');
    }
  }, [debouncedUpdateTimeRange]);

  // Playback speed is already defined at the top

  // Animation logic with speed control
  const startAnimation = useCallback(() => {
    if (isLoading || minTimestamp === maxTimestamp) return;
    setIsPlaying(true);

    const currentTime = Date.now();
    const safeMinTimestamp = Math.min(minTimestamp, currentTime);
    const safeMaxTimestamp = Math.min(maxTimestamp, currentTime);

    let currentEndTime = safeMinTimestamp;

    // Adjust number of steps based on playback speed
    // More steps = smoother animation but slower progress
    const numSteps = playbackSpeed < 1 ? 40 : 20;
    const step = (safeMaxTimestamp - safeMinTimestamp) / numSteps;

    let lastUpdateTime = 0;

    // Calculate interval based on playback speed
    // Faster speed = shorter interval
    const intervalTime = Math.max(100, Math.floor(1000 / playbackSpeed));

    console.log(`TimeSlider: Animation starting with speed ${playbackSpeed}x (interval: ${intervalTime}ms)`);

    const interval = setInterval(() => {
      const now = Date.now();

      // Throttle updates based on playback speed
      const minUpdateInterval = Math.max(100, Math.floor(1000 / playbackSpeed));
      if (now - lastUpdateTime < minUpdateInterval && lastUpdateTime > 0) {
        return;
      }

      lastUpdateTime = now;

      // Adjust step size based on playback speed
      const adjustedStep = step * playbackSpeed;
      currentEndTime += adjustedStep;

      if (currentEndTime >= safeMaxTimestamp) {
        currentEndTime = safeMaxTimestamp;
        stopAnimation();
        return;
      }

      setCurrentTimeRange([safeMinTimestamp, currentEndTime]);
      debouncedUpdateTimeRange(safeMinTimestamp, currentEndTime);
    }, intervalTime);

    setAnimationInterval(interval);
  }, [isLoading, minTimestamp, maxTimestamp, debouncedUpdateTimeRange, playbackSpeed]);

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

  // Custom date selection states are already defined at the top

  // Function to handle custom date selection
  const handleCustomDateApply = useCallback(() => {
    try {
      const startDate = new Date(customStartDate).getTime();
      const endDate = new Date(customEndDate).getTime();

      if (isNaN(startDate) || isNaN(endDate)) {
        toast({
          title: "Invalid date format",
          description: "Please enter valid dates",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (startDate >= endDate) {
        toast({
          title: "Invalid date range",
          description: "Start date must be before end date",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Update the time range
      setCurrentTimeRange([startDate, endDate]);
      debouncedUpdateTimeRange(startDate, endDate);
      setShowCustomDatePicker(false);
    } catch (error) {
      toast({
        title: "Error setting custom date",
        description: "Please check the date format",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [customStartDate, customEndDate, debouncedUpdateTimeRange, toast]);

  // Function to step forward/backward in time
  const stepTimeRange = useCallback((direction: 'forward' | 'backward') => {
    const [start, end] = currentTimeRange;
    const rangeDuration = end - start;

    // Step by 50% of the current range
    const stepSize = rangeDuration * 0.5;

    if (direction === 'forward') {
      const newStart = start + stepSize;
      const newEnd = end + stepSize;

      // Don't go beyond the max timestamp
      if (newEnd <= maxTimestamp) {
        setCurrentTimeRange([newStart, newEnd]);
        debouncedUpdateTimeRange(newStart, newEnd);
      }
    } else {
      const newStart = start - stepSize;
      const newEnd = end - stepSize;

      // Don't go before the min timestamp
      if (newStart >= minTimestamp) {
        setCurrentTimeRange([newStart, newEnd]);
        debouncedUpdateTimeRange(newStart, newEnd);
      }
    }
  }, [currentTimeRange, minTimestamp, maxTimestamp, debouncedUpdateTimeRange]);

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={3} align="stretch">
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontWeight="medium">Time Range Filter</Text>

          {/* Playback controls */}
          <HStack spacing={2}>
            <Tooltip label="Step backward">
              <IconButton
                aria-label="Step backward"
                icon={<FaStepBackward />}
                onClick={() => stepTimeRange('backward')}
                size="xs"
                isDisabled={isLoading || isPlaying}
              />
            </Tooltip>

            <Tooltip label={isPlaying ? "Pause" : "Play"}>
              <IconButton
                aria-label={isPlaying ? "Pause" : "Play"}
                icon={isPlaying ? <FaPause /> : <FaPlay />}
                onClick={togglePlayPause}
                size="xs"
                isDisabled={isLoading || minTimestamp === maxTimestamp}
              />
            </Tooltip>

            <Tooltip label="Step forward">
              <IconButton
                aria-label="Step forward"
                icon={<FaStepForward />}
                onClick={() => stepTimeRange('forward')}
                size="xs"
                isDisabled={isLoading || isPlaying}
              />
            </Tooltip>

            {/* Playback speed selector */}
            <Select
              size="xs"
              width="100px"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              isDisabled={isLoading || isPlaying}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </Select>

            {/* Custom date picker */}
            <Popover
              isOpen={showCustomDatePicker}
              onClose={() => setShowCustomDatePicker(false)}
            >
              <PopoverTrigger>
                <IconButton
                  aria-label="Custom date range"
                  icon={<FaCalendarAlt />}
                  size="xs"
                  onClick={() => {
                    // Initialize with current range - include time part
                    const startDate = new Date(currentTimeRange[0]);
                    const endDate = new Date(currentTimeRange[1]);

                    // Format as YYYY-MM-DDTHH:MM
                    setCustomStartDate(startDate.toISOString().slice(0, 16));
                    setCustomEndDate(endDate.toISOString().slice(0, 16));

                    setShowCustomDatePicker(true);
                  }}
                />
              </PopoverTrigger>
              <PopoverContent>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>Custom Time Range</PopoverHeader>
                <PopoverBody>
                  <VStack spacing={3}>
                    <Flex direction="column" width="100%">
                      <Text fontSize="xs">Start Date:</Text>
                      <input
                        type="datetime-local"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        style={{ width: '100%', padding: '4px', fontSize: '14px' }}
                      />
                    </Flex>
                    <Flex direction="column" width="100%">
                      <Text fontSize="xs">End Date:</Text>
                      <input
                        type="datetime-local"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        style={{ width: '100%', padding: '4px', fontSize: '14px' }}
                      />
                    </Flex>
                    <Button size="sm" colorScheme="blue" onClick={handleCustomDateApply}>
                      Apply
                    </Button>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>
        </Flex>

        <HStack spacing={4}>
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

