import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Icon, DivIcon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet-icons.css';
import {
  Box,
  Spinner,
  Text,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  RadioGroup,
  Radio,
  Stack,
  useDisclosure
} from '@chakra-ui/react';
import { getIconPath } from '@/lib/iconUtils';
import { useTimeline } from '@/contexts/TimelineContext';

// Define the structure for a node with geographic coordinates
interface GraphNode {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  icon: string;
  type?: string;
  timestamp?: number | string; // Add timestamp for time-based filtering
}

// Define the structure for a relationship between nodes
interface GraphRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
  timestamp?: number | string; // Add timestamp for time-based filtering
}

// Define regions for coordinate generation
type Region = 'global' | 'us' | 'eu' | 'africa' | 'asia';

// Component to handle map resizing and centering
const MapController: React.FC<{ nodes: GraphNode[]; isActive?: boolean }> = ({ nodes, isActive }) => {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastNodeCount, setLastNodeCount] = useState(0);

  // Function to center map on nodes
  const centerMapOnNodes = useCallback(() => {
    console.log('MapController: Attempting to center map on nodes', nodes.length);
    if (nodes.length > 0) {
      const bounds = new LatLngBounds([]);
      nodes.forEach(node => {
        bounds.extend([node.latitude, node.longitude]);
      });

      if (bounds.isValid()) {
        console.log('MapController: Fitting bounds with padding');
        map.fitBounds(bounds, { padding: [20, 20] });
      } else {
        console.log('MapController: Bounds are not valid');
      }
    } else {
      console.log('MapController: No nodes to center on');
    }
  }, [map, nodes]);

  // Initial setup and node changes - only center when nodes actually change
  useEffect(() => {
    // Only center if nodes count changed significantly or first time
    if (!hasInitialized || Math.abs(nodes.length - lastNodeCount) > 0) {
      console.log('MapController: Initial setup or nodes changed');
      // Invalidate map size when component mounts or updates
      const timer = setTimeout(() => {
        console.log('MapController: Invalidating size and centering');
        map.invalidateSize();
        centerMapOnNodes();
        setHasInitialized(true);
        setLastNodeCount(nodes.length);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [map, nodes, hasInitialized, lastNodeCount, centerMapOnNodes]);

  // Handle window resize - only invalidate size, don't re-center
  useEffect(() => {
    const handleResize = () => {
      console.log('MapController: Window resized, invalidating size');
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  // Handle visibility changes (when browser tab becomes visible) - only if active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive && hasInitialized) {
        console.log('MapController: Browser tab became visible, re-centering');
        // When tab becomes visible, invalidate size and re-center
        setTimeout(() => {
          map.invalidateSize();
          centerMapOnNodes();
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [map, isActive, hasInitialized, centerMapOnNodes]);

  // Handle tab activation - only refresh once when tab becomes active for the first time
  useEffect(() => {
    if (isActive && !hasInitialized) {
      console.log('MapController: Tab became active for first time, initializing map');
      // Only initialize when the Geographic View tab becomes active for the first time
      setTimeout(() => {
        map.invalidateSize();
        centerMapOnNodes();
        setHasInitialized(true);
      }, 100);
    } else if (isActive && hasInitialized) {
      console.log('MapController: Tab became active, refreshing map size only');
      // Just refresh the map size, don't re-center
      setTimeout(() => {
        map.invalidateSize();
      }, 50);
    }
  }, [isActive, map, centerMapOnNodes, hasInitialized]);

  return null;
};

// Create a fallback icon function that returns a div icon with the node type
const createFallbackIcon = (nodeType: string = 'unknown') => {
  const normalizedType = nodeType.toLowerCase().trim();

  // Enhanced color mapping with more node types
  const colors: Record<string, string> = {
    server: '#3182CE', // blue
    client: '#38A169', // green
    workstation: '#DD6B20', // orange
    router: '#D53F8C', // pink
    database: '#805AD5', // purple
    user: '#D69E2E', // yellow
    threatactor: '#E53E3E', // red
    firewall: '#DD6B20', // orange
    switch: '#319795', // teal
    application: '#4299E1', // light blue
    sensor: '#48BB78', // light green
    plc: '#ED8936', // orange
    scada: '#9F7AEA', // purple
    device: '#4FD1C7', // cyan
    unknown: '#718096', // gray
  };

  const color = colors[normalizedType] || colors.unknown;
  const cssClass = `node-type-${normalizedType}`;

  return new DivIcon({
    html: `<div class="${cssClass}" style="
      background-color: ${color};
      color: white;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
      font-size: 12px;
    ">${nodeType.charAt(0).toUpperCase()}</div>`,
    className: 'leaflet-div-icon-fallback',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Get relationship color based on type
const getRelationshipColor = (relType: string): string => {
  const colors: Record<string, string> = {
    FriendsWith: '#2ecc71', // green
    EnemyOf: '#e74c3c',     // red
    BattledWith: '#f39c12',  // orange
    CommandsUnit: '#3498db', // blue
    LocatedOn: '#9b59b6',    // purple
    TrainedBy: '#1abc9c',    // teal
    RelativeTo: '#e67e22',   // dark orange
    default: '#95a5a6'       // gray
  };

  return colors[relType] || colors.default;
};

// Land-based coordinates for different regions
const landCoordinates = {
  us: [
    { lat: 37.7749, lng: -122.4194 }, // San Francisco
    { lat: 40.7128, lng: -74.0060 },  // New York
    { lat: 41.8781, lng: -87.6298 },  // Chicago
    { lat: 29.7604, lng: -95.3698 },  // Houston
    { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    { lat: 39.9526, lng: -75.1652 },  // Philadelphia
    { lat: 33.4484, lng: -112.0740 }, // Phoenix
    { lat: 32.7157, lng: -117.1611 }, // San Diego
    { lat: 47.6062, lng: -122.3321 }, // Seattle
    { lat: 39.7392, lng: -104.9903 }, // Denver
  ],
  eu: [
    { lat: 51.5074, lng: -0.1278 },   // London
    { lat: 48.8566, lng: 2.3522 },    // Paris
    { lat: 52.5200, lng: 13.4050 },   // Berlin
    { lat: 41.9028, lng: 12.4964 },   // Rome
    { lat: 40.4168, lng: -3.7038 },   // Madrid
    { lat: 52.3676, lng: 4.9041 },    // Amsterdam
    { lat: 55.6761, lng: 12.5683 },   // Copenhagen
    { lat: 59.3293, lng: 18.0686 },   // Stockholm
    { lat: 48.2082, lng: 16.3738 },   // Vienna
    { lat: 50.0755, lng: 14.4378 },   // Prague
  ],
  africa: [
    { lat: -33.9249, lng: 18.4241 },  // Cape Town
    { lat: 30.0444, lng: 31.2357 },   // Cairo
    { lat: 6.5244, lng: 3.3792 },     // Lagos
    { lat: -1.2921, lng: 36.8219 },   // Nairobi
    { lat: 33.9716, lng: -6.8498 },   // Rabat
    { lat: 14.6937, lng: -17.4441 },  // Dakar
    { lat: 5.5600, lng: -0.2057 },    // Accra
    { lat: 9.0765, lng: 7.3986 },     // Abuja
    { lat: 12.6392, lng: -8.0029 },   // Bamako
    { lat: -26.2041, lng: 28.0473 },  // Johannesburg
  ],
  asia: [
    { lat: 35.6762, lng: 139.6503 },  // Tokyo
    { lat: 22.3193, lng: 114.1694 },  // Hong Kong
    { lat: 31.2304, lng: 121.4737 },  // Shanghai
    { lat: 1.3521, lng: 103.8198 },   // Singapore
    { lat: 25.0330, lng: 121.5654 },  // Taipei
    { lat: 37.5665, lng: 126.9780 },  // Seoul
    { lat: 28.6139, lng: 77.2090 },   // New Delhi
    { lat: 13.7563, lng: 100.5018 },  // Bangkok
    { lat: 3.1390, lng: 101.6869 },   // Kuala Lumpur
    { lat: 14.5995, lng: 120.9842 },  // Manila
  ],
  global: [
    // North America
    { lat: 40.7128, lng: -74.0060 },  // New York
    { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    { lat: 51.2538, lng: -85.3232 },  // Ontario
    { lat: 19.4326, lng: -99.1332 },  // Mexico City

    // South America
    { lat: -23.5505, lng: -46.6333 }, // São Paulo
    { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
    { lat: -33.4489, lng: -70.6693 }, // Santiago

    // Europe
    { lat: 51.5074, lng: -0.1278 },   // London
    { lat: 48.8566, lng: 2.3522 },    // Paris
    { lat: 55.7558, lng: 37.6173 },   // Moscow

    // Asia
    { lat: 35.6762, lng: 139.6503 },  // Tokyo
    { lat: 39.9042, lng: 116.4074 },  // Beijing
    { lat: 28.6139, lng: 77.2090 },   // New Delhi

    // Africa
    { lat: -33.9249, lng: 18.4241 },  // Cape Town
    { lat: 30.0444, lng: 31.2357 },   // Cairo

    // Oceania
    { lat: -33.8688, lng: 151.2093 }, // Sydney
    { lat: -36.8485, lng: 174.7633 }, // Auckland
  ]
};

interface GeoMapProps {
  isActive?: boolean;
}

const GeoMap: React.FC<GeoMapProps> = ({ isActive = false }) => {
  // Get timeline context for time-based filtering
  const { startTime, endTime } = useTimeline();

  // Original data (unfiltered)
  const [allNodes, setAllNodes] = useState<GraphNode[]>([]);
  const [allRelationships, setAllRelationships] = useState<GraphRelationship[]>([]);

  // Filtered data (displayed on map)
  const [filteredNodes, setFilteredNodes] = useState<GraphNode[]>([]);
  const [filteredRelationships, setFilteredRelationships] = useState<GraphRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region>('global');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const mapRef = useRef<L.Map | null>(null);
  const [mapKey, setMapKey] = useState(0);

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

  // Enhanced helper function for intelligent tooltip positioning (consistent with GraphVisualization)
  const calculateTooltipPosition = useCallback((clientX: number, clientY: number) => {
    const offset = 15; // Distance from the cursor
    const tooltipWidth = 300; // Approximate tooltip width (matches maxWidth in tooltip component)
    const tooltipHeight = 80; // More accurate tooltip height accounting for title + content
    const margin = 10; // Margin from viewport edges
    const proximityThreshold = 15; // Keep tooltip within this distance of cursor

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Determine optimal horizontal positioning
    let x, y;
    let positionedLeft = false;

    // Check if there's enough space on the right side
    const spaceOnRight = viewportWidth - clientX - offset;
    const spaceOnLeft = clientX - offset;

    if (spaceOnRight >= tooltipWidth + margin) {
      // Position on the right (default)
      x = clientX + offset;
    } else if (spaceOnLeft >= tooltipWidth + margin) {
      // Position on the left
      x = clientX - tooltipWidth - offset;
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

    // Vertical positioning - center on cursor with boundary checks
    y = clientY - tooltipHeight / 2;

    // Enhanced vertical boundary detection
    if (y < margin) {
      y = margin; // Too close to top
    } else if (y + tooltipHeight + margin > viewportHeight) {
      y = viewportHeight - tooltipHeight - margin; // Too close to bottom
    }

    // Final proximity check - ensure tooltip stays close to cursor
    const distanceFromCursor = Math.abs(x - clientX);
    if (distanceFromCursor > tooltipWidth + proximityThreshold) {
      // If tooltip is too far, bring it closer while respecting boundaries
      if (positionedLeft) {
        x = Math.max(margin, clientX - tooltipWidth - proximityThreshold);
      } else {
        x = Math.min(viewportWidth - tooltipWidth - margin, clientX + proximityThreshold);
      }
    }

    // Absolute final safety clamp to ensure tooltip is always visible
    x = Math.max(margin, Math.min(x, viewportWidth - tooltipWidth - margin));
    y = Math.max(margin, Math.min(y, viewportHeight - tooltipHeight - margin));

    return { x, y };
  }, []);

  // Helper function to parse timestamp
  const parseTimestamp = (timestamp: number | string | undefined): number => {
    if (!timestamp) return 0;
    if (typeof timestamp === 'number') return timestamp;
    return new Date(timestamp).getTime();
  };

  // Filter nodes and relationships based on the time range
  useEffect(() => {
    // Only filter if we have data and valid time range
    if (allNodes.length === 0 || !startTime || !endTime || startTime >= endTime) {
      return;
    }

    // Filter nodes based on time range
    const timeFilteredNodes = allNodes.filter(node => {
      if (!node.timestamp) return true; // Include nodes without timestamp
      const nodeTime = parseTimestamp(node.timestamp);
      return nodeTime >= startTime && nodeTime <= endTime;
    });

    // Filter relationships based on time range
    const timeFilteredRelationships = allRelationships.filter(rel => {
      if (!rel.timestamp) return true; // Include relationships without timestamp
      const relTime = parseTimestamp(rel.timestamp);
      return relTime >= startTime && relTime <= endTime;
    });

    // Also filter relationships to only include those where both nodes are visible
    const visibleNodeIds = new Set(timeFilteredNodes.map(n => n.id));
    const finalFilteredRelationships = timeFilteredRelationships.filter(rel =>
      visibleNodeIds.has(rel.source) && visibleNodeIds.has(rel.target)
    );

    setFilteredNodes(timeFilteredNodes);
    setFilteredRelationships(finalFilteredRelationships);

    console.log(`GeoMap: Filtered to ${timeFilteredNodes.length} nodes and ${finalFilteredRelationships.length} relationships for time range ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
  }, [allNodes, allRelationships, startTime, endTime]);

  // Generate coordinates based on selected region using land-based coordinates
  const generateRegionalCoords = (region: Region) => {
    // Get the array of coordinates for the selected region
    const regionCoords = landCoordinates[region] || landCoordinates.global;

    // Select a random base coordinate from the region
    const baseCoord = regionCoords[Math.floor(Math.random() * regionCoords.length)];

    // Add a small random offset to avoid all nodes being in exactly the same place
    // The offset is smaller than before to keep nodes close to actual cities
    return {
      latitude: baseCoord.lat + (Math.random() * 2 - 1), // +/- 1 degree
      longitude: baseCoord.lng + (Math.random() * 2 - 1) // +/- 1 degree
    };
  };

  // Generate sample nodes when no geographic data is available
  const generateSampleNodes = () => {
    // Create 10 sample nodes with random coordinates in the selected region
    const sampleNodes: GraphNode[] = [];
    const sampleRelationships: GraphRelationship[] = [];
    const nodeTypes = ['server', 'client', 'workstation', 'router', 'database'];
    const relationshipTypes = ['ConnectsTo', 'AccessedBy', 'Contains', 'Manages', 'ReportsTo'];

    for (let i = 0; i < 10; i++) {
      const coords = generateRegionalCoords(selectedRegion);
      const randomType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];

      sampleNodes.push({
        id: `sample-${i}`,
        label: `Sample ${randomType} ${i+1}`,
        type: randomType,
        icon: getIconPath(randomType), // PNG format for Leaflet compatibility
        ...coords
      });
    }

    // Create some relationships between nodes
    for (let i = 0; i < 15; i++) {
      const sourceIndex = Math.floor(Math.random() * sampleNodes.length);
      let targetIndex = Math.floor(Math.random() * sampleNodes.length);

      // Ensure source and target are different
      while (targetIndex === sourceIndex) {
        targetIndex = Math.floor(Math.random() * sampleNodes.length);
      }

      const relType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];

      sampleRelationships.push({
        id: `rel-${i}`,
        source: sampleNodes[sourceIndex].id,
        target: sampleNodes[targetIndex].id,
        type: relType,
        label: relType
      });
    }

    console.log(`Generated ${sampleNodes.length} sample nodes in the ${selectedRegion} region`);
    console.log(`Generated ${sampleRelationships.length} sample relationships`);

    // Store in both all and filtered state
    setAllNodes(sampleNodes);
    setAllRelationships(sampleRelationships);
    setFilteredNodes(sampleNodes);
    setFilteredRelationships(sampleRelationships);
    onClose();
  };

  // Process nodes and apply coordinates based on selected region
  const processNodesWithRegion = () => {
    if (allNodes.length === 0) {
      // If there are no nodes without coordinates but also no nodes with coordinates,
      // generate sample nodes
      generateSampleNodes();
      return;
    }

    const processedNodes = [...allNodes];

    // Add coordinates to nodes without them
    processedNodes.forEach(node => {
      if (!node.latitude || !node.longitude) {
        const coords = generateRegionalCoords(selectedRegion);
        node.latitude = coords.latitude;
        node.longitude = coords.longitude;
      }
    });

    console.log(`Processed ${processedNodes.length} nodes with missing coordinates using ${selectedRegion} region`);
    setAllNodes(processedNodes);
    setFilteredNodes(processedNodes);
    onClose();
  };

  // Auto-refresh when tab becomes active - but only if we haven't loaded data yet
  useEffect(() => {
    if (isActive && allNodes.length === 0 && !isLoading && !error) {
      console.log('GeoMap: Tab became active and no data loaded, triggering refresh');
      // Only refresh if we don't have data yet
      const timer = setTimeout(() => {
        setMapKey(prev => prev + 1);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isActive, allNodes.length, isLoading, error]);

  // Fetch data from API - only once on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      // Prevent multiple simultaneous fetches
      if (isLoading) {
        console.log('GeoMap: Already loading, skipping fetch');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Use the same Neo4j dataset as the Graph Topology view
        console.log('GeoMap: fetching data from /api/graph-data');
        const response = await fetch('/api/graph-data?all=true');

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('GeoMap: received graph data:', data);

        // Check if component is still mounted
        if (!isMounted) return;

        const elements = Array.isArray(data.elements) ? data.elements : [];
        const nodesWithCoords: GraphNode[] = [];
        const nodeMap = new Map<string, GraphNode>();

        elements.forEach((el: any) => {
          if (el.group === 'nodes') {
            const lat = parseFloat(el.data?.latitude ?? el.data?.lat);
            const lon = parseFloat(el.data?.longitude ?? el.data?.lon);
            const nodeType = el.data?.type || 'unknown';
            const icon = getIconPath(nodeType);
            const timestamp = el.data?.timestamp;

            if (!isNaN(lat) && !isNaN(lon)) {
              const node: GraphNode = {
                id: String(el.data?.id),
                label: el.data?.label || `Node ${el.data?.id}`,
                type: nodeType,
                latitude: lat,
                longitude: lon,
                icon,
                timestamp,
              };
              nodesWithCoords.push(node);
              nodeMap.set(node.id, node);
            }
          }
        });

        if (nodesWithCoords.length === 0) {
          console.log('GeoMap: no nodes with geographic data found');
          if (isMounted) {
            setAllNodes([]);
            setFilteredNodes([]);
            setIsLoading(false);
            onOpen();
          }
          return;
        }

        const relationships: GraphRelationship[] = [];
        elements.forEach((el: any) => {
          if (el.group === 'edges') {
            const source = String(el.data?.source);
            const target = String(el.data?.target);
            if (nodeMap.has(source) && nodeMap.has(target)) {
              relationships.push({
                id: String(el.data?.id),
                source,
                target,
                type: el.data?.type || 'default',
                label: el.data?.label,
                timestamp: el.data?.timestamp,
              });
            }
          }
        });

        console.log(`GeoMap: found ${nodesWithCoords.length} nodes and ${relationships.length} relationships with coordinates`);

        if (isMounted) {
          setAllNodes(nodesWithCoords);
          setFilteredNodes(nodesWithCoords);
          setAllRelationships(relationships);
          setFilteredRelationships(relationships);
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error('GeoMap: failed to fetch graph data:', e);
        if (isMounted) {
          setError(e.message || 'An unknown error occurred');
          setIsLoading(false);
        }
      }
    };

    // Only fetch if we don't have data yet and we're not already loading
    if (allNodes.length === 0 && !error && !isLoading) {
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Find a node by ID
  const findNodeById = (id: string): GraphNode | undefined => {
    return filteredNodes.find(node => node.id === id);
  };

  // Create polylines for relationships
  const renderRelationships = () => {
    return filteredRelationships.map(rel => {
      const sourceNode = findNodeById(rel.source);
      const targetNode = findNodeById(rel.target);

      if (!sourceNode || !targetNode) return null;

      const positions: [number, number][] = [
        [sourceNode.latitude, sourceNode.longitude],
        [targetNode.latitude, targetNode.longitude]
      ];

      const color = getRelationshipColor(rel.type);

      return (
        <Polyline
          key={rel.id}
          positions={positions}
          pathOptions={{
            color: color,
            weight: 2,
            opacity: 0.7,
            dashArray: rel.type === 'default' ? '5, 5' : undefined
          }}
          eventHandlers={{
            mouseover: (e) => {
              const event = e.originalEvent as MouseEvent;
              const { x, y } = calculateTooltipPosition(event.clientX, event.clientY);
              setTooltip({
                visible: true,
                x,
                y,
                title: rel.label || rel.type,
                content: `From: ${sourceNode.label || sourceNode.id} | To: ${targetNode.label || targetNode.id}`
              });
            },
            mouseout: () => {
              setTooltip(prev => ({ ...prev, visible: false }));
            }
          }}
        />
      );
    });
  };

  // If loading, show spinner
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Spinner size="xl" />
      </Box>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <Alert status="error" variant="solid" borderRadius="md">
          <AlertIcon />
          Error loading map data: {error}
        </Alert>
      </Box>
    );
  }

  // If no nodes and no nodes without coordinates, show empty state with option to generate
  if (!filteredNodes.length && allNodes.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100%">
        <Alert status="info" variant="solid" borderRadius="md" mb={4}>
          <AlertIcon />
          No geographic data available. Try uploading a dataset with latitude/longitude coordinates.
        </Alert>
        <Button colorScheme="blue" onClick={onOpen} mt={4}>
          Generate Sample Nodes
        </Button>

        {/* Region Selection Modal */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Generate Sample Nodes</ModalHeader>
            <ModalBody>
              <Text mb={4}>
                No geographic data was found in your dataset. You can generate sample nodes to visualize on the map.
                Please select a region where you'd like to place these sample nodes:
              </Text>
              <RadioGroup onChange={(value) => setSelectedRegion(value as Region)} value={selectedRegion}>
                <Stack direction="column">
                  <Radio value="global">Global (Distributed worldwide)</Radio>
                  <Radio value="us">United States</Radio>
                  <Radio value="eu">Europe</Radio>
                  <Radio value="asia">Asia</Radio>
                  <Radio value="africa">Africa</Radio>
                </Stack>
              </RadioGroup>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="blue" mr={3} onClick={generateSampleNodes}>
                Generate Nodes
              </Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Box>
    );
  }

  return (
    <Box position="relative" height="100%" borderRadius="md" overflow="hidden">
      {/* Map Controls */}
      <Box
        position="absolute"
        top="10px"
        right="10px"
        zIndex="1000"
        bg="white"
        p={2}
        borderRadius="md"
        boxShadow="md"
      >
        <Button
          size="sm"
          colorScheme="blue"
          onClick={() => setMapKey(mapKey + 1)}
          mb={2}
          width="100%"
        >
          Refresh Map
        </Button>
      </Box>

      {/* The Map */}
      <MapContainer
        key={mapKey}
        center={[20, 0]}
        zoom={2}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        {/* Map Controller for resizing and centering */}
        <MapController nodes={filteredNodes} isActive={isActive} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          noWrap={true}
          maxZoom={19}
          minZoom={1}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        />

        {/* Render relationship lines */}
        {renderRelationships()}

        {/* Render nodes as markers */}
        {filteredNodes.map(node => {
          // Create icon for the node with enhanced error handling
          let icon;
          try {
            // Try to create the icon with the node's icon path
            icon = new Icon({
              iconUrl: node.icon,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
              popupAnchor: [0, -16],
              // Add error handling for missing images
              className: 'leaflet-marker-icon-with-fallback'
            });
          } catch (e) {
            console.warn(`Failed to create icon for node ${node.id} (type: ${node.type}), using fallback`, e);
            icon = createFallbackIcon(node.type);
          }

          return (
            <Marker
              key={node.id}
              position={[node.latitude, node.longitude]}
              icon={icon}
              // Add event handlers for icon loading errors and hover tooltips
              eventHandlers={{
                add: (e) => {
                  // Handle icon loading errors by replacing with fallback
                  const marker = e.target;
                  const iconElement = marker.getElement()?.querySelector('img');
                  if (iconElement) {
                    iconElement.onerror = () => {
                      console.warn(`Icon failed to load for node ${node.id}, switching to fallback`);
                      marker.setIcon(createFallbackIcon(node.type));
                    };
                  }
                },
                mouseover: (e) => {
                  const event = e.originalEvent as MouseEvent;
                  const { x, y } = calculateTooltipPosition(event.clientX, event.clientY);
                  const content = [
                    node.type && `Type: ${node.type}`,
                    `Lat: ${node.latitude.toFixed(4)}, Lon: ${node.longitude.toFixed(4)}`,
                    node.timestamp && `Time: ${new Date(parseTimestamp(node.timestamp)).toLocaleString()}`,
                    `Icon: ${node.icon.split('/').pop()}`
                  ].filter(Boolean).join(' | ');

                  setTooltip({
                    visible: true,
                    x,
                    y,
                    title: node.label || node.id,
                    content: content
                  });
                },
                mouseout: () => {
                  setTooltip(prev => ({ ...prev, visible: false }));
                }
              }}
            />
          );
        })}
      </MapContainer>

      {/* Enhanced Custom Tooltip with Improved Positioning (consistent with GraphVisualization) */}
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

      {/* Region Selection Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Generate Sample Nodes</ModalHeader>
          <ModalBody>
            <Text mb={4}>
              No geographic data was found in your dataset.
              Please select a region where you'd like to generate sample nodes:
            </Text>
            <RadioGroup onChange={(value) => setSelectedRegion(value as Region)} value={selectedRegion}>
              <Stack direction="column">
                <Radio value="global">Global (Distributed worldwide)</Radio>
                <Radio value="us">United States</Radio>
                <Radio value="eu">Europe</Radio>
                <Radio value="asia">Asia</Radio>
                <Radio value="africa">Africa</Radio>
              </Stack>
            </RadioGroup>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={generateSampleNodes}>
              Generate Nodes
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default GeoMap;
