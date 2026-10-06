const API_BASE = '/api';

async function parseError(response) {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
}

export async function listDocuments(owner) {
  const response = await fetch(`${API_BASE}/documents`, {
    headers: { 'X-User-Id': owner },
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.json();
}

export async function uploadDocument(owner, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: formData,
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.json();
}

export async function downloadDocument(owner, document) {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(document.id)}/download`,
    { headers: { 'X-User-Id': owner } },
  );
  if (!response.ok) {
    throw await parseError(response);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  const link = window.document.createElement('a');
  link.href = objectUrl;
  link.download = document.originalName;
  link.click();
  URL.revokeObjectURL(objectUrl);
}