"use client";

import {
  VStack,
  Box,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Flex,
  useColorModeValue,
  Divider,
  Badge,
} from "@chakra-ui/react";
import {
  FaDatabase,
  FaClock,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUpload,
  FaChartBar
} from "react-icons/fa";
import DatasetUploader from "@/components/dashboard/DatasetUploader";
import TimeSlider from "@/components/dashboard/TimeSlider";
import AlertsList from "@/components/dashboard/AlertsList";
import RiskList from "@/components/dashboard/RiskList";
import { useTimeline } from "@/contexts/TimelineContext";

const DashboardSidebar = () => {
  const { minTimestamp, maxTimestamp, handleTimeRangeChange } = useTimeline();

  // Theme-aware colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Box
      h="100vh"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      overflow="auto"
    >
      <VStack spacing={4} p={4} align="stretch">
        {/* Sidebar Header */}
        <Box mb={2}>
          <Heading size="sm" color={textColor} mb={1}>
            Control Panel
          </Heading>
          <Text fontSize="xs" color={mutedColor}>
            Manage data and analysis
          </Text>
        </Box>

        <Divider />

        {/* Dataset Management */}
        <Card
          size="sm"
          bg={bgColor}
          borderColor={borderColor}
          borderWidth="1px"
          shadow="sm"
          transition="all 0.2s"
          _hover={{ shadow: "md" }}
        >
          <CardHeader pb={2}>
            <Flex align="center" gap={2}>
              <Icon as={FaUpload} color="brand.500" boxSize={4} />
              <Heading size="xs" color={textColor}>
                Dataset Management
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <DatasetUploader />
          </CardBody>
        </Card>

        {/* Timeline Controls */}
        <Card
          size="sm"
          bg={bgColor}
          borderColor={borderColor}
          borderWidth="1px"
          shadow="sm"
          transition="all 0.2s"
          _hover={{ shadow: "md" }}
        >
          <CardHeader pb={2}>
            <Flex align="center" gap={2}>
              <Icon as={FaClock} color="brand.500" boxSize={4} />
              <Heading size="xs" color={textColor}>
                Timeline Controls
              </Heading>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <TimeSlider
              minTimestamp={minTimestamp}
              maxTimestamp={maxTimestamp}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </CardBody>
        </Card>

        {/* Alerts */}
        <Card
          size="sm"
          bg={bgColor}
          borderColor={borderColor}
          borderWidth="1px"
          shadow="sm"
          transition="all 0.2s"
          _hover={{ shadow: "md" }}
        >
          <CardHeader pb={2}>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={2}>
                <Icon as={FaExclamationTriangle} color="warning.500" boxSize={4} />
                <Heading size="xs" color={textColor}>
                  Active Alerts
                </Heading>
              </Flex>
              <Badge colorScheme="warning" size="sm" borderRadius="full">
                Live
              </Badge>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <AlertsList />
          </CardBody>
        </Card>

        {/* Risk Assessment */}
        <Card
          size="sm"
          bg={bgColor}
          borderColor={borderColor}
          borderWidth="1px"
          shadow="sm"
          transition="all 0.2s"
          _hover={{ shadow: "md" }}
        >
          <CardHeader pb={2}>
            <Flex align="center" justify="space-between">
              <Flex align="center" gap={2}>
                <Icon as={FaShieldAlt} color="danger.500" boxSize={4} />
                <Heading size="xs" color={textColor}>
                  Risk Assessment
                </Heading>
              </Flex>
              <Badge colorScheme="danger" size="sm" borderRadius="full">
                Critical
              </Badge>
            </Flex>
          </CardHeader>
          <CardBody pt={0}>
            <RiskList />
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default DashboardSidebar;
