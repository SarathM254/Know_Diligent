import axios from 'axios';

// Create an Axios instance
const apiClient = axios.create({
  // Use the environment variable, or fallback to the local backend URL for development
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies/credentials are sent with requests if needed for auth
  withCredentials: true,
});

// Optional: Add a request interceptor to attach auth tokens in the future
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('session_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor to handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Handle unauthorized access (e.g., redirect to login, clear state)
      console.error('Unauthorized request. Redirecting or clearing session...');
      localStorage.removeItem('session_token');
      localStorage.removeItem('session_role');
      localStorage.removeItem('session_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
