import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

export async function POST(req) {
  const acting = await verifySession(req, ['admin']);
  if (!acting) return NextResponse.json({ error: 'Apenas administradores podem atualizar cotações.' }, { status: 403 });

  const body = await req.json();
  const fields = ['boi_gordo', 'boi_gordo_var', 'soja', 'soja_var', 'milho', 'milho_var', 'referencia_data'];
  const update = {};
  for (const f of fields) if (body[f] !== undefined) update[f] = body[f];
  update.atualizado_por = acting.nome;
  update.atualizado_em = new Date().toISOString();

  const supa = getServiceClient();
  const { error } = await supa.from('dashboard_commodities').update(update).eq('id', 1);

  if (error) return NextResponse.json({ error: 'Falha ao salvar cotações.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
