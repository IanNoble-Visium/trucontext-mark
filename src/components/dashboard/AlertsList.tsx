"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListIcon,
  Text,
  Spinner,
  useToast,
  Tag,
  HStack,
  VStack,
  Icon
} from '@chakra-ui/react';
import { MdWarning, MdInfoOutline, MdErrorOutline } from 'react-icons/md'; // Example icons

interface Alert {
  id: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  timestamp: string;
}

const AlertsList: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/alerts');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAlerts(data.alerts || []); // Ensure alerts is always an array
      } catch (e: any) {
        console.error("Failed to fetch alerts:", e);
        const errorMessage = e.message || "An unknown error occurred while fetching alerts.";
        setError(errorMessage);
        toast({
          title: "Error loading alerts",
          description: errorMessage,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Optional: Set up polling
    // const intervalId = setInterval(fetchAlerts, 30000); // Refresh every 30 seconds
    // return () => clearInterval(intervalId);
  }, [toast]);

  const getSeverityProps = (severity: Alert['severity']) => {
    switch (severity) {
      case 'High':
        return { colorScheme: 'red', icon: MdWarning };
      case 'Medium':
        return { colorScheme: 'orange', icon: MdInfoOutline };
      case 'Low':
      default:
        return { colorScheme: 'blue', icon: MdInfoOutline };
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
        <Spinner size="md" />
        <Text ml={3}>Loading Alerts...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box color="red.500" minHeight="150px">
        <Text>Error loading alerts: {error}</Text>
      </Box>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="150px">
            <Text>No recent alerts found.</Text>
        </Box>
    );
  }

  return (
    <List spacing={3}>
      {alerts.map((alert) => {
        const severityProps = getSeverityProps(alert.severity);
        return (
          <ListItem key={alert.id} p={3} borderWidth="1px" borderRadius="md" shadow="sm">
            <HStack justify="space-between">
              <HStack>
                <ListIcon as={severityProps.icon} color={`${severityProps.colorScheme}.500`} w={5} h={5} />
                <VStack align="start" spacing={0}>
                    <Text fontSize="sm">{alert.description}</Text>
                    <Text fontSize="xs" color="gray.500">
                        {new Date(alert.timestamp).toLocaleString()}
                    </Text>
                </VStack>
              </HStack>
              <Tag size="sm" colorScheme={severityProps.colorScheme}>
                {alert.severity}
              </Tag>
            </HStack>
          </ListItem>
        );
      })}
    </List>
  );
};

export default AlertsList;

