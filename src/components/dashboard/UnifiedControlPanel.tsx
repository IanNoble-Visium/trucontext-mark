"use client";

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Flex,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  Icon,
  IconButton,
  Button,
  Badge,
  Divider,
  Collapse,
  Tooltip,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
  FaPause,
  FaChartLine,
  FaUpload,
  FaClock,
  FaExclamationTriangle,
  FaShieldAlt,
  FaSync,
  FaDownload,
  FaFilter,
  FaBolt,
  FaDatabase,
  FaInfoCircle,
} from "react-icons/fa";

// Import existing components
import DatasetUploader from "@/components/dashboard/DatasetUploader";
import TimeSlider from "@/components/dashboard/TimeSlider";
import AlertsList from "@/components/dashboard/AlertsList";
import RiskList from "@/components/dashboard/RiskList";
import KpiSummary from "@/components/dashboard/KpiSummary";
import { useTimeline } from "@/contexts/TimelineContext";

interface UnifiedControlPanelProps {
  isLiveMode: boolean;
  onToggleLiveMode: () => void;
}

const UnifiedControlPanel: React.FC<UnifiedControlPanelProps> = ({
  isLiveMode,
  onToggleLiveMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { startTime, endTime, handleDataRangeChange } = useTimeline();

  // Section collapse states
  const { isOpen: isExecutiveSummaryOpen, onToggle: toggleExecutiveSummary } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isDataManagementOpen, onToggle: toggleDataManagement } = useDisclosure({ defaultIsOpen: false });
  const { isOpen: isTimelineOpen, onToggle: toggleTimeline } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isAlertsOpen, onToggle: toggleAlerts } = useDisclosure({ defaultIsOpen: true });
  const { isOpen: isQuickActionsOpen, onToggle: toggleQuickActions } = useDisclosure({ defaultIsOpen: false });

  // Theme colors
  const bgColor = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(15, 23, 42, 0.95)');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(30, 41, 59, 0.8)');
  const borderColor = useColorModeValue('rgba(226, 232, 240, 0.8)', 'rgba(51, 65, 85, 0.8)');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  const handleEnhancedDataRangeChange = (min: number, max: number) => {
    handleDataRangeChange(min, max);
  };

  return (
    <Box
      w={isCollapsed ? "80px" : "400px"}
      h="100vh"
      bg={bgColor}
      backdropFilter="blur(20px)"
      borderRight="1px solid"
      borderColor={borderColor}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      position="relative"
      zIndex={10}
      boxShadow="xl"
      overflow="auto"
    >
      {/* Header */}
      <Flex
        h="80px"
        align="center"
        justify="space-between"
        px={isCollapsed ? 4 : 6}
        borderBottom="1px solid"
        borderColor={borderColor}
        bg={cardBg}
        backdropFilter="blur(10px)"
      >
        {!isCollapsed && (
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
              Unified Control Panel
            </Text>
          </VStack>
        )}
        <Tooltip label={isCollapsed ? "Expand Panel" : "Collapse Panel"}>
          <IconButton
            aria-label="Toggle panel"
            icon={isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            size="sm"
            variant="ghost"
            onClick={() => setIsCollapsed(!isCollapsed)}
            _hover={{ bg: 'brand.50', color: 'brand.600' }}
            transition="all 0.2s"
          />
        </Tooltip>
      </Flex>

      {/* Content */}
      <VStack spacing={4} p={isCollapsed ? 2 : 6} align="stretch">
        {/* Live Monitoring Section */}
        <Card
          bg={cardBg}
          backdropFilter="blur(10px)"
          border="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          p={isCollapsed ? 2 : 4}
          transition="all 0.2s"
          _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
        >
          <Flex align="center" justify={isCollapsed ? "center" : "space-between"}>
            {!isCollapsed && (
              <VStack align="start" spacing={1}>
                <Flex align="center" gap={2}>
                  <Icon as={FaBolt} color="cyber.500" boxSize={4} />
                  <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                    Live Monitoring
                  </Text>
                </Flex>
                <Text fontSize="xs" color={mutedColor}>
                  Real-time threat detection
                </Text>
              </VStack>
            )}
            <Button
              size={isCollapsed ? "sm" : "xs"}
              colorScheme={isLiveMode ? "cyber" : "gray"}
              variant={isLiveMode ? "solid" : "outline"}
              leftIcon={isLiveMode ? <FaPlay /> : <FaPause />}
              onClick={onToggleLiveMode}
              borderRadius="lg"
              animation={isLiveMode ? "pulse 2s ease-in-out infinite" : "none"}
            >
              {!isCollapsed && (isLiveMode ? "LIVE" : "PAUSED")}
            </Button>
          </Flex>
        </Card>

        {/* Executive Summary Section */}
        {!isCollapsed && (
          <Card
            bg={cardBg}
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
          >
            <CardHeader pb={2} cursor="pointer" onClick={toggleExecutiveSummary}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FaChartLine} color="brand.500" boxSize={4} />
                  <Heading size="xs" color={textColor}>
                    Executive Summary
                  </Heading>
                </Flex>
                <Icon
                  as={isExecutiveSummaryOpen ? FaChevronLeft : FaChevronRight}
                  color={mutedColor}
                  boxSize={3}
                  transform={isExecutiveSummaryOpen ? "rotate(90deg)" : "rotate(0deg)"}
                  transition="transform 0.2s"
                />
              </Flex>
            </CardHeader>
            <Collapse in={isExecutiveSummaryOpen} animateOpacity>
              <CardBody pt={0}>
                <VStack spacing={4} align="stretch">
                  <KpiSummary />

                  {/* Quick Stats */}
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
                </VStack>
              </CardBody>
            </Collapse>
          </Card>
        )}

        {/* Data Management Section */}
        {!isCollapsed && (
          <Card
            bg={cardBg}
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
          >
            <CardHeader pb={2} cursor="pointer" onClick={toggleDataManagement}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FaUpload} color="brand.500" boxSize={4} />
                  <Heading size="xs" color={textColor}>
                    Data Management
                  </Heading>
                </Flex>
                <Icon
                  as={isDataManagementOpen ? FaChevronLeft : FaChevronRight}
                  color={mutedColor}
                  boxSize={3}
                  transform={isDataManagementOpen ? "rotate(90deg)" : "rotate(0deg)"}
                  transition="transform 0.2s"
                />
              </Flex>
            </CardHeader>
            <Collapse in={isDataManagementOpen} animateOpacity>
              <CardBody pt={0}>
                <DatasetUploader />
              </CardBody>
            </Collapse>
          </Card>
        )}

        {/* Timeline Controls Section */}
        {!isCollapsed && (
          <Card
            bg={cardBg}
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
          >
            <CardHeader pb={2} cursor="pointer" onClick={toggleTimeline}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FaClock} color="brand.500" boxSize={4} />
                  <Heading size="xs" color={textColor}>
                    Timeline Controls
                  </Heading>
                </Flex>
                <Icon
                  as={isTimelineOpen ? FaChevronLeft : FaChevronRight}
                  color={mutedColor}
                  boxSize={3}
                  transform={isTimelineOpen ? "rotate(90deg)" : "rotate(0deg)"}
                  transition="transform 0.2s"
                />
              </Flex>
            </CardHeader>
            <Collapse in={isTimelineOpen} animateOpacity>
              <CardBody pt={0}>
                <TimeSlider
                  minTimestamp={startTime}
                  maxTimestamp={endTime}
                  onTimeRangeChange={handleEnhancedDataRangeChange}
                />
              </CardBody>
            </Collapse>
          </Card>
        )}

        {/* Alerts & Risk Section */}
        {!isCollapsed && (
          <Card
            bg={cardBg}
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
          >
            <CardHeader pb={2} cursor="pointer" onClick={toggleAlerts}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FaExclamationTriangle} color="warning.500" boxSize={4} />
                  <Heading size="xs" color={textColor}>
                    Alerts & Risk Assessment
                  </Heading>
                </Flex>
                <Badge colorScheme="warning" size="sm" borderRadius="full">
                  Live
                </Badge>
                <Icon
                  as={isAlertsOpen ? FaChevronLeft : FaChevronRight}
                  color={mutedColor}
                  boxSize={3}
                  transform={isAlertsOpen ? "rotate(90deg)" : "rotate(0deg)"}
                  transition="transform 0.2s"
                />
              </Flex>
            </CardHeader>
            <Collapse in={isAlertsOpen} animateOpacity>
              <CardBody pt={0}>
                <VStack spacing={4} align="stretch">
                  {/* Active Alerts */}
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color={mutedColor} mb={3}>
                      Active Alerts
                    </Text>
                    <AlertsList />
                  </Box>

                  <Divider />

                  {/* Risk Assessment */}
                  <Box>
                    <Flex align="center" justify="space-between" mb={3}>
                      <Text fontSize="xs" fontWeight="semibold" color={mutedColor}>
                        Risk Assessment
                      </Text>
                      <Badge colorScheme="danger" size="sm" borderRadius="full">
                        Critical
                      </Badge>
                    </Flex>
                    <RiskList />
                  </Box>
                </VStack>
              </CardBody>
            </Collapse>
          </Card>
        )}

        {/* Quick Actions Section */}
        {!isCollapsed && (
          <Card
            bg={cardBg}
            backdropFilter="blur(10px)"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="xl"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
          >
            <CardHeader pb={2} cursor="pointer" onClick={toggleQuickActions}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={2}>
                  <Icon as={FaBolt} color="brand.500" boxSize={4} />
                  <Heading size="xs" color={textColor}>
                    Quick Actions
                  </Heading>
                </Flex>
                <Icon
                  as={isQuickActionsOpen ? FaChevronLeft : FaChevronRight}
                  color={mutedColor}
                  boxSize={3}
                  transform={isQuickActionsOpen ? "rotate(90deg)" : "rotate(0deg)"}
                  transition="transform 0.2s"
                />
              </Flex>
            </CardHeader>
            <Collapse in={isQuickActionsOpen} animateOpacity>
              <CardBody pt={0}>
                <VStack spacing={2} align="stretch">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<FaSync />}
                    justifyContent="flex-start"
                    _hover={{ bg: 'brand.50', color: 'brand.600' }}
                  >
                    Refresh Data
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<FaDownload />}
                    justifyContent="flex-start"
                    _hover={{ bg: 'brand.50', color: 'brand.600' }}
                  >
                    Export Report
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<FaFilter />}
                    justifyContent="flex-start"
                    _hover={{ bg: 'brand.50', color: 'brand.600' }}
                  >
                    Filter Data
                  </Button>
                </VStack>
              </CardBody>
            </Collapse>
          </Card>
        )}

        {/* Collapsed State Quick Actions */}
        {isCollapsed && (
          <VStack spacing={2} align="stretch">
            <Tooltip label="Refresh Data" placement="right">
              <IconButton
                aria-label="Refresh Data"
                icon={<FaSync />}
                size="sm"
                variant="ghost"
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
              />
            </Tooltip>
            <Tooltip label="Export Report" placement="right">
              <IconButton
                aria-label="Export Report"
                icon={<FaDownload />}
                size="sm"
                variant="ghost"
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
              />
            </Tooltip>
            <Tooltip label="Filter Data" placement="right">
              <IconButton
                aria-label="Filter Data"
                icon={<FaFilter />}
                size="sm"
                variant="ghost"
                _hover={{ bg: 'brand.50', color: 'brand.600' }}
              />
            </Tooltip>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default UnifiedControlPanel;
