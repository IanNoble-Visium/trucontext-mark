# Dataset Upload Guide

## Overview

The TruContext platform allows you to upload structured datasets in JSON format to populate the Neo4j graph database. This guide explains how to prepare and upload your dataset.

## Dataset Format

Your dataset should be a JSON file with the following structure:

```json
{
  "nodes": [
    {
      "uid": "unique-id-1",
      "type": "NodeType",
      "showname": "Display Name",
      "properties": {
        "property1": "value1",
        "property2": "value2"
      },
      "icon": "optional/path/to/icon.png"
    },
    // More nodes...
  ],
  "edges": [
    {
      "from": "source-node-uid",
      "to": "target-node-uid",
      "type": "RELATIONSHIP_TYPE",
      "properties": {
        "property1": "value1",
        "property2": "value2"
      }
    },
    // More edges...
  ],
  "storedQueries": [
    {
      "query": "MATCH (n)-[r]->(m) RETURN n,r,m",
      "lang": "cypher",
      "description": "Retrieve all nodes and relationships"
    },
    // More queries...
  ]
}
```

### Node Structure

Each node must have:
- `uid`: A unique identifier (string)
- `type`: The type of node (e.g., "Server", "Application", "User")
- `showname`: A human-readable display name
- `properties`: An object containing additional properties
- `icon`: (Optional) Path or identifier for an icon

### Edge Structure

Each edge must have:
- `from`: The UID of the source node
- `to`: The UID of the target node
- `type`: The relationship type (e.g., "CONNECTS_TO", "OWNS")
- `properties`: An object containing additional properties

### Stored Queries

Each stored query has:
- `query`: The Cypher query string
- `lang`: The language (typically "cypher")
- `description`: A description of what the query does

## Sample Dataset

A sample dataset is available at `/sample-dataset.json` that you can download and use as a template.

## Uploading a Dataset

1. Navigate to the "Dataset Management" section of the dashboard
2. Click "Choose File" and select your JSON dataset file
3. Click "Upload to Neo4j" to upload and process the dataset
4. Wait for the confirmation message

## Important Notes

- Uploading a dataset will **replace all existing data** in the Neo4j database
- Ensure all `uid` values are unique across nodes
- The `properties` field must contain valid JSON objects
- Large datasets may require additional processing time
- The Neo4j database must have the APOC plugin installed for proper relationship creation

## Troubleshooting

If you encounter errors during upload:

1. Verify your JSON file is valid (use a JSON validator)
2. Check that all required fields are present
3. Ensure all node UIDs referenced in edges exist in the nodes array
4. Confirm your Neo4j database is properly configured with APOC

For further assistance, please contact the system administrator.
