import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: Request) {
  let session;
  try {
    // Parse query parameters for time range filtering
    const { searchParams } = new URL(request.url);
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    // Try to get data from Neo4j
    session = await getSession();

    // Build time filter clause if time parameters are provided
    let timeFilter = '';
    const params: any = {};

    if (startTime && endTime) {
      const startTimestamp = parseInt(startTime);
      const endTimestamp = parseInt(endTime);

      if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
        timeFilter = `AND (n.timestamp IS NULL OR (n.timestamp >= $startTime AND n.timestamp <= $endTime))`;
        params.startTime = startTimestamp;
        params.endTime = endTimestamp;
        console.log(`GeoData API: Filtering by time range: ${new Date(startTimestamp).toISOString()} - ${new Date(endTimestamp).toISOString()}`);
      }
    }

    // Query for nodes with geographic coordinates
    const nodeResult = await session.run(`
      MATCH (n)
      WHERE (n.latitude IS NOT NULL OR n.longitude IS NOT NULL OR n.lat IS NOT NULL OR n.lon IS NOT NULL)
      ${timeFilter}
      RETURN n
      LIMIT 100
    `, params);

    // Query for relationships between these nodes
    const relationshipTimeFilter = timeFilter.replace('n.timestamp', 'r.timestamp');
    const relationshipResult = await session.run(`
      MATCH (n)-[r]->(m)
      WHERE (n.latitude IS NOT NULL OR n.lat IS NOT NULL) AND (m.latitude IS NOT NULL OR m.lat IS NOT NULL)
      ${relationshipTimeFilter}
      RETURN r, id(startNode(r)) as source, id(endNode(r)) as target
      LIMIT 200
    `, params);

    // Process nodes
    const nodes = nodeResult.records.map(record => {
      const node = record.get('n');
      return {
        data: {
          id: node.identity.toString(),
          ...node.properties,
          // Ensure we have a type property
          type: node.properties.type || node.labels[0] || 'unknown'
        }
      };
    });

    // Process relationships
    const edges = relationshipResult.records.map(record => {
      const rel = record.get('r');
      const source = record.get('source').toString();
      const target = record.get('target').toString();

      return {
        data: {
          id: rel.identity.toString(),
          source: source,
          target: target,
          type: rel.type,
          ...rel.properties
        }
      };
    });

    // If no real data, return mock data
    if (nodes.length === 0) {
      console.log('No nodes with geographic data found in Neo4j, returning mock data');
      return NextResponse.json(generateMockGeoData());
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error('Error fetching geo data from Neo4j:', error);
    // Return mock data as fallback
    return NextResponse.json(generateMockGeoData());
  } finally {
    if (session) {
      await session.close();
    }
  }
}

// Generate mock geo data with relationships
function generateMockGeoData() {
  const nodeTypes = ['server', 'client', 'workstation', 'router', 'database'];
  const relationshipTypes = ['ConnectsTo', 'AccessedBy', 'Contains', 'Manages', 'ReportsTo'];

  // Generate nodes with coordinates
  const nodes = Array.from({ length: 10 }, (_, i) => {
    const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    // Generate coordinates in continental US for simplicity
    const lat = 37 + (Math.random() * 10 - 5);
    const lon = -100 + (Math.random() * 30 - 15);

    return {
      data: {
        id: `n${i}`,
        label: `Mock ${type} ${i+1}`,
        type: type,
        latitude: lat,
        longitude: lon
      }
    };
  });

  // Generate relationships between nodes
  const edges = [];
  for (let i = 0; i < 15; i++) {
    const sourceIndex = Math.floor(Math.random() * nodes.length);
    let targetIndex = Math.floor(Math.random() * nodes.length);

    // Ensure source and target are different
    while (targetIndex === sourceIndex) {
      targetIndex = Math.floor(Math.random() * nodes.length);
    }

    const relType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];

    edges.push({
      data: {
        id: `e${i}`,
        source: nodes[sourceIndex].data.id,
        target: nodes[targetIndex].data.id,
        type: relType,
        label: relType
      }
    });
  }

  return { nodes, edges };
}


