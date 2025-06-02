"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import "@react-sigma/core/lib/style.css";
import Graph from 'graphology';

// Try importing from the main sigma package - the rendering subpackage might not export correctly
// We'll register the programs manually inside the component

// Error Boundary for Sigma.js
class SigmaErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Sigma.js Error Boundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          height="100%"
          p={4}
        >
          <Alert status="error" variant="solid" borderRadius="md" mb={4}>
            <AlertIcon />
            Sigma.js initialization failed
          </Alert>
          <Text fontSize="sm" color="gray.600" textAlign="center" maxWidth="400px">
            {this.state.error?.message?.includes('Container has no height')
              ? 'The graph container could not be properly initialized. This may be due to a layout issue.'
              : 'An error occurred while initializing the graph visualization. Please try refreshing the page.'
            }
          </Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

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

// Node color mapping - FIXED: Use colors instead of unsupported types
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

// Node size mapping based on type
const getNodeSize = (type: string): number => {
  const sizeMap: Record<string, number> = {
    'Server': 18,
    'Workstation': 15,
    'User': 12,
    'ThreatActor': 20,
    'Character': 14,
    'Database': 16,
    'Router': 17,
    'Client': 13,
    'Firewall': 19,
    'default': 15,
  };
  return sizeMap[type] || sizeMap.default;
};

