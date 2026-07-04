# Agent Prompts: Diligent Analytics Tool End-to-End Implementation

This document contains a structured set of implementation prompts designed to guide another developer agent to build the **Diligent Analytics Tool** from scratch. 

---

## Stage 1: Project Initialization, Database Connection & Models Setup

**System prompt/instruction for the agent:**
> Set up a new standalone project workspace with a frontend folder (`frontend/`) using React Vite + TailwindCSS v4 and a backend folder (`backend/`) using Node.js, Express, and Mongoose. 
> 
> ### Backend Environment Setup
> Create a `.env` file in the backend folder containing:
> - `PORT=5001`
> - `PRIMARY_DB_URI` (Connection string to the transactional MongoDB database - read-only access)
> - `ANALYTICS_DB_URI` (Connection string to the dedicated analytics MongoDB database - read/write access)
> 
> ### Database Connection Setup
> Configure Mongoose to establish two separate database connections:
> 1. `primaryDbConn` - A read-only connection to the primary database using `PRIMARY_DB_URI`.
> 2. `analyticsDbConn` - A read-write connection to the analytics database using `ANALYTICS_DB_URI`.
> 
> ### Schemas and Models Configuration
> 1. **Primary Models (Read-Only Schema Bindings on `primaryDbConn`):**
>    - **User Model:** Has fields `name` (String), `email` (String), `role` (enum: "owner", "operator", "salesman"), `salesmanId` (String), `broughtForwardDebt` (Number).
>    - **Bill Model:** Has fields `salesmanId` (ObjectId), `billingDate` (String: YYYY-MM-DD), `items` (array of `brandId`, `brandName`, `quantity`, `rateSnapShot`), `totalBillValue` (Number), `status` (String), `isPushedToNextDay` (Boolean).
>    - **Payment Model:** Has fields `salesmanId` (ObjectId), `paymentDate` (String: YYYY-MM-DD), `cashBreakdown` (Map), `changeAmount` (Number), `phonePeAmount` (Number), `totalPayment` (Number), `status` (String).
> 
> 2. **Analytics Models (Read-Write Schema Bindings on `analyticsDbConn`):**
>    - **DailySummary Model:** Holds consolidated metrics for a given day:
>      - `operationalDate` (String, unique index)
>      - `totalBillsSubmitted` (Number)
>      - `totalBillValue` (Number)
>      - `totalCashCollected` (Number)
>      - `totalPhonePeCollected` (Number)
>      - `totalLooseChangeCollected` (Number)
>      - `billedStockVolume` (Number)
>      - `unbilledStockVolume` (Number)
>      - `isSealed` (Boolean, default: false)
>    - **SalesmanSnapshot Model:** Holds individual salesman performance snapshots:
>      - `operationalDate` (String)
>      - `salesmanId` (ObjectId)
>      - `salesmanName` (String)
>      - `salesmanCode` (String)
>      - `broughtForwardDebtSnap` (Number)
>      - `submittedBillValue` (Number)
>      - `submittedPaymentValue` (Number)
>    - Configure a compound index on `{ operationalDate: 1, salesmanId: 1 }` for the SalesmanSnapshot schema.

---

## Stage 2: Sync Engine (ETL Scheduler) & API Endpoints

**System prompt/instruction for the agent:**
> Build the background synchronization worker and API route handlers inside the backend.
> 
> ### Sync Engine Logic (ETL)
> Write a lightweight synchronization scheduler (using `node-cron` running every 2 minutes or triggered via an API route):
> 1. **Identify Target Dates:** Read the distinct dates from `Bills` and `Payments` collections in the primary database.
> 2. **Calculate Daily Aggregations:** For each date, run MongoDB aggregate pipelines on the primary database connection (`primaryDbConn`) to calculate total bill values, total cash collected (bills vs payments), digital PhonePe payments, and stock volume (sum of item quantities).
> 3. **Consolidate Salesman Stats:** Aggregate bills, payments, and name/code metrics for each salesman.
> 4. **Incremental Snapshot Saving:** For each calculated date, check if a snapshot exists in the analytics database:
>    - If no snapshot exists, create one.
>    - If a snapshot exists and `isSealed` is `false`, update the metrics with the latest calculations.
>    - If `isSealed` is `true`, **skip the write operation** (do not overwrite historical files). This protects against data deletions in the primary DB.
> 5. **Auto-Sealing Rule:** A date snapshot is automatically marked as `isSealed: true` if the primary system's active operational date is strictly greater than the snapshot date.
> 
> ### API Endpoints
> Expose the following REST endpoints on Express:
> - `GET /api/analytics/summary` - Returns daily summaries list (date range filtered) for trend charts.
> - `GET /api/analytics/salesmen?date=YYYY-MM-DD` - Returns all salesman snapshots for a specific date (to populate pie/donut splits).
> - `POST /api/analytics/sync` - Manually triggers the ETL cron synchronization.

---

## Stage 3: Premium Dark-Themed Dashboard & Animated Graphing UI

**System prompt/instruction for the agent:**
> Create a stunning, premium dark-themed analytics dashboard interface optimized for desktop viewports.
> 
> ### UI Layout & Styling Guidelines
> - **Theme:** Midnight palette. Base background: deep slate-black (`bg-neutral-950`). Card surfaces: semitransparent slate (`bg-neutral-900/60 backdrop-blur-md`). Accent borders: thin indigo glow (`border-indigo-500/20`).
> - **Typography:** Modern Sans-Serif font (e.g. Google Font *Outfit* or *Inter*). Large bold currency values and clear micro-data labels.
> 
> ### Animated Chart Visualizations (Recharts / Framer Motion)
> Implement three key charts using `recharts` (or a similar SVG charting library), configured with premium onload animations:
> 
> 1. **Point-to-Point Line Graph (Total Debt/Exposure Trajectory):**
>    - Renders a curved area/line chart showing historical total exposure over time.
>    - **Line Animation:** Dynamic stroke drawing effect (`isAnimationActive={true}` with an animation duration of `1500ms`).
>    - **Raining Gradient/Glow Effect:** Configure an SVG linear gradient (`<defs>`) under the line. The top represents glowing semi-transparent red/rose (`stopColor="#f43f5e" stopOpacity={0.4}`) fading to transparent (`stopOpacity={0}`) at the bottom, creating a glowing "raining" accent under the line.
> 
> 2. **Double-Bar Chart (Bill Value vs. Cash Collections):**
>    - Side-by-side vertical bar chart comparing daily bill values (indigo bar) vs. payments received (emerald bar).
>    - Bars must animate upwards on reload with a spring transition.
> 
> 3. **Donut Chart (Brought Forward Debt Split):**
>    - Shows current BF debt split among salesmen.
>    - Slice colors use variations of a single cohesive palette (e.g. violet, royal blue, lavender).
>    - Slice details animate outwards from the center on page entry.
> 
> ### Interactive Controls
> - Include a date range filter picker (Start Date to End Date) and a "Trigger Live Sync" button that calls the backend sync endpoint and reloads the charts with fresh data.
