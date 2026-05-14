// import { createContext, useState, useContext, useEffect } from 'react';
// import { apiGet } from '@/utils/api';

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [showAuthModal, setShowAuthModal] = useState(false);
//   const [authMode, setAuthMode] = useState('login'); // ✅ login | signup
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [user, setUser] = useState(null);
//   const [userRole, setUserRole] = useState('buyer'); // Initialize with default

//   // Fetch user profile data
//   const fetchUserProfile = async () => {
//     try {
//       const response = await apiGet('/users/get-personal-info/');

//       // API returns { success: true, data: { first_name, last_name, ... } }
//       // So we need response.data.data
//       const userData = response.data?.data || response.data;

//       if (userData) {
//         setUser(userData);
//         // Set user role from API response, default to 'buyer' if not provided
//         setUserRole(userData?.user_type || userData?.role || 'buyer');
//       }
//     } catch (error) {
//       console.error('Failed to fetch user profile:', error);
//       // If profile fetch fails, user might not be authenticated
//       if (error.response?.status === 401) {
//         logout();
//       }
//     }
//   };

//   useEffect(() => {
//     if (typeof window === 'undefined') return;

//     // Load persisted user role from localStorage
//     const persistedRole = localStorage.getItem('user_role');
//     if (persistedRole) {
//       setUserRole(persistedRole);
//     }

//     const accessToken = localStorage.getItem('access_token');
//     if (accessToken) {
//       setIsAuthenticated(true);
//       // Fetch user profile when token exists
//       fetchUserProfile();
//     }
//   }, []);

//   const login = (userData, accessToken, refreshToken) => {
//     localStorage.setItem('access_token', accessToken);
//     localStorage.setItem('refresh_token', refreshToken);
//     setUser(userData);
//     const role = userData?.user_type || userData?.role || 'buyer';
//     setUserRole(role);
//     localStorage.setItem('user_role', role);
//     setIsAuthenticated(true);
//     setShowAuthModal(false);
//   };

//   const logout = () => {
//     localStorage.removeItem('access_token');
//     localStorage.removeItem('refresh_token');
//     localStorage.removeItem('user_role');
//     setUser(null);
//     setUserRole('buyer');
//     setIsAuthenticated(false);
//   };

//   // ✅ open ONLY when user clicks Login
//   const openLogin = () => {
//     setAuthMode('login');
//     setShowAuthModal(true);
//   };

//   const openSignup = () => {
//     setAuthMode('signup');
//     setShowAuthModal(true);
//   };

//   const closeAuthModal = () => setShowAuthModal(false);

//   // Manual role switcher (temporary until API returns role)
//   const switchRole = (role) => {
//     setUserRole(role);
//     localStorage.setItem('user_role', role);
//   };

//   return (
//     <AuthContext.Provider
//       value={{
//         showAuthModal,
//         authMode,
//         isAuthenticated,
//         user,
//         userRole,     // 👈 expose user role
//         switchRole,   // 👈 expose role switcher
//         login,        // 👈 expose this
//         logout,
//         openLogin,
//         openSignup,
//         closeAuthModal,
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);
