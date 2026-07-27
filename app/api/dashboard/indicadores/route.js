import { NextResponse } from 'next/server';
import { getServiceClient, verifySession } from '../../../../lib/authServer';

export const dynamic = 'force-dynamic';

/* Séries do Banco Central (SGS) — API oficial, gratuita, sem chave.
   https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json */
const SERIE = {
  ipcaMensal: 433,      // IPCA - variação % mensal
  ipca12m: 13522,       // IPCA - variação % acumulada em 12 meses
  cambioPtax: 1,        // Taxa de câmbio - dólar americano (venda), diária
  selicMeta: 432,       // Meta Selic definida pelo Copom
};

async function bcb(codigo, n) {
  try {
    const res = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${n}?formato=json`, {
      next: { revalidate: 3600 }, // cache de 1h — esses índices não mudam a cada minuto
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* Converte "31/12/2026" (formato do BCB) em Date */
const parseBcbDate = (s) => {
  const [d, m, y] = s.split('/');
  return new Date(`${y}-${m}-${d}`);
};

export async function GET(req) {
  const user = await verifySession(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const supa = getServiceClient();
  const [metaRes, commRes, ipcaMensal, ipca12m, cambio60, selic400] = await Promise.all([
    supa.from('dashboard_meta').select('*').eq('id', 1).single(),
    supa.from('dashboard_commodities').select('*').eq('id', 1).single(),
    bcb(SERIE.ipcaMensal, 2),
    bcb(SERIE.ipca12m, 1),
    bcb(SERIE.cambioPtax, 260),   // ~12 meses úteis, pra calcular variação
    bcb(SERIE.selicMeta, 400),    // histórico suficiente pra achar a vigência atual
  ]);

  // IPCA
  const ipca = {
    mensal: ipcaMensal?.at(-1)?.valor ? Number(ipcaMensal.at(-1).valor) : null,
    mensalData: ipcaMensal?.at(-1)?.data || null,
    acum12m: ipca12m?.[0]?.valor ? Number(ipca12m[0].valor) : null,
  };
  // Acumulado no ano corrente, calculado a partir dos valores mensais (série 433)
  let ipcaAnoAcumulado = null;
  const ipcaAno = await bcb(SERIE.ipcaMensal, 12);
  if (ipcaAno) {
    const anoAtual = new Date().getFullYear();
    const doAno = ipcaAno.filter(d => parseBcbDate(d.data).getFullYear() === anoAtual);
    if (doAno.length) {
      const fator = doAno.reduce((acc, d) => acc * (1 + Number(d.valor) / 100), 1);
      ipcaAnoAcumulado = Number(((fator - 1) * 100).toFixed(2));
    }
  }
  ipca.acumAno = ipcaAnoAcumulado;

  // Câmbio: valor atual + variação vs. ~12 meses atrás
  let cambio = { atual: null, dataAtual: null, var12m: null };
  if (cambio60?.length) {
    const atual = cambio60.at(-1);
    const anterior = cambio60[0];
    cambio.atual = Number(atual.valor);
    cambio.dataAtual = atual.data;
    if (anterior && Number(anterior.valor)) {
      cambio.var12m = Number((((Number(atual.valor) / Number(anterior.valor)) - 1) * 100).toFixed(2));
    }
  }

  // Selic: valor atual + desde quando está vigente (última mudança)
  let selic = { atual: null, vigenteDesde: null };
  if (selic400?.length) {
    const atual = selic400.at(-1);
    selic.atual = Number(atual.valor);
    let vigenteDesde = atual.data;
    for (let i = selic400.length - 2; i >= 0; i--) {
      if (Number(selic400[i].valor) === Number(atual.valor)) vigenteDesde = selic400[i].data;
      else break;
    }
    selic.vigenteDesde = vigenteDesde;
  }

  return NextResponse.json({
    meta: metaRes.data || null,
    commodities: commRes.data || null,
    ipca,
    cambio,
    selic,
    atualizadoEm: new Date().toISOString(),
  });
}
