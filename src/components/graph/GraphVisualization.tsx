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
  // Initialize all state variables at the top
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]); // Use ElementDefinition[]
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);

  // Initialize refs
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
  const nodePositionsRef = useRef<Record<string, { x: number, y: number }>>({});

  // Initialize hooks
  const toast = useToast();

  // Memoize fetchData to prevent unnecessary refetches if props haven't changed
  const fetchData = useCallback(async (start: number, end: number) => {
    setLoading(true);
    setError(null);
    try {
      // Construct URL with time range parameters
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
  }, [toast]); // Include toast in dependency array

  // Fetch data when time range props change
  useEffect(() => {
    // Validate inputs first
    if (!startTime || !endTime || isNaN(startTime) || isNaN(endTime) || !Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      console.error(`GraphVisualization: Invalid time range values: startTime=${startTime}, endTime=${endTime}`);
      return;
    }

    // Check for system clock issues (future years)
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (startDate.getFullYear() > 2024 || endDate.getFullYear() > 2024) {
      console.warn(`GraphVisualization: Detected potentially incorrect date values: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // Use safe fallback dates (2023)
      const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
      const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

      console.log(`GraphVisualization: Using safe time range: ${new Date(safeStartTime).toISOString()} - ${new Date(safeCurrentTime).toISOString()}`);
      fetchData(safeStartTime, safeCurrentTime);
      return;
    }

    // Normal case - valid dates
    if (startTime > 0 && endTime > 0 && startTime < endTime) {
      // Ensure we're not using future dates
      const currentTime = Date.now();
      const safeStart = Math.min(startTime, currentTime);
      const safeEnd = Math.min(endTime, currentTime);

      fetchData(safeStart, safeEnd);
    }
  }, [startTime, endTime, fetchData]);

  // Enhanced stylesheet (keep as is, filtering happens via data fetching)
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

  // Layout configuration (keep as is)
  const layout = {
    name: 'cose',
    idealEdgeLength: 120,
    nodeOverlap: 30,
    refresh: 20,
    fit: true,
    padding: 40,
    randomize: true,
    componentSpacing: 150,
    nodeRepulsion: (node: any) => 450000,
    edgeElasticity: (edge: any) => 150,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1500,
    initialTemp: 250,
    coolingFactor: 0.95,
    minTemp: 1.0,
    animate: true,
    animationDuration: 500
  };

  // nodePositionsRef is already defined at the top

  // Setup event listeners and handle smooth transitions
  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.removeAllListeners(); // Clear previous listeners

      // Event listeners for hover effects
      cy.on('mouseover', 'node', (event) => {
        event.target.addClass('hovered');
      });
      cy.on('mouseout', 'node', (event) => {
        event.target.removeClass('hovered');
      });

      // Event listener for node clicks
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

      // Event listener for edge clicks
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

      // Store current node positions before layout
      const storeNodePositions = () => {
        const positions: Record<string, { x: number, y: number }> = {};
        cy.nodes().forEach((node) => {
          const position = node.position();
          positions[node.id()] = { x: position.x, y: position.y };
        });
        nodePositionsRef.current = positions;
      };

      // Apply stored positions to existing nodes
      const applyStoredPositions = () => {
        const positions = nodePositionsRef.current;
        cy.nodes().forEach((node) => {
          if (positions[node.id()]) {
            node.position(positions[node.id()]);
          }
        });
      };

      // Apply stored positions to existing nodes before running layout
      applyStoredPositions();

      // Run layout with animation
      const layoutOptions = {
        ...layout,
        animate: animationEnabled,
        animationDuration: animationEnabled ? 800 : 0,
        randomize: false, // Don't randomize positions for smoother transitions
        fit: false // Don't fit to viewport to maintain user's view
      };

      // Only run layout if there are new nodes
      const hasNewNodes = cy.nodes().some(node => !nodePositionsRef.current[node.id()]);

      if (hasNewNodes || cy.nodes().length === 0) {
        // Run layout for new nodes
        const currentLayout = cy.layout(layoutOptions);
        currentLayout.run();
      }

      // Store positions after layout completes
      cy.on('layoutstop', storeNodePositions);

      return () => {
        // Store positions before unmounting
        storeNodePositions();
        cy.off('layoutstop', storeNodePositions);
      };
    }
  }, [elements, toast, layout, animationEnabled]); // Add animationEnabled to dependencies

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Spinner size="xl" />
        <Text ml={3}>Loading Graph Data...</Text>
      </Box>
    );
  }

  if (error) {
    // Determine if this is a Neo4j error or another type
    const isNeo4jError = error.includes('Neo4j') || error.includes('Cypher') || error.includes('LIMIT');
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

  // Animation settings are already defined at the top

  // Toggle animation setting
  const toggleAnimation = () => {
    setAnimationEnabled(!animationEnabled);
    toast({
      title: animationEnabled ? "Animations disabled" : "Animations enabled",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  };

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
        // Remove the key prop to prevent full re-renders
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={{
          ...layout,
          // Enable or disable animations based on user preference
          animate: animationEnabled,
          // Increase animation duration for smoother transitions
          animationDuration: animationEnabled ? 800 : 0,
          // Use a more stable layout for smoother transitions
          randomize: false,
          // Preserve node positions between updates
          fit: false
        }}
        cy={(cy) => { cyRef.current = cy; }}
        minZoom={0.2}
        maxZoom={2.5}
      />
    </Box>
  );
};

export default GraphVisualization;

