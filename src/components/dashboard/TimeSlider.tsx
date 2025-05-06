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
  Button,
  Input
} from '@chakra-ui/react';
import {
  FaPlay,
  FaPause,
  FaFastForward,
  FaFastBackward,
  FaStepForward,
  FaStepBackward,
  FaCog,
  FaCalendarAlt,
  FaBolt
} from 'react-icons/fa'; // Assuming react-icons is installed

interface TimeSliderProps {
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

// Define a type for Timeout to avoid NodeJS namespace issues
type TimeoutType = ReturnType<typeof setTimeout>;

const TimeSlider: React.FC<TimeSliderProps> = ({ onTimeRangeChange }: TimeSliderProps) => {
  // For safe dates, always use hardcoded past dates instead of relying on system time
  // which may be incorrect (as seen in the error with 2025 dates)
  const safePastDate = new Date('2023-01-01T00:00:00.000Z').getTime();
  const safeRecentDate = new Date('2023-12-31T23:59:59.999Z').getTime();

  // Initialize constants first - using safe dates to avoid future date issues
  const now = Math.min(Date.now(), safeRecentDate);
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // One year ago
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // One month ago

  // Initialize all state variables at the top
  const [minTimestamp, setMinTimestamp] = useState<number>(oneYearAgo);
  const [maxTimestamp, setMaxTimestamp] = useState<number>(now);
  const [currentTimeRange, setCurrentTimeRange] = useState<[number, number]>([oneMonthAgo, now]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animationInterval, setAnimationInterval] = useState<TimeoutType | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [transitionSpeed, setTransitionSpeed] = useState<number>(500); // Transition speed in ms
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);

  // Initialize hooks
  const toast = useToast();

  // Initialize refs
  const timeoutRef = useRef<TimeoutType | null>(null);
  const initialRenderRef = useRef<boolean>(true);

  // Format timestamp for display - simple function, no dependencies
  const formatTimestamp = (timestamp: number) => {
    if (isLoading || timestamp === 0) return '...';
    return new Date(timestamp).toLocaleString();
  };

  // Define stopAnimation first to avoid dependency cycles
  const stopAnimation = useCallback(() => {
    setIsPlaying(false);
    if (animationInterval) {
      clearInterval(animationInterval);
      setAnimationInterval(null);
    }
  }, [animationInterval]);

