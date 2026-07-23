import { NextResponse } from 'next/server';
import { verifySession } from '../../../../lib/authServer';

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
  return NextResponse.json({ user });
}
