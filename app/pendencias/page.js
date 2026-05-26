'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — Estilo Linear/Notion
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

  shadow: '0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)',
  shadowLg: '0 4px 6px rgba(0,0,0,.04), 0 10px 15px rgba(0,0,0,.08)',
};

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
const fmtBRL = (v) =>
  v == null
    ? '—'
    : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

// "PRX_PATROCÍNIO PAULISTA" → "Patrocínio Paulista"
const cleanFilialName = (name) => {
  if (!name) return '';
  return name
    .replace(/^PRX_/, '')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase());
};

/* ═══════════════════════════════════════════════════════
   ÍCONES (inline SVG)
═══════════════════════════════════════════════════════ */
const Icon = {
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Refresh: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  Download: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Chevron: ({ rotate = 0 }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${rotate}deg)`, transition: 'transform .2s' }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ArrowUp: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
    </svg>
  ),
  ArrowDown: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════ */
export default function PendenciasPage() {
  // ─── ESTADO ───
  const [filiais, setFiliais] = useState([]);
  const [filialSel, setFilialSel] = useState('');
  const [monitor, setMonitor] = useState([]);
  const [preNotas, setPreNotas] = useState([]);
  const [ultimaAtt, setUltimaAtt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('tudo'); // tudo | nfe | cte | prenotas

  // Filtros
  const [busca, setBusca] = useState('');
  const [filtroSLA, setFiltroSLA] = useState('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState('TODOS');
  const [sortBy, setSortBy] = useState('sla');
  const [sortDir, setSortDir] = useState('desc');

  // Tabela
  const [expanded, setExpanded] = useState({});
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  // Cópia
  const [copiedKey, setCopiedKey] = useState('');

  // ─── CARREGA FILIAIS COM CONTAGEM ───
  useEffect(() => {
    async function load() {
      const [filRes, monRes] = await Promise.all([
        supabase.from('filiais').select('codigo, descricao').order('codigo'),
        supabase.from('monitor_xml').select('descricao_filial'),
      ]);

      if (filRes.data && monRes.data) {
        // conta pendências por filial
        const contagem = {};
        monRes.data.forEach((r) => {
          if (r.descricao_filial) {
            contagem[r.descricao_filial] = (contagem[r.descricao_filial] || 0) + 1;
          }
        });

        const enriched = filRes.data.map((f) => ({
          ...f,
          nomeLimpo: cleanFilialName(f.descricao),
          count: contagem[f.descricao] || 0,
        }));

        // Ordena: primeiro com pendências, depois por código
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

  // ─── CARREGA DADOS QUANDO MUDA FILIAL ───
  const loadFilialData = useCallback(async () => {
    if (!filialSel) {
      setMonitor([]);
      setPreNotas([]);
      return;
    }
    setLoading(true);
    const filialDesc = filiais.find((f) => f.codigo === filialSel)?.descricao;

    const [mRes, pRes, aRes] = await Promise.all([
      supabase.from('monitor_xml').select('*').eq('descricao_filial', filialDesc),
      supabase.from('pre_notas').select('*').eq('filial', filialSel),
      supabase.from('monitor_xml').select('atualizado_em').order('atualizado_em', { ascending: false }).limit(1),
    ]);

    setMonitor(mRes.data || []);
    setPreNotas(pRes.data || []);
    if (aRes.data?.[0]) setUltimaAtt(aRes.data[0].atualizado_em);
    setLoading(false);
  }, [filialSel, filiais]);

  useEffect(() => {
    loadFilialData();
  }, [loadFilialData]);

  // ─── AGRUPAR MONITOR POR NOTA (chave) ───
  const monitorAgrupado = useMemo(() => {
    const map = new Map();
    monitor.forEach((item) => {
      const k = item.chave || item.documento || `${item.fornecedor}-${item.documento}`;
      if (!map.has(k)) {
        map.set(k, {
          chave: item.chave,
          documento: item.documento,
          serie: item.serie,
          tipo_nota: item.tipo_nota,
          data_emissao: item.data_emissao,
          status: item.status,
          sla: item.sla,
          sla_categoria: item.sla_categoria,
          fornecedor: item.fornecedor,
          nome_fornecedor: item.nome_fornecedor,
          itens: [],
          valor_total: 0,
        });
      }
      const nota = map.get(k);
      nota.itens.push(item);
      nota.valor_total += item.valor_total || 0;
    });
    return Array.from(map.values());
  }, [monitor]);

  // ─── APLICAR FILTROS ───
  const dadosFiltrados = useMemo(() => {
    let data = monitorAgrupado;

    // Filtro de tipo (tab)
    if (tab === 'nfe') {
      data = data.filter((r) => r.tipo_nota && r.tipo_nota.toUpperCase().includes('NF'));
    } else if (tab === 'cte') {
      data = data.filter((r) => r.tipo_nota && r.tipo_nota.toUpperCase().includes('CT'));
    }

    // Filtro SLA
    if (filtroSLA !== 'TODOS') {
      data = data.filter((r) => r.sla_categoria === filtroSLA);
    }

    // Filtro período
    if (filtroPeriodo !== 'TODOS') {
      const dias = parseInt(filtroPeriodo);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - dias);
      data = data.filter((r) => {
        if (!r.data_emissao) return false;
        return new Date(r.data_emissao) >= cutoff;
      });
    }

    // Busca
    if (busca) {
      const b = busca.toLowerCase();
      data = data.filter((r) =>
        [r.chave, r.documento, r.nome_fornecedor, r.fornecedor, ...(r.itens || []).flatMap(i => [i.descricao_xml, i.descricao_protheus, i.produto_xml])]
          .some((c) => c && String(c).toLowerCase().includes(b))
      );
    }

    // Ordenação
    data = [...data].sort((a, b) => {
      let av = a[sortBy];
      let bv = b[sortBy];
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [monitorAgrupado, tab, filtroSLA, filtroPeriodo, busca, sortBy, sortDir]);

  // Pré-notas filtradas
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

  // Paginação
  const totalPaginas = Math.ceil(dadosFiltrados.length / PER_PAGE);
  const dadosPagina = dadosFiltrados.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => setPage(1), [tab, filtroSLA, filtroPeriodo, busca]);

  // ─── STATS ───
  const stats = useMemo(() => {
    const cr = monitorAgrupado.filter((r) => r.sla_categoria === 'CRITICO').length;
    const at = monitorAgrupado.filter((r) => r.sla_categoria === 'ATENCAO').length;
    const ok = monitorAgrupado.filter((r) => r.sla_categoria === 'OK').length;
    const valor = monitorAgrupado.reduce((s, r) => s + (r.valor_total || 0), 0);
    const nfeCount = monitorAgrupado.filter(r => r.tipo_nota && r.tipo_nota.toUpperCase().includes('NF')).length;
    const cteCount = monitorAgrupado.filter(r => r.tipo_nota && r.tipo_nota.toUpperCase().includes('CT')).length;
    return { total: monitorAgrupado.length, cr, at, ok, valor, nfe: nfeCount, cte: cteCount };
  }, [monitorAgrupado]);

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
    const dados = tab === 'prenotas' ? preNotasFiltradas : dadosFiltrados;
    if (!dados.length) return;

    let rows;
    if (tab === 'prenotas') {
      rows = dados.map(r => ({
        numero: r.numero,
        serie: r.serie,
        emissao: fmtData(r.data_emissao),
        digitacao: fmtData(r.data_digitacao),
        fornecedor: r.nome_fornecedor,
        valor_bruto: r.valor_bruto,
      }));
    } else {
      // explodir itens
      rows = [];
      dados.forEach(nota => {
        nota.itens.forEach(item => {
          rows.push({
            sla: nota.sla,
            sla_categoria: nota.sla_categoria,
            tipo: nota.tipo_nota,
            documento: nota.documento,
            serie: nota.serie,
            emissao: fmtData(nota.data_emissao),
            fornecedor: nota.nome_fornecedor,
            produto: item.produto_xml,
            descricao: item.descricao_xml,
            qtd: item.quantidade,
            vlr_unit: item.valor_unitario,
            vlr_total: item.valor_total,
            chave: nota.chave,
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
    a.download = `pendencias_${filialSel}_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function limparFiltros() {
    setBusca('');
    setFiltroSLA('TODOS');
    setFiltroPeriodo('TODOS');
    setTab('tudo');
  }

  const filialSelObj = filiais.find((f) => f.codigo === filialSel);
  const temFiltros = busca || filtroSLA !== 'TODOS' || filtroPeriodo !== 'TODOS' || tab !== 'tudo';

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: C.text }}>

      {/* ───────── TOPBAR ───────── */}
      <header style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(8px)',
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
            onMouseEnter={e => !loading && filialSel && (e.currentTarget.style.background = C.surfaceHover)}
            onMouseLeave={e => (e.currentTarget.style.background = C.surface)}
          >
            <span style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}><Icon.Refresh /></span>
            Atualizar
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>

        {/* ───────── DROPDOWN FILIAL ───────── */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 8 }}>
            Filial
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
                fontFamily: 'inherit',
                boxShadow: C.shadow,
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

        {/* ───────── ESTADO VAZIO ───────── */}
        {!filialSel ? (
          <EmptyState />
        ) : loading ? (
          <LoadingState />
        ) : (
          <>
            {/* ───────── STATS CARDS ───────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              <StatCard label="Total de Notas" value={stats.total} color={C.text} bg={C.surface} />
              <StatCard label="SLA Crítico" sub=">10 dias" value={stats.cr} color={C.redText} bg={C.redLight} dot={C.red} />
              <StatCard label="SLA Atenção" sub="6–10 dias" value={stats.at} color={C.amberText} bg={C.amberLight} dot={C.amber} />
              <StatCard label="SLA OK" sub="≤5 dias" value={stats.ok} color={C.greenText} bg={C.greenLight} dot={C.green} />
              <StatCard label="Valor Total" value={fmtBRL(stats.valor)} color={C.text} bg={C.surface} small />
            </div>

            {/* ───────── TABS ───────── */}
            <div style={{
              background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
              boxShadow: C.shadow, overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 8px' }}>
                {[
                  { k: 'tudo', l: 'Todos', n: stats.total },
                  { k: 'nfe', l: 'NF-e', n: stats.nfe },
                  { k: 'cte', l: 'CT-e', n: stats.cte },
                  { k: 'prenotas', l: 'Pré-notas', n: preNotas.length },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    style={{
                      padding: '12px 14px', border: 'none', background: 'transparent',
                      fontSize: 13, fontWeight: tab === t.k ? 600 : 500,
                      color: tab === t.k ? C.primary : C.textMuted,
                      cursor: 'pointer', fontFamily: 'inherit',
                      borderBottom: `2px solid ${tab === t.k ? C.primary : 'transparent'}`,
                      marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'color .15s',
                    }}
                  >
                    {t.l}
                    <span style={{
                      background: tab === t.k ? C.primaryLight : C.bg,
                      color: tab === t.k ? C.primary : C.textMuted,
                      padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    }}>
                      {t.n}
                    </span>
                  </button>
                ))}
              </div>

              {/* ───────── BARRA DE FILTROS ───────── */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
                  <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textSubtle }}>
                    <Icon.Search />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nota, fornecedor, produto..."
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

                {tab !== 'prenotas' && (
                  <>
                    <FilterSelect
                      value={filtroSLA}
                      onChange={setFiltroSLA}
                      label="SLA"
                      options={[
                        { v: 'TODOS', l: 'Todos os SLAs' },
                        { v: 'CRITICO', l: '🔴 Crítico (>10d)' },
                        { v: 'ATENCAO', l: '🟡 Atenção (6–10d)' },
                        { v: 'OK', l: '🟢 OK (≤5d)' },
                      ]}
                    />

                    <FilterSelect
                      value={filtroPeriodo}
                      onChange={setFiltroPeriodo}
                      label="Período"
                      options={[
                        { v: 'TODOS', l: 'Todo período' },
                        { v: '7', l: 'Últimos 7 dias' },
                        { v: '30', l: 'Últimos 30 dias' },
                        { v: '90', l: 'Últimos 90 dias' },
                      ]}
                    />
                  </>
                )}

                {temFiltros && (
                  <button onClick={limparFiltros} style={{
                    padding: '7px 12px', background: 'transparent', border: `1px solid ${C.border}`,
                    borderRadius: 6, color: C.textMuted, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit',
                  }}>
                    <Icon.X /> Limpar filtros
                  </button>
                )}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
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

              {/* ───────── TABELA ───────── */}
              {tab === 'prenotas' ? (
                <TabelaPreNotas
                  dados={preNotasFiltradas}
                  copyKey={copyKey}
                  copiedKey={copiedKey}
                />
              ) : (
                <TabelaMonitor
                  dados={dadosPagina}
                  total={dadosFiltrados.length}
                  page={page}
                  setPage={setPage}
                  totalPaginas={totalPaginas}
                  perPage={PER_PAGE}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  toggleSort={toggleSort}
                  copyKey={copyKey}
                  copiedKey={copiedKey}
                />
              )}
            </div>

            {/* ───────── FOOTER INFO ───────── */}
            <div style={{ marginTop: 16, fontSize: 11, color: C.textSubtle, textAlign: 'center' }}>
              {filialSelObj && (
                <>
                  Visualizando <strong style={{ color: C.textMuted }}>{filialSelObj.codigo} — {filialSelObj.nomeLimpo}</strong>
                  {ultimaAtt && <> · Dados atualizados em {new Date(ultimaAtt).toLocaleString('pt-BR')}</>}
                </>
              )}
            </div>
          </>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
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
   COMPONENTES AUXILIARES
═══════════════════════════════════════════════════════ */

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

function FilterSelect({ value, onChange, label, options }) {
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
      position: 'sticky', top: 0, zIndex: 1,
      width,
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

function TabelaMonitor({ dados, total, page, setPage, totalPaginas, perPage, expanded, toggleExpand, sortBy, sortDir, toggleSort, copyKey, copiedKey }) {
  if (dados.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textSubtle, fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
        Nenhuma pendência encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 380px)', minHeight: 300 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ width: 28, background: C.bg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 1 }}></th>
              <SortableHeader label="SLA" col="sla" {...{ sortBy, sortDir, toggleSort }} width={70} />
              <SortableHeader label="Tipo" col="tipo_nota" {...{ sortBy, sortDir, toggleSort }} width={60} />
              <SortableHeader label="Documento" col="documento" {...{ sortBy, sortDir, toggleSort }} />
              <SortableHeader label="Emissão" col="data_emissao" {...{ sortBy, sortDir, toggleSort }} />
              <SortableHeader label="Fornecedor" col="nome_fornecedor" {...{ sortBy, sortDir, toggleSort }} />
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', background: C.bg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 1 }}>Itens</th>
              <SortableHeader label="Valor" col="valor_total" {...{ sortBy, sortDir, toggleSort }} align="right" />
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.4px', background: C.bg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 1, width: 50 }}>Chave</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((nota, idx) => {
              const k = nota.chave || `${nota.documento}-${idx}`;
              const isExp = expanded[k];
              return (
                <>
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
                        onMouseEnter={(e) => copiedKey !== nota.chave && (e.currentTarget.style.color = C.text)}
                        onMouseLeave={(e) => copiedKey !== nota.chave && (e.currentTarget.style.color = C.textMuted)}
                        title={copiedKey === nota.chave ? 'Copiado!' : 'Copiar chave'}
                      >
                        {copiedKey === nota.chave ? <Icon.Check /> : <Icon.Copy />}
                      </button>
                    </td>
                  </tr>

                  {/* LINHAS EXPANDIDAS (PRODUTOS) */}
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

      {/* PAGINAÇÃO */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Mostrando <strong style={{ color: C.text }}>{(page - 1) * perPage + 1}</strong>–
          <strong style={{ color: C.text }}>{Math.min(page * perPage, total)}</strong> de{' '}
          <strong style={{ color: C.text }}>{total}</strong> notas
        </span>
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <PaginationButton onClick={() => setPage(1)} disabled={page === 1}>«</PaginationButton>
            <PaginationButton onClick={() => setPage(page - 1)} disabled={page === 1}>‹</PaginationButton>
            <span style={{ padding: '0 10px', fontSize: 12, color: C.text, fontWeight: 500 }}>
              {page} / {totalPaginas}
            </span>
            <PaginationButton onClick={() => setPage(page + 1)} disabled={page === totalPaginas}>›</PaginationButton>
            <PaginationButton onClick={() => setPage(totalPaginas)} disabled={page === totalPaginas}>»</PaginationButton>
          </div>
        )}
      </div>
    </>
  );
}

function PaginationButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4,
        background: C.surface, color: disabled ? C.textSubtle : C.text,
        fontSize: 12, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? .5 : 1, fontFamily: 'inherit', minWidth: 28,
      }}
    >
      {children}
    </button>
  );
}

function TabelaPreNotas({ dados, copyKey, copiedKey }) {
  if (dados.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textSubtle, fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        Nenhuma pré-nota encontrada.
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Número', 'Série', 'Emissão', 'Digitação', 'Fornecedor', 'UF', 'Vlr Mercadoria', 'Vlr Bruto'].map(h => (
              <th key={h} style={{
                padding: '10px 12px', textAlign: h.includes('Vlr') ? 'right' : 'left',
                fontSize: 11, fontWeight: 600, color: C.textMuted,
                textTransform: 'uppercase', letterSpacing: '.4px',
                background: C.bg, borderBottom: `1px solid ${C.border}`,
                position: 'sticky', top: 0, zIndex: 1,
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

function EmptyState() {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '80px 24px', textAlign: 'center', boxShadow: C.shadow,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>📊</div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
        Selecione uma filial
      </h3>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
        Escolha sua filial no seletor acima para visualizar as pendências fiscais e pré-notas em aberto.
      </p>
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
