'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════ */
const C = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHover: '#F7F8FA',
  border: '#E8E9ED',
  borderStrong: '#D5D7DC',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',

  primary: '#5B5BD6',
  primaryHover: '#4F4FCC',
  primaryLight: '#EEF0FE',
  primarySoft: '#F5F6FE',

  green: '#10B981',
  greenLight: '#ECFDF5',
  greenText: '#047857',

  red: '#EF4444',
  redLight: '#FEF2F2',
  redText: '#B91C1C',

  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  amberText: '#B45309',

  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  blueText: '#1D4ED8',

  purple: '#8B5CF6',
  purpleLight: '#F3F0FF',
  purpleText: '#6D28D9',

  shadow: '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
  shadowLg: '0 4px 6px rgba(0,0,0,.04), 0 10px 15px rgba(0,0,0,.08)',
};

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const fmtBRL = (v) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtNum = (v) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const fmtData = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const fmtRelativeTime = (iso) => {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
};

const cleanFilialName = (name) => {
  if (!name) return '';
  return name
    .replace(/^PRX_/, '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase());
};

const compactBRL = (v) => {
  if (!v) return 'R$ 0';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${Math.round(v)}`;
};

/* ═══════════════════════════════════════════════════════
   ÍCONES
═══════════════════════════════════════════════════════ */
const Icon = {
  Search: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>),
  Refresh: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>),
  Download: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>),
  Copy: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>),
  Chevron: ({ rotate = 0 }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotate}deg)`, transition: 'transform .2s' }}><polyline points="9 18 15 12 9 6" /></svg>),
  ArrowUp: () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>),
  ArrowDown: () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>),
  Check: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>),
  X: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>),
  Globe: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>),
  FileText: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>),
  Inbox: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>),
  Truck: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>),
  AlertCircle: () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>),
  Building: () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" /></svg>),
};

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function PendenciasPage() {
  // Estado
  const [filiais, setFiliais] = useState([]);
  const [filialSel, setFilialSel] = useState('');
  const [nfeData, setNfeData] = useState([]);          // NF-e da filial
  const [preNotas, setPreNotas] = useState([]);        // Pré-notas da filial
  const [cteGlobal, setCteGlobal] = useState([]);      // CT-e de TODAS as filiais
  const [ultimaAtt, setUltimaAtt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('overview'); // overview | nfe | prenotas | cte

  // Filtros (compartilhados entre tabs onde fizer sentido)
  const [busca, setBusca] = useState('');
  const [filtroSLA, setFiltroSLA] = useState('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState('TODOS');
  const [filtroFilialCte, setFiltroFilialCte] = useState('TODAS');
  const [sortBy, setSortBy] = useState('sla');
  const [sortDir, setSortDir] = useState('desc');

  const [expanded, setExpanded] = useState({});
  const [copiedKey, setCopiedKey] = useState('');

  // ─── CARREGA FILIAIS ───
  useEffect(() => {
    async function load() {
      const [filRes, monRes] = await Promise.all([
        supabase.from('filiais').select('codigo, descricao').order('codigo'),
        supabase.from('monitor_xml').select('descricao_filial, tipo_nota'),
      ]);

      if (filRes.data && monRes.data) {
        const contagem = {};
        monRes.data.forEach((r) => {
          const tipo = (r.tipo_nota || '').toUpperCase();
          if (tipo.includes('CT')) return;
          if (r.descricao_filial) {
            contagem[r.descricao_filial] = (contagem[r.descricao_filial] || 0) + 1;
          }
        });

        const enriched = filRes.data.map((f) => ({
          ...f,
          nomeLimpo: cleanFilialName(f.descricao),
          count: contagem[f.descricao] || 0,
        }));

        enriched.sort((a, b) => {
          if (a.count > 0 && b.count === 0) return -1;
          if (a.count === 0 && b.count > 0) return 1;
          return parseInt(a.codigo) - parseInt(b.codigo);
        });

        setFiliais(enriched);
      }
    }
    load();
  }, []);

  // ─── CT-e GLOBAL (uma vez) ───
  useEffect(() => {
    async function loadCte() {
      const { data } = await supabase
        .from('monitor_xml')
        .select('*')
        .ilike('tipo_nota', '%CT%');
      setCteGlobal(data || []);
    }
    loadCte();
  }, []);

  // ─── DADOS DA FILIAL ───
  const loadFilialData = useCallback(async () => {
    if (!filialSel) {
      setNfeData([]); setPreNotas([]);
      return;
    }
    setLoading(true);
    const filialDesc = filiais.find((f) => f.codigo === filialSel)?.descricao;

    const [mRes, pRes, aRes] = await Promise.all([
      supabase
        .from('monitor_xml')
        .select('*')
        .eq('descricao_filial', filialDesc)
        .not('tipo_nota', 'ilike', '%CT%'),
      supabase.from('pre_notas').select('*').eq('filial', filialSel),
      supabase.from('monitor_xml').select('atualizado_em').order('atualizado_em', { ascending: false }).limit(1),
    ]);

    setNfeData(mRes.data || []);
    setPreNotas(pRes.data || []);
    if (aRes.data?.[0]) setUltimaAtt(aRes.data[0].atualizado_em);
    setLoading(false);
  }, [filialSel, filiais]);

  useEffect(() => { loadFilialData(); }, [loadFilialData]);

  // ─── AGRUPAR ───
  function agruparPorNota(linhas, incluirFilial = false) {
    const map = new Map();
    linhas.forEach((item) => {
      const k = item.chave || item.documento || `${item.fornecedor}-${item.documento}`;
      if (!map.has(k)) {
        map.set(k, {
          chave: item.chave, documento: item.documento, serie: item.serie,
          tipo_nota: item.tipo_nota, data_emissao: item.data_emissao,
          status: item.status, sla: item.sla, sla_categoria: item.sla_categoria,
          fornecedor: item.fornecedor, nome_fornecedor: item.nome_fornecedor,
          descricao_filial: incluirFilial ? item.descricao_filial : undefined,
          filial: incluirFilial ? item.filial : undefined,
          itens: [], valor_total: 0,
        });
      }
      const nota = map.get(k);
      nota.itens.push(item);
      nota.valor_total += item.valor_total || 0;
    });
    return Array.from(map.values());
  }

  const nfeAgrupado = useMemo(() => agruparPorNota(nfeData), [nfeData]);
  const cteAgrupado = useMemo(() => agruparPorNota(cteGlobal, true), [cteGlobal]);

  const filiaisComCte = useMemo(() => {
    const set = new Set();
    cteGlobal.forEach((r) => r.descricao_filial && set.add(r.descricao_filial));
    return Array.from(set).sort();
  }, [cteGlobal]);

  // ─── STATS DA FILIAL (NF-e + Pré-notas) ───
  const stats = useMemo(() => {
    const cr = nfeAgrupado.filter((r) => r.sla_categoria === 'CRITICO').length;
    const at = nfeAgrupado.filter((r) => r.sla_categoria === 'ATENCAO').length;
    const ok = nfeAgrupado.filter((r) => r.sla_categoria === 'OK').length;
    const valorNfe = nfeAgrupado.reduce((s, r) => s + (r.valor_total || 0), 0);
    const valorPre = preNotas.reduce((s, r) => s + (r.valor_bruto || 0), 0);
    return {
      nfe: nfeAgrupado.length,
      prenotas: preNotas.length,
      cr, at, ok,
      valor: valorNfe + valorPre,
      valorNfe,
      valorPre,
    };
  }, [nfeAgrupado, preNotas]);

  // ─── DASHBOARD: dados para gráficos ───
  const chartData = useMemo(() => {
    // Top fornecedores
    const fornecedoresMap = {};
    nfeAgrupado.forEach((n) => {
      const nome = n.nome_fornecedor || 'Sem nome';
      if (!fornecedoresMap[nome]) fornecedoresMap[nome] = { count: 0, valor: 0 };
      fornecedoresMap[nome].count++;
      fornecedoresMap[nome].valor += n.valor_total || 0;
    });
    const topFornecedores = Object.entries(fornecedoresMap)
      .map(([nome, d]) => ({ nome, ...d }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    // Evolução por dia (últimos 14 dias)
    const hoje = new Date();
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      dias.push({
        date: iso,
        label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        count: 0,
      });
    }
    const diasMap = Object.fromEntries(dias.map((d) => [d.date, d]));
    nfeAgrupado.forEach((n) => {
      if (n.data_emissao && diasMap[n.data_emissao]) {
        diasMap[n.data_emissao].count++;
      }
    });

    // Distribuição por tipo
    const tiposMap = {};
    nfeAgrupado.forEach((n) => {
      const t = n.tipo_nota || 'Outro';
      tiposMap[t] = (tiposMap[t] || 0) + 1;
    });
    const tipos = Object.entries(tiposMap)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);

    return { topFornecedores, dias, tipos };
  }, [nfeAgrupado]);

  // ─── DADOS DA TAB ATIVA ───
  const dadosTab = useMemo(() => {
    let base;
    if (tab === 'cte') {
      base = cteAgrupado;
      if (filtroFilialCte !== 'TODAS') {
        base = base.filter((r) => r.descricao_filial === filtroFilialCte);
      }
    } else if (tab === 'nfe' || tab === 'overview') {
      base = nfeAgrupado;
    } else {
      base = [];
    }

    // Filtros gerais (não se aplicam a pré-notas)
    if (filtroSLA !== 'TODOS') {
      base = base.filter((r) => r.sla_categoria === filtroSLA);
    }
    if (filtroPeriodo !== 'TODOS') {
      const dias = parseInt(filtroPeriodo);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dias);
      base = base.filter((r) => r.data_emissao && new Date(r.data_emissao) >= cutoff);
    }
    if (busca) {
      const b = busca.toLowerCase();
      base = base.filter((r) =>
        [r.chave, r.documento, r.nome_fornecedor, r.fornecedor, r.descricao_filial,
        ...(r.itens || []).flatMap(i => [i.descricao_xml, i.descricao_protheus, i.produto_xml])]
          .some((c) => c && String(c).toLowerCase().includes(b))
      );
    }

    // Ordenação
    if (tab === 'cte') {
      base = [...base].sort((a, b) => {
        const af = a.descricao_filial || '';
        const bf = b.descricao_filial || '';
        if (af !== bf) return af.localeCompare(bf, 'pt-BR');
        let av = a[sortBy], bv = b[sortBy];
        if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
        if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      base = [...base].sort((a, b) => {
        let av = a[sortBy], bv = b[sortBy];
        if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
        if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return base;
  }, [tab, nfeAgrupado, cteAgrupado, filtroSLA, filtroPeriodo, filtroFilialCte, busca, sortBy, sortDir]);

  const preNotasFiltradas = useMemo(() => {
    let data = preNotas;
    if (busca) {
      const b = busca.toLowerCase();
      data = data.filter((r) =>
        [r.numero, r.nome_fornecedor, r.fornecedor].some((c) => c && String(c).toLowerCase().includes(b))
      );
    }
    return data;
  }, [preNotas, busca]);

  // Stats CT-e (mostrados só na aba CT-e)
  const cteStats = useMemo(() => {
    const cr = cteAgrupado.filter((r) => r.sla_categoria === 'CRITICO').length;
    const at = cteAgrupado.filter((r) => r.sla_categoria === 'ATENCAO').length;
    const ok = cteAgrupado.filter((r) => r.sla_categoria === 'OK').length;
    const valor = cteAgrupado.reduce((s, r) => s + (r.valor_total || 0), 0);
    return { total: cteAgrupado.length, cr, at, ok, valor };
  }, [cteAgrupado]);

  // ─── AÇÕES ───
  function toggleSort(col) {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir('desc'); }
  }
  function copyKey(k) {
    if (!k) return;
    navigator.clipboard.writeText(k);
    setCopiedKey(k);
    setTimeout(() => setCopiedKey(''), 1500);
  }
  function toggleExpand(k) {
    setExpanded((e) => ({ ...e, [k]: !e[k] }));
  }

  function exportarCSV() {
    const dados = tab === 'prenotas' ? preNotasFiltradas : dadosTab;
    if (!dados.length) return;
    let rows;
    if (tab === 'prenotas') {
      rows = dados.map(r => ({
        numero: r.numero, serie: r.serie,
        emissao: fmtData(r.data_emissao), digitacao: fmtData(r.data_digitacao),
        fornecedor: r.nome_fornecedor, valor_bruto: r.valor_bruto,
      }));
    } else {
      rows = [];
      dados.forEach(nota => {
        (nota.itens || []).forEach(item => {
          rows.push({
            filial: nota.descricao_filial || filialSel || '',
            sla: nota.sla, sla_categoria: nota.sla_categoria,
            tipo: nota.tipo_nota, documento: nota.documento, serie: nota.serie,
            emissao: fmtData(nota.data_emissao), fornecedor: nota.nome_fornecedor,
            produto: item.produto_xml, descricao: item.descricao_xml,
            qtd: item.quantidade, vlr_unit: item.valor_unitario,
            vlr_total: item.valor_total, chave: nota.chave,
          });
        });
      });
    }
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const csv = '\uFEFF' + [
      cols.join(';'),
      ...rows.map(r => cols.map(c => `"${(r[c] ?? '').toString().replace(/"/g, '""')}"`).join(';')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pendencias_${filialSel || 'geral'}_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function limparFiltros() {
    setBusca(''); setFiltroSLA('TODOS'); setFiltroPeriodo('TODOS'); setFiltroFilialCte('TODAS');
  }

  const filialSelObj = filiais.find((f) => f.codigo === filialSel);
  const temFiltros = busca || filtroSLA !== 'TODOS' || filtroPeriodo !== 'TODOS' || filtroFilialCte !== 'TODAS';
  const podeMostrarConteudo = filialSel || tab === 'cte';

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>

      {/* TOPBAR */}
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{ height: 28 }} />
          <div style={{ width: 1, height: 24, background: C.border }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: C.text }}>Pendências Fiscais</h1>
            <p style={{ fontSize: 11, margin: '1px 0 0', color: C.textMuted }}>
              {ultimaAtt ? `Atualizado ${fmtRelativeTime(ultimaAtt)}` : 'Núcleo Fiscal'}
            </p>
          </div>
          <button
            onClick={loadFilialData}
            disabled={loading || !filialSel}
            style={{
              padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6,
              background: C.surface, color: C.textMuted, fontSize: 12, fontWeight: 500,
              cursor: loading || !filialSel ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, opacity: loading || !filialSel ? .5 : 1,
              transition: 'all .15s',
            }}
          >
            <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}><Icon.Refresh /></span>
            Atualizar
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>

        {/* DROPDOWN FILIAL */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>
            Filial {tab === 'cte' && <span style={{ color: C.textSubtle, textTransform: 'none', fontWeight: 500 }}>(aba CT-e ignora esta seleção)</span>}
          </label>
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <select
              value={filialSel}
              onChange={(e) => setFilialSel(e.target.value)}
              style={{
                width: '100%', padding: '10px 36px 10px 14px',
                fontSize: 14, fontWeight: 500, color: C.text,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, cursor: 'pointer', outline: 'none',
                appearance: 'none', WebkitAppearance: 'none',
                fontFamily: 'inherit', boxShadow: C.shadow,
              }}
            >
              <option value="">Selecione uma filial...</option>
              {filiais.map((f) => (
                <option key={f.codigo} value={f.codigo}>
                  {f.codigo} — {f.nomeLimpo} {f.count > 0 ? `(${f.count} pendências)` : ''}
                </option>
              ))}
            </select>
            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textMuted }}>
              <Icon.Chevron rotate={90} />
            </div>
          </div>
        </div>

        {/* TABS */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, boxShadow: C.shadow, flexWrap: 'wrap',
          }}>
            <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={<Icon.Building />} label="Visão Geral" disabled={!filialSel} />
            <TabButton active={tab === 'nfe'} onClick={() => setTab('nfe')} icon={<Icon.FileText />} label="NF-e" badge={stats.nfe} disabled={!filialSel} />
            <TabButton active={tab === 'prenotas'} onClick={() => setTab('prenotas')} icon={<Icon.Inbox />} label="Pré-notas" badge={stats.prenotas} disabled={!filialSel} />
            <TabButton active={tab === 'cte'} onClick={() => setTab('cte')} icon={<Icon.Truck />} label="CT-e" badge={cteStats.total} badgeColor={C.purple} hint="global" />
          </div>
        </div>

        {/* CONTEÚDO */}
        {!podeMostrarConteudo ? (
          <EmptyState onClickCte={() => setTab('cte')} />
        ) : loading ? (
          <LoadingState />
        ) : (
          <>
            {/* ───────── VISÃO GERAL ───────── */}
            {tab === 'overview' && (
              <OverviewTab
                stats={stats}
                chartData={chartData}
                filial={filialSelObj}
                onGoNfe={() => setTab('nfe')}
                onGoPrenotas={() => setTab('prenotas')}
              />
            )}

            {/* ───────── NF-e ───────── */}
            {tab === 'nfe' && (
              <>
                <StatsRow
                  cards={[
                    { label: 'Total NF-e', value: stats.nfe, color: C.text, bg: C.surface },
                    { label: 'SLA Crítico', sub: '>10 dias', value: stats.cr, color: C.redText, bg: C.redLight, dot: C.red },
                    { label: 'SLA Atenção', sub: '6–10 dias', value: stats.at, color: C.amberText, bg: C.amberLight, dot: C.amber },
                    { label: 'SLA OK', sub: '≤5 dias', value: stats.ok, color: C.greenText, bg: C.greenLight, dot: C.green },
                    { label: 'Valor NF-e', value: fmtBRL(stats.valorNfe), color: C.text, bg: C.surface, small: true },
                  ]}
                />
                <DataPanel
                  title="Notas Fiscais"
                  icon={<Icon.FileText />}
                  busca={busca} setBusca={setBusca}
                  filtroSLA={filtroSLA} setFiltroSLA={setFiltroSLA}
                  filtroPeriodo={filtroPeriodo} setFiltroPeriodo={setFiltroPeriodo}
                  temFiltros={temFiltros} limparFiltros={limparFiltros}
                  exportarCSV={exportarCSV}
                  total={dadosTab.length}
                >
                  <TabelaMonitor
                    dados={dadosTab} mostrarFilial={false}
                    expanded={expanded} toggleExpand={toggleExpand}
                    sortBy={sortBy} sortDir={sortDir} toggleSort={toggleSort}
                    copyKey={copyKey} copiedKey={copiedKey}
                  />
                </DataPanel>
              </>
            )}

            {/* ───────── PRÉ-NOTAS ───────── */}
            {tab === 'prenotas' && (
              <>
                <StatsRow
                  cards={[
                    { label: 'Total Pré-notas', value: stats.prenotas, color: C.text, bg: C.surface },
                    { label: 'Valor Mercadoria', value: fmtBRL(preNotas.reduce((s, r) => s + (r.valor_mercadoria || 0), 0)), color: C.text, bg: C.surface, small: true },
                    { label: 'Valor Bruto', value: fmtBRL(stats.valorPre), color: C.text, bg: C.surface, small: true },
                  ]}
                />
                <DataPanel
                  title="Pré-notas"
                  icon={<Icon.Inbox />}
                  busca={busca} setBusca={setBusca}
                  semFiltrosSLA
                  temFiltros={!!busca} limparFiltros={() => setBusca('')}
                  exportarCSV={exportarCSV}
                  total={preNotasFiltradas.length}
                >
                  <TabelaPreNotas dados={preNotasFiltradas} />
                </DataPanel>
              </>
            )}

            {/* ───────── CT-e ───────── */}
            {tab === 'cte' && (
              <>
                <div style={{
                  background: C.purpleLight, border: `1px solid ${C.purple}33`,
                  borderRadius: 10, padding: '12px 16px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ color: C.purpleText, display: 'flex', alignItems: 'center' }}>
                    <Icon.Globe />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.purpleText }}>Visão Global — CT-e</div>
                    <div style={{ fontSize: 11, color: C.purpleText, opacity: .8 }}>
                      Exibindo conhecimentos de transporte de todas as filiais, agrupados por filial.
                    </div>
                  </div>
                </div>

                <StatsRow
                  cards={[
                    { label: 'Total CT-e', value: cteStats.total, color: C.text, bg: C.surface },
                    { label: 'SLA Crítico', sub: '>10 dias', value: cteStats.cr, color: C.redText, bg: C.redLight, dot: C.red },
                    { label: 'SLA Atenção', sub: '6–10 dias', value: cteStats.at, color: C.amberText, bg: C.amberLight, dot: C.amber },
                    { label: 'SLA OK', sub: '≤5 dias', value: cteStats.ok, color: C.greenText, bg: C.greenLight, dot: C.green },
                    { label: 'Valor Total', value: fmtBRL(cteStats.valor), color: C.text, bg: C.surface, small: true },
                  ]}
                />

                <DataPanel
                  title="Conhecimentos de Transporte"
                  icon={<Icon.Truck />}
                  busca={busca} setBusca={setBusca}
                  filtroSLA={filtroSLA} setFiltroSLA={setFiltroSLA}
                  filtroPeriodo={filtroPeriodo} setFiltroPeriodo={setFiltroPeriodo}
                  filtroFilialCte={filtroFilialCte} setFiltroFilialCte={setFiltroFilialCte}
                  filiaisComCte={filiaisComCte}
                  temFiltros={temFiltros} limparFiltros={limparFiltros}
                  exportarCSV={exportarCSV}
                  total={dadosTab.length}
                >
                  <TabelaMonitor
                    dados={dadosTab} mostrarFilial={true}
                    expanded={expanded} toggleExpand={toggleExpand}
                    sortBy={sortBy} sortDir={sortDir} toggleSort={toggleSort}
                    copyKey={copyKey} copiedKey={copiedKey}
                  />
                </DataPanel>
              </>
            )}

            {/* FOOTER */}
            <div style={{ marginTop: 20, fontSize: 11, color: C.textSubtle, textAlign: 'center' }}>
              {filialSelObj && tab !== 'cte' && (
                <>Visualizando <strong style={{ color: C.textMuted }}>{filialSelObj.codigo} — {filialSelObj.nomeLimpo}</strong></>
              )}
              {tab === 'cte' && <strong style={{ color: C.textMuted }}>Visão global de CT-e</strong>}
              {ultimaAtt && <> · Dados atualizados em {new Date(ultimaAtt).toLocaleString('pt-BR')}</>}
            </div>
          </>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .skeleton { background: linear-gradient(90deg, ${C.border}33, ${C.border}66, ${C.border}33); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        button:focus-visible, select:focus-visible, input:focus-visible {
          outline: 2px solid ${C.primary}40; outline-offset: 1px;
        }
        select option { background: white; color: ${C.text}; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB BUTTON
═══════════════════════════════════════════════════════ */
function TabButton({ active, onClick, icon, label, badge, badgeColor, disabled, hint }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: '1 1 auto', minWidth: 120,
        padding: '10px 14px', border: 'none',
        background: active ? C.primaryLight : 'transparent',
        color: active ? C.primary : disabled ? C.textSubtle : C.textMuted,
        fontSize: 13, fontWeight: active ? 600 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 7, fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'all .15s', opacity: disabled ? .5 : 1,
      }}
      onMouseEnter={(e) => !active && !disabled && (e.currentTarget.style.background = C.surfaceHover)}
      onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: active ? C.primary : (badgeColor || C.bg),
          color: active ? '#fff' : (badgeColor ? '#fff' : C.textMuted),
          padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
          minWidth: 20, textAlign: 'center',
        }}>
          {badge}
        </span>
      )}
      {hint && (
        <span style={{
          fontSize: 9, padding: '1px 5px', borderRadius: 3,
          background: C.purpleLight, color: C.purpleText, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.4px',
        }}>{hint}</span>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   OVERVIEW TAB (Dashboard com gráficos)
═══════════════════════════════════════════════════════ */
function OverviewTab({ stats, chartData, filial, onGoNfe, onGoPrenotas }) {
  return (
    <div style={{ animation: 'fadeIn .3s ease' }}>
      {/* HERO STATS */}
      <div style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.purple} 100%)`,
        borderRadius: 12, padding: 24, marginBottom: 16,
        color: '#fff', boxShadow: C.shadowLg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: .9, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
          <Icon.Building />
          {filial?.codigo} — {filial?.nomeLimpo}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: .8, fontWeight: 500 }}>NOTAS FISCAIS</div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{stats.nfe}</div>
            <button onClick={onGoNfe} style={{
              marginTop: 6, padding: '4px 10px', background: 'rgba(255,255,255,.2)',
              border: '1px solid rgba(255,255,255,.3)', borderRadius: 5, color: '#fff',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>Ver detalhes →</button>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: .8, fontWeight: 500 }}>PRÉ-NOTAS</div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{stats.prenotas}</div>
            <button onClick={onGoPrenotas} style={{
              marginTop: 6, padding: '4px 10px', background: 'rgba(255,255,255,.2)',
              border: '1px solid rgba(255,255,255,.3)', borderRadius: 5, color: '#fff',
              fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}>Ver detalhes →</button>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: .8, fontWeight: 500 }}>VALOR TOTAL</div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>{compactBRL(stats.valor)}</div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: .8 }}>NF-e + Pré-notas</div>
          </div>
        </div>
      </div>

      {/* SLA CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard label="SLA Crítico" sub=">10 dias" value={stats.cr} color={C.redText} bg={C.redLight} dot={C.red} />
        <StatCard label="SLA Atenção" sub="6–10 dias" value={stats.at} color={C.amberText} bg={C.amberLight} dot={C.amber} />
        <StatCard label="SLA OK" sub="≤5 dias" value={stats.ok} color={C.greenText} bg={C.greenLight} dot={C.green} />
      </div>

      {/* GRÁFICOS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Distribuição por SLA" subtitle="Notas fiscais por categoria de prazo">
          <SLADonut critico={stats.cr} atencao={stats.at} ok={stats.ok} />
        </ChartCard>
        <ChartCard title="Distribuição por Tipo" subtitle="Tipos de documentos pendentes">
          <TipoBar tipos={chartData.tipos} />
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Evolução de Pendências" subtitle="Notas por data de emissão — últimos 14 dias">
          <Timeline dias={chartData.dias} />
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <ChartCard title="Top 5 Fornecedores" subtitle="Por valor total em pendência">
          <TopFornecedores dados={chartData.topFornecedores} />
        </ChartCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CHARTS (SVG puro, sem libs)
═══════════════════════════════════════════════════════ */

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: 20, boxShadow: C.shadow,
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function SLADonut({ critico, atencao, ok }) {
  const total = critico + atencao + ok;
  if (total === 0) return <EmptyChart label="Sem dados" />;

  const r = 60, cx = 90, cy = 90;
  const circ = 2 * Math.PI * r;

  const segs = [
    { val: critico, color: C.red, label: 'Crítico' },
    { val: atencao, color: C.amber, label: 'Atenção' },
    { val: ok, color: C.green, label: 'OK' },
  ];

  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, justifyContent: 'center' }}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth="20" />
        {segs.map((s, i) => {
          if (s.val === 0) return null;
          const len = (s.val / total) * circ;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'all .6s ease' }}
            />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: C.text }}>
          {total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 11, fill: C.textMuted, fontWeight: 500 }}>
          NF-e
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, maxWidth: 200 }}>
        {segs.map((s, i) => {
          const pct = total > 0 ? Math.round((s.val / total) * 100) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.text, flex: 1 }}>{s.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{s.val}</span>
              <span style={{ fontSize: 11, color: C.textMuted, fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TipoBar({ tipos }) {
  if (!tipos.length) return <EmptyChart label="Sem dados" />;
  const max = Math.max(...tipos.map(t => t.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {tipos.slice(0, 6).map((t, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: C.text, fontWeight: 500 }}>{t.tipo}</span>
            <span style={{ color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{t.count}</span>
          </div>
          <div style={{ height: 8, background: C.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(t.count / max) * 100}%`,
              background: `linear-gradient(90deg, ${C.primary}, ${C.purple})`,
              borderRadius: 4, transition: 'width .6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ dias }) {
  const max = Math.max(...dias.map(d => d.count), 1);
  const w = 100 / dias.length;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', height: 140, gap: 4, padding: '0 4px' }}>
        {dias.map((d, i) => {
          const h = (d.count / max) * 100;
          return (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', height: '100%', justifyContent: 'flex-end',
              position: 'relative', cursor: 'default',
            }}
              title={`${d.label}: ${d.count} notas`}
            >
              {d.count > 0 && (
                <div style={{
                  fontSize: 10, color: C.textMuted, marginBottom: 2,
                  fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                }}>{d.count}</div>
              )}
              <div style={{
                width: '100%', maxWidth: 32,
                height: d.count > 0 ? `${h}%` : 2,
                minHeight: 2,
                background: d.count > 0
                  ? `linear-gradient(180deg, ${C.primary}, ${C.purple})`
                  : C.border,
                borderRadius: '4px 4px 0 0',
                transition: 'height .6s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, padding: '0 4px' }}>
        {dias.map((d, i) => (
          <div key={i} style={{
            flex: 1, fontSize: 9, color: C.textSubtle, textAlign: 'center',
            transform: 'rotate(-45deg) translateY(4px)', transformOrigin: 'center',
          }}>
            {i % 2 === 0 ? d.label : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function TopFornecedores({ dados }) {
  if (!dados.length) return <EmptyChart label="Sem dados" />;
  const maxValor = Math.max(...dados.map(d => d.valor));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {dados.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, alignItems: 'baseline' }}>
            <span style={{
              color: C.text, fontWeight: 500, flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12,
            }} title={d.nome}>
              {d.nome}
            </span>
            <span style={{ color: C.textMuted, fontSize: 11, marginRight: 8 }}>
              {d.count} {d.count === 1 ? 'nota' : 'notas'}
            </span>
            <span style={{ color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 100, textAlign: 'right' }}>
              {fmtBRL(d.valor)}
            </span>
          </div>
          <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(d.valor / maxValor) * 100}%`,
              background: `linear-gradient(90deg, ${C.primary}, ${C.purple})`,
              borderRadius: 3, transition: 'width .6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div style={{
      height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: C.textSubtle, fontSize: 12,
    }}>
      {label}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STATS ROW (linhas de cards)
═══════════════════════════════════════════════════════ */
function StatsRow({ cards }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
      {cards.map((c, i) => <StatCard key={i} {...c} />)}
    </div>
  );
}

function StatCard({ label, sub, value, color, bg, dot, small }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${C.border}`, borderRadius: 10,
      padding: '14px 16px', boxShadow: C.shadow,
      display: 'flex', flexDirection: 'column', gap: 4,
      animation: 'fadeIn .3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
        <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>
          {label}
        </span>
      </div>
      {sub && <span style={{ fontSize: 10, color: C.textSubtle, marginTop: -2 }}>{sub}</span>}
      <span style={{ fontSize: small ? 18 : 24, fontWeight: 700, color, lineHeight: 1.1, marginTop: 2 }}>
        {value}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DATA PANEL (tabela + filtros)
═══════════════════════════════════════════════════════ */
function DataPanel({
  title, icon, busca, setBusca,
  filtroSLA, setFiltroSLA, filtroPeriodo, setFiltroPeriodo,
  filtroFilialCte, setFiltroFilialCte, filiaisComCte,
  temFiltros, limparFiltros, exportarCSV, total, children, semFiltrosSLA,
}) {
  return (
    <div style={{
      background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
      boxShadow: C.shadow, overflow: 'hidden',
    }}>
      {/* Header do painel */}
      <div style={{
        padding: '14px 16px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ color: C.textMuted, display: 'flex' }}>{icon}</div>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0, flex: 1 }}>{title}</h2>
        <span style={{
          fontSize: 11, color: C.textMuted, fontWeight: 500,
          padding: '3px 10px', background: C.bg, borderRadius: 10,
        }}>
          {total} {total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Barra de filtros */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textSubtle }}>
            <Icon.Search />
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', fontSize: 13,
              border: `1px solid ${C.border}`, borderRadius: 6,
              background: C.bg, outline: 'none', color: C.text,
              fontFamily: 'inherit', transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = C.primary}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>

        {!semFiltrosSLA && setFiltroSLA && (
          <FilterSelect
            value={filtroSLA}
            onChange={setFiltroSLA}
            options={[
              { v: 'TODOS', l: 'Todos os SLAs' },
              { v: 'CRITICO', l: '🔴 Crítico (>10d)' },
              { v: 'ATENCAO', l: '🟡 Atenção (6–10d)' },
              { v: 'OK', l: '🟢 OK (≤5d)' },
            ]}
          />
        )}

        {!semFiltrosSLA && setFiltroPeriodo && (
          <FilterSelect
            value={filtroPeriodo}
            onChange={setFiltroPeriodo}
            options={[
              { v: 'TODOS', l: 'Todo período' },
              { v: '7', l: 'Últimos 7 dias' },
              { v: '30', l: 'Últimos 30 dias' },
              { v: '90', l: 'Últimos 90 dias' },
            ]}
          />
        )}

        {setFiltroFilialCte && filiaisComCte && filiaisComCte.length > 0 && (
          <FilterSelect
            value={filtroFilialCte}
            onChange={setFiltroFilialCte}
            options={[
              { v: 'TODAS', l: 'Todas as filiais' },
              ...filiaisComCte.map((f) => ({ v: f, l: cleanFilialName(f) })),
            ]}
          />
        )}

        {temFiltros && (
          <button onClick={limparFiltros} style={{
            padding: '7px 12px', background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.textMuted, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'inherit',
          }}>
            <Icon.X /> Limpar
          </button>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button onClick={exportarCSV} style={{
            padding: '8px 14px', background: C.primary, color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
            transition: 'background .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
            onMouseLeave={e => e.currentTarget.style.background = C.primary}
          >
            <Icon.Download /> Exportar CSV
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 30px 8px 12px', fontSize: 12, fontWeight: 500,
          border: `1px solid ${C.border}`, borderRadius: 6,
          background: C.bg, color: C.text, cursor: 'pointer',
          outline: 'none', appearance: 'none', WebkitAppearance: 'none',
          fontFamily: 'inherit',
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.textMuted }}>
        <Icon.Chevron rotate={90} />
      </div>
    </div>
  );
}

function SortableHeader({ label, col, sortBy, sortDir, toggleSort, align = 'left', width }) {
  const active = sortBy === col;
  return (
    <th style={{
      padding: '10px 12px', textAlign: align, fontSize: 11, fontWeight: 600,
      color: active ? C.text : C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px',
      background: C.bg, borderBottom: `1px solid ${C.border}`,
      cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      position: 'sticky', top: 0, zIndex: 1, width,
    }}
      onClick={() => toggleSort(col)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {active && (sortDir === 'asc' ? <Icon.ArrowUp /> : <Icon.ArrowDown />)}
      </span>
    </th>
  );
}

function TabelaMonitor({ dados, mostrarFilial, expanded, toggleExpand, sortBy, sortDir, toggleSort, copyKey, copiedKey }) {
  if (dados.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textSubtle, fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        Nenhuma pendência encontrada com os filtros atuais.
      </div>
    );
  }

  let ultimaFilial = null;

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 28, background: C.bg, borderBottom: `1px solid ${C.border}` }}></th>
              <SortableHeader label="SLA" col="sla" {...{ sortBy, sortDir, toggleSort }} width={70} />
              <SortableHeader label="Tipo" col="tipo_nota" {...{ sortBy, sortDir, toggleSort }} width={60} />
              <SortableHeader label="Documento" col="documento" {...{ sortBy, sortDir, toggleSort }} />
              <SortableHeader label="Emissão" col="data_emissao" {...{ sortBy, sortDir, toggleSort }} />
              <SortableHeader label="Fornecedor" col="nome_fornecedor" {...{ sortBy, sortDir, toggleSort }} />
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>Itens</th>
              <SortableHeader label="Valor" col="valor_total" {...{ sortBy, sortDir, toggleSort }} align="right" />
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', background: C.bg, borderBottom: `1px solid ${C.border}`, width: 50 }}>Chave</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((nota, idx) => {
              const k = nota.chave || `${nota.documento}-${idx}`;
              const isExp = expanded[k];

              let headerFilial = null;
              if (mostrarFilial && nota.descricao_filial !== ultimaFilial) {
                headerFilial = (
                  <tr key={`header-${nota.descricao_filial}`} style={{ background: C.purpleLight }}>
                    <td colSpan={9} style={{
                      padding: '8px 16px', fontSize: 11, fontWeight: 700,
                      color: C.purpleText, textTransform: 'uppercase', letterSpacing: '.5px',
                      borderTop: `2px solid ${C.purple}33`,
                      borderBottom: `1px solid ${C.purple}22`,
                    }}>
                      🚛 {cleanFilialName(nota.descricao_filial)}
                      <span style={{ marginLeft: 8, color: C.textMuted, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                        ({dados.filter(d => d.descricao_filial === nota.descricao_filial).length} CT-e)
                      </span>
                    </td>
                  </tr>
                );
                ultimaFilial = nota.descricao_filial;
              }

              return (
                <>
                  {headerFilial}
                  <tr
                    key={k}
                    onClick={() => toggleExpand(k)}
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      background: isExp ? C.surfaceHover : 'transparent',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={(e) => !isExp && (e.currentTarget.style.background = C.surfaceHover)}
                    onMouseLeave={(e) => !isExp && (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '10px 0 10px 12px', color: C.textMuted }}>
                      <Icon.Chevron rotate={isExp ? 90 : 0} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <SLABadge sla={nota.sla} cat={nota.sla_categoria} />
                    </td>
                    <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>
                      {nota.tipo_nota}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: C.text, fontFamily: 'monospace', fontSize: 12 }}>
                      {nota.documento}
                      {nota.serie && <span style={{ color: C.textSubtle, marginLeft: 6 }}>· s{nota.serie}</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>
                      {fmtData(nota.data_emissao)}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.text }}
                      title={nota.nome_fornecedor}>
                      {nota.nome_fornecedor || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        background: C.bg, padding: '2px 8px', borderRadius: 10,
                        fontSize: 11, fontWeight: 600, color: C.textMuted,
                      }}>
                        {nota.itens.length}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(nota.valor_total)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => copyKey(nota.chave)}
                        style={{
                          padding: 4, background: 'transparent', border: 'none',
                          color: copiedKey === nota.chave ? C.green : C.textMuted,
                          cursor: 'pointer', borderRadius: 4,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'color .15s',
                        }}
                        title={copiedKey === nota.chave ? 'Copiado!' : 'Copiar chave'}
                      >
                        {copiedKey === nota.chave ? <Icon.Check /> : <Icon.Copy />}
                      </button>
                    </td>
                  </tr>

                  {isExp && (
                    <tr style={{ background: C.bg, animation: 'fadeIn .2s ease' }}>
                      <td colSpan={9} style={{ padding: '0 12px 12px 50px' }}>
                        <div style={{
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderRadius: 8, padding: 12, marginTop: 4,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                            Produtos ({nota.itens.length})
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: C.textSubtle, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Cód XML</th>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Descrição</th>
                                  <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Cód Protheus</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Qtd</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Vlr Unit</th>
                                  <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Vlr Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {nota.itens.map((it, i) => (
                                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                                    <td style={{ padding: '6px 8px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{it.produto_xml || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: C.text }}>{it.descricao_xml || '—'}</td>
                                    <td style={{ padding: '6px 8px', color: C.textMuted, fontFamily: 'monospace', fontSize: 11 }}>{it.produto_protheus || '—'}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(it.quantidade)}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(it.valor_unitario)}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: C.text, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(it.valor_total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {nota.chave && (
                            <div style={{ marginTop: 8, padding: 8, background: C.bg, borderRadius: 4, fontSize: 11, fontFamily: 'monospace', color: C.textMuted, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: C.textSubtle }}>Chave:</span>
                              <span style={{ flex: 1, wordBreak: 'break-all' }}>{nota.chave}</span>
                              <button onClick={() => copyKey(nota.chave)} style={{
                                padding: '2px 8px', background: C.surface, border: `1px solid ${C.border}`,
                                borderRadius: 4, color: copiedKey === nota.chave ? C.green : C.textMuted,
                                fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}>
                                {copiedKey === nota.chave ? <><Icon.Check /> Copiado</> : <><Icon.Copy /> Copiar</>}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Exibindo <strong style={{ color: C.text }}>{dados.length}</strong> {dados.length === 1 ? 'nota' : 'notas'}
        </span>
      </div>
    </>
  );
}

function TabelaPreNotas({ dados }) {
  if (dados.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textSubtle, fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        Nenhuma pré-nota encontrada.
      </div>
    );
  }
  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Número', 'Série', 'Emissão', 'Digitação', 'Fornecedor', 'UF', 'Vlr Mercadoria', 'Vlr Bruto'].map(h => (
                <th key={h} style={{
                  padding: '10px 12px', textAlign: h.includes('Vlr') ? 'right' : 'left',
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: 'uppercase', letterSpacing: '.4px',
                  background: C.bg, borderBottom: `1px solid ${C.border}`,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((r, i) => (
              <tr key={r.id || i} style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 12px', fontWeight: 500, color: C.text, fontFamily: 'monospace', fontSize: 12 }}>{r.numero}</td>
                <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>{r.serie}</td>
                <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>{fmtData(r.data_emissao)}</td>
                <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>{fmtData(r.data_digitacao)}</td>
                <td style={{ padding: '10px 12px', color: C.text, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={r.nome_fornecedor}>{r.nome_fornecedor || '—'}</td>
                <td style={{ padding: '10px 12px', color: C.textMuted, fontSize: 12 }}>{r.estado || '—'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(r.valor_mercadoria)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(r.valor_bruto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Exibindo <strong style={{ color: C.text }}>{dados.length}</strong> {dados.length === 1 ? 'pré-nota' : 'pré-notas'}
        </span>
      </div>
    </>
  );
}

function SLABadge({ sla, cat }) {
  const styles = {
    CRITICO: { bg: C.redLight, color: C.redText, dot: C.red },
    ATENCAO: { bg: C.amberLight, color: C.amberText, dot: C.amber },
    OK: { bg: C.greenLight, color: C.greenText, dot: C.green },
  };
  const s = styles[cat] || styles.OK;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 12, background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot }} />
      {sla}d
    </span>
  );
}

function EmptyState({ onClickCte }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '60px 24px', textAlign: 'center', boxShadow: C.shadow,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>📊</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
        Selecione uma filial
      </h3>
      <p style={{ fontSize: 13, color: C.textMuted, margin: '0 auto 16px', maxWidth: 400 }}>
        Escolha sua filial no seletor acima para visualizar pendências fiscais e pré-notas em aberto.
      </p>
      <button onClick={onClickCte} style={{
        padding: '8px 16px', background: C.purpleLight, color: C.purpleText,
        border: `1px solid ${C.purple}33`, borderRadius: 6, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <Icon.Truck /> Ou veja CT-e de todas as filiais
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 400, borderRadius: 10 }} />
    </div>
  );
}
