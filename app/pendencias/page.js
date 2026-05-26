'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

/* ── Estilos ────────────────────────────────────── */
const COLORS = {
  bg: '#F5F7FA', surface: '#FFFFFF', border: '#E5E9EF',
  text1: '#1A2332', text2: '#4F5868', text3: '#8B94A3',
  green: '#00A650', greenDark: '#008C44', greenLight: '#E6F7EE',
  red: '#DC2626', redLight: '#FEF2F2',
  yellow: '#D97706', yellowLight: '#FFFBEB',
  blue: '#2563EB', blueLight: '#EFF6FF',
};

export default function PendenciasPage() {
  const [filiais, setFiliais] = useState([]);
  const [filialSel, setFilialSel] = useState('');
  const [monitor, setMonitor] = useState([]);
  const [preNotas, setPreNotas] = useState([]);
  const [aba, setAba] = useState('monitor');
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [ultimaAtt, setUltimaAtt] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Carrega filiais
  useEffect(() => {
    supabase.from('filiais').select('codigo, descricao').order('descricao')
      .then(({ data }) => { if (data) setFiliais(data); });
  }, []);

  // Carrega dados quando muda filial
  useEffect(() => {
    if (!filialSel) { setMonitor([]); setPreNotas([]); return; }
    setLoading(true);

    const filialDesc = filiais.find(f => f.codigo === filialSel)?.descricao;

    Promise.all([
      supabase.from('monitor_xml').select('*')
        .eq('descricao_filial', filialDesc).order('sla', { ascending: true }),
      supabase.from('pre_notas').select('*')
        .eq('filial', filialSel).order('data_emissao', { ascending: false }),
      supabase.from('monitor_xml').select('atualizado_em')
        .order('atualizado_em', { ascending: false }).limit(1),
    ]).then(([mRes, pRes, aRes]) => {
      setMonitor(mRes.data || []);
      setPreNotas(pRes.data || []);
      if (aRes.data?.[0]) setUltimaAtt(aRes.data[0].atualizado_em);
      setLoading(false);
    });
  }, [filialSel, filiais]);

  // Filtro de busca
  const monitorFilt = useMemo(() => {
    if (!busca) return monitor;
    const b = busca.toLowerCase();
    return monitor.filter(r =>
      [r.chave, r.documento, r.nome_fornecedor, r.fornecedor, r.descricao_xml]
        .some(c => c && c.toLowerCase().includes(b))
    );
  }, [monitor, busca]);

  const preNotasFilt = useMemo(() => {
    if (!busca) return preNotas;
    const b = busca.toLowerCase();
    return preNotas.filter(r =>
      [r.numero, r.nome_fornecedor, r.fornecedor]
        .some(c => c && c.toLowerCase().includes(b))
    );
  }, [preNotas, busca]);

  // Stats
  const stats = useMemo(() => {
    const critico = monitor.filter(r => r.sla_categoria === 'CRITICO').length;
    const atencao = monitor.filter(r => r.sla_categoria === 'ATENCAO').length;
    const ok = monitor.filter(r => r.sla_categoria === 'OK').length;
    const valor = monitor.reduce((s, r) => s + (r.valor_total || 0), 0);
    return { critico, atencao, ok, total: monitor.length, valor };
  }, [monitor]);

  // Exportar CSV
  function exportarCSV() {
    const dados = aba === 'monitor' ? monitorFilt : preNotasFilt;
    if (!dados.length) return;
    const cols = Object.keys(dados[0]).filter(k => k !== 'id' && k !== 'atualizado_em');
    const header = cols.join(';');
    const rows = dados.map(r => cols.map(c => `"${r[c] ?? ''}"`).join(';'));
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pendencias_${filialSel}_${aba}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  const fmtBRL = v => v == null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtData = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{ height: 32 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: COLORS.text1, margin: 0 }}>Pendências Fiscais</h1>
          <p style={{ fontSize: 12, color: COLORS.text3, margin: '2px 0 0' }}>
            Consulta de notas pendentes de lançamento e pré-notas
            {ultimaAtt && <span> · Atualizado em {new Date(ultimaAtt).toLocaleString('pt-BR')}</span>}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── FILTRO FILIAL ── */}
        <div style={{ background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 20, marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: COLORS.text2, display: 'block', marginBottom: 8 }}>
            Selecione sua filial
          </label>
          <select
            value={filialSel}
            onChange={e => { setFilialSel(e.target.value); setBusca(''); }}
            style={{
              width: '100%', maxWidth: 420, padding: '10px 14px', borderRadius: 8,
              border: `1px solid ${COLORS.border}`, fontSize: 14, fontFamily: 'inherit',
              background: '#F8F9FB', color: COLORS.text1, outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">-- Selecione a filial --</option>
            {filiais.map(f => (
              <option key={f.codigo} value={f.codigo}>{f.codigo} — {f.descricao}</option>
            ))}
          </select>
        </div>

        {/* ── CONTEÚDO ── */}
        {filialSel && (
          <>
            {/* Cards de SLA */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'SLA Crítico (>10d)', value: stats.critico, color: COLORS.red, bg: COLORS.redLight, emoji: '🔴' },
                { label: 'SLA Atenção (6–10d)', value: stats.atencao, color: COLORS.yellow, bg: COLORS.yellowLight, emoji: '🟡' },
                { label: 'SLA OK (≤5d)', value: stats.ok, color: COLORS.green, bg: COLORS.greenLight, emoji: '🟢' },
                { label: 'Total Pendências', value: stats.total, color: COLORS.blue, bg: COLORS.blueLight, emoji: '📋' },
                { label: 'Valor Total', value: fmtBRL(stats.valor), color: COLORS.text1, bg: '#F8F9FB', emoji: '💰' },
              ].map((c, i) => (
                <div key={i} style={{
                  background: c.bg, border: `1px solid ${c.color}22`, borderRadius: 12, padding: '16px 18px',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6 }}>
                    {c.emoji} {c.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Pré-notas card resumo */}
            {preNotas.length > 0 && (
              <div style={{
                background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '14px 18px',
                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12
              }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.blue }}>
                    {preNotas.length} pré-nota{preNotas.length > 1 ? 's' : ''} aguardando conferência
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.text3 }}>
                    Valor total: {fmtBRL(preNotas.reduce((s, r) => s + (r.valor_bruto || 0), 0))}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs + Toolbar */}
            <div style={{ background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${COLORS.border}` }}>
                {[
                  { k: 'monitor', l: `Monitor XML (${monitor.length})` },
                  { k: 'prenotas', l: `Pré-notas (${preNotas.length})` },
                ].map(t => (
                  <button key={t.k} onClick={() => { setAba(t.k); setBusca(''); }}
                    style={{
                      padding: '12px 20px', border: 'none', borderBottom: aba === t.k ? '2px solid #00A650' : '2px solid transparent',
                      background: 'transparent', fontSize: 13, fontWeight: aba === t.k ? 700 : 500,
                      color: aba === t.k ? COLORS.greenDark : COLORS.text3,
                      cursor: 'pointer', fontFamily: 'inherit', transition: '.15s',
                    }}
                  >{t.l}</button>
                ))}
              </div>

              {/* Toolbar: busca + exportar */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: `1px solid ${COLORS.border}` }}>
                <input
                  type="text"
                  placeholder="Buscar por chave, documento, fornecedor..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  style={{
                    flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8,
                    border: `1px solid ${COLORS.border}`, fontSize: 13, fontFamily: 'inherit',
                    background: '#F8F9FB', outline: 'none', color: COLORS.text1,
                  }}
                />
                <button onClick={exportarCSV} style={{
                  padding: '9px 16px', borderRadius: 8, border: `1px solid ${COLORS.green}33`,
                  background: COLORS.greenLight, color: COLORS.greenDark,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}>
                  ⬇ Exportar CSV
                </button>
              </div>

              {/* Tabela */}
              {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: COLORS.text3, fontSize: 14 }}>
                  Carregando...
                </div>
              ) : aba === 'monitor' ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['SLA', 'Tipo', 'Documento', 'Emissão', 'Fornecedor', 'Descrição XML', 'Qtd', 'Valor Total', 'Chave'].map(h => (
                          <th key={h} style={{
                            textAlign: h === 'Qtd' || h === 'Valor Total' ? 'right' : 'left',
                            padding: '10px 14px', fontSize: 11, fontWeight: 600, color: COLORS.text3,
                            textTransform: 'uppercase', letterSpacing: '.4px',
                            background: '#F8F9FB', borderBottom: `1px solid ${COLORS.border}`,
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monitorFilt.map((r, i) => (
                        <tr key={r.id || i} style={{ borderBottom: `1px solid ${COLORS.border}08` }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8F9FB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                              fontSize: 11, fontWeight: 700,
                              background: r.sla_categoria === 'CRITICO' ? COLORS.redLight
                                : r.sla_categoria === 'ATENCAO' ? COLORS.yellowLight : COLORS.greenLight,
                              color: r.sla_categoria === 'CRITICO' ? COLORS.red
                                : r.sla_categoria === 'ATENCAO' ? COLORS.yellow : COLORS.green,
                            }}>
                              {r.sla}d
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{r.tipo_nota}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: COLORS.text1 }}>{r.documento}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{fmtData(r.data_emissao)}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text1, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.nome_fornecedor}
                          </td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.descricao_xml}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: COLORS.text2 }}>
                            {r.quantidade != null ? r.quantidade.toLocaleString('pt-BR') : ''}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: COLORS.text1 }}>
                            {fmtBRL(r.valor_total)}
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: 10, color: COLORS.text3, fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={r.chave}>
                            {r.chave}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {monitorFilt.length === 0 && (
                    <div style={{ padding: 60, textAlign: 'center', color: COLORS.text3, fontSize: 14 }}>
                      {busca ? 'Nenhum resultado para a busca.' : 'Nenhuma pendência encontrada para esta filial.'}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr>
                        {['Número', 'Série', 'Emissão', 'Digitação', 'Fornecedor', 'Estado', 'Valor Mercadoria', 'Valor Bruto'].map(h => (
                          <th key={h} style={{
                            textAlign: h.includes('Valor') ? 'right' : 'left',
                            padding: '10px 14px', fontSize: 11, fontWeight: 600, color: COLORS.text3,
                            textTransform: 'uppercase', letterSpacing: '.4px',
                            background: '#F8F9FB', borderBottom: `1px solid ${COLORS.border}`,
                            whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preNotasFilt.map((r, i) => (
                        <tr key={r.id || i} style={{ borderBottom: `1px solid ${COLORS.border}08` }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8F9FB'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: COLORS.text1 }}>{r.numero}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{r.serie}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{fmtData(r.data_emissao)}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{fmtData(r.data_digitacao)}</td>
                          <td style={{ padding: '10px 14px', color: COLORS.text1, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.nome_fornecedor}
                          </td>
                          <td style={{ padding: '10px 14px', color: COLORS.text2 }}>{r.estado}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: COLORS.text2 }}>{fmtBRL(r.valor_mercadoria)}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: COLORS.text1 }}>{fmtBRL(r.valor_bruto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preNotasFilt.length === 0 && (
                    <div style={{ padding: 60, textAlign: 'center', color: COLORS.text3, fontSize: 14 }}>
                      {busca ? 'Nenhum resultado para a busca.' : 'Nenhuma pré-nota encontrada para esta filial.'}
                    </div>
                  )}
                </div>
              )}

              {/* Rodapé da tabela */}
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: COLORS.text3 }}>
                  {aba === 'monitor'
                    ? `${monitorFilt.length} de ${monitor.length} registros`
                    : `${preNotasFilt.length} de ${preNotas.length} registros`
                  }
                </span>
                <span style={{ fontSize: 11, color: COLORS.text3 }}>
                  Premix — Núcleo Fiscal
                </span>
              </div>
            </div>
          </>
        )}

        {/* Mensagem quando nenhuma filial selecionada */}
        {!filialSel && (
          <div style={{
            background: COLORS.surface, borderRadius: 12, border: `1px solid ${COLORS.border}`,
            padding: '80px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text1, marginBottom: 8 }}>
              Selecione uma filial para consultar
            </div>
            <div style={{ fontSize: 13, color: COLORS.text3, maxWidth: 400, margin: '0 auto' }}>
              Escolha sua filial no seletor acima para visualizar as notas pendentes de lançamento e pré-notas geradas no sistema.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
