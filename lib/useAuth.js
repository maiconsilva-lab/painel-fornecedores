import { useState, useEffect } from 'react';

/* State e handlers de autenticação, extraídos do app/page.js: login (com
   rate limit no client), restauração de sessão via cookie no primeiro
   load, troca de senha, logout. `setPage` é passado de fora só porque o
   logout precisa voltar a tela pro dashboard. */
export function useAuth({ setPage }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLF] = useState({ email:'', senha:'' });
  const [loginErr, setLE] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [changePw, setCP] = useState(false);
  const [newPw, setNP] = useState({ nova:'', conf:'' });
  const [pwMsg, setPwMsg] = useState('');
  const [showLogout, setShowLogout] = useState(false);

  /* Restaura a sessão (cookie assinado) no primeiro carregamento */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) throw new Error('Sessão ausente');
        const json = await res.json();
        if (active) { setUser(json.user); localStorage.setItem('premix_user_profile', JSON.stringify(json.user)); }
      } catch {
        if (active) { setUser(null); localStorage.removeItem('premix_user_profile'); }
      } finally { if (active) setAuthLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const doLogin = async (e) => {
    e.preventDefault();
    if (loginLocked) return;
    if (loginAttempts >= 5) {
      setLoginLocked(true);
      setLE('Muitas tentativas. Aguarde 60 segundos.');
      setTimeout(() => { setLoginLocked(false); setLoginAttempts(0); setLE(''); }, 60000);
      return;
    }
    let data, error;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, senha: loginForm.senha }),
      });
      const json = await res.json();
      if (!res.ok) { error = true; }
      else { data = json.user; }
    } catch { error = true; }
    if (error || !data) {
      setLoginAttempts(a => a + 1);
      setLE('E-mail ou senha inválidos');
      return;
    }
    setUser(data);
    setAuthLoading(false);
    localStorage.setItem('premix_user_profile', JSON.stringify(data));
    if (data.primeiro_login) setCP(true);
    setLoginAttempts(0);
  };

  const doChangePw = async (e) => {
    e.preventDefault();
    if (newPw.nova !== newPw.conf) { setPwMsg('As senhas não coincidem'); return; }
    if (newPw.nova.length < 8) { setPwMsg('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(newPw.nova) || !/[0-9]/.test(newPw.nova)) { setPwMsg('Use letras maiúsculas e números'); return; }
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ senhaAtual: loginForm.senha, novaSenha: newPw.nova }),
    });
    const json = await res.json();
    if (!res.ok) { setPwMsg(json.error || 'Erro ao atualizar'); return; }
    const updated = { ...user, primeiro_login: false };
    setUser(updated); localStorage.setItem('premix_user_profile', JSON.stringify(updated));
    setCP(false); setNP({ nova:'', conf:'' }); setPwMsg('');
  };

  const doLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
    localStorage.removeItem('premix_user_profile');
    setShowLogout(false);
    setUser(null);
    setPage('dashboard');
  };

  return {
    user, authLoading, loginForm, setLF, loginErr, setLE, loginAttempts, loginLocked,
    changePw, setCP, newPw, setNP, pwMsg, showLogout, setShowLogout,
    doLogin, doChangePw, doLogout,
  };
}
