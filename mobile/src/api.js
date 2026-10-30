import { API_URL } from './config';

let token = null;
let onUnauthorized = null;

export const setToken = (t) => {
  token = t;
};
export const setOnUnauthorized = (fn) => {
  onUnauthorized = fn;
};

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(method, path, body, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    throw new ApiError(
      e.name === 'AbortError'
        ? 'El servidor tardó demasiado en responder. Intenta nuevamente.'
        : 'No se pudo conectar con el servidor. Revisa tu conexión a internet.'
    );
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!res.ok || (data && data.ok === false)) {
    if (res.status === 401 && token && onUnauthorized) onUnauthorized();
    throw new ApiError((data && data.error) || `Error del servidor (${res.status})`, res.status, data);
  }
  return data;
}

const qs = (params = {}) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
};

export const api = {
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  me: () => request('GET', '/api/me'),
  getCatalogo: () => request('GET', '/api/catalogo'),
  getInspecciones: (params) => request('GET', `/api/inspecciones${qs(params)}`),
  getInspeccion: (id) => request('GET', `/api/inspecciones/${id}`),
  iniciar: (id) => request('POST', `/api/inspecciones/${id}/iniciar`),
  completar: (id, payload) => request('POST', `/api/inspecciones/${id}/completar`, payload, 120000),
  getCamiones: () => request('GET', '/api/camiones'),
  getInspectores: () => request('GET', '/api/inspectores'),
  agendar: (payload) => request('POST', '/api/inspecciones', payload),
  cancelar: (id) => request('DELETE', `/api/inspecciones/${id}`),
};

// Las imágenes se cargan con el token en la URL (las <Image> no envían headers de forma confiable)
export const fotoUri = (id) => `${API_URL}/api/fotos/${id}?t=${encodeURIComponent(token || '')}`;
