import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

/* Cliente com a service_role key — NUNCA importar isso em um arquivo que
   roda no browser ('use client'). Só usar dentro de app/api/**\/route.js. */
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/* Gera uma senha temporária forte e legível o suficiente pra digitar */
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

/* Confirma que quem está pedindo uma ação administrativa (criar/editar/
   deletar usuário, resetar senha de terceiro) é um usuário ativo real do
   painel. Não é uma sessão JWT completa, mas fecha o buraco de "qualquer
   um sem login nenhum conseguia mexer na tabela direto pela API pública". */
export async function verifyActingUser(actingUserId) {
  if (!actingUserId) return null;
  const supa = getServiceClient();
  const { data, error } = await supa
    .from('usuarios_painel')
    .select('id, nome, email, ativo')
    .eq('id', actingUserId)
    .eq('ativo', true)
    .single();
  if (error || !data) return null;
  return data;
}
