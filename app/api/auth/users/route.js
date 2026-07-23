import { NextResponse } from 'next/server';
import { getServiceClient, hashPassword, generateTempPassword, verifyActingUser } from '../../../../lib/authServer';

export async function GET(req) {
  const actingUserId = req.nextUrl.searchParams.get('actingUserId');
  const acting = await verifyActingUser(actingUserId);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { data, error } = await supa
    .from('usuarios_painel')
    .select('id, nome, email, ativo, primeiro_login, created_at')
    .order('nome');

  if (error) return NextResponse.json({ error: 'Falha ao listar usuários.' }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req) {
  try {
    const { actingUserId, nome, email } = await req.json();
    const acting = await verifyActingUser(actingUserId);
    if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    if (!nome || !email) {
      return NextResponse.json({ error: 'Informe nome e e-mail.' }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const senha_hash = await hashPassword(tempPassword);

    const supa = getServiceClient();
    const { data, error } = await supa
      .from('usuarios_painel')
      .insert({
        nome,
        email: email.toLowerCase().trim(),
        senha_hash,
        ativo: true,
        primeiro_login: true,
      })
      .select('id, nome, email, ativo')
      .single();

    if (error) return NextResponse.json({ error: 'Falha ao criar usuário (e-mail já existe?).' }, { status: 400 });
    return NextResponse.json({ user: data, tempPassword });
  } catch (err) {
    console.error('[users:create]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
