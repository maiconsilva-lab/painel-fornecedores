/* Acesso às rotas autenticadas por cookie HttpOnly. actingUserId permanece
   nos argumentos para compatibilidade com chamadas existentes, mas não é
   mais usado como credencial. */
export async function listTable(
  _actingUserId,
  table,
  { orderCol = 'created_at', ascending = false, all = true, page = 1, pageSize = 25, status = '', q = '' } = {}
) {
  const params = new URLSearchParams({
    table,
    orderCol,
    ascending: String(ascending),
    all: String(all),
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) params.set('status', status);
  if (q) params.set('q', q);
  const res = await fetch(`/api/data/list?${params}`, { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) {
    let message = 'Falha ao carregar dados.';
    try { message = (await res.json()).error || message; } catch {}
    const error = new Error(message); error.status = res.status; throw error;
  }
  const json = await res.json();
  return all ? (json.rows || []) : json;
}

export async function mutateTable(_actingUserId, table, action, { id, data, returning } = {}) {
  const res = await fetch('/api/data', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action, id, data, returning }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Falha na operação.');
  return json;
}
