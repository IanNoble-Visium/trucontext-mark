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
  // State to hold the time range from the slider
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Callback function for the TimeSlider to update the time range
  // Using useCallback to ensure the function reference remains stable
  const handleTimeRangeChange = useCallback((start: number, end: number) => {
    console.log(`Home: Time range changed to ${new Date(start).toISOString()} - ${new Date(end).toISOString()}`);
    setStartTime(start);
    setEndTime(end);
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

