"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Spinner, Text, useToast, IconButton, Tooltip, HStack, Select, FormLabel } from '@chakra-ui/react';
import { FaCog, FaBolt } from 'react-icons/fa';
import cytoscape from 'cytoscape'; // Import core cytoscape
import { getIconPath } from '@/lib/iconUtils';

// If you see a missing type error for 'react-cytoscapejs', add a declaration file or use: declare module 'react-cytoscapejs';

// Define the structure of the elements expected by Cytoscape
interface CytoscapeElement {
  data: { id: string; label?: string; type?: string; riskLevel?: 'High' | 'Medium' | 'Low'; timestamp?: number; [key: string]: any };
  group: 'nodes' | 'edges';
}

interface GraphVisualizationProps {
  startTime: number; // Timestamp in milliseconds
  endTime: number;   // Timestamp in milliseconds
  onDataRangeChange?: (min: number, max: number) => void;
}

// Helper to normalize elements for Cytoscape
function normalizeElements(elements: cytoscape.ElementDefinition[]) {
  if (!elements || !Array.isArray(elements)) {
    console.warn('normalizeElements received invalid elements:', elements);
    return [];
  }

  try {
    // First, collect all valid node IDs
    const nodeIds = new Set(
      elements
        .filter(el => el && el.group === 'nodes' && el.data && el.data.id != null && el.data.id !== '')
        .map(el => String(el.data.id))
    );

    // Now, filter and normalize nodes and edges
    return elements
      .filter(el => {
        if (!el || !el.data) return false;

        if (el.group === 'nodes') {
          return el.data.id != null && el.data.id !== '';
        }
        if (el.group === 'edges') {
          return (
            el.data.id != null &&
            el.data.id !== '' &&
            el.data.source != null &&
            el.data.target != null &&
            el.data.source !== '' &&
            el.data.target !== '' &&
            nodeIds.has(String(el.data.source)) &&
            nodeIds.has(String(el.data.target))
          );
        }
        return false;
      })
    .map(el => {
      if (el.group === 'nodes') {
        return {
          ...el,
          data: {
            ...el.data,
            id: String(el.data.id),
          }
        };
      }
      if (el.group === 'edges') {
        return {
          ...el,
          data: {
            ...el.data,
            id: String(el.data.id),
            source: String(el.data.source),
            target: String(el.data.target),
          }
        };
      }
      return el;
    });
  } catch (error) {
    console.error('Error normalizing elements:', error);
    return [];
  }
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({ startTime, endTime, onDataRangeChange }) => {
  // Default safe values
  const safeCurrentTime = new Date('2023-12-31T23:59:59.999Z').getTime();
  const safeStartTime = new Date('2023-12-30T00:00:00.000Z').getTime();

  // Initialize all state variables at the top
  const [allElements, setAllElements] = useState<cytoscape.ElementDefinition[]>([]); // All elements from the database
  const [elements, setElements] = useState<cytoscape.ElementDefinition[]>([]); // Elements filtered by time range
  const [currentElements, setCurrentElements] = useState<cytoscape.ElementDefinition[]>([]); // Elements currently displayed
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);
  const [transitionSpeed, setTransitionSpeed] = useState<number>(500); // Transition speed in ms
  const [initialDataFetched, setInitialDataFetched] = useState<boolean>(false);
  const [lastFetchParams, setLastFetchParams] = useState<{ start: number, end: number } | null>(null);
  const [dataFetchAttempted, setDataFetchAttempted] = useState<boolean>(false); // Flag to prevent multiple fetch attempts

  // Initialize refs
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
  const nodePositionsRef = useRef<Record<string, { x: number, y: number }>>({});
  const onDataRangeChangeRef = useRef(onDataRangeChange); // Store callback in ref to prevent dependency loops

  // Initialize hooks
  const toast = useToast();

  // Update the ref when the callback changes
  useEffect(() => {
    onDataRangeChangeRef.current = onDataRangeChange;
  }, [onDataRangeChange]);

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

  // Fetch all graph data at once
  const fetchAllData = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (dataFetchAttempted) {
      console.log('Data fetch already attempted, skipping...');
      return;
    }

    setDataFetchAttempted(true);
    setLoading(true);
    setError(null);

    try {
      // Make the API request for all data
      const url = `/api/graph-data?all=true`;
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

      console.log(`Fetched all graph data: ${data.elements?.length ?? 0} total elements`);

      // Ensure data.elements is an array before setting state
      if (!data.elements) {
        console.warn("Response did not contain elements array:", data);
        setAllElements([]);
        setInitialDataFetched(false);
      } else if (!Array.isArray(data.elements)) {
        console.warn("Elements is not an array:", data.elements);
        setAllElements([]);
        setInitialDataFetched(false);
      } else {
        // Sort elements to ensure nodes come before edges
        const sortedElements = [...data.elements].sort((a, b) => {
          // Put nodes before edges
          if (a.group === 'nodes' && b.group === 'edges') return -1;
          if (a.group === 'edges' && b.group === 'nodes') return 1;
          return 0;
        });

        // Add icon path for each node and store elements
        const enhanced = sortedElements.map(el => {
          if (el.group === 'nodes') {
            // Ensure we're getting the icon path correctly
            const iconPath = getIconPath(el.data?.type);

            // Add an error handler for the icon
            return {
              ...el,
              data: {
                ...el.data,
                icon: iconPath,
                // Add a fallback icon in case the main one fails to load
                fallbackIcon: '/icons/unknown.png'
              }
            };
          }
          return el;
        });
        setAllElements(enhanced);
        setInitialDataFetched(true);

        // Clear any previous error state on successful data fetch
        setError(null);

        // Compute min/max timestamp from all elements
        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;
        for (const el of sortedElements) {
          if (el.data && el.data.timestamp) {
            const ts = typeof el.data.timestamp === 'number' ? el.data.timestamp : new Date(el.data.timestamp).getTime();
            if (!isNaN(ts)) {
              if (ts < minTimestamp) minTimestamp = ts;
              if (ts > maxTimestamp) maxTimestamp = ts;
            }
          }
        }
        // If no valid timestamps, use safe defaults
        if (!isFinite(minTimestamp) || !isFinite(maxTimestamp)) {
          minTimestamp = new Date('2023-12-30T00:00:00.000Z').getTime();
          maxTimestamp = new Date('2023-12-31T23:59:59.999Z').getTime();
        }
        // Call the callback if provided
        if (onDataRangeChangeRef.current) {
          onDataRangeChangeRef.current(minTimestamp, maxTimestamp);
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch all graph data:", e);
      const errorMessage = e.message || "An unknown error occurred while fetching graph data.";
      setError(errorMessage);
      toast({
        title: "Error loading graph data",
        description: errorMessage,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      setInitialDataFetched(false);
      // Reset the flag on error so user can retry
      setDataFetchAttempted(false);
    } finally {
      setLoading(false);
    }
  }, [toast, dataFetchAttempted]); // Include dataFetchAttempted in dependencies

  // Filter data locally based on time range
  const filterDataByTimeRange = useCallback((start: number, end: number) => {
    // Simple validation
    if (!start || !end || start <= 0 || end <= 0 || start >= end) {
      console.error(`filterDataByTimeRange called with invalid parameters: start=${start}, end=${end}`);
      return;
    }

    // Don't refilter if parameters are the same
    if (lastFetchParams && lastFetchParams.start === start && lastFetchParams.end === end) {
      console.log("Skipping duplicate filter with same parameters");
      return;
    }

    // Store the parameters
    setLastFetchParams({ start, end });

    console.log(`Filtering data for time range: ${new Date(start).toISOString()} - ${new Date(end).toISOString()}`);

    try {
      // First, filter nodes based on timestamp and ensure valid string IDs
      const filteredNodes = allElements.filter(el => {
        if (el.group !== 'nodes') return false;
        if (!el.data || el.data.id == null || el.data.id === '') return false;
        const timestamp = el.data.timestamp;
        if (!timestamp) return true; // Include nodes without timestamp
        const elementTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
        return elementTime >= start && elementTime <= end;
      });

      // Get the IDs of all filtered nodes (as strings)
      const nodeIds = new Set(filteredNodes.map(node => String(node.data.id)));

      // Then, filter edges where both source and target nodes are in the filtered set, and all IDs are valid
      const filteredEdges = allElements.filter(el => {
        if (el.group !== 'edges') return false;
        if (!el.data || el.data.id == null || el.data.id === '' || el.data.source == null || el.data.target == null || el.data.source === '' || el.data.target === '') return false;
        // Always convert to string for comparison
        const sourceExists = nodeIds.has(String(el.data.source));
        const targetExists = nodeIds.has(String(el.data.target));
        if (!sourceExists || !targetExists) return false;
        // Then check timestamp if it exists
        const timestamp = el.data.timestamp;
        if (!timestamp) return true; // Include edges without timestamp if nodes exist
        const elementTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
        return elementTime >= start && elementTime <= end;
      });

      // Combine nodes and edges, with nodes first to ensure proper rendering
      const filteredElements = [...filteredNodes, ...filteredEdges];

      console.log(`Filtered ${filteredElements.length} elements (${filteredNodes.length} nodes, ${filteredEdges.length} edges) from ${allElements.length} total elements`);
      setElements(filteredElements);
    } catch (error) {
      console.error('Error filtering data:', error);
      // In case of error, use empty array to avoid crashes
      setElements([]);
    }
  }, [allElements, lastFetchParams]);

  // Fallback: fetch data for a specific time range if all data fetch fails
  const fetchTimeRangeData = useCallback(async (start: number, end: number) => {
    // Simple validation
    if (!start || !end || start <= 0 || end <= 0 || start >= end) {
      console.error(`fetchTimeRangeData called with invalid parameters: start=${start}, end=${end}`);
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
        // Store all elements from the API with icon paths
        const enhanced = data.elements.map((el: any) => {
          if (el.group === 'nodes') {
            return { ...el, data: { ...el.data, icon: getIconPath(el.data?.type) } };
          }
          return el;
        });
        setElements(enhanced);

        // Initialize current elements if empty
        if (currentElements.length === 0) {
          setCurrentElements(enhanced);
        }
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
  }, [toast, lastFetchParams, currentElements]); // Include dependencies

  // Initial data fetch
  useEffect(() => {
    // Clear any previous error state when starting fresh
    setError(null);
    // Fetch all data once when component mounts
    fetchAllData();
  }, []); // Empty dependency array to run only once on mount

  // Handle time range changes
  useEffect(() => {
    // If we haven't fetched initial data yet, skip filtering
    if (!initialDataFetched) {
      return;
    }

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

    // Filter data locally with validated times
    filterDataByTimeRange(safeStart, safeEnd);
  }, [startTime, endTime, initialDataFetched, filterDataByTimeRange, safeStartTime, safeCurrentTime]);

  // Enhanced stylesheet (keep as is)
  const stylesheet: any[] = [
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
        'border-color': '#333',
        'background-image': 'data(icon)',
        'background-fit': 'cover cover'
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
      selector: 'node[type="Character"]',
      style: {
        'background-color': '#9F7AEA',
        'shape': 'round-octagon'
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
    randomize: false,
    componentSpacing: 150,
    nodeRepulsion: () => 450000,
    edgeElasticity: () => 150,
    nestingFactor: 5,
    gravity: 80,
    numIter: 800,
    initialTemp: 150,
    coolingFactor: 0.95,
    minTemp: 1.0,
    animate: false,
    animationDuration: 0,
  };

  // Store and apply node positions
  const storeNodePositions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    try {
      const positions: Record<string, { x: number, y: number }> = {};
      cy.nodes().forEach((node) => {
        const position = node.position();
        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          positions[node.id()] = { x: position.x, y: position.y };
        }
      });
      nodePositionsRef.current = positions;
    } catch (error) {
      console.warn('Error storing node positions:', error);
    }
  }, []);

  const applyStoredPositions = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    try {
      const positions = nodePositionsRef.current;
      cy.nodes().forEach((node) => {
        if (positions[node.id()]) {
          node.position(positions[node.id()]);
        }
      });
    } catch (error) {
      console.warn('Error applying stored positions:', error);
    }
  }, []);

  // Handle events and animations
  const setupCytoscapeEvents = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    try {
      // Clear previous listeners to avoid duplicates
      cy.removeAllListeners();

      // Hover effects
      cy.on('mouseover', 'node', (event) => {
        try {
          event.target.addClass('hovered');
        } catch (error) {
          console.warn('Error adding hover class:', error);
        }
      });

      cy.on('mouseout', 'node', (event) => {
        try {
          event.target.removeClass('hovered');
        } catch (error) {
          console.warn('Error removing hover class:', error);
        }
      });

      // Node click events
      cy.on('tap', 'node', (event) => {
        try {
          const nodeData = event.target.data();
          console.log('Node clicked:', nodeData);
          toast({
            title: `Node Clicked: ${nodeData.label || nodeData.id}`,
            description: `Type: ${nodeData.type || 'N/A'}, Risk: ${nodeData.riskLevel || 'N/A'}`,
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        } catch (error) {
          console.warn('Error handling node click:', error);
        }
      });

      // Edge click events
      cy.on('tap', 'edge', (event) => {
        try {
          const edgeData = event.target.data();
          console.log('Edge clicked:', edgeData);
          toast({
            title: `Edge Clicked: ${edgeData.label || edgeData.id}`,
            description: `Source: ${edgeData.source}, Target: ${edgeData.target}`,
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        } catch (error) {
          console.warn('Error handling edge click:', error);
        }
      });

      // Fix for sticky drag behavior - handle mouseup globally
      const handleGlobalMouseUp = () => {
        try {
          if (cy && !cy.destroyed()) {
            cy.userPanningEnabled(true);
            cy.userZoomingEnabled(true);
            cy.boxSelectionEnabled(true);
            cy.elements().unselect();
          }
        } catch (error) {
          console.warn('Error in global mouse up handler:', error);
        }
      };

      // Add global event listener to catch mouseup events that might occur outside the component
      window.addEventListener('mouseup', handleGlobalMouseUp);

      // Fix for sticky drag behavior within Cytoscape
      cy.on('mouseup', (event) => {
        try {
          // Ensure drag state is cleared
          cy.userPanningEnabled(true);
          cy.userZoomingEnabled(true);
          cy.boxSelectionEnabled(true);

          // Remove any lingering selection
          if (!event.target.isNode && !event.target.isEdge) {
            cy.elements().unselect();
          }
        } catch (error) {
          console.warn('Error in mouseup handler:', error);
        }
      });

      // Additional safeguards for drag end
      cy.on('dragfree', () => {
        try {
          // Ensure the graph is no longer in a dragging state
          cy.userPanningEnabled(true);
          cy.userZoomingEnabled(true);
        } catch (error) {
          console.warn('Error in dragfree handler:', error);
        }
      });

      // Handle drag end for nodes
      cy.on('dragfreeon', 'node', () => {
        try {
          storeNodePositions();
        } catch (error) {
          console.warn('Error storing positions on drag end:', error);
        }
      });

      // Store positions when layout completes
      cy.on('layoutstop', () => {
        try {
          storeNodePositions();
        } catch (error) {
          console.warn('Error storing positions on layout stop:', error);
        }
      });

      // Return cleanup function
      return () => {
        try {
          if (cy && !cy.destroyed()) {
            cy.off('layoutstop');
            cy.off('mouseup');
            cy.off('dragfree');
            cy.off('dragfreeon', 'node');
            cy.off('tap', 'node');
            cy.off('tap', 'edge');
            cy.off('mouseover', 'node');
            cy.off('mouseout', 'node');
          }
          window.removeEventListener('mouseup', handleGlobalMouseUp);
        } catch (error) {
          console.warn('Error during event cleanup:', error);
        }
      };
    } catch (error) {
      console.error('Error setting up cytoscape events:', error);
      return () => {}; // Return empty cleanup function on error
    }
  }, [toast, storeNodePositions]);

  // Handle smooth transitions between time ranges
  useEffect(() => {
    if (!elements.length && !currentElements.length) return;

    try {
      // Compare current and new elements to determine what changed
      const elementsToAdd = elements.filter(el =>
        !currentElements.some(curEl => curEl.data.id === el.data.id)
      );

      const elementsToRemove = currentElements.filter(curEl =>
        !elements.some(el => el.data.id === curEl.data.id)
      );

      // Sort elements to ensure edges are processed after nodes when adding
      // and before nodes when removing to prevent reference errors
      const sortedElementsToAdd = [
        ...elementsToAdd.filter(el => el.group === 'nodes'),
        ...elementsToAdd.filter(el => el.group === 'edges')
      ];

      const sortedElementsToRemove = [
        ...elementsToRemove.filter(el => el.group === 'edges'),
        ...elementsToRemove.filter(el => el.group === 'nodes')
      ];

      // For real-time updates, use a shorter transition duration during active dragging
      const effectiveTransitionSpeed = Math.min(transitionSpeed, 200);

      // Process updates immediately
      if (sortedElementsToRemove.length > 0 || sortedElementsToAdd.length > 0) {
        // Update the elements state immediately
        setCurrentElements(elements);

        // Apply animations to the updated elements
        const cy = cyRef.current;
        if (cy && animationEnabled) {
          try {
            // Find newly added elements
            const newEls = cy.elements().filter(el =>
              sortedElementsToAdd.some(addEl => addEl.data.id === el.id())
            );

            if (newEls.length > 0) {
              // Start with opacity 0 and fade in
              newEls.style({ 'opacity': 0 });

              // Animate the entrance with the effective transition speed
              newEls.animate({
                style: { 'opacity': 1 },
                duration: effectiveTransitionSpeed,
                easing: 'ease-in'
              });
            }
          } catch (error) {
            console.error("Error animating elements:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in transition effect:", error);
      // Fallback: just set the elements directly
      setCurrentElements(elements);
    }
  }, [elements, currentElements, animationEnabled, transitionSpeed]);

  // Add a listener for active dragging state from TimeSlider
  useEffect(() => {
    const handleDragStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.isDragging === 'boolean') {
        // Could use this to further optimize transitions during active dragging
        console.log(`GraphVisualization: Received drag state change: ${event.detail.isDragging}`);
      }
    };

    // Add event listener
    window.addEventListener('timelinedragstate', handleDragStateChange as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('timelinedragstate', handleDragStateChange as EventListener);
    };
  }, []);

  // Listen for transition speed change events from TimeSlider
  useEffect(() => {
    const handleTransitionSpeedChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.speed === 'number') {
        console.log(`GraphVisualization: Received transition speed change: ${event.detail.speed}ms`);
        setTransitionSpeed(event.detail.speed);
      }
    };

    // Add event listener
    window.addEventListener('transitionspeedchange', handleTransitionSpeedChange as EventListener);

    // Also check localStorage on mount in case we missed the event
    try {
      const storedSpeed = localStorage.getItem('graph_transition_speed');
      if (storedSpeed) {
        const speed = parseInt(storedSpeed, 10);
        if (!isNaN(speed) && speed > 0) {
          console.log(`GraphVisualization: Using stored transition speed: ${speed}ms`);
          setTransitionSpeed(speed);
        }
      }
    } catch (error) {
      console.error('Error reading transition speed from localStorage:', error);
    }

    // Clean up
    return () => {
      window.removeEventListener('transitionspeedchange', handleTransitionSpeedChange as EventListener);
    };
  }, []);

  // Setup cytoscape and handle visualization
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    let currentLayout: cytoscape.Layouts | null = null;
    let isCleanedUp = false;

    try {
      // Stop any existing layouts first
      cy.stop();
      
      // Apply stored positions before running layout
      applyStoredPositions();

      // Run layout only if we have nodes
      const nodes = cy.nodes();
      if (nodes.length > 0) {
        const hasNewNodes = nodes.some(node => !nodePositionsRef.current[(node as cytoscape.NodeSingular).id()]);

        if (hasNewNodes) {
          const layoutOptions = {
            ...layoutConfig,
            animate: animationEnabled,
            animationDuration: animationEnabled ? 600 : 0,
            stop: () => {
              if (!isCleanedUp) {
                // Use setTimeout to avoid immediate callback issues
                setTimeout(() => {
                  if (!isCleanedUp) {
                    storeNodePositions();
                  }
                }, 50);
              }
            }
          };

          currentLayout = cy.layout(layoutOptions);
          currentLayout.run();
        }
      }

      // Setup events
      const cleanup = setupCytoscapeEvents();

      // Return cleanup function
      return () => {
        isCleanedUp = true;
        try {
          // Stop current layout if it's running
          if (currentLayout) {
            currentLayout.stop();
            currentLayout = null;
          }
          
          // Stop any running layouts
          if (cy && !cy.destroyed()) {
            cy.stop();
          }
          
          storeNodePositions();
          if (cleanup) cleanup();
        } catch (error) {
          console.warn('Error during cytoscape cleanup:', error);
        }
      };
    } catch (error) {
      console.error('Error in cytoscape setup:', error);
      isCleanedUp = true;
      // Return cleanup function even on error
      return () => {
        try {
          if (currentLayout) {
            currentLayout.stop();
          }
          if (cy && !cy.destroyed()) {
            cy.stop();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      };
    }
  }, [currentElements, applyStoredPositions, storeNodePositions, setupCytoscapeEvents, animationEnabled]);

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

  // Change transition speed
  const changeTransitionSpeed = useCallback((speed: number) => {
    setTransitionSpeed(speed);
    toast({
      title: `Transition speed: ${speed}ms`,
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [toast]);

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
  if ((!elements || elements.length === 0) && (!currentElements || currentElements.length === 0)) {
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
      {/* Controls */}
      <Box position="absolute" top="10px" right="10px" zIndex="1" bg="white" p={2} borderRadius="md" boxShadow="sm">
        <HStack spacing={3}>
          {/* Transition speed control */}
          <HStack>
            <Tooltip label="Transition speed">
              <IconButton
                aria-label="Transition speed"
                icon={<FaBolt />}
                size="sm"
                colorScheme="teal"
                opacity="0.7"
                _hover={{ opacity: 1 }}
              />
            </Tooltip>
            <Select
              size="sm"
              width="100px"
              value={transitionSpeed}
              onChange={(e) => changeTransitionSpeed(parseInt(e.target.value))}
            >
              <option value="200">Fast (200ms)</option>
              <option value="500">Medium (500ms)</option>
              <option value="1000">Slow (1s)</option>
              <option value="2000">Very Slow (2s)</option>
            </Select>
          </HStack>

          {/* Animation toggle button */}
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
        </HStack>
      </Box>

      <CytoscapeComponent
        elements={normalizeElements(currentElements)}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={layoutConfig}
        cy={(cy: cytoscape.Core) => {
          try {
            cyRef.current = cy;
            
            // Add error handling for cytoscape events
            cy.on('error', (event) => {
              console.warn('Cytoscape error:', event);
            });

            // Prevent the null notify error by ensuring proper cleanup
            const originalDestroy = cy.destroy;
            cy.destroy = function() {
              try {
                // Stop all layouts before destroying
                this.stop();
                // Clear all event listeners
                this.removeAllListeners();
                // Call original destroy
                originalDestroy.call(this);
              } catch (error) {
                console.warn('Error during cytoscape destroy:', error);
                // Still call original destroy even if there's an error
                try {
                  originalDestroy.call(this);
                } catch (e) {
                  // Ignore final destroy errors
                }
              }
            };

            // Initialize event handlers immediately after cy is available
            const cleanup = setupCytoscapeEvents();
            
            // Store this cleanup function to be called on unmount
            return () => {
              try {
                if (cleanup) cleanup();
                // Additional cleanup to prevent null notify errors
                if (cy && !cy.destroyed()) {
                  cy.stop();
                  cy.removeAllListeners();
                }
              } catch (error) {
                console.warn('Error during cytoscape component cleanup:', error);
              }
            };
          } catch (error) {
            console.error('Error initializing cytoscape component:', error);
            return () => {}; // Return empty cleanup function
          }
        }}
        minZoom={0.2}
        maxZoom={2.5}
        autoungrabify={false}
        autounselectify={false}
        boxSelectionEnabled={true}
        panningEnabled={true}
        userPanningEnabled={true}
        userZoomingEnabled={true}
      />
    </Box>
  );
};

export default GraphVisualization;

