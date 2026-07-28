'use client';

import { useEffect, useRef, useState } from 'react';

const MSG_POLL_OPEN_MS = 4000;
const MSG_POLL_CLOSED_MS = 15000;
const SESSION_POLL_MS = 15000;

/* Chat com mensagens temporárias: cada mensagem é gravada no banco mas
   se autodestrói 10 minutos depois de enviada (apagada pelo servidor a
   cada consulta — ver /api/chat/messages). Só quem está na lista de
   participantes da sessão ativa consegue ler ou enviar. */
export default function EphemeralChat({ user }) {
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const check = () => fetch('/api/chat/session/active', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active) return;
        const next = json?.session || null;
        setSession((prev) => {
          if (prev?.id !== next?.id) { setMessages([]); setUnread(0); lastCountRef.current = 0; }
          return next;
        });
      })
      .catch(() => {});
    check();
    const interval = setInterval(check, SESSION_POLL_MS);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  useEffect(() => {
    if (!session?.id) return;
    let active = true;
    const load = () => fetch(`/api/chat/messages?sessionId=${session.id}`, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active || !json) return;
        const msgs = json.messages || [];
        if (msgs.length > lastCountRef.current && !open) setUnread((u) => u + (msgs.length - lastCountRef.current));
        lastCountRef.current = msgs.length;
        setMessages(msgs);
      })
      .catch(() => {});
    load();
    const interval = setInterval(load, open ? MSG_POLL_OPEN_MS : MSG_POLL_CLOSED_MS);
    return () => { active = false; clearInterval(interval); };
  }, [session?.id, open]);

  useEffect(() => { if (open) setUnread(0); }, [open]);
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages, open]);

  const send = async () => {
    if (!input.trim() || !session?.id || sending) return;
    setSending(true);
    const texto = input.trim();
    setInput('');
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, texto }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages((cur) => [...cur, message]);
        lastCountRef.current += 1;
      }
    } finally { setSending(false); }
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
            <span>💬 Chat temporário <small>· mensagens somem em 10 min · sessão expira em {minutosRestantes} min</small></span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="pmx-echat__list" ref={listRef}>
            {messages.length === 0 && <p className="pmx-echat__empty">Nenhuma mensagem ainda. Cada mensagem some sozinha 10 minutos depois de enviada.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`pmx-echat__msg ${m.remetente_id === user.id ? 'is-me' : ''}`}>
                <b>{m.remetente_nome}</b>
                <p>{m.texto}</p>
                <small>{new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
              </div>
            ))}
          </div>
          <div className="pmx-echat__input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder="Digite uma mensagem…"
              disabled={sending}
            />
            <button onClick={send} disabled={!input.trim() || sending}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}
