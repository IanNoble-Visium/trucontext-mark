"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Spinner, Text, useToast, IconButton, Tooltip } from '@chakra-ui/react';
import { FaCog } from 'react-icons/fa';
import cytoscape from 'cytoscape'; // Import core cytoscape

// Define the structure of the elements expected by Cytoscape
interface CytoscapeElement {
  data: { id: string; label?: string; type?: string; riskLevel?: 'High' | 'Medium' | 'Low'; timestamp?: number; [key: string]: any };
  group: 'nodes' | 'edges';
}

interface GraphVisualizationProps {
  startTime: number; // Timestamp in milliseconds
  endTime: number;   // Timestamp in milliseconds
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ startTime, endTime }) => {
  // Default safe values
  const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
  const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

  // Initialize all state variables at the top
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]); 
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);
  const [lastFetchParams, setLastFetchParams] = useState<{ start: number, end: number } | null>(null);

  // Initialize refs
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
  const nodePositionsRef = useRef<Record<string, { x: number, y: number }>>({});

  // Initialize hooks
  const toast = useToast();

  // This is a helper function NOT using hooks, so it's safe to define here
  const validateTimeRange = (start: number, end: number) => {
    // Basic validation
    if (!start || !end || isNaN(start) || isNaN(end) || 
        !Number.isFinite(start) || !Number.isFinite(end) || 
        start <= 0 || end <= 0 || start >= end) {
      return false;
    }
    
    // System clock validation
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      return false;
    }
    
    return true;
  };

  // Memoize fetchData to prevent unnecessary refetches
  const fetchData = useCallback(async (start: number, end: number) => {
    // Simple validation - don't use validation function here to avoid hook dependency
    if (!start || !end || start <= 0 || end <= 0 || start >= end) {
      console.error(`fetchData called with invalid parameters: start=${start}, end=${end}`);
      return;
    }

    // Don't refetch if parameters are the same
    if (lastFetchParams && lastFetchParams.start === start && lastFetchParams.end === end) {
      console.log("Skipping duplicate fetch with same parameters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Store the fetch parameters
      setLastFetchParams({ start, end });

      // Make the API request
      const url = `/api/graph-data?startTime=${start}&endTime=${end}`;
      const response = await fetch(url);

      // Handle non-OK responses
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.details) {
            errorMessage = errorData.details;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          console.error("API error details:", errorData);
        } catch (jsonError) {
          console.warn("Could not parse error response as JSON:", jsonError);
        }
        throw new Error(errorMessage);
      }

      // Parse the JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        throw new Error(`Failed to parse response as JSON: ${jsonError.message}`);
      }

      console.log(`Fetched graph data for ${new Date(start).toISOString()} - ${new Date(end).toISOString()}:`, data.elements?.length ?? 0, "elements");

      // Ensure data.elements is an array before setting state
      if (!data.elements) {
        console.warn("Response did not contain elements array:", data);
        setElements([]);
      } else if (!Array.isArray(data.elements)) {
        console.warn("Elements is not an array:", data.elements);
        setElements([]);
      } else {
        setElements(data.elements);
      }
    } catch (e: any) {
      console.error("Failed to fetch graph data:", e);
      const errorMessage = e.message || "An unknown error occurred while fetching graph data.";
      setError(errorMessage);
      toast({
        title: "Error loading graph data",
        description: errorMessage,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, lastFetchParams]); // Only include toast and lastFetchParams in dependencies

  // Handle time range changes
  useEffect(() => {
    // If times are invalid, use safe defaults
    let effectiveStart = startTime;
    let effectiveEnd = endTime;

    if (!validateTimeRange(startTime, endTime)) {
      console.error(`GraphVisualization: Invalid time range: startTime=${startTime}, endTime=${endTime}`);
      effectiveStart = safeStartTime;
      effectiveEnd = safeCurrentTime;
    }

    // Ensure we're not using future dates
    const currentTime = Date.now();
    const safeStart = Math.min(effectiveStart, currentTime);
    const safeEnd = Math.min(effectiveEnd, currentTime);

    // Fetch data with validated times
    fetchData(safeStart, safeEnd);
  }, [startTime, endTime, fetchData, safeStartTime, safeCurrentTime]);

  // Enhanced stylesheet (keep as is)
  const stylesheet: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#666',
        'label': 'data(label)',
        'width': '30px',
        'height': '30px',
        'font-size': '10px',
        'color': '#fff',
        'text-outline-color': '#555',
        'text-outline-width': '1px',
        'text-valign': 'center',
        'text-halign': 'center',
        'border-width': '1px',
        'border-color': '#333'
      }
    },
    {
      selector: 'node[type="Server"]',
      style: {
        'background-color': '#3498db',
        'shape': 'rectangle'
      }
    },
    {
      selector: 'node[type="Workstation"]',
      style: {
        'background-color': '#2ecc71',
        'shape': 'ellipse'
      }
    },
    {
      selector: 'node[type="User"]',
      style: {
        'background-color': '#f1c40f',
        'shape': 'round-diamond'
      }
    },
    {
      selector: 'node[type="ThreatActor"]',
      style: {
        'background-color': '#e74c3c',
        'shape': 'triangle',
        'border-width': '2px',
        'border-color': '#c0392b'
      }
    },
    {
      selector: 'node[riskLevel="High"]',
      style: {
        'border-color': '#e74c3c',
        'border-width': '3px'
      }
    },
    {
      selector: 'node[riskLevel="Medium"]',
      style: {
        'border-color': '#f39c12',
        'border-width': '3px'
      }
    },
    {
      selector: 'node[riskLevel="Low"]',
      style: {
        'border-color': '#2ecc71',
        'border-width': '2px'
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '8px',
        'color': '#aaa',
        'text-rotation': 'autorotate'
      }
    },
    {
        selector: 'edge[label="ATTACK"]',
        style: {
            'line-color': '#e74c3c',
            'target-arrow-color': '#e74c3c',
            'width': 2.5
        }
    },
    {
        selector: 'edge[label="DATA_TRANSFER"]',
        style: {
            'line-color': '#3498db',
            'target-arrow-color': '#3498db',
            'line-style': 'dashed'
        }
    },
    {
      selector: ':selected',
      style: {
        'border-width': 3,
        'border-color': '#333',
        'background-blacken': -0.2,
        'line-color': '#666',
        'target-arrow-color': '#666'
      }
    },
    {
        selector: '.hovered',
        style: {
            'background-color': '#f39c12',
            'border-color': '#d35400',
            'border-width': 3
        }
    }
  ];

  // Basic layout configuration
  const layoutConfig = {
    name: 'cose',
    idealEdgeLength: 120,
    nodeOverlap: 30,
    refresh: 20,
    fit: true,
    padding: 40,
    randomize: true,
    componentSpacing: 150,
    nodeRepulsion: () => 450000,
    edgeElasticity: () => 150,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1500,
    initialTemp: 250,
    coolingFactor: 0.95,
    minTemp: 1.0,
    animate: true,
    animationDuration: 500
  };

  // Store and apply node positions
  const storeNodePositions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    const positions: Record<string, { x: number, y: number }> = {};
    cy.nodes().forEach((node) => {
      const position = node.position();
      positions[node.id()] = { x: position.x, y: position.y };
    });
    nodePositionsRef.current = positions;
  }, []);

  const applyStoredPositions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    const positions = nodePositionsRef.current;
    cy.nodes().forEach((node) => {
      if (positions[node.id()]) {
        node.position(positions[node.id()]);
      }
    });
  }, []);

  // Handle events and animations
  const setupCytoscapeEvents = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    
    // Clear previous listeners
    cy.removeAllListeners();

    // Hover effects
    cy.on('mouseover', 'node', (event) => {
      event.target.addClass('hovered');
    });
    
    cy.on('mouseout', 'node', (event) => {
      event.target.removeClass('hovered');
    });

    // Node click events
    cy.on('tap', 'node', (event) => {
      const nodeData = event.target.data();
      console.log('Node clicked:', nodeData);
      toast({
        title: `Node Clicked: ${nodeData.label || nodeData.id}`,
        description: `Type: ${nodeData.type || 'N/A'}, Risk: ${nodeData.riskLevel || 'N/A'}`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    });

    // Edge click events
    cy.on('tap', 'edge', (event) => {
      const edgeData = event.target.data();
      console.log('Edge clicked:', edgeData);
      toast({
        title: `Edge Clicked: ${edgeData.label || edgeData.id}`,
        description: `Source: ${edgeData.source}, Target: ${edgeData.target}`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    });

    // Store positions when layout completes
    cy.on('layoutstop', storeNodePositions);

    return () => {
      cy.off('layoutstop', storeNodePositions);
    };
  }, [toast, storeNodePositions]);

  // Setup cytoscape and handle visualization
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Apply stored positions before running layout
    applyStoredPositions();

    // Run layout with animation settings
    const hasNewNodes = cy.nodes().some(node => !nodePositionsRef.current[node.id()]);
    
    if (hasNewNodes || cy.nodes().length === 0) {
      const layoutOptions = {
        ...layoutConfig,
        animate: animationEnabled,
        animationDuration: animationEnabled ? 800 : 0,
        randomize: false,
        fit: false
      };
      
      const layout = cy.layout(layoutOptions);
      layout.run();
    }

    // Setup events
    const cleanup = setupCytoscapeEvents();
    
    // Store positions before unmounting
    return () => {
      storeNodePositions();
      if (cleanup) cleanup();
    };
  }, [elements, applyStoredPositions, storeNodePositions, setupCytoscapeEvents, animationEnabled]);

  // Toggle animation handler
  const toggleAnimation = useCallback(() => {
    setAnimationEnabled(!animationEnabled);
    toast({
      title: animationEnabled ? "Animations disabled" : "Animations enabled",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [animationEnabled, toast]);

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Spinner size="xl" />
        <Text ml={3}>Loading Graph Data...</Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    const isNeo4jError = error.includes('Neo4j') || error.includes('Cypher');
    const isDataError = error.includes('No data') || error.includes('empty');

    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="500px" color="red.500" p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>Error loading graph</Text>
        <Text textAlign="center" maxWidth="600px">{error}</Text>

        {isNeo4jError && (
          <Text mt={4} fontSize="sm" color="gray.500">
            This appears to be a database query issue. The system administrator has been notified.
            Try adjusting the time range or uploading a different dataset.
          </Text>
        )}

        {isDataError && (
          <Text mt={4} fontSize="sm" color="gray.500">
            No data was found for the selected time range. Try adjusting the time slider to a different period.
          </Text>
        )}

        {!isNeo4jError && !isDataError && (
          <Text mt={4} fontSize="sm" color="gray.500">
            This may be due to a connection issue or a data format error.
            Try refreshing the page or uploading a dataset first.
          </Text>
        )}
      </Box>
    );
  }

  // Empty state
  if (!elements || elements.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="500px" p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>No graph data available</Text>
        <Text textAlign="center" maxWidth="600px">
          No nodes or relationships found for the selected time range. Try adjusting the time slider or uploading a dataset.
        </Text>
      </Box>
    );
  }

  // Render the graph
  return (
    <Box border="1px solid #eee" borderRadius="md" overflow="hidden" height="600px" width="100%" position="relative">
      {/* Animation toggle button */}
      <Box position="absolute" top="10px" right="10px" zIndex="1">
        <Tooltip label={animationEnabled ? "Disable animations" : "Enable animations"}>
          <IconButton
            aria-label="Toggle animations"
            icon={<FaCog />}
            size="sm"
            onClick={toggleAnimation}
            colorScheme={animationEnabled ? "blue" : "gray"}
            opacity="0.7"
            _hover={{ opacity: 1 }}
          />
        </Tooltip>
      </Box>

      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={layoutConfig}
        cy={(cy) => { cyRef.current = cy; }}
        minZoom={0.2}
        maxZoom={2.5}
      />
    </Box>
  );
};

export default GraphVisualization;
