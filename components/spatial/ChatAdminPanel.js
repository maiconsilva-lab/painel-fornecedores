'use client';

import { useEffect, useState } from 'react';

export default function ChatAdminPanel({ usuarios = [], currentUserId }) {
  const [selecionados, setSelecionados] = useState([]);
  const [duracao, setDuracao] = useState(60);
  const [ativa, setAtiva] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const carregarStatus = () => {
    fetch('/api/chat/session/list', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const atual = (json?.sessions || []).find((s) => s.ativo);
        setAtiva(atual || null);
      })
      .catch(() => {});
  };

  useEffect(() => { carregarStatus(); }, []);

  const toggle = (id) => setSelecionados((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const ativar = async () => {
    if (selecionados.length === 0) { setError('Selecione ao menos um participante.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/chat/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantes: selecionados, duracaoMinutos: duracao }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Falha ao ativar.'); return; }
      setSelecionados([]);
      carregarStatus();
    } catch { setError('Falha ao ativar. Verifique sua conexão.'); }
    finally { setLoading(false); }
  };

  const desativar = async () => {
    if (!ativa) return;
    setLoading(true);
    try {
      await fetch(`/api/chat/session/${ativa.id}/desativar`, { method: 'POST', credentials: 'same-origin' });
      carregarStatus();
    } finally { setLoading(false); }
  };

  const nomesParticipantes = (ids) => ids
    .filter((id) => id !== currentUserId)
    .map((id) => usuarios.find((u) => u.id === id)?.nome || '?')
    .join(', ');

  return (
    <div className="pmx-chat-admin">
      <div className="pmx-chat-admin__head">
        <h3>💬 Chat temporário</h3>
        <p>Ative uma conversa com uma pessoa específica ou um grupo. Cada mensagem se autodestrói 10 minutos depois de enviada, e só quem está na lista de participantes consegue ver. A conversa fica disponível por até 2 horas.</p>
      </div>

      {ativa ? (
        <div className="pmx-chat-admin__active">
          <div>
            <strong>Chat ativo</strong>
            <p>Com: {nomesParticipantes(ativa.participantes)}</p>
            <p className="pmx-chat-admin__expira">Expira em {new Date(ativa.expira_em).toLocaleString('pt-BR')}</p>
          </div>
          <button onClick={desativar} disabled={loading} className="pmx-chat-admin__stop">
            {loading ? 'Desativando…' : 'Desativar agora'}
          </button>
        </div>
      ) : (
        <>
          <div className="pmx-chat-admin__users">
            {usuarios.filter((u) => u.id !== currentUserId).map((u) => (
              <label key={u.id} className={selecionados.includes(u.id) ? 'is-selected' : ''}>
                <input type="checkbox" checked={selecionados.includes(u.id)} onChange={() => toggle(u.id)} />
                {u.nome}
              </label>
            ))}
          </div>
          <div className="pmx-chat-admin__row">
            <label>
              Duração
              <select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h30</option>
                <option value={120}>2 horas (máximo)</option>
              </select>
            </label>
            <button className="pmx-chat-admin__start" onClick={ativar} disabled={loading}>
              {loading ? 'Ativando…' : 'Ativar chat'}
            </button>
          </div>
        </>
      )}
      {error && <p className="pmx-chat-admin__error">{error}</p>}
    </div>
  );
}
