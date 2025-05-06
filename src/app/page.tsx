"use client";

import { useState, useCallback } from "react";
import { Box, Heading, Text, VStack, Divider } from "@chakra-ui/react";
import GraphVisualization from "@/components/graph/GraphVisualization"; // Adjust path if needed
import KpiSummary from "@/components/dashboard/KpiSummary"; // Adjust path if needed
import AlertsList from "@/components/dashboard/AlertsList"; // Adjust path if needed
import RiskList from "@/components/dashboard/RiskList"; // Adjust path if needed
import DatasetUploader from "@/components/dashboard/DatasetUploader"; // Dataset uploader component
import TimeSlider from "@/components/dashboard/TimeSlider"; // Import the TimeSlider component

export default function Home() {
  // Initialize with safe default values to prevent 0,0 issues
  const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
  const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();
  
  // State to hold the time range from the slider - initialized with safe values
  const [startTime, setStartTime] = useState<number>(safeStartTime);
  const [endTime, setEndTime] = useState<number>(safeCurrentTime);

  // Callback function for the TimeSlider to update the time range
  // Using useCallback to ensure the function reference remains stable
  const handleTimeRangeChange = useCallback((start: number, end: number) => {
    // Validate inputs first
    if (!start || !end || isNaN(start) || isNaN(end) || !Number.isFinite(start) || !Number.isFinite(end)) {
      console.error(`Home: Invalid time range values: start=${start}, end=${end}`);
      return;
    }

    // Check for system clock issues (future years)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const currentYear = new Date().getFullYear();

    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      console.warn(`Home: Detected potentially incorrect date values: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // Use safe fallback dates (2023)
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

      console.log(`Home: Using safe time range: ${new Date(safeStartTime).toISOString()} - ${new Date(safeCurrentTime).toISOString()}`);
      setStartTime(safeStartTime);
      setEndTime(safeCurrentTime);
      return;
    }

    // Ensure we're not using future dates
    const currentTime = Date.now();
    const safeStart = Math.min(start, currentTime);
    const safeEnd = Math.min(end, currentTime);

    // Additional safety check to prevent invalid ranges
    if (safeStart <= 0 || safeEnd <= 0 || safeStart >= safeEnd) {
      console.warn(`Home: Invalid time range values after sanitization: safeStart=${safeStart}, safeEnd=${safeEnd}`);
      return;
    }

    console.log(`Home: Time range changed to ${new Date(safeStart).toISOString()} - ${new Date(safeEnd).toISOString()}`);
    setStartTime(safeStart);
    setEndTime(safeEnd);
  }, []);

  return (
    <Box p={5}>
      <VStack spacing={6} align="stretch">
        <Heading as="h1" size="xl" textAlign="center" mb={4}>
          TruContext - Cyber Graph Dashboard
        </Heading>
        <Text textAlign="center" fontSize="lg" color="gray.600">
          Visualizing complex cyber relationships and threats powered by Neo4j.
        </Text>

        {/* Executive Summary KPIs */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Executive Summary</Heading>
          <KpiSummary />
        </Box>

        <Divider />

        {/* Dataset Uploader */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Dataset Management</Heading>
          <Text mb={4} color="gray.500">Upload JSON datasets to populate the Neo4j database. The dataset should follow the format specified in the documentation.</Text>
          <DatasetUploader />
        </Box>

        <Divider />

        {/* Timeline View / Time Slider */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Timeline View</Heading>
          <Text mb={4} color="gray.500">Filter the graph visualization based on the selected time range.</Text>
          <TimeSlider onTimeRangeChange={handleTimeRangeChange} />
        </Box>

        <Divider />

        {/* Graph Visualization - Pass time range state */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Interactive Graph Visualization</Heading>
          <Text mb={4} color="gray.500">Explore connections and entities within the selected time range. Click and drag nodes, zoom, and pan.</Text>
          {/* Pass startTime and endTime to GraphVisualization */}
          <GraphVisualization startTime={startTime} endTime={endTime} />
        </Box>

        <Divider />

        {/* Automated Alerts */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Automated Alerts</Heading>
          <AlertsList />
        </Box>

        {/* Risk Prioritization */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Risk Prioritization</Heading>
          <RiskList />
        </Box>

      </VStack>
    </Box>
  );
}
