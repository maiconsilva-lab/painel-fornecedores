/* Substitui o acesso direto do client a fornecedores/produtos/desbloqueios/
   kanban_tarefas via chave anon (removida do RLS) por chamadas autenticadas
   às API routes server-side, que usam a service_role key. */

export async function listTable(actingUserId, table, { orderCol = 'created_at', ascending = false } = {}) {
  const params = new URLSearchParams({ actingUserId, table, orderCol, ascending: String(ascending) });
  const res = await fetch(`/api/data/list?${params}`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.rows || [];
}

export async function mutateTable(actingUserId, table, action, { id, data, returning } = {}) {
  const res = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actingUserId, table, action, id, data, returning }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Falha na operação.');
  return json;
}
