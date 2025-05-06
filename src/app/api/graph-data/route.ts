import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/neo4j'; // Assuming @ alias is configured or use relative path ../../lib/neo4j
import neo4j from 'neo4j-driver';

// Define interfaces for better type safety (optional but recommended)
interface NodeData {
  id: string;
  label: string;
  timestamp?: number; // Ensure timestamp is potentially available
  [key: string]: any;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  timestamp?: number; // Ensure timestamp is potentially available
  [key: string]: any;
}

interface CytoscapeElement {
  data: NodeData | EdgeData;
  group: 'nodes' | 'edges';
}

// Helper to convert Neo4j Integer to JS number if needed
function toNumber(value: any): number | null {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  // Handle ISO string timestamps if stored that way
  if (typeof value === 'string') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
          return date.getTime();
      }
  }
  return null; // Or handle appropriately
}

export async function GET(request: NextRequest) {
  let session;
  const { searchParams } = new URL(request.url);
  const getRange = searchParams.get('range') === 'true';
  const startTimeStr = searchParams.get('startTime');
  const endTimeStr = searchParams.get('endTime');

  try {
    session = await getSession();
    console.log('Neo4j session obtained for GET /api/graph-data');

    // --- Handle request for min/max time range ---
    if (getRange) {
      console.log('Fetching min/max timestamp range');
      const rangeResult = await session.run(
        `MATCH (n)
         WHERE n.timestamp IS NOT NULL
         WITH min(n.timestamp) as minNodeTs, max(n.timestamp) as maxNodeTs
         MATCH ()-[r]-()
         WHERE r.timestamp IS NOT NULL
         WITH minNodeTs, maxNodeTs, min(r.timestamp) as minEdgeTs, max(r.timestamp) as maxEdgeTs
         RETURN
           min([minNodeTs, minEdgeTs]) as minTimestamp,
           max([maxNodeTs, maxEdgeTs]) as maxTimestamp`
      );

      let minTimestamp: number | null = null;
      let maxTimestamp: number | null = null;

      if (rangeResult.records.length > 0) {
        const record = rangeResult.records[0];
        // Timestamps might be ISO strings or numbers depending on how they were stored
        const rawMin = record.get('minTimestamp');
        const rawMax = record.get('maxTimestamp');
        minTimestamp = typeof rawMin === 'string' ? new Date(rawMin).getTime() : toNumber(rawMin);
        maxTimestamp = typeof rawMax === 'string' ? new Date(rawMax).getTime() : toNumber(rawMax);
      }

      // Handle cases where timestamps might be null (e.g., empty DB)
      if (minTimestamp === null || maxTimestamp === null || isNaN(minTimestamp) || isNaN(maxTimestamp)) {
          console.log('No valid timestamps found, returning default range.');
          const now = Date.now();
          minTimestamp = now - 48 * 60 * 60 * 1000; // Default 48 hours ago
          maxTimestamp = now;
      }

      console.log(`Timestamp range: ${minTimestamp} - ${maxTimestamp}`);
      return NextResponse.json({ minTimestamp, maxTimestamp });
    }

    // --- Handle request for graph data within a time range (or all data) ---
    let startTime: number | null = startTimeStr ? parseInt(startTimeStr, 10) : null;
    let endTime: number | null = endTimeStr ? parseInt(endTimeStr, 10) : null;

    // Validate timestamps
    if ((startTime !== null && isNaN(startTime)) || (endTime !== null && isNaN(endTime)) || (startTime !== null && endTime !== null && startTime >= endTime)) {
        return NextResponse.json({ error: 'Invalid time range parameters' }, { status: 400 });
    }

    // Convert JS milliseconds timestamps to ISO strings for Cypher comparison if timestamps are stored as strings
    // Or use numerical comparison if timestamps are stored as numbers (e.g., epoch milliseconds)
    // Assuming timestamps are stored as ISO strings based on the upload logic
    const startTimeISO = startTime ? new Date(startTime).toISOString() : null;
    const endTimeISO = endTime ? new Date(endTime).toISOString() : null;

    console.log(`Fetching graph data with time range: ${startTimeISO} - ${endTimeISO}`);

    // Build query based on time range
    // This query fetches nodes and relationships created *within* the time range.
    // Adjust logic if you need elements existing *before* startTime but connected within the range.
    let query = '';
    const params: Record<string, any> = { limit: neo4j.int(100) }; // Ensure limit is passed as an integer

    // Check if the requested time range is in the future
    const now = new Date();
    if (startTimeISO && endTimeISO) {
      const startDate = new Date(startTimeISO);
      const endDate = new Date(endTimeISO);

      // If both dates are in the future, return empty result immediately
      if (startDate > now && endDate > now) {
        console.log('Requested time range is in the future, returning empty result');
        return NextResponse.json({ elements: [] });
      }

      // Adjust query to handle future dates - cap at current time
      const adjustedEndTimeISO = endDate > now ? now.toISOString() : endTimeISO;

      query = `
        MATCH (n)
        WHERE n.timestamp >= $startTime AND n.timestamp <= $endTime
        WITH collect(n) as nodesInTime
        UNWIND nodesInTime as n
        OPTIONAL MATCH (n)-[r]-(m)
        WHERE r.timestamp >= $startTime AND r.timestamp <= $endTime
          AND m in nodesInTime // Ensure connected node is also within time range
        RETURN n, r, m
        LIMIT $limit
      `;
      params.startTime = startTimeISO;
      params.endTime = adjustedEndTimeISO;

      console.log(`Querying time range: ${startTimeISO} - ${adjustedEndTimeISO}`);
    } else {
      // Default query if no time range specified (limited)
      query = `
        MATCH (n)
        WITH n LIMIT $limit
        OPTIONAL MATCH (n)-[r]-(m)
        RETURN n, r, m
      `;
    }

    const result = await session.run(query, params);
    console.log(`Query returned ${result.records.length} records.`);

    const nodes = new Map<string, CytoscapeElement>();
    const edges = new Map<string, CytoscapeElement>();

    result.records.forEach(record => {
      const nodeN = record.get('n');
      const rel = record.get('r');
      const nodeM = record.get('m');

      // Process node N
      if (nodeN) {
        const nodeId = nodeN.identity.toString();
        if (!nodes.has(nodeId)) {
          const nodeProps = { ...nodeN.properties };
          const timestamp = toNumber(nodeProps.timestamp); // Convert timestamp
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeProps.showname || (nodeN.labels && nodeN.labels.length > 0 ? nodeN.labels[0] : 'Node'),
              ...nodeProps,
              timestamp: timestamp ?? undefined, // Add processed timestamp
            },
          });
        }
      }

      // Process node M
      if (nodeM && nodeM !== null) {
        const nodeId = nodeM.identity.toString();
        if (!nodes.has(nodeId)) {
          const nodeProps = { ...nodeM.properties };
          const timestamp = toNumber(nodeProps.timestamp); // Convert timestamp
          nodes.set(nodeId, {
            group: 'nodes',
            data: {
              id: nodeId,
              label: nodeProps.showname || (nodeM.labels && nodeM.labels.length > 0 ? nodeM.labels[0] : 'Node'),
              ...nodeProps,
              timestamp: timestamp ?? undefined, // Add processed timestamp
            },
          });
        }
      }

      // Process relationship R
      if (rel && rel !== null) {
        const relId = rel.identity.toString();
        if (!edges.has(relId)) {
          const relProps = { ...rel.properties };
          const timestamp = toNumber(relProps.timestamp); // Convert timestamp
          edges.set(relId, {
            group: 'edges',
            data: {
              id: relId,
              source: rel.start.toString(),
              target: rel.end.toString(),
              label: rel.type,
              ...relProps,
              timestamp: timestamp ?? undefined, // Add processed timestamp
            },
          });
        }
      }
    });

    const elements = [...nodes.values(), ...edges.values()];
    console.log(`Processed ${nodes.size} nodes and ${edges.size} edges for Cytoscape.`);

    return NextResponse.json({ elements });

  } catch (error) {
    console.error('Error fetching graph data:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('Could not connect') || errorMessage.includes('ServiceUnavailable')) {
            errorMessage = 'Failed to connect to Neo4j database. Check connection details and DB status.';
        }
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

