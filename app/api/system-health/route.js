import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const acting = await verifySession(req, ['admin', 'subadmin']);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { data, error } = await supa.from('system_health').select('*');
  if (error) return NextResponse.json({ error: 'Falha ao consultar saúde do sistema.' }, { status: 500 });
  return NextResponse.json({ jobs: data });
}
