"use client";

import {
  Box,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  VStack,
  HStack,
  Grid,
  GridItem,
  Flex,
  useColorModeValue,
} from "@chakra-ui/react";

// Advanced loading animations using CSS classes
const pulseAnimation = "pulse 2s ease-in-out infinite";
const shimmerAnimation = "shimmer 2s infinite";
const floatAnimation = "float 2s ease-in-out infinite";
const glowAnimation = "glow 2s ease-in-out infinite";

// Skeleton components with premium animations
export const KPICardSkeleton = () => {
  const bgGradient = useColorModeValue(
    'linear(to-r, gray.100, gray.200, gray.100)',
    'linear(to-r, gray.700, gray.600, gray.700)'
  );

  return (
    <Box
      p={4}
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.200"
      bg="white"
      shadow="md"
      animation={pulseAnimation}
    >
      <VStack align="start" spacing={3}>
        <Skeleton height="12px" width="60%" borderRadius="md" />
        <Skeleton height="32px" width="40%" borderRadius="lg" />
        <Skeleton height="10px" width="80%" borderRadius="sm" />
      </VStack>
    </Box>
  );
};

export const GraphVisualizationSkeleton = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');

  return (
    <Box
      h="100%"
      bg={bgColor}
      borderRadius="xl"
      position="relative"
      overflow="hidden"
    >
      {/* Animated background pattern */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bgGradient="linear(45deg, transparent 30%, rgba(14, 165, 233, 0.1) 50%, transparent 70%)"
        animation={shimmerAnimation}
        backgroundSize="200px 100%"
        backgroundRepeat="no-repeat"
      />

      {/* Floating node placeholders */}
      <Flex h="100%" align="center" justify="center" position="relative">
        {[...Array(8)].map((_, i) => (
          <SkeletonCircle
            key={i}
            size={`${Math.random() * 20 + 30}px`}
            position="absolute"
            top={`${Math.random() * 70 + 15}%`}
            left={`${Math.random() * 70 + 15}%`}
            animation={`float ${2 + Math.random() * 2}s ease-in-out infinite`}
            style={{ animationDelay: `${Math.random() * 2}s` }}
          />
        ))}
      </Flex>

      {/* Loading indicator */}
      <Box
        position="absolute"
        bottom="4"
        right="4"
        p={2}
        bg="white"
        borderRadius="lg"
        shadow="md"
        animation={glowAnimation}
      >
        <Skeleton height="8px" width="80px" borderRadius="sm" />
      </Box>
    </Box>
  );
};

export const SidebarSkeleton = () => {
  return (
    <VStack spacing={4} p={4} align="stretch">
      {/* Header skeleton */}
      <VStack align="start" spacing={2}>
        <Skeleton height="16px" width="70%" borderRadius="md" />
        <Skeleton height="12px" width="90%" borderRadius="sm" />
      </VStack>

      {/* Card skeletons */}
      {[...Array(4)].map((_, i) => (
        <Box
          key={i}
          p={4}
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.200"
          bg="white"
          shadow="sm"
          animation={pulseAnimation}
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          <VStack align="start" spacing={3}>
            <HStack spacing={2}>
              <SkeletonCircle size="16px" />
              <Skeleton height="14px" width="60%" borderRadius="md" />
            </HStack>
            <VStack align="start" spacing={2}>
              <Skeleton height="8px" width="100%" borderRadius="sm" />
              <Skeleton height="8px" width="80%" borderRadius="sm" />
              <Skeleton height="8px" width="60%" borderRadius="sm" />
            </VStack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

export const TimeSliderSkeleton = () => {
  return (
    <VStack spacing={3} align="stretch">
      {/* Controls skeleton */}
      <Flex justify="space-between" align="center">
        <HStack spacing={1}>
          {[...Array(3)].map((_, i) => (
            <SkeletonCircle key={i} size="24px" />
          ))}
        </HStack>
        <Skeleton height="20px" width="50px" borderRadius="md" />
      </Flex>

      {/* Time display */}
      <Skeleton height="12px" width="100%" borderRadius="sm" />

      {/* Slider skeleton */}
      <Box position="relative" height="24px">
        <Skeleton height="6px" width="100%" borderRadius="full" />
        <SkeletonCircle size="16px" position="absolute" top="4px" left="20%" />
        <SkeletonCircle size="16px" position="absolute" top="4px" right="20%" />
      </Box>

      <Skeleton height="12px" width="100%" borderRadius="sm" />
    </VStack>
  );
};

// Enhanced loading overlay with backdrop blur
export const LoadingOverlay = ({ isLoading, children }: { isLoading: boolean; children: React.ReactNode }) => {
  if (!isLoading) return <>{children}</>;

  return (
    <Box position="relative">
      {children}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(255, 255, 255, 0.8)"
        backdropFilter="blur(4px)"
        borderRadius="xl"
        display="flex"
        alignItems="center"
        justifyContent="center"
        zIndex={10}
      >
        <VStack spacing={3}>
          <Box
            w="40px"
            h="40px"
            border="3px solid"
            borderColor="brand.200"
            borderTopColor="brand.500"
            borderRadius="full"
            animation={`spin 1s linear infinite`}
          />
          <Skeleton height="8px" width="100px" borderRadius="sm" />
        </VStack>
      </Box>
    </Box>
  );
};

// Simple animation wrapper
export const AnimatedBox = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <Box
      animation="fadeInUp 0.6s ease-out forwards"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Box>
  );
};
