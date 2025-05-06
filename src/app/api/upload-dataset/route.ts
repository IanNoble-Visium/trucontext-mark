import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import neo4j from 'neo4j-driver';

interface NodeData {
  uid: string;
  type: string;
  showname: string;
  properties: Record<string, any>;
  icon?: string;
}

interface EdgeData {
  from: string;
  to: string;
  type: string;
  properties: Record<string, any>;
}

interface Dataset {
  nodes: NodeData[];
  edges: EdgeData[];
  // storedQueries are ignored for now during upload
}

// Helper function to generate a random timestamp within the default time range
// This ensures uploaded data is visible in the default time slider range
const getRandomTimestampISO = () => {
  // Use fixed dates that match the default time range in the TimeSlider component
  // This ensures uploaded data is always visible in the default time range
  const endDate = new Date('2023-12-31T23:59:59.999Z');
  const startDate = new Date('2023-12-30T00:00:00.000Z');

  // Calculate the time range in milliseconds
  const timeRangeMillis = endDate.getTime() - startDate.getTime();

  // Generate a random offset within this range
  const randomOffset = Math.random() * timeRangeMillis;

  // Calculate the random timestamp
  const randomTimestampMillis = startDate.getTime() + randomOffset;

  // Convert to ISO string
  const timestamp = new Date(randomTimestampMillis).toISOString();

  console.log(`Generated timestamp within default range: ${timestamp}`);
  return timestamp;
};

export async function POST(request: Request) {
  let session;
  try {
    const dataset: Dataset = await request.json();

    // Basic validation
    if (!dataset || !Array.isArray(dataset.nodes) || !Array.isArray(dataset.edges)) {
      return NextResponse.json({ error: 'Invalid dataset format. Missing nodes or edges array.' }, { status: 400 });
    }

    session = await getSession();

    // --- Clear existing data --- (Consider making this optional)
    await session.run('MATCH (n) DETACH DELETE n');

    // --- Process and Create Nodes ---
    if (dataset.nodes.length > 0) {
      // Prepare nodes data for UNWIND, adding timestamps if missing
      const nodesToCreate = dataset.nodes.map(node => {
        const timestamp = node.properties?.timestamp || getRandomTimestampISO();
        return {
          uid: node.uid,
          type: node.type,
          showname: node.showname,
          icon: node.icon || null,
          properties: {
            ...node.properties,
            uid: node.uid,
            type: node.type,
            showname: node.showname,
            icon: node.icon || null,
            timestamp: timestamp // Ensure timestamp exists
          }
        };
      });

      try {
        // First try with APOC (preferred method for dynamic labels)
        const createNodesQueryWithApoc = `
          UNWIND $nodes AS nodeData
          MERGE (n {uid: nodeData.uid})
          CALL apoc.create.addLabels(n, [nodeData.type]) YIELD node
          SET node += nodeData.properties
          RETURN count(node) AS createdNodesCount
        `;
        await session.run(createNodesQueryWithApoc, { nodes: nodesToCreate });
      } catch (error) {
        console.warn("APOC not available for labels, falling back to generic Entity label", error);
        // Fallback if APOC is not available - use a generic Entity label
        const createNodesQueryFallback = `
          UNWIND $nodes AS nodeData
          MERGE (n:Entity {uid: nodeData.uid})
          SET n += nodeData.properties
          RETURN count(n) AS createdNodesCount
        `;
        await session.run(createNodesQueryFallback, { nodes: nodesToCreate });
      }
    }

    // --- Process and Create Edges ---
    if (dataset.edges.length > 0) {
       // Prepare edges data for UNWIND, adding timestamps if missing
      const edgesToCreate = dataset.edges.map(edge => {
        const timestamp = edge.properties?.timestamp || getRandomTimestampISO();
        return {
          fromUid: edge.from,
          toUid: edge.to,
          type: edge.type,
          properties: {
            ...edge.properties,
            timestamp: timestamp // Ensure timestamp exists
          }
        };
      });

      try {
        // First try with APOC (preferred method for dynamic relationship types)
        const createEdgesQueryWithApoc = `
          UNWIND $edges AS edgeData
          MATCH (fromNode {uid: edgeData.fromUid})
          MATCH (toNode {uid: edgeData.toUid})
          CALL apoc.create.relationship(fromNode, edgeData.type, edgeData.properties, toNode) YIELD rel
          RETURN count(rel) AS createdEdgesCount
        `;
        await session.run(createEdgesQueryWithApoc, { edges: edgesToCreate });
      } catch (error) {
        console.warn("APOC not available for relationships, falling back to generic RELATED_TO type", error);
        // Fallback if APOC is not available - use a generic RELATED_TO relationship type
        const createEdgesQueryFallback = `
          UNWIND $edges AS edgeData
          MATCH (fromNode {uid: edgeData.fromUid})
          MATCH (toNode {uid: edgeData.toUid})
          MERGE (fromNode)-[r:RELATED_TO]->(toNode)
          SET r += edgeData.properties,
              r.original_type = edgeData.type // Store the original type as a property
          RETURN count(r) AS createdEdgesCount
        `;
        await session.run(createEdgesQueryFallback, { edges: edgesToCreate });
      }
    }

    // Calculate the time range used for the timestamps
    const startDate = new Date('2023-12-30T00:00:00.000Z');
    const endDate = new Date('2023-12-31T23:59:59.999Z');

    return NextResponse.json({
      message: 'Dataset uploaded successfully with timestamps ensured.',
      details: {
        nodesCount: dataset.nodes.length,
        edgesCount: dataset.edges.length,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Dataset upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload dataset', details: error.message }, { status: 500 });
  } finally {
    if (session) {
      await session.close();
    }
  }
}

