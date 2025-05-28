"use client";

import { useTimeline } from "@/contexts/TimelineContext";
import {
  Box,
  Heading,
  Text,
  VStack,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from "@chakra-ui/react";
import dynamic from "next/dynamic";

const GraphVisualization = dynamic(
  () => import("@/components/graph/GraphVisualization"),
  { ssr: false }
);
const GeoMap = dynamic(() => import("@/components/graph/GeoMap"), { ssr: false });
import KpiSummary from "@/components/dashboard/KpiSummary";


export default function Home() {
  const { startTime, endTime, handleDataRangeChange } = useTimeline();

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


        {/* Graph Visualization and Geo Map */}
        <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
          <Heading size="md" mb={3}>Interactive Graph Visualization</Heading>
          <Text mb={4} color="gray.500">Explore connections and entities within the selected time range or view their geographic distribution.</Text>

          <Tabs variant="enclosed" colorScheme="blue" isFitted>
            <TabList mb={4}>
              <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderColor: 'blue.600', borderBottomColor: 'white' }}>
                Graph Topology
              </Tab>
              <Tab fontWeight="semibold" _selected={{ color: 'blue.600', borderColor: 'blue.600', borderBottomColor: 'white' }}>
                Geo Map
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0} pt={4}>
                <GraphVisualization
                  startTime={startTime}
                  endTime={endTime}
                  onDataRangeChange={handleDataRangeChange}
                />
              </TabPanel>
              <TabPanel p={0} pt={4}>
                <GeoMap />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>

      </VStack>
    </Box>
  );
}
