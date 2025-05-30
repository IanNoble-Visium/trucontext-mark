"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Image,
  Alert,
  AlertIcon,
  Badge,
  Divider,
  Heading,
  Grid,
  GridItem,
  useColorModeValue
} from '@chakra-ui/react';
import { getIconPath, getAvailableIconTypes, validateIconPath } from '@/lib/iconUtils';

interface IconTestResult {
  type: string;
  iconPath: string;
  isValid: boolean;
  fallbackUsed: boolean;
  error?: string;
}

const IconMappingTest: React.FC = () => {
  const [testType, setTestType] = useState('');
  const [testResults, setTestResults] = useState<IconTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    // Load available icon types
    setAvailableTypes(getAvailableIconTypes());
  }, []);

  const testIconMapping = async (type: string) => {
    setIsLoading(true);
    try {
      // Test PNG icon
      const result = await validateIconPath(type);

      const testResult: IconTestResult = {
        type,
        iconPath: result.iconPath,
        isValid: result.isValid,
        fallbackUsed: result.fallbackUsed
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
    } catch (error) {
      const result: IconTestResult = {
        type,
        iconPath: getIconPath(type),
        isValid: false,
        fallbackUsed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setTestResults(prev => [result, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const testCommonTypes = async () => {
    const commonTypes = [
      'Server', 'server', 'WORKSTATION', 'workstation', 'User', 'user',
      'ThreatActor', 'threatactor', 'Database', 'database', 'Router', 'router',
      'Switch', 'switch', 'Firewall', 'firewall', 'Application', 'application',
      'sensor', 'SENSOR', 'PLC', 'plc', 'SCADA', 'scada', 'Device', 'device',
      'unknown_type', 'InvalidType', '', null, undefined
    ];

    setTestResults([]);
    setIsLoading(true);

    for (const type of commonTypes) {
      await testIconMapping(type as string);
      // Small delay to see the results populate
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsLoading(false);
  };

  return (
    <Box p={6} bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
      <VStack spacing={6} align="stretch">
        <Heading size="md" color="blue.500">
          Icon Mapping Test Utility
        </Heading>

        {/* Manual Test Section */}
        <Box>
          <Text fontWeight="bold" mb={2}>Test Individual Node Type:</Text>
          <HStack>
            <Input
              placeholder="Enter node type (e.g., Server, workstation, sensor)"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && testIconMapping(testType)}
            />
            <Button
              colorScheme="blue"
              onClick={() => testIconMapping(testType)}
              isLoading={isLoading}
              disabled={!testType.trim()}
            >
              Test
            </Button>
          </HStack>
        </Box>

        {/* Batch Test Section */}
        <Box>
          <Button
            colorScheme="green"
            onClick={testCommonTypes}
            isLoading={isLoading}
            size="sm"
          >
            Test Common Node Types
          </Button>
        </Box>

        <Divider />

        {/* Available Types Display */}
        <Box>
          <Text fontWeight="bold" mb={2}>Available Icon Types ({availableTypes.length}):</Text>
          <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={2}>
            {availableTypes.map((type) => (
              <GridItem key={type}>
                <Badge
                  colorScheme="gray"
                  cursor="pointer"
                  onClick={() => testIconMapping(type)}
                  _hover={{ bg: 'blue.100' }}
                >
                  {type}
                </Badge>
              </GridItem>
            ))}
          </Grid>
        </Box>

        <Divider />

        {/* Test Results */}
        <Box>
          <Text fontWeight="bold" mb={3}>Test Results:</Text>
          <VStack spacing={3} align="stretch">
            {testResults.map((result, index) => (
              <Box
                key={index}
                p={3}
                border="1px"
                borderColor={result.isValid ? 'green.200' : 'red.200'}
                borderRadius="md"
                bg={result.isValid ? 'green.50' : 'red.50'}
              >
                <HStack justify="space-between" align="start">
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Text fontWeight="bold">Type:</Text>
                      <Text>{result.type || '(empty)'}</Text>
                      {result.fallbackUsed && (
                        <Badge colorScheme="orange" size="sm">Fallback</Badge>
                      )}
                    </HStack>
                    <HStack>
                      <Text fontWeight="bold">Icon Path:</Text>
                      <Text fontSize="sm" fontFamily="mono">{result.iconPath}</Text>
                    </HStack>
                    {result.error && (
                      <Alert status="error" size="sm">
                        <AlertIcon />
                        <Text fontSize="sm">{result.error}</Text>
                      </Alert>
                    )}
                  </VStack>
                  <Box>
                    {result.isValid ? (
                      <Image
                        src={result.iconPath}
                        alt={`Icon for ${result.type}`}
                        boxSize="32px"
                        fallback={
                          <Box
                            boxSize="32px"
                            bg="gray.200"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="xs"
                          >
                            ?
                          </Box>
                        }
                      />
                    ) : (
                      <Box
                        boxSize="32px"
                        bg="red.200"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="xs"
                        color="red.600"
                      >
                        ✗
                      </Box>
                    )}
                  </Box>
                </HStack>
              </Box>
            ))}
            {testResults.length === 0 && (
              <Text color="gray.500" textAlign="center">
                No test results yet. Try testing a node type above.
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default IconMappingTest;
