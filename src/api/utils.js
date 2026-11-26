export const BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'https://localhost:8005'
).replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'access_token';

export const USERS_ENDPOINT = `${BASE_URL}/api/v1`;

export const DUMMY_CREDENTIALS = {
  username: 'dummy',
  password: '2Tn0z6gn-XG17FU4xv89P__9L7MQOveV',
};

export const DUMMY_LOGIN_ENDPOINT = `${BASE_URL}/api/v1/auth/dummy-login`;

export function setAccessToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new TypeError('Access token must be a non-empty string.');
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token.trim());
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function removeAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function buildUrl(endpoint, params) {
  // Keep authenticated requests on the configured backend.
  if (typeof endpoint !== 'string' || endpoint.startsWith('//')) {
    throw new TypeError('Use an API path or a full URL on the configured backend.');
  }

  const baseUrl = new URL(`${BASE_URL}/`);
  const url = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(endpoint)
      ? endpoint
      : `${BASE_URL}/${endpoint.replace(/^\/+/, '')}`
  );

  if (url.origin !== baseUrl.origin || !url.pathname.startsWith(baseUrl.pathname)) {
    throw new TypeError('API requests must use the configured backend URL.');
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => url.searchParams.append(key, String(item)));
    }
  });

  return url.toString();
}

/**
 * Options accept auth: false for public endpoints, headers, params, signal,
 * and other fetch options. JSON is the default body format; FormData is supported.
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    data,
    params,
    auth = true,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;
  const url = buildUrl(endpoint, params);
  const headers = { accept: 'application/json' };

  Object.entries(customHeaders).forEach(([key, value]) => {
    headers[key.toLowerCase()] = value;
  });

  const token = auth ? getAccessToken() : null;
  if (token && !headers.authorization) {
    headers.authorization = `Bearer ${token}`;
  }

  const isFormData = data instanceof FormData;
  let body;
  if (data !== undefined) {
    body = isFormData ? data : JSON.stringify(data);
    if (!isFormData && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }
  }

  const response = await fetch(url, {
    ...fetchOptions,
    method,
    headers,
    body,
  });

  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const text = await response.text();
  let result = text || null;
  if (text && response.headers.get('content-type')?.includes('json')) {
    try {
      result = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiError('The API returned invalid JSON.', response.status, text);
      }
    }
  }

  if (!response.ok) {
    const message = result?.message || result?.detail || result?.error;
    throw new ApiError(
      typeof message === 'string'
        ? message
        : `API request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ''}).`,
      response.status,
      result
    );
  }

  return result;
}

export function getApi(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' });
}

export function getByIdApi(endpoint, id, options = {}) {
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new TypeError('An ID is required.');
  }

  return getApi(
    `${endpoint.replace(/\/+$/, '')}/${encodeURIComponent(String(id))}`,
    options
  );
}

export function postApi(endpoint, data, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'POST', data });
}

export function updateApi(endpoint, data, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'PUT', data });
}
