import axios from 'axios';

// The ONE axios instance the whole app uses. Every response is expected to be
// the shared envelope: { ok, data, meta } | { ok:false, error }.
//
// Access token lives in memory (module-level var), NOT localStorage — an XSS
// payload shouldn't be able to read it. It's set by lib/authContext.jsx after
// login/refresh and cleared on logout.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api';

let accessToken = null;
let onTokenRefreshed = null; // callback wired by authContext to update React state

export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}
export function setOnTokenRefreshed(fn) {
  onTokenRefreshed = fn;
}

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send the httpOnly refresh cookie
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Silent-refresh-and-retry on 401. Queues concurrent requests so a burst of
// 401s doesn't fire /auth/refresh multiple times in parallel.
let refreshPromise = null;

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = http.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const res = await refreshPromise;
        const newToken = res.data?.data?.accessToken;
        if (newToken) {
          setAccessToken(newToken);
          onTokenRefreshed?.(newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return http(original);
        }
      } catch {
        setAccessToken(null);
        onTokenRefreshed?.(null);
      }
    }
    return Promise.reject(error);
  }
);
