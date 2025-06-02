"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Box, Spinner, Text, useToast, IconButton, Tooltip, HStack, Select, VStack, Switch, FormControl, FormLabel } from '@chakra-ui/react';
import { FaCog, FaBolt, FaProjectDiagram, FaLayerGroup } from 'react-icons/fa';
import cytoscape from 'cytoscape'; // Import core cytoscape
import { getIconPath } from '@/lib/iconUtils';
import { useTimeline } from '@/contexts/TimelineContext';

// Import layout extensions
import dagre from 'cytoscape-dagre';
import cola from 'cytoscape-cola';
import avsdf from 'cytoscape-avsdf';
import coseBilkent from 'cytoscape-cose-bilkent';

// Register layout extensions
cytoscape.use(dagre);
cytoscape.use(cola);
cytoscape.use(avsdf);
cytoscape.use(coseBilkent);

// If you see a missing type error for 'react-cytoscapejs', add a declaration file or use: declare module 'react-cytoscapejs';

// Define the structure of the elements expected by Cytoscape (for reference)
// interface CytoscapeElement {
//   data: { id: string; label?: string; type?: string; riskLevel?: 'High' | 'Medium' | 'Low'; timestamp?: number; [key: string]: any };
//   group: 'nodes' | 'edges';
// }

interface GraphVisualizationProps {
  startTime: number; // Timestamp in milliseconds
  endTime: number;   // Timestamp in milliseconds
  onDataRangeChange?: (min: number, max: number) => void;
}

