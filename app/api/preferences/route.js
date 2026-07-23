import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

const ALLOWED_THEMES = new Set(['premix_claro', 'premix_escuro']);
const ALLOWED_DENSITIES = new Set(['compacto', 'normal', 'confortavel']);

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { data, error } = await supa
    .from('preferencias_usuario')
    .select('tema,densidade')
    .eq('user_email', user.email)
    .maybeSingle();

  if (error) {
    console.error('[preferences:get]', error);
    return NextResponse.json({ error: 'Falha ao carregar preferências.' }, { status: 500 });
  }
  return NextResponse.json({ preferences: data || null }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tema = ALLOWED_THEMES.has(body.tema) ? body.tema : 'premix_claro';
  const densidade = ALLOWED_DENSITIES.has(body.densidade) ? body.densidade : 'normal';
  const payload = {
    user_email: user.email,
    tema,
    densidade,
    cor_primaria: '#20558A',
    wallpaper: null,
    wallpaper_opacidade: 0,
  };

  const supa = getServiceClient();
  const { error } = await supa.from('preferencias_usuario').upsert(payload, { onConflict: 'user_email' });
  if (error) {
    console.error('[preferences:save]', error);
    return NextResponse.json({ error: 'Falha ao salvar preferências.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
