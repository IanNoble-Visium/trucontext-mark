"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Select,
  IconButton,
  Tooltip,
  Switch,
  FormControl,
  FormLabel,
  useToast,
  Text,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  FaProjectDiagram,
  FaBolt,
  FaLayerGroup,
  FaCog,
} from 'react-icons/fa';
import { SigmaContainer, useLoadGraph, useSigma, useRegisterEvents } from '@react-sigma/core';
import Graph from 'graphology';

// Types
interface GraphElement {
  group: 'nodes' | 'edges';
  data: {
    id: string;
    label?: string;
    type?: string;
    source?: string;
    target?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

interface SigmaGraphVisualizationProps {
  startTime: number;
  endTime: number;
  onDataRangeChange: (min: number, max: number) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  title: string;
}

// Sigma.js compatible layout options
const LAYOUT_OPTIONS = [
  { value: 'random', label: 'Random' },
  { value: 'circular', label: 'Circular' },
  { value: 'grid', label: 'Grid' },
  { value: 'noverlap', label: 'No Overlap' },
];

// Node color mapping
const getNodeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'Server': '#3498db',
    'Workstation': '#2ecc71',
    'User': '#f1c40f',
    'ThreatActor': '#e74c3c',
    'Character': '#9F7AEA',
    'Database': '#8e44ad',
    'Router': '#e67e22',
    'Client': '#1abc9c',
    'Firewall': '#34495e',
    'default': '#666666',
  };
  return colorMap[type] || colorMap.default;
};

// Graph Controller Component
const GraphController: React.FC<{
  elements: GraphElement[];
  startTime: number;
  endTime: number;
  selectedLayout: string;
  hasManualPositions: boolean;
  onDataRangeChange: (min: number, max: number) => void;
}> = ({ elements, startTime, endTime, selectedLayout, hasManualPositions, onDataRangeChange }) => {
  const loadGraph = useLoadGraph();
  const [graph] = useState(() => new Graph());
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Apply layout to nodes - with strict manual positioning preservation
  const applyLayout = useCallback((graph: Graph, layoutType: string, preserveManualPositions: boolean = false) => {
    const nodes = graph.nodes();
    const nodeCount = nodes.length;

    if (nodeCount === 0) return;

    // If preserving manual positions, don't apply any layout at all
    if (preserveManualPositions) {
      console.log(`Skipping layout application - preserving manual positions`);
      return;
    }

    switch (layoutType) {
      case 'circular':
        nodes.forEach((node, index) => {
          const angle = (2 * Math.PI * index) / nodeCount;
          const radius = Math.min(200, nodeCount * 8);
          graph.setNodeAttribute(node, 'x', Math.cos(angle) * radius);
          graph.setNodeAttribute(node, 'y', Math.sin(angle) * radius);
        });
        break;

      case 'grid':
        const cols = Math.ceil(Math.sqrt(nodeCount));
        nodes.forEach((node, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          graph.setNodeAttribute(node, 'x', col * 100 - (cols * 50));
          graph.setNodeAttribute(node, 'y', row * 100 - (Math.ceil(nodeCount / cols) * 50));
        });
        break;

      case 'noverlap':
        // Simple non-overlapping layout - spread nodes out
        nodes.forEach((node, index) => {
          const angle = (2 * Math.PI * index) / nodeCount;
          const radius = Math.max(150, nodeCount * 6);
          const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 50;
          const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 50;
          graph.setNodeAttribute(node, 'x', x);
          graph.setNodeAttribute(node, 'y', y);
        });
        break;

      default: // random
        nodes.forEach((node) => {
          graph.setNodeAttribute(node, 'x', (Math.random() - 0.5) * 400);
          graph.setNodeAttribute(node, 'y', (Math.random() - 0.5) * 400);
        });
    }

    console.log(`Applied ${layoutType} layout to ${nodeCount} nodes`);
  }, []);

  // Filter and update graph based on time range - with conservative updates
  useEffect(() => {
    // Skip updates if we're in manual positioning mode and this is just a time range change
    if (hasManualPositions && !isInitialLoad) {
      console.log('Skipping graph update - manual positioning mode active');
      return;
    }

    setIsLoading(true);

    try {
      // Filter elements by time range
      const filteredElements = elements.filter(el => {
        if (!el.data.timestamp) return true;
        const elementTime = typeof el.data.timestamp === 'number'
          ? el.data.timestamp
          : new Date(el.data.timestamp).getTime();
        return elementTime >= startTime && elementTime <= endTime;
      });

      // Clear existing graph
      graph.clear();

      // Add nodes
      const nodes = filteredElements.filter(el => el.group === 'nodes');
      const edges = filteredElements.filter(el => el.group === 'edges');

      nodes.forEach(el => {
        if (!graph.hasNode(el.data.id)) {
          graph.addNode(el.data.id, {
            label: el.data.label || el.data.id,
            size: 15,
            color: getNodeColor(el.data.type || 'default'),
            type: el.data.type || 'default',
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            ...el.data,
          });
        }
      });

      // Add edges
      edges.forEach(el => {
        if (el.data.source && el.data.target &&
            graph.hasNode(el.data.source) && graph.hasNode(el.data.target) &&
            !graph.hasEdge(el.data.source, el.data.target)) {
          graph.addEdge(el.data.source, el.data.target, {
            label: el.data.label || '',
            color: '#ccc',
            size: 2,
            ...el.data,
          });
        }
      });

      // Only apply layout on initial load or explicit layout changes
      if (isInitialLoad) {
        applyLayout(graph, selectedLayout, false);
        setIsInitialLoad(false);
        console.log(`Sigma.js: Initial load - applied ${selectedLayout} layout`);
      }

      // Calculate data range for timeline (only once)
      if (isInitialLoad && elements.length > 0) {
        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;

        elements.forEach(el => {
          if (el.data.timestamp) {
            const ts = typeof el.data.timestamp === 'number'
              ? el.data.timestamp
              : new Date(el.data.timestamp).getTime();
            if (ts < minTimestamp) minTimestamp = ts;
            if (ts > maxTimestamp) maxTimestamp = ts;
          }
        });

        if (isFinite(minTimestamp) && isFinite(maxTimestamp)) {
          onDataRangeChange(minTimestamp, maxTimestamp);
        }
      }

      // Load the graph
      loadGraph(graph);

      console.log(`Sigma.js: Loaded ${nodes.length} nodes and ${edges.length} edges`);
    } catch (error) {
      console.error('Error updating Sigma.js graph:', error);
    } finally {
      setIsLoading(false);
    }
  }, [elements, selectedLayout, graph, loadGraph, applyLayout, onDataRangeChange, isInitialLoad]);

  return null;
};

