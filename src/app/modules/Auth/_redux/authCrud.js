import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

export const login = (data) =>
  axios.post(`${BASE}/auth/login`, data);

export const refreshToken = (token) =>
  axios.post(`${BASE}/auth/refresh-tokens`, { refreshToken: token });

export const getUserByToken = () =>
  axios.get(`${BASE}/auth/profile`);

export const logout = (refreshToken) =>
  axios.post(`${BASE}/auth/logout`, { refreshToken });
