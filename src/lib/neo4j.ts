import neo4j from 'neo4j-driver';

// Placeholder for environment variables - these should be set in Vercel
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://your-neo4j-uri.databases.neo4j.io'; // Replace with default or leave empty
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'; // Replace with default or leave empty
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'your-password'; // Replace with default or leave empty

let driver: neo4j.Driver;

function getDriver() {
  if (!driver) {
    console.log(`Attempting to connect to Neo4j at ${NEO4J_URI}`);

    // Check if environment variables are properly set
    if (NEO4J_URI === 'neo4j+s://your-neo4j-uri.databases.neo4j.io') {
      console.warn('WARNING: Using default Neo4j URI. Please set NEO4J_URI environment variable.');
    }

    if (NEO4J_USERNAME === 'neo4j' && NEO4J_PASSWORD === 'your-password') {
      console.warn('WARNING: Using default Neo4j credentials. Please set NEO4J_USERNAME and NEO4J_PASSWORD environment variables.');
    }

    try {
      // Create driver with connection pool configuration for better performance
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 5000, // 5 seconds
          connectionTimeout: 20000, // 20 seconds
          logging: {
            level: 'info',
            logger: (level, message) => console.log(`[Neo4j ${level}] ${message}`)
          }
        }
      );

      // Verify connectivity during initialization
      driver.verifyConnectivity()
        .then(() => console.log('Neo4j Driver connected successfully'))
        .catch(error => {
          console.error('Neo4j Driver connection failed:', error);
          console.error('Please check your Neo4j connection details in environment variables.');
        });
    } catch (error) {
      console.error('Failed to create Neo4j driver:', error);
      // We'll let it proceed, but requests will fail
      // In production, you might want to implement retry logic here
    }
  }
  return driver;
}

export async function getSession() {
  const currentDriver = getDriver();
  if (!currentDriver) {
    throw new Error('Neo4j driver is not initialized.');
  }

  try {
    // Try to verify connectivity before creating a session
    await currentDriver.verifyConnectivity();

    // Use database name from environment variable if available
    const database = process.env.NEO4J_DATABASE || 'neo4j';
    return currentDriver.session({ database });
  } catch (error) {
    console.error('Failed to create Neo4j session:', error);
    throw new Error('Could not establish a valid Neo4j session. Please check your connection details.');
  }
}

// Optional: Close driver on application shutdown (important for resource management)
// This might be tricky in serverless environments like Vercel.
// Vercel might handle this, but good practice to include if possible.
// process.on('SIGTERM', async () => {
//   if (driver) {
//     await driver.close();
//     console.log('Neo4j Driver closed.');
//   }
// });

// Export the driver directly if needed elsewhere, though using getSession is preferred
// export { driver };

