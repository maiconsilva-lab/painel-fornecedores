import { NextResponse } from 'next/server';
import { getServiceClient, comparePassword } from '../../../../lib/authServer';

export async function POST(req) {
  try {
    const { email, senha } = await req.json();
    if (!email || !senha) {
      return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
    }

    const supa = getServiceClient();
    const { data: user, error } = await supa
      .from('usuarios_painel')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user || !user.ativo) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
    }

    const ok = await comparePassword(senha, user.senha_hash);
    if (!ok) {
      return NextResponse.json({ error: 'E-mail ou senha inválidos.' }, { status: 401 });
    }

    const { senha_hash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: 'Erro inesperado ao entrar.' }, { status: 500 });
  }
}
