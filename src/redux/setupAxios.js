import { refreshToken } from '../app/modules/Auth/_redux/authCrud';
import * as auth_actions from '../app/modules/Auth/_redux/authRedux';
import createAuthRefreshInterceptor from 'axios-auth-refresh';

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-tokens',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

let isRefreshing = false;
let refreshPromise = null;

export default function setupAxios(axios, store) {
  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
  axios.defaults.baseURL = BASE;

  // Check if access token expires within 5 minutes
  const isTokenExpiringSoon = (token) => {
    if (!token) return true;
    try {
      const { exp } = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return (exp * 1000 - Date.now()) < 5 * 60 * 1000;
    } catch {
      return true;
    }
  };

  const performTokenRefresh = async (currentRefreshToken) => {
    if (!currentRefreshToken) throw new Error('No refresh token');
    if (isRefreshing && refreshPromise) return refreshPromise;

    isRefreshing = true;
    refreshPromise = refreshToken(currentRefreshToken)
      .then((response) => {
        const { access, refresh } = response.data;
        if (!access || !refresh) throw new Error('Invalid token response');
        store.dispatch(auth_actions.actions.fulfillToken(access.token, refresh.token));
        return access.token;
      })
      .catch((err) => {
        store.dispatch(auth_actions.actions.logout());
        throw err;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });

    return refreshPromise;
  };

  // ── Request interceptor — attach token + proactive refresh ────────────────
  axios.interceptors.request.use(
    async (requestConfig) => {
      const state = store.getState();
      let { authToken } = state.auth;
      const { refreshToken: currentRefreshToken } = state.auth;

      const isExcluded = AUTH_ENDPOINTS.some(ep =>
        requestConfig.url?.includes(ep)
      );

      if (!isExcluded && authToken && isTokenExpiringSoon(authToken) && currentRefreshToken) {
        try {
          authToken = await performTokenRefresh(currentRefreshToken);
        } catch {
          throw new Error('Session expired');
        }
      }

      if (authToken) requestConfig.headers.Authorization = `Bearer ${authToken}`;
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // ── Reactive refresh on 401 ───────────────────────────────────────────────
  const refreshAuthLogic = async (failedRequest) => {
    const url = failedRequest.response?.config?.url || '';
    if (AUTH_ENDPOINTS.some(ep => url.includes(ep))) {
      return Promise.reject(failedRequest);
    }

    const { refreshToken: currentRefreshToken } = store.getState().auth;
    if (!currentRefreshToken) {
      store.dispatch(auth_actions.actions.logout());
      return Promise.reject(failedRequest);
    }

    try {
      const newToken = await performTokenRefresh(currentRefreshToken);
      failedRequest.response.config.headers.Authorization = `Bearer ${newToken}`;
      return Promise.resolve();
    } catch {
      return Promise.reject(failedRequest);
    }
  };

  createAuthRefreshInterceptor(axios, refreshAuthLogic, {
    statusCodes: [401],
    pauseInstanceWhileRefreshing: true,
  });

  // ── Response interceptor ──────────────────────────────────────────────────
  axios.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );
}
