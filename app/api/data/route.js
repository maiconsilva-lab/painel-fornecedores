import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

const ALLOWED_TABLES = ['fornecedores', 'produtos', 'desbloqueios', 'kanban_tarefas'];
const ALLOWED_ACTIONS = ['update', 'delete', 'insert'];

export async function POST(req) {
  try {
    const acting = await verifySession(req);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const { table, action, id, data, returning } = await req.json();
    if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Tabela inválida.' }, { status: 400 });
    if (!ALLOWED_ACTIONS.includes(action)) return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    if (action === 'delete' && !['admin', 'subadmin'].includes(acting.role)) {
      return NextResponse.json({ error: 'Seu perfil não permite excluir registros.' }, { status: 403 });
    }
    if (!data && action !== 'delete') return NextResponse.json({ error: 'Dados ausentes.' }, { status: 400 });

    const supa = getServiceClient();
    if (action === 'update') {
      if (!id) return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });
      let q = supa.from(table).update(data).eq('id', id);
      if (returning) {
        const { data: row, error } = await q.select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ row });
      }
      const { error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'Informe o id.' }, { status: 400 });
      const { error } = await supa.from(table).delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    let q = supa.from(table).insert(data);
    if (returning) {
      const { data: row, error } = await q.select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ row });
    }
    const { error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[data:mutate]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