// Manual Positioning and Interaction Component
const ManualPositioning: React.FC<{
  setTooltip: React.Dispatch<React.SetStateAction<TooltipState>>;
  onManualPositioning: (hasManualPositions: boolean) => void;
}> = ({ setTooltip, onManualPositioning }) => {
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [manualPositioningMode, setManualPositioningMode] = useState(false);

  useEffect(() => {
    registerEvents({
      // Node dragging events
      downNode: (event) => {
        console.log(`Starting drag for node: ${event.node}`);
        setIsDragging(true);
        setDraggedNode(event.node);
        setManualPositioningMode(true);

        // Disable camera during drag
        sigma.getCamera().disable();

        // Prevent default behavior
        event.preventSigmaDefault();
        event.original.preventDefault();
        event.original.stopPropagation();
      },

      // Mouse move during drag
      mousemove: (event) => {
        if (isDragging && draggedNode) {
          // Convert screen coordinates to graph coordinates
          const pos = sigma.viewportToGraph(event);

          // Update node position
          sigma.getGraph().setNodeAttribute(draggedNode, 'x', pos.x);
          sigma.getGraph().setNodeAttribute(draggedNode, 'y', pos.y);

          // Prevent default behavior
          event.preventSigmaDefault();
          event.original.preventDefault();
          event.original.stopPropagation();
        }
      },

      // End dragging
      mouseup: () => {
        if (isDragging && draggedNode) {
          const finalPos = {
            x: sigma.getGraph().getNodeAttribute(draggedNode, 'x'),
            y: sigma.getGraph().getNodeAttribute(draggedNode, 'y'),
          };
          console.log(`Node ${draggedNode} positioned at:`, finalPos);

          setIsDragging(false);
          setDraggedNode(null);

          // Notify that manual positioning has occurred
          setManualPositioningMode(true);
          onManualPositioning(true);

          // Re-enable camera
          sigma.getCamera().enable();
        }
      },

      // Global mouse up to handle edge cases
      clickStage: () => {
        if (isDragging) {
          setIsDragging(false);
          setDraggedNode(null);
          sigma.getCamera().enable();
        }
      },

      // Tooltip events - only when not dragging
      enterNode: (event) => {
        if (!isDragging) {
          const nodeData = sigma.getGraph().getNodeAttributes(event.node);
          const nodeDisplayData = sigma.getNodeDisplayData(event.node);

          if (nodeDisplayData) {
            setTooltip({
              visible: true,
              x: nodeDisplayData.x + 20,
              y: nodeDisplayData.y - 10,
              title: nodeData.label || event.node,
              content: `Type: ${nodeData.type || 'N/A'} | ID: ${event.node}`,
            });
          }
        }
      },

      leaveNode: () => {
        if (!isDragging) {
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      },

      // Node click for selection/grouping
      clickNode: (event) => {
        if (!isDragging) {
          console.log('Node clicked:', event.node);
          // Handle node click events here (e.g., for grouping)
        }
      },
    });
  }, [registerEvents, sigma, isDragging, draggedNode, setTooltip, onManualPositioning]);

  return null;
};

// Main Sigma Graph Visualization Component
const SigmaGraphVisualization: React.FC<SigmaGraphVisualizationProps> = ({
  startTime,
  endTime,
  onDataRangeChange,
}) => {
  const [elements, setElements] = useState<GraphElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayout, setSelectedLayout] = useState('random');
  const [groupingEnabled, setGroupingEnabled] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [hasManualPositions, setHasManualPositions] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    title: '',
  });

  const toast = useToast();

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/graph-data?all=true');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setElements(data.elements || []);
        console.log(`Sigma.js: Fetched ${data.elements?.length || 0} elements`);
      } catch (err: any) {
        console.error('Error fetching graph data:', err);
        setError(err.message || 'Failed to fetch graph data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: string) => {
    setSelectedLayout(newLayout);
    // Reset manual positioning when layout is explicitly changed
    setHasManualPositions(false);
    toast({
      title: `Layout changed to ${newLayout} - Manual positioning reset`,
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // Reset manual positioning
  const resetManualPositioning = useCallback(() => {
    setHasManualPositions(false);
    toast({
      title: "Manual positioning reset - Layout will be reapplied",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  }, [toast]);

  // Toggle grouping
  const toggleGrouping = useCallback(() => {
    setGroupingEnabled(!groupingEnabled);
    toast({
      title: groupingEnabled ? "Grouping disabled" : "Grouping enabled",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [groupingEnabled, toast]);

  // Toggle animation
  const toggleAnimation = useCallback(() => {
    setAnimationEnabled(!animationEnabled);
    toast({
      title: animationEnabled ? "Animations disabled" : "Animations enabled",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [animationEnabled, toast]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="600px">
        <Spinner size="xl" />
        <Text ml={3}>Loading Graph Data...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="600px" p={4}>
        <Alert status="error" variant="solid" borderRadius="md" mb={4}>
          <AlertIcon />
          Error loading graph: {error}
        </Alert>
      </Box>
    );
  }

  if (!elements || elements.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="600px" p={4}>
        <Text fontSize="lg" fontWeight="bold" mb={2}>No graph data available</Text>
        <Text textAlign="center" maxWidth="600px">
          No nodes or relationships found. Try uploading a dataset or adjusting the time range.
        </Text>
      </Box>
    );
  }

  return (
    <Box border="1px solid #eee" borderRadius="md" overflow="hidden" height="600px" width="100%" position="relative">
      {/* Controls */}
      <Box
        position="absolute"
        top="10px"
        right="10px"
        zIndex="1000"
        bg="rgba(255, 255, 255, 0.95)"
        backdropFilter="blur(10px)"
        p={3}
        borderRadius="xl"
        boxShadow="lg"
        border="1px solid"
        borderColor="gray.200"
      >
        <VStack spacing={3} align="stretch">
          {/* Layout Selection */}
          <HStack spacing={2}>
            <Tooltip label="Graph Layout Algorithm" placement="left">
              <IconButton
                aria-label="Layout selector"
                icon={<FaProjectDiagram />}
                size="sm"
                colorScheme="brand"
                variant="ghost"
                opacity="0.8"
                _hover={{ opacity: 1 }}
              />
            </Tooltip>
            <Select
              size="sm"
              width="140px"
              value={selectedLayout}
              onChange={(e) => handleLayoutChange(e.target.value)}
              bg="white"
              borderColor="gray.300"
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </HStack>

          {/* Node Grouping Toggle */}
          <HStack spacing={2}>
            <Tooltip label="Group nodes by type" placement="left">
              <IconButton
                aria-label="Node grouping"
                icon={<FaLayerGroup />}
                size="sm"
                colorScheme="purple"
                variant="ghost"
                opacity="0.8"
                _hover={{ opacity: 1 }}
              />
            </Tooltip>
            <FormControl display="flex" alignItems="center">
              <Switch
                id="node-grouping"
                size="sm"
                isChecked={groupingEnabled}
                onChange={toggleGrouping}
                colorScheme="purple"
              />
              <FormLabel htmlFor="node-grouping" fontSize="xs" ml={2} mb={0} color="gray.600">
                Group
              </FormLabel>
            </FormControl>
          </HStack>

          {/* Reset Manual Positioning */}
          {hasManualPositions && (
            <HStack spacing={2} justify="center">
              <Tooltip label="Reset manual positioning and reapply layout" placement="left">
                <IconButton
                  aria-label="Reset positioning"
                  icon={<FaProjectDiagram />}
                  size="sm"
                  onClick={resetManualPositioning}
                  colorScheme="orange"
                  variant="outline"
                  opacity="0.9"
                  _hover={{ opacity: 1, transform: "scale(1.05)" }}
                  transition="all 0.2s"
                />
              </Tooltip>
            </HStack>
          )}

          {/* Animation toggle */}
          <HStack spacing={2} justify="center">
            <Tooltip label={animationEnabled ? "Disable animations" : "Enable animations"} placement="left">
              <IconButton
                aria-label="Toggle animations"
                icon={<FaCog />}
                size="sm"
                onClick={toggleAnimation}
                colorScheme={animationEnabled ? "blue" : "gray"}
                variant={animationEnabled ? "solid" : "outline"}
                opacity="0.9"
                _hover={{ opacity: 1, transform: "scale(1.05)" }}
                transition="all 0.2s"
              />
            </Tooltip>
          </HStack>
        </VStack>
      </Box>

      {/* Sigma Container */}
      <SigmaContainer
        style={{ height: '100%', width: '100%' }}
        settings={{
          defaultNodeColor: '#666',
          defaultEdgeColor: '#ccc',
          nodeReducer: (node, data) => ({ ...data }),
          edgeReducer: (edge, data) => ({ ...data }),
          enableEdgeClickEvents: true,
          enableEdgeWheelEvents: true,
          renderEdgeLabels: true,
        }}
      >
        <GraphController
          elements={elements}
          startTime={startTime}
          endTime={endTime}
          selectedLayout={selectedLayout}
          hasManualPositions={hasManualPositions}
          onDataRangeChange={onDataRangeChange}
        />
        <ManualPositioning
          setTooltip={setTooltip}
          onManualPositioning={setHasManualPositions}
        />
      </SigmaContainer>

      {/* Tooltip */}
      {tooltip.visible && (
        <Box
          position="fixed"
          left={`${tooltip.x}px`}
          top={`${tooltip.y}px`}
          bg="rgba(0, 0, 0, 0.9)"
          color="white"
          p={3}
          borderRadius="md"
          fontSize="sm"
          zIndex={9999}
          maxWidth="300px"
          minWidth="200px"
          boxShadow="lg"
          pointerEvents="none"
          border="1px solid rgba(255, 255, 255, 0.1)"
          backdropFilter="blur(4px)"
          transition="all 0.1s ease-out"
        >
          <Text fontWeight="bold" mb={1} lineHeight="1.2">{tooltip.title}</Text>
          <Text fontSize="xs" lineHeight="1.3" opacity={0.9}>{tooltip.content}</Text>
        </Box>
      )}
    </Box>
  );
};

export default SigmaGraphVisualization;
