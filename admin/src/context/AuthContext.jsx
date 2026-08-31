// P:\project\Symposium\admin\src\context\AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('admin');
    
    if (adminToken && adminData) {
      try {
        setAdmin(JSON.parse(adminData));
      } catch (e) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('admin');
      }
    }
    setLoading(false);
  }, []);

  const adminLogin = async (email, password) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/auth/admin/login`, {
        email,
        password
      });
      
      const { data } = response.data;
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('admin', JSON.stringify(data));
      setAdmin(data);
      setError(null);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Admin login failed');
      return { success: false, error: err.response?.data?.message };
    } finally {
      setLoading(false);
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdmin(null);
  };

  const value = {
    admin,
    loading,
    error,
    adminLogin,
    adminLogout,
    isAuthenticated: !!admin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;