// Layout options with descriptions
interface LayoutOption {
  value: string;
  label: string;
  description: string;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { value: 'cose', label: 'Cose', description: 'Compound spring embedder - good for general graphs' },
  { value: 'cose-bilkent', label: 'Cose Bilkent', description: 'Enhanced compound spring embedder with better performance' },
  { value: 'cola', label: 'Cola', description: 'Constraint-based force-directed layout' },
  { value: 'dagre', label: 'Dagre', description: 'Hierarchical tree-like arrangement' },
  { value: 'avsdf', label: 'AVSDF', description: 'Force-directed with good node separation' },
  { value: 'circle', label: 'Circle', description: 'Nodes arranged in a circle' },
  { value: 'concentric', label: 'Concentric', description: 'Nodes in concentric circles based on hierarchy' },
  { value: 'grid', label: 'Grid', description: 'Nodes arranged in a grid pattern' },
  { value: 'breadthfirst', label: 'Breadthfirst', description: 'Hierarchical breadth-first tree' },
  { value: 'random', label: 'Random', description: 'Random positioning of nodes' },
];

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
  // Get timeline context for playing state
  const { isPlaying } = useTimeline();

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
  const [isInitializing, setIsInitializing] = useState<boolean>(true); // Flag to prevent animations during initial load
  const [lastFetchParams, setLastFetchParams] = useState<{ start: number, end: number } | null>(null);
  const [dataFetchAttempted, setDataFetchAttempted] = useState<boolean>(false); // Flag to prevent multiple fetch attempts
  const [selectedLayout, setSelectedLayout] = useState<string>('breadthfirst'); // Current layout selection - default to breadthfirst for better initial overview

  // Node grouping state
  const [groupingEnabled, setGroupingEnabled] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [originalElements, setOriginalElements] = useState<cytoscape.ElementDefinition[]>([]); // Store original ungrouped elements
  const [groupedElements, setGroupedElements] = useState<cytoscape.ElementDefinition[]>([]); // Store grouped elements

  // Manual positioning state
  const [manualPositioningMode, setManualPositioningMode] = useState<boolean>(false);
  const [userHasDraggedNodes, setUserHasDraggedNodes] = useState<boolean>(false);
  const manualPositioningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user-initiated layout changes to prevent premature manual mode disabling
  const layoutChangeInProgressRef = useRef<boolean>(false);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
    title: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    title: ''
  });

  // Initialize refs
  const cyRef = useRef<cytoscape.Core | null>(null); // Ref to store cytoscape instance
  const nodePositionsRef = useRef<Record<string, { x: number, y: number }>>({});
  const onDataRangeChangeRef = useRef(onDataRangeChange); // Store callback in ref to prevent dependency loops
  const currentElementsRef = useRef<cytoscape.ElementDefinition[]>([]); // Ref to track current elements without causing re-renders

  // Initialize hooks
  const toast = useToast();

  // Enhanced helper function for intelligent tooltip positioning
  const calculateTooltipPosition = useCallback((renderedPosition: { x: number; y: number }, containerRect: DOMRect) => {
    const offset = 15; // Distance from the element
    const tooltipWidth = 300; // Approximate tooltip width (matches maxWidth in tooltip component)
    const tooltipHeight = 80; // More accurate tooltip height accounting for title + content
    const margin = 10; // Margin from viewport edges
    const proximityThreshold = 15; // Keep tooltip within this distance of element

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate element's absolute position on screen
    const elementScreenX = containerRect.left + renderedPosition.x;
    const elementScreenY = containerRect.top + renderedPosition.y;

    // Determine optimal horizontal positioning
    let x, y;
    let positionedLeft = false;

    // Check if there's enough space on the right side
    const spaceOnRight = viewportWidth - elementScreenX - offset;
    const spaceOnLeft = elementScreenX - offset;

    if (spaceOnRight >= tooltipWidth + margin) {
      // Position on the right (default)
      x = elementScreenX + offset;
    } else if (spaceOnLeft >= tooltipWidth + margin) {
      // Position on the left
      x = elementScreenX - tooltipWidth - offset;
      positionedLeft = true;
    } else {
      // Not enough space on either side - use the side with more space
      if (spaceOnRight > spaceOnLeft) {
        // Right side has more space, but clamp to viewport
        x = Math.max(margin, viewportWidth - tooltipWidth - margin);
      } else {
        // Left side has more space
        x = margin;
        positionedLeft = true;
      }
    }

    // Vertical positioning - center on element with boundary checks
    y = elementScreenY - tooltipHeight / 2;

    // Enhanced vertical boundary detection
    if (y < margin) {
      y = margin; // Too close to top
    } else if (y + tooltipHeight + margin > viewportHeight) {
      y = viewportHeight - tooltipHeight - margin; // Too close to bottom
    }

    // Final proximity check - ensure tooltip stays close to element
    const distanceFromElement = Math.abs(x - elementScreenX);
    if (distanceFromElement > tooltipWidth + proximityThreshold) {
      // If tooltip is too far, bring it closer while respecting boundaries
      if (positionedLeft) {
        x = Math.max(margin, elementScreenX - tooltipWidth - proximityThreshold);
      } else {
        x = Math.min(viewportWidth - tooltipWidth - margin, elementScreenX + proximityThreshold);
      }
    }

    // Absolute final safety clamp to ensure tooltip is always visible
    x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin));
    y = Math.max(margin, Math.min(y, viewportHeight - tooltipHeight - margin));

    return { x, y };
  }, []);

  // Update the ref when the callback changes
  useEffect(() => {
    onDataRangeChangeRef.current = onDataRangeChange;
  }, [onDataRangeChange]);

  // Keep the ref in sync with the state
  useEffect(() => {
    currentElementsRef.current = currentElements;
  }, [currentElements]);

  // Function to get layout configuration based on selected layout
  const getLayoutConfig = useCallback((layoutName: string) => {
    // Only allow animations when timeline is playing AND not initializing AND animations are enabled AND not in manual mode
    const shouldAnimate = !isInitializing && animationEnabled && isPlaying && !manualPositioningMode;

    const baseConfig = {
      fit: true,
      padding: 60, // Increased base padding for better centering
      animate: shouldAnimate,
      animationDuration: shouldAnimate ? 600 : 0,
      center: true, // Ensure all layouts center properly
    };

    switch (layoutName) {
      case 'cose':
        return {
          ...baseConfig,
          name: 'cose',
          idealEdgeLength: 120,
          nodeOverlap: 30,
          refresh: (animationEnabled && isPlaying && !manualPositioningMode) ? 20 : 0, // Tie refresh to animation state
          randomize: false,
          componentSpacing: 150,
          nodeRepulsion: manualPositioningMode ? () => 0 : () => 450000, // Reduce repulsion if manually positioning
          edgeElasticity: () => 150,
          nestingFactor: 5,
          gravity: 80,
          numIter: 800,
          initialTemp: 150,
          coolingFactor: 0.95,
          minTemp: 1.0,
          // Explicitly override animate here
          animate: shouldAnimate,
          animationDuration: shouldAnimate ? 600 : 0,
        };

      case 'cose-bilkent':
        return {
          ...baseConfig,
          name: 'cose-bilkent',
          idealEdgeLength: 120,
          nodeRepulsion: manualPositioningMode ? 0 : 4500, // Reduce repulsion if manually positioning
          nodeOverlap: 20,
          refresh: (animationEnabled && isPlaying && !manualPositioningMode) ? 30 : 0, // More explicit refresh control
          randomize: false,
          componentSpacing: 100,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: 2500,
          tile: !manualPositioningMode, // Disable tiling in manual mode
          // Override any built-in animation settings
          animate: shouldAnimate,
          animationEasing: shouldAnimate ? 'ease-out' : undefined,
          animationDuration: shouldAnimate ? 1000 : 0,
        };

      case 'cola':
        return {
          ...baseConfig,
          name: 'cola',
          // Override any built-in animation settings
          animate: shouldAnimate,
          refresh: shouldAnimate ? 1 : 0,
          maxSimulationTime: shouldAnimate ? 4000 : 0,
          ungrabifyWhileSimulating: false,
          randomize: false,
          avoidOverlap: true,
          handleDisconnected: true,
          convergenceThreshold: 0.01,
          nodeSpacing: () => 10,
          flow: undefined,
          alignment: undefined,
          gapInequalities: undefined,
        };

      case 'dagre':
        return {
          ...baseConfig,
          name: 'dagre',
          nodeSep: 50,
          edgeSep: 10,
          rankSep: 100,
          rankDir: 'TB',
          ranker: 'network-simplex',
        };

      case 'avsdf':
        return {
          ...baseConfig,
          name: 'avsdf',
          nodeSeparation: 120,
        };

      case 'circle':
        return {
          ...baseConfig,
          name: 'circle',
          radius: undefined,
          spacingFactor: 1.75,
          boundingBox: undefined,
          transform: (_node: any, position: any) => position,
        };

      case 'concentric':
        return {
          ...baseConfig,
          name: 'concentric',
          concentric: (node: any) => node.degree(),
          levelWidth: (nodes: any) => nodes.maxDegree() / 4,
          spacing: 30,
          clockwise: true,
          equidistant: false,
          minNodeSpacing: 10,
        };

      case 'grid':
        return {
          ...baseConfig,
          name: 'grid',
          rows: undefined,
          cols: undefined,
          position: (_node: any) => ({ row: 0, col: 0 }),
          sort: undefined,
          // Ensure no animation for grid layout
          animate: false,
          animationDuration: 0,
        };

      case 'breadthfirst':
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: false,
          roots: undefined,
          padding: 80, // Increased padding for better centering
          spacingFactor: 2.5, // Increased spacing for better node separation
          boundingBox: undefined,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          transform: (_node: any, position: any) => position,
          fit: true, // Ensure the layout fits the viewport
          center: true, // Center the layout in the viewport
        };

      case 'random':
        return {
          ...baseConfig,
          name: 'random',
          boundingBox: undefined,
          transform: (_node: any, position: any) => position,
        };

      default:
        return {
          ...baseConfig,
          name: 'breadthfirst',
          directed: false,
          roots: undefined,
          padding: 80, // Increased padding for better centering
          spacingFactor: 2.5, // Increased spacing for better node separation
          boundingBox: undefined,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: false,
          transform: (_node: any, position: any) => position,
          fit: true, // Ensure the layout fits the viewport
          center: true, // Center the layout in the viewport
        };
    }
  }, [isInitializing, animationEnabled, isPlaying, manualPositioningMode]);

  // Node grouping functions
  const createGroupNode = useCallback((type: string, nodes: cytoscape.ElementDefinition[], count: number) => {
    const groupId = `group-${type}`;
    return {
      group: 'nodes' as const,
      data: {
        id: groupId,
        label: `${type} (${count})`,
        type: 'group',
        originalType: type,
        groupedNodes: nodes.map(n => n.data.id),
        icon: '/icons/unknown.png', // Use unknown icon as fallback for groups
        isGroup: true,
        nodeCount: count
      }
    };
  }, []);

  const createGroupedElements = useCallback((elements: cytoscape.ElementDefinition[]) => {
    if (!elements.length) return [];

    const nodes = elements.filter(el => el.group === 'nodes');
    const edges = elements.filter(el => el.group === 'edges');

    // Group nodes by type
    const nodesByType = new Map<string, cytoscape.ElementDefinition[]>();
    nodes.forEach(node => {
      const type = node.data.type || 'Unknown';
      if (!nodesByType.has(type)) {
        nodesByType.set(type, []);
      }
      nodesByType.get(type)!.push(node);
    });

    const groupedElements: cytoscape.ElementDefinition[] = [];
    const nodeIdToGroupId = new Map<string, string>();

    // Create group nodes for each type
    nodesByType.forEach((typeNodes, type) => {
      if (typeNodes.length === 1) {
        // If only one node of this type, don't group it
        groupedElements.push(typeNodes[0]);
      } else {
        // Create a group node
        const groupNode = createGroupNode(type, typeNodes, typeNodes.length);
        groupedElements.push(groupNode);

        // Map individual node IDs to group ID
        typeNodes.forEach(node => {
          nodeIdToGroupId.set(node.data.id, groupNode.data.id);
        });
      }
    });

    // Create aggregated edges between groups and individual nodes
    const groupEdges = new Map<string, { source: string; target: string; count: number; types: Set<string> }>();

    edges.forEach(edge => {
      const sourceId = String(edge.data.source);
      const targetId = String(edge.data.target);

      // Determine the effective source and target (group ID or original node ID)
      const effectiveSource = nodeIdToGroupId.get(sourceId) || sourceId;
      const effectiveTarget = nodeIdToGroupId.get(targetId) || targetId;

      // Skip self-loops within the same group
      if (effectiveSource === effectiveTarget) {
        console.log(`Skipping self-loop edge: ${sourceId} -> ${targetId} (both map to ${effectiveSource})`);
        return;
      }

      // Create a consistent edge key
      const edgeKey = `${effectiveSource}-${effectiveTarget}`;
      const reverseKey = `${effectiveTarget}-${effectiveSource}`;
      const key = edgeKey < reverseKey ? edgeKey : reverseKey;
      const [source, target] = key.split('-');

      if (!groupEdges.has(key)) {
        groupEdges.set(key, {
          source,
          target,
          count: 0,
          types: new Set()
        });
      }

      const groupEdge = groupEdges.get(key)!;
      groupEdge.count++;
      groupEdge.types.add(edge.data.type || 'default');

      console.log(`Aggregating edge: ${sourceId} -> ${targetId} becomes ${source} -> ${target} (count: ${groupEdge.count})`);
    });

    // Add aggregated edges to grouped elements
    groupEdges.forEach((edgeInfo, key) => {
      const edgeTypes = Array.from(edgeInfo.types).join(', ');
      const edgeElement = {
        group: 'edges' as const,
        data: {
          id: `grouped-edge-${key}`,
          source: edgeInfo.source,
          target: edgeInfo.target,
          label: `${edgeTypes} (${edgeInfo.count})`,
          type: 'grouped',
          isGrouped: true,
          edgeCount: edgeInfo.count,
          edgeTypes: Array.from(edgeInfo.types)
        }
      };
      groupedElements.push(edgeElement);
      console.log(`Created aggregated edge: ${edgeInfo.source} -> ${edgeInfo.target} with ${edgeInfo.count} connections`);
    });

    console.log(`Created ${groupedElements.filter(el => el.group === 'nodes').length} nodes and ${groupedElements.filter(el => el.group === 'edges').length} edges in grouped elements`);
    return groupedElements;
  }, [createGroupNode]);

  // Create mixed elements for scenarios where some groups are expanded and others are collapsed
  const createMixedGroupedElements = useCallback((elements: cytoscape.ElementDefinition[], expandedGroupTypes: Set<string>) => {
    if (!elements.length) return [];

    const nodes = elements.filter(el => el.group === 'nodes');
    const edges = elements.filter(el => el.group === 'edges');

    // Group nodes by type
    const nodesByType = new Map<string, cytoscape.ElementDefinition[]>();
    nodes.forEach(node => {
      const type = node.data.type || 'Unknown';
      if (!nodesByType.has(type)) {
        nodesByType.set(type, []);
      }
      nodesByType.get(type)!.push(node);
    });

    const mixedElements: cytoscape.ElementDefinition[] = [];
    const nodeIdToEffectiveId = new Map<string, string>();

    // Create nodes based on expansion state
    nodesByType.forEach((typeNodes, type) => {
      if (typeNodes.length === 1 || expandedGroupTypes.has(type)) {
        // If only one node of this type OR group is expanded, add individual nodes
        typeNodes.forEach(node => {
          mixedElements.push(node);
          nodeIdToEffectiveId.set(node.data.id, node.data.id);
        });
      } else {
        // Create a group node for collapsed groups
        const groupNode = createGroupNode(type, typeNodes, typeNodes.length);
        mixedElements.push(groupNode);

        // Map individual node IDs to group ID
        typeNodes.forEach(node => {
          nodeIdToEffectiveId.set(node.data.id, groupNode.data.id);
        });
      }
    });

    // Create edges based on the effective node mapping
    const effectiveEdges = new Map<string, { source: string; target: string; count: number; types: Set<string>; originalEdges: any[] }>();

    edges.forEach(edge => {
      const sourceId = String(edge.data.source);
      const targetId = String(edge.data.target);

      // Get the effective source and target
      const effectiveSource = nodeIdToEffectiveId.get(sourceId);
      const effectiveTarget = nodeIdToEffectiveId.get(targetId);

      // Skip if either node doesn't exist in our mapping
      if (!effectiveSource || !effectiveTarget) {
        console.log(`Skipping edge ${edge.data.id}: source ${sourceId} -> ${effectiveSource}, target ${targetId} -> ${effectiveTarget}`);
        return;
      }

      // Skip self-loops
      if (effectiveSource === effectiveTarget) {
        console.log(`Skipping self-loop edge: ${sourceId} -> ${targetId} (both map to ${effectiveSource})`);
        return;
      }

      // If both source and target are individual nodes (not groups), add the original edge
      const sourceIsGroup = effectiveSource.startsWith('group-');
      const targetIsGroup = effectiveTarget.startsWith('group-');

      if (!sourceIsGroup && !targetIsGroup) {
        // Both are individual nodes, add original edge
        mixedElements.push(edge);
        return;
      }

      // At least one is a group, create aggregated edge
      const edgeKey = `${effectiveSource}-${effectiveTarget}`;
      const reverseKey = `${effectiveTarget}-${effectiveSource}`;
      const key = edgeKey < reverseKey ? edgeKey : reverseKey;
      const [source, target] = key.split('-');

      if (!effectiveEdges.has(key)) {
        effectiveEdges.set(key, {
          source,
          target,
          count: 0,
          types: new Set(),
          originalEdges: []
        });
      }

      const effectiveEdge = effectiveEdges.get(key)!;
      effectiveEdge.count++;
      effectiveEdge.types.add(edge.data.type || 'default');
      effectiveEdge.originalEdges.push(edge);
    });

    // Add aggregated edges
    effectiveEdges.forEach((edgeInfo, key) => {
      const edgeTypes = Array.from(edgeInfo.types).join(', ');
      const edgeElement = {
        group: 'edges' as const,
        data: {
          id: `mixed-edge-${key}`,
          source: edgeInfo.source,
          target: edgeInfo.target,
          label: `${edgeTypes} (${edgeInfo.count})`,
          type: 'grouped',
          isGrouped: true,
          edgeCount: edgeInfo.count,
          edgeTypes: Array.from(edgeInfo.types)
        }
      };
      mixedElements.push(edgeElement);
      console.log(`Created mixed aggregated edge: ${edgeInfo.source} -> ${edgeInfo.target} with ${edgeInfo.count} connections`);
    });

    console.log(`Created mixed elements: ${mixedElements.filter(el => el.group === 'nodes').length} nodes and ${mixedElements.filter(el => el.group === 'edges').length} edges`);
    return mixedElements;
  }, [createGroupNode]);

  // Store and apply node positions - MOVED UP to fix reference error
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

  const expandGroup = useCallback((groupId: string, groupType: string) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    // Get the group node position
    const groupNode = cy.getElementById(groupId);
    if (!groupNode || groupNode.length === 0) {
      console.warn(`Group node ${groupId} not found`);
      return;
    }
    const groupPosition = groupNode.position();

    // Find all nodes of this type in original elements
    const nodesToExpand = originalElements.filter(el =>
      el.group === 'nodes' && el.data.type === groupType
    );

    if (nodesToExpand.length === 0) {
      console.warn(`No nodes found for group type ${groupType}`);
      return;
    }

    // Get all current node IDs in the graph (excluding the group node we're about to remove)
    const currentNodeIds = new Set(
      cy.nodes().filter(node => node.id() !== groupId).map(node => node.id())
    );

    // Add the node IDs we're about to expand
    const expandingNodeIds = new Set(nodesToExpand.map(n => String(n.data.id)));
    const allAvailableNodeIds = new Set([...currentNodeIds, ...expandingNodeIds]);

    // Find edges connected to these nodes, but only include edges where BOTH source and target exist
    const edgesToExpand = originalElements.filter(el => {
      if (el.group !== 'edges') return false;

      const sourceId = String(el.data.source);
      const targetId = String(el.data.target);

      // Only include edges where both source and target nodes will exist in the graph
      const sourceExists = allAvailableNodeIds.has(sourceId);
      const targetExists = allAvailableNodeIds.has(targetId);

      if (sourceExists && targetExists) {
        console.log(`Including edge ${el.data.id}: ${sourceId} -> ${targetId}`);
        return true;
      } else {
        console.log(`Excluding edge ${el.data.id}: ${sourceId} -> ${targetId} (source exists: ${sourceExists}, target exists: ${targetExists})`);
        return false;
      }
    });

    try {
      // Remove the group node and its edges
      cy.remove(`#${groupId}`);
      cy.remove(`edge[source="${groupId}"], edge[target="${groupId}"]`);

      // Add the individual nodes first
      cy.add(nodesToExpand);

      // Then add the validated edges
      if (edgesToExpand.length > 0) {
        cy.add(edgesToExpand);
      }

      // Position the expanded nodes around the group position
      const radius = 80;
      const angleStep = (2 * Math.PI) / nodesToExpand.length;

      nodesToExpand.forEach((node, index) => {
        const angle = index * angleStep;
        const x = groupPosition.x + radius * Math.cos(angle);
        const y = groupPosition.y + radius * Math.sin(angle);

        const cyNode = cy.getElementById(node.data.id);
        if (cyNode && cyNode.length > 0) {
          cyNode.position({ x, y });
        }
      });

      // Update expanded groups state
      const newExpandedGroups = new Set([...expandedGroups, groupType]);
      setExpandedGroups(newExpandedGroups);

      // Recreate the entire graph with mixed grouping to ensure proper relationships
      setTimeout(() => {
        if (cy && !cy.destroyed()) {
          console.log('Recreating graph with mixed grouping after expansion');

          // Clear the graph
          cy.elements().remove();

          // Create mixed elements with the new expansion state
          const mixedElements = createMixedGroupedElements(originalElements, newExpandedGroups);

          // Add the mixed elements
          cy.add(normalizeElements(mixedElements));

          // Apply stored positions where possible
          try {
            applyStoredPositions();
          } catch (error) {
            console.warn('Error applying stored positions in expandGroup:', error);
          }

          // Apply layout to organize the expanded nodes (only if not in manual positioning mode)
          if (animationEnabled && isPlaying && !manualPositioningMode) {
            console.log('Applying layout after group expansion');
            const layout = cy.layout({
              ...getLayoutConfig(selectedLayout),
              animate: true,
              animationDuration: 600
            });
            layout.run();
          } else {
            console.log('Skipping layout after group expansion (manual positioning mode or timeline paused)');
          }
        }
      }, 50);

      console.log(`Expanded group ${groupType}: recreated graph with mixed grouping`);
    } catch (error) {
      console.error(`Error expanding group ${groupType}:`, error);
      // Try to restore a consistent state
      try {
        // Remove any partially added elements
        const addedNodeIds = nodesToExpand.map(n => n.data.id);
        cy.remove(addedNodeIds.map(id => `#${id}`).join(', '));

        // Re-add the group node if it was removed
        if (!cy.getElementById(groupId).length) {
          const originalNodes = originalElements.filter(el =>
            el.group === 'nodes' && el.data.type === groupType
          );
          const groupNode = createGroupNode(groupType, originalNodes, originalNodes.length);
          const addedGroup = cy.add(groupNode);
          addedGroup.position(groupPosition);
        }
      } catch (restoreError) {
        console.error('Error restoring group after failed expansion:', restoreError);
      }
    }
  }, [originalElements, animationEnabled, isPlaying, selectedLayout, createGroupNode, manualPositioningMode, expandedGroups, createMixedGroupedElements, applyStoredPositions]);

  const collapseGroup = useCallback((groupType: string) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    // Find all nodes of this type currently in the graph
    const nodesToCollapse = cy.nodes().filter(node =>
      node.data('type') === groupType && !node.data('isGroup')
    );

    if (nodesToCollapse.length === 0) {
      console.warn(`No nodes of type ${groupType} found to collapse`);
      return;
    }

    // Calculate center position of nodes to collapse
    let centerX = 0, centerY = 0;
    nodesToCollapse.forEach(node => {
      const pos = node.position();
      centerX += pos.x;
      centerY += pos.y;
    });
    centerX /= nodesToCollapse.length;
    centerY /= nodesToCollapse.length;

    try {
      // Remove the individual nodes and their edges
      const nodeIds = nodesToCollapse.map(node => node.id());
      cy.remove(nodesToCollapse);

      // Remove edges more safely by checking each one
      nodeIds.forEach(nodeId => {
        cy.remove(`edge[source="${nodeId}"], edge[target="${nodeId}"]`);
      });

      // Create and add the group node
      const originalNodes = originalElements.filter(el =>
        el.group === 'nodes' && el.data.type === groupType
      );
      const groupNode = createGroupNode(groupType, originalNodes, originalNodes.length);

      const addedGroup = cy.add(groupNode);
      addedGroup.position({ x: centerX, y: centerY });

      // Get current node IDs in the graph (after adding the group node)
      const currentNodeIds = new Set(cy.nodes().map(node => node.id()));

      // Recreate aggregated edges for this group, but only to nodes that exist
      const newGroupedElements = createGroupedElements([...originalElements]);
      const newGroupEdges = newGroupedElements.filter(el => {
        if (el.group !== 'edges') return false;

        const isConnectedToGroup = el.data.source === groupNode.data.id || el.data.target === groupNode.data.id;
        if (!isConnectedToGroup) return false;

        // Ensure both source and target exist in the current graph
        const sourceExists = currentNodeIds.has(String(el.data.source));
        const targetExists = currentNodeIds.has(String(el.data.target));

        return sourceExists && targetExists;
      });

      // Add the validated group edges
      if (newGroupEdges.length > 0) {
        cy.add(newGroupEdges);
      }

      // Update expanded groups state
      const newExpandedGroups = new Set(expandedGroups);
      newExpandedGroups.delete(groupType);
      setExpandedGroups(newExpandedGroups);

      // Recreate the entire graph with mixed grouping to ensure proper relationships
      setTimeout(() => {
        if (cy && !cy.destroyed()) {
          console.log('Recreating graph with mixed grouping after collapse');

          // Clear the graph
          cy.elements().remove();

          // Create mixed elements with the new expansion state
          const mixedElements = createMixedGroupedElements(originalElements, newExpandedGroups);

          // Add the mixed elements
          cy.add(normalizeElements(mixedElements));

          // Apply stored positions where possible
          try {
            applyStoredPositions();
          } catch (error) {
            console.warn('Error applying stored positions in collapseGroup:', error);
          }

          // Apply layout (only if not in manual positioning mode)
          if (animationEnabled && isPlaying && !manualPositioningMode) {
            console.log('Applying layout after group collapse');
            const layout = cy.layout({
              ...getLayoutConfig(selectedLayout),
              animate: true,
              animationDuration: 600
            });
            layout.run();
          } else {
            console.log('Skipping layout after group collapse (manual positioning mode or timeline paused)');
          }
        }
      }, 50);

      console.log(`Collapsed group ${groupType}: recreated graph with mixed grouping`);
    } catch (error) {
      console.error(`Error collapsing group ${groupType}:`, error);
      // Update state to reflect the actual graph state
      setExpandedGroups(prev => {
        const newSet = new Set(prev);
        newSet.delete(groupType);
        return newSet;
      });
    }
  }, [originalElements, createGroupNode, createGroupedElements, animationEnabled, isPlaying, selectedLayout, manualPositioningMode, expandedGroups, createMixedGroupedElements, applyStoredPositions]);

  // Toggle grouping function
  const toggleGrouping = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    const newGroupingState = !groupingEnabled;
    setGroupingEnabled(newGroupingState);

    if (newGroupingState) {
      // Enable grouping - create grouped elements
      const grouped = createGroupedElements(originalElements);
      setGroupedElements(grouped);

      // Clear current graph and add grouped elements
      cy.elements().remove();
      cy.add(normalizeElements(grouped));

      // Reset expanded groups
      setExpandedGroups(new Set());

      // Apply layout (only if not in manual positioning mode)
      if (!manualPositioningMode) {
        setTimeout(() => {
          if (cy && !cy.destroyed()) {
            console.log('Applying layout after enabling grouping');
            const layout = cy.layout({
              ...getLayoutConfig(selectedLayout),
              animate: animationEnabled && isPlaying,
              animationDuration: animationEnabled && isPlaying ? 800 : 0
            });
            layout.run();
          }
        }, 100);
      } else {
        console.log('Skipping layout after enabling grouping (manual positioning mode)');
      }
    } else {
      // Disable grouping - restore original elements
      cy.elements().remove();
      cy.add(normalizeElements(originalElements));

      // Reset expanded groups
      setExpandedGroups(new Set());

      // Apply layout (only if not in manual positioning mode)
      if (!manualPositioningMode) {
        setTimeout(() => {
          if (cy && !cy.destroyed()) {
            console.log('Applying layout after disabling grouping');
            const layout = cy.layout({
              ...getLayoutConfig(selectedLayout),
              animate: animationEnabled && isPlaying,
              animationDuration: animationEnabled && isPlaying ? 800 : 0
            });
            layout.run();
          }
        }, 100);
      } else {
        console.log('Skipping layout after disabling grouping (manual positioning mode)');
      }
    }
  }, [groupingEnabled, originalElements, createGroupedElements, selectedLayout, animationEnabled, isPlaying, manualPositioningMode]);

  // Update grouped elements when original elements change
  useEffect(() => {
    if (groupingEnabled && originalElements.length > 0) {
      const grouped = createGroupedElements(originalElements);
      setGroupedElements(grouped);
    }
  }, [originalElements, groupingEnabled, createGroupedElements]);

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

        // Add enhanced icon path for each node and store elements
        const enhanced = sortedElements.map(el => {
          if (el.group === 'nodes') {
            // Use enhanced icon mapping with PNG format
            const iconPath = getIconPath(el.data?.type);

            // Add enhanced icon handling
            return {
              ...el,
              data: {
                ...el.data,
                icon: iconPath,
                // Store original type for debugging and fallback handling
                originalType: el.data?.type,
                // Add a fallback icon in case the main one fails to load
                fallbackIcon: '/icons/unknown.png'
              }
            };
          }
          return el;
        });
        setAllElements(enhanced);
        setOriginalElements(enhanced); // Store original elements for grouping
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

        // Set a timeout to complete initialization after data range is set
        setTimeout(() => {
          setIsInitializing(false);
          console.log('GraphVisualization: Initialization completed');
          // Note: Removed automatic layout application to prevent unwanted node movement
        }, 100);
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
      setIsInitializing(false); // Also complete initialization on error
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

      // Update original elements for grouping (filtered by time)
      setOriginalElements(filteredElements);
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
        // Store all elements from the API with enhanced icon paths
        const enhanced = data.elements.map((el: any) => {
          if (el.group === 'nodes') {
            // Use enhanced icon mapping with PNG format
            const iconPath = getIconPath(el.data?.type);
            return {
              ...el,
              data: {
                ...el.data,
                icon: iconPath,
                // Store original type for debugging
                originalType: el.data?.type
              }
            };
          }
          return el;
        });
        setElements(enhanced);

        // Initialize current elements if empty - defer to avoid state updates during render
        setTimeout(() => {
          if (currentElementsRef.current.length === 0) {
            setCurrentElements(enhanced);
            currentElementsRef.current = enhanced;
          }
        }, 0);
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

    // Allow filtering during initialization to populate elements for initial display
    console.log(`GraphVisualization: Filtering data for time range: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);


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
      selector: 'node[type="group"]',
      style: {
        'background-color': '#34495e',
        'shape': 'round-rectangle',
        'width': '60px',
        'height': '40px',
        'font-size': '12px',
        'color': '#ecf0f1',
        'text-outline-color': '#2c3e50',
        'text-outline-width': '2px',
        'border-width': '3px',
        'border-color': '#2c3e50',
        'border-style': 'dashed',
        'text-wrap': 'wrap',
        'text-max-width': '55px'
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
        selector: 'edge[type="grouped"]',
        style: {
            'line-color': '#7f8c8d',
            'target-arrow-color': '#7f8c8d',
            'width': 3,
            'line-style': 'solid',
            'font-size': '10px',
            'color': '#2c3e50',
            'text-background-color': '#ecf0f1',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px'
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

  // Manual positioning mode helpers
  const enableManualPositioningMode = useCallback(() => {
    console.log('GraphVisualization: Enabling manual positioning mode');
    setManualPositioningMode(true);
    setUserHasDraggedNodes(true);

    // Clear any existing timeout
    if (manualPositioningTimeoutRef.current) {
      clearTimeout(manualPositioningTimeoutRef.current);
    }

    // Set a timeout to automatically disable manual mode after 5 minutes of inactivity
    manualPositioningTimeoutRef.current = setTimeout(() => {
      console.log('GraphVisualization: Auto-disabling manual positioning mode after inactivity');
      setManualPositioningMode(false);
    }, 300000); // 5 minutes
  }, []);

  const disableManualPositioningMode = useCallback((reason?: string) => {
    console.log(`GraphVisualization: Disabling manual positioning mode (Reason: ${reason || 'N/A'})`);
    setManualPositioningMode(false);

    // Clear any existing timeout
    if (manualPositioningTimeoutRef.current) {
      clearTimeout(manualPositioningTimeoutRef.current);
      manualPositioningTimeoutRef.current = null;
    }
  }, []);

  const resetManualPositioningTimeout = useCallback(() => {
    if (manualPositioningMode && manualPositioningTimeoutRef.current) {
      clearTimeout(manualPositioningTimeoutRef.current);
      manualPositioningTimeoutRef.current = setTimeout(() => {
        console.log('GraphVisualization: Auto-disabling manual positioning mode after inactivity');
        setManualPositioningMode(false);
      }, 300000); // 5 minutes
    }
  }, [manualPositioningMode]);

  // Add a function to reset manual positioning and re-apply layout
  const resetAndRelayout = useCallback(() => {
    console.log('GraphVisualization: Resetting manual positioning and applying layout');
    nodePositionsRef.current = {};
    setUserHasDraggedNodes(false);
    disableManualPositioningMode('User Reset');

    if (cyRef.current && !cyRef.current.destroyed()) {
      layoutChangeInProgressRef.current = true; // Signal intentional layout
      const layout = cyRef.current.layout(getLayoutConfig(selectedLayout));
      layout.run();
      layoutChangeInProgressRef.current = false;
    }
  }, [disableManualPositioningMode, selectedLayout, getLayoutConfig]);



  // Handle events and animations
  const setupCytoscapeEvents = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    try {
      // Clear previous listeners to avoid duplicates
      cy.removeAllListeners();

      // Hover effects with tooltips
      cy.on('mouseover', 'node', (event) => {
        try {
          event.target.addClass('hovered');

          // Show tooltip
          const nodeData = event.target.data();
          const renderedPosition = event.target.renderedPosition();
          const container = cy.container();
          const containerRect = container?.getBoundingClientRect();

          if (containerRect) {
            const { x, y } = calculateTooltipPosition(renderedPosition, containerRect);

            // Different tooltip content for group nodes
            if (nodeData.isGroup) {
              const isExpanded = expandedGroups.has(nodeData.originalType);
              setTooltip({
                visible: true,
                x,
                y,
                title: `${nodeData.label || nodeData.id}`,
                content: `Group Type: ${nodeData.originalType} | Nodes: ${nodeData.nodeCount} | Status: ${isExpanded ? 'Expanded' : 'Collapsed'} | Click to ${isExpanded ? 'collapse' : 'expand'}`
              });
            } else {
              const iconInfo = nodeData.icon ? nodeData.icon.split('/').pop() : 'N/A';
              setTooltip({
                visible: true,
                x,
                y,
                title: `${nodeData.label || nodeData.id}`,
                content: `Type: ${nodeData.type || 'N/A'} | Risk: ${nodeData.riskLevel || 'N/A'} | Icon: ${iconInfo}`
              });
            }
          }
        } catch (error) {
          console.warn('Error adding hover class:', error);
        }
      });

      cy.on('mouseout', 'node', (event) => {
        try {
          event.target.removeClass('hovered');
          setTooltip(prev => ({ ...prev, visible: false }));
        } catch (error) {
          console.warn('Error removing hover class:', error);
        }
      });

      // Edge hover effects with tooltips
      cy.on('mouseover', 'edge', (event) => {
        try {
          const edgeData = event.target.data();
          const renderedMidpoint = event.target.renderedMidpoint();
          const container = cy.container();
          const containerRect = container?.getBoundingClientRect();

          if (containerRect) {
            const { x, y } = calculateTooltipPosition(renderedMidpoint, containerRect);

            // Different tooltip content for grouped edges
            if (edgeData.isGrouped) {
              setTooltip({
                visible: true,
                x,
                y,
                title: `${edgeData.label || edgeData.id}`,
                content: `Grouped Edge | Connections: ${edgeData.edgeCount} | Types: ${edgeData.edgeTypes?.join(', ') || 'N/A'} | Source: ${edgeData.source} | Target: ${edgeData.target}`
              });
            } else {
              setTooltip({
                visible: true,
                x,
                y,
                title: `${edgeData.label || edgeData.id}`,
                content: `Source: ${edgeData.source} | Target: ${edgeData.target}`
              });
            }
          }
        } catch (error) {
          console.warn('Error handling edge hover:', error);
        }
      });

      cy.on('mouseout', 'edge', (event) => {
        try {
          setTooltip(prev => ({ ...prev, visible: false }));
        } catch (error) {
          console.warn('Error handling edge mouseout:', error);
        }
      });

      // Handle node clicks for group expand/collapse
      cy.on('tap', 'node', (event) => {
        try {
          const node = event.target;
          const nodeData = node.data();

          console.log('Node tap event:', {
            nodeId: nodeData.id,
            isGroup: nodeData.isGroup,
            originalType: nodeData.originalType,
            groupType: nodeData.type,
            expandedGroups: Array.from(expandedGroups)
          });

          // Check if this is a group node - improved detection
          if (nodeData.isGroup === true && nodeData.originalType) {
            event.stopPropagation(); // Prevent event bubbling
            const groupType = nodeData.originalType;

            console.log(`Group node clicked: ${groupType}, currently expanded: ${expandedGroups.has(groupType)}`);

            if (expandedGroups.has(groupType)) {
              // Group is expanded, collapse it
              console.log(`Collapsing group: ${groupType}`);
              collapseGroup(groupType);
              toast({
                title: `Collapsed ${groupType} group`,
                status: "info",
                duration: 2000,
                isClosable: true,
              });
            } else {
              // Group is collapsed, expand it
              console.log(`Expanding group: ${groupType}`);
              expandGroup(nodeData.id, groupType);
              toast({
                title: `Expanded ${groupType} group`,
                status: "info",
                duration: 2000,
                isClosable: true,
              });
            }
          } else {
            console.log('Regular node clicked, not a group node');
          }
        } catch (error) {
          console.error('Error handling node tap:', error);
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

      // Handle drag start for nodes - enable manual positioning mode immediately
      cy.on('grab', 'node', (event) => {
        try {
          console.log('Node drag started - enabling manual positioning mode');

          // Stop any running layouts immediately
          cy.stop();

          // Store current positions before starting drag
          storeNodePositions();

          // Enable manual positioning mode directly
          setManualPositioningMode(true);
          setUserHasDraggedNodes(true);

          // Ensure the node is grabbable and draggable
          const node = event.target;
          node.ungrabify(false);
          node.lock(false);

          // Disable any automatic layout updates during drag
          cy.autoungrabify(false);

        } catch (error) {
          console.warn('Error handling node grab:', error);
        }
      });

      // Handle active dragging to prevent interference
      cy.on('drag', 'node', (event) => {
        try {
          // Stop any layouts that might interfere with dragging
          cy.stop();

          // Store the new position immediately
          const node = event.target;
          const position = node.position();
          nodePositionsRef.current[node.id()] = position;

        } catch (error) {
          console.warn('Error handling node drag:', error);
        }
      });

      // Handle drag end for nodes - use 'free' event which is more reliable
      cy.on('free', 'node', (event) => {
        try {
          const node = event.target;
          const finalPosition = node.position();
          console.log(`Node drag ended for ${node.id()} at X: ${finalPosition.x}, Y: ${finalPosition.y}`);

          // Store the final position immediately
          nodePositionsRef.current[node.id()] = finalPosition;

          // Store all node positions
          storeNodePositions();

          // Re-enable manual positioning mode to keep it active and refresh its timeout
          enableManualPositioningMode();

          // Re-enable automatic grabbing for other nodes
          cy.autoungrabify(true);

          console.log(`Node ${node.id()} final position stored. Manual mode remains active.`);

        } catch (error) {
          console.warn('Error storing positions on node free:', error);
        }
      });

      // Store positions when layout completes - SIMPLIFIED
      const handleLayoutStop = () => {
        try {
          console.log('Layout stopped - storing current positions');
          storeNodePositions();
        } catch (error) {
          console.warn('Error in layoutstop handler:', error);
        }
      };

      // Add the layoutstop handler
      cy.on('layoutstop', handleLayoutStop);

      // Return cleanup function
      return () => {
        try {
          if (cy && !cy.destroyed()) {
            cy.off('layoutstop');
            cy.off('mouseup');
            cy.off('dragfree');
            cy.off('grab', 'node');
            cy.off('drag', 'node');
            cy.off('dragfreeon', 'node');
            cy.off('tap', 'node');
            cy.off('tap', 'edge');
            cy.off('mouseover', 'node');
            cy.off('mouseout', 'node');
            cy.off('mouseover', 'edge');
            cy.off('mouseout', 'edge');
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
  }, [toast, storeNodePositions, calculateTooltipPosition, expandGroup, collapseGroup, enableManualPositioningMode]);

  // REDESIGNED: Clean separation of concerns to eliminate auto-refreshing issues

  // 1. Element Updates Only - No Layout Logic Here
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || isInitializing) return;

    const targetElements = groupingEnabled
      ? (expandedGroups.size > 0 ? createMixedGroupedElements(elements, expandedGroups) : groupedElements)
      : elements;

    // Check if elements actually changed to avoid unnecessary updates
    const currentCyElements = cy.elements();
    const elementsToAdd = targetElements.filter(el => !currentCyElements.getElementById(el.data.id).length);
    const elementsToRemove = currentCyElements.filter(cyEl => !targetElements.some(el => el.data.id === cyEl.id()));

    if (elementsToAdd.length > 0 || elementsToRemove.length > 0) {
      console.log(`Element update: +${elementsToAdd.length}, -${elementsToRemove.length}`);

      // Batch all element changes together
      cy.batch(() => {
        if (elementsToRemove.length > 0) {
          cy.remove(elementsToRemove);
        }
        if (elementsToAdd.length > 0) {
          cy.add(normalizeElements(elementsToAdd));
        }
      });

      setCurrentElements(targetElements);
    }
  }, [elements, groupedElements, groupingEnabled, expandedGroups, createMixedGroupedElements, normalizeElements, setCurrentElements, isInitializing]);

  // 2. Layout Application - Strict Control with Minimal Triggers
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || isInitializing || layoutChangeInProgressRef.current) return;

    const currentElementCount = cy.elements().length;

    // Define very specific conditions for when layout should run
    const isInitialLoad = currentElementCount > 0 && !userHasDraggedNodes && Object.keys(nodePositionsRef.current).length === 0;
    const shouldRunForTimeline = isPlaying && !manualPositioningMode && currentElementCount > 0;

    if (isInitialLoad) {
      console.log('Running initial layout');
      layoutChangeInProgressRef.current = true;

      const layoutConfig = getLayoutConfig(selectedLayout);
      const layout = cy.layout({
        ...layoutConfig,
        animate: false, // No animation for initial load
        stop: () => {
          layoutChangeInProgressRef.current = false;
          storeNodePositions();
        }
      });
      layout.run();
    } else if (shouldRunForTimeline) {
      console.log('Running timeline layout');
      layoutChangeInProgressRef.current = true;

      const layoutConfig = getLayoutConfig(selectedLayout);
      const layout = cy.layout({
        ...layoutConfig,
        animate: animationEnabled,
        animationDuration: animationEnabled ? transitionSpeed : 0,
        stop: () => {
          layoutChangeInProgressRef.current = false;
        }
      });
      layout.run();
    }
  }, [isPlaying, manualPositioningMode, userHasDraggedNodes, selectedLayout, animationEnabled, transitionSpeed, getLayoutConfig, storeNodePositions, isInitializing]);

  // 3. Manual Position Restoration - Separate and Clean
  useEffect(() => {
    if (manualPositioningMode && userHasDraggedNodes && Object.keys(nodePositionsRef.current).length > 0) {
      console.log('Restoring manual positions');
      const timeoutId = setTimeout(() => {
        applyStoredPositions();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [manualPositioningMode, userHasDraggedNodes, applyStoredPositions]);

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

  // Cleanup manual positioning timeout and event listeners on unmount
  useEffect(() => {
    const cy = cyRef.current;

    return () => {
      // Clear any pending timeouts
      if (manualPositioningTimeoutRef.current) {
        clearTimeout(manualPositioningTimeoutRef.current);
      }

      // Clean up any cytoscape event listeners
      if (cy && !cy.destroyed()) {
        try {
          // Remove all event listeners to prevent memory leaks
          cy.off('layoutstop');
          cy.off('mouseup');
          cy.off('dragfree');
          cy.off('grab', 'node');
          cy.off('drag', 'node');
          cy.off('free', 'node');
          cy.off('tap', 'node');
          cy.off('tap', 'edge');
          cy.off('mouseover', 'node');
          cy.off('mouseout', 'node');
          cy.off('mouseover', 'edge');
          cy.off('mouseout', 'edge');

          // Stop any running layouts
          cy.stop();

          // Reset manual positioning mode
          if (manualPositioningMode) {
            setManualPositioningMode(false);
          }
        } catch (error) {
          console.warn('Error during cleanup:', error);
        }
      }

      // Reset state references
      layoutChangeInProgressRef.current = false;
    };
  }, [manualPositioningMode]);

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
    // Defer this to avoid state updates during render
    setTimeout(() => {
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
    }, 0);

    // Clean up
    return () => {
      window.removeEventListener('transitionspeedchange', handleTransitionSpeedChange as EventListener);
    };
  }, []);

  // Setup cytoscape events - run only once when cy is available
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    // Setup events only once
    const cleanup = setupCytoscapeEvents();

    return () => {
      if (cleanup) cleanup();
    };
  }, []); // Empty dependency array to run only once

  // Note: Layout execution is now handled in the main element/layout effect above
  // This prevents conflicts and ensures proper coordination between element updates and layout application

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

  // Handle layout change
  const handleLayoutChange = useCallback((newLayout: string) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    layoutChangeInProgressRef.current = true; // Mark as user-initiated

    setSelectedLayout(newLayout);

    // Clear old positions for fresh layout start
    nodePositionsRef.current = {};

    // Get the new layout configuration
    const newLayoutConfig = getLayoutConfig(newLayout);

    // Apply the new layout with animation (user explicitly requested layout change)
    const shouldAnimate = animationEnabled;
    const layoutOptions = {
      ...newLayoutConfig,
      animate: shouldAnimate,
      animationDuration: shouldAnimate ? 800 : 0,
      animationEasing: 'ease-out',
      stop: () => {
        // Store positions after layout completes
        setTimeout(() => {
          storeNodePositions();
          layoutChangeInProgressRef.current = false;
        }, 100);
      }
    };

    try {
      // Stop any running layouts
      cy.stop();

      // Run the new layout (this is an explicit user action, so always apply)
      const layout = cy.layout(layoutOptions);
      layout.run();

      // Disable manual positioning mode when user explicitly changes layout
      console.log('Disabling manual positioning mode due to EXPLICIT USER layout change');
      disableManualPositioningMode('User changed layout');
      setUserHasDraggedNodes(false); // Layout is now in control of positions

      // Store layout preference in session storage
      sessionStorage.setItem('graph-layout-preference', newLayout);
    } catch (error) {
      console.error('Error applying layout:', error);
      layoutChangeInProgressRef.current = false;
      toast({
        title: "Layout change failed",
        description: "There was an error applying the new layout",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [animationEnabled, getLayoutConfig, storeNodePositions, toast, disableManualPositioningMode]);

  // Load layout preference on component mount
  useEffect(() => {
    const savedLayout = sessionStorage.getItem('graph-layout-preference');
    if (savedLayout && LAYOUT_OPTIONS.some(option => option.value === savedLayout)) {
      setSelectedLayout(savedLayout);
    } else {
      // If no saved preference, ensure we use breadthfirst as default
      setSelectedLayout('breadthfirst');
    }
  }, []);

  // Define layout configurations for render
  const layoutConfig = getLayoutConfig(selectedLayout);
  const staticLayoutConfig = {
    ...layoutConfig,
    animate: false,
    animationDuration: 0
  };

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
      <Box
        position="absolute"
        top="10px"
        right="10px"
        zIndex="1"
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
              _hover={{ borderColor: "brand.400" }}
              _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
            >
              {LAYOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </HStack>

          {/* Transition speed control */}
          <HStack spacing={2}>
            <Tooltip label="Animation Speed" placement="left">
              <IconButton
                aria-label="Transition speed"
                icon={<FaBolt />}
                size="sm"
                colorScheme="cyber"
                variant="ghost"
                opacity="0.8"
                _hover={{ opacity: 1 }}
              />
            </Tooltip>
            <Select
              size="sm"
              width="140px"
              value={transitionSpeed}
              onChange={(e) => changeTransitionSpeed(parseInt(e.target.value))}
              bg="white"
              borderColor="gray.300"
              _hover={{ borderColor: "cyber.400" }}
              _focus={{ borderColor: "cyber.500", boxShadow: "0 0 0 1px var(--chakra-colors-cyber-500)" }}
            >
              <option value="200">Fast (200ms)</option>
              <option value="500">Medium (500ms)</option>
              <option value="1000">Slow (1s)</option>
              <option value="2000">Very Slow (2s)</option>
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

          {/* Manual Positioning Mode Indicator and Reset */}
          {manualPositioningMode && (
            <HStack spacing={2}>
              <Tooltip label="Manual positioning mode is active. Layouts are disabled." placement="left">
                <IconButton
                  aria-label="Manual positioning active"
                  icon={<FaProjectDiagram />}
                  size="sm"
                  colorScheme="orange"
                  variant="solid"
                  opacity="0.9"
                />
              </Tooltip>
              <Tooltip label="Reset positioning and re-apply layout" placement="left">
                <IconButton
                  aria-label="Reset positioning mode"
                  icon={<FaBolt />}
                  size="sm"
                  colorScheme="blue"
                  variant="ghost"
                  opacity="0.8"
                  _hover={{ opacity: 1 }}
                  onClick={resetAndRelayout}
                />
              </Tooltip>
            </HStack>
          )}

          {/* Animation toggle button */}
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

      <CytoscapeComponent
        elements={normalizeElements(currentElements)}
        style={{ width: '100%', height: '100%' }}
        stylesheet={stylesheet}
        layout={staticLayoutConfig}
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

      {/* Enhanced Custom Tooltip with Improved Positioning */}
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

export default GraphVisualization;

