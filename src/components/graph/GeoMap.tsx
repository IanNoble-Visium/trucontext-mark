import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

// Define the structure for a node with geographic coordinates
interface GraphNode {
  id: string;
  label?: string;
  latitude: number;
  longitude: number;
  icon: string;
  type?: string;
}

// Define the structure for a relationship between nodes
interface GraphRelationship {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

// Define regions for coordinate generation
type Region = 'global' | 'us' | 'eu' | 'africa' | 'asia';

// Create a fallback icon function that returns a div icon with the node type
const createFallbackIcon = (nodeType: string = 'unknown') => {
  const colors: Record<string, string> = {
    server: '#3182CE', // blue
    client: '#38A169', // green
    workstation: '#DD6B20', // orange
    router: '#D53F8C', // pink
    database: '#805AD5', // purple
    unknown: '#718096', // gray
  };
  
  const color = colors[nodeType.toLowerCase()] || colors.unknown;
  
  return new DivIcon({
    html: `<div style="
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
    ">${nodeType.charAt(0).toUpperCase()}</div>`,
    className: '',
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

const GeoMap: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [relationships, setRelationships] = useState<GraphRelationship[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodesWithoutCoords, setNodesWithoutCoords] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region>('global');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const mapRef = useRef<any>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState<boolean>(false);
  const [useIconFallbacks, setUseIconFallbacks] = useState<boolean>(false);
  const [showRelationships, setShowRelationships] = useState<boolean>(true);

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
        icon: getIconPath(randomType),
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
    setNodes(sampleNodes);
    setRelationships(sampleRelationships);
    onClose();
  };

  // Process nodes and apply coordinates based on selected region
  const processNodesWithRegion = () => {
    if (nodesWithoutCoords.length === 0) {
      // If there are no nodes without coordinates but also no nodes with coordinates,
      // generate sample nodes
      if (nodes.length === 0) {
        generateSampleNodes();
        return;
      }
      return;
    }

    const processedNodes = [...nodes];
    
    nodesWithoutCoords.forEach(n => {
      const coords = generateRegionalCoords(selectedRegion);
      const nodeType = n.data?.type || 'unknown';
      const icon = getIconPath(nodeType);
      
      processedNodes.push({ 
        id: String(n.data?.id), 
        label: n.data?.label || `Node ${n.data?.id}`,
        type: nodeType,
        icon, 
        ...coords 
      });
    });
    
    console.log(`Processed ${nodesWithoutCoords.length} nodes with missing coordinates using ${selectedRegion} region`);
    setNodes(processedNodes);
    setNodesWithoutCoords([]);
    onClose();
  };

  // Handle image loading errors
  useEffect(() => {
    // Check if any icon files are missing
    const checkIconAvailability = async () => {
      try {
        // Try to fetch the unknown.png icon as a test
        const response = await fetch('/icons/unknown.png');
        if (!response.ok) {
          console.warn('Icon files may be missing, using fallback icons');
          setUseIconFallbacks(true);
        }
      } catch (error) {
        console.warn('Error checking icon availability:', error);
        setUseIconFallbacks(true);
      }
    };

    checkIconAvailability();
  }, []);

  useEffect(() => {
    const fetchGeoData = async () => {
      setLoading(true);
      try {
        console.log('Fetching geo data from /api/geo-data');
        const response = await fetch('/api/geo-data');
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received geo data:', data);
        setHasAttemptedFetch(true);
        
        // Process the nodes to ensure they have coordinates
        const rawNodes = data.nodes || [];
        
        if (rawNodes.length === 0) {
          console.log('No nodes with geographic data found');
          setNodes([]);
          setLoading(false);
          // Open the dialog to generate sample nodes
          onOpen();
          return;
        }
        
        const nodesWithCoords: GraphNode[] = [];
        const nodesWithoutCoords: any[] = [];
        
        rawNodes.forEach((n: any) => {
          // Try to extract latitude and longitude from various property names
          const lat = parseFloat(n.data?.latitude ?? n.data?.lat);
          const lon = parseFloat(n.data?.longitude ?? n.data?.lon);
          // Get icon based on node type
          const nodeType = n.data?.type || 'unknown';
          const icon = getIconPath(nodeType);
          
          // If coordinates are missing or invalid, add to nodesWithoutCoords
          if (isNaN(lat) || isNaN(lon)) {
            console.log(`Node ${n.data?.id} missing coordinates, will prompt for region selection`);
            nodesWithoutCoords.push(n);
          } else {
            // Add nodes with valid coordinates directly
            nodesWithCoords.push({ 
              id: String(n.data?.id), 
              label: n.data?.label || `Node ${n.data?.id}`,
              type: nodeType,
              latitude: lat, 
              longitude: lon, 
              icon 
            });
          }
        });
        
        console.log(`Found ${nodesWithCoords.length} nodes with geographic data`);
        console.log(`Found ${nodesWithoutCoords.length} nodes without geographic data`);
        
        setNodes(nodesWithCoords);
        setNodesWithoutCoords(nodesWithoutCoords);
        
        // Process relationships if they exist in the data
        if (data.edges && Array.isArray(data.edges)) {
          const relationships: GraphRelationship[] = data.edges.map((edge: any) => ({
            id: String(edge.data?.id || `edge-${Math.random().toString(36).substr(2, 9)}`),
            source: String(edge.data?.source),
            target: String(edge.data?.target),
            type: edge.data?.type || 'default',
            label: edge.data?.label
          }));
          
          console.log(`Found ${relationships.length} relationships`);
          setRelationships(relationships);
        } else {
          console.log('No relationship data found');
          setRelationships([]);
        }
        
        // If there are nodes without coordinates, open the dialog
        if (nodesWithoutCoords.length > 0) {
          onOpen();
        }
      } catch (e: any) {
        console.error("Failed to fetch geo data:", e);
        setError(e.message || "An unknown error occurred");
        setHasAttemptedFetch(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [onOpen]);

  // Find a node by ID
  const findNodeById = (id: string): GraphNode | undefined => {
    return nodes.find(node => node.id === id);
  };

  // Create polylines for relationships
  const renderRelationships = () => {
    if (!showRelationships) return null;
    
    return relationships.map(rel => {
      const sourceNode = findNodeById(rel.source);
      const targetNode = findNodeById(rel.target);
      
      if (!sourceNode || !targetNode) return null;
      
      const positions = [
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
        >
          <Popup>
            <div>
              <strong>{rel.label || rel.type}</strong>
              <div>From: {sourceNode.label || sourceNode.id}</div>
              <div>To: {targetNode.label || targetNode.id}</div>
            </div>
          </Popup>
        </Polyline>
      );
    });
  };

  // If loading, show spinner
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Spinner size="xl" />
      </Box>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Alert status="error" variant="solid" borderRadius="md">
          <AlertIcon />
          Error loading map data: {error}
        </Alert>
      </Box>
    );
  }

  // If no nodes and no nodes without coordinates, show empty state with option to generate
  if (!nodes.length && hasAttemptedFetch) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="500px">
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
    <Box position="relative" height="500px" borderRadius="md" overflow="hidden">
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
          colorScheme={showRelationships ? "blue" : "gray"} 
          onClick={() => setShowRelationships(!showRelationships)}
          mb={2}
          width="100%"
        >
          {showRelationships ? "Hide Connections" : "Show Connections"}
        </Button>
        
        {nodesWithoutCoords.length > 0 && (
          <Button 
            size="sm" 
            colorScheme="orange" 
            onClick={onOpen}
            width="100%"
          >
            Place {nodesWithoutCoords.length} Nodes
          </Button>
        )}
      </Box>
      
      {/* Region Selection Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {nodesWithoutCoords.length > 0 
              ? `Place ${nodesWithoutCoords.length} Nodes Without Coordinates` 
              : "Generate Sample Nodes"}
          </ModalHeader>
          <ModalBody>
            <Text mb={4}>
              {nodesWithoutCoords.length > 0 
                ? `${nodesWithoutCoords.length} nodes in your dataset are missing geographic coordinates.` 
                : "No geographic data was found in your dataset."} 
              Please select a region where you'd like to place these nodes:
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
            <Button 
              colorScheme="blue" 
              mr={3} 
              onClick={nodesWithoutCoords.length > 0 ? processNodesWithRegion : generateSampleNodes}
            >
              {nodesWithoutCoords.length > 0 ? "Place Nodes" : "Generate Nodes"}
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* The Map */}
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: "100%", width: "100%" }}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          noWrap={true}
        />
        
        {/* Render relationship lines */}
        {renderRelationships()}
        
        {/* Render nodes as markers */}
        {nodes.map(node => {
          // Create icon for the node
          let icon;
          if (useIconFallbacks) {
            icon = createFallbackIcon(node.type);
          } else {
            try {
              icon = new Icon({
                iconUrl: node.icon,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16]
              });
            } catch (e) {
              console.warn(`Failed to create icon for node ${node.id}, using fallback`, e);
              icon = createFallbackIcon(node.type);
            }
          }
          
          return (
            <Marker 
              key={node.id} 
              position={[node.latitude, node.longitude]} 
              icon={icon}
            >
              <Popup>
                <div>
                  <strong>{node.label || node.id}</strong>
                  <div>Type: {node.type || 'Unknown'}</div>
                  <div>Location: {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </Box>
  );
};

export default GeoMap;
