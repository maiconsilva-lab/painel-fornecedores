import { supabase } from './supabase';

/* Busca TODAS as linhas de uma tabela em páginas de 1000 (limite do Supabase por request),
   em vez de um .limit() fixo — corrige o bug de registros somindo após passar de 100. */
const FETCH_PAGE_SIZE = 1000;

export async function fetchAllRows(table, orderCol, ascending = false) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderCol, { ascending })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) { console.error(`[fetchAllRows] ${table}:`, error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return all;
}
