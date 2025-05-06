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
    <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={5}>
      <Stat p={4} borderWidth="1px" borderRadius="md" shadow="sm">
        <StatLabel>Active Threats</StatLabel>
        <StatNumber>{kpis?.activeThreats ?? 'N/A'}</StatNumber>
        <StatHelpText>Currently monitored threats</StatHelpText>
      </Stat>
      <Stat p={4} borderWidth="1px" borderRadius="md" shadow="sm">
        <StatLabel>High-Risk Assets</StatLabel>
        <StatNumber>{kpis?.highRiskAssets ?? 'N/A'}</StatNumber>
        <StatHelpText>Assets requiring immediate attention</StatHelpText>
      </Stat>
      <Stat p={4} borderWidth="1px" borderRadius="md" shadow="sm">
        <StatLabel>Alerts (Last 24h)</StatLabel>
        <StatNumber>{kpis?.alertsLast24h ?? 'N/A'}</StatNumber>
        <StatHelpText>New alerts generated recently</StatHelpText>
      </Stat>
      <Stat p={4} borderWidth="1px" borderRadius="md" shadow="sm">
        <StatLabel>Resolved Incidents</StatLabel>
        <StatNumber>{kpis?.resolvedIncidents ?? 'N/A'}</StatNumber>
        <StatHelpText>Total incidents closed</StatHelpText>
      </Stat>
    </SimpleGrid>
  );
};

export default KpiSummary;

