import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

const ALLOWED_TABLES = ['fornecedores', 'produtos', 'desbloqueios', 'kanban_tarefas'];
const ALLOWED_ORDER_COLUMNS = new Set(['created_at', 'updated_at', 'ordem', 'status', 'data_finalizacao']);
const SEARCH_COLUMNS = {
  fornecedores: ['razao_social', 'nome_completo', 'nome_fantasia', 'cnpj', 'cpf', 'email', 'email_solicitante', 'atribuido_para', 'codigo_fornecedor'],
  produtos: ['descricao', 'ncm', 'codigo_protheus', 'nome_solicitante', 'email_solicitante', 'atribuido_para'],
  desbloqueios: ['nome_produto', 'descricao', 'codigo_produto', 'nome_solicitante', 'email_solicitante', 'atribuido_para'],
  kanban_tarefas: ['titulo', 'descricao', 'atribuido_para', 'prioridade'],
};
const BULK_PAGE_SIZE = 1000;
const MAX_PAGE_SIZE = 200;

function cleanSearch(value) {
  return String(value || '').trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 120);
}

function withFilters(query, table, status, search) {
  let q = query;
  if (status && status !== 'todos') q = q.eq('status', status);
  if (search) {
    const escaped = cleanSearch(search);
    if (escaped) q = q.or(SEARCH_COLUMNS[table].map(col => `${col}.ilike.%${escaped}%`).join(','));
  }
  return q;
}

export async function GET(req) {
  const acting = await verifySession(req);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const table = searchParams.get('table');
  const requestedOrder = searchParams.get('orderCol') || 'created_at';
  const orderCol = ALLOWED_ORDER_COLUMNS.has(requestedOrder) ? requestedOrder : 'created_at';
  const ascending = searchParams.get('ascending') === 'true';
  const status = searchParams.get('status') || '';
  const search = cleanSearch(searchParams.get('q'));
  const returnAll = searchParams.get('all') !== 'false';

  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Tabela inválida.' }, { status: 400 });

  const supa = getServiceClient();

  if (returnAll) {
    let allRows = [];
    let from = 0;
    while (true) {
      let query = supa.from(table).select('*');
      query = withFilters(query, table, status, search)
        .order(orderCol, { ascending })
        .range(from, from + BULK_PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) {
        console.error(`[data/list] ${table}:`, error);
        return NextResponse.json({ error: 'Falha ao buscar dados.' }, { status: 500 });
      }
      if (!data?.length) break;
      allRows = allRows.concat(data);
      if (data.length < BULK_PAGE_SIZE) break;
      from += BULK_PAGE_SIZE;
    }
    return NextResponse.json(
      { rows: allRows, total: allRows.length, page: 1, pageSize: allRows.length },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(10, Number.parseInt(searchParams.get('pageSize') || '25', 10) || 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supa.from(table).select('*', { count: 'exact' });
  query = withFilters(query, table, status, search)
    .order(orderCol, { ascending })
    .range(from, to);

  const { data, error, count } = await query;
  if (error) {
    console.error(`[data/list:paged] ${table}:`, error);
    return NextResponse.json({ error: 'Falha ao buscar dados.' }, { status: 500 });
  }

  return NextResponse.json(
    { rows: data || [], total: count || 0, page, pageSize },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
