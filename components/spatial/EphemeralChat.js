'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/* Chat temporário: quando o admin ativa uma sessão (via /api/chat/session),
   os participantes descobrem isso checando /api/chat/session/active
   periodicamente. As MENSAGENS em si nunca passam pelo banco de dados —
   trafegam só pelo canal de Broadcast do Supabase Realtime (pub/sub
   efêmero). Ao fechar a aba ou a sessão expirar, tudo se perde — é
   exatamente o comportamento pedido ("conversa temporária"). */
export default function EphemeralChat({ user }) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const channelRef = useRef(null);
  const listRef = useRef(null);

  // Descobre se há uma sessão ativa pra esse usuário
  useEffect(() => {
    if (!user) return;
    let active = true;
    const check = () => fetch('/api/chat/session/active', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active) return;
        const next = json?.session || null;
        setSession((prev) => {
          if (prev?.id !== next?.id) { setMessages([]); setUnread(0); }
          return next;
        });
      })
      .catch(() => {});
    check();
    const interval = setInterval(check, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // Conecta/desconecta do canal de broadcast conforme a sessão muda
  useEffect(() => {
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    if (!session || !supabase) return;

    const ch = supabase.channel(`chat:${session.channelToken}`, { config: { broadcast: { self: true } } });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => {
      setMessages((cur) => [...cur, payload]);
      setUnread((u) => (open ? 0 : u + 1));
    });
    ch.subscribe();
    channelRef.current = ch;

    return () => { supabase.removeChannel(ch); channelRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.channelToken]);

  useEffect(() => { if (open) setUnread(0); }, [open]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, open]);

  const send = () => {
    if (!input.trim() || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'msg',
      payload: { from: user.nome, text: input.trim(), ts: Date.now() },
    });
    setInput('');
  };

  if (!session) return null;

  const expiraEm = new Date(session.expiraEm);
  const minutosRestantes = Math.max(0, Math.round((expiraEm.getTime() - Date.now()) / 60000));

  return (
    <div className="pmx-echat">
      {!open && (
        <button className="pmx-echat__bubble" onClick={() => setOpen(true)} title="Chat temporário ativo">
          💬 {unread > 0 && <span className="pmx-echat__badge">{unread}</span>}
        </button>
      )}
      {open && (
        <div className="pmx-echat__panel">
          <div className="pmx-echat__head">
            <span>💬 Chat temporário <small>· expira em {minutosRestantes} min</small></span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="pmx-echat__list" ref={listRef}>
            {messages.length === 0 && <p className="pmx-echat__empty">Nenhuma mensagem ainda. Essa conversa não fica salva — some quando a sessão acabar.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`pmx-echat__msg ${m.from === user.nome ? 'is-me' : ''}`}>
                <b>{m.from}</b>
                <p>{m.text}</p>
                <small>{new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
            ))}
          </div>
          <div className="pmx-echat__input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Digite uma mensagem…"
            />
            <button onClick={send} disabled={!input.trim()}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}
