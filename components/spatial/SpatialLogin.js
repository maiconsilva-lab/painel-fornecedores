'use client';

import SpatialScene from './SpatialScene';

export default function SpatialLogin({ loginForm, setLoginForm, loginError, loginLocked, onSubmit }) {
  return (
    <main className="pmx-spatial-login">
      <section className="pmx-spatial-login__visual">
        <div className="pmx-spatial-login__brand">
          <img src="/premix-logo.png" alt="Premix" />
          <span>Central de Cadastros</span>
        </div>
        <div className="pmx-spatial-login__copy">
          <span className="pmx-spatial-kicker">Central de Cadastros Premix</span>
          <h1>Dados organizados.<br/><em>Operação sob controle.</em></h1>
          <p>Uma central clara e segura para receber, validar e preparar cadastros destinados ao Protheus.</p>
        </div>
        <SpatialScene mode="login" counts={{ received: 18, validation: 7, ready: 11, done: 24 }} />
        <div className="pmx-spatial-login__status"><i /><span>Ambiente operacional disponível</span><b>v4.1</b></div>
      </section>
      <section className="pmx-spatial-login__form-zone">
        <div className="pmx-spatial-login__orb pmx-spatial-login__orb--blue" />
        <div className="pmx-spatial-login__orb pmx-spatial-login__orb--orange" />
        <form className="pmx-spatial-login__card" onSubmit={onSubmit}>
          <div className="pmx-spatial-login__mobile-brand"><img src="/premix-logo.png" alt="Premix" /><span>Central de Cadastros</span></div>
          <span className="pmx-eyebrow">Acesso seguro</span>
          <h2>Bem-vindo ao Núcleo Fiscal</h2>
          <p>Entre com suas credenciais corporativas para continuar.</p>
          <label><span>E-mail corporativo</span><div className="pmx-spatial-input"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input autoComplete="email" placeholder="nome@premix.com.br" type="email" value={loginForm.email} onChange={(event) => setLoginForm({ ...loginForm, email: event.target.value })} disabled={loginLocked} /></div></label>
          <label><span>Senha</span><div className="pmx-spatial-input"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><input autoComplete="current-password" placeholder="Digite sua senha" type="password" value={loginForm.senha} onChange={(event) => setLoginForm({ ...loginForm, senha: event.target.value })} disabled={loginLocked} /></div></label>
          {loginError && <div className="pmx-spatial-login__error"><span>!</span>{loginError}</div>}
          <button className="pmx-spatial-login__submit pmx-spatial-magnetic" type="submit" disabled={loginLocked}><span>{loginLocked ? 'Aguarde...' : 'Entrar na central'}</span><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg></button>
          <div className="pmx-spatial-login__security"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg><span>Conexão protegida · Uso interno Premix</span></div>
        </form>
      </section>
    </main>
  );
}
