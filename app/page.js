'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: '#F9A825', bg: '#FFF8E1', icon: '⏳' },
  em_analise: { label: 'Em Análise', color: '#1976D2', bg: '#E3F2FD', icon: '🔍' },
  aprovado: { label: 'Aprovado', color: '#0F9D58', bg: '#E8F5E9', icon: '✓' },
  rejeitado: { label: 'Rejeitado', color: '#D93025', bg: '#FEE2E2', icon: '✗' },
};

export default function Home() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('fornecedores').select('*').order('created_at', { ascending: false });
    if (filter !== 'todos') query = query.eq('status', filter);
    const { data, error } = await query;
    if (!error) setFornecedores(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('fornecedores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fornecedores' }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const updateStatus = async (id, newStatus) => {
    setSaving(true);
    await supabase.from('fornecedores').update({ status: newStatus }).eq('id', id);
    if (selected?.id === id) setSelected({ ...selected, status: newStatus });
    await fetchData();
    setSaving(false);
  };

  const updateObs = async (id, obs) => {
    await supabase.from('fornecedores').update({ observacoes_internas: obs }).eq('id', id);
  };

  const filtered = fornecedores.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (f.razao_social || '').toLowerCase().includes(s) ||
      (f.cnpj || '').includes(s) ||
      (f.nome_fantasia || '').toLowerCase().includes(s) ||
      (f.email || '').toLowerCase().includes(s);
  });

  const counts = {
    todos: fornecedores.length,
    pendente: fornecedores.filter(f => f.status === 'pendente').length,
    em_analise: fornecedores.filter(f => f.status === 'em_analise').length,
    aprovado: fornecedores.filter(f => f.status === 'aprovado').length,
    rejeitado: fornecedores.filter(f => f.status === 'rejeitado').length,
  };

  const fmtDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* HEADER */}
      <header style={{
        background: 'linear-gradient(135deg, #0A2E5C 0%, #1A4F8A 100%)',
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-.3px' }}>
            📋 Painel de Fornecedores
          </h1>
          <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '.82rem', marginTop: 2 }}>
            Premix — Gestão de Cadastros
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            placeholder="Buscar por nome, CNPJ, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: 'rgba(255,255,255,.12)', color: '#fff',
              fontSize: '.85rem', width: 260, outline: 'none',
              fontFamily: 'Outfit'
            }}
          />
          <button onClick={fetchData} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'rgba(255,255,255,.15)', color: '#fff',
            cursor: 'pointer', fontSize: '.82rem', fontFamily: 'Outfit', fontWeight: 600
          }}>↻ Atualizar</button>
        </div>
      </header>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 20px' }}>
        {/* STATS */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { key: 'todos', label: 'Todos', icon: '📋', bg: '#F0F2F7', color: '#1B2A3D', border: '#D4DAE3' },
            { key: 'pendente', label: 'Pendentes', icon: '⏳', bg: '#FFF8E1', color: '#F9A825', border: '#FDD835' },
            { key: 'em_analise', label: 'Em Análise', icon: '🔍', bg: '#E3F2FD', color: '#1976D2', border: '#64B5F6' },
            { key: 'aprovado', label: 'Aprovados', icon: '✓', bg: '#E8F5E9', color: '#0F9D58', border: '#66BB6A' },
            { key: 'rejeitado', label: 'Rejeitados', icon: '✗', bg: '#FEE2E2', color: '#D93025', border: '#EF5350' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              flex: '1 1 140px', padding: '14px 16px', borderRadius: 10,
              background: filter === t.key ? t.bg : 'var(--card)',
              border: `2px solid ${filter === t.key ? t.border : 'transparent'}`,
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              transition: '.2s', fontFamily: 'Outfit'
            }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', fontWeight: 500 }}>{t.icon} {t.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: t.color, marginTop: 2 }}>{counts[t.key]}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* LIST */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Carregando...</div>
            ) : filtered.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: 60, background: 'var(--card)',
                borderRadius: 12, color: 'var(--muted)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
                Nenhum cadastro encontrado
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.map(f => {
                  const st = STATUS_CONFIG[f.status] || STATUS_CONFIG.pendente;
                  const isSelected = selected?.id === f.id;
                  return (
                    <div key={f.id} onClick={() => setSelected(f)} style={{
                      background: 'var(--card)',
                      border: `2px solid ${isSelected ? 'var(--navy)' : 'transparent'}`,
                      borderRadius: 10, padding: '16px 18px',
                      cursor: 'pointer', transition: '.15s',
                      boxShadow: isSelected ? '0 2px 12px rgba(10,46,92,.1)' : '0 1px 3px rgba(0,0,0,.03)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '.92rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {f.razao_social}
                          </div>
                          <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                            {f.cnpj} • {f.email}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px', borderRadius: 6,
                          fontSize: '.72rem', fontWeight: 600,
                          background: st.bg, color: st.color,
                          whiteSpace: 'nowrap', flexShrink: 0
                        }}>
                          {st.icon} {st.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 6 }}>
                        Recebido: {fmtDate(f.created_at)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL PANEL */}
          {selected && (
            <div style={{
              flex: '0 0 480px', background: 'var(--card)',
              borderRadius: 12, padding: '24px 22px',
              boxShadow: '0 2px 12px rgba(10,46,92,.06)',
              position: 'sticky', top: 20,
              maxHeight: 'calc(100vh - 40px)', overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Detalhes do Cadastro</h2>
                <button onClick={() => setSelected(null)} style={{
                  background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: 'var(--muted)'
                }}>✕</button>
              </div>

              {/* Status Actions */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button key={key} disabled={saving} onClick={() => updateStatus(selected.id, key)} style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: selected.status === key ? `2px solid ${cfg.color}` : '1.5px solid var(--border)',
                    background: selected.status === key ? cfg.bg : 'transparent',
                    color: selected.status === key ? cfg.color : 'var(--muted)',
                    fontWeight: selected.status === key ? 700 : 500,
                    fontSize: '.78rem', cursor: 'pointer', fontFamily: 'Outfit',
                    transition: '.15s', opacity: saving ? .5 : 1
                  }}>
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>

              {/* Data Sections */}
              <DetailSection title="🏢 Empresa" items={[
                ['Razão Social', selected.razao_social],
                ['Nome Fantasia', selected.nome_fantasia],
                ['CNPJ', selected.cnpj],
                ['IE', selected.inscricao_estadual],
                ['IM', selected.inscricao_municipal],
                ['Ramo', selected.ramo_atividade],
                ['Produtos/Serviços', selected.produtos_servicos],
              ]} />

              <DetailSection title="📞 Contato" items={[
                ['Responsável', selected.responsavel_nome],
                ['Cargo', selected.responsavel_cargo],
                ['Telefone', selected.telefone],
                ['Celular', selected.celular],
                ['E-mail', selected.email],
                ['Website', selected.website],
              ]} />

              <DetailSection title="📍 Endereço" items={[
                ['CEP', selected.cep],
                ['Logradouro', `${selected.logradouro || ''}, ${selected.numero || ''}`],
                ['Complemento', selected.complemento],
                ['Bairro', selected.bairro],
                ['Cidade/UF', `${selected.cidade || ''} - ${selected.estado || ''}`],
              ]} />

              <DetailSection title="🏦 Dados Bancários" items={[
                ['Banco', selected.banco],
                ['Agência', selected.agencia],
                ['Conta', `${selected.conta} (${selected.tipo_conta || 'corrente'})`],
                ['Titular', selected.titular_conta],
                ['CPF/CNPJ Titular', selected.cpf_cnpj_titular],
                ['PIX', selected.pix],
              ]} />

              {/* Documentos */}
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  📄 Documentos
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selected.comprovante_cnpj_url && (
                    <a href={selected.comprovante_cnpj_url} target="_blank" rel="noreferrer" style={{
                      padding: '8px 14px', background: '#E3F2FD', borderRadius: 8,
                      color: '#1976D2', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none'
                    }}>📎 Comprovante CNPJ</a>
                  )}
                  {selected.comprovante_bancario_url && (
                    <a href={selected.comprovante_bancario_url} target="_blank" rel="noreferrer" style={{
                      padding: '8px 14px', background: '#E3F2FD', borderRadius: 8,
                      color: '#1976D2', fontSize: '.8rem', fontWeight: 600, textDecoration: 'none'
                    }}>📎 Comprovante Bancário</a>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div>
                <h3 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 6 }}>📝 Observações Internas</h3>
                <textarea
                  defaultValue={selected.observacoes_internas || ''}
                  placeholder="Anotações da equipe sobre este fornecedor..."
                  onBlur={e => updateObs(selected.id, e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8,
                    border: '1.5px solid var(--border)', fontFamily: 'Outfit',
                    fontSize: '.85rem', minHeight: 80, resize: 'vertical',
                    outline: 'none', background: '#FAFBFD'
                  }}
                />
              </div>

              <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 14 }}>
                Cadastrado em: {fmtDate(selected.created_at)}<br />
                Última atualização: {fmtDate(selected.updated_at)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, items }) {
  const validItems = items.filter(([, v]) => v && v.trim && v.trim() !== '' && v.trim() !== '-' && v.trim() !== ',');
  if (validItems.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: '.85rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {validItems.map(([label, value], i) => (
          <div key={i} style={{ padding: '6px 0' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: '.85rem', fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
