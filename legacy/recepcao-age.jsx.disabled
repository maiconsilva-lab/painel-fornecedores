'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — mesma paleta da /pendencias
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
const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return '—';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const diasAte = (dateStr) => {
  if (!dateStr) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dt = new Date(dateStr); dt.setHours(0, 0, 0, 0);
  return Math.round((dt - hoje) / 86400000);
};

const prioColor = (p) => {
  if (p === 'Urgente') return { bg: C.redLight,   fg: C.redText,   border: '#FECACA' };
  if (p === 'Crítico') return { bg: C.amberLight, fg: C.amberText, border: '#FDE68A' };
  return                       { bg: C.blueLight,  fg: C.blueText,  border: '#BFDBFE' };
};

const POLL_MS = 60_000; // 1 min

/* ═══════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════ */
export default function RecepcaoPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroPrio, setFiltroPrio] = useState('TODAS'); // TODAS | Urgente | Crítico | Normal
  const [filtroResp, setFiltroResp] = useState('TODOS');
  const [tab, setTab] = useState('ativos');              // ativos | aguardando | resolvidos
  const [selecionado, setSelecionado] = useState(null);  // sheet_row do item aberto no drawer

  /* ─── Carrega dados da view consolidada ─── */
  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('v_recepcao_fila')
      .select('*')
      .order('prio_ordem', { ascending: true })
      .order('vencimento', { ascending: true, nullsLast: true })
      .limit(2000);
    if (!error && data) {
      setRows(data);
      setLastSync(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, POLL_MS);
    return () => clearInterval(id);
  }, [carregar]);

  /* ─── Trigger manual de sync (force-fetch do Sheet) ─── */
  const syncAgora = async () => {
    setLoading(true);
    try {
      await fetch('/api/sync-recepcao');
      await carregar();
    } finally { setLoading(false); }
  };

  /* ─── Lista de responsáveis pra filtro ─── */
  const responsaveis = useMemo(() => {
    const s = new Set(rows.map((r) => r.responsavel).filter(Boolean));
    return ['TODOS', ...Array.from(s).sort()];
  }, [rows]);

  /* ─── Particiona em 3 grupos ─── */
  const { ativos, aguardando, resolvidos, contadoresPrio } = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const fil = rows.filter((r) => {
      if (q) {
        const h = `${r.num_doc || ''} ${r.filial || ''} ${r.tipo || ''} ${r.observacoes || ''} ${r.aguardando_ref || ''}`.toLowerCase();
        if (!h.includes(q)) return false;
      }
      if (filtroResp !== 'TODOS' && r.responsavel !== filtroResp) return false;
      if (filtroPrio !== 'TODAS' && r.nivel_prioridade !== filtroPrio) return false;
      return true;
    });

    const ativos = [];
    const aguardando = [];
    const resolvidos = [];
    const cp = { Urgente: 0, 'Crítico': 0, Normal: 0 };

    for (const r of fil) {
      // resolvido: lançado/devolvido no painel OU já marcado como lançado no Sheet
      const jaResolvido = r.painel_status === 'lancado' || r.painel_status === 'devolvido' || r.status_sheet === 'Lançado';

      if (r.painel_status === 'aguardando' && !r.deve_revisar) {
        aguardando.push(r);
      } else if (jaResolvido) {
        resolvidos.push(r);
      } else {
        // ativo: pendente OU aguardando que já bateu data de revisão
        ativos.push(r);
        if (cp[r.nivel_prioridade] !== undefined) cp[r.nivel_prioridade]++;
      }
    }
    return { ativos, aguardando, resolvidos, contadoresPrio: cp };
  }, [rows, busca, filtroResp, filtroPrio]);

  const itemAberto = useMemo(
    () => rows.find((r) => r.sheet_row === selecionado),
    [rows, selecionado]
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
      {/* ─── HEADER ─── */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', position: 'sticky', top: 0, zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1400, margin: '0 auto' }}>
          <div>
            <div style={{ fontSize: 11, color: C.textSubtle, letterSpacing: .3 }}>Núcleo Fiscal</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-.3px' }}>Recepção de Documentos</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {lastSync ? `Atualizado ${lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '—'}
            </span>
            <button onClick={syncAgora} disabled={loading}
              style={{
                background: C.primary, color: '#fff', border: 'none', padding: '8px 14px',
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? .6 : 1, fontFamily: 'inherit',
              }}>
              {loading ? 'Sincronizando…' : 'Sincronizar Sheet'}
            </button>
          </div>
        </div>

        {/* ─── BARRA DE FILTROS ─── */}
        <div style={{ maxWidth: 1400, margin: '12px auto 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nº doc, filial, tipo, observação…"
            style={{
              flex: '1 1 240px', minWidth: 200, padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${C.border}`, fontSize: 13, background: C.surface, fontFamily: 'inherit',
            }}
          />
          {['TODAS', 'Urgente', 'Crítico', 'Normal'].map((p) => (
            <Pill key={p} active={filtroPrio === p} onClick={() => setFiltroPrio(p)} color={p !== 'TODAS' ? prioColor(p) : null}>
              {p}{p !== 'TODAS' && contadoresPrio[p] !== undefined ? ` · ${contadoresPrio[p]}` : ''}
            </Pill>
          ))}
          <select value={filtroResp} onChange={(e) => setFiltroResp(e.target.value)}
            style={{
              padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`,
              fontSize: 13, background: C.surface, fontFamily: 'inherit', cursor: 'pointer',
            }}>
            {responsaveis.map((r) => <option key={r} value={r}>{r === 'TODOS' ? 'Todos responsáveis' : r}</option>)}
          </select>
        </div>

        {/* ─── TABS ─── */}
        <div style={{ maxWidth: 1400, margin: '12px auto 0', display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: -14 }}>
          <Tab active={tab === 'ativos'}      onClick={() => setTab('ativos')}       label="Ativos"      count={ativos.length}     accent={C.red} />
          <Tab active={tab === 'aguardando'}  onClick={() => setTab('aguardando')}   label="Aguardando"  count={aguardando.length} accent={C.amber} />
          <Tab active={tab === 'resolvidos'}  onClick={() => setTab('resolvidos')}   label="Resolvidos"  count={resolvidos.length} accent={C.green} />
        </div>
      </header>

      {/* ─── CONTEÚDO ─── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px 80px' }}>
        {tab === 'ativos'      && <Lista rows={ativos}      vazio="Tudo limpo. Nada na fila ativa."           onClick={(r) => setSelecionado(r.sheet_row)} grupo="ativos" />}
        {tab === 'aguardando'  && <Lista rows={aguardando}  vazio="Nada esperando retorno."                   onClick={(r) => setSelecionado(r.sheet_row)} grupo="aguardando" />}
        {tab === 'resolvidos'  && <Lista rows={resolvidos}  vazio="Nenhum item resolvido ainda."              onClick={(r) => setSelecionado(r.sheet_row)} grupo="resolvidos" />}
      </main>

      {/* ─── DRAWER ─── */}
      {itemAberto && (
        <Drawer item={itemAberto} onClose={() => setSelecionado(null)} onAcaoFeita={() => { setSelecionado(null); carregar(); }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMPONENTES
═══════════════════════════════════════════════════════ */
function Pill({ active, onClick, color, children }) {
  const base = {
    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${active ? (color?.border || C.primary) : C.border}`,
    background: active ? (color?.bg || C.primaryLight) : C.surface,
    color: active ? (color?.fg || C.primary) : C.textMuted,
    fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .12s',
  };
  return <button onClick={onClick} style={base}>{children}</button>;
}

function Tab({ active, onClick, label, count, accent }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '10px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
        borderBottom: `2px solid ${active ? accent : 'transparent'}`,
        color: active ? C.text : C.textMuted, fontWeight: active ? 600 : 500,
        fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
      }}>
      {label}
      <span style={{
        background: active ? accent : C.border, color: active ? '#fff' : C.textMuted,
        padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700,
      }}>{count}</span>
    </button>
  );
}

function Lista({ rows, vazio, onClick, grupo }) {
  if (rows.length === 0) {
    return (
      <div style={{
        background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12,
        padding: '48px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13,
      }}>{vazio}</div>
    );
  }
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.surfaceHover, fontSize: 11, textTransform: 'uppercase', letterSpacing: .4, color: C.textMuted }}>
            <th style={th()}>Prio.</th>
            <th style={th()}>Filial</th>
            <th style={th()}>Tipo</th>
            <th style={th()}>Nº Doc</th>
            <th style={th()}>Venc.</th>
            <th style={th()}>Resp.</th>
            <th style={th()}>{grupo === 'aguardando' ? 'Aguarda' : (grupo === 'resolvidos' ? 'Status' : 'Recepção')}</th>
            <th style={th()}>Anexos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => <Linha key={r.sheet_row} row={r} onClick={onClick} grupo={grupo} />)}
        </tbody>
      </table>
    </div>
  );
}

const th = () => ({ textAlign: 'left', padding: '10px 12px', fontWeight: 600, borderBottom: `1px solid ${C.border}` });
const td = () => ({ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle' });

function Linha({ row, onClick, grupo }) {
  const p = prioColor(row.nivel_prioridade);
  const dias = diasAte(row.vencimento);
  const venceHoje = dias === 0;
  const venceu = dias !== null && dias < 0;

  const revisarHoje = row.deve_revisar;

  return (
    <tr onClick={() => onClick(row)} style={{ cursor: 'pointer', background: revisarHoje ? C.amberLight : 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = revisarHoje ? '#FFF3CD' : C.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = revisarHoje ? C.amberLight : 'transparent')}>
      <td style={td()}>
        <span style={{
          background: p.bg, color: p.fg, fontSize: 10, fontWeight: 700, padding: '3px 8px',
          borderRadius: 10, letterSpacing: .3, textTransform: 'uppercase',
        }}>{row.nivel_prioridade || '—'}</span>
        {revisarHoje && (
          <span title="Revisar hoje" style={{ marginLeft: 6, fontSize: 11, color: C.amberText, fontWeight: 600 }}>⏰</span>
        )}
      </td>
      <td style={td()}><span style={{ fontWeight: 500 }}>{row.filial || '—'}</span></td>
      <td style={td()}><span style={{ color: C.textMuted, fontSize: 12 }}>{row.tipo || '—'}</span></td>
      <td style={td()}><span style={{ fontFamily: 'ui-monospace, "SF Mono", monospace', fontSize: 12 }}>{row.num_doc || '—'}</span></td>
      <td style={td()}>
        <span style={{ color: venceu ? C.redText : (venceHoje ? C.amberText : C.text), fontWeight: venceHoje || venceu ? 600 : 400 }}>
          {fmtDate(row.vencimento)}
          {dias !== null && (
            <span style={{ marginLeft: 6, fontSize: 11, color: C.textMuted }}>
              {venceu ? `(${Math.abs(dias)}d atrasado)` : venceHoje ? '(hoje)' : `(${dias}d)`}
            </span>
          )}
        </span>
      </td>
      <td style={td()}><span style={{ fontSize: 12, color: C.textMuted }}>{row.responsavel || '—'}</span></td>
      <td style={td()}>
        {grupo === 'aguardando' && (
          <span style={{ fontSize: 11, color: C.amberText }}>
            {row.aguardando_motivo || 'Aguardando'}
            {row.aguardando_ref && <> · <b>{row.aguardando_ref}</b></>}
            {row.revisar_em && <> · revisar {fmtDate(row.revisar_em)}</>}
          </span>
        )}
        {grupo === 'resolvidos' && (
          <span style={{ fontSize: 11, color: C.greenText, fontWeight: 600 }}>
            {row.painel_status === 'lancado' ? 'Lançado' : row.painel_status === 'devolvido' ? 'Devolvido' : (row.status_sheet || '—')}
            {row.resolvido_em && <span style={{ color: C.textMuted, fontWeight: 400 }}> · {fmtDateTime(row.resolvido_em)}</span>}
          </span>
        )}
        {grupo === 'ativos' && (
          <span style={{ fontSize: 11, color: C.textMuted }}>{fmtDateTime(row.dt_recepcao || row.data)}</span>
        )}
      </td>
      <td style={td()}>
        <div style={{ display: 'flex', gap: 4 }}>
          {row.link_nf     && <Chip href={row.link_nf}     label="NF" />}
          {row.link_frete  && <Chip href={row.link_frete}  label="Frete" />}
          {row.link_boleto && <Chip href={row.link_boleto} label="Boleto" />}
        </div>
      </td>
    </tr>
  );
}

function Chip({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      style={{
        background: C.blueLight, color: C.blueText, fontSize: 10, fontWeight: 600,
        padding: '3px 7px', borderRadius: 5, textDecoration: 'none', whiteSpace: 'nowrap',
      }}>{label}</a>
  );
}

/* ═══════════════════════════════════════════════════════
   DRAWER (painel lateral de ação)
═══════════════════════════════════════════════════════ */
function Drawer({ item, onClose, onAcaoFeita }) {
  const [acao, setAcao] = useState(null); // null | 'lancar' | 'aguardar' | 'devolver'
  const [aguardandoMotivo, setAguardandoMotivo] = useState('PO pendente');
  const [aguardandoRef, setAguardandoRef] = useState('');
  const [revisarEm, setRevisarEm] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [observacao, setObservacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const p = prioColor(item.nivel_prioridade);
  const dias = diasAte(item.vencimento);
  const podeReabrir = item.painel_status === 'lancado' || item.painel_status === 'aguardando' || item.painel_status === 'devolvido';

  const enviar = async (acaoForcada) => {
    const a = acaoForcada || acao;
    setEnviando(true); setErro('');
    try {
      const res = await fetch('/api/recepcao/acao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_row: item.sheet_row,
          acao: a,
          aguardando_motivo: aguardandoMotivo,
          aguardando_ref: aguardandoRef || null,
          revisar_em: revisarEm,
          observacao: observacao || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'falha');
      onAcaoFeita();
    } catch (e) { setErro(e.message); }
    finally { setEnviando(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.32)', zIndex: 10,
      }} />
      <aside style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: C.surface,
        boxShadow: '-12px 0 24px rgba(0,0,0,.08)', zIndex: 11, overflowY: 'auto',
        animation: 'slideIn .18s ease-out',
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>

        {/* header drawer */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
            <div>
              <span style={{ background: p.bg, color: p.fg, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase' }}>
                {item.nivel_prioridade || '—'}
              </span>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: '8px 0 2px', letterSpacing: '-.2px' }}>
                {item.tipo || 'Documento'}
              </h2>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                Nº <b style={{ color: C.text, fontFamily: 'ui-monospace,monospace' }}>{item.num_doc || '—'}</b> · {item.filial}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: C.textMuted, padding: 4, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* corpo */}
        <div style={{ padding: '16px 20px' }}>
          {item.observacoes && (
            <div style={{ background: C.amberLight, borderLeft: `3px solid ${C.amber}`, padding: '10px 12px', borderRadius: '0 6px 6px 0', fontSize: 13, marginBottom: 14 }}>
              {item.observacoes}
            </div>
          )}

          <Field label="Vencimento">
            <span style={{ color: dias !== null && dias < 0 ? C.redText : C.text }}>
              {fmtDate(item.vencimento)}
              {dias !== null && <span style={{ marginLeft: 6, color: C.textMuted, fontSize: 12 }}>
                {dias < 0 ? `(${Math.abs(dias)}d atrasado)` : dias === 0 ? '(hoje)' : `(em ${dias}d)`}
              </span>}
            </span>
          </Field>
          <Field label="Enviado">{fmtDateTime(item.dt_recepcao || item.data)} <span style={{ color: C.textMuted }}>· {item.usuario}</span></Field>
          <Field label="Responsável">{item.responsavel || '—'}</Field>
          {item.sla_lancamento !== null && (
            <Field label="SLA lançamento">{Number(item.sla_lancamento).toFixed(1)} dias</Field>
          )}

          {/* Estado atual no painel */}
          {item.painel_status !== 'pendente' && (
            <div style={{ marginTop: 8, padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 4 }}>Estado atual</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: item.painel_status === 'lancado' ? C.greenText : item.painel_status === 'aguardando' ? C.amberText : C.redText }}>
                {item.painel_status === 'lancado' ? 'Lançado' : item.painel_status === 'aguardando' ? 'Aguardando' : 'Devolvido'}
              </div>
              {item.aguardando_motivo && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                {item.aguardando_motivo}{item.aguardando_ref && <> · <b>{item.aguardando_ref}</b></>}
                {item.revisar_em && <> · revisar {fmtDate(item.revisar_em)}</>}
              </div>}
              {item.painel_observacao && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>“{item.painel_observacao}”</div>}
            </div>
          )}

          {/* Anexos */}
          <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
            {item.link_nf     && <LinkBtn href={item.link_nf}     label="📄 Nota Fiscal" />}
            {item.link_frete  && <LinkBtn href={item.link_frete}  label="🚚 Frete" />}
            {item.link_boleto && <LinkBtn href={item.link_boleto} label="💰 Boleto" />}
          </div>
        </div>

        {/* AÇÕES */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: C.bg, position: 'sticky', bottom: 0 }}>
          {acao === null ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <BtnPrim onClick={() => enviar('lancar')} disabled={enviando} bg={C.green}>✓ Lançado</BtnPrim>
                <BtnPrim onClick={() => setAcao('aguardar')} disabled={enviando} bg={C.amber}>⏸ Aguardar</BtnPrim>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: podeReabrir ? '1fr 1fr' : '1fr', gap: 8 }}>
                <BtnSec onClick={() => enviar('devolver')} disabled={enviando}>↩ Devolver</BtnSec>
                {podeReabrir && <BtnSec onClick={() => enviar('reabrir')} disabled={enviando}>↺ Reabrir</BtnSec>}
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>Marcar como aguardando</div>
              <Select label="Motivo" value={aguardandoMotivo} onChange={setAguardandoMotivo} options={['PO pendente', 'Solicitação pendente', 'Rateio Logística', 'Auditoria', 'Contrato', 'Aguardando retorno usuário', 'Outro']} />
              <Input  label="Nº da solicitação/PO (opcional)" value={aguardandoRef} onChange={setAguardandoRef} placeholder="ex: 235008" />
              <Input  label="Revisar em" type="date" value={revisarEm} onChange={setRevisarEm} />
              <Input  label="Observação (opcional)" value={observacao} onChange={setObservacao} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                <BtnSec onClick={() => setAcao(null)} disabled={enviando}>Cancelar</BtnSec>
                <BtnPrim onClick={() => enviar('aguardar')} disabled={enviando} bg={C.amber}>Confirmar</BtnPrim>
              </div>
            </div>
          )}
          {erro && <div style={{ marginTop: 8, fontSize: 12, color: C.redText }}>Erro: {erro}</div>}
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <span style={{ color: C.textMuted, fontSize: 12 }}>{label}</span>
      <span style={{ color: C.text, fontWeight: 500, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

function LinkBtn({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer"
      style={{ background: C.primaryLight, color: C.primary, padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
      {label}
    </a>
  );
}

function BtnPrim({ onClick, disabled, bg, children }) {
  return <button onClick={onClick} disabled={disabled}
    style={{ background: bg, color: '#fff', border: 'none', padding: '11px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? .6 : 1, fontFamily: 'inherit' }}>
    {children}
  </button>;
}
function BtnSec({ onClick, disabled, children }) {
  return <button onClick={onClick} disabled={disabled}
    style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, padding: '11px 14px', borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? .6 : 1, fontFamily: 'inherit' }}>
    {children}
  </button>;
}
function Input({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label style={{ display: 'block', marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
    </label>
  );
}
function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'block', marginTop: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: 'block', marginBottom: 4 }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 13, fontFamily: 'inherit', background: C.surface, boxSizing: 'border-box' }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
