"use client";

// Define drag state types we'll use throughout the component
type DragState = {
  isDragging: boolean;
  startX: number;
  startTime: number;
  endTime: number;
};

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
  minTimestamp: number;
  maxTimestamp: number;
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

// Define a type for Timeout to avoid NodeJS namespace issues
type TimeoutType = ReturnType<typeof setTimeout>;

const TimeSlider: React.FC<TimeSliderProps> = ({ minTimestamp, maxTimestamp, onTimeRangeChange }: TimeSliderProps) => {
  // For safe dates, always use hardcoded past dates instead of relying on system time
  // which may be incorrect (as seen in the error with 2025 dates)
  const safePastDate = new Date('2023-01-01T00:00:00.000Z').getTime();
  const safeRecentDate = new Date('2023-12-31T23:59:59.999Z').getTime();

  // Initialize constants first - using safe dates to avoid future date issues
  const now = Math.min(Date.now(), safeRecentDate);
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // One year ago
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000; // One month ago

  // Initialize all state variables at the top
  // Use full time range if props are available, otherwise use safe defaults
  const [currentTimeRange, setCurrentTimeRange] = useState<[number, number]>(() => {
    // If minTimestamp and maxTimestamp are provided and valid, use them
    if (minTimestamp && maxTimestamp && minTimestamp < maxTimestamp &&
        minTimestamp > 0 && maxTimestamp > 0) {
      console.log(`TimeSlider: Initializing with full dataset range: ${new Date(minTimestamp).toISOString()} - ${new Date(maxTimestamp).toISOString()}`);
      return [minTimestamp, maxTimestamp];
    }
    // Otherwise use safe defaults
    console.log(`TimeSlider: Initializing with safe default range: ${new Date(oneMonthAgo).toISOString()} - ${new Date(now).toISOString()}`);
    return [oneMonthAgo, now];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [animationInterval, setAnimationInterval] = useState<TimeoutType | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [transitionSpeed, setTransitionSpeed] = useState<number>(500); // Transition speed in ms
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState<boolean>(false);
  const [isDraggingCenter, setIsDraggingCenter] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragStartRange, setDragStartRange] = useState<[number, number]>([0, 0]);

  // Initialize hooks
  const toast = useToast();

  // Initialize refs
  const timeoutRef = useRef<TimeoutType | null>(null);
  const initialRenderRef = useRef<boolean>(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragMoveHandler = useRef<(e: MouseEvent) => void>();
  const dragEndHandler = useRef<(e: MouseEvent) => void>();

  // Create a comprehensive drag state ref that contains all needed values
  // This prevents issues with React state updates not being immediately available
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startTime: number;
    endTime: number;
    lastClientX: number; // Track the last mouse position
  }>({
    isDragging: false,
    startX: 0,
    startTime: 0,
    endTime: 0,
    lastClientX: 0
  });

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

    try {
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

      // Check for unreasonable dates (far in the past)
      if (startDate.getFullYear() < 2000 || endDate.getFullYear() < 2000) {
        console.warn(`TimeSlider: Detected potentially incorrect past dates: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        // Use safe fallback dates (2023)
        const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
        const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

        if (!initialRenderRef.current || !skipInitialCallback) {
          console.log(`TimeSlider: Using safe time range: ${new Date(safeStartTime).toISOString()} - ${new Date(safeCurrentTime).toISOString()}`);
          onTimeRangeChange(safeStartTime, safeCurrentTime);
        } else {
          console.log('TimeSlider: Skipping initial callback to prevent feedback loop');
          initialRenderRef.current = false;
        }

        return;
      }
    } catch (error) {
      console.error(`TimeSlider: Error validating dates: ${error}`);

      // Use safe fallback dates (2023)
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

      if (!initialRenderRef.current || !skipInitialCallback) {
        onTimeRangeChange(safeStartTime, safeCurrentTime);
      } else {
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

    // Use a much shorter delay (50ms) for a more responsive feel while still preventing excessive updates
    timeoutRef.current = setTimeout(() => {
      updateTimeRange(start, end);
    }, 50); // Reduced from 1000ms to 50ms for near real-time updates
  }, [updateTimeRange]);

  // Animation logic with speed control
  const startAnimation = useCallback(() => {
    if (isLoading || minTimestamp === maxTimestamp) return;
    setIsPlaying(true);

    // Get current time with safe upper bound
    const maxAllowedTime = new Date('2024-01-01T00:00:00.000Z').getTime();
    const currentTime = Math.min(Date.now(), maxAllowedTime);

    // Use the current time range instead of min/max timestamps
    const startTime = currentTimeRange[0];
    const endTime = currentTimeRange[1];
    const windowDuration = endTime - startTime; // Keep track of the original window duration

    // Calculate the maximum animation end point, preserving the window size
    const animationEndTime = Math.min(maxTimestamp - windowDuration, currentTime - windowDuration);

    // Start from the current position
    let currentPosition = startTime;

    // Adjust number of steps based on playback speed
    const numSteps = playbackSpeed < 1 ? 40 : 20;
    const totalPlaybackRange = Math.max(0, animationEndTime - startTime);
    const step = totalPlaybackRange / numSteps;

    let lastUpdateTime = 0;

    // Calculate interval based on playback speed
    const intervalTime = Math.max(100, Math.floor(1000 / playbackSpeed));

    console.log(`TimeSlider: Animation starting with speed ${playbackSpeed}x (interval: ${intervalTime}ms)`);
    console.log(`TimeSlider: Window duration: ${windowDuration}ms (${windowDuration / (1000 * 60)} minutes)`);

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
      currentPosition += adjustedStep;

      // Check if we've reached the end of the animation
      if (currentPosition >= animationEndTime) {
        currentPosition = animationEndTime;
        stopAnimation();
        return;
      }

      // Calculate new start and end times while preserving the original window duration
      const newStart = currentPosition;
      const newEnd = newStart + windowDuration;

      // Validate the new range is within bounds
      if (newEnd <= maxTimestamp) {
        setCurrentTimeRange([newStart, newEnd]);
        debouncedUpdateTimeRange(newStart, newEnd);
      } else {
        // We've reached the end, stop the animation
        stopAnimation();
      }
    }, intervalTime);

    setAnimationInterval(interval);
  }, [isLoading, minTimestamp, maxTimestamp, currentTimeRange, debouncedUpdateTimeRange, playbackSpeed, stopAnimation]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isPlaying, startAnimation, stopAnimation]);

  // Initial range setup based on props - use full time range by default
  useEffect(() => {
    // Use the full time range from minTimestamp to maxTimestamp
    // This ensures all nodes and relationships are visible on first load
    console.log(`TimeSlider: Setting initial range to full dataset range: ${new Date(minTimestamp).toISOString()} - ${new Date(maxTimestamp).toISOString()}`);
    setCurrentTimeRange([minTimestamp, maxTimestamp]);
    updateTimeRange(minTimestamp, maxTimestamp, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTimestamp, maxTimestamp]);

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

  const stepTimeRange = useCallback((direction: 'forward' | 'backward') => {
    const start = currentTimeRange[0];
    const end = currentTimeRange[1];
    const rangeDuration = end - start;
    const stepSize = rangeDuration * 0.5;
    let newStart, newEnd;
    if (direction === 'forward') {
      newStart = Math.min(start + stepSize, maxTimestamp - rangeDuration);
      newEnd = Math.min(end + stepSize, maxTimestamp);
    } else {
      newStart = Math.max(start - stepSize, minTimestamp);
      newEnd = Math.max(end - stepSize, minTimestamp + rangeDuration);
    }
    if (newStart < newEnd) {
      setCurrentTimeRange([newStart, newEnd]);
      debouncedUpdateTimeRange(newStart, newEnd);
    }
  }, [currentTimeRange, minTimestamp, maxTimestamp, debouncedUpdateTimeRange]);

  // Cleanup interval on unmount
  useEffect(() => {
    // Cleanup function
    return () => {
      if (animationInterval) {
        clearInterval(animationInterval);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Always clean up event listeners on unmount using the refs
      if (dragMoveHandler.current) {
        document.removeEventListener('mousemove', dragMoveHandler.current);
      }
      if (dragEndHandler.current) {
        document.removeEventListener('mouseup', dragEndHandler.current);
      }
      document.body.classList.remove('timeline-dragging');
    };
  }, [animationInterval]);

  const handleCenterDragMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragStateRef.current.isDragging || !sliderRef.current) return;
    const sliderRect = sliderRef.current.getBoundingClientRect();
    const sliderWidth = sliderRect.width;
    if (sliderWidth <= 0) return;
    const { startX, startTime, endTime } = dragStateRef.current;
    const deltaX = e.clientX - startX;
    const deltaRatio = deltaX / sliderWidth;
    const totalTimeRange = maxTimestamp - minTimestamp;
    const deltaTime = deltaRatio * totalTimeRange;
    const originalDuration = endTime - startTime;
    let newStart = Math.round(startTime + deltaTime);
    let newEnd = newStart + originalDuration;
    if (newStart < minTimestamp) {
      newStart = minTimestamp;
      newEnd = minTimestamp + originalDuration;
    } else if (newEnd > maxTimestamp) {
      newEnd = maxTimestamp;
      newStart = maxTimestamp - originalDuration;
    }
    // Clamp
    newStart = Math.max(minTimestamp, Math.min(newStart, maxTimestamp - originalDuration));
    newEnd = Math.max(minTimestamp + originalDuration, Math.min(newEnd, maxTimestamp));
    setCurrentTimeRange([newStart, newEnd]);
    // Call update immediately without debounce for drag movements
    updateTimeRange(newStart, newEnd);
  }, [minTimestamp, maxTimestamp, updateTimeRange]);
  dragMoveHandler.current = handleCenterDragMove;

  // Define the handleCenterDragEnd function with improved cleanup
  const handleCenterDragEnd = useCallback((e: MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.debug('Drag end triggered by', e.type);
    document.removeEventListener('mousemove', dragMoveHandler.current!, true);
    document.removeEventListener('mouseup', dragEndHandler.current!, true);
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      setIsDraggingCenter(false);
      document.body.classList.remove('timeline-dragging');
      document.body.style.cursor = '';
      const finalStart = currentTimeRange[0];
      const finalEnd = currentTimeRange[1];
      console.log(`Drag completed: ${new Date(finalStart).toISOString()} - ${new Date(finalEnd).toISOString()}`);

      // Dispatch drag end event
      try {
        const event = new CustomEvent('timelinedragstate', {
          detail: { isDragging: false },
          bubbles: true,
          cancelable: true
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Error dispatching drag state event:', error);
      }
    }
  }, [currentTimeRange]);
  dragEndHandler.current = handleCenterDragEnd;

  // Define a more robust handleCenterDragStart function with low-level event handling
  const handleCenterDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || isPlaying) return;
    if (dragStateRef.current.isDragging) return;
    console.log('Drag start event triggered at', e.clientX);
    const exactStart = currentTimeRange[0];
    const exactEnd = currentTimeRange[1];
    setIsDraggingCenter(true);
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startTime: exactStart,
      endTime: exactEnd,
      lastClientX: e.clientX
    };
    document.body.classList.add('timeline-dragging');
    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', dragMoveHandler.current!, true);
    document.addEventListener('mouseup', dragEndHandler.current!, true);
    console.log(`Drag started: ${new Date(exactStart).toISOString()} - ${new Date(exactEnd).toISOString()}`);

    // Dispatch drag state event
    try {
      const event = new CustomEvent('timelinedragstate', {
        detail: { isDragging: true },
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error dispatching drag state event:', error);
    }
  }, [isLoading, isPlaying, currentTimeRange]);

  // Add stronger style elements to ensure dragging behavior works properly
  useEffect(() => {
    // Create a style element with more comprehensive rules
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      body.timeline-dragging {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        cursor: grabbing !important;
        overflow-x: hidden !important;
      }
      body.timeline-dragging * {
        user-select: none !important;
        -webkit-user-select: none !important;
        cursor: grabbing !important;
        pointer-events: none;
      }
      body.timeline-dragging [data-testid="center-drag-area"] {
        pointer-events: auto !important;
        cursor: grabbing !important;
      }
    `;
    document.head.appendChild(styleElement);

    // Cleanup function to remove the style element
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // After all state declarations, add:
  useEffect(() => {
    // Only set loading to false if min/max are valid and not equal
    if (
      typeof minTimestamp === 'number' &&
      typeof maxTimestamp === 'number' &&
      minTimestamp < maxTimestamp
    ) {
      setIsLoading(false);
    }
  }, [minTimestamp, maxTimestamp]);

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
          <Box position="relative" flex="1" ref={sliderRef}>
            {/* Base RangeSlider component */}
            <RangeSlider
              aria-label={['min', 'max']}
              min={minTimestamp}
              max={maxTimestamp}
              step={(maxTimestamp - minTimestamp) / 500}
              value={currentTimeRange}
              onChange={(val: [number, number]) => {
                // Clamp to min/max
                let [start, end] = val;
                start = Math.max(minTimestamp, Math.min(start, maxTimestamp));
                end = Math.max(minTimestamp, Math.min(end, maxTimestamp));
                if (start < end) {
                  setCurrentTimeRange([start, end]);
                  // Call update immediately without debounce for slider movements
                  updateTimeRange(start, end);
                } else {
                  console.log('TimeSlider: Ignoring invalid slider values');
                }
              }}
              isDisabled={isLoading || isPlaying}
            >
              <RangeSliderTrack>
                <RangeSliderFilledTrack />
              </RangeSliderTrack>
              <RangeSliderThumb index={0} zIndex={2} />
              <RangeSliderThumb index={1} zIndex={2} />
            </RangeSlider>

            {/* Separate overlay for the draggable center area */}
            <Box
              position="absolute"
              top="0"
              left={`${((currentTimeRange[0] - minTimestamp) / (maxTimestamp - minTimestamp)) * 100}%`}
              width={`${((currentTimeRange[1] - currentTimeRange[0]) / (maxTimestamp - minTimestamp)) * 100}%`}
              height="100%"
              backgroundColor="rgba(66, 153, 225, 0.2)"
              cursor={isLoading || isPlaying ? "not-allowed" : "grab"}
              _hover={{ backgroundColor: "rgba(66, 153, 225, 0.3)" }}
              _active={{ cursor: "grabbing", backgroundColor: "rgba(66, 153, 225, 0.5)" }}
              zIndex={10}
              onMouseDown={!isLoading && !isPlaying ? handleCenterDragStart : undefined}
              style={{ pointerEvents: isLoading || isPlaying ? 'none' : 'auto' }}
              data-testid="center-drag-area"
            >
              {/* Visual indicator for the drag handle */}
              <Flex
                height="100%"
                alignItems="center"
                justifyContent="center"
                pointerEvents="none"
              >
                <Box
                  width="24px"
                  height="12px"
                  borderRadius="sm"
                  border="2px solid"
                  borderColor="blue.500"
                  backgroundColor="blue.100"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                  opacity={isLoading || isPlaying ? 0.3 : 0.8}
                >
                  <Box width="12px" height="1px" backgroundColor="blue.700" mb="2px" />
                  <Box width="12px" height="1px" backgroundColor="blue.700" />
                </Box>
              </Flex>
            </Box>
          </Box>
          <Text fontSize="xs" minW="140px" textAlign="center">{formatTimestamp(currentTimeRange[1])}</Text>
        </HStack>
      </VStack>
    </Box>
  );
};

export default TimeSlider;