// Sigma Instance Tracker Component
const SigmaInstanceTracker = React.forwardRef<any, {}>((props, ref) => {
  const sigma = useSigma();
  
  React.useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current !== undefined) {
      ref.current = sigma;
      console.log('Sigma.js: Instance tracked for cleanup');
    }
  }, [sigma, ref]);

  return null;
});
SigmaInstanceTracker.displayName = 'SigmaInstanceTracker';

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
  const sigma = useSigma();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const renderCountRef = useRef(0);
  const graphRef = useRef<Graph | null>(null);

  // Create a stable graph instance
  const graph = useMemo(() => {
    if (!graphRef.current) {
      graphRef.current = new Graph();
    }
    return graphRef.current;
  }, []);

  // Stable reference to data range callback to prevent infinite loops
  const stableOnDataRangeChange = useCallback(onDataRangeChange, []);

  // Reduce console logging for performance
  const shouldLog = renderCountRef.current < 5;
  if (shouldLog) {
    console.log('GraphController: Rendered with props:', {
      elementsCount: elements.length,
      startTime,
      endTime,
      selectedLayout,
      hasManualPositions,
      renderCount: ++renderCountRef.current
    });
  }

  // Apply layout to nodes - with strict manual positioning preservation
  const applyLayout = useCallback((graph: Graph, layoutType: string, preserveManualPositions: boolean = false) => {
    const nodes = graph.nodes();
    const nodeCount = nodes.length;

    if (nodeCount === 0) return;

    // If preserving manual positions, don't apply any layout at all
    if (preserveManualPositions) {
      if (shouldLog) console.log(`Skipping layout application - preserving manual positions`);
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

    if (shouldLog) console.log(`Applied ${layoutType} layout to ${nodeCount} nodes`);
  }, [shouldLog]);

  // FIXED: Memoize filtered elements to prevent unnecessary re-renders
  const filteredElements = useMemo(() => {
    return elements.filter(el => {
      if (!el.data.timestamp) return true; // Include elements without timestamps
      const timestamp = typeof el.data.timestamp === 'number' 
        ? el.data.timestamp 
        : new Date(el.data.timestamp).getTime();
      return timestamp >= startTime && timestamp <= endTime;
    });
  }, [elements, startTime, endTime]);

  // Filter and update graph based on time range - FIXED: Stabilize dependencies
  useEffect(() => {
    // Skip updates if we're in manual positioning mode and this is just a time range change
    if (hasManualPositions && !isInitialLoad) {
      if (shouldLog) console.log('Skipping graph update - manual positioning mode active');
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const updateGraph = async () => {
      if (!isMounted) return;

      setIsLoading(true);

      try {
        if (shouldLog) {
          console.log('GraphController: Processing elements:', {
            totalElements: elements.length,
            filteredElements: filteredElements.length,
            timeRange: {
              startTime,
              endTime,
              startTimeDate: new Date(startTime).toISOString(),
              endTimeDate: new Date(endTime).toISOString()
            }
          });

          // Debug: Show sample element timestamps
          if (elements.length > 0) {
            const sampleElements = elements.slice(0, 3);
            console.log('GraphController: Sample element timestamps:', sampleElements.map(el => ({
              id: el.data.id,
              timestamp: el.data.timestamp,
              timestampDate: el.data.timestamp ? new Date(el.data.timestamp).toISOString() : 'No timestamp'
            })));
          }
        }

        // Clear existing graph
        graph.clear();

        // Add nodes
        const nodes = filteredElements.filter(el => el.group === 'nodes');
        const edges = filteredElements.filter(el => el.group === 'edges');

        nodes.forEach(el => {
          if (!graph.hasNode(el.data.id)) {
            // FIXED: Remove the type property completely and use default circle nodes
            const { type, ...nodeDataWithoutType } = el.data;
            
            graph.addNode(el.data.id, {
              label: el.data.label || el.data.id,
              size: getNodeSize(type || 'default'),
              color: getNodeColor(type || 'default'),
              x: (Math.random() - 0.5) * 400,
              y: (Math.random() - 0.5) * 400,
              // Store original type in a custom attribute but don't use as node type
              originalType: type || 'default',
              // FIXED: Don't specify node type - let Sigma use its default renderer
              ...nodeDataWithoutType, // Spread all other data except 'type'
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
              // FIXED: Don't specify edge type - let Sigma use its default renderer
              ...el.data,
            });
          }
        });

        // Only apply layout on initial load or explicit layout changes
        if (isInitialLoad) {
          applyLayout(graph, selectedLayout, false);
          setIsInitialLoad(false);
          if (shouldLog) console.log(`Sigma.js: Initial load - applied ${selectedLayout} layout`);
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
            stableOnDataRangeChange(minTimestamp, maxTimestamp);
          }
        }

        // Load the graph
        loadGraph(graph);

        if (shouldLog) {
          console.log(`Sigma.js: Loaded ${nodes.length} nodes and ${edges.length} edges`);
          console.log('Sigma.js: Graph state after loading:', {
            nodeCount: graph.order,
            edgeCount: graph.size,
            hasNodes: graph.order > 0,
            hasEdges: graph.size > 0,
            nodeIds: graph.nodes().slice(0, 5) // Show first 5 node IDs
          });
          
          // Additional debugging: Log sample node data
          if (graph.order > 0) {
            const firstNode = graph.nodes()[0];
            const nodeData = graph.getNodeAttributes(firstNode);
            console.log('Sigma.js: Sample node data:', { id: firstNode, attributes: nodeData });
          }
        }

        // FIXED: Reduced timeout and added error handling
        timeoutId = setTimeout(() => {
          if (isMounted && sigma) {
            try {
              sigma.refresh();
              sigma.getCamera().setState({ x: 0, y: 0, ratio: 1 });
            } catch (error) {
              console.warn('Error forcing Sigma refresh:', error);
            }
          }
        }, 50);

      } catch (error) {
        console.error('Error updating Sigma.js graph:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    updateGraph();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [filteredElements, selectedLayout, hasManualPositions, isInitialLoad, graph, loadGraph, applyLayout, stableOnDataRangeChange, sigma, elements.length, shouldLog]); // FIXED: Use memoized filteredElements

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

        // FIXED: Remove event.original references as they don't exist on SigmaNodeEventPayload
        event.preventSigmaDefault();
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
              content: `Type: ${nodeData.originalType || 'N/A'} | ID: ${event.node}`,
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
  const [containerReady, setContainerReady] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    title: '',
  });
  const sigmaInstanceRef = useRef<any>(null);

  const toast = useToast();

  // FIXED: Add cleanup effect for Sigma instance
  useEffect(() => {
    return () => {
      // Cleanup on component unmount to prevent WebGL context leaks
      if (sigmaInstanceRef.current) {
        try {
          // FIXED: Better cleanup sequence
          const instance = sigmaInstanceRef.current;
          if (instance.kill) {
            instance.kill();
          } else if (instance.clear) {
            instance.clear();
          }
          console.log('Sigma.js: Instance cleaned up on unmount');
        } catch (error) {
          console.warn('Error cleaning up Sigma instance:', error);
        }
        sigmaInstanceRef.current = null;
      }
    };
  }, []);

  // FIXED: Improved container readiness with better cleanup
  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !containerReady) {
      console.log('Sigma.js: Container mounted, checking readiness...');
      
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const isReady = rect.height > 0 && rect.width > 0;
        
        console.log('Sigma.js: Container readiness check:', {
          rect: { width: rect.width, height: rect.height },
          isReady
        });
        
        if (isReady) {
          console.log('Sigma.js: Container is ready with dimensions:', { width: rect.width, height: rect.height });
          setContainerReady(true);
        } else {
          // Fallback: force ready after a short delay
          setTimeout(() => {
            console.log('Sigma.js: Forcing container ready after fallback delay');
            setContainerReady(true);
          }, 300);
        }
      });
    }
    
    // FIXED: Add cleanup when node is removed
    return () => {
      if (sigmaInstanceRef.current) {
        try {
          const instance = sigmaInstanceRef.current;
          if (instance.kill) {
            instance.kill();
          }
        } catch (error) {
          console.warn('Error cleaning up Sigma on container unmount:', error);
        }
        sigmaInstanceRef.current = null;
      }
    };
  }, [containerReady]);

  // FIXED: Better effect management for container readiness
  useEffect(() => {
    if (!loading && elements.length > 0 && !containerReady) {
      // Additional fallback: if we have data but container isn't ready after a delay, force it
      const fallbackTimer = setTimeout(() => {
        if (!containerReady) {
          console.log('Sigma.js: Fallback timeout - forcing container ready');
          setContainerReady(true);
        }
      }, 1000);

      return () => clearTimeout(fallbackTimer);
    }
  }, [loading, elements.length, containerReady]);

  // FIXED: Add layout change dependency management
  useEffect(() => {
    // Reset container when layout changes to ensure proper re-rendering
    if (selectedLayout && containerReady) {
      console.log('Sigma.js: Layout changed, ensuring proper render...');
      // Small delay to allow layout application to complete
      const layoutTimer = setTimeout(() => {
        if (sigmaInstanceRef.current && sigmaInstanceRef.current.refresh) {
          try {
            sigmaInstanceRef.current.refresh();
          } catch (error) {
            console.warn('Error refreshing after layout change:', error);
          }
        }
      }, 200);
      
      return () => clearTimeout(layoutTimer);
    }
  }, [selectedLayout, containerReady]);

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
    <Box
      ref={handleContainerRef}
      border="1px solid #eee"
      borderRadius="md"
      overflow="hidden"
      height="600px"
      width="100%"
      position="relative"
      minHeight="600px"
    >
      {/* Loading state while container is not ready */}
      {!containerReady && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          justifyContent="center"
          alignItems="center"
          bg="white"
          zIndex="999"
        >
          <VStack spacing={3}>
            <Spinner size="lg" color="blue.500" />
            <Text fontSize="sm" color="gray.600">Initializing graph container...</Text>
          </VStack>
        </Box>
      )}

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

      {/* FIXED: Simplified Sigma Container - avoid program registration issues */}
      {containerReady && (
        <SigmaErrorBoundary onError={(error) => setError(error.message)}>
          <SigmaContainer
            style={{ height: '100%', width: '100%' }}
            settings={{
              // Basic settings that work reliably
              defaultNodeColor: '#666',
              defaultEdgeColor: '#ccc',
              nodeReducer: (node, data) => ({ ...data }),
              edgeReducer: (edge, data) => ({ ...data }),
              enableEdgeEvents: true,
              renderEdgeLabels: true,
              allowInvalidContainer: true,
              // Performance settings
              hideEdgesOnMove: false,
              hideLabelsOnMove: false,
              renderLabels: true,
              // Simple approach: let Sigma use default programs
              zIndex: true,
              minCameraRatio: 0.1,
              maxCameraRatio: 10,
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
            <SigmaInstanceTracker ref={sigmaInstanceRef} />
          </SigmaContainer>
        </SigmaErrorBoundary>
      )}

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
