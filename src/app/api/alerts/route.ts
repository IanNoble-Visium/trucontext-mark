import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j'; // Adjust path if needed

export async function GET() {
  let session;
  try {
    // TODO: Implement actual Neo4j connection and query for alerts
    // Example: Query for nodes labeled 'Alert' created recently
    // session = await getSession();
    // const result = await session.run(
    //   `MATCH (a:Alert)
    //    WHERE a.timestamp > datetime() - duration({days: 1})
    //    RETURN a.id as id, a.description as description, a.severity as severity, a.timestamp as timestamp
    //    ORDER BY a.timestamp DESC
    //    LIMIT 10`
    // );
    // const alerts = result.records.map(record => record.toObject());
    // await session.close();

    console.log("Fetching Alerts - returning mock data");

    // Mock Alert data
    const mockAlerts = [
      {
        id: 'alert-1',
        description: 'Potential malware propagation detected from host Server-01.',
        severity: 'High',
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 2).toISOString(), // Within last 2 hours
      },
      {
        id: 'alert-2',
        description: 'Unusual login activity detected for user admin@visium.com.',
        severity: 'Medium',
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 8).toISOString(), // Within last 8 hours
      },
      {
        id: 'alert-3',
        description: 'Data exfiltration pattern observed involving Asset-DB03.',
        severity: 'High',
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24).toISOString(), // Within last 24 hours
      },
      {
        id: 'alert-4',
        description: 'New vulnerability CVE-2024-XXXX found on Workstation-42.',
        severity: 'Low',
        timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 12).toISOString(), // Within last 12 hours
      },
    ];

    return NextResponse.json({ alerts: mockAlerts });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('Could not connect') || errorMessage.includes('ServiceUnavailable')) {
            errorMessage = 'Failed to connect to Neo4j database for alerts.';
        }
    }
    return NextResponse.json(
        { error: 'Failed to fetch alerts', details: errorMessage },
        { status: 500 }
    );
  } finally {
    // Ensure session is closed if it was opened
    // if (session) {
    //   await session.close();
    // }
  }
}

