# TruContext - Cyber Graph Dashboard

This is a Next.js application designed to visualize cyber threat intelligence data stored in a Neo4j graph database. It provides an interactive dashboard for executives and security analysts.

## Project Overview

- **Framework:** Next.js (using App Router)
- **UI Library:** Chakra UI
- **Graph Visualization:** Cytoscape.js (via `react-cytoscapejs`)
- **Database:** Neo4j (connected via `neo4j-driver`)
- **Deployment:** Intended for Vercel via GitHub integration.

## Features (Current State)

- **Executive Summary:** Displays key performance indicators (KPIs) related to cyber posture. (Currently uses mock data via `/api/kpis`)
- **Interactive Graph Visualization:** Renders a graph of nodes and relationships fetched from Neo4j. Supports panning, zooming, node clicking/hovering, and basic styling based on node type/risk. (Fetches data via `/api/graph-data` - requires Neo4j connection)
- **Automated Alerts:** Lists recent alerts generated based on graph patterns. (Currently uses mock data via `/api/alerts`)
- **Risk Prioritization:** Shows a table of assets/entities ranked by risk score. (Currently uses mock data via `/api/risk`)
- **Timeline View:** Placeholder for visualizing graph changes over time. (Not implemented)

## Project Structure

```
/home/ubuntu/trucontext-app
├── src/
│   ├── app/
│   │   ├── api/                # API Routes (Next.js Route Handlers)
│   │   │   ├── graph-data/     # Fetches nodes/edges for visualization
│   │   │   ├── kpis/           # Fetches Key Performance Indicators (mock)
│   │   │   ├── alerts/         # Fetches recent alerts (mock)
│   │   │   └── risk/           # Fetches risk-prioritized items (mock)
│   │   ├── layout.tsx        # Root layout (includes ChakraProvider)
│   │   ├── page.tsx          # Main dashboard page
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── dashboard/        # UI Components for dashboard sections
│   │   │   ├── KpiSummary.tsx
│   │   │   ├── AlertsList.tsx
│   │   │   └── RiskList.tsx
│   │   └── graph/            # Graph visualization component
│   │       └── GraphVisualization.tsx
│   ├── hooks/                # Custom React hooks (if any)
│   └── lib/                  # Utility functions, constants
│       └── neo4j.ts          # Neo4j driver setup and session management
├── public/                   # Static assets
├── package.json              # Project dependencies and scripts
├── pnpm-lock.yaml            # Lockfile for pnpm
├── tsconfig.json             # TypeScript configuration
└── next.config.mjs           # Next.js configuration
```

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- pnpm (package manager used in this project)
- Access to a Neo4j database (AuraDB, local instance, etc.)

### Installation

1.  Clone the repository (or extract the provided code archive).
2.  Navigate to the project directory:
    ```bash
    cd trucontext-app
    ```
3.  Install dependencies:
    ```bash
    pnpm install
    ```

### Environment Variables

Create a `.env.local` file in the root of the project directory and add your Neo4j connection details:

```
NEO4J_URI=neo4j+s://589b8857.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=-QpnjSMtvbvkNYf4dpJcOLqc-J41Rn22ggBDSSp5tUD4
```

Replace the placeholder values with your actual Neo4j AuraDB URI, username, and password.

**Important:** For Vercel deployment, these variables must be configured in the Vercel project's Environment Variables settings.

### Running Locally

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- The graph visualization will attempt to connect to the Neo4j database specified in your `.env.local` file and fetch data via the `/api/graph-data` route.
- The KPI, Alerts, and Risk sections currently use mock data provided by their respective API routes.

### Building for Production

```bash
pnpm build
```

This command builds the application for production usage.

## Deployment to Vercel

This application is designed for seamless deployment via Vercel's GitHub integration:

1.  **Push Code to GitHub:** Ensure the code is pushed to your GitHub repository (`https://github.com/IanNoble-Visium/trucontext-mark`).
2.  **Import Project in Vercel:** Connect your GitHub account to Vercel and import the `trucontext-mark` repository.
3.  **Configure Project:**
    *   Vercel should automatically detect it as a Next.js project.
    *   **Framework Preset:** Next.js
    *   **Build Command:** `pnpm build` (or Vercel might default correctly)
    *   **Install Command:** `pnpm install`
    *   **Environment Variables:** Add `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` in the Vercel project settings.
4.  **Deploy:** Vercel will build and deploy the application. Subsequent pushes to the main branch will trigger automatic redeployments.

## Notes & Next Steps

- **Mock Data & Demo Readiness:** The KPI, Alerts, and Risk sections currently rely on **mock data** generated in their respective API routes (`/api/kpis`, `/api/alerts`, `/api/risk`). For the demo and production use, these routes **must be updated** with actual Cypher queries to fetch live data from your Neo4j database based on your specific graph schema and logic. The risk scoring logic, in particular, should be implemented (either using heuristics or Neo4j GDS) as described in the requirements.
- **Graph Query:** The `/api/graph-data` route uses a basic query (`MATCH (n) WITH n LIMIT 100 ...`). This should be refined based on your specific graph model and the data you want to visualize initially.
- **Timeline Feature:** The timeline visualization is not implemented.
- **Styling & UX:** Further refinements to styling, graph interactions (e.g., drill-downs, context menus), and overall user experience can be made.
- **Error Handling:** Enhance error handling, especially around Neo4j connectivity and query execution.
- **Authentication:** No authentication layer is currently implemented, as per the initial requirements.

