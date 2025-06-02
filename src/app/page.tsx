"use client";

import { useTimeline } from "@/contexts/TimelineContext";
import {
  Box,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardHeader,
  CardBody,
  Flex,
  Badge,
  Icon,
  HStack,
  VStack,
  useColorModeValue,
  useDisclosure,
  Collapse,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaGlobe,
  FaExpand,
  FaCompress,
  FaBolt,
  FaNetworkWired,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic imports with loading states
const GraphVisualization = dynamic(
  () => import("@/components/graph/GraphVisualization"),
  {
    ssr: false,
    loading: () => <GraphVisualizationSkeleton />
  }
);
const SigmaGraphVisualization = dynamic(
  () => import("@/components/graph/SigmaGraphVisualization"),
  {
    ssr: false,
    loading: () => <GraphVisualizationSkeleton />
  }
);
const GeoMap = dynamic(
  () => import("@/components/graph/GeoMap"),
  {
    ssr: false,
    loading: () => <GraphVisualizationSkeleton />
  }
);

import UnifiedControlPanel from "@/components/dashboard/UnifiedControlPanel";
import { FloatingActionButton, QuickAccessToolbar } from "@/components/ui/FloatingActionButton";
import {
  GraphVisualizationSkeleton,
  LoadingOverlay
} from "@/components/ui/LoadingStates";

export default function Home() {
  const { startTime, endTime, isInitialized, handleDataRangeChange } = useTimeline();

  // Enhanced state management
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dataStats, setDataStats] = useState({ nodes: 0, edges: 0, lastUpdate: null as string | null });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [useSigmaGraph, setUseSigmaGraph] = useState(true); // Toggle between Cytoscape.js and Sigma.js - Default to Sigma.js
  const { isOpen: showStats, onToggle: toggleStats } = useDisclosure();

  // Modern theme-aware colors with glassmorphism
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const bgGradient = useColorModeValue(
    'linear(to-br, #f8fafc, #e2e8f0, #cbd5e1)',
    'linear(to-br, #0f172a, #1e293b, #334155)'
  );
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(30, 41, 59, 0.8)');
  const borderColor = useColorModeValue('rgba(226, 232, 240, 0.8)', 'rgba(51, 65, 85, 0.8)');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('brand.500', 'brand.400');

  // Initialize loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Set current time on client side only to prevent hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced data range handler with stats
  const handleEnhancedDataRangeChange = (min: number, max: number) => {
    handleDataRangeChange(min, max);
    setDataStats(prev => ({
      ...prev,
      lastUpdate: new Date().toISOString(),
    }));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <LoadingOverlay isLoading={isLoading}>
      <Box
        h="100vh"
        bgGradient={bgGradient}
        overflow="hidden"
        position="relative"
      >
        {/* Animated background pattern */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity={0.02}
          bgImage="radial-gradient(circle at 20% 20%, rgba(14, 165, 233, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(34, 197, 94, 0.4) 0%, transparent 50%), radial-gradient(circle at 40% 60%, rgba(139, 92, 246, 0.3) 0%, transparent 50%)"
          pointerEvents="none"
          animation="float 20s ease-in-out infinite"
        />

        <Flex h="100vh">
          {/* Unified Control Panel */}
          <UnifiedControlPanel
            isLiveMode={isLiveMode}
            onToggleLiveMode={() => setIsLiveMode(!isLiveMode)}
          />

          {/* Main Content Area */}
          <Box flex={1} p={6} overflow="hidden">
            {/* Enhanced Header */}
            <Flex
              justify="space-between"
              align="center"
              mb={6}
              bg={cardBg}
              backdropFilter="blur(20px)"
              p={4}
              borderRadius="2xl"
              border="1px solid"
              borderColor={borderColor}
              boxShadow="xl"
            >
              <VStack align="start" spacing={1}>
                <Heading
                  size="lg"
                  color={textColor}
                  fontWeight="bold"
                  letterSpacing="-0.025em"
                >
                  Cyber Graph Intelligence Dashboard
                </Heading>
                <HStack spacing={4}>
                  <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                    Real-time threat analysis & network topology
                  </Text>
                  <Collapse in={showStats}>
                    <HStack spacing={2} fontSize="sm" color={mutedColor}>
                      <Text>•</Text>
                      <Text>{dataStats.nodes} nodes</Text>
                      <Text>•</Text>
                      <Text>{dataStats.edges} edges</Text>
                      <Text>•</Text>
                      <Text>Last updated: {currentTime || '--:--:--'}</Text>
                    </HStack>
                  </Collapse>
                </HStack>
              </VStack>

              <HStack spacing={3}>
                <Badge
                  colorScheme="cyber"
                  variant="subtle"
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="semibold"
                  cursor="pointer"
                  onClick={toggleStats}
                  _hover={{ transform: 'scale(1.05)' }}
                  transition="all 0.2s"
                  animation={isLiveMode ? "glow 3s ease-in-out infinite" : "none"}
                >
                  <Icon as={FaShieldAlt} mr={2} boxSize={4} />
                  Live Monitoring
                </Badge>

                <Tooltip label={`Switch to ${useSigmaGraph ? 'Cytoscape.js' : 'Sigma.js'} Graph`} hasArrow>
                  <Badge
                    colorScheme={useSigmaGraph ? "green" : "blue"}
                    variant="subtle"
                    px={3}
                    py={2}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="semibold"
                    cursor="pointer"
                    onClick={() => setUseSigmaGraph(!useSigmaGraph)}
                    _hover={{ transform: 'scale(1.05)' }}
                    transition="all 0.2s"
                  >
                    {useSigmaGraph ? 'Sigma.js' : 'Cytoscape.js'}
                  </Badge>
                </Tooltip>

                <Tooltip label="Toggle Fullscreen" hasArrow>
                  <IconButton
                    aria-label="Toggle fullscreen"
                    icon={isFullscreen ? <FaCompress /> : <FaExpand />}
                    size="md"
                    variant="ghost"
                    borderRadius="xl"
                    onClick={toggleFullscreen}
                    _hover={{
                      bg: 'brand.50',
                      color: 'brand.600',
                      transform: 'scale(1.1)',
                    }}
                    transition="all 0.2s"
                  />
                </Tooltip>
              </HStack>
            </Flex>

            {/* Main Visualization Area - Full Width */}
            <Card
              bg={cardBg}
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor={borderColor}
              borderRadius="2xl"
              boxShadow="xl"
              h="calc(100vh - 200px)"
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "2xl",
                borderColor: accentColor,
              }}
              position="relative"
              overflow="hidden"
            >
              <CardHeader pb={3}>
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={3}>
                    <Box
                      p={3}
                      borderRadius="xl"
                      bg="cyber.50"
                      color="cyber.600"
                      animation="pulse 2.5s ease-in-out infinite"
                    >
                      <Icon as={FaNetworkWired} boxSize={6} />
                    </Box>
                    <VStack align="start" spacing={0}>
                      <Heading size="md" color={textColor} fontWeight="bold">
                        Network Topology
                      </Heading>
                      <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                        Interactive graph visualization
                      </Text>
                    </VStack>
                  </Flex>

                  <HStack spacing={2}>
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={activeTab === 0 ? "brand.500" : "gray.300"}
                      transition="all 0.2s"
                    />
                    <Box
                      w={3}
                      h={3}
                      borderRadius="full"
                      bg={activeTab === 1 ? "brand.500" : "gray.300"}
                      transition="all 0.2s"
                    />
                  </HStack>
                </Flex>
              </CardHeader>

              <CardBody pt={0} h="calc(100% - 100px)">
                <Tabs
                  variant="soft-rounded"
                  colorScheme="brand"
                  size="sm"
                  h="100%"
                  display="flex"
                  flexDirection="column"
                  index={activeTab}
                  onChange={setActiveTab}
                >
                  <TabList
                    mb={4}
                    bg="rgba(248, 250, 252, 0.8)"
                    backdropFilter="blur(10px)"
                    p={2}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Tab
                      fontWeight="semibold"
                      fontSize="sm"
                      borderRadius="lg"
                      transition="all 0.2s"
                      _selected={{
                        color: 'white',
                        bg: 'brand.500',
                        shadow: 'md',
                        transform: 'scale(1.02)'
                      }}
                    >
                      <Icon as={FaBolt} mr={2} boxSize={4} />
                      Graph Topology
                    </Tab>
                    <Tab
                      fontWeight="semibold"
                      fontSize="sm"
                      borderRadius="lg"
                      transition="all 0.2s"
                      _selected={{
                        color: 'white',
                        bg: 'brand.500',
                        shadow: 'md',
                        transform: 'scale(1.02)'
                      }}
                    >
                      <Icon as={FaGlobe} mr={2} boxSize={4} />
                      Geographic View
                    </Tab>
                  </TabList>

                  <TabPanels flex="1" overflow="hidden">
                    <TabPanel p={0} h="100%">
                      <Box
                        h="100%"
                        borderRadius="xl"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                        boxShadow="inner"
                      >
                        {useSigmaGraph ? (
                          <SigmaGraphVisualization
                            startTime={startTime}
                            endTime={endTime}
                            onDataRangeChange={handleEnhancedDataRangeChange}
                          />
                        ) : (
                          <GraphVisualization
                            startTime={startTime}
                            endTime={endTime}
                            onDataRangeChange={handleEnhancedDataRangeChange}
                          />
                        )}
                      </Box>
                    </TabPanel>
                    <TabPanel p={0} h="100%">
                      <Box
                        h="100%"
                        borderRadius="xl"
                        overflow="hidden"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                        boxShadow="inner"
                      >
                        <GeoMap isActive={activeTab === 1} />
                      </Box>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </CardBody>
            </Card>
          </Box>
        </Flex>

        {/* Floating Action Button */}
        <FloatingActionButton />

        {/* Quick Access Toolbar */}
        <QuickAccessToolbar />
      </Box>
    </LoadingOverlay>
  );
}
