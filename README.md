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
- **Timeline View:** Fully implemented interactive time slider for filtering the graph visualization by time range. Supports:
  - **Time Range Selection:** Dual-thumb slider for selecting start and end times of the visualization window
  - **Continuous Dragging:** Grab and drag the blue center area to move the entire time window across the timeline in a single, smooth operation
  - **Animation Controls:** Play/pause button to automatically animate the time window across the available data range
  - **Playback Speed:** Configurable playback speeds (1x, 2x, 4x) for controlling animation velocity
  - **Step Controls:** Forward/backward step buttons to incrementally move the time window
  - **Custom Date Selection:** Calendar-based date picker for precise time range selection
  - **Transition Speed:** Configurable transition speeds (200ms to 2000ms) that control how quickly the graph visualization updates
  - **Time Range Validation:** Robust validation that prevents selection of invalid or out-of-bounds time ranges
  - **Safe Date Handling:** Automatic detection and correction of system clock issues or future dates
  - **Visual Feedback:** Clear visual indicators of the selected time range with formatted timestamps
  - **Responsive Design:** Adapts to different screen sizes while maintaining usability

## Technical Implementation Details

### Timeline View / Time Range Filtering

The Timeline View is implemented as a sophisticated component that enables users to filter the graph visualization by time. Here's a detailed breakdown of its implementation:

#### Core Functionality

- **Time Range State Management:** The component maintains the current time range as a tuple of timestamps `[startTime, endTime]` and synchronizes this with the parent component through callback props.
- **Slider Implementation:** Built on Chakra UI's RangeSlider with custom overlays for enhanced dragging functionality.
- **Drag Mechanism:** 
  - Uses low-level DOM event listeners (mousemove, mouseup) with the capture phase to ensure uninterrupted drag operations
  - Maintains the original drag start position and time window duration throughout the entire drag operation
  - Calculates new positions based on mouse movement relative to the slider width
  - Prevents text selection during dragging with CSS
  - Provides visual feedback with cursor changes and styling
  - Properly cleans up event listeners when dragging ends or component unmounts

#### Animation System

- **Playback Engine:** Implements a configurable animation system that automatically moves the time window across the timeline
- **Interval-Based:** Uses `setInterval` with dynamic timing based on playback speed
- **Window Preservation:** Maintains the same time window duration throughout the animation
- **Boundary Handling:** Automatically stops at the end of the available data range
- **Speed Control:** Adjusts both the interval timing and the step size based on the selected playback speed

#### Time Range Validation

- **Bounds Checking:** Ensures the selected time range stays within the available data bounds (minTimestamp to maxTimestamp)
- **Future Date Protection:** Detects and corrects time ranges that include future dates or incorrect system clock values
- **Fallback Mechanism:** Uses safe default dates (2023-12-30 to 2023-12-31) when invalid dates are detected
- **Error Handling:** Provides user feedback through toast notifications for invalid selections

#### Communication with Graph Visualization

- **Debounced Updates:** Uses debounced callbacks to prevent excessive re-renders during rapid changes (like dragging)
- **Event-Based Communication:** Dispatches custom events for transition speed changes that the graph visualization listens for
- **Bidirectional Data Flow:** Receives min/max timestamp information from the graph visualization and provides filtered time ranges back
- **LocalStorage Backup:** Uses localStorage as a fallback communication method for transition speed

#### User Experience Enhancements

- **Custom Date Picker:** Provides a calendar-based interface for precise date selection
- **Formatted Timestamps:** Displays human-readable date/time information
- **Loading States:** Shows spinner and disables controls during data loading
- **Responsive Design:** Adapts to different screen sizes while maintaining functionality
- **Keyboard Accessibility:** Supports keyboard navigation for accessibility

This implementation ensures a smooth, responsive user experience while providing powerful time-based filtering capabilities for the graph visualization. The component is designed to be robust against edge cases like invalid dates, system clock issues, and boundary conditions.

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
NEO4J_URI=neo4j+s://your-neo4j-uri.databases.neo4j.io
NEO4J_USERNAME=your_username_here
NEO4J_PASSWORD=your-password
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

## Recent Updates

- **Timeline View:** Now fully implemented. Users can filter the graph by time range using an interactive slider, drag the time window, animate playback, and select custom date ranges. The slider clamps to the available dataset time range, preventing errors and out-of-bounds selection.
- **Robust Filtering:** The graph visualization now guarantees that only edges whose source and target nodes exist in the current node set are rendered, preventing Cytoscape errors during rapid slider movement or animation.
- **Improved Drag & Animation:** The Timeline View supports smooth, continuous dragging of the time window, with robust handling of mouse events and state. Playback speed and transition speed are user-configurable.
- **Error Handling:** Enhanced error handling and feedback for invalid time ranges, future/past date issues, and Neo4j connectivity problems.


