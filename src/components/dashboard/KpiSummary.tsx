"use client";

import React, { useState, useEffect } from 'react';
import { SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Spinner, Text, Box, useToast } from '@chakra-ui/react';

interface KpiData {
  activeThreats?: number;
  highRiskAssets?: number;
  alertsLast24h?: number;
  resolvedIncidents?: number;
}

const KpiSummary: React.FC = () => {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/kpis');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }
        const data: KpiData = await response.json();
        setKpis(data);
      } catch (e: any) {
        console.error("Failed to fetch KPIs:", e);
        const errorMessage = e.message || "An unknown error occurred while fetching KPIs.";
        setError(errorMessage);
        toast({
          title: "Error loading KPIs",
          description: errorMessage,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
    // Optionally, set up polling
    // const intervalId = setInterval(fetchKpis, 60000); // Refresh every 60 seconds
    // return () => clearInterval(intervalId);
  }, [toast]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100px">
        <Spinner size="md" />
        <Text ml={3}>Loading KPIs...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box color="red.500" minHeight="100px">
        <Text>Error loading KPIs: {error}</Text>
      </Box>
    );
  }

  return (
    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
      <Stat
        p={4}
        bgGradient="linear(to-br, danger.50, danger.100)"
        borderWidth="1px"
        borderColor="danger.200"
        borderRadius="xl"
        shadow="sm"
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          shadow: "lg",
          transform: "translateY(-2px) scale(1.02)",
          borderColor: "danger.300",
          bgGradient: "linear(to-br, danger.100, danger.200)"
        }}
        position="relative"
        overflow="hidden"
      >
        {/* Animated accent bar */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="3px"
          bgGradient="linear(to-r, danger.400, danger.600)"
          borderTopRadius="xl"
        />

        <StatLabel fontSize="xs" fontWeight="bold" color="danger.600" mb={1}>
          Active Threats
        </StatLabel>
        <StatNumber
          fontSize="3xl"
          fontWeight="black"
          color="danger.700"
          lineHeight="1"
          mb={1}
        >
          {kpis?.activeThreats ?? 'N/A'}
        </StatNumber>
        <StatHelpText fontSize="xs" color="danger.500" fontWeight="medium">
          Currently monitored
        </StatHelpText>
      </Stat>

      <Stat
        p={4}
        bgGradient="linear(to-br, warning.50, warning.100)"
        borderWidth="1px"
        borderColor="warning.200"
        borderRadius="xl"
        shadow="sm"
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          shadow: "lg",
          transform: "translateY(-2px) scale(1.02)",
          borderColor: "warning.300",
          bgGradient: "linear(to-br, warning.100, warning.200)"
        }}
        position="relative"
        overflow="hidden"
      >
        {/* Animated accent bar */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="3px"
          bgGradient="linear(to-r, warning.400, warning.600)"
          borderTopRadius="xl"
        />

        <StatLabel fontSize="xs" fontWeight="bold" color="warning.600" mb={1}>
          High-Risk Assets
        </StatLabel>
        <StatNumber
          fontSize="3xl"
          fontWeight="black"
          color="warning.700"
          lineHeight="1"
          mb={1}
        >
          {kpis?.highRiskAssets ?? 'N/A'}
        </StatNumber>
        <StatHelpText fontSize="xs" color="warning.500" fontWeight="medium">
          Require attention
        </StatHelpText>
      </Stat>

      <Stat
        p={4}
        bgGradient="linear(to-br, brand.50, brand.100)"
        borderWidth="1px"
        borderColor="brand.200"
        borderRadius="xl"
        shadow="sm"
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          shadow: "lg",
          transform: "translateY(-2px) scale(1.02)",
          borderColor: "brand.300",
          bgGradient: "linear(to-br, brand.100, brand.200)"
        }}
        position="relative"
        overflow="hidden"
      >
        {/* Animated accent bar */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="3px"
          bgGradient="linear(to-r, brand.400, brand.600)"
          borderTopRadius="xl"
        />

        <StatLabel fontSize="xs" fontWeight="bold" color="brand.600" mb={1}>
          Alerts (24h)
        </StatLabel>
        <StatNumber
          fontSize="3xl"
          fontWeight="black"
          color="brand.700"
          lineHeight="1"
          mb={1}
        >
          {kpis?.alertsLast24h ?? 'N/A'}
        </StatNumber>
        <StatHelpText fontSize="xs" color="brand.500" fontWeight="medium">
          Recent alerts
        </StatHelpText>
      </Stat>

      <Stat
        p={4}
        bgGradient="linear(to-br, cyber.50, cyber.100)"
        borderWidth="1px"
        borderColor="cyber.200"
        borderRadius="xl"
        shadow="sm"
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        _hover={{
          shadow: "lg",
          transform: "translateY(-2px) scale(1.02)",
          borderColor: "cyber.300",
          bgGradient: "linear(to-br, cyber.100, cyber.200)"
        }}
        position="relative"
        overflow="hidden"
      >
        {/* Animated accent bar */}
        <Box
          position="absolute"
          top="0"
          left="0"
          w="100%"
          h="3px"
          bgGradient="linear(to-r, cyber.400, cyber.600)"
          borderTopRadius="xl"
        />

        <StatLabel fontSize="xs" fontWeight="bold" color="cyber.600" mb={1}>
          Resolved
        </StatLabel>
        <StatNumber
          fontSize="3xl"
          fontWeight="black"
          color="cyber.700"
          lineHeight="1"
          mb={1}
        >
          {kpis?.resolvedIncidents ?? 'N/A'}
        </StatNumber>
        <StatHelpText fontSize="xs" color="cyber.500" fontWeight="medium">
          Incidents closed
        </StatHelpText>
      </Stat>
    </SimpleGrid>
  );
};

export default KpiSummary;

