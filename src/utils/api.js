import axios from 'axios';

//const API_BASE_URL = 'https://api-tradeclover.techsperia.in/api';
//local API
const API_BASE_URL = 'http://192.168.1.37:8000/api';
const REFRESH_TOKEN_URL = `${API_BASE_URL}/auth/refresh/`;

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_token');
    window.location.href = '/signin';
  }
};

/**
 * Common API request function with automatic token refresh
 * @param {string} url - API endpoint URL (can be relative or absolute)
 * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @param {object} data - Request payload (for POST, PUT, PATCH)
 * @param {object} config - Additional axios config (headers, params, etc.)
 * @param {boolean} isFormData - Whether the data is FormData (for file uploads)
 * @returns {Promise} - Axios response
 */
export const apiRequest = async (url, method = 'GET', data = null, config = {}, isFormData = false) => {
  try {
    // Get access token from localStorage (only on client side)
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    // Prepare headers
    const headers = {
      ...config.headers,
    };

    // Add Authorization header if access token exists
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Set Content-Type for non-FormData requests
    if (!isFormData && data) {
      headers['Content-Type'] = 'application/json';
    }

    // Prepare full URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    // Make the API request
    const response = await axios({
      url: fullUrl,
      method,
      data,
      ...config,
      headers,
    });

    return response;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      redirectToLogin();
      return;
    }

    // Handle 401 Unauthorized - Token expired
    if (error.response && error.response.status === 401) {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with new token
        const newAccessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const headers = {
          ...config.headers,
          'Authorization': `Bearer ${newAccessToken}`,
        };

        if (!isFormData && data) {
          headers['Content-Type'] = 'application/json';
        }

        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

        const retryResponse = await axios({
          url: fullUrl,
          method,
          data,
          ...config,
          headers,
        });

        return retryResponse;
      } else {
        redirectToLogin();
        return;
      }
    }

    // Re-throw other errors
    throw error;
    
  }
};

/**
 * Refresh the access token using refresh token
 * @returns {Promise<boolean>} - True if refresh successful, false otherwise
 */
const refreshAccessToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refresh_token');
    // const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc2NzM1NTYzOSwiaWF0IjoxNzY2NzUwODM5LCJqdGkiOiI3OWU4ZmEwZjdkNGM0MWQ2YjRjNDI5OThiZDdmMTU0MiIsInVzZXJfaWQiOjN9.fEV_p0KsKXk_06nlC3AXqaTvQy-Zm96CWXo3w3pLtjo';
    // const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc3NDk2MzQ5MiwiaWF0IjoxNzc0MzU4NjkyLCJqdGkiOiI4ZGUyNGQ4MTI0YjU0MmQ2ODg3ZDg3YTFmMGVmMWMwZSIsInVzZXJfaWQiOjI3fQ.HW6Kv6WFHxNMwKagYgnuKgCQYvMwucrFajHVkvsbupM'
    
    if (!refreshToken) {
      console.error('No refresh token found');
      return false;
      
    }

    const response = await axios.post(REFRESH_TOKEN_URL, {
      refresh: refreshToken,
    });

    if (response.data && response.data.access) {
      // Store new access token (only on client side) edit
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.data.access);
      }
      console.log('Access token refreshed successfully');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};

/**
 * Helper function for GET requests
 */
export const apiGet = (url, config = {}) => {
  return apiRequest(url, 'GET', null, config);
};

/**
 * Helper function for POST requests
 */
export const apiPost = (url, data, config = {}, isFormData = false) => {
  return apiRequest(url, 'POST', data, config, isFormData);
};

/**
 * Helper function for PUT requests
 */
export const apiPut = (url, data, config = {}, isFormData = false) => {
  return apiRequest(url, 'PUT', data, config, isFormData);
};

/**
 * Helper function for PATCH requests
 */
export const apiPatch = (url, data, config = {}, isFormData = false) => {
  return apiRequest(url, 'PATCH', data, config, isFormData);
};

/**
 * Helper function for DELETE requests
 */
export const apiDelete = (url, config = {}) => {
  return apiRequest(url, 'DELETE', null, config);
};
