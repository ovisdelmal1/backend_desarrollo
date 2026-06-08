// src/services/loteApi.js
import { apiRequest, setToken, clearTokens, getRefreshToken } from './api';

// ─── AUTH ─────────────────────────────────────────────────────

/**
 * Login — guarda access + refresh token
 */
export async function login(email, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  await setToken(data.accessToken, data.refreshToken);
  return data; // { user, accessToken, refreshToken }
}

/**
 * Register — paso 2 del flujo
 * Crea la cuenta con email + password y luego envía los datos personales del paso 1
 * @param {object} payload - { email, password, nombre, apellido, tipo_documento, numero_documento }
 */
export async function register(payload) {
  const { email, password, nombre, apellido, tipo_documento, numero_documento } = payload;

  // 1. Crear cuenta (devuelve tokens)
  const authData = await apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password },
  });
  await setToken(authData.accessToken, authData.refreshToken);

  // 2. Enviar datos personales de identidad (KYC sin fotos — las fotos se suben en otra pantalla)
  try {
    const form = new FormData();
    form.append('first_name',     nombre    || '');
    form.append('last_name',      apellido  || '');
    form.append('legal_address',  '');          // Se puede completar después
    form.append('country',        'Argentina');

    await apiRequest('/users/me/kyc', {
      method:     'POST',
      auth:       true,
      body:       form,
      isFormData: true,
    });
  } catch {
    // Si falla el KYC no bloqueamos el registro — el usuario puede completarlo después
  }

  return authData; // { user, accessToken, refreshToken }
}

/**
 * Logout — limpia tokens local y revoca en el servidor
 */
export async function logout() {
  try {
    const refreshToken = await getRefreshToken();
    await apiRequest('/auth/logout', {
      method: 'POST',
      auth:   true,
      body:   { refreshToken },
    });
  } catch {
    // Si falla el server igual limpiamos local
  } finally {
    await clearTokens();
  }
}

export async function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

// ─── PERFIL ───────────────────────────────────────────────────

/**
 * Trae el perfil del usuario autenticado
 */
export async function getProfile() {
  const data = await apiRequest('/users/me', { auth: true });
  return data.user;
}

/**
 * Envía los datos KYC con fotos de DNI
 * @param {object} kycData - { first_name, last_name, legal_address, country, dniFront, dniBack }
 * dniFront / dniBack son objetos { uri, name, type } de ImagePicker
 */
export async function submitKyc({ first_name, last_name, legal_address, country, dniFront, dniBack }) {
  const form = new FormData();
  form.append('first_name',    first_name);
  form.append('last_name',     last_name);
  form.append('legal_address', legal_address);
  form.append('country',       country || 'Argentina');

  if (dniFront) {
    form.append('dni_front', {
      uri:  dniFront.uri,
      name: dniFront.name || 'dni_front.jpg',
      type: dniFront.type || 'image/jpeg',
    });
  }
  if (dniBack) {
    form.append('dni_back', {
      uri:  dniBack.uri,
      name: dniBack.name || 'dni_back.jpg',
      type: dniBack.type || 'image/jpeg',
    });
  }

  return apiRequest('/users/me/kyc', {
    method:     'POST',
    auth:       true,
    body:       form,
    isFormData: true,
  });
}

// ─── MEDIOS DE PAGO ───────────────────────────────────────────

/**
 * Lista medios de pago del usuario
 */
export async function fetchPaymentMethods() {
  const data = await apiRequest('/payment-methods', { auth: true });
  // Normalizar al formato que espera PaymentMethodsScreen
  return (data.payment_methods || []).map(pm => ({
    id:              pm.id,
    tipo:            pm.type === 'credit_card' ? 'Tarjeta de crédito' : 'Cuenta bancaria',
    titular:         pm.label || '',
    ultimos_digitos: pm.card_last4 || pm.account_number || '',
    currency:        pm.currency,
  }));
}

/**
 * Agrega un medio de pago
 * @param {object} payload - { tipo, titular, ultimos_digitos }
 * tipo: 'Tarjeta de crédito' | 'Cuenta bancaria' | 'Cheque certificado'
 */
export async function addPaymentMethod({ tipo, titular, ultimos_digitos }) {
  // Mapear del formato del frontend al del backend
  const isTarjeta = tipo === 'Tarjeta de crédito';
  return apiRequest('/payment-methods', {
    method: 'POST',
    auth:   true,
    body: {
      type:           isTarjeta ? 'credit_card' : 'bank_account',
      currency:       'ARS',
      card_brand:     isTarjeta ? titular : undefined,
      card_last4:     isTarjeta ? String(ultimos_digitos).slice(-4) : undefined,
      bank_name:      !isTarjeta ? titular : undefined,
      account_number: !isTarjeta ? ultimos_digitos : undefined,
    },
  });
}

/**
 * Elimina un medio de pago
 */
export async function removePaymentMethod(id) {
  return apiRequest(`/payment-methods/${id}`, {
    method: 'DELETE',
    auth:   true,
  });
}

// ─── SUBASTAS (placeholders para cuando el backend esté listo) ─

export async function fetchAuctions()         { return apiRequest('/auctions'); }
export async function fetchCategories()        { return apiRequest('/auctions/categories'); }
export async function fetchAuction(id)         { return apiRequest(`/auctions/${id}`); }
export async function placeBid(auctionId, monto) {
  return apiRequest(`/auctions/${auctionId}/bids`, { method: 'POST', auth: true, body: { monto } });
}
export async function fetchActivities()        { return apiRequest('/activities', { auth: true }); }
export async function fetchStats()             { return apiRequest('/activities/stats', { auth: true }); }
export async function fetchMyItems()           { return apiRequest('/items', { auth: true }); }
export async function createItem(payload)      {
  return apiRequest('/items', { method: 'POST', auth: true, body: payload });
}