// src/config/api.js
import { Platform } from 'react-native';

// ⚠️  Cambiá esta IP por la IP local de tu PC (la que muestra ipconfig en Windows).
// Si usás un emulador Android y no podés conectar, cambiala a 10.0.2.2.
const LOCAL_IP = '192.168.1.11';

// Puerto donde corre el backend Express
const PORT = 3000;

export function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return `http://localhost:${PORT}`;
  }

  // En móviles nativos usamos la IP de la PC, no localhost.
  return `http://${LOCAL_IP}:${PORT}`;
}

export const API_BASE_URL = getApiBaseUrl();