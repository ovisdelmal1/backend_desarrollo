// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../config/api';

const ACCESS_TOKEN_KEY  = 'lote_access_token';
const REFRESH_TOKEN_KEY = 'lote_refresh_token';

// ─── Token storage ────────────────────────────────────────────

export async function getToken() {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setToken(accessToken, refreshToken) {
  if (accessToken) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
  }
  if (refreshToken !== undefined) {
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

// ─── Connectivity ─────────────────────────────────────────────

export async function checkConnection() {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable !== false;
}

// ─── Error class ──────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.status = status;
    this.code   = code;
    this.errors = errors;
  }
}

// ─── Token refresh (evita logout innecesario) ─────────────────

let isRefreshing = false;
let refreshQueue = [];

async function tryRefreshToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new ApiError('Sesión expirada', { code: 'SESSION_EXPIRED' });

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) throw new ApiError('Sesión expirada', { code: 'SESSION_EXPIRED' });

  await setToken(data.accessToken, data.refreshToken);
  return data.accessToken;
}

// ─── Core request ─────────────────────────────────────────────

export async function apiRequest(path, { method = 'GET', body, auth = false, isFormData = false } = {}) {
  const online = await checkConnection();
  if (!online) {
    throw new ApiError('Sin conexión a internet. Revisá tu red e intentá de nuevo.', {
      code: 'NO_CONNECTION',
    });
  }

  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    const requestUrl = `${API_BASE_URL}${path}`;
    console.debug('[apiRequest]', method, requestUrl, { auth, isFormData, body });
    
    // Timeout de 15 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    response = await fetch(requestUrl, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
  } catch (err) {
    console.error('[apiRequest] network error', err.message || err);
    throw new ApiError('No se pudo conectar con el servidor. Verificá que el backend esté activo.', {
      code: 'NETWORK_ERROR',
    });
  }

  // Si el token expiró, intentamos renovarlo automáticamente una vez
  if (response.status === 401 && auth) {
    const data = await response.json().catch(() => ({}));
    if (data?.code === 'TOKEN_EXPIRED') {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const newToken = await tryRefreshToken();
          isRefreshing = false;
          refreshQueue.forEach(cb => cb(newToken));
          refreshQueue = [];
          // Reintentar la request original con el nuevo token
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE_URL}${path}`, {
            method,
            headers,
            body: isFormData ? body : body ? JSON.stringify(body) : undefined,
          });
        } catch (err) {
          isRefreshing = false;
          refreshQueue.forEach(cb => cb(null));
          refreshQueue = [];
          await clearTokens();
          throw err;
        }
      } else {
        // Esperar a que termine el refresh en curso
        const newToken = await new Promise(resolve => refreshQueue.push(resolve));
        if (!newToken) throw new ApiError('Sesión expirada', { code: 'SESSION_EXPIRED' });
        headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(`${API_BASE_URL}${path}`, {
          method,
          headers,
          body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        });
      }
    }
  }

  let responseData = null;
  const text = await response.text();
  if (text) {
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = { error: text };
    }
  }

  if (!response.ok) {
    const message = responseData?.message || responseData?.error || 'Ocurrió un error inesperado';
    throw new ApiError(message, {
      status: response.status,
      code:   responseData?.code,
      errors: responseData?.errors,
    });
  }

  return responseData;
}