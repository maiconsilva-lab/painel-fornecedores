/* Cliente anon legado.
   O painel principal não usa mais acesso direto do navegador às tabelas:
   as operações passam pelas rotas autenticadas em /api. Este módulo é
   mantido apenas como referência para protótipos desativados em /legacy. */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;
