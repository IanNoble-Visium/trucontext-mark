"use client";

import { Box, Heading, Text, VStack, Divider } from "@chakra-ui/react";
import GraphVisualization from "@/components/graph/GraphVisualization"; // Adjust path if needed
import KpiSummary from "@/components/dashboard/KpiSummary"; // Adjust path if needed
import AlertsList from "@/components/dashboard/AlertsList"; // Adjust path if needed
import RiskList from "@/components/dashboard/RiskList"; // Adjust path if needed

export default function Home() {
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

        {/* Graph Visualization */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Interactive Graph Visualization</Heading>
          <Text mb={4} color="gray.500">Explore connections and entities within the cyber graph. Click and drag nodes, zoom, and pan.</Text>
          <GraphVisualization />
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

        {/* Timeline View */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Timeline View</Heading>
          <Text color="gray.500">Visualize graph changes over time. (Timeline component to be implemented)</Text>
          {/* Placeholder for Timeline slider/component */}
        </Box>

      </VStack>
    </Box>
  );
}

