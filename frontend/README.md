# Manikyapriya Agencies - Frontend

This is the frontend application for Manikyapriya Agencies, built using React, Vite, and Tailwind CSS. It provides role-based portals for Owners, Operators, and Salesmen.

## Requirements for Data Retrieval and Saving

To successfully link this frontend to the backend and ensure data saving and retrieval work properly, the following integration steps must be implemented:

### 1. Environment Configuration
The frontend needs to know where the backend API is hosted. You should create a `.env` file in the root of the `frontend` directory:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 2. API Service Layer
Currently, the frontend primarily contains static UI components with local state. To communicate with the backend, an API service layer needs to be established. 
- Create an `api/` directory or an `api.js` file inside `src/`.
- Implement API calls for fetching and saving data (GET, POST, PUT, DELETE) that correspond to the backend endpoints (Bills, Payments, Users, Brands, Categories) using `fetch` or `axios`.

### 3. State Management & Data Fetching
The application uses local component state. To manage data effectively across different components and pages:
- Consider integrating a library like **React Query** or **SWR** for data fetching. This will automatically handle caching, background updates, and loading/error states for backend data.
- Alternatively, use a state management solution (Context API, Redux, Zustand) combined with standard `useEffect` hooks for fetching data on component mount.

### 4. Authentication and Authorization Workflow
While there is a role selection UI (`App.jsx`), it currently relies on a simple local state switch.
- Implement login forms to authenticate against the backend's user routes.
- Securely store the authentication token (e.g., JWT) in `localStorage` or cookies.
- Pass this token in the `Authorization` header of all subsequent API requests.

### 5. CORS Handling
Ensure that the backend is configured to accept requests from the frontend's development server (e.g., `http://localhost:5173`). The backend currently uses the `cors` package, which is set up but may need specific origin configuration for production deployment.
