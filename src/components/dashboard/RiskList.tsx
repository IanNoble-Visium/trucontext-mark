"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Text,
  useToast,
  Tag,
  Tooltip
} from '@chakra-ui/react';

interface RiskItem {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  reason?: string;
}

const RiskList: React.FC = () => {
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchRisks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/risk');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRisks(data.risks || []); // Ensure risks is always an array
      } catch (e: any) {
        console.error("Failed to fetch risk data:", e);
        const errorMessage = e.message || "An unknown error occurred while fetching risk data.";
        setError(errorMessage);
        toast({
          title: "Error loading risk data",
          description: errorMessage,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRisks();
    // Optional: Set up polling
    // const intervalId = setInterval(fetchRisks, 120000); // Refresh every 2 minutes
    // return () => clearInterval(intervalId);
  }, [toast]);

  const getRiskColorScheme = (score: number) => {
    if (score > 75) return 'red';
    if (score > 50) return 'orange';
    return 'yellow';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
        <Spinner size="md" />
        <Text ml={3}>Loading Risk Data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box color="red.500" minHeight="150px">
        <Text>Error loading risk data: {error}</Text>
      </Box>
    );
  }

  if (!risks || risks.length === 0) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
            <Text>No prioritized risks found.</Text>
        </Box>
    );
  }

  return (
    <TableContainer>
      <Table variant="simple" size="sm">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Type</Th>
            <Th isNumeric>Risk Score</Th>
            <Th>Reason</Th>
          </Tr>
        </Thead>
        <Tbody>
          {risks.map((item) => (
            <Tr key={item.id}>
              <Td>{item.name}</Td>
              <Td>{item.type}</Td>
              <Td isNumeric>
                <Tag colorScheme={getRiskColorScheme(item.riskScore)}>{item.riskScore}</Tag>
              </Td>
              <Td>
                <Tooltip label={item.reason} aria-label={`Reason for ${item.name}'s risk score`}>
                  <Text isTruncated maxWidth="200px">{item.reason || 'N/A'}</Text>
                </Tooltip>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};

export default RiskList;

