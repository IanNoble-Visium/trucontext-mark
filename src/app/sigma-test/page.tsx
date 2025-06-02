"use client";

import { Box, Heading, Text } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { TimelineProvider } from "@/contexts/TimelineContext";

// Dynamic import to avoid SSR issues
const SigmaGraphVisualization = dynamic(
  () => import("@/components/graph/SigmaGraphVisualization"),
  {
    ssr: false,
    loading: () => (
      <Box display="flex" justifyContent="center" alignItems="center" height="600px">
        <Text>Loading Sigma.js Graph...</Text>
      </Box>
    )
  }
);

export default function SigmaTestPage() {
  const [startTime, setStartTime] = useState<number>(new Date('2023-12-30T00:00:00.000Z').getTime());
  const [endTime, setEndTime] = useState<number>(new Date('2023-12-31T23:59:59.999Z').getTime());

  const handleDataRangeChange = (min: number, max: number) => {
    console.log('Data range changed:', { min, max });
    setStartTime(min);
    setEndTime(max);
  };

  return (
    <TimelineProvider>
      <Box p={6} minHeight="100vh" bg="gray.50">
        <Box maxWidth="1200px" mx="auto">
          <Heading size="lg" mb={4} color="gray.800">
            Sigma.js Graph Visualization Test
          </Heading>
          
          <Text mb={6} color="gray.600">
            Testing the new Sigma.js implementation with manual positioning, zoom/pan persistence, and timeline integration.
          </Text>

          <Box
            bg="white"
            borderRadius="xl"
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.200"
            overflow="hidden"
          >
            <SigmaGraphVisualization
              startTime={startTime}
              endTime={endTime}
              onDataRangeChange={handleDataRangeChange}
            />
          </Box>

          <Box mt={6} p={4} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
            <Heading size="sm" mb={2} color="blue.800">
              Test Instructions:
            </Heading>
            <Text fontSize="sm" color="blue.700" mb={2}>
              1. <strong>Manual Positioning:</strong> Try dragging nodes around - positions should persist
            </Text>
            <Text fontSize="sm" color="blue.700" mb={2}>
              2. <strong>Zoom/Pan:</strong> Use mouse wheel to zoom and drag to pan - state should be maintained
            </Text>
            <Text fontSize="sm" color="blue.700" mb={2}>
              3. <strong>Layout Changes:</strong> Try different layout algorithms from the dropdown
            </Text>
            <Text fontSize="sm" color="blue.700" mb={2}>
              4. <strong>Tooltips:</strong> Hover over nodes to see tooltip information
            </Text>
            <Text fontSize="sm" color="blue.700">
              5. <strong>Performance:</strong> Check console for loading times and interaction responsiveness
            </Text>
          </Box>

          <Box mt={4} p={4} bg="gray.100" borderRadius="md">
            <Text fontSize="sm" color="gray.600">
              <strong>Current Time Range:</strong> {new Date(startTime).toLocaleString()} - {new Date(endTime).toLocaleString()}
            </Text>
          </Box>
        </Box>
      </Box>
    </TimelineProvider>
  );
}
