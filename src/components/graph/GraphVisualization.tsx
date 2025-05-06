"use client";

import React, { useState, useEffect, useRef } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Spinner, Text, useToast, Tooltip } from '@chakra-ui/react';
import cytoscape from 'cytoscape'; // Import core cytoscape

// Define the structure of the elements expected by Cytoscape
interface CytoscapeElement {
  data: { id: string; label?: string; type?: string; riskLevel?: 'High' | 'Medium' | 'Low'; [key: string]: any };
  group: 'nodes' | 'edges';
}

const GraphVisualization: React.FC = () => {
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]); // Use ElementDefinition[]
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
  const toast = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/graph-data');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Fetched graph data:", data.elements?.length ?? 0, "elements");
        // Ensure data.elements is an array before setting state
        setElements(Array.isArray(data.elements) ? data.elements : []);
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
    };

    fetchData();
  }, [toast]);

  // Enhanced stylesheet based on potential node/edge properties
  const stylesheet: cytoscape.Stylesheet[] = [
    {
      selector: 'node',
      style: {
        'background-color': '#666', // Default node color
        'label': 'data(label)', // Display the 'label' property (e.g., hostname, username)
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
    // Style nodes based on 'type' property (example types)
    {
      selector: 'node[type="Server"]',
      style: {
        'background-color': '#3498db', // Blue for servers
        'shape': 'rectangle'
      }
    },
    {
      selector: 'node[type="Workstation"]',
      style: {
        'background-color': '#2ecc71', // Green for workstations
        'shape': 'ellipse'
      }
    },
    {
      selector: 'node[type="User"]',
      style: {
        'background-color': '#f1c40f', // Yellow for users
        'shape': 'round-diamond'
      }
    },
    {
      selector: 'node[type="ThreatActor"]',
      style: {
        'background-color': '#e74c3c', // Red for threat actors
        'shape': 'triangle',
        'border-width': '2px',
        'border-color': '#c0392b'
      }
    },
    // Style nodes based on 'riskLevel' property
    {
      selector: 'node[riskLevel="High"]',
      style: {
        'border-color': '#e74c3c', // Red border for high risk
        'border-width': '3px'
      }
    },
    {
      selector: 'node[riskLevel="Medium"]',
      style: {
        'border-color': '#f39c12', // Orange border for medium risk
        'border-width': '3px'
      }
    },
    {
      selector: 'node[riskLevel="Low"]',
      style: {
        'border-color': '#2ecc71', // Green border for low risk
        'border-width': '2px'
      }
    },
    // Style edges
    {
      selector: 'edge',
      style: {
        'width': 1.5,
        'line-color': '#ccc',
        'target-arrow-color': '#ccc',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)', // Display relationship type
        'font-size': '8px',
        'color': '#aaa',
        'text-rotation': 'autorotate'
      }
    },
    // Example: Style edges representing 'ATTACK' relationships
    {
        selector: 'edge[label="ATTACK"]',
        style: {
            'line-color': '#e74c3c', // Red line
            'target-arrow-color': '#e74c3c',
            'width': 2.5
        }
    },
    // Example: Style edges representing 'DATA_TRANSFER'
    {
        selector: 'edge[label="DATA_TRANSFER"]',
        style: {
            'line-color': '#3498db', // Blue line
            'target-arrow-color': '#3498db',
            'line-style': 'dashed' // Dashed line for data transfer
        }
    },
    // Style for selected nodes/edges
    {
      selector: ':selected',
      style: {
        'border-width': 3,
        'border-color': '#333',
        'background-blacken': -0.2, // Darken selected node slightly
        'line-color': '#666', // Darken selected edge
        'target-arrow-color': '#666'
      }
    },
    // Style for hovered nodes (requires event handling)
    {
        selector: '.hovered',
        style: {
            'background-color': '#f39c12', // Highlight hovered node
            'border-color': '#d35400',
            'border-width': 3
        }
    }
  ];

  // Layout configuration
  const layout = {
    name: 'cose', // cose layout is good for general graphs
    idealEdgeLength: 120,
    nodeOverlap: 30,
    refresh: 20,
    fit: true,
    padding: 40,
    randomize: true, // Start with random positions
    componentSpacing: 150,
    nodeRepulsion: (node: any) => 450000, // Function for dynamic repulsion
    edgeElasticity: (edge: any) => 150, // Function for dynamic elasticity
    nestingFactor: 5,
    gravity: 80,
    numIter: 1500, // More iterations for better layout
    initialTemp: 250,
    coolingFactor: 0.95,
    minTemp: 1.0,
    animate: true, // Animate layout changes
    animationDuration: 500
  };

  // Setup event listeners once cytoscape instance is ready
  useEffect(() => {
    const cy = cyRef.current;
    if (cy) {
      cy.removeAllListeners(); // Clear previous listeners

      // Node hover effect
      cy.on('mouseover', 'node', (event) => {
        event.target.addClass('hovered');
        // Consider adding tooltip logic here if needed
      });
      cy.on('mouseout', 'node', (event) => {
        event.target.removeClass('hovered');
      });

      // Node click handler (example)
      cy.on('tap', 'node', (event) => {
        const nodeData = event.target.data();
        console.log('Node clicked:', nodeData);
        toast({
          title: `Node Clicked: ${nodeData.label || nodeData.id}`,
          description: `Type: ${nodeData.type || 'N/A'}, Risk: ${nodeData.riskLevel || 'N/A'}`, // Example details
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      });

      // Edge click handler (example)
      cy.on('tap', 'edge', (event) => {
        const edgeData = event.target.data();
        console.log('Edge clicked:', edgeData);
        toast({
          title: `Edge Clicked: ${edgeData.label || edgeData.id}`,
          description: `Source: ${edgeData.source}, Target: ${edgeData.target}`, // Example details
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      });
    }
  }, [elements, toast]); // Re-run if elements change

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
      <Box display="flex" justifyContent="center" alignItems="center" height="500px" color="red.500">
        <Text>Error loading graph: {error}</Text>
      </Box>
    );
  }

  if (!elements || elements.length === 0) {
      return (
          <Box display="flex" justifyContent="center" alignItems="center" height="500px">
              <Text>No graph data found or failed to load. Check Neo4j connection and query.</Text>
          </Box>
      );
  }

  return (
    <Box border="1px solid #eee" borderRadius="md" overflow="hidden" height="600px" width="100%" position="relative">
      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(elements)} // Normalize elements
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={layout}
        cy={(cy) => { cyRef.current = cy; }} // Store cy instance in ref
        minZoom={0.2} // Set zoom limits
        maxZoom={2.5}
      />
    </Box>
  );
};

export default GraphVisualization;

