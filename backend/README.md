# Manikyapriya Agencies - Backend

This is the backend server for Manikyapriya Agencies, built using Node.js, Express, and Mongoose for MongoDB.

## What is Supported?

The backend is currently structured to support the following operations through RESTful API endpoints:

### 1. Database Connections
- Uses **MongoDB** (via Mongoose).
- Configured to connect to a local database (`mongodb://localhost:27017/diligent`) by default. This can be customized using the `MONGO_URI` environment variable.

### 2. Available API Routes
The backend exposes the following primary route groups under the `/api` prefix:

- **Bills (`/api/bills`)**: Endpoints to manage billing data (create, read, update, delete bills).
- **Payments (`/api/payments`)**: Endpoints to handle payment transactions and settlements.
- **Users (`/api/users`)**: Endpoints for user management, including roles such as Owner, Operator, and Salesman.
- **Brands (`/api/brands`)**: Endpoints for managing brand data.
- **Categories (`/api/categories`)**: Endpoints for managing product categories.

### 3. Data Models
The backend defines the following Mongoose schemas in the `src/models` directory:
- `AppSettings`: Configuration and application-wide settings.
- `Bill`: Structure for invoices and billing records.
- `Brand`: Information about different brands.
- `Category`: Categorization for inventory items.
- `LedgerTransaction`: Financial records for accounting and ledger management.
- `Payment`: Structure for tracking cash and other payment methods.
- `User`: Structure for storing user credentials, roles, and profiles.

### 4. Configuration and Environment
- Supports environment variables via `.env`.
- **CORS** is enabled for cross-origin requests from the frontend.
- Contains `vercel.json` for serverless deployment on Vercel.
- Structured with an MVC-like pattern (`models`, `controllers`, `routes`).

## Running the Backend

Ensure you have a MongoDB instance running locally or provide a valid connection string in the `.env` file.

```bash
# Install dependencies
npm install

# Start the development server (with nodemon)
npm run dev

# Start in production mode
npm start
```
The server will start on port `5000` (or the port specified in the `PORT` environment variable).
