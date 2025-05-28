"use client";

import { useTimeline } from "@/contexts/TimelineContext";
import {
  Box,
  Grid,
  GridItem,
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
  Spinner,
  useDisclosure,
  Collapse,
  IconButton,
  Tooltip,
  Container,
  Divider,
  Button,
  Progress,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
} from "@chakra-ui/react";
import {
  FaShieldAlt,
  FaChartLine,
  FaGlobe,
  FaClock,
  FaExpand,
  FaCompress,
  FaBolt,
  FaEye,
  FaNetworkWired,
  FaExclamationTriangle,
  FaCheckCircle,
  FaInfoCircle,
  FaCog,
  FaDownload,
  FaSync,
  FaFilter,
  FaSearch,
  FaUser,
  FaServer,
  FaDatabase,
  FaLock,
  FaUnlock,
  FaPlay,
  FaPause,
  FaChevronLeft,
  FaChevronRight,
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
const GeoMap = dynamic(
  () => import("@/components/graph/GeoMap"),
  {
    ssr: false,
    loading: () => <GraphVisualizationSkeleton />
  }
);

import KpiSummary from "@/components/dashboard/KpiSummary";
import TimeSlider from "@/components/dashboard/TimeSlider";
import { FloatingActionButton, QuickAccessToolbar } from "@/components/ui/FloatingActionButton";
import {
  GraphVisualizationSkeleton,
  LoadingOverlay
} from "@/components/ui/LoadingStates";

export default function Home() {
  const { startTime, endTime, handleDataRangeChange } = useTimeline();

  // Enhanced state management
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [dataStats, setDataStats] = useState({ nodes: 0, edges: 0, lastUpdate: null as string | null });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isOpen: showStats, onToggle: toggleStats } = useDisclosure();

  // Modern theme-aware colors with glassmorphism
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const bgGradient = useColorModeValue(
    'linear(to-br, #f8fafc, #e2e8f0, #cbd5e1)',
    'linear(to-br, #0f172a, #1e293b, #334155)'
  );
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(30, 41, 59, 0.8)');
  const sidebarBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(15, 23, 42, 0.95)');
  const borderColor = useColorModeValue('rgba(226, 232, 240, 0.8)', 'rgba(51, 65, 85, 0.8)');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('brand.500', 'brand.400');

  // Initialize loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
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
          {/* Modern Collapsible Sidebar */}
          <Box
            w={sidebarCollapsed ? "80px" : "380px"}
            bg={sidebarBg}
            backdropFilter="blur(20px)"
            borderRight="1px solid"
            borderColor={borderColor}
            transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            position="relative"
            zIndex={10}
            boxShadow="xl"
          >
            {/* Sidebar Header */}
            <Flex
              h="80px"
              align="center"
              justify="space-between"
              px={sidebarCollapsed ? 4 : 6}
              borderBottom="1px solid"
              borderColor={borderColor}
            >
              {!sidebarCollapsed && (
                <VStack align="start" spacing={0}>
                  <Heading
                    size="md"
                    color={textColor}
                    fontWeight="bold"
                    bgGradient="linear(to-r, brand.500, cyber.500)"
                    bgClip="text"
                  >
                    TruContext
                  </Heading>
                  <Text fontSize="xs" color={mutedColor} fontWeight="medium">
                    Cyber Intelligence Platform
                  </Text>
                </VStack>
              )}
              <Tooltip label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
                <IconButton
                  aria-label="Toggle sidebar"
                  icon={sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                  transition="all 0.2s"
                />
              </Tooltip>
            </Flex>

            {/* Control Panel */}
            <VStack spacing={4} p={sidebarCollapsed ? 2 : 6} align="stretch">
              {!sidebarCollapsed && (
                <Text fontSize="sm" fontWeight="semibold" color={mutedColor} mb={2}>
                  Control Panel
                </Text>
              )}

              {/* Live Status */}
              <Card
                bg={cardBg}
                backdropFilter="blur(10px)"
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                p={sidebarCollapsed ? 2 : 4}
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
              >
                <Flex align="center" justify={sidebarCollapsed ? "center" : "space-between"}>
                  {!sidebarCollapsed && (
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                        Live Monitoring
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Real-time threat detection
                      </Text>
                    </VStack>
                  )}
                  <Button
                    size={sidebarCollapsed ? "sm" : "xs"}
                    colorScheme={isLiveMode ? "cyber" : "gray"}
                    variant={isLiveMode ? "solid" : "outline"}
                    leftIcon={isLiveMode ? <FaPlay /> : <FaPause />}
                    onClick={() => setIsLiveMode(!isLiveMode)}
                    borderRadius="lg"
                    animation={isLiveMode ? "pulse 2s ease-in-out infinite" : "none"}
                  >
                    {!sidebarCollapsed && (isLiveMode ? "LIVE" : "PAUSED")}
                  </Button>
                </Flex>
              </Card>

              {/* Executive Summary - KPI Stats */}
              {!sidebarCollapsed && (
                <Card
                  bg={cardBg}
                  backdropFilter="blur(10px)"
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="xl"
                  p={4}
                  transition="all 0.2s"
                  _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                >
                  <VStack align="start" spacing={4}>
                    <Flex align="center" gap={3}>
                      <Box
                        p={2}
                        borderRadius="lg"
                        bg="brand.50"
                        color="brand.600"
                        animation="pulse 2s ease-in-out infinite"
                      >
                        <Icon as={FaChartLine} boxSize={4} />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="md" fontWeight="bold" color={textColor}>
                          Executive Summary
                        </Text>
                        <Text fontSize="xs" color={mutedColor}>
                          Real-time threat metrics
                        </Text>
                      </VStack>
                    </Flex>
                    
                    {/* Compact KPI Summary */}
                    <KpiSummary />
                  </VStack>
                </Card>
              )}

              {/* Quick Stats */}
              {!sidebarCollapsed && (
                <SimpleGrid columns={2} spacing={3}>
                  <Stat
                    bg={cardBg}
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="lg"
                    p={3}
                    textAlign="center"
                  >
                    <StatNumber fontSize="lg" color="brand.500">21</StatNumber>
                    <StatLabel fontSize="xs" color={mutedColor}>Active Threats</StatLabel>
                  </Stat>
                  <Stat
                    bg={cardBg}
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="lg"
                    p={3}
                    textAlign="center"
                  >
                    <StatNumber fontSize="lg" color="cyber.500">115</StatNumber>
                    <StatLabel fontSize="xs" color={mutedColor}>Resolved</StatLabel>
                  </Stat>
                </SimpleGrid>
              )}

              {/* Quick Actions */}
              <VStack spacing={2} align="stretch">
                {!sidebarCollapsed && (
                  <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={1}>
                    Quick Actions
                  </Text>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FaSync />}
                  justifyContent={sidebarCollapsed ? "center" : "flex-start"}
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                >
                  {!sidebarCollapsed && "Refresh Data"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FaDownload />}
                  justifyContent={sidebarCollapsed ? "center" : "flex-start"}
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                >
                  {!sidebarCollapsed && "Export Report"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<FaFilter />}
                  justifyContent={sidebarCollapsed ? "center" : "flex-start"}
                  _hover={{ bg: 'brand.50', color: 'brand.600' }}
                >
                  {!sidebarCollapsed && "Filter Data"}
                </Button>
              </VStack>

              {/* Active Alerts */}
              {!sidebarCollapsed && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={3}>
                    Active Alerts
                  </Text>
                  <VStack spacing={2} align="stretch">
                    <Card
                      bg="rgba(239, 68, 68, 0.1)"
                      border="1px solid"
                      borderColor="red.200"
                      borderRadius="lg"
                      p={3}
                      size="sm"
                    >
                      <Flex align="center" gap={2}>
                        <Icon as={FaExclamationTriangle} color="red.500" boxSize={3} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="xs" fontWeight="semibold" color="red.700">
                            Malware Detected
                          </Text>
                          <Text fontSize="xs" color="red.600">
                            Server-01 • High Priority
                          </Text>
                        </VStack>
                        <Badge colorScheme="red" size="sm">High</Badge>
                      </Flex>
                    </Card>

                    <Card
                      bg="rgba(245, 158, 11, 0.1)"
                      border="1px solid"
                      borderColor="yellow.200"
                      borderRadius="lg"
                      p={3}
                      size="sm"
                    >
                      <Flex align="center" gap={2}>
                        <Icon as={FaInfoCircle} color="yellow.500" boxSize={3} />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="xs" fontWeight="semibold" color="yellow.700">
                            Unusual Login
                          </Text>
                          <Text fontSize="xs" color="yellow.600">
                            admin@visium.com • Medium
                          </Text>
                        </VStack>
                        <Badge colorScheme="yellow" size="sm">Med</Badge>
                      </Flex>
                    </Card>
                  </VStack>
                </Box>
              )}

              {/* Timeline Control */}
              {!sidebarCollapsed && (
                <Box>
                  <TimeSlider
                    minTimestamp={startTime}
                    maxTimestamp={endTime}
                    onTimeRangeChange={handleEnhancedDataRangeChange}
                  />
                </Box>
              )}
            </VStack>
          </Box>

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
                      <Text>Last updated: {new Date().toLocaleTimeString()}</Text>
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
                        <GraphVisualization
                          startTime={startTime}
                          endTime={endTime}
                          onDataRangeChange={handleEnhancedDataRangeChange}
                        />
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
                        <GeoMap />
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
