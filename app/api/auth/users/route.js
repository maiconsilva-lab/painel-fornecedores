import { NextResponse } from 'next/server';
import { getServiceClient, hashPassword, generateTempPassword, verifySession } from '../../../../lib/authServer';

export async function GET(req) {
  const acting = await verifySession(req);
  if (!acting) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const { data, error } = await supa
    .from('usuarios_painel')
    .select('id, nome, email, cargo, telefone, role, ativo, primeiro_login, created_at')
    .order('nome');

  if (error) return NextResponse.json({ error: 'Falha ao listar usuários.' }, { status: 500 });
  return NextResponse.json({ users: data });
}

export async function POST(req) {
  try {
    const acting = await verifySession(req, ['admin']);
    if (!acting) return NextResponse.json({ error: 'Apenas administradores podem criar usuários.' }, { status: 403 });

    const { nome, email, cargo = 'Analista', role = 'user', telefone = '' } = await req.json();
    if (!nome || !email) return NextResponse.json({ error: 'Informe nome e e-mail.' }, { status: 400 });
    if (!['user', 'subadmin', 'admin'].includes(role)) return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 });

    const tempPassword = generateTempPassword();
    const senha_hash = await hashPassword(tempPassword);
    const supa = getServiceClient();
    const { data, error } = await supa
      .from('usuarios_painel')
      .insert({ nome: nome.trim(), email: email.toLowerCase().trim(), cargo, telefone, role, senha_hash, ativo: true, primeiro_login: true })
      .select('id, nome, email, cargo, telefone, role, ativo')
      .single();

    if (error) return NextResponse.json({ error: 'Falha ao criar usuário (e-mail já existe?).' }, { status: 400 });
    return NextResponse.json({ user: data, tempPassword });
  } catch (err) {
    console.error('[users:create]', err);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
