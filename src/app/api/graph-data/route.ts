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

    let result;
    try {
      // Try the more efficient query first
      result = await session.run(
        `MATCH (n)
         WITH collect(n) as nodes LIMIT 100
         UNWIND nodes as n
         OPTIONAL MATCH (n)-[r]-(m)
         WHERE m IN nodes // Ensure connected nodes are within the limit
         RETURN n, r, m`
      );
    } catch (queryError) {
      console.warn('Advanced query failed, falling back to simpler query:', queryError);

      try {
        // Fallback to a simpler query if the first one fails
        result = await session.run(
          `MATCH (n)
           WITH n LIMIT 50
           OPTIONAL MATCH (n)-[r]-(m)
           RETURN n, r, m`
        );
      } catch (fallbackError) {
        console.warn('Second query failed, falling back to simplest query:', fallbackError);

        // Final fallback - just get some nodes without relationships
        result = await session.run(
          `MATCH (n)
           RETURN n, null as r, null as m
           LIMIT 25`
        );
      }
    }

    console.log(`Query returned ${result.records.length} records.`);

    const nodes = new Map<string, CytoscapeElement>();
    const edges = new Map<string, CytoscapeElement>();

    result.records.forEach(record => {
      const nodeN = record.get('n');
      const rel = record.get('r');
      const nodeM = record.get('m');

      // Process the first node (n)
      if (nodeN) {
        const nodeId = nodeN.identity.toString(); // Use Neo4j internal ID
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeN.labels && nodeN.labels.length > 0 ? nodeN.labels[0] : 'Node', // Use first label or default
              ...nodeN.properties, // Spread node properties
            },
          });
        }
      }

      // Process the second node (m) if it exists
      if (nodeM && nodeM !== null) {
        const nodeId = nodeM.identity.toString();
        if (!nodes.has(nodeId)) {
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeM.labels && nodeM.labels.length > 0 ? nodeM.labels[0] : 'Node',
              ...nodeM.properties,
            },
          });
        }
      }

      // Process the relationship (r) if it exists
      if (rel && rel !== null) {
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

        // Check for Cypher syntax errors
        if (errorMessage.includes('Invalid input') || errorMessage.includes('expected')) {
            errorMessage = `Cypher syntax error: ${errorMessage}`;
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

