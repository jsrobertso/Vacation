import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// --- Configuration ---
// IMPORTANT: Replace with your actual backend API URL
// For local development with Expo Go on a physical device, this needs to be your computer's IP address on the local network.
// If using an emulator, 'http://localhost:PORT' or 'http://10.0.2.2:PORT' (for Android Studio Emulator) might work.
// The backend port is 5001 based on the previous subtask's assumptions.
const API_BASE_URL = 'http://localhost:5001/api'; // Adjust if your backend runs on a different port or host

const TOKEN_KEY = 'userAuthToken'; // Key for storing the token in SecureStore

// --- Token Management ---
const storeToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log('Token stored successfully');
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    console.log('Token removed successfully');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

// --- API Instance ---
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptor to add Auth Token ---
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- API Service Functions ---

// Authentication
const loginUser = async (email, password) => {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    // Assuming the backend sends back { token, user }
    if (response.data && response.data.token) {
      await storeToken(response.data.token);
      // Store user data (e.g., in context or a separate secure store item if needed)
      // For simplicity, we'll just return it here.
      // You might want to store user details in SecureStore or React Context as well.
      if (response.data.user) {
         await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
      }
      return { success: true, data: response.data };
    }
    return { success: false, error: 'Login failed, token not received.' };
  } catch (error) {
    console.error('Login API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Login request failed.' };
  }
};

const signupUser = async (userData) => {
  try {
    const response = await apiClient.post('/auth/signup', userData);
    // Assuming backend returns { message, user } on successful signup
    // Typically, signup might not auto-login, but if it does, handle token and user data
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Signup API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Signup request failed.' };
  }
};

const logoutUser = async () => {
  await removeToken();
  await SecureStore.deleteItemAsync('userData'); // Remove user data on logout
  // Add any other cleanup logic here
};

// Locations
const getLocations = async () => {
  try {
    const response = await apiClient.get('/locations');
    return { success: true, data: response.data.locations }; // Assuming backend returns { locations: [...] }
  } catch (error) {
    console.error('Get Locations API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to fetch locations.' };
  }
};

// Vacation Requests
const submitVacationRequest = async (requestData) => {
  // requestData should be like: { start_date, end_date, reason }
  try {
    const response = await apiClient.post('/vacation-requests', requestData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Submit Vacation Request API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to submit request.' };
  }
};

const getEmployeeRequests = async () => {
  try {
    const response = await apiClient.get('/vacation-requests/employee');
    return { success: true, data: response.data.requests }; // Assuming backend returns { requests: [...] }
  } catch (error) {
    console.error('Get Employee Requests API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to fetch employee requests.' };
  }
};

const getSupervisorRequests = async () => {
  try {
    const response = await apiClient.get('/vacation-requests/supervisor');
    return { success: true, data: response.data.requests }; // Assuming backend returns { requests: [...] }
  } catch (error) {
    console.error('Get Supervisor Requests API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to fetch supervisor requests.' };
  }
};

const approveVacationRequest = async (requestId, comments) => {
  try {
    const response = await apiClient.put(`/vacation-requests/${requestId}/approve`, { supervisor_comments: comments });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Approve Request API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to approve request.' };
  }
};

const rejectVacationRequest = async (requestId, comments) => {
  if (!comments || comments.trim() === '') {
    return { success: false, error: 'Supervisor comments are required for rejection.' };
  }
  try {
    const response = await apiClient.put(`/vacation-requests/${requestId}/reject`, { supervisor_comments: comments });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Reject Request API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || 'Failed to reject request.' };
  }
};

export {
  storeToken,
  getToken,
  removeToken,
  loginUser,
  signupUser,
  logoutUser,
  submitVacationRequest,
  getEmployeeRequests,
  getSupervisorRequests,
  approveVacationRequest,
  rejectVacationRequest,
  getLocations, // Exporting new function
  API_BASE_URL, // Exporting for potential use elsewhere, e.g. image URLs
};

// Helper to get stored user data
export const getStoredUser = async () => {
    try {
        const userDataString = await SecureStore.getItemAsync('userData');
        if (userDataString) {
            return JSON.parse(userDataString);
        }
        return null;
    } catch (error) {
        console.error('Error getting stored user data:', error);
        return null;
    }
};
