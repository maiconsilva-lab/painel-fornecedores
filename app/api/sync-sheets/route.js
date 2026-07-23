import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/* ── Helpers ───────────────────────────────────── */

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === '/  /' || s === '0') return null;
  // DD/MM/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) {
    const d = br[1].padStart(2, '0');
    const m = br[2].padStart(2, '0');
    return `${br[3]}-${m}-${d}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
}

function parseNum(val) {
  if (!val) return null;
  let s = String(val).trim();
  // Remove "R$" e espaços
  s = s.replace(/R\$\s*/gi, '').trim();
  if (!s || s === '-' || s === '#NUM!') return null;
  // Formato BR: 1.234,56 → 1234.56
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseInt2(val) {
  if (!val) return null;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

function slaCat(sla) {
  if (sla === null || sla === undefined) return 'OK';
  if (sla > 10) return 'CRITICO';
  if (sla >= 6) return 'ATENCAO';
  return 'OK';
}

/* ── Handler ───────────────────────────────────── */

export async function GET(req) {
  // Vercel Cron envia automaticamente "Authorization: Bearer $CRON_SECRET"
  // quando a env var CRON_SECRET está definida no projeto.
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1) Google Sheets auth
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // 2) Supabase (service role pra poder escrever)
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    /* ═══ MONITOR XML ═══
       Aba: "Base Monitor XML"
       Colunas (pela planilha compartilhada):
       A=0:  (vazio/0)
       B=1:  CANCELADA ?
       C=2:  SLA
       D=3:  DESCRIÇÃO FILIAL
       E=4:  Filial
       F=5:  Status
       G=6:  Tipo Nota
       H=7:  Chave
       I=8:  Data
       J=9:  Documento
       K=10: Serie
       L=11: Fornecedor
       M=12: Loja
       N=13: Nome
       O=14: Produto XML
       P=15: Descricao XML
       Q=16: Produto Protheus
       R=17: Descricao Protheus
       S=18: Quantidade
       T=19: Valor Unitario
       U=20: Valor Total
       V=21: Pedido Compra
       W=22: Item
    */
    const monitorRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'Base Monitor XML'!A2:W",
    });

    const monitorRows = monitorRes.data.values || [];
    const monitorData = [];

    for (const r of monitorRows) {
      const descFilial = (r[3] || '').trim();
      const sla = parseInt2(r[2]);
      if (!descFilial) continue; // pula linhas sem filial

      monitorData.push({
        sla,
        descricao_filial: descFilial,
        filial: (r[4] || '').trim(),
        status: (r[5] || '').trim(),
        tipo_nota: (r[6] || '').trim(),
        chave: (r[7] || '').trim(),
        data_emissao: parseDate(r[8]),
        documento: (r[9] || '').trim(),
        serie: (r[10] || '').trim(),
        fornecedor: (r[11] || '').trim(),
        loja: (r[12] || '').trim(),
        nome_fornecedor: (r[13] || '').trim(),
        produto_xml: (r[14] || '').trim(),
        descricao_xml: (r[15] || '').trim(),
        produto_protheus: (r[16] || '').trim(),
        descricao_protheus: (r[17] || '').trim(),
        quantidade: parseNum(r[18]),
        valor_unitario: parseNum(r[19]),
        valor_total: parseNum(r[20]),
        sla_categoria: slaCat(sla),
      });
    }

    // Truncate + insert monitor_xml
    await supa.from('monitor_xml').delete().neq('id', 0);

    if (monitorData.length > 0) {
      for (let i = 0; i < monitorData.length; i += 500) {
        const batch = monitorData.slice(i, i + 500);
        const { error } = await supa.from('monitor_xml').insert(batch);
        if (error) throw new Error(`monitor_xml lote ${i}: ${error.message}`);
      }
    }

    /* ═══ PRÉ-NOTAS ═══
       Aba: "SF1 Pre-notas"
       Colunas (pela planilha — pula 2 linhas de cabeçalho duplicado):
       A=0:  Filial
       B=1:  Numero
       C=2:  Serie
       D=3:  Fornecedor
       E=4:  Loja
       F=5:  Nom.Forneced
       G=6:  Cond. Pagto
       H=7:  Num. Titulo
       I=8:  DT Emissao
       J=9:  Estado
       K=10: Vlr.Frete
       L=11: Vlr.Despesas
       M=12: Base p/ICMS
       N=13: Vlr.ICMS
       O=14: Base p/IPI
       P=15: Vlr.IPI
       Q=16: Vlr.Mercad
       R=17: Vlr.Bruto
       S=18: Tipo da Nota
       T=19: Descontos
       U=20: Dt.Digitacao
       ... (muitas outras colunas, pegamos só as principais)
    */
    const preNotasRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "'SF1 Pre-notas'!A3:U",  // pula 2 linhas de cabeçalho
    });

    const preNotasRows = preNotasRes.data.values || [];
    const preNotasData = [];

    for (const r of preNotasRows) {
      const filial = (r[0] || '').trim();
      const numero = (r[1] || '').trim();
      if (!filial || !numero) continue;

      preNotasData.push({
        filial,
        numero,
        serie: (r[2] || '').trim(),
        fornecedor: (r[3] || '').trim(),
        loja: (r[4] || '').trim(),
        nome_fornecedor: (r[5] || '').trim(),
        data_emissao: parseDate(r[8]),
        data_digitacao: parseDate(r[20]),
        estado: (r[9] || '').trim(),
        valor_mercadoria: parseNum(r[16]),
        valor_bruto: parseNum(r[17]),
        tipo_nota: (r[18] || '').trim(),
        status: null,
      });
    }

    // Truncate + insert pre_notas
    await supa.from('pre_notas').delete().neq('id', 0);

    if (preNotasData.length > 0) {
      for (let i = 0; i < preNotasData.length; i += 500) {
        const batch = preNotasData.slice(i, i + 500);
        const { error } = await supa.from('pre_notas').insert(batch);
        if (error) throw new Error(`pre_notas lote ${i}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      monitor_xml: monitorData.length,
      pre_notas: preNotasData.length,
    });

  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json(
      { error: err.message, detail: err.stack },
      { status: 500 }
    );
  }
}
