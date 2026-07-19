// Thin API client. credentials:'include' sends the session cookie on every call.
async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const fetchJourney = () => request('/api/journey');
export const getMe = () => request('/api/auth/me');

export const signup = (payload) =>
  request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
export const login = (payload) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
export const logout = () => request('/api/auth/logout', { method: 'POST' });

export const completeMilestone = (key) =>
  request(`/api/journey/complete/${encodeURIComponent(key)}`, { method: 'POST' });

export const fetchModules = () => request('/api/modules');
export const completeModule = (key) =>
  request(`/api/modules/${encodeURIComponent(key)}/complete`, { method: 'POST' });

export const fetchCertificates = () => request('/api/certificates');
export const deleteCertificate = (id) =>
  request(`/api/certificates/${id}`, { method: 'DELETE' });

// Multipart upload — let the browser set the multipart boundary (no JSON header).
export async function uploadCertificate(formData) {
  const res = await fetch('/api/certificates', { method: 'POST', credentials: 'include', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
  return data;
}

export const certificateFileUrl = (id) => `/api/certificates/${id}/file`;

export const fetchResume = () => request('/api/resume');
export const saveResume = (resume) =>
  request('/api/resume', { method: 'PUT', body: JSON.stringify({ resume }) });

export const fetchRecommendations = () => request('/api/recommendations');

export const fetchProfile = () => request('/api/profile');
export const saveProfile = (profile) =>
  request('/api/profile', { method: 'PUT', body: JSON.stringify({ profile }) });
