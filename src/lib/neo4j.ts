import neo4j from 'neo4j-driver';

// Placeholder for environment variables - these should be set in Vercel
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j+s://your-neo4j-uri.databases.neo4j.io'; // Replace with default or leave empty
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j'; // Replace with default or leave empty
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'your-password'; // Replace with default or leave empty

let driver: neo4j.Driver;

function getDriver() {
  if (!driver) {
    console.log(`Attempting to connect to Neo4j at ${NEO4J_URI}`);
    try {
      driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
      // Verify connectivity during initialization (optional but recommended)
      driver.verifyConnectivity()
        .then(() => console.log('Neo4j Driver connected successfully'))
        .catch(error => console.error('Neo4j Driver connection failed:', error));
    } catch (error) {
      console.error('Failed to create Neo4j driver:', error);
      // Handle driver creation failure appropriately
      // For now, we'll let it proceed, but requests will fail
    }
  }
  return driver;
}

export async function getSession() {
  const currentDriver = getDriver();
  if (!currentDriver) {
    throw new Error('Neo4j driver is not initialized.');
  }
  // Consider session configuration options if needed (e.g., database selection)
  return currentDriver.session();
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

