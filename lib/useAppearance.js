import { useState, useEffect, useCallback } from 'react';

/* State e handlers de aparência (tema, densidade, sidebar recolhida, busca
   global da topbar), extraídos do app/page.js. Inicialização lazy a partir
   do localStorage pra evitar FOUC (flash de tema errado antes de carregar),
   e sincronização com o servidor (/api/preferences) assim que o usuário
   loga — localStorage é só um cache local de baixíssima latência. */
export function useAppearance({ user, showToast }) {
  const readLS = (k, fallback) => {
    if (typeof window === 'undefined') return fallback;
    try { const v = window.localStorage.getItem('pmx_'+k); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const writeLS = (k, v) => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('pmx_'+k, JSON.stringify(v)); } catch {}
  };

  const [tema, setTema] = useState(() => readLS('tema', 'premix_claro'));
  const [densidade, setDensidade] = useState(() => readLS('densidade', 'normal'));
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [sidebarCol, setSidebarCol] = useState(() => readLS('sidebarCol', false));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchGlobal, setSearchGlobal] = useState(''); // busca global da topbar
  const [searchGlobalDeb, setSearchGlobalDeb] = useState(''); // versão "debounced" (250ms)

  /* Persistir cada mudança no localStorage (mirror do Supabase, latência zero) */
  useEffect(() => { writeLS('tema', tema); }, [tema]);
  useEffect(() => { writeLS('densidade', densidade); }, [densidade]);
  useEffect(() => { writeLS('sidebarCol', sidebarCol); }, [sidebarCol]);

  /* Debounce da busca global — atrasa 250ms o filtro para evitar engasgo em bases grandes */
  useEffect(() => {
    const t = setTimeout(() => setSearchGlobalDeb(searchGlobal), 250);
    return () => clearTimeout(t);
  }, [searchGlobal]);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/preferences', { credentials:'same-origin', cache:'no-store' });
      if (!res.ok) throw new Error('Falha ao carregar preferências');
      const { preferences:data } = await res.json();
      if (data) {
        if (data.tema && ['premix_claro', 'premix_escuro'].includes(data.tema)) setTema(data.tema);
        if (data.densidade) setDensidade(data.densidade);
      }
    } catch (e) { console.warn('[loadPrefs]', e.message); }
    finally { setPrefsLoaded(true); }
  }, [user]);

  useEffect(() => { if (user) loadPrefs(); }, [user, loadPrefs]);

  const savePrefs = async (patch) => {
    if (!user) return;
    const payload = { tema, densidade, ...patch };
    try {
      const res = await fetch('/api/preferences', {
        method:'POST', credentials:'same-origin',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Falha ao salvar preferências');
    } catch (e) {
      console.warn('[savePrefs]', e.message);
      showToast('Erro ao salvar preferências');
    }
  };

  return {
    tema, setTema, densidade, setDensidade, prefsLoaded, sidebarCol, setSidebarCol,
    mobileNavOpen, setMobileNavOpen, searchGlobal, setSearchGlobal, searchGlobalDeb,
    savePrefs,
  };
}
