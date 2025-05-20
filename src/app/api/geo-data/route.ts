import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET() {
  let session;
  try {
    // Try to get data from Neo4j
    session = await getSession();
    
    // Query for nodes with geographic coordinates
    const nodeResult = await session.run(`
      MATCH (n)
      WHERE EXISTS(n.latitude) OR EXISTS(n.longitude) OR EXISTS(n.lat) OR EXISTS(n.lon)
      RETURN n
      LIMIT 100
    `);
    
    // Query for relationships between these nodes
    const relationshipResult = await session.run(`
      MATCH (n)-[r]->(m)
      WHERE (EXISTS(n.latitude) OR EXISTS(n.lat)) AND (EXISTS(m.latitude) OR EXISTS(m.lat))
      RETURN r, id(startNode(r)) as source, id(endNode(r)) as target
      LIMIT 200
    `);
    
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

