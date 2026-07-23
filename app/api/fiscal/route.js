import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../lib/authServer';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const user = await verifySession(req);
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'bootstrap';
    const supa = getServiceClient();

    if (mode === 'bootstrap') {
      const [filiaisRes, countsRes, cteRes, updateRes] = await Promise.all([
        supa.from('filiais').select('codigo, descricao').order('codigo'),
        supa.from('monitor_xml').select('descricao_filial, tipo_nota'),
        supa.from('monitor_xml').select('*').ilike('tipo_nota', '%CT%'),
        supa.from('monitor_xml').select('atualizado_em').order('atualizado_em', { ascending: false }).limit(1),
      ]);
      const error = filiaisRes.error || countsRes.error || cteRes.error || updateRes.error;
      if (error) return NextResponse.json({ error: 'Falha ao carregar pendências fiscais.' }, { status: 500 });
      return NextResponse.json({
        filiais: filiaisRes.data || [],
        monitorResumo: countsRes.data || [],
        ctes: cteRes.data || [],
        atualizadoEm: updateRes.data?.[0]?.atualizado_em || null,
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    if (mode === 'filial') {
      const codigo = url.searchParams.get('codigo')?.trim();
      const descricao = url.searchParams.get('descricao')?.trim();
      if (!codigo || !descricao) return NextResponse.json({ error: 'Filial inválida.' }, { status: 400 });
      const [nfeRes, preRes, updateRes] = await Promise.all([
        supa.from('monitor_xml').select('*').eq('descricao_filial', descricao).not('tipo_nota', 'ilike', '%CT%'),
        supa.from('pre_notas').select('*').eq('filial', codigo),
        supa.from('monitor_xml').select('atualizado_em').order('atualizado_em', { ascending: false }).limit(1),
      ]);
      const error = nfeRes.error || preRes.error || updateRes.error;
      if (error) return NextResponse.json({ error: 'Falha ao carregar dados da filial.' }, { status: 500 });
      return NextResponse.json({
        nfe: nfeRes.data || [],
        preNotas: preRes.data || [],
        atualizadoEm: updateRes.data?.[0]?.atualizado_em || null,
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 });
  } catch (error) {
    console.error('[fiscal]', error);
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 });
  }
}