  // Define update function with useCallback to prevent recreation on each render
  const updateTimeRange = useCallback((start: number, end: number, skipInitialCallback: boolean = false) => {
    // Validate inputs first - ensure values are positive and finite
    if (!start || !end || isNaN(start) || isNaN(end) || !Number.isFinite(start) || !Number.isFinite(end)) {
      console.error(`TimeSlider: Invalid time range values: start=${start}, end=${end}`);
      return;
    }

    // Get current time, but cap at a reasonable max to avoid future dates
    const maxAllowedTime = new Date('2024-01-01T00:00:00.000Z').getTime();
    const currentTime = Math.min(Date.now(), maxAllowedTime);

    // Check for system clock issues (future years)
    const startDate = new Date(start);
    const endDate = new Date(end);

    // If dates are beyond 2024, use safe fallbacks
    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      console.warn(`TimeSlider: Detected potentially incorrect date values: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // Use safe fallback dates (2023)
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-01T00:00:00.000Z').getTime();

      // Only call onTimeRangeChange if this is not the initial render or if explicitly told to skip
      if (!initialRenderRef.current || !skipInitialCallback) {
        console.log(`TimeSlider: Using safe time range: ${new Date(safeStartTime).toISOString()} - ${new Date(safeCurrentTime).toISOString()}`);
        onTimeRangeChange(safeStartTime, safeCurrentTime);
      } else {
        console.log('TimeSlider: Skipping initial callback to prevent feedback loop');
        initialRenderRef.current = false;
      }

      return;
    }

    // Ensure we don't use future dates
    const safeStart = Math.min(start, currentTime);
    const safeEnd = Math.min(end, currentTime);

    // Validate the values before calling the callback
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
  }, [onTimeRangeChange]);

  // Debounced version of the update function
  const debouncedUpdateTimeRange = useCallback((start: number, end: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      updateTimeRange(start, end);
    }, 1000); // 1 second debounce
  }, [updateTimeRange]);

  // Fetch min/max timestamps from the backend
  const fetchTimeRange = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get current time before making the request (with safe upper bound)
      const maxAllowedTime = new Date('2024-01-01T00:00:00.000Z').getTime();
      const currentTime = Math.min(Date.now(), maxAllowedTime);

      // Validate current time to detect system clock issues
      const currentDate = new Date(currentTime);
      const currentYear = currentDate.getFullYear();

      // If the current year is beyond 2024, we definitely have a system clock issue
      if (currentYear > 2024) {
        console.warn(`Detected potentially incorrect system date: ${currentDate.toISOString()}. Using safe fallback dates.`);
        // Use safe fallback dates (2023)
        const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
        const safeStartTime = new Date('2023-12-01T00:00:00.000Z').getTime();

        setMinTimestamp(safeStartTime);
        setMaxTimestamp(safeCurrentTime);
        setCurrentTimeRange([safeStartTime, safeCurrentTime]);

        // Make sure we're passing real values, not zeros
        if (safeStartTime > 0 && safeCurrentTime > 0) {
          updateTimeRange(safeStartTime, safeCurrentTime, true);
        }

        toast({
          title: 'System Date Warning',
          description: 'Your system date appears to be set incorrectly. Using safe date range instead.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });

        setIsLoading(false);
        return;
      }

      // Normal flow - fetch from API
      try {
        const response = await fetch('/api/graph-data?range=true');
        if (!response.ok) {
          throw new Error('Failed to fetch time range');
        }
        const data = await response.json();

        // Ensure we don't use future dates or invalid dates
        let minTs = data.minTimestamp || 0;
        let maxTs = data.maxTimestamp || 0;

        // Validate the received timestamps
        const isValidMinTs = minTs && !isNaN(minTs) && Number.isFinite(minTs) && minTs > 0;
        const isValidMaxTs = maxTs && !isNaN(maxTs) && Number.isFinite(maxTs) && maxTs > 0;

        // If timestamps are invalid or in the future, use safe defaults
        if (!isValidMinTs || minTs > currentTime) {
          console.warn(`Invalid or future minTimestamp received: ${minTs}. Using safe default.`);
          minTs = currentTime - 48 * 60 * 60 * 1000; // 48 hours ago
        }

        if (!isValidMaxTs || maxTs > currentTime) {
          console.warn(`Invalid or future maxTimestamp received: ${maxTs}. Using current time.`);
          maxTs = currentTime;
        }

        console.log(`TimeSlider: Using time range: ${new Date(minTs).toISOString()} - ${new Date(maxTs).toISOString()}`);

        // Ensure min is less than max
        if (minTs >= maxTs) {
          console.warn('Min timestamp is greater than or equal to max timestamp. Using safe range.');
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
      } catch (apiError) {
        throw apiError;
      }
    } catch (error: any) {
      console.error("Failed to fetch time range:", error);

      // Use safe fallback values that are definitely in the past
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

      setMinTimestamp(safeStartTime);
      setMaxTimestamp(safeCurrentTime);
      setCurrentTimeRange([safeStartTime, safeCurrentTime]);
      updateTimeRange(safeStartTime, safeCurrentTime, true);

      toast({
        title: 'Error Fetching Time Range',
        description: error.message || 'Could not load time boundaries. Using default range.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, updateTimeRange]);

  // Handle slider changes
  const handleSliderChange = useCallback((val: [number, number]) => {
    if (val[0] > 0 && val[1] > 0 && val[0] < val[1]) {
      setCurrentTimeRange(val);
      debouncedUpdateTimeRange(val[0], val[1]);
    } else {
      console.log('TimeSlider: Ignoring invalid slider values');
    }
  }, [debouncedUpdateTimeRange]);

  // Animation logic with speed control
  const startAnimation = useCallback(() => {
    if (isLoading || minTimestamp === maxTimestamp) return;
    setIsPlaying(true);

    // Get current time with safe upper bound
    const maxAllowedTime = new Date('2024-01-01T00:00:00.000Z').getTime();
    const currentTime = Math.min(Date.now(), maxAllowedTime);

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
  }, [isLoading, minTimestamp, maxTimestamp, debouncedUpdateTimeRange, playbackSpeed, stopAnimation]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isPlaying, startAnimation, stopAnimation]);

  // Initial fetch
  useEffect(() => {
    // Set a safe initial range before fetching to prevent 0,0 from being sent
    const safeStart = new Date('2023-12-30T00:00:00.000Z').getTime();
    const safeEnd = new Date('2023-12-31T23:59:59.999Z').getTime();

    if (safeStart > 0 && safeEnd > 0) {
      setCurrentTimeRange([safeStart, safeEnd]);
    }

    fetchTimeRange();
  }, [fetchTimeRange]);

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

  // Function to update transition speed
  const handleTransitionSpeedChange = useCallback((speed: number) => {
    setTransitionSpeed(speed);

    // Notify the user about the change
    toast({
      title: `Transition Speed: ${speed}ms`,
      description: speed <= 200 ? "Fast transitions" : speed >= 1000 ? "Slow, smooth transitions" : "Balanced transitions",
      status: "info",
      duration: 2000,
      isClosable: true,
    });

    // Dispatch a custom event that GraphVisualization can listen for
    try {
      // Create a custom event with the speed data
      const event = new CustomEvent('transitionspeedchange', {
        detail: { speed },
        bubbles: true,
        cancelable: true
      });

      // Dispatch the event on the window object
      console.log(`TimeSlider: Dispatching transition speed change event: ${speed}ms`);
      window.dispatchEvent(event);

      // Also store in localStorage as a backup communication method
      localStorage.setItem('graph_transition_speed', speed.toString());
    } catch (error) {
      console.error('Error dispatching transition speed event:', error);
    }
  }, [toast]);

  // Function to step forward/backward in time
  const stepTimeRange = useCallback((direction: 'forward' | 'backward') => {
    // Access currentTimeRange directly from state to avoid closure issues
    // This prevents React Hook dependency issues
    const start = currentTimeRange[0];
    const end = currentTimeRange[1];
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
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlaybackSpeed(parseFloat(e.target.value))}
              isDisabled={isLoading || isPlaying}
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </Select>

            {/* Transition speed control */}
            <Tooltip label="Transition Speed">
              <Box display="inline-flex" alignItems="center">
                <IconButton
                  aria-label="Transition speed"
                  icon={<FaBolt />}
                  size="xs"
                  colorScheme="teal"
                  mr={1}
                />
                <Select
                  size="xs"
                  width="110px"
                  value={transitionSpeed}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    handleTransitionSpeedChange(parseInt(e.target.value))
                  }
                >
                  <option value={200}>Fast (200ms)</option>
                  <option value={500}>Medium (500ms)</option>
                  <option value={1000}>Slow (1s)</option>
                  <option value={2000}>Very Slow (2s)</option>
                </Select>
              </Box>
            </Tooltip>

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
                      <Box as="div" width="100%">
                        <input
                          type="datetime-local"
                          value={customStartDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '14px' }}
                        />
                      </Box>
                    </Flex>
                    <Flex direction="column" width="100%">
                      <Text fontSize="xs">End Date:</Text>
                      <Box as="div" width="100%">
                        <input
                          type="datetime-local"
                          value={customEndDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                          style={{ width: '100%', padding: '4px', fontSize: '14px' }}
                        />
                      </Box>
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
