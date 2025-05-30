"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Card,
  CardBody,
  VStack,
  HStack,
  Flex,
  Text,
  Button,
  Badge,
  IconButton,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Select,
  Tooltip,
  useColorModeValue,
  useToast,
  Input,
  Icon,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FaPlay,
  FaPause,
  FaFastForward,
  FaFastBackward,
  FaStepForward,
  FaStepBackward,
  FaCog,
  FaClock,
  FaExpand,
} from 'react-icons/fa';
import { useTimeline } from '@/contexts/TimelineContext';

interface TimeSliderProps {
  minTimestamp: number;
  maxTimestamp: number;
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  minTimestamp,
  maxTimestamp,
  onTimeRangeChange
}) => {
  // Get timeline context for playing state management
  const { handlePlayingStateChange } = useTimeline();

  // Theme colors
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(30, 41, 59, 0.8)');
  const borderColor = useColorModeValue('rgba(226, 232, 240, 0.8)', 'rgba(51, 65, 85, 0.8)');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('brand.500', 'brand.400');

  const toast = useToast();

  // Validate and normalize input timestamps
  const { validMin, validMax, isValid } = useMemo(() => {
    // Basic sanity checks - ensure timestamps are valid numbers
    const isMinValid = typeof minTimestamp === 'number' &&
                      minTimestamp > 0 &&
                      !isNaN(minTimestamp) &&
                      Number.isFinite(minTimestamp);

    const isMaxValid = typeof maxTimestamp === 'number' &&
                      maxTimestamp > 0 &&
                      !isNaN(maxTimestamp) &&
                      Number.isFinite(maxTimestamp);

    const isRangeValid = isMinValid && isMaxValid && minTimestamp < maxTimestamp;

    // Additional check: ensure dates are reasonable (after year 2000, before year 2030)
    if (isRangeValid) {
      const minDate = new Date(minTimestamp);
      const maxDate = new Date(maxTimestamp);
      const minYear = minDate.getFullYear();
      const maxYear = maxDate.getFullYear();

      const isYearRangeValid = minYear >= 2000 && minYear <= 2030 && maxYear >= 2000 && maxYear <= 2030;

      if (isYearRangeValid) {
        return {
          validMin: minTimestamp,
          validMax: maxTimestamp,
          isValid: true
        };
      }
    }

    // Use safe fallback values if validation fails
    const safeMax = new Date('2023-12-31T23:59:59.999Z').getTime();
    const safeMin = new Date('2023-12-31T00:00:00.000Z').getTime();
    return {
      validMin: safeMin,
      validMax: safeMax,
      isValid: false
    };
  }, [minTimestamp, maxTimestamp]);

  // Initialize time range state with a meaningful default
  const [timeRange, setTimeRange] = useState<[number, number]>(() => {
    if (isValid) {
      // Use 25% of the total range, centered
      const totalRange = validMax - validMin;
      const rangeSize = Math.max(totalRange * 0.25, 60000); // At least 1 minute
      const center = validMin + totalRange * 0.5;
      const start = Math.max(validMin, center - rangeSize / 2);
      const end = Math.min(validMax, start + rangeSize);
      return [start, end];
    }
    return [validMin, validMax];
  });

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Refs for animation and dragging
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    initialRange: [0, 0] as [number, number],
    windowSize: 0
  });
  const isInitialized = useRef(false);

  // Debounced callback to parent
  const debouncedCallback = useRef<NodeJS.Timeout | null>(null);
  const lastNotifiedRange = useRef<[number, number] | null>(null);

  const notifyParent = useCallback((start: number, end: number) => {
    // Don't notify during initial setup
    if (!isInitialized.current) {
      return;
    }

    // Prevent duplicate notifications
    if (lastNotifiedRange.current &&
        lastNotifiedRange.current[0] === start &&
        lastNotifiedRange.current[1] === end) {
      return;
    }

    if (debouncedCallback.current) {
      clearTimeout(debouncedCallback.current);
    }

    debouncedCallback.current = setTimeout(() => {
      lastNotifiedRange.current = [start, end];
      onTimeRangeChange(start, end);
    }, 150); // Increased debounce time to reduce updates
  }, [onTimeRangeChange]);

  // Update parent when time range changes
  useEffect(() => {
    notifyParent(timeRange[0], timeRange[1]);
  }, [timeRange, notifyParent]);

  // Mark as initialized after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialized.current = true;
    }, 500); // Give it a moment to settle

    return () => clearTimeout(timer);
  }, []);

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // Format duration
  const formatDuration = useCallback((start: number, end: number) => {
    const duration = end - start;
    const days = Math.floor(duration / (24 * 60 * 60 * 1000));
    const hours = Math.floor((duration % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((duration % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((duration % (60 * 1000)) / 1000);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }, []);

  // Handle range slider change
  const handleRangeChange = useCallback((values: number[]) => {
    if (values.length === 2 && !dragStateRef.current.isDragging) {
      const [start, end] = values;

      // Prevent unnecessary updates if values haven't actually changed
      if (start === timeRange[0] && end === timeRange[1]) {
        return;
      }

      // Ensure minimum separation
      const minSeparation = Math.max(1000, (validMax - validMin) * 0.01); // 1 second or 1% of range
      if (end - start >= minSeparation) {
        setTimeRange([start, end]);
      }
    }
  }, [validMin, validMax, timeRange]);

  // Animation functions
  const startAnimation = useCallback(() => {
    if (animationRef.current) return;

    setIsPlaying(true);
    handlePlayingStateChange(true); // Notify context
    const windowSize = timeRange[1] - timeRange[0];
    let currentStart = timeRange[0];

    const animate = () => {
      const step = windowSize * 0.1 * playbackSpeed;
      currentStart += step;

      if (currentStart + windowSize > validMax) {
        setIsPlaying(false);
        handlePlayingStateChange(false); // Notify context
        animationRef.current = null;
        return;
      }

      setTimeRange([currentStart, currentStart + windowSize]);
      animationRef.current = setTimeout(animate, 200 / playbackSpeed);
    };

    animationRef.current = setTimeout(animate, 200 / playbackSpeed);
  }, [timeRange, playbackSpeed, validMax, handlePlayingStateChange]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    setIsPlaying(false);
    handlePlayingStateChange(false); // Notify context
  }, [handlePlayingStateChange]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopAnimation();
    } else {
      startAnimation();
    }
  }, [isPlaying, startAnimation, stopAnimation]);

  // Step controls
  const stepTimeRange = useCallback((direction: 'forward' | 'backward') => {
    const windowSize = timeRange[1] - timeRange[0];
    const step = windowSize * 0.1;

    if (direction === 'forward') {
      const newStart = Math.min(timeRange[0] + step, validMax - windowSize);
      setTimeRange([newStart, newStart + windowSize]);
    } else {
      const newStart = Math.max(timeRange[0] - step, validMin);
      setTimeRange([newStart, newStart + windowSize]);
    }
  }, [timeRange, validMin, validMax]);

  // Quick range presets
  const setQuickRange = useCallback((preset: string) => {
    const now = validMax;
    let start: number;
    let end: number = now;

    switch (preset) {
      case '1h':
        start = Math.max(validMin, now - (60 * 60 * 1000));
        break;
      case '6h':
        start = Math.max(validMin, now - (6 * 60 * 60 * 1000));
        break;
      case '24h':
        start = Math.max(validMin, now - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        start = Math.max(validMin, now - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        start = Math.max(validMin, now - (30 * 24 * 60 * 60 * 1000));
        break;
      case 'all':
        start = validMin;
        end = validMax;
        break;
      default:
        return;
    }

    setTimeRange([start, end]);
    toast({
      title: `Time range set to ${preset === 'all' ? 'full dataset' : preset}`,
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [validMin, validMax, toast]);

  // Center drag functionality
  const handleCenterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlaying) return;

    // Check if we're clicking near a handle (within 10% of either end)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;

    // Don't start center drag if we're too close to the handles
    if (relativeX < 0.15 || relativeX > 0.85) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      initialRange: [...timeRange],
      windowSize: timeRange[1] - timeRange[0]
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDragging || !sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStateRef.current.startX;
      const deltaRatio = deltaX / rect.width;
      const totalRange = validMax - validMin;
      const deltaTime = deltaRatio * totalRange;

      const [initialStart] = dragStateRef.current.initialRange;
      const windowSize = dragStateRef.current.windowSize;

      let newStart = initialStart + deltaTime;

      // Constrain to bounds
      if (newStart < validMin) newStart = validMin;
      if (newStart + windowSize > validMax) newStart = validMax - windowSize;

      setTimeRange([newStart, newStart + windowSize]);
    };

    const handleMouseUp = () => {
      dragStateRef.current.isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [timeRange, isPlaying, validMin, validMax]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      if (debouncedCallback.current) {
        clearTimeout(debouncedCallback.current);
      }
    };
  }, []);

  // Show error state for invalid data
  if (!isValid) {
    // Check if we're likely waiting for real data (timestamps are the exact fallback values)
    const isFallbackData = minTimestamp === new Date('2023-12-30T00:00:00.000Z').getTime() &&
                          maxTimestamp === new Date('2023-12-31T23:59:59.999Z').getTime();

    if (isFallbackData) {
      // Show loading state instead of error when we're waiting for real data
    return (
        <Card bg={cardBg} backdropFilter="blur(20px)" border="1px solid" borderColor={borderColor} borderRadius="2xl">
          <CardBody p={6}>
            <VStack spacing={4}>
              <HStack spacing={3}>
                <Box
                  p={2}
                  borderRadius="lg"
                  bg="brand.50"
                  color="brand.600"
                >
                  <Icon as={FaClock} boxSize={5} />
                </Box>
                <VStack align="start" spacing={0}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    Timeline Control
                  </Text>
                  <Text fontSize="sm" color={mutedColor}>
                    Waiting for data...
                  </Text>
                </VStack>
              </HStack>
              <Box
                bg="rgba(248, 250, 252, 0.8)"
                backdropFilter="blur(10px)"
                borderRadius="xl"
                p={4}
        border="1px solid"
                borderColor="gray.200"
                width="100%"
                textAlign="center"
              >
                <Text fontSize="sm" color={mutedColor}>
                  Loading timeline data...
                </Text>
              </Box>
            </VStack>
          </CardBody>
      </Card>
    );
  }

    return (
      <Card bg={cardBg} backdropFilter="blur(20px)" border="1px solid" borderColor={borderColor} borderRadius="2xl">
        <CardBody p={6}>
          <Alert status="warning">
            <AlertIcon />
            Invalid time range data. Using fallback values.
          </Alert>
        </CardBody>
      </Card>
    );
  }

  const centerPosition = ((timeRange[0] - validMin) / (validMax - validMin)) * 100;
  const centerWidth = ((timeRange[1] - timeRange[0]) / (validMax - validMin)) * 100;

  return (
    <Card
      bg={cardBg}
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor={borderColor}
      borderRadius="2xl"
      boxShadow="xl"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "2xl",
        borderColor: accentColor,
      }}
    >
      <CardBody p={6}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Box
                p={2}
                borderRadius="lg"
                bg="brand.50"
                color="brand.600"
              >
                <Icon as={FaClock} boxSize={5} />
              </Box>
              <VStack align="start" spacing={0}>
                <HStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    Timeline Control
                  </Text>
                  <Badge
                    colorScheme="brand"
                    variant="subtle"
                    fontSize="xs"
                    px={2}
                    py={1}
                    borderRadius="md"
                  >
                    DUAL RANGE
                  </Badge>
                </HStack>
                <Text fontSize="sm" color={mutedColor}>
                  {formatDuration(timeRange[0], timeRange[1])} selected
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={2}>
              <Badge
                colorScheme={isPlaying ? "green" : "gray"}
                variant="subtle"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="semibold"
              >
                {isPlaying ? "PLAYING" : "PAUSED"}
              </Badge>

              <Tooltip label="Advanced Controls">
                <IconButton
                  aria-label="Advanced controls"
                  icon={<FaCog />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                />
              </Tooltip>
            </HStack>
          </Flex>

          {/* Time Display */}
          <Box
            bg="rgba(248, 250, 252, 0.8)"
            backdropFilter="blur(10px)"
            borderRadius="xl"
            p={4}
            border="1px solid"
            borderColor="gray.200"
          >
            <HStack justify="space-between" spacing={4}>
              <VStack align="start" spacing={1} flex={1}>
                <HStack spacing={2}>
                  <Box
                    width="8px"
                    height="8px"
                    bg="#0ea5e9"
                    borderRadius="full"
                    boxShadow="0 0 8px rgba(14, 165, 233, 0.4)"
                  />
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    START TIME
                  </Text>
                </HStack>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  {formatTimestamp(timeRange[0])}
                </Text>
              </VStack>

              <VStack spacing={1}>
                <Icon as={FaExpand} color={mutedColor} boxSize={3} />
                <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                  WINDOW
                </Text>
              </VStack>

              <VStack align="end" spacing={1} flex={1}>
                <HStack spacing={2}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    END TIME
                  </Text>
                  <Box
                    width="8px"
                    height="8px"
                    bg="#22c55e"
                    borderRadius="full"
                    boxShadow="0 0 8px rgba(34, 197, 94, 0.4)"
                  />
                </HStack>
                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                  {formatTimestamp(timeRange[1])}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Range Slider with Draggable Center */}
          <Box px={2} position="relative" minHeight="140px">
            <Text fontSize="sm" color={textColor} mb={6} fontWeight="bold">
              Time Range Selection
            </Text>

            {/* Custom Range Slider Container */}
            <Box ref={sliderRef} position="relative" py={6} px={4}>
              {/* Background Track */}
              <Box
                position="relative"
                height="8px"
                bg="gray.200"
                borderRadius="full"
                _dark={{ bg: "gray.700" }}
                boxShadow="inset 0 2px 4px rgba(0,0,0,0.1)"
              >
                {/* Filled Track */}
                <Box
                  position="absolute"
                  left={`${((timeRange[0] - validMin) / (validMax - validMin)) * 100}%`}
                  width={`${((timeRange[1] - timeRange[0]) / (validMax - validMin)) * 100}%`}
                  height="100%"
                  bg="linear-gradient(90deg, #0ea5e9, #22c55e)"
                  borderRadius="full"
                  boxShadow="0 2px 8px rgba(14, 165, 233, 0.3)"
                  transition="all 0.2s"
                />
              </Box>

              {/* Chakra Range Slider (invisible but functional) */}
              <RangeSlider
                aria-label={['Start time', 'End time']}
                value={timeRange}
                min={validMin}
                max={validMax}
                step={Math.max(1000, Math.floor((validMax - validMin) / 10000))}
                onChange={handleRangeChange}
                colorScheme="brand"
                size="lg"
                isDisabled={isPlaying}
                focusThumbOnChange={false}
                position="absolute"
                top="50%"
                left="0"
                right="0"
                transform="translateY(-50%)"
                height="40px"
                zIndex={20}
              >
                <RangeSliderTrack
                  opacity={0}
                  height="40px"
                  display="flex"
                  alignItems="center"
                >
                  <RangeSliderFilledTrack opacity={0} />
                </RangeSliderTrack>

                <RangeSliderThumb
                  index={0}
                  opacity={0}
                  boxSize="40px"
                  _focus={{ opacity: 0 }}
                  _hover={{ opacity: 0 }}
                />
                <RangeSliderThumb
                  index={1}
                  opacity={0}
                  boxSize="40px"
                  _focus={{ opacity: 0 }}
                  _hover={{ opacity: 0 }}
                />
              </RangeSlider>

              {/* Custom Visual Handles */}
              {/* Start Handle (Blue) */}
              <Box
                position="absolute"
                left={`${((timeRange[0] - validMin) / (validMax - validMin)) * 100}%`}
                top="50%"
                transform="translate(-50%, -50%)"
                width="20px"
                height="20px"
                bg="white"
                border="4px solid"
                borderColor="#0ea5e9"
                borderRadius="full"
                boxShadow="0 4px 12px rgba(14, 165, 233, 0.4)"
                zIndex={10}
                transition="all 0.2s"
                pointerEvents="none"
              >
                {/* Inner dot for visibility */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  width="8px"
                  height="8px"
                  bg="#0ea5e9"
                  borderRadius="full"
                />
              </Box>

              {/* End Handle (Green) */}
              <Box
                position="absolute"
                left={`${((timeRange[1] - validMin) / (validMax - validMin)) * 100}%`}
                top="50%"
                transform="translate(-50%, -50%)"
                width="20px"
                height="20px"
                bg="white"
                border="4px solid"
                borderColor="#22c55e"
                borderRadius="full"
                boxShadow="0 4px 12px rgba(34, 197, 94, 0.4)"
                zIndex={10}
                transition="all 0.2s"
                pointerEvents="none"
              >
                {/* Inner dot for visibility */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  width="8px"
                  height="8px"
                  bg="#22c55e"
                  borderRadius="full"
                />
              </Box>

              {/* Center Drag Area */}
              {centerWidth > 30 && (
                <Tooltip
                  label="Drag center to move time window"
                  placement="top"
                  hasArrow
                >
                  <Box
                    position="absolute"
                    left={`${((timeRange[0] - validMin) / (validMax - validMin)) * 100 + 8}%`}
                    width={`${((timeRange[1] - timeRange[0]) / (validMax - validMin)) * 100 - 16}%`}
                    top="50%"
                    transform="translateY(-50%)"
                    height="16px"
                    cursor="grab"
                    onMouseDown={handleCenterMouseDown}
                    bg="transparent"
                    borderRadius="full"
                    transition="all 0.2s"
                    _hover={{
                      bg: "rgba(56, 189, 248, 0.2)",
                    }}
                    _active={{
                      bg: "rgba(56, 189, 248, 0.3)",
                    }}
                    zIndex={15}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Box
                      width="20px"
                      height="4px"
                      bg="rgba(56, 189, 248, 0.8)"
                      borderRadius="full"
                      boxShadow="0 2px 4px rgba(56, 189, 248, 0.3)"
                    />
                  </Box>
                </Tooltip>
              )}
            </Box>

            {/* Handle Labels */}
            <HStack justify="space-between" mb={4} px={4}>
              <VStack spacing={1} align="start">
                <HStack spacing={2}>
                  <Box
                    width="12px"
                    height="12px"
                    bg="white"
                    border="3px solid #0ea5e9"
                    borderRadius="full"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      width="4px"
                      height="4px"
                      bg="#0ea5e9"
                      borderRadius="full"
                    />
                  </Box>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    START HANDLE
                  </Text>
                </HStack>
                <Text fontSize="xs" color={textColor}>
                  Drag blue handle for start time
                </Text>
              </VStack>

              <VStack spacing={1} align="end">
                <HStack spacing={2}>
                  <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                    END HANDLE
                  </Text>
                  <Box
                    width="12px"
                    height="12px"
                    bg="white"
                    border="3px solid #22c55e"
                    borderRadius="full"
                    position="relative"
                  >
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      width="4px"
                      height="4px"
                      bg="#22c55e"
                      borderRadius="full"
                    />
                  </Box>
                </HStack>
                <Text fontSize="xs" color={textColor}>
                  Drag green handle for end time
                </Text>
              </VStack>
            </HStack>

            {/* Usage Instructions */}
            <Box
              bg="rgba(59, 130, 246, 0.05)"
              border="1px solid"
              borderColor="rgba(59, 130, 246, 0.2)"
              borderRadius="lg"
              p={3}
              mt={2}
            >
              <Text fontSize="xs" color={mutedColor} textAlign="center">
                💡 Click and drag the blue or green handles to adjust your time window
              </Text>
            </Box>
          </Box>

          {/* Quick Presets */}
          <HStack spacing={2} wrap="wrap">
            {['1h', '6h', '24h', '7d', '30d', 'all'].map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant="outline"
                borderRadius="lg"
                onClick={() => setQuickRange(preset)}
                _hover={{
                  bg: 'brand.50',
                  borderColor: 'brand.300',
                  transform: 'scale(1.05)',
                }}
                transition="all 0.2s"
              >
                {preset === 'all' ? 'Full Range' : preset.toUpperCase()}
              </Button>
            ))}
          </HStack>

          {/* Playback Controls */}
          <Flex justify="center" align="center" gap={2}>
            <Tooltip label="Step Backward">
              <IconButton
                aria-label="Step backward"
                icon={<FaStepBackward />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={() => stepTimeRange('backward')}
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
                isDisabled={isPlaying}
              />
            </Tooltip>

            <Tooltip label="Fast Backward">
              <IconButton
                aria-label="Fast backward"
                icon={<FaFastBackward />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={() => stepTimeRange('backward')}
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
                isDisabled={isPlaying}
              />
            </Tooltip>

            <Button
              leftIcon={isPlaying ? <FaPause /> : <FaPlay />}
              onClick={togglePlayback}
              colorScheme={isPlaying ? "red" : "brand"}
              size="md"
              borderRadius="xl"
              px={6}
              _hover={{
                transform: 'scale(1.05)',
              }}
              transition="all 0.2s"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>

            <Tooltip label="Fast Forward">
              <IconButton
                aria-label="Fast forward"
                icon={<FaFastForward />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={() => stepTimeRange('forward')}
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
                isDisabled={isPlaying}
              />
            </Tooltip>

            <Tooltip label="Step Forward">
              <IconButton
                aria-label="Step forward"
                icon={<FaStepForward />}
                size="sm"
                variant="ghost"
                borderRadius="lg"
                onClick={() => stepTimeRange('forward')}
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
                isDisabled={isPlaying}
              />
            </Tooltip>
          </Flex>

          {/* Advanced Controls */}
          {showAdvanced && (
            <>
              <Divider />
              <VStack spacing={4} align="stretch">
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  Advanced Controls
                </Text>

                <HStack spacing={4}>
                  <VStack align="start" spacing={1} flex={1}>
                    <Text fontSize="xs" color={mutedColor} fontWeight="semibold">
                      PLAYBACK SPEED
                    </Text>
                    <Select
                      size="sm"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      borderRadius="lg"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={5}>5x</option>
                    </Select>
                  </VStack>
                </HStack>
              </VStack>
            </>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default TimeSlider;
