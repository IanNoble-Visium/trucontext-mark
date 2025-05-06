"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Spinner, Text, useToast } from '@chakra-ui/react';
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
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]); // Use ElementDefinition[]
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
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
          }
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
      if (!data.elements || !Array.isArray(data.elements) || data.elements.length === 0) {
        if (!data.elements) {
          console.warn("Response did not contain elements array:", data);
        } else if (!Array.isArray(data.elements)) {
          console.warn("Elements is not an array:", data.elements);
        } else {
          console.warn("Elements array is empty");
        }

        // Increment empty results counter
        emptyResultsCountRef.current += 1;
        console.log(`Empty results count: ${emptyResultsCountRef.current}`);

        setElements([]);
      } else {
        // Reset empty results counter when we get data
        emptyResultsCountRef.current = 0;
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

  // Track consecutive empty results to prevent excessive API calls
  const emptyResultsCountRef = useRef<number>(0);
  const lastFetchTimeRef = useRef<number>(0);

  // Fetch data when time range props change
  useEffect(() => {
    // Only fetch data if we have valid time range values
    if (startTime > 0 && endTime > 0 && startTime < endTime) {
      const now = Date.now();

      // Throttle API calls - don't fetch more than once every 1 second
      if (now - lastFetchTimeRef.current < 1000) {
        console.log('Throttling API call - too frequent');
        return;
      }

      // If we've had 5 consecutive empty results, slow down the fetching
      // to prevent hammering the server with useless requests
      if (emptyResultsCountRef.current >= 5) {
        if (now - lastFetchTimeRef.current < 5000) {
          console.log('Throttling API call - too many empty results');
          return;
        }
      }

      // Check if we're querying future dates (which likely won't have data)
      const currentDate = new Date();
      if (startTime > currentDate.getTime() || endTime > currentDate.getTime()) {
        console.log('Skipping fetch for future dates which likely have no data');
        setElements([]);
        setLoading(false);
        return;
      }

      console.log(`Fetching data for time range: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
      lastFetchTimeRef.current = now;
      fetchData(startTime, endTime);
    } else {
      console.log('Invalid time range, not fetching data');
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

  // Setup event listeners (keep as is, but re-run if elements change)
  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.removeAllListeners(); // Clear previous listeners

      cy.on('mouseover', 'node', (event) => {
        event.target.addClass('hovered');
      });
      cy.on('mouseout', 'node', (event) => {
        event.target.removeClass('hovered');
      });

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

      // Re-run layout after elements are updated
      const currentLayout = cy.layout(layout);
      currentLayout.run();

    }
  }, [elements, toast, layout]); // Add layout to dependencies

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Spinner size="xl" />
        <Text ml={3}>Loading Graph Data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="500px" color="red.500" p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>Error loading graph</Text>
        <Text textAlign="center" maxWidth="600px">{error}</Text>
        <Text mt={4} fontSize="sm" color="gray.500">
          This may be due to a Neo4j connection issue or a Cypher query syntax error.
          Try uploading a dataset first or check the server logs for more details.
        </Text>
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

  return (
    <Box border="1px solid #eee" borderRadius="md" overflow="hidden" height="600px" width="100%" position="relative">
      <CytoscapeComponent
        key={`${startTime}-${endTime}`} // Force re-render when time range changes significantly if needed
        elements={CytoscapeComponent.normalizeElements(elements)}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={layout} // Layout is applied via useEffect now
        cy={(cy) => { cyRef.current = cy; }}
        minZoom={0.2}
        maxZoom={2.5}
      />
    </Box>
  );
};

export default GraphVisualization;

