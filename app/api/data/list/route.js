import { NextResponse } from 'next/server';
import { getServiceClient, verifyActingUser } from '../../../../lib/authServer';

/* Tabelas do painel que exigem usuário autenticado pra ler — nada de
   'anon' direto. Mantém a mesma lista das rotas de mutação. */
const ALLOWED_TABLES = ['fornecedores', 'produtos', 'desbloqueios', 'kanban_tarefas'];

const PAGE_SIZE = 1000;

export async function GET(req) {
  const { searchParams } = req.nextUrl;
  const actingUserId = searchParams.get('actingUserId');
  const table = searchParams.get('table');
  const orderCol = searchParams.get('orderCol') || 'created_at';
  const ascending = searchParams.get('ascending') === 'true';

  const acting = await verifyActingUser(actingUserId);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json({ error: 'Tabela inválida.' }, { status: 400 });
  }

  const supa = getServiceClient();
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supa
      .from(table)
      .select('*')
      .order(orderCol, { ascending })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(`[data/list] ${table}:`, error);
      return NextResponse.json({ error: 'Falha ao buscar dados.' }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return NextResponse.json({ rows: all });
}
