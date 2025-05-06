import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j'; // Assuming @ alias is configured or use relative path ../../lib/neo4j

// Define interfaces for better type safety (optional but recommended)
interface NodeData {
  id: string;
  label: string;
  // Add other properties based on your Neo4j node structure
  [key: string]: any;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  // Add other properties based on your Neo4j relationship structure
  [key: string]: any;
}

interface CytoscapeElement {
  data: NodeData | EdgeData;
  group: 'nodes' | 'edges';
}

export async function GET() {
  let session;
  try {
    session = await getSession();
    console.log('Neo4j session obtained for GET /api/graph-data');

    // Example Cypher query: Fetch first 100 nodes and their relationships
    // Adjust this query based on your actual graph model and needs
    const result = await session.run(
      `MATCH (n)
       WITH n LIMIT 100
       OPTIONAL MATCH (n)-[r]-(m)
       WHERE id(m) IN [id(n) | n IN collect(n)] // Ensure connected nodes are within the limit
       RETURN n, r, m`
    );

    console.log(`Query returned ${result.records.length} records.`);

    const nodes = new Map<string, CytoscapeElement>();
    const edges = new Map<string, CytoscapeElement>();

    result.records.forEach(record => {
      const nodeN = record.get('n');
      const rel = record.get('r');
      const nodeM = record.get('m');

      if (nodeN) {
        const nodeId = nodeN.identity.toString(); // Use Neo4j internal ID
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeN.labels[0] || 'Node', // Use first label or default
              ...nodeN.properties, // Spread node properties
            },
          });
        }
      }

      if (nodeM) {
        const nodeId = nodeM.identity.toString();
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeM.labels[0] || 'Node',
              ...nodeM.properties,
            },
          });
        }
      }

      if (rel) {
        const relId = rel.identity.toString();
        if (!edges.has(relId)) {
          edges.set(relId, {
            group: 'edges',
            data: {
              id: relId,
              source: rel.start.toString(),
              target: rel.end.toString(),
              label: rel.type, // Use relationship type as label
              ...rel.properties, // Spread relationship properties
            },
          });
        }
      }
    });

    const elements = [...nodes.values(), ...edges.values()];
    console.log(`Processed ${nodes.size} nodes and ${edges.size} edges.`);

    return NextResponse.json({ elements });

  } catch (error) {
    console.error('Error fetching graph data:', error);
    // Ensure error is logged properly
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
        // Check for specific Neo4j connection errors
        if (errorMessage.includes('Could not connect') || errorMessage.includes('ServiceUnavailable')) {
            errorMessage = 'Failed to connect to Neo4j database. Please check connection details and ensure the database is running.';
        }
    }
    return NextResponse.json(
        { error: 'Failed to fetch graph data', details: errorMessage },
        { status: 500 }
    );
  } finally {
    if (session) {
      await session.close();
      console.log('Neo4j session closed for GET /api/graph-data');
    }
  }
}

