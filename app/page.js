'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { listTable, mutateTable } from '../lib/dataApi';
import { useKanban } from '../lib/useKanban';
import { useUsersAdmin } from '../lib/useUsersAdmin';
import { useFornecedorActions } from '../lib/useFornecedorActions';
import { useProdutosActions } from '../lib/useProdutosActions';
import { useDesbloqueiosActions } from '../lib/useDesbloqueiosActions';
import { sanitize } from '../lib/sanitize';
import { inputStyle, fieldStyle, selectStyle, menuItem, tdS, thS, tdSnew, btnAction, actBtn, modalActBtn } from '../lib/styleHelpers';
import { ST, TL, PRI, KAN_COLS } from '../constants/status';
import { TEMAS } from '../constants/theme';
import { DEV_MOTIVOS, MOTIVO_CAMPOS, CAMPO_LABELS } from '../constants/devolucao';
import { DataSection, ActionBtn, PillBtn, SmBtn, StatNum } from '../components/shared';
import { OverviewDashboard, ProtheusQueue, ReportsDashboard, HistoryTimeline } from '../components/premiumPanels';
import RecordDrawer from '../components/recordDrawer';
import { buildRecentActivity, buildUnifiedQueue, getCompleteness, getDuplicateCandidates, recordToClipboardText, fieldsForType } from '../lib/panelMetrics';

export default function Home() {
  /* ── Auth State ──────────────────────────────── */
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLF] = useState({ email:'', senha:'' });
  const [loginErr, setLE] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [changePw, setCP] = useState(false);
  const [newPw, setNP] = useState({ nova:'', conf:'' });
  const [pwMsg, setPwMsg] = useState('');

  /* ── Data State ──────────────────────────────── */
  const [forn, setForn] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [desbloqueios, setDesbloqueios] = useState([]);
  const [usuarios, setUsu] = useState([]);
  const [kanban, setKanban] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState('dashboard');
  const [subTab, setSubTab] = useState('fornecedores'); // 'fornecedores' | 'produtos' | 'desbloqueios'
  const [tab, setTab] = useState('pendentes');
  const [sel, setSel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDone, setSearchDone] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterAssign, setFilterAssign] = useState('todos');
  const [showLogout, setShowLogout] = useState(false);
  /* Modal de confirmação customizado (substitui window.confirm que pode ser bloqueado) */
  const [confirmModal, setConfirmModal] = useState(null);
  // confirmModal = { title, message, danger, onConfirm }
  const askConfirm = (title, message, onConfirm, danger = true) => setConfirmModal({ title, message, onConfirm, danger });

  const [toast, setToast] = useState('');
  const showToast = (msg, duration = 2500) => { setToast(msg); setTimeout(() => setToast(''), duration); };
  const [rejectUnlock, setRejectUnlock] = useState(null);
  const [rejectUnlockReason, setRejectUnlockReason] = useState('');

  /* ── Aparência: tema, wallpaper, cor, densidade ──
     IMPORTANTE: inicialização lazy a partir do localStorage para evitar FOUC.
     Só fazemos isso no client (typeof window !== 'undefined') pra não quebrar SSR. */
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setNotifPermission(Notification.permission);
  }, []);
  const pedirPermissaoNotificacao = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) { showToast('Seu navegador não suporta notificações do sistema.'); return; }
    Notification.requestPermission().then(perm => {
      setNotifPermission(perm);
      if (perm === 'granted') showToast('Notificações ativadas! Você vai receber avisos do Windows quando chegar cadastro novo.');
      else if (perm === 'denied') showToast('Notificações bloqueadas. Pra ativar depois, libere nas permissões do site no navegador.');
    });
  };
  const notifyOS = (title, body) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, { body, icon: 'https://premix.com.br/wp-content/uploads/2023/05/icon_premix-300x300-1.png', tag: title });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  };
  const [detailMode, setDetailMode] = useState('protheus');


  /* Persistir cada mudança no localStorage (mirror do Supabase, latência zero) */
  useEffect(() => { writeLS('tema', tema); }, [tema]);
  useEffect(() => { writeLS('densidade', densidade); }, [densidade]);
  useEffect(() => { writeLS('sidebarCol', sidebarCol); }, [sidebarCol]);

  /* Debounce da busca global — atrasa 250ms o filtro para evitar engasgo em bases grandes */
  useEffect(() => {
    const t = setTimeout(() => setSearchGlobalDeb(searchGlobal), 250);
    return () => clearTimeout(t);
  }, [searchGlobal]);


  /* Kanban State e Admin State agora vêm dos hooks useKanban()/useUsersAdmin(),
     chamados logo abaixo de logAcao/applyRealtimeChange serem definidos. */

  const obsRef = useRef(null);
  const isAdmin = user && user.role === 'admin';
  const isSubAdmin = user && (user.role === 'admin' || user.role === 'subadmin');

  /* ── Login (com rate limiting) ───────────────── */
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

  /* Permite links diretos entre módulos, inclusive a página de Pendências Fiscais. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedView = params.get('view');
    const requestedTab = params.get('tab');
    const allowedViews = new Set(['dashboard','fila','cadastros','kanban','relatorios','historico','admin','aparencia']);
    if (allowedViews.has(requestedView)) setPage(requestedView);
    if (['fornecedores','produtos','desbloqueios'].includes(requestedTab)) {
      setPage('cadastros');
      setSubTab(requestedTab);
    }
  }, []);

  const doLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } catch {}
    localStorage.removeItem('premix_user_profile');
    setShowLogout(false);
    setUser(null);
    setPage('dashboard');
  };

  /* ESC fecha modais e dropdowns abertos (acessibilidade) */
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (searchGlobal) { setSearchGlobal(''); return; }
      if (showModal) { closeDetail(); return; }
      if (showNewTask) { setShowNewTask(false); return; }
      if (showNewUser) { setShowNewUser(false); return; }
      if (showLogout) { setShowLogout(false); return; }
      if (editTask) { setEditTask(null); return; }
      if (editUser) { setEditUser(null); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const fetchUsuarios = useCallback(async () => {
    if (!user) return [];
    try {
      const res = await fetch('/api/auth/users', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      return json.users || [];
    } catch { return []; }
  }, [user]);

  /* Guarda os IDs já vistos de cada coleção pra detectar chegadas novas
     entre um fetch e outro. null = ainda não carregou (evita notificar
     o dataset inteiro no primeiro load). */
  const knownIdsRef = useRef({ fornecedores: null, produtos: null, desbloqueios: null });

  const detectarNovos = (chave, lista, labelSingular) => {
    const prev = knownIdsRef.current[chave];
    const atuais = new Set(lista.map(r => r.id));
    if (prev) {
      const novos = lista.filter(r => !prev.has(r.id));
      if (novos.length === 1) {
        const nome = novos[0].razao_social || novos[0].nome_completo || novos[0].razao_social_atu || novos[0].nome_solicitante || novos[0].descricao || novos[0].codigo_produto || 'sem nome';
        showToast(`📥 Novo ${labelSingular}: ${nome}`, 5000);
        notifyOS('Premix — Central de Cadastros', `Novo ${labelSingular}: ${nome}`);
      } else if (novos.length > 1) {
        showToast(`📥 ${novos.length} novos ${labelSingular}s recebidos`, 5000);
        notifyOS('Premix — Central de Cadastros', `${novos.length} novos ${labelSingular}s recebidos`);
      }
    }
    knownIdsRef.current[chave] = atuais;
  };

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (silent) setRefreshing(true); else setLoad(true);
    setLoadError('');
    try {
      const [f, uList, k, p, d, auditRows] = await Promise.all([
        listTable(user.id, 'fornecedores', { orderCol: 'created_at', ascending: false }),
        fetchUsuarios(),
        listTable(user.id, 'kanban_tarefas', { orderCol: 'ordem', ascending: true }),
        listTable(user.id, 'produtos', { orderCol: 'created_at', ascending: false }),
        listTable(user.id, 'desbloqueios', { orderCol: 'created_at', ascending: false }),
        fetch('/api/audit?limit=700', { credentials:'same-origin', cache:'no-store' }).then(r => r.ok ? r.json() : { logs:[] }).then(j => j.logs || []).catch(() => []),
      ]);
      detectarNovos('fornecedores', f, 'cadastro de fornecedor');
      detectarNovos('produtos', p, 'cadastro de produto');
      detectarNovos('desbloqueios', d, 'pedido de desbloqueio');
      setForn(f); setUsu(uList); setKanban(k); setProdutos(p); setDesbloqueios(d); setAuditLog(auditRows);
    } catch (error) {
      console.error('[fetchAll]', error);
      setLoadError(error?.message || 'Não foi possível carregar os dados.');
    } finally {
      if (silent) setRefreshing(false); else setLoad(false);
    }
  }, [user, fetchUsuarios]);

  useEffect(() => { fetchAll(false); }, [fetchAll]);

  /* Polling: sem isso, cadastros novos vindos dos formulários públicos só
     apareceriam no próximo login/refresh manual (não dá pra usar realtime
     do Supabase aqui — ver commit de correção de RLS). */
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAll(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [user, fetchAll]);

  /* ── Aparência: carregar e salvar preferências do usuário ── */
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
    const payload = {
      tema,
      densidade,
      ...patch,
    };
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

  /* ── Tema institucional Premix ativo ── */
  const T = TEMAS[tema] || TEMAS.premix_claro;

  /* ── Helpers de densidade ── */
  const D = densidade === 'compacto' ? { cardPad:12, gapStat:10, rowPad:'10px 14px' }
          : densidade === 'confortavel' ? { cardPad:24, gapStat:18, rowPad:'18px 18px' }
          : { cardPad:18, gapStat:14, rowPad:'14px 16px' };

  /* ──────────────────────────────────────────────────────────────
     REALTIME — escuta mudanças e atualiza estado SEM disparar
     fetchAll inteiro (evita o bug de "tela volta ao estado anterior").
     Usa atualização otimista: aplica a mudança no estado local
     direto, em vez de refazer toda a query.
     ────────────────────────────────────────────────────────────── */
  const applyRealtimeChange = useCallback((table, payload) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    const setters = {
      fornecedores: setForn,
      produtos: setProdutos,
      desbloqueios: setDesbloqueios,
      kanban_tarefas: setKanban,
    };
    const setter = setters[table];
    if (!setter) return;
    if (eventType === 'INSERT') {
      setter(prev => prev.find(r => r.id === newRow.id) ? prev : [newRow, ...prev]);
    } else if (eventType === 'UPDATE') {
      setter(prev => prev.map(r => r.id === newRow.id ? { ...r, ...newRow } : r));
    } else if (eventType === 'DELETE') {
      setter(prev => prev.filter(r => r.id !== oldRow.id));
    }
  }, []);

  /* Realtime cross-sessão removido pra fornecedores/produtos/desbloqueios/
     kanban_tarefas: dependia da chave anon ter SELECT nessas tabelas, o que
     foi revogado por segurança (ver commit de correção de RLS). Cada ação
     agora atualiza o state local diretamente (via applyRealtimeChange
     chamado manualmente após cada mutação bem-sucedida) — funciona
     perfeitamente pra quem fez a ação, mas outra pessoa com o painel aberto
     ao mesmo tempo só vê a mudança no próximo refresh/login. Se isso for um
     problema no dia a dia, a solução correta é Supabase Realtime
     Authorization (canais autenticados) — vale um passo futuro. */

  /* ── E-mails transacionais ──────────────────────
     O navegador chama uma rota autenticada; credenciais e templates ficam
     exclusivamente no servidor/Vercel. */
  const sendEmail = async (kind, params) => {
    try {
      const res = await fetch('/api/email', {
        method:'POST', credentials:'same-origin',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ kind, params }),
      });
      const json = await res.json();
      return res.ok ? { ok:true } : { ok:false, error:json.error || `HTTP ${res.status}` };
    } catch (err) {
      console.error('[sendEmail]', err);
      return { ok:false, error:err.message || 'desconhecido' };
    }
  };

  /* ── Registra ação no log de auditoria ──
     Falha silenciosa: se a auditoria falhar, a operação principal continua.
     Não usa await intencionalmente — fire-and-forget pra não travar UI. */
  const logAcao = (acao, tipoCadastro, cadastroId, detalhes = null) => {
    const optimisticLog = {
      id:`local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      created_at:new Date().toISOString(), ator_nome:user?.nome, ator_email:user?.email,
      acao, tipo_cadastro:tipoCadastro, cadastro_id:cadastroId, detalhes,
    };
    setAuditLog(current => [optimisticLog, ...current].slice(0, 1000));
    fetch('/api/audit', {
      method:'POST', credentials:'same-origin', keepalive:true,
      headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({ acao, tipo_cadastro:tipoCadastro, cadastro_id:cadastroId, detalhes }),
    }).then(res => {
      if (!res.ok) console.warn('[logAcao] falhou (não crítico):', res.status);
    }).catch(e => console.warn('[logAcao] exceção (não crítico):', e));
  };

  /* ──────────────────────────────────────────────────────────────
     AÇÕES — PRODUTOS
     ────────────────────────────────────────────────────────────── */

  const { pegarProduto, excluirProduto, concluirProduto } = useProdutosActions({
    user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail,
  });
  const { pegarDesbloqueio, excluirDesbloqueio, concluirDesbloqueio, rejeitarDesbloqueio } = useDesbloqueiosActions({
    user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail,
  });

  const {
    saving, setSav, showDev, setShowDev, devMotivoSel, setDevMotivoSel,
    devMsg, setDevMsg, devCampos, setDevCampos, devSending, setDevSending,
    showAssign, setShowAssign, showConcluir, setShowConcluir, concluirData,
    setConcluirData, sendingEmail, setSendingEmail,
    updateStatus, concluirCadastro, assignTo, deleteForn, saveObs, sendDevolutiva,
  } = useFornecedorActions({ sel, setSel, setShowModal, user, showToast, askConfirm, logAcao, applyRealtimeChange, sendEmail, obsRef });

  /* ── Kanban e Admin de usuários: hooks extraídos ──
     (lib/useKanban.js e lib/useUsersAdmin.js). Precisam vir depois de
     logAcao e applyRealtimeChange já estarem definidos. ── */
  const kb = useKanban({ kanban, setKanban, user, fetchAll, showToast, askConfirm, logAcao, applyRealtimeChange });
  const {
    kanView, setKanView, showNewTask, setShowNewTask, newTask, setNewTask,
    editTask, setEditTask, newChkItem, setNewChkItem, dragTaskId, setDragTaskId,
    kanLayout, setKanLayout, newTaskComment, setNewTaskComment,
    addKanTask, moveKanTask, dropKanTask, deleteKanTask, updateKanTask,
    addChkItem, toggleChkItem, removeChkItem, addTaskComment,
  } = kb;

  const ua = useUsersAdmin({ user, fetchAll, showToast, askConfirm });
  const {
    showNewUser, setShowNewUser, newUser, setNewUser, editUser, setEditUser,
    addUser, updateUser, deleteUser, toggleUserActive, resetUserPw,
  } = ua;

  /* ── Helpers ─────────────────────────────────── */
  const fmtDate = d => { if (!d) return '-'; return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); };
  const fmtDateShort = d => { if (!d) return ''; return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }); };
  const cp = t => { navigator.clipboard.writeText(t || ''); showToast('Copiado!'); };

  const openDetail = (f) => { setSel(f); setShowModal(true); };
  const closeDetail = () => { setShowModal(false); setTimeout(() => setSel(null), 200); };

  /* ── Filtros ─────────────────────────────────── */
  const pend = forn.filter(f => f.status === 'pendente' || f.status === 'em_analise');
  const done = forn.filter(f => f.status === 'aprovado' || f.status === 'rejeitado');

  const applyFilters = (arr, searchTerm) => arr.filter(f => {
    if (filterTipo !== 'todos' && f.tipo_cadastro !== filterTipo) return false;
    if (filterAssign !== 'todos' && f.atribuido_para !== filterAssign) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (f.razao_social||'').toLowerCase().includes(s) || (f.cnpj||'').includes(s) || (f.nome_fantasia||'').toLowerCase().includes(s) || (f.email||'').toLowerCase().includes(s) || (f.nome_completo||'').toLowerCase().includes(s) || (f.cpf||'').includes(s) || (f.razao_social_atu||'').toLowerCase().includes(s) || (f.cnpj_cpf_atu||'').includes(s);
    }
    return true;
  });

  const listPend = applyFilters(pend, search);
  const listDone = applyFilters(done, searchDone);
  const kanFiltered = kanView === 'todos' ? kanban : kanban.filter(t => t.atribuido_para === kanView);

  const calcProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    return Math.round((checklist.filter(i => i.feito).length / checklist.length) * 100);
  };


  const operationalQueue = buildUnifiedQueue(forn, produtos, desbloqueios);
  const recentActivity = buildRecentActivity(forn, produtos, desbloqueios, kanban);
  const overdueTasks = kanban.filter(t => t.status !== 'concluido' && t.prazo && new Date(`${t.prazo}T23:59:59`) < new Date());
  const notifications = [
    ...operationalQueue.filter(i => i._priority === 'critica').slice(0, 5).map(i => ({
      id:`critical-${i._type}-${i.id}`,
      title:`${i._name} está há ${i._age} dias na fila`,
      description:`${i._status.label} · ${i.atribuido_para || 'sem responsável'}`,
      item:i,
    })),
    ...overdueTasks.slice(0, 4).map(t => ({
      id:`task-${t.id}`,
      title:`Tarefa vencida: ${t.titulo}`,
      description:`Responsável: ${t.atribuido_para || 'não atribuído'}`,
      page:'kanban',
    })),
  ];

  const navigatePremium = (target) => {
    setShowNotifications(false);
    if (target === 'produtos') { setPage('cadastros'); setSubTab('produtos'); return; }
    if (target === 'desbloqueios') { setPage('cadastros'); setSubTab('desbloqueios'); return; }
    setPage(target);
    setSel(null);
    setShowModal(false);
  };

  const openOperationalItem = (item) => {
    setShowNotifications(false);
    const type = item?._type || (item?.tipo_cadastro ? 'fornecedor' : null);
    if (type === 'fornecedor') {
      setPage('cadastros');
      setSubTab('fornecedores');
      setDetailMode('protheus');
      openDetail(item);
      return;
    }
    if (type === 'produto') {
      setPage('cadastros'); setSubTab('produtos'); setDetailMode('protheus'); openDetail({ ...item, _type:'produto' }); return;
    }
    if (type === 'desbloqueio') {
      setPage('cadastros'); setSubTab('desbloqueios'); setDetailMode('protheus'); openDetail({ ...item, _type:'desbloqueio' });
    }
  };

  const copySupplierRecord = (record) => {
    cp(recordToClipboardText(record, 'fornecedor'));
    showToast('Todos os dados recebidos foram copiados na ordem do cadastro');
  };

  if (authLoading) return (
    <div className="pmx-auth-loading" role="status" aria-live="polite">
      <div className="pmx-auth-loading__card">
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" />
        <span className="pmx-spinner" />
        <p>Carregando sua central de cadastros...</p>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     RENDER — LOGIN
     ═══════════════════════════════════════════════ */
  if (!user) return (
    <div style={{minHeight:'100vh',background:'#F5F7FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Geist',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",padding:20,position:'relative',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        @keyframes loginFadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .login-input:focus { background:#fff !important; border-color:#20558A !important; box-shadow:0 0 0 3px #EAF2FA !important; }
        .login-input { transition: all .15s; }
        .login-btn:hover:not(:disabled) { background:#173F69 !important; box-shadow:0 6px 16px rgba(32,85,138,.35); transform:translateY(-1px); }
        .login-btn { transition: all .15s; }
      `}</style>
      {/* Decorative background */}
      <div style={{position:'absolute',top:'-200px',right:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(32,85,138,.09) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-200px',left:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(200,169,81,.08) 0%,transparent 70%)',pointerEvents:'none'}} />

      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 12px 32px rgba(16,24,40,.08),0 4px 8px rgba(16,24,40,.04)',border:'1px solid #E5E9EF',animation:'loginFadeIn .35s cubic-bezier(.16,1,.3,1)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#20558A 0%,#20558A 45%,#F15A24 55%,#F15A24 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite'}} />
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:44,marginBottom:28}} />
        <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:20,fontWeight:700,letterSpacing:'-.4px',marginBottom:6,color:'#1A2332'}}>Núcleo Fiscal</h2>
        <p style={{fontSize:13,color:'#8B94A3',marginBottom:32}}>Gestão de fornecedores, produtos e desbloqueios</p>
        <form onSubmit={doLogin} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input className="login-input" placeholder="E-mail corporativo" type="email" value={loginForm.email} onChange={e=>setLF({...loginForm,email:e.target.value})} disabled={loginLocked} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          <input className="login-input" placeholder="Senha" type="password" value={loginForm.senha} onChange={e=>setLF({...loginForm,senha:e.target.value})} disabled={loginLocked} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          {loginErr && <p style={{color:'#E63946',fontSize:12,margin:'-2px 0',textAlign:'left',fontWeight:500}}>{loginErr}</p>}
          <button className="login-btn" type="submit" disabled={loginLocked} style={{width:'100%',padding:'13px',background:loginLocked?'#B5BCC6':'#20558A',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:600,fontSize:14,cursor:loginLocked?'not-allowed':'pointer',letterSpacing:'.2px',marginTop:6,boxShadow:loginLocked?'none':'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>
            {loginLocked ? 'Aguarde...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     RENDER — TROCAR SENHA
     ═══════════════════════════════════════════════ */
  if (changePw) return (
    <div style={{minHeight:'100vh',background:'#F5F7FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Geist',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",padding:20,position:'relative',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        @keyframes loginFadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cp-input:focus { background:#fff !important; border-color:#20558A !important; box-shadow:0 0 0 3px #EAF2FA !important; }
        .cp-input { transition: all .15s; }
        .cp-btn:hover { background:#173F69 !important; box-shadow:0 6px 16px rgba(32,85,138,.35); transform:translateY(-1px); }
        .cp-btn { transition: all .15s; }
      `}</style>
      <div style={{position:'absolute',top:'-200px',right:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(32,85,138,.09) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-200px',left:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(200,169,81,.08) 0%,transparent 70%)',pointerEvents:'none'}} />

      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 12px 32px rgba(16,24,40,.08),0 4px 8px rgba(16,24,40,.04)',border:'1px solid #E5E9EF',animation:'loginFadeIn .35s cubic-bezier(.16,1,.3,1)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#20558A 0%,#20558A 45%,#F15A24 55%,#F15A24 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite'}} />
        <div style={{width:56,height:56,borderRadius:14,background:'#EAF2FA',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',color:'#20558A'}}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:20,fontWeight:700,letterSpacing:'-.4px',marginBottom:6,color:'#1A2332'}}>Alterar Senha</h2>
        <p style={{fontSize:13,color:'#8B94A3',marginBottom:28}}>{user.primeiro_login ? 'Primeiro acesso — crie uma nova senha' : 'Trocar senha atual'}</p>
        <form onSubmit={doChangePw} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input className="cp-input" placeholder="Nova senha (mín. 8 caracteres, maiúscula + número)" type="password" value={newPw.nova} onChange={e=>setNP({...newPw,nova:e.target.value})} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          <input className="cp-input" placeholder="Confirmar nova senha" type="password" value={newPw.conf} onChange={e=>setNP({...newPw,conf:e.target.value})} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          {pwMsg && <p style={{color:'#E63946',fontSize:12,margin:'-2px 0',textAlign:'left',fontWeight:500}}>{pwMsg}</p>}
          <button className="cp-btn" type="submit" style={{width:'100%',padding:'13px',background:'#20558A',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:600,fontSize:14,cursor:'pointer',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)',marginTop:6}}>Salvar Nova Senha</button>
        </form>
        {!user.primeiro_login && <button onClick={()=>setCP(false)} style={{marginTop:16,background:'none',border:'none',color:'#8B94A3',cursor:'pointer',fontSize:13,fontWeight:500}}>Cancelar</button>}
      </div>
    </div>
  );

  if (loadError) return (
    <div className="pmx-load-error" role="alert">
      <div><span>!</span><h1>Não foi possível carregar o painel</h1><p>{loadError}</p><div><button onClick={()=>fetchAll(false)}>Tentar novamente</button><button onClick={doLogout}>Sair</button></div></div>
    </div>
  );

  if (loading) return (
    <div className="pmx-app-skeleton" role="status" aria-live="polite" aria-label="Carregando dados do painel">
      <aside><div className="pmx-skeleton pmx-skeleton--logo" />{Array.from({length:8}).map((_,i)=><div key={i} className="pmx-skeleton pmx-skeleton--nav" />)}</aside>
      <main><header><div className="pmx-skeleton pmx-skeleton--search" /><div className="pmx-skeleton pmx-skeleton--avatar" /></header><section><div className="pmx-skeleton pmx-skeleton--hero" /><div className="pmx-skeleton-grid">{Array.from({length:5}).map((_,i)=><div key={i} className="pmx-skeleton pmx-skeleton--card" />)}</div><div className="pmx-skeleton pmx-skeleton--table" /></section></main>
    </div>
  );

  /* ═══════════════════════════════════════════════
     RENDER — MAIN APP
     ═══════════════════════════════════════════════ */
  return (
    <div className={`pmx-theme-root ${tema === 'premix_escuro' ? 'pmx-theme-dark' : ''} density-${densidade}`} style={{minHeight:'100vh',background:T.bg,fontFamily:"'Geist',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",color:T.text1,fontSize:14,lineHeight:1.5,WebkitFontSmoothing:'antialiased',position:'relative'}}>
      <div style={{position:'relative',zIndex:1}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500;600&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translate(-50%,12px) } to { opacity:1; transform:translate(-50%,0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        .pmx-sidebar .sb-link:hover { background:rgba(255,255,255,.075) !important; color:#fff !important; }
        .pmx-sidebar .sb-link.active::before { content:''; position:absolute; left:-12px; top:50%; transform:translateY(-50%); width:3px; height:24px; background:#F15A24; border-radius:0 3px 3px 0; box-shadow:0 0 14px rgba(241,90,36,.42); }
        .pmx-row:hover { background:#F8F9FB; }
        .pmx-row { transition: background .12s; }
        .pmx-stat:hover { border-color:#D4D9E0 !important; box-shadow:0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04); transform:translateY(-1px); }
        .pmx-stat { transition: all .2s; }
        .pmx-act:hover { background:#fff !important; border-color:#D4D9E0 !important; transform:translateY(-1px); box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .pmx-act { transition: all .15s; }
        .pmx-act.primary:hover { background:#20558A !important; color:#fff !important; box-shadow:0 4px 8px rgba(32,85,138,.3) !important; }
        .pmx-act.danger:hover  { background:#E63946 !important; color:#fff !important; box-shadow:0 4px 8px rgba(230,57,70,.3) !important; }
        .pmx-cta:hover { background:#173F69 !important; box-shadow:0 4px 12px rgba(32,85,138,.35); transform:translateY(-1px); }
        .pmx-cta { transition: all .15s; }
        .pmx-icon-btn:hover { background:#F8F9FB; color:#1A2332 !important; }
        .pmx-icon-btn { transition: all .15s; }
        .pmx-subtab:hover { color:#1A2332 !important; }
        .pmx-subtab { transition: color .15s; }
        .pmx-search-input:focus { background:#fff !important; border-color:${T.primary} !important; box-shadow:0 0 0 3px ${T.primaryLight}; }
        .pmx-search-input { transition: all .15s; }
        .pmx-fade-in { animation: fadeIn .25s ease; }

        /* Scrollbars finas (Chromium/Webkit) */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 10px; border: 2px solid ${T.bg}; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.text3}; }
        /* Firefox */
        * { scrollbar-width: thin; scrollbar-color: ${T.border} ${T.bg}; }

        /* Focus states acessíveis */
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
          outline: 2px solid ${T.primary} !important;
          outline-offset: 2px !important;
          border-radius: 6px;
        }

        /* Responsivo: tablet e mobile */
        @media (max-width: 1024px) {
          .pmx-stats-5 { grid-template-columns: repeat(3, 1fr) !important; }
          .pmx-stats-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .pmx-stats-5, .pmx-stats-4 { grid-template-columns: 1fr !important; }
        }

        /* Theme overrides para sidebar, topbar, page-head — só os elementos com classe pmx-themed */
        .pmx-themed-bg { background: ${T.surface} !important; border-color: ${T.border} !important; }
        .pmx-themed-text { color: ${T.text1} !important; }
        .pmx-themed-muted { color: ${T.text2} !important; }
        .pmx-themed-faint { color: ${T.text3} !important; }
        .pmx-themed-surface2 { background: ${T.surface2} !important; }
        .pmx-sidebar .sb-link.active { background:rgba(255,255,255,.12) !important; color:#fff !important; }
        .pmx-sidebar .sb-link.active::before { background:${T.accent} !important; }
      `}</style>

      {/* Toast */}
      {toast && <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',background:'#1A2332',color:'#fff',padding:'12px 24px',borderRadius:10,fontSize:'.84rem',fontWeight:600,zIndex:9999,boxShadow:'0 12px 32px rgba(16,24,40,.18)',animation:'slideUp .3s cubic-bezier(.16,1,.3,1)'}}>{toast}</div>}

      {/* ══ APP LAYOUT: SIDEBAR + MAIN ══ */}
      <div className={`pmx-app-shell ${sidebarCol ? 'is-collapsed' : ''}`} style={{display:'grid',gridTemplateColumns: sidebarCol ? '72px 1fr' : '264px 1fr',minHeight:'100vh',transition:'grid-template-columns .2s ease'}}>

        {/* ── SIDEBAR ── */}
        <aside className={`pmx-sidebar pmx-sidebar--executive ${mobileNavOpen ? 'is-open' : ''}`} style={{background:T.sidebar,borderRight:'1px solid rgba(255,255,255,.08)',display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',zIndex:50}}>
          {/* Brand + Toggle */}
          <div className="pmx-sidebar__brand" style={{padding: sidebarCol ? '22px 14px 20px' : '22px 20px 20px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid rgba(255,255,255,.09)',justifyContent: sidebarCol ? 'center' : 'space-between'}}>
            {!sidebarCol && <div className="pmx-sidebar__identity"><img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" /><span>Central de Cadastros</span></div>}
            <button className="pmx-sidebar__toggle" onClick={()=>setSidebarCol(!sidebarCol)} title={sidebarCol ? 'Expandir menu' : 'Recolher menu'} style={{
              width:32,height:32,borderRadius:8,border:'1px solid '+T.border,background:T.surface2,
              color:T.text2,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='#F0F7FF';e.currentTarget.style.color='#2563EB';e.currentTarget.style.borderColor='#BFDBFE';}}
              onMouseLeave={e=>{e.currentTarget.style.background=T.surface2;e.currentTarget.style.color=T.text2;e.currentTarget.style.borderColor=T.border;}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{transform: sidebarCol ? 'rotate(180deg)' : 'rotate(0deg)',transition:'transform .2s'}}>
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="pmx-sidebar__nav" style={{padding:'16px 14px 0',flex:1,overflowY:'auto'}}>
            {!sidebarCol && <div className="pmx-sidebar__section-label">Operação</div>}
            {[
              { k:'dashboard', l:'Visão Geral', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg> },
              { k:'fila', l:'Fila Protheus', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><path d="m18 15 3 3-3 3"/></svg>, count: operationalQueue.length, alert: operationalQueue.some(i=>i._priority==='critica') },
              { k:'cadastros', l:'Cadastros', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>, count: forn.length + produtos.length + desbloqueios.length },
              { k:'kanban', l:'Gestão de Tarefas', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>, count: kanban.filter(k=>k.status!=='concluido').length },
              { k:'relatorios', l:'Relatórios', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg> },
              { k:'historico', l:'Histórico', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg> },
            ].map(n => {
              const active = page === n.k;
              return (
                <a key={n.k} onClick={()=>{ setPage(n.k); setSel(null); setShowModal(false); setMobileNavOpen(false); }} title={sidebarCol ? n.l : ''} className={'sb-link' + (active ? ' active' : '')} style={{
                  display:'flex',alignItems:'center',gap:11,padding: sidebarCol ? '10px 11px' : '9px 12px',borderRadius:8,
                  fontSize:13,fontWeight: active ? 600 : 500,
                  color: active ? T.primary : T.text2,
                  background: active ? T.primaryLight : 'transparent',
                  textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1,
                  justifyContent: sidebarCol ? 'center' : 'flex-start'
                }}>
                  {n.icon}
                  {!sidebarCol && <span style={{flex:1}}>{n.l}</span>}
                  {n.count > 0 && !sidebarCol && <span style={{fontWeight:700,fontSize:10,padding:'2px 7px',background: active ? T.primary : (n.alert ? '#D92D20' : '#EEF1F5'),color: (active || n.alert) ? '#fff' : T.text2,borderRadius:20,minWidth:22,textAlign:'center',fontFamily:'Geist,-apple-system,sans-serif'}}>{n.count}</span>}
                  {n.count > 0 && sidebarCol && <span style={{position:'absolute',top:4,right:4,minWidth:16,height:16,padding:'0 4px',background: n.alert ? '#D92D20' : T.primary,color:'#fff',borderRadius:20,fontSize:9,fontWeight:700,fontFamily:'Geist,-apple-system,sans-serif',display:'flex',alignItems:'center',justifyContent:'center'}}>{n.count}</span>}
                </a>
              );
            })}

            <a href="/pendencias" title={sidebarCol ? 'Pendências Fiscais' : ''} className="sb-link" style={{display:'flex',alignItems:'center',gap:11,padding: sidebarCol ? '10px 11px' : '9px 12px',borderRadius:8,fontSize:13,fontWeight:500,color:'#4F5868',textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1,justifyContent:sidebarCol?'center':'flex-start'}}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>
              {!sidebarCol && <span style={{flex:1}}>Pendências Fiscais</span>}
              {!sidebarCol && <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17 17 7M7 7h10v10"/></svg>}
            </a>

            {isAdmin && (<>
              {!sidebarCol && <div className="pmx-sidebar__section-label">Administração</div>}
              <a onClick={()=>{ setPage('admin'); setSel(null); setShowModal(false); setMobileNavOpen(false); }} title={sidebarCol ? 'Equipe' : ''} className={'sb-link' + (page==='admin' ? ' active' : '')} style={{
                display:'flex',alignItems:'center',gap:11,padding: sidebarCol ? '10px 11px' : '9px 12px',borderRadius:8,fontSize:13,
                fontWeight: page==='admin' ? 600 : 500,
                color: page==='admin' ? T.primary : T.text2,
                background: page==='admin' ? T.primaryLight : 'transparent',
                textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1,
                justifyContent: sidebarCol ? 'center' : 'flex-start'
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {!sidebarCol && <span style={{flex:1}}>Equipe</span>}
                {usuarios.length > 0 && !sidebarCol && <span style={{fontWeight:700,fontSize:10,padding:'2px 7px',background: page==='admin' ? T.primary : '#EEF1F5',color: page==='admin' ? '#fff' : '#4F5868',borderRadius:20,minWidth:22,textAlign:'center',fontFamily:'Geist,-apple-system,sans-serif'}}>{usuarios.length}</span>}
              </a>
            </>)}

            {!sidebarCol && <div className="pmx-sidebar__section-label pmx-sidebar__section-label--spaced">Sistema</div>}
            <a onClick={()=>{ setPage('aparencia'); setSel(null); setShowModal(false); setMobileNavOpen(false); }} title={sidebarCol ? 'Aparência' : ''} className={'sb-link' + (page==='aparencia' ? ' active' : '')} style={{display:'flex',alignItems:'center',gap:11,padding: sidebarCol ? '10px 11px' : '9px 12px',borderRadius:8,fontSize:13,fontWeight: page==='aparencia' ? 600 : 500,color: page==='aparencia' ? T.primary : T.text2,background: page==='aparencia' ? T.primaryLight : 'transparent',textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1,justifyContent: sidebarCol ? 'center' : 'flex-start'}}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              {!sidebarCol && <span style={{flex:1}}>Aparência</span>}
            </a>
          </nav>

          {/* Footer user */}
          <div className="pmx-sidebar__user" style={{padding: sidebarCol ? '14px 10px' : '16px 18px',borderTop:'1px solid rgba(255,255,255,.09)',display:'flex',alignItems:'center',gap:11,cursor:'pointer',position:'relative',justifyContent: sidebarCol ? 'center' : 'flex-start'}} onClick={()=>setShowLogout(!showLogout)} title={sidebarCol ? user.nome : ''}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#20558A 0%,#123D6B 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:12,color:'#fff',boxShadow:'0 4px 12px rgba(32,85,138,.25), inset 0 1px 0 rgba(255,255,255,.2)',flexShrink:0}}>{user.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
            {!sidebarCol && <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#FFFFFF',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.nome.split(' ').slice(0,2).join(' ')}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.58)'}}>{user.cargo}</div>
            </div>}
            {!sidebarCol && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8B94A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform: showLogout ? 'rotate(180deg)' : 'rotate(0)',transition:'.15s'}}><polyline points="6 9 12 15 18 9"/></svg>}
            {showLogout && (
              <div style={{position:'absolute',bottom:'calc(100% + 6px)',left: sidebarCol ? 8 : 14, right: sidebarCol ? -160 : 14,background:'#fff',borderRadius:10,boxShadow:'0 12px 32px rgba(16,24,40,.12),0 4px 8px rgba(16,24,40,.06)',border:'1px solid #E5E9EF',overflow:'hidden',zIndex:200, minWidth: sidebarCol ? 180 : 'auto'}}>
                <button onClick={(e)=>{e.stopPropagation();setCP(true);setShowLogout(false)}} style={menuItem()}>🔑 Trocar senha</button>
                <div style={{height:1,background:'#EEF1F5'}} />
                <button onClick={(e)=>{e.stopPropagation();doLogout()}} style={{...menuItem(),color:'#E63946'}}>↪ Sair</button>
              </div>
            )}
          </div>
        </aside>

        {mobileNavOpen && <button className="pmx-mobile-overlay" onClick={()=>setMobileNavOpen(false)} aria-label="Fechar menu" />}

        {/* ── MAIN ── */}
        <div className="pmx-main" style={{display:'flex',flexDirection:'column',minWidth:0}}>

          {/* TOPBAR */}
          <header className="pmx-themed-bg pmx-topbar pmx-topbar--executive" style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'0 32px',minHeight:72,display:'flex',alignItems:'center',gap:20,position:'sticky',top:0,zIndex:10}}>
            <div className="pmx-topbar__brand-line" style={{height:2,background:'linear-gradient(90deg,#20558A 0%,#20558A 62%,#F15A24 62%,#F15A24 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite',position:'absolute',top:0,left:0,right:0}} />

            <button className="pmx-mobile-menu" onClick={()=>setMobileNavOpen(true)} aria-label="Abrir menu">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="pmx-global-search pmx-global-search--executive" style={{flex:1,maxWidth:620,position:'relative'}}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8B94A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none',zIndex:1}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="pmx-search-input" type="text" placeholder="Buscar fornecedor, produto, código, CNPJ, e-mail..." value={searchGlobal} onChange={e=>setSearchGlobal(e.target.value)} onKeyDown={e=>{ if(e.key==='Escape') setSearchGlobal(''); }} style={{width:'100%',padding:'10px 14px 10px 38px',background:T.surface2,border:'1px solid transparent',borderRadius:8,fontFamily:'inherit',fontSize:13,color:T.text1,outline:'none'}} />
              {searchGlobal && (
                <button onClick={()=>setSearchGlobal('')} title="Limpar (Esc)" style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',width:22,height:22,borderRadius:'50%',background:'#E5E9EF',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#4F5868'}}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
              {/* Dropdown de resultados */}
              {searchGlobal && searchGlobalDeb.length >= 2 && (() => {
                const q = searchGlobalDeb.toLowerCase();
                const hitsForn = forn.filter(f => (f.razao_social||f.nome_completo||f.razao_social_atu||'').toLowerCase().includes(q) || (f.cnpj||f.cpf||f.cnpj_cpf_atu||'').includes(q) || (f.email||'').toLowerCase().includes(q) || (f.codigo_fornecedor||'').toLowerCase().includes(q)).slice(0,5);
                const hitsProd = produtos.filter(p => (p.descricao||'').toLowerCase().includes(q) || (p.codigo_protheus||'').toLowerCase().includes(q) || (p.ncm||'').includes(q)).slice(0,5);
                const hitsDesb = desbloqueios.filter(d => (d.nome_produto||'').toLowerCase().includes(q) || (d.codigo_produto||'').toLowerCase().includes(q)).slice(0,5);
                const total = hitsForn.length + hitsProd.length + hitsDesb.length;
                return (
                  <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'#fff',borderRadius:10,boxShadow:'0 12px 32px rgba(16,24,40,.12),0 4px 8px rgba(16,24,40,.06)',border:'1px solid #E5E9EF',overflow:'hidden',zIndex:300,maxHeight:480,overflowY:'auto'}}>
                    {total === 0 ? (
                      <div style={{padding:'24px 18px',textAlign:'center',color:'#8B94A3',fontSize:13}}>
                        Nada encontrado para "<strong style={{color:'#4F5868'}}>{searchGlobal}</strong>"
                      </div>
                    ) : (
                      <>
                        {hitsForn.length > 0 && (
                          <div>
                            <div style={{padding:'8px 14px',background:'#F8F9FB',fontSize:10,fontWeight:700,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid #E5E9EF'}}>Fornecedores ({hitsForn.length})</div>
                            {hitsForn.map(f => (
                              <button key={f.id} onClick={()=>{setSearchGlobal('');setPage('cadastros');setSubTab('fornecedores');openDetail(f);}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',width:'100%',border:'none',background:'#fff',cursor:'pointer',textAlign:'left',borderBottom:'1px solid #F4F6F8'}}
                                onMouseEnter={e=>e.currentTarget.style.background='#F8F9FB'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                <div style={{width:32,height:32,borderRadius:8,background: f.tipo_cadastro==='pf'?'#EDE9FE':f.tipo_cadastro==='motorista'?'#FEE2E2':f.tipo_cadastro==='atualizacao_bancaria'?'#FEF3C7':'#DBEAFE',color: f.tipo_cadastro==='pf'?'#7C3AED':f.tipo_cadastro==='motorista'?'#E63946':f.tipo_cadastro==='atualizacao_bancaria'?'#D97706':'#2563EB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  {f.tipo_cadastro==='pf' ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                                  : f.tipo_cadastro==='motorista' ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                  : f.tipo_cadastro==='atualizacao_bancaria' ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                                  : <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>}
                                </div>
                                <div style={{minWidth:0,flex:1}}>
                                  <div style={{fontSize:13,fontWeight:600,color:'#1A2332',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{f.razao_social || f.nome_completo || f.razao_social_atu}</div>
                                  <div style={{fontSize:11,color:'#8B94A3'}}>{f.cnpj || f.cpf} · {TL[f.tipo_cadastro] || 'PJ'}</div>
                                </div>
                                <span style={{padding:'2px 8px',borderRadius:20,fontSize:10,fontWeight:600,color: f.status==='aprovado'?'#008C44':f.status==='rejeitado'?'#E63946':f.status==='em_analise'?'#2563EB':'#D97706',background: f.status==='aprovado'?'#E6F7EE':f.status==='rejeitado'?'#FEE2E2':f.status==='em_analise'?'#DBEAFE':'#FEF3C7'}}>{ST[f.status]?.l || 'Pendente'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {hitsProd.length > 0 && (
                          <div>
                            <div style={{padding:'8px 14px',background:'#F8F9FB',fontSize:10,fontWeight:700,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid #E5E9EF'}}>Produtos ({hitsProd.length})</div>
                            {hitsProd.map(p => (
                              <button key={p.id} onClick={()=>{setSearchGlobal('');openOperationalItem({...p,_type:'produto'});}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',width:'100%',border:'none',background:'#fff',cursor:'pointer',textAlign:'left',borderBottom:'1px solid #F4F6F8'}}
                                onMouseEnter={e=>e.currentTarget.style.background='#F8F9FB'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                <div style={{width:32,height:32,borderRadius:8,background:'#FEF6E0',color:'#B8941F',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                                </div>
                                <div style={{minWidth:0,flex:1}}>
                                  <div style={{fontSize:13,fontWeight:600,color:'#1A2332',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.descricao || '(sem descrição)'}</div>
                                  <div style={{fontSize:11,color:'#8B94A3'}}>{p.codigo_protheus && `Cód ${p.codigo_protheus} · `}NCM {p.ncm || '—'}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {hitsDesb.length > 0 && (
                          <div>
                            <div style={{padding:'8px 14px',background:'#F8F9FB',fontSize:10,fontWeight:700,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px',borderBottom:'1px solid #E5E9EF'}}>Desbloqueios ({hitsDesb.length})</div>
                            {hitsDesb.map(d => (
                              <button key={d.id} onClick={()=>{setSearchGlobal('');openOperationalItem({...d,_type:'desbloqueio'});}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',width:'100%',border:'none',background:'#fff',cursor:'pointer',textAlign:'left',borderBottom:'1px solid #F4F6F8'}}
                                onMouseEnter={e=>e.currentTarget.style.background='#F8F9FB'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                <div style={{width:32,height:32,borderRadius:8,background:'#FEF3C7',color:'#B45309',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                </div>
                                <div style={{minWidth:0,flex:1}}>
                                  <div style={{fontSize:13,fontWeight:600,color:'#1A2332',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.nome_produto}</div>
                                  <div style={{fontSize:11,color:'#8B94A3'}}>Código {d.codigo_produto}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div style={{padding:'8px 14px',fontSize:11,color:'#8B94A3',background:'#F8F9FB',borderTop:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between'}}>
                          <span>{total} resultado{total!==1?'s':''}</span>
                          <span><kbd style={{padding:'1px 5px',background:'#fff',border:'1px solid #E5E9EF',borderRadius:3,fontSize:10,fontFamily:'Geist Mono,monospace'}}>Esc</kbd> para fechar</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
              {notifPermission === 'default' && (
                <button onClick={pedirPermissaoNotificacao} className="pmx-icon-btn" title="Ativar notificações do Windows" aria-label="Ativar notificações do Windows" style={{padding:'0 12px',height:36,borderRadius:8,background:T.primaryLight,border:`1px solid ${T.primary}33`,display:'flex',alignItems:'center',gap:6,color:T.primary,cursor:'pointer',fontSize:12,fontWeight:700,whiteSpace:'nowrap'}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  Ativar avisos do Windows
                </button>
              )}
              <button onClick={()=>fetchAll(true)} disabled={refreshing} className="pmx-icon-btn" title="Atualizar dados" aria-label="Atualizar dados" style={{width:36,height:36,borderRadius:8,background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#4F5868',cursor:refreshing?'wait':'pointer',opacity:refreshing?.65:1}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:refreshing?'pmxSpin .8s linear infinite':'none'}}><path d="M20 7h-5V2"/><path d="M20 2 16.5 5.5A8 8 0 1 0 20 12"/></svg>
              </button>
              <button onClick={()=>setShowNotifications(v=>!v)} className="pmx-icon-btn" title="Notificações" style={{width:36,height:36,borderRadius:8,background:showNotifications?T.primaryLight:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:showNotifications?T.primary:'#4F5868',cursor:'pointer',position:'relative'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                {notifications.length>0 && <span style={{position:'absolute',top:4,right:4,minWidth:15,height:15,borderRadius:20,background:'#F15A24',color:'#fff',fontSize:8,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 3px',border:'2px solid #fff'}}>{notifications.length}</span>}
              </button>
              <button onClick={()=>showToast('Use a busca global, a Fila Protheus e o Modo Protheus para localizar e copiar dados rapidamente.')} className="pmx-icon-btn" title="Ajuda rápida" style={{width:36,height:36,borderRadius:8,background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#4F5868',cursor:'pointer'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              </button>
            </div>
          </header>

          {showNotifications && (
            <div className="pmx-notification-panel">
              <div className="pmx-notification-panel__header">
                <div><span className="pmx-eyebrow">Central</span><h3>Notificações</h3></div>
                <button onClick={()=>setShowNotifications(false)} style={{width:28,height:28,borderRadius:8,border:'1px solid #E2E8F0',background:'#fff',cursor:'pointer',color:'#667085'}}>×</button>
              </div>
              <div className="pmx-notification-panel__body">
                {notifications.map(n => (
                  <button key={n.id} onClick={()=>{ if(n.item) openOperationalItem(n.item); else if(n.page) navigatePremium(n.page); }} className="pmx-notification-item" style={{width:'100%',border:'none',background:'transparent',textAlign:'left',cursor:'pointer'}}>
                    <i />
                    <span><strong>{n.title}</strong><p>{n.description}</p></span>
                  </button>
                ))}
                {notifications.length===0 && <div className="pmx-empty-inline">Nenhuma notificação crítica no momento.</div>}
              </div>
            </div>
          )}

      {page === 'dashboard' && (
        <OverviewDashboard
          fornecedores={forn}
          produtos={produtos}
          desbloqueios={desbloqueios}
          kanban={kanban}
          user={user}
          onNavigate={navigatePremium}
          onOpen={openOperationalItem}
        />
      )}

      {page === 'fila' && (
        <ProtheusQueue
          fornecedores={forn}
          produtos={produtos}
          desbloqueios={desbloqueios}
          usuarios={usuarios}
          onOpen={openOperationalItem}
          onToast={showToast}
        />
      )}

      {page === 'relatorios' && (
        <ReportsDashboard
          fornecedores={forn}
          produtos={produtos}
          desbloqueios={desbloqueios}
          kanban={kanban}
          usuarios={usuarios}
        />
      )}

      {page === 'historico' && (
        <HistoryTimeline
          fornecedores={forn}
          produtos={produtos}
          desbloqueios={desbloqueios}
          kanban={kanban}
          auditLog={auditLog}
        />
      )}

      {/* ══ PAGE: CADASTROS ══ */}
      {page === 'cadastros' && (
        <div className="pmx-fade-in pmx-cadastros-page">
          {/* Page Header (breadcrumb + title) */}
          <div className="pmx-themed-bg pmx-cadastros-header" style={{background:T.surface,padding:'24px 32px 18px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:'#8B94A3',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{cursor:'pointer'}}>Núcleo Fiscal</span>
              <span>›</span>
              <span style={{color:'#1A2332',fontWeight:500}}>Cadastros</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h1 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Cadastros</h1>
              <div style={{display:'flex',gap:8}}>
                <span style={{fontSize:12,color:'#8B94A3'}}>Dados atualizados nesta sessão</span>
                <span style={{width:8,height:8,borderRadius:'50%',background:T.primary,boxShadow:'0 0 0 4px rgba(32,85,138,.14)',alignSelf:'center'}} />
              </div>
            </div>
          </div>

          {/* Sub-tabs (estilo Bitrix: linha horizontal, underline) */}
          <div className="pmx-themed-bg pmx-cadastros-tabs" style={{background:T.surface,padding:'0 32px',borderBottom:`1px solid ${T.border}`,display:'flex',gap:0}}>
            {[
              { k:'fornecedores', l:'Fornecedores', n: forn.length, icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg> },
              { k:'produtos',     l:'Produtos',     n: produtos.length, icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg> },
              { k:'desbloqueios', l:'Desbloqueios', n: desbloqueios.length, icon:<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> },
            ].map(s => {
              const active = subTab === s.k;
              return (
                <button key={s.k} className="pmx-subtab" onClick={()=>{ setSubTab(s.k); setSel(null); setShowModal(false); setTab('pendentes'); }} style={{
                  position:'relative',padding:'14px 18px',background:'none',border:'none',
                  fontFamily:'inherit',fontSize:13,fontWeight: active ? 600 : 500,
                  color: active ? T.primary : T.text2,
                  cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8
                }}>
                  {s.icon}
                  <span>{s.l}</span>
                  <span style={{fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:10,padding:'1px 7px',background: active ? '#E6F7EE' : '#EEF1F5',color: active ? T.primary : T.text2,borderRadius:20,minWidth:20,textAlign:'center'}}>{s.n}</span>
                  {active && <span style={{position:'absolute',bottom:-1,left:12,right:12,height:2,background:'#20558A',borderRadius:'2px 2px 0 0'}} />}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="pmx-cadastros-content" style={{padding:'28px 32px 44px'}}>

          {/* ── Sub-aba: PRODUTOS ── */}
          {subTab === 'produtos' && (
            <div>
              {/* Stats Produtos */}
              <div className="pmx-stats-4" style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14,marginBottom:22}}>
                {[
                  { n: produtos.filter(p=>p.status==='pendente').length,   l:'Pendentes',  c:'#D97706', bg:'#FEF3C7', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                  { n: produtos.filter(p=>p.status==='em_analise').length, l:'Em análise', c:'#2563EB', bg:'#DBEAFE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> },
                  { n: produtos.filter(p=>p.status==='aprovado').length,   l:'Aprovados',  c:'#008C44', bg:'#E6F7EE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                  { n: produtos.filter(p=>p.status==='rejeitado').length,  l:'Devolvidos', c:'#E63946', bg:'#FEE2E2', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg> },
                ].map((s,i)=>(
                  <div key={i} className="pmx-stat" style={{background:'#fff',border:'1px solid #E5E9EF',borderRadius:10,padding:'16px 18px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:s.bg,color:s.c,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.icon}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px'}}>{s.l}</div>
                    </div>
                    <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Painel Produtos */}
              <div className="pmx-executive-panel" style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',margin:0}}>Cadastros de Produtos</h2>
                  <span style={{fontSize:12,color:'#8B94A3'}}>{produtos.length} total</span>
                </div>

                {produtos.length === 0 ? (
                  <div style={{textAlign:'center',padding:60}}>
                    <div style={{width:64,height:64,margin:'0 auto 14px',background:'#F8F9FB',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#B5BCC6'}}>
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </div>
                    <div style={{fontWeight:600,color:'#4F5868',fontSize:14}}>Nenhum cadastro de produto ainda</div>
                    <div style={{fontSize:12,color:'#8B94A3',marginTop:4}}>Os cadastros aparecem aqui quando enviados pelo formulário interno</div>
                  </div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={thS()}>Produto</th>
                        <th style={thS()}>Código</th>
                        <th style={thS()}>Solicitante</th>
                        <th style={thS()}>Status</th>
                        <th style={{...thS(),textAlign:'right'}}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtos.map(p => {
                        const st = ST[p.status] || ST.pendente;
                        const stColor = p.status==='aprovado'?'#008C44':p.status==='rejeitado'?'#E63946':p.status==='em_analise'?'#2563EB':'#D97706';
                        const stBg = p.status==='aprovado'?'#E6F7EE':p.status==='rejeitado'?'#FEE2E2':p.status==='em_analise'?'#DBEAFE':'#FEF3C7';
                        const isFinal = p.status === 'aprovado' || p.status === 'rejeitado';
                        return (
                          <tr key={p.id} className="pmx-row" onClick={()=>openOperationalItem({...p,_type:'produto'})} style={{borderBottom:'1px solid #E5E9EF',cursor:'pointer'}}>
                            <td style={tdSnew()}>
                              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                                <div style={{width:36,height:36,borderRadius:9,background:'#FEF6E0',color:'#B8941F',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                                </div>
                                <div style={{minWidth:0}}>
                                  <div style={{fontWeight:600,color:'#1A2332',fontSize:13,lineHeight:1.3}}>{(p.descricao||'').slice(0,120)}{p.descricao && p.descricao.length>120 ? '…' : ''}</div>
                                  <div style={{fontSize:11,color:'#8B94A3',marginTop:2,display:'flex',gap:8,flexWrap:'wrap'}}>
                                    {p.ncm && <span>NCM: <strong>{p.ncm}</strong></span>}
                                    {p.unidade_medida && <span>UN: <strong>{p.unidade_medida}</strong></span>}
                                  </div>
                                  {p.finalidade && <div style={{fontSize:11,color:'#4F5868',marginTop:2}}>{p.finalidade.slice(0,80)}</div>}
                                  {p.motivo_devolucao && <div style={{color:'#E63946',marginTop:3,fontSize:11}}>↩ {p.motivo_devolucao.slice(0,80)}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={tdSnew()}>
                              {p.codigo_protheus ? <span style={{fontFamily:'Geist Mono,monospace',fontSize:11,fontWeight:700,padding:'2px 8px',background:'#E6F7EE',color:'#008C44',borderRadius:5,letterSpacing:'.5px'}}>{p.codigo_protheus}</span> : <span style={{color:'#B5BCC6',fontSize:12}}>—</span>}
                            </td>
                            <td style={{...tdSnew(),fontSize:12,color:'#4F5868'}}>
                              {p.nome_solicitante}
                              <div style={{fontSize:11,color:'#8B94A3'}}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
                            </td>
                            <td style={tdSnew()}>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,color:stColor,background:stBg}}>
                                <span style={{width:6,height:6,borderRadius:'50%',background:stColor}} />
                                {st.l}
                              </span>
                            </td>
                            <td style={{...tdSnew(),textAlign:'right'}}>
                              {!isFinal ? (
                                <div style={{display:'inline-flex',gap:4}}>
                                  {p.status === 'pendente' && (
                                    <button className="pmx-act" onClick={(e)=>{e.stopPropagation();pegarProduto(p.id)}} title="Pegar para mim" style={actBtn()}>
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                                    </button>
                                  )}
                                  <button className="pmx-act primary" onClick={(e)=>{e.stopPropagation();openOperationalItem({...p,_type:'produto'});}} title="Concluir" style={actBtn('primary')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                  </button>
                                  {isAdmin && <button className="pmx-act danger" onClick={(e)=>{e.stopPropagation();excluirProduto(p.id)}} title="Excluir" style={actBtn('danger')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>}
                                </div>
                              ) : <span style={{color:'#B5BCC6',fontSize:12}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Sub-aba: DESBLOQUEIOS ── */}
          {subTab === 'desbloqueios' && (
            <div>
              {/* Stats Desbloqueios */}
              <div className="pmx-stats-4" style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14,marginBottom:22}}>
                {[
                  { n: desbloqueios.filter(d=>d.status==='pendente').length,     l:'Pendentes',     c:'#D97706', bg:'#FEF3C7', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                  { n: desbloqueios.filter(d=>d.status==='em_analise').length,   l:'Em análise',    c:'#2563EB', bg:'#DBEAFE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> },
                  { n: desbloqueios.filter(d=>d.status==='desbloqueado').length, l:'Desbloqueados', c:'#008C44', bg:'#E6F7EE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg> },
                  { n: desbloqueios.filter(d=>d.status==='rejeitado').length,    l:'Rejeitados',    c:'#E63946', bg:'#FEE2E2', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> },
                ].map((s,i)=>(
                  <div key={i} className="pmx-stat" style={{background:'#fff',border:'1px solid #E5E9EF',borderRadius:10,padding:'16px 18px',cursor:'pointer'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{width:32,height:32,borderRadius:8,background:s.bg,color:s.c,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.icon}</div>
                      <div style={{fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px'}}>{s.l}</div>
                    </div>
                    <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Painel Desbloqueios */}
              <div className="pmx-executive-panel" style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',margin:0}}>Pedidos de Desbloqueio</h2>
                  <span style={{fontSize:12,color:'#8B94A3'}}>{desbloqueios.length} total</span>
                </div>

                {desbloqueios.length === 0 ? (
                  <div style={{textAlign:'center',padding:60}}>
                    <div style={{width:64,height:64,margin:'0 auto 14px',background:'#F8F9FB',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#B5BCC6'}}>
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                    </div>
                    <div style={{fontWeight:600,color:'#4F5868',fontSize:14}}>Nenhum pedido de desbloqueio ainda</div>
                    <div style={{fontSize:12,color:'#8B94A3',marginTop:4}}>Os pedidos aparecem aqui quando enviados pelo formulário interno</div>
                  </div>
                ) : (
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        <th style={thS()}>Produto</th>
                        <th style={thS()}>Solicitante</th>
                        <th style={thS()}>Status</th>
                        <th style={{...thS(),textAlign:'right'}}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desbloqueios.map(d => {
                        const stColor = d.status==='desbloqueado'?'#008C44':d.status==='rejeitado'?'#E63946':d.status==='em_analise'?'#2563EB':'#D97706';
                        const stBg = d.status==='desbloqueado'?'#E6F7EE':d.status==='rejeitado'?'#FEE2E2':d.status==='em_analise'?'#DBEAFE':'#FEF3C7';
                        const statusLabel = d.status==='desbloqueado'?'Desbloqueado':d.status==='rejeitado'?'Rejeitado':d.status==='em_analise'?'Em análise':'Pendente';
                        const isFinal = d.status === 'desbloqueado' || d.status === 'rejeitado';
                        return (
                          <tr key={d.id} className="pmx-row" onClick={()=>openOperationalItem({...d,_type:'desbloqueio'})} style={{borderBottom:'1px solid #E5E9EF',cursor:'pointer'}}>
                            <td style={tdSnew()}>
                              <div style={{display:'flex',alignItems:'center',gap:12}}>
                                <div style={{width:36,height:36,borderRadius:9,background:'#FEF3C7',color:'#B45309',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                </div>
                                <div style={{minWidth:0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                                    <span style={{fontFamily:'Geist Mono,monospace',background:'#FEF3C7',color:'#B45309',padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:700}}>{d.codigo_produto}</span>
                                  </div>
                                  <div style={{fontWeight:600,color:'#1A2332',fontSize:13}}>{d.nome_produto}</div>
                                  {d.motivo_rejeicao && <div style={{color:'#E63946',marginTop:3,fontSize:11}}>↩ {d.motivo_rejeicao.slice(0,80)}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={{...tdSnew(),fontSize:12,color:'#4F5868'}}>
                              {d.nome_solicitante}
                              <div style={{fontSize:11,color:'#8B94A3'}}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
                            </td>
                            <td style={tdSnew()}>
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,color:stColor,background:stBg}}>
                                <span style={{width:6,height:6,borderRadius:'50%',background:stColor}} />
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{...tdSnew(),textAlign:'right'}}>
                              {!isFinal ? (
                                <div style={{display:'inline-flex',gap:4}}>
                                  {d.status === 'pendente' && (
                                    <button className="pmx-act" onClick={(e)=>{e.stopPropagation();pegarDesbloqueio(d.id)}} title="Pegar para mim" style={actBtn()}>
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                                    </button>
                                  )}
                                  <button className="pmx-act primary" onClick={(e)=>{e.stopPropagation();concluirDesbloqueio(d)}} title="Desbloquear" style={actBtn('primary')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                  </button>
                                  <button className="pmx-act danger" onClick={(e)=>{e.stopPropagation();setRejectUnlock(d);setRejectUnlockReason('');}} title="Rejeitar" style={actBtn('danger')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                                  </button>
                                  {isAdmin && <button className="pmx-act" onClick={(e)=>{e.stopPropagation();excluirDesbloqueio(d.id)}} title="Excluir" style={actBtn()}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>}
                                </div>
                              ) : <span style={{color:'#B5BCC6',fontSize:12}}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Sub-aba: FORNECEDORES (conteúdo existente) ── */}
          {subTab === 'fornecedores' && (<>
          {/* Stats — estilo Bitrix denso */}
          <div className="pmx-stats-5" style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:14,marginBottom:22}}>
            {[
              { n: pend.filter(f=>f.status==='pendente').length,   l:'Pendentes',  c:'#D97706', bg:'#FEF3C7', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { n: pend.filter(f=>f.status==='em_analise').length, l:'Em análise', c:'#2563EB', bg:'#DBEAFE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> },
              { n: done.filter(f=>f.status==='aprovado').length,   l:'Concluídos', c:'#008C44', bg:'#E6F7EE', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
              { n: done.filter(f=>f.status==='rejeitado').length,  l:'Devolvidos', c:'#E63946', bg:'#FEE2E2', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg> },
              { n: forn.length,                                     l:'Total',      c:'#B8941F', bg:'#FEF6E0', icon:<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></svg> },
            ].map((s,i) => (
              <div key={i} className="pmx-stat" style={{background:'#fff',border:'1px solid #E5E9EF',borderRadius:10,padding:'16px 18px',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                  <div style={{width:32,height:32,borderRadius:8,background:s.bg,color:s.c,display:'flex',alignItems:'center',justifyContent:'center'}}>{s.icon}</div>
                  <div style={{fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px'}}>{s.l}</div>
                </div>
                <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
              </div>
            ))}
          </div>

          {/* Painel principal: tabs + filtros + lista */}
          <div className="pmx-executive-panel" style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',borderBottom:'1px solid #E5E9EF',padding:'0 20px'}}>
              {[
                { k:'pendentes', l:'Tarefas', n:pend.length },
                { k:'concluidos', l:'Concluídos & Devolvidos', n:done.length }
              ].map(t => {
                const active = tab === t.k;
                return (
                  <button key={t.k} className="pmx-subtab" onClick={()=>{setTab(t.k);setSel(null);setShowModal(false)}} style={{
                    position:'relative',padding:'14px 16px',background:'none',border:'none',
                    fontFamily:'inherit',fontSize:13,fontWeight: active ? 600 : 500,
                    color: active ? T.primary : T.text2,
                    cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7
                  }}>
                    {t.l}
                    <span style={{fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:10,padding:'1px 7px',background: active ? '#E6F7EE' : '#EEF1F5',color: active ? T.primary : T.text2,borderRadius:20}}>{t.n}</span>
                    {active && <span style={{position:'absolute',bottom:-1,left:12,right:12,height:2,background:'#20558A'}} />}
                  </button>
                );
              })}
            </div>
            <div style={{padding:'12px 20px',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',borderBottom:'1px solid #E5E9EF',background:'#F8F9FB'}}>
              <div style={{position:'relative',flex:'1 1 280px',maxWidth:400}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8B94A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="pmx-search-input" placeholder="Buscar nome, CNPJ, e-mail..." value={tab==='pendentes'?search:searchDone} onChange={e=>tab==='pendentes'?setSearch(e.target.value):setSearchDone(e.target.value)} style={{width:'100%',padding:'8px 12px 8px 34px',background:'#fff',border:'1px solid #E5E9EF',borderRadius:8,fontFamily:'inherit',fontSize:13,color:'#1A2332',outline:'none'}} />
              </div>
              <select value={filterTipo} onChange={e=>setFilterTipo(e.target.value)} style={selectStyle()}>
                <option value="todos">Todos os tipos</option>
                <option value="pj">PJ</option><option value="pf">PF</option><option value="motorista">Motorista</option><option value="atualizacao_bancaria">Atualização Bancária</option>
              </select>
              <select value={filterAssign} onChange={e=>setFilterAssign(e.target.value)} style={selectStyle()}>
                <option value="todos">Todos os responsáveis</option>
                <option value="">Sem responsável</option>
                {usuarios.map(u => <option key={u.id} value={u.nome}>{u.nome}</option>)}
              </select>
            </div>

          {/* Lista de Cadastros — tabela densa estilo Bitrix */}
          <div style={{minHeight:300}}>
            {loading ? (
              <div style={{textAlign:'center',padding:80,color:'#8B94A3'}}>
                <div style={{fontSize:13,marginBottom:8}}>Carregando cadastros...</div>
              </div>
            ) : (tab==='pendentes' ? listPend : listDone).length === 0 ? (
              <div style={{textAlign:'center',padding:80}}>
                <div style={{width:64,height:64,margin:'0 auto 14px',background:'#F8F9FB',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',color:'#B5BCC6'}}>
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <div style={{fontWeight:600,color:'#4F5868',fontSize:14}}>Nenhum cadastro encontrado</div>
                <div style={{fontSize:12,color:'#8B94A3',marginTop:4}}>Ajuste os filtros ou aguarde novos envios</div>
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={thS()}>Solicitante</th>
                    <th style={thS()}>Documento</th>
                    <th style={thS()}>Recebido</th>
                    <th style={thS()}>Status</th>
                    <th style={thS()}>Responsável</th>
                    <th style={{...thS(),textAlign:'right'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {(tab==='pendentes' ? listPend : listDone).map(f => {
                    const st = ST[f.status] || ST.pendente;
                    const stColor = f.status==='aprovado'?'#008C44':f.status==='rejeitado'?'#E63946':f.status==='em_analise'?'#2563EB':'#D97706';
                    const stBg = f.status==='aprovado'?'#E6F7EE':f.status==='rejeitado'?'#FEE2E2':f.status==='em_analise'?'#DBEAFE':'#FEF3C7';
                    const tipoColors = { pf:{bg:'#EDE9FE',c:'#7C3AED'}, motorista:{bg:'#FEE2E2',c:'#E63946'}, atualizacao_bancaria:{bg:'#FEF3C7',c:'#B45309'}, default:{bg:'#DBEAFE',c:'#2563EB'} };
                    const tipo = tipoColors[f.tipo_cadastro] || tipoColors.default;
                    const tipoIcon = f.tipo_cadastro==='pf'
                      ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      : f.tipo_cadastro==='motorista'
                      ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      : f.tipo_cadastro==='atualizacao_bancaria'
                      ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                      : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>;
                    return (
                      <tr key={f.id} className="pmx-row" onClick={()=>openDetail(f)} style={{borderBottom:'1px solid #E5E9EF',cursor:'pointer',background: sel?.id===f.id ? '#F0FDF4' : 'transparent'}}>
                        <td style={tdSnew()}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:36,height:36,borderRadius:9,background:tipo.bg,color:tipo.c,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{tipoIcon}</div>
                            <div style={{minWidth:0}}>
                              <div style={{fontWeight:600,color:'#1A2332',fontSize:13,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                {sanitize(f.razao_social || f.nome_completo || f.razao_social_atu || 'Sem nome')}
                                <span style={{display:'inline-block',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',padding:'1px 6px',borderRadius:3,background:tipo.bg,color:tipo.c}}>{TL[f.tipo_cadastro]||'PJ'}</span>
                              </div>
                              <div style={{fontSize:11,color:'#8B94A3',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:280}}>{f.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{...tdSnew(),fontFamily:'Geist Mono,SF Mono,Consolas,monospace',fontSize:12,color:'#4F5868'}}>{f.cnpj || f.cpf || '-'}</td>
                        <td style={{...tdSnew(),color:'#4F5868',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(f.created_at)}</td>
                        <td style={tdSnew()}>
                          <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,color:stColor,background:stBg}}>
                            <span style={{width:6,height:6,borderRadius:'50%',background:stColor}} />
                            {st.l}
                          </span>
                        </td>
                        <td style={tdSnew()}>
                          {f.atribuido_para ? (
                            <div style={{display:'flex',alignItems:'center',gap:7}}>
                              <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#20558A,#173F69)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:10,color:'#fff'}}>{f.atribuido_para.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                              <span style={{fontSize:12,color:'#4F5868'}}>{f.atribuido_para.split(' ')[0]}</span>
                            </div>
                          ) : (
                            <span style={{color:'#B5BCC6',fontStyle:'italic',fontSize:12}}>Sem responsável</span>
                          )}
                        </td>
                        <td style={{...tdSnew(),textAlign:'right'}}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#B5BCC6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display:'inline-block'}}><polyline points="9 18 15 12 9 6"/></svg>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </div>{/* end panel */}
          </>)}{/* fim sub-aba fornecedores */}
          </div>{/* end content padding */}
        </div>
      )}

      {showModal && sel && ['produto','desbloqueio'].includes(sel._type) && (
        <RecordDrawer
          record={sel}
          type={sel._type}
          collection={sel._type==='produto' ? produtos : desbloqueios}
          onClose={closeDetail}
          onTake={sel._type==='produto' ? pegarProduto : pegarDesbloqueio}
          onComplete={sel._type==='produto' ? (record, code)=>{ concluirProduto(record, code); closeDetail(); } : (record)=>{ concluirDesbloqueio(record); closeDetail(); }}
          onDelete={sel._type==='produto' ? excluirProduto : excluirDesbloqueio}
          isAdmin={isSubAdmin}
          onToast={showToast}
        />
      )}

      {/* ══ MODAL CENTRAL — DETALHE DO CADASTRO ══ */}
      {showModal && sel && (!sel._type || sel._type === 'fornecedor') && (
        <div className="pmx-detail-overlay" onClick={e=>{if(e.target===e.currentTarget)closeDetail()}}>
          <div className="pmx-detail-drawer">
            {/* Header */}
            <div style={{padding:'18px 24px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,background:'linear-gradient(180deg,#F8F9FB 0%,#fff 100%)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:11,background: sel.tipo_cadastro==='pf'?'#EDE9FE':sel.tipo_cadastro==='motorista'?'#FEE2E2':sel.tipo_cadastro==='atualizacao_bancaria'?'#FEF3C7':'#DBEAFE', color: sel.tipo_cadastro==='pf'?'#7C3AED':sel.tipo_cadastro==='motorista'?'#E63946':sel.tipo_cadastro==='atualizacao_bancaria'?'#B45309':'#2563EB', display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {sel.tipo_cadastro==='pf'
                    ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    : sel.tipo_cadastro==='motorista'
                    ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    : sel.tipo_cadastro==='atualizacao_bancaria'
                    ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>
                    : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>}
                </div>
                <div>
                  <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:16,fontWeight:700,color:'#1A2332',margin:0,letterSpacing:'-.3px'}}>{sanitize(sel.razao_social || sel.nome_completo || sel.razao_social_atu || 'Atualização bancária')}</h2>
                  <span style={{fontSize:12,color:'#8B94A3'}}>{TL[sel.tipo_cadastro]||'PJ'} · {fmtDate(sel.created_at)}</span>
                </div>
              </div>
              <button className="pmx-icon-btn" onClick={closeDetail} style={{width:36,height:36,borderRadius:8,border:'1px solid #E5E9EF',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#8B94A3'}}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div style={{padding:'13px 22px',borderBottom:'1px solid #E2E8F0',background:'#fff'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:18,alignItems:'center'}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#8490A3',marginBottom:6}}><span>Dados recebidos para o Protheus</span><strong style={{color:'#20558A'}}>{getCompleteness(sel,'fornecedor').percent}%</strong></div>
                  <div style={{height:6,background:'#E9EEF4',borderRadius:20,overflow:'hidden'}}><span style={{display:'block',height:'100%',width:`${getCompleteness(sel,'fornecedor').percent}%`,background:'linear-gradient(90deg,#20558A,#4B83B5)',borderRadius:20}} /></div>
                </div>
                <button onClick={()=>copySupplierRecord(sel)} style={{padding:'9px 13px',borderRadius:9,border:'1px solid #C7DAED',background:'#EAF2FA',color:'#20558A',fontSize:11,fontWeight:700,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7}}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
                  Copiar todos os dados
                </button>
              </div>
            </div>
            <div className="pmx-drawer-tabs">
              <button className={detailMode==='protheus'?'active':''} onClick={()=>{setDetailMode('protheus');document.getElementById('pmx-protheus-data')?.scrollIntoView({behavior:'smooth'})}}>Dados Protheus</button>
              <button className={detailMode==='documentos'?'active':''} onClick={()=>{setDetailMode('documentos');document.getElementById('pmx-docs')?.scrollIntoView({behavior:'smooth'})}}>Documentos</button>
              <button className={detailMode==='observacoes'?'active':''} onClick={()=>{setDetailMode('observacoes');document.getElementById('pmx-obs')?.scrollIntoView({behavior:'smooth'})}}>Observações</button>
              <button className={detailMode==='historico'?'active':''} onClick={()=>{setDetailMode('historico');document.getElementById('pmx-history')?.scrollIntoView({behavior:'smooth'})}}>Histórico</button>
            </div>

            {/* Scrollable Body */}
            <div style={{padding:'22px 24px',overflowY:'auto',flex:1,background:'#F7F9FC'}}>
              {/* Ações principais */}
              <div style={{display:'flex',gap:8,marginBottom:18,flexWrap:'wrap'}}>
                {sel.status==='pendente' && !sel.atribuido_para && (
                  <button onClick={()=>assignTo(sel.id,user.nome)} disabled={saving} style={modalActBtn('primary')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                    Pegar para mim
                  </button>
                )}
                {(sel.status==='pendente'||sel.status==='em_analise') && <>
                  <button onClick={()=>setShowAssign(true)} disabled={saving} style={modalActBtn('info')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="m19 8 3 3-3 3"/></svg>
                    Direcionar
                  </button>
                  <button onClick={()=>setShowConcluir(true)} disabled={saving} style={modalActBtn('primary')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Concluir
                  </button>
                  <button onClick={()=>setShowDev(true)} disabled={saving} style={modalActBtn('danger')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                    Devolver
                  </button>
                </>}
                {isSubAdmin && (
                  <button onClick={()=>deleteForn(sel.id)} style={{...modalActBtn('danger'),marginLeft:'auto'}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Excluir
                  </button>
                )}
              </div>

              {/* Assign Panel */}
              {showAssign && (
                <div style={{padding:16,background:'#fff',borderRadius:10,marginBottom:16,border:'1px solid #BFDBFE',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#2563EB',marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Direcionar para</div>
                  <div style={{display:'grid',gap:6}}>
                    {usuarios.filter(u=>u.ativo).map(u => (
                      <button key={u.id} onClick={()=>assignTo(sel.id,u.nome)} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #E5E9EF',background:'#fff',cursor:'pointer',textAlign:'left',fontSize:13,fontFamily:'inherit',transition:'.15s',display:'flex',alignItems:'center',gap:10}}
                        onMouseEnter={e=>e.currentTarget.style.background='#F0F7FF'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:11}}>{u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                        <div style={{flex:1}}><strong style={{color:'#1A2332'}}>{u.nome}</strong> <span style={{color:'#8B94A3',fontSize:12}}>— {u.cargo}</span></div>
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>setShowAssign(false)} style={{marginTop:8,background:'none',border:'none',color:'#8B94A3',cursor:'pointer',fontSize:12,fontWeight:500}}>Cancelar</button>
                </div>
              )}

              {/* Devolutiva — motivo + campos a corrigir + link único */}
              {showDev && (
                <div style={{padding:18,background:'#fff',borderRadius:12,marginBottom:16,border:'1px solid #FECACA',boxShadow:'0 1px 2px rgba(230,57,70,.06)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div style={{width:32,height:32,borderRadius:8,background:'#DC2626',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.9rem',color:'#fff'}}>↩</div>
                    <div style={{fontSize:'.88rem',fontWeight:700,color:'#DC2626'}}>Devolver para Correção</div>
                  </div>
                  <div style={{fontSize:'.72rem',color:'#64748b',marginBottom:14}}>
                    Para: <strong style={{color:'#0f172a'}}>{sel.email_solicitante || sel.email || '(sem e-mail)'}</strong>
                    {!sel.email_solicitante && sel.email && (
                      <span style={{marginLeft:8,padding:'1px 6px',background:'#fef3c7',color:'#92400e',borderRadius:4,fontSize:'.65rem',fontWeight:600}}>⚠ Cadastro antigo — usando e-mail da empresa</span>
                    )}
                  </div>

                  {/* 1. Motivo pré-definido */}
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:'.7rem',fontWeight:700,color:'#991B1B',textTransform:'uppercase',letterSpacing:'.3px',marginBottom:6,display:'block'}}>1. Motivo da devolução *</label>
                    <select value={devMotivoSel} onChange={e => {
                      const m = e.target.value;
                      setDevMotivoSel(m);
                      // Auto-preenche campos a corrigir com base no motivo
                      setDevCampos(MOTIVO_CAMPOS[m] || []);
                    }} style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #FECACA',fontSize:'.84rem',outline:'none',fontFamily:'inherit',background:'#fff',color:'#0f172a'}}>
                      <option value="">— Selecione um motivo —</option>
                      {DEV_MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* 2. Campos a corrigir (checkboxes) */}
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:'.7rem',fontWeight:700,color:'#991B1B',textTransform:'uppercase',letterSpacing:'.3px',marginBottom:6,display:'block'}}>2. Campos que precisam ser corrigidos</label>
                    <div style={{fontSize:'.7rem',color:'#94a3b8',marginBottom:8}}>Marque os campos. O link enviado ao solicitante mostrará apenas estes campos para correção.</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:6,background:'#fff',padding:10,borderRadius:8,border:'1px solid #FECACA',maxHeight:200,overflowY:'auto'}}>
                      {Object.entries(CAMPO_LABELS).map(([key, label]) => {
                        const checked = devCampos.includes(key);
                        return (
                          <label key={key} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px',borderRadius:6,cursor:'pointer',background:checked?'#FEF2F2':'transparent',fontSize:'.75rem',color:checked?'#991B1B':'#475569'}}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              setDevCampos(prev => checked ? prev.filter(c => c !== key) : [...prev, key]);
                            }} style={{accentColor:'#DC2626',cursor:'pointer'}} />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Observação adicional */}
                  <div style={{marginBottom:14}}>
                    <label style={{fontSize:'.7rem',fontWeight:700,color:'#991B1B',textTransform:'uppercase',letterSpacing:'.3px',marginBottom:6,display:'block'}}>3. Observação adicional (opcional)</label>
                    <textarea value={devMsg} onChange={e=>setDevMsg(e.target.value)} placeholder="Detalhes específicos sobre o problema..." style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #FECACA',fontSize:'.84rem',minHeight:60,resize:'vertical',outline:'none',fontFamily:'inherit',background:'#fff'}} />
                  </div>

                  {/* Preview rápido */}
                  {(devMotivoSel || devMsg) && (
                    <div style={{background:'#fff',padding:12,borderRadius:8,border:'1px dashed #FECACA',marginBottom:14,fontSize:'.78rem',color:'#475569'}}>
                      <div style={{fontSize:'.65rem',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.3px',marginBottom:4}}>Preview do que o solicitante verá</div>
                      <div><strong>Motivo:</strong> {devMotivoSel || '(sem motivo)'}</div>
                      {devMsg && <div style={{marginTop:4}}><strong>Observação:</strong> {devMsg}</div>}
                      <div style={{marginTop:4}}><strong>Campos a corrigir:</strong> {devCampos.length > 0 ? devCampos.map(c => CAMPO_LABELS[c] || c).join(', ') : '(nenhum específico)'}</div>
                    </div>
                  )}

                  <div style={{display:'flex',gap:8}}>
                    <button onClick={sendDevolutiva} disabled={devSending || !devMotivoSel && !devMsg.trim()} style={{
                      flex:1,padding:'12px',borderRadius:10,border:'none',
                      background: (devSending || (!devMotivoSel && !devMsg.trim())) ? '#94a3b8' : '#DC2626',
                      color:'#fff',fontFamily:'inherit',fontSize:'.82rem',fontWeight:700,
                      cursor: (devSending || (!devMotivoSel && !devMsg.trim())) ? 'not-allowed' : 'pointer',
                      transition:'.15s'
                    }}>
                      {devSending ? '⏳ Enviando...' : '↩ Devolver e Enviar E-mail'}
                    </button>
                    <button onClick={()=>{setShowDev(false);setDevMotivoSel('');setDevMsg('');setDevCampos([])}} style={{padding:'12px 20px',borderRadius:10,border:'1px solid #FECACA',background:'#fff',fontFamily:'inherit',fontSize:'.82rem',fontWeight:500,cursor:'pointer',color:'#94a3b8'}}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* Painel Concluir — só código (e-mail vem do cadastro) */}
              {showConcluir && (
                <div style={{padding:20,background:'#fff',borderRadius:12,marginBottom:16,border:'1px solid #C9DCEE',boxShadow:'0 1px 2px rgba(32,85,138,.07)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <div style={{width:32,height:32,borderRadius:8,background:'#20558A',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332'}}>Concluir Cadastro</div>
                  </div>
                  <div style={{fontSize:12,color:'#8B94A3',marginBottom:16,paddingLeft:42}}>Informe o código gerado pelo sistema. O e-mail será enviado para o solicitante automaticamente.</div>

                  <div style={{display:'grid',gap:12}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'#008C44',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:5,display:'block'}}>Código do Fornecedor *</label>
                      <input value={concluirData.codigo} onChange={e=>setConcluirData({...concluirData,codigo:e.target.value})} placeholder="Ex: FORN-00451" style={{width:'100%',padding:'12px 14px',borderRadius:9,border:'1px solid #C9DCEE',fontSize:14,fontWeight:600,outline:'none',fontFamily:'Geist Mono,SF Mono,Consolas,monospace',background:'#F0FDF4',letterSpacing:'.5px',color:'#1A2332'}} autoFocus />
                    </div>

                    {/* Dados do solicitante (vindos do cadastro) */}
                    <div style={{background:'#F8F9FB',borderRadius:9,border:'1px solid #E5E9EF',padding:12}}>
                      <div style={{fontSize:10,color:'#8B94A3',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Será enviado para</div>
                      {(sel?.email_solicitante) ? (
                        <div style={{fontSize:13,color:'#1A2332',display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#20558A,#173F69)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:12}}>{(sel.nome_solicitante || 'S').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                          <div>
                            <div style={{fontWeight:600}}>{sel.nome_solicitante || 'Solicitante'}</div>
                            <div style={{color:'#8B94A3',fontSize:12,marginTop:1}}>{sel.email_solicitante}</div>
                          </div>
                        </div>
                      ) : (
                        <div style={{fontSize:12,color:'#E63946',background:'#FEE2E2',padding:'8px 12px',borderRadius:6,border:'1px solid #FECACA',display:'flex',alignItems:'flex-start',gap:8}}>
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span>Este cadastro não tem e-mail do solicitante (cadastro antigo). Não será possível enviar o e-mail automaticamente.</span>
                        </div>
                      )}
                    </div>

                    {/* Preview do e-mail */}
                    <div style={{background:'#fff',borderRadius:9,border:'1px solid #E5E9EF',padding:14}}>
                      <div style={{fontSize:10,color:'#8B94A3',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Pré-visualização do e-mail</div>
                      <div style={{fontSize:13,color:'#1A2332',lineHeight:1.6}}>
                        <p>Olá{sel?.nome_solicitante ? ` ${sel.nome_solicitante}` : ''},</p>
                        <p style={{marginTop:6}}>O cadastro de fornecedor que você solicitou foi concluído com sucesso!</p>
                        <div style={{margin:'12px 0',padding:'14px 18px',background:'linear-gradient(135deg,#F0FDF4 0%,#DCFCE7 100%)',borderRadius:9,border:'1.5px solid #86EFAC',textAlign:'center'}}>
                          <div style={{fontSize:10,color:'#008C44',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>Código de Fornecedor Premix</div>
                          <div style={{fontFamily:'Geist Mono,monospace',fontSize:20,fontWeight:800,color:'#008C44',letterSpacing:'1.5px'}}>{concluirData.codigo || '—'}</div>
                        </div>
                        <p style={{fontSize:12,color:'#8B94A3',marginTop:8}}>Em caso de dúvidas, entre em contato com o Núcleo Fiscal.</p>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:10,marginTop:4}}>
                      <button onClick={concluirCadastro} disabled={sendingEmail || !sel?.email_solicitante} style={{flex:1,padding:'13px',borderRadius:10,border:'none',background: (sendingEmail || !sel?.email_solicitante) ? '#B5BCC6' : '#20558A',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:14,cursor: (sendingEmail || !sel?.email_solicitante) ? 'not-allowed' : 'pointer',transition:'.15s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow: (sendingEmail || !sel?.email_solicitante) ? 'none' : '0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>
                        {sendingEmail ? (
                          <>⏳ Enviando...</>
                        ) : (
                          <><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Concluir e Enviar E-mail</>
                        )}
                      </button>
                      <button onClick={()=>{setShowConcluir(false);setConcluirData({codigo:''})}} style={{padding:'13px 22px',borderRadius:10,border:'1px solid #E5E9EF',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:14,cursor:'pointer',color:'#4F5868'}}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Badges */}
              {sel.atribuido_para && (
                <div style={{padding:'10px 14px',background:'#fff',border:'1px solid #BFDBFE',borderRadius:9,fontSize:13,marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:10,flexShrink:0}}>{sel.atribuido_para.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                  <span style={{color:'#4F5868'}}>Responsável: <strong style={{color:'#1A2332'}}>{sel.atribuido_para}</strong>{sel.finalizado_por && <span style={{color:'#8B94A3'}}> · Finalizado por: <strong style={{color:'#008C44'}}>{sel.finalizado_por}</strong></span>}</span>
                </div>
              )}
              {sel.motivo_devolucao && (
                <div style={{padding:'12px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:9,fontSize:13,marginBottom:12,display:'flex',gap:10}}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                  <div style={{color:'#991B1B'}}><strong>Motivo da devolução:</strong> {sanitize(sel.motivo_devolucao)}</div>
                </div>
              )}

              <div id="pmx-protheus-data" style={{scrollMarginTop:16}} />
              {getDuplicateCandidates(sel, 'fornecedor', forn).length > 0 && (
                <div className="pmx-duplicate-alert">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2"/></svg>
                  <div><strong>Possível cadastro duplicado</strong><p>Confira antes de lançar no Protheus: {getDuplicateCandidates(sel, 'fornecedor', forn).slice(0,3).map(item=>item.razao_social || item.nome_completo || item.nome_fantasia).join(', ')}.</p></div>
                </div>
              )}
              {/* Todos os dados recebidos são necessários para o cadastro no Protheus. */}
              <DataSection
                title="Dados recebidos para o Protheus"
                icon=""
                items={fieldsForType(sel, 'fornecedor')}
                onCopy={cp}
              />

              {/* Documentos */}
              <div id="pmx-docs" style={{marginBottom:20,scrollMarginTop:16}}>
                <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:13,fontWeight:700,color:'#1A2332',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#20558A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Documentos anexados
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[[sel.comprovante_cnpj_url,'CNPJ'],[sel.contrato_social_url,'Contrato Social'],[sel.comprovante_bancario_url,'Comp. Bancário'],[sel.comprovante_bancario_atu_url,'Comp. Bancário (atualização)'],[sel.documento_identidade_url,'Doc. Identidade']].filter(([u])=>u).map(([u,l],i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer noopener" style={{padding:'9px 14px',background:'#fff',borderRadius:8,color:'#2563EB',fontSize:12,fontWeight:600,textDecoration:'none',transition:'.15s',border:'1px solid #BFDBFE',display:'inline-flex',alignItems:'center',gap:7,boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='#F0F7FF';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 8px rgba(37,99,235,.15)';}} onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 2px rgba(16,24,40,.04)';}}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {l}
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  ))}
                  {![[sel.comprovante_cnpj_url],[sel.contrato_social_url],[sel.comprovante_bancario_url],[sel.comprovante_bancario_atu_url],[sel.documento_identidade_url]].some(([u])=>u) && <span style={{fontSize:13,color:'#8B94A3',fontStyle:'italic'}}>Nenhum documento anexado</span>}
                </div>
              </div>

              <section id="pmx-history" className="pmx-data-block" style={{scrollMarginTop:16}}>
                <header><div><span className="pmx-eyebrow">Governança</span><h3>Histórico do cadastro</h3></div></header>
                <div className="pmx-record-timeline" style={{padding:16}}>
                  <div><i className="success"/><span><strong>Solicitação recebida</strong><small>{sel.created_at ? new Date(sel.created_at).toLocaleString('pt-BR') : 'Data não informada'}</small></span></div>
                  {auditLog
                    .filter(l => l.cadastro_id === sel.id)
                    .slice()
                    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
                    .map(l => {
                      const quando = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '';
                      const quem = l.ator_nome || l.ator_email || 'Sistema';
                      const map = {
                        atribuiu:     { cls:'info',    titulo:`Atribuído por ${quem}`, sub: l.detalhes?.para ? `Responsável: ${l.detalhes.para}` : null },
                        aprovou:      { cls:'success', titulo:`Aprovado por ${quem}`, sub: l.detalhes?.codigo ? `Código Protheus: ${l.detalhes.codigo}` : null },
                        rejeitou:     { cls:'danger',  titulo:`Devolvido por ${quem}`, sub: l.detalhes?.motivo || null },
                        devolveu:     { cls:'danger',  titulo:`Devolvido por ${quem}`, sub: l.detalhes?.motivo || null },
                        excluiu:      { cls:'danger',  titulo:`Excluído por ${quem}`, sub: null },
                        mudou_status: { cls:'info',    titulo:`Status alterado por ${quem}`, sub: l.detalhes?.para ? `Novo status: ${ST[l.detalhes.para]?.l || l.detalhes.para}` : null },
                        comentou:     { cls:null,      titulo:`Observação de ${quem}`, sub: typeof l.detalhes === 'string' ? l.detalhes : null },
                        editou:       { cls:null,      titulo:`Editado por ${quem}`, sub: null },
                        criou:        { cls:'success', titulo:`Criado por ${quem}`, sub: null },
                      };
                      const info = map[l.acao] || { cls:null, titulo:`${l.acao} — ${quem}`, sub:null };
                      return (
                        <div key={l.id}><i className={info.cls || undefined}/><span><strong>{info.titulo}</strong><small>{quando}{info.sub ? `\n${info.sub}` : ''}</small></span></div>
                      );
                    })}
                  {sel.motivo_devolucao && !auditLog.some(l => l.cadastro_id === sel.id && (l.acao==='rejeitou'||l.acao==='devolveu')) && <div><i className="danger"/><span><strong>Devolvida para correção</strong><small>{sel.motivo_devolucao}</small></span></div>}
                  {sel.data_finalizacao && !auditLog.some(l => l.cadastro_id === sel.id && l.acao==='aprovou') && <div><i className="success"/><span><strong>Cadastro concluído no Protheus</strong><small>{new Date(sel.data_finalizacao).toLocaleString('pt-BR')} · {sel.finalizado_por || 'Equipe'}{sel.codigo_fornecedor ? ` · Código ${sel.codigo_fornecedor}` : ''}</small></span></div>}
                </div>
              </section>

              {/* Observações */}
              <div id="pmx-obs" style={{scrollMarginTop:16}}>
                <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:13,fontWeight:700,color:'#1A2332',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#20558A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Observações internas
                </div>
                <textarea ref={obsRef} defaultValue={sel.observacoes_internas||''} key={sel.id} placeholder="Adicione anotações internas aqui... (apenas a equipe do Núcleo Fiscal vê)" onBlur={()=>saveObs(sel.id)} style={{width:'100%',padding:'12px 14px',borderRadius:9,border:'1px solid #E5E9EF',fontSize:13,minHeight:80,resize:'vertical',outline:'none',fontFamily:'inherit',background:'#fff',transition:'.15s',color:'#1A2332',lineHeight:1.5}} onFocus={e=>{e.target.style.borderColor='#20558A';e.target.style.boxShadow='0 0 0 3px #EAF2FA';}} onBlurCapture={e=>{e.target.style.borderColor='#E5E9EF';e.target.style.boxShadow='none';}} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE: GESTÃO DE TAREFAS ══ */}
      {page === 'kanban' && (
        <div className="pmx-fade-in">
          <div className="pmx-themed-bg" style={{background:T.surface,padding:'16px 28px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:'#8B94A3',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{cursor:'pointer'}}>Núcleo Fiscal</span>
              <span>›</span>
              <span style={{color:'#1A2332',fontWeight:500}}>Gestão de Tarefas</span>
            </div>
            <h1 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Gestão de Tarefas</h1>
          </div>
          <div style={{padding:'22px 28px 32px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:12,fontWeight:600,color:'#8B94A3',marginRight:6,textTransform:'uppercase',letterSpacing:'.5px'}}>Filtrar:</span>
              <PillBtn active={kanView==='todos'} onClick={()=>setKanView('todos')}>Todos</PillBtn>
              {usuarios.filter(u=>u.ativo).map(u => (
                <PillBtn key={u.id} active={kanView===u.nome} onClick={()=>setKanView(u.nome)}>{u.nome.split(' ')[0]}</PillBtn>
              ))}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
              <div className="pmx-view-switch" aria-label="Visualização das tarefas">
                <button className={kanLayout==='board'?'active':''} onClick={()=>setKanLayout('board')}>Quadro</button>
                <button className={kanLayout==='list'?'active':''} onClick={()=>setKanLayout('list')}>Lista</button>
                <button className={kanLayout==='calendar'?'active':''} onClick={()=>setKanLayout('calendar')}>Prazos</button>
              </div>
              <button className="pmx-cta" onClick={()=>setShowNewTask(true)} style={{padding:'10px 18px',borderRadius:9,border:'none',background:'#20558A',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Tarefa
              </button>
            </div>
          </div>

          {/* New Task Form */}
          {showNewTask && (
            <div style={{background:'#fff',borderRadius:12,padding:22,marginBottom:20,border:'1px solid #E5E9EF',boxShadow:'0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04)'}}>
              <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:15,fontWeight:700,marginBottom:14,color:'#1A2332'}}>Nova Tarefa</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div style={{gridColumn:'1/-1'}}><input placeholder="Título da tarefa *" value={newTask.titulo} onChange={e=>setNewTask({...newTask,titulo:e.target.value})} style={fieldStyle()} /></div>
                <div style={{gridColumn:'1/-1'}}><textarea placeholder="Descrição (opcional)" value={newTask.descricao} onChange={e=>setNewTask({...newTask,descricao:e.target.value})} style={{...fieldStyle(),minHeight:60,resize:'vertical'}} /></div>
                <select value={newTask.atribuido_para} onChange={e=>setNewTask({...newTask,atribuido_para:e.target.value})} style={fieldStyle()}>
                  <option value="">Atribuir para *</option>
                  {usuarios.filter(u=>u.ativo).map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
                <select value={newTask.prioridade} onChange={e=>setNewTask({...newTask,prioridade:e.target.value})} style={fieldStyle()}>
                  <option value="urgente">Urgente</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
                </select>
                <input type="date" value={newTask.prazo} onChange={e=>setNewTask({...newTask,prazo:e.target.value})} style={fieldStyle()} />
                <select value={newTask.status} onChange={e=>setNewTask({...newTask,status:e.target.value})} style={fieldStyle()}>
                  {KAN_COLS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}
                </select>
                <div style={{gridColumn:'1/-1',display:'flex',gap:10,marginTop:4}}>
                  <button onClick={addKanTask} className="pmx-cta" style={{padding:'10px 20px',borderRadius:9,border:'none',background:'#20558A',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Criar Tarefa
                  </button>
                  <button onClick={()=>setShowNewTask(false)} style={{padding:'10px 20px',borderRadius:9,border:'1px solid #E5E9EF',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:13,cursor:'pointer',color:'#4F5868'}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Colunas */}
          <div className="pmx-kanban-board" style={{display:kanLayout==='board'?'grid':'none',gridTemplateColumns:'repeat(4,minmax(260px,1fr))',gap:14,alignItems:'flex-start'}}>
            {KAN_COLS.map(col => {
              const tasks = kanFiltered.filter(t => t.status === col.k);
              return (
                <div key={col.k} className={`pmx-kanban-column ${dragTaskId ? 'is-drop-ready' : ''}`} onDragOver={(e)=>{e.preventDefault();e.dataTransfer.dropEffect='move';}} onDrop={()=>dropKanTask(col.k)} style={{background:'#fff',borderRadius:12,padding:10,minHeight:300,border:'1px solid #DDE5ED',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                  <div style={{padding:'4px 8px 12px 8px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #E5E9EF',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:col.c}} />
                      <span style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:12,fontWeight:700,color:'#1A2332',textTransform:'uppercase',letterSpacing:'.5px'}}>{col.l}</span>
                    </div>
                    <span style={{background:'#F8F9FB',color:'#4F5868',borderRadius:20,padding:'2px 9px',fontSize:11,fontWeight:700,fontFamily:'Geist,-apple-system,sans-serif',border:'1px solid #E5E9EF'}}>{tasks.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {tasks.map(t => {
                      const p = PRI[t.prioridade] || PRI.media;
                      const progress = calcProgress(t.checklist);
                      return (
                        <div key={t.id} className={`pmx-kanban-card ${dragTaskId === t.id ? 'is-dragging' : ''}`} draggable onDragStart={(e)=>{setDragTaskId(t.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(t.id));}} onDragEnd={()=>setDragTaskId(null)} onClick={()=>setEditTask(t)} style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #DDE5ED',cursor:'grab',transition:'all .15s'}}
                          onMouseEnter={e=>{if(!dragTaskId){e.currentTarget.style.borderColor='#20558A';e.currentTarget.style.boxShadow='0 4px 12px rgba(32,85,138,.1)';e.currentTarget.style.transform='translateY(-1px)';}}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#DDE5ED';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                            <div style={{fontSize:13,fontWeight:600,lineHeight:1.3,flex:1,color:'#1A2332'}}>{sanitize(t.titulo)}</div>
                            <span style={{padding:'2px 7px',borderRadius:5,fontSize:9,fontWeight:700,background:p.bg,color:p.c,flexShrink:0,textTransform:'uppercase',letterSpacing:'.3px'}}>{p.l}</span>
                          </div>
                          {t.descricao && <div style={{fontSize:11,color:'#8B94A3',marginTop:6,lineHeight:1.4}}>{sanitize(t.descricao.substring(0,80))}{t.descricao.length>80?'...':''}</div>}
                          {t.checklist && t.checklist.length > 0 && (
                            <div style={{marginTop:10}}>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#8B94A3',marginBottom:4,fontWeight:500}}>
                                <span>{t.checklist.filter(i=>i.feito).length}/{t.checklist.length} itens</span>
                                <span style={{fontWeight:700,color:progress===100?'#008C44':'#4F5868'}}>{progress}%</span>
                              </div>
                              <div style={{height:4,background:'#E5E9EF',borderRadius:4,overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${progress}%`,background:progress===100?'#00A650':'#2563EB',transition:'.3s',borderRadius:4}} />
                              </div>
                            </div>
                          )}
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'#8B94A3',marginTop:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <div style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#20558A,#173F69)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:8}}>{(t.atribuido_para||'??').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                              <span>{(t.atribuido_para||'').split(' ')[0]}</span>
                            </div>
                            {t.prazo && <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                              <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {fmtDateShort(t.prazo)}
                            </span>}
                          </div>
                        </div>
                      );
                    })}
                    {tasks.length===0 && <div style={{fontSize:'.75rem',color:'#cbd5e1',textAlign:'center',padding:30}}>Nenhuma tarefa</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {kanLayout === 'list' && (
            <div className="pmx-card pmx-card--flush pmx-task-list-view">
              <div className="pmx-table-wrap"><table className="pmx-premium-table"><thead><tr><th>Tarefa</th><th>Responsável</th><th>Prioridade</th><th>Status</th><th>Checklist</th><th>Prazo</th><th /></tr></thead><tbody>
                {kanFiltered.map(t => { const p=PRI[t.prioridade]||PRI.media; const col=KAN_COLS.find(c=>c.k===t.status); const progress=calcProgress(t.checklist); return <tr key={t.id} onClick={()=>setEditTask(t)}><td><strong>{sanitize(t.titulo)}</strong><small>{sanitize(t.descricao||'Sem descrição')}</small></td><td>{t.atribuido_para||'Não atribuído'}</td><td><span className="pmx-task-priority" style={{background:p.bg,color:p.c}}>{p.l}</span></td><td><span className="pmx-status pmx-status--info">{col?.l||t.status}</span></td><td><strong>{progress}%</strong><small>{(t.checklist||[]).filter(i=>i.feito).length}/{(t.checklist||[]).length} itens</small></td><td>{t.prazo ? fmtDateShort(t.prazo) : 'Sem prazo'}</td><td><span className="pmx-row-arrow">›</span></td></tr>; })}
                {!kanFiltered.length && <tr><td colSpan="7"><div className="pmx-empty-inline">Nenhuma tarefa nesta visão.</div></td></tr>}
              </tbody></table></div>
            </div>
          )}

          {kanLayout === 'calendar' && (
            <div className="pmx-task-calendar-view">
              {Object.entries(kanFiltered.reduce((groups, task) => { const key=task.prazo||'sem-prazo'; (groups[key] ||= []).push(task); return groups; }, {})).sort(([a],[b]) => a==='sem-prazo'?1:b==='sem-prazo'?-1:a.localeCompare(b)).map(([date,tasks]) => (
                <section key={date} className="pmx-card pmx-task-date-group"><header><div><span className="pmx-eyebrow">{date==='sem-prazo'?'Planejamento':'Prazo'}</span><h3>{date==='sem-prazo'?'Sem prazo definido':new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})}</h3></div><strong>{tasks.length}</strong></header><div>{tasks.map(t=>{const p=PRI[t.prioridade]||PRI.media;return <button key={t.id} onClick={()=>setEditTask(t)}><span style={{background:p.c}}/><div><strong>{sanitize(t.titulo)}</strong><small>{t.atribuido_para||'Não atribuído'} · {KAN_COLS.find(c=>c.k===t.status)?.l||t.status}</small></div><em>{p.l}</em></button>})}</div></section>
              ))}
              {!kanFiltered.length && <div className="pmx-card"><div className="pmx-empty-inline">Nenhuma tarefa nesta visão.</div></div>}
            </div>
          )}

          {/* Task Edit Modal */}
          {editTask && (
            <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={e=>{if(e.target===e.currentTarget)setEditTask(null)}}>
              <div style={{background:'#fff',borderRadius:20,padding:28,maxWidth:580,width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 25px 60px rgba(0,0,0,.2)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                  <div style={{fontSize:'.92rem',fontWeight:700,color:'#0f172a'}}>Editar Tarefa</div>
                  <button onClick={()=>setEditTask(null)} style={{width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:'.9rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8'}}>✕</button>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <input defaultValue={editTask.titulo} id="et-titulo" style={fieldStyle()} placeholder="Título" />
                  <textarea defaultValue={editTask.descricao} id="et-desc" style={{...fieldStyle(),minHeight:60,resize:'vertical'}} placeholder="Descrição" />
                  <select defaultValue={editTask.atribuido_para} id="et-assign" style={fieldStyle()}>
                    {usuarios.filter(u=>u.ativo).map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
                  </select>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
                    <select defaultValue={editTask.prioridade} id="et-pri" style={fieldStyle()}>
                      <option value="urgente">Urgente</option><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
                    </select>
                    <select defaultValue={editTask.status} id="et-status" style={fieldStyle()}>
                      {KAN_COLS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}
                    </select>
                    <input type="date" defaultValue={editTask.prazo||''} id="et-prazo" style={fieldStyle()} />
                  </div>

                  {/* Checklist */}
                  <div style={{marginTop:8,padding:16,background:'#f8fafc',borderRadius:12,border:'1px solid #e2e8f0'}}>
                    <div style={{fontSize:'.78rem',fontWeight:700,marginBottom:10,color:'#0f172a'}}>📋 Checklist {editTask.checklist && editTask.checklist.length>0 && `(${calcProgress(editTask.checklist)}%)`}</div>
                    {editTask.checklist && editTask.checklist.length>0 && (
                      <div style={{height:5,background:'#e2e8f0',borderRadius:4,overflow:'hidden',marginBottom:12}}>
                        <div style={{height:'100%',width:`${calcProgress(editTask.checklist)}%`,background:calcProgress(editTask.checklist)===100?'#059669':'#2563EB',transition:'.3s'}} />
                      </div>
                    )}
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
                      {(editTask.checklist||[]).map(item => (
                        <div key={item.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'#fff',borderRadius:8,border:'1px solid #e2e8f0'}}>
                          <input type="checkbox" checked={item.feito} onChange={()=>toggleChkItem(item.id)} style={{width:16,height:16,accentColor:'#059669',cursor:'pointer'}} />
                          <span style={{flex:1,fontSize:'.82rem',textDecoration:item.feito?'line-through':'none',color:item.feito?'#94a3b8':'#0f172a'}}>{sanitize(item.texto)}</span>
                          <button onClick={()=>removeChkItem(item.id)} style={{background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:'.82rem',padding:4}}>✕</button>
                        </div>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <input value={newChkItem} onChange={e=>setNewChkItem(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addChkItem()}}} placeholder="Adicionar item..." style={{...fieldStyle(),flex:1}} />
                      <button onClick={addChkItem} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontWeight:700,fontSize:'.82rem',cursor:'pointer'}}>+</button>
                    </div>
                  </div>

                  <div className="pmx-task-comments">
                    <div className="pmx-task-comments__title"><span>Comentários</span><strong>{(editTask.comentarios||[]).length}</strong></div>
                    <div className="pmx-task-comments__list">
                      {(editTask.comentarios||[]).map(comment => <div key={comment.id||comment.criado_em}><span>{(comment.autor||'?').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{comment.autor||'Equipe'}</strong><p>{sanitize(comment.texto||'')}</p><small>{comment.criado_em ? new Date(comment.criado_em).toLocaleString('pt-BR') : ''}</small></div></div>)}
                      {!(editTask.comentarios||[]).length && <p className="pmx-empty-inline">Nenhum comentário ainda.</p>}
                    </div>
                    <div className="pmx-task-comments__composer"><textarea value={newTaskComment} onChange={e=>setNewTaskComment(e.target.value)} placeholder="Registrar atualização, contexto ou orientação..."/><button onClick={addTaskComment} disabled={!newTaskComment.trim()}>Comentar</button></div>
                  </div>

                  <div style={{display:'flex',gap:8,marginTop:8,paddingTop:16,borderTop:'1px solid #e2e8f0'}}>
                    <button onClick={()=>{
                      updateKanTask(editTask.id,{
                        titulo:document.getElementById('et-titulo').value,
                        descricao:document.getElementById('et-desc').value,
                        atribuido_para:document.getElementById('et-assign').value,
                        prioridade:document.getElementById('et-pri').value,
                        status:document.getElementById('et-status').value,
                        prazo:document.getElementById('et-prazo').value||null
                      });
                      setEditTask(null);
                    }} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontWeight:700,fontSize:'.84rem',cursor:'pointer'}}>Salvar Alterações</button>
                    {(isSubAdmin||editTask.criado_por===user.nome||editTask.atribuido_para===user.nome) && (
                      <button onClick={()=>deleteKanTask(editTask.id)} style={{padding:'12px 18px',borderRadius:10,border:'none',background:'#FEF2F2',color:'#DC2626',fontFamily:'inherit',fontWeight:700,fontSize:'.84rem',cursor:'pointer'}}>🗑</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>{/* end kanban content padding */}
        </div>
      )}

      {/* ══ PAGE: ADMIN ══ */}
      {page === 'admin' && isAdmin && (
        <div className="pmx-fade-in">
          <div className="pmx-themed-bg" style={{background:T.surface,padding:'16px 28px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:'#8B94A3',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{cursor:'pointer'}}>Núcleo Fiscal</span>
              <span>›</span>
              <span style={{color:'#1A2332',fontWeight:500}}>Equipe</span>
            </div>
            <h1 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Equipe</h1>
          </div>
          <div style={{padding:'22px 28px 32px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <h2 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:16,fontWeight:700,color:'#1A2332',margin:0}}>Gestão da Equipe</h2>
              <p style={{fontSize:13,color:'#8B94A3',marginTop:2}}>Gerencie acessos, perfis e permissões</p>
            </div>
            <button className="pmx-cta" onClick={()=>setShowNewUser(true)} style={{padding:'10px 18px',borderRadius:9,border:'none',background:'#20558A',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Novo Usuário
            </button>
          </div>

          {showNewUser && (
            <div style={{background:'#fff',borderRadius:12,padding:22,marginBottom:20,border:'1px solid #E5E9EF',boxShadow:'0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04)'}}>
              <div style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:15,fontWeight:700,marginBottom:14,color:'#1A2332'}}>Novo Usuário</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input placeholder="Nome completo *" value={newUser.nome} onChange={e=>setNewUser({...newUser,nome:e.target.value})} style={fieldStyle()} />
                <input placeholder="E-mail *" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} style={fieldStyle()} />
                <input placeholder="Cargo" value={newUser.cargo} onChange={e=>setNewUser({...newUser,cargo:e.target.value})} style={fieldStyle()} />
                <input placeholder="Telefone" value={newUser.telefone} onChange={e=>setNewUser({...newUser,telefone:e.target.value})} style={fieldStyle()} />
                <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} style={fieldStyle()}>
                  <option value="user">Usuário</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option>
                </select>
                <div style={{fontSize:11,color:'#94a3b8',padding:'8px 0'}}>A senha temporária será gerada automaticamente e exibida após criar.</div>
                <div style={{gridColumn:'1/-1',display:'flex',gap:10,marginTop:4}}>
                  <button onClick={addUser} className="pmx-cta" style={{padding:'10px 20px',borderRadius:9,border:'none',background:'#20558A',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>Criar Usuário</button>
                  <button onClick={()=>setShowNewUser(false)} style={{padding:'10px 20px',borderRadius:9,border:'1px solid #E5E9EF',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:13,cursor:'pointer',color:'#4F5868'}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela Usuários */}
          <div style={{background:'#fff',borderRadius:14,overflow:'hidden',border:'1px solid #E5E9EF'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['Nome','E-mail','Cargo','Perfil','Status','Ações'].map(h => (
                    <th key={h} style={thS()}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const editing = editUser?.id === u.id;
                  return (
                    <tr key={u.id} className="pmx-row" style={{borderBottom:'1px solid #E5E9EF'}}>
                      <td style={tdSnew()}>
                        {editing ? <input defaultValue={u.nome} id={`u-nome-${u.id}`} style={fieldStyle()} /> :
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#20558A,#173F69)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Geist,-apple-system,sans-serif',fontWeight:700,fontSize:11,flexShrink:0}}>{u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                          <div><div style={{fontWeight:600,fontSize:13,color:'#1A2332'}}>{u.nome}</div>{u.telefone && <div style={{fontSize:11,color:'#8B94A3'}}>{u.telefone}</div>}</div>
                        </div>}
                      </td>
                      <td style={tdSnew()}>{editing ? <input defaultValue={u.email} id={`u-email-${u.id}`} style={fieldStyle()} /> : <span style={{fontSize:12,color:'#4F5868'}}>{u.email}</span>}</td>
                      <td style={tdSnew()}>{editing ? <input defaultValue={u.cargo} id={`u-cargo-${u.id}`} style={fieldStyle()} /> : <span style={{fontSize:13}}>{u.cargo}</span>}</td>
                      <td style={tdSnew()}>
                        {editing ? <select defaultValue={u.role} id={`u-role-${u.id}`} style={fieldStyle()}><option value="user">Usuário</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option></select>
                        : <span style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:700,background:u.role==='admin'?'#FEE2E2':u.role==='subadmin'?'#FEF3C7':'#DBEAFE',color:u.role==='admin'?'#E63946':u.role==='subadmin'?'#B45309':'#2563EB',letterSpacing:'.3px',textTransform:'uppercase'}}>{u.role==='admin'?'Admin':u.role==='subadmin'?'Sub-Admin':'Usuário'}</span>}
                      </td>
                      <td style={tdSnew()}>
                        <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:u.ativo?'#E6F7EE':'#FEE2E2',color:u.ativo?'#008C44':'#E63946'}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:u.ativo?'#008C44':'#E63946'}} />
                          {u.ativo?'Ativo':'Inativo'}
                        </span>
                      </td>
                      <td style={tdSnew()}>
                        {editing ? (
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>updateUser(u.id,{nome:document.getElementById(`u-nome-${u.id}`).value,email:document.getElementById(`u-email-${u.id}`).value.toLowerCase(),cargo:document.getElementById(`u-cargo-${u.id}`).value,role:document.getElementById(`u-role-${u.id}`).value})} style={{padding:'6px 12px',borderRadius:7,border:'none',background:'#20558A',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Salvar</button>
                            <button onClick={()=>setEditUser(null)} style={{padding:'6px 12px',borderRadius:7,border:'1px solid #E5E9EF',background:'#fff',fontSize:11,cursor:'pointer',color:'#8B94A3'}}>Cancelar</button>
                          </div>
                        ) : (
                          <div style={{display:'flex',gap:4}}>
                            <SmBtn onClick={()=>setEditUser(u)} title="Editar">✏️</SmBtn>
                            <SmBtn onClick={()=>resetUserPw(u.id,u.nome)} title="Resetar senha">🔑</SmBtn>
                            <SmBtn onClick={()=>toggleUserActive(u)} title={u.ativo?'Desativar':'Ativar'}>{u.ativo?'🚫':'✅'}</SmBtn>
                            {u.id!==user.id && <SmBtn onClick={()=>deleteUser(u.id,u.nome)} title="Excluir" danger>🗑</SmBtn>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Stats por usuário */}
          <div style={{marginTop:28}}>
            <h3 style={{fontSize:'.88rem',fontWeight:700,marginBottom:14,color:'#0f172a'}}>📊 Estatísticas da Equipe</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}>
              {usuarios.filter(u=>u.ativo).map(u => {
                const tarefas = kanban.filter(t => t.atribuido_para === u.nome);
                const concl = tarefas.filter(t => t.status === 'concluido').length;
                const cadastros = forn.filter(f => f.atribuido_para === u.nome || f.finalizado_por === u.nome).length;
                return (
                  <div key={u.id} style={{padding:'18px 20px',background:'#fff',borderRadius:14,border:'1px solid #e2e8f0'}}>
                    <div style={{fontWeight:700,fontSize:'.88rem',color:'#0f172a'}}>{u.nome}</div>
                    <div style={{fontSize:'.72rem',color:'#94a3b8',marginBottom:12}}>{u.cargo}</div>
                    <div style={{display:'flex',gap:16}}>
                      <StatNum label="Cadastros" value={cadastros} color="#059669" />
                      <StatNum label="Tarefas" value={tarefas.length} color="#2563EB" />
                      <StatNum label="Concluídas" value={concl} color="#D97706" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>{/* end admin content padding */}
        </div>
      )}

      {/* ══ PAGE: APARÊNCIA INSTITUCIONAL ══ */}
      {page === 'aparencia' && (
        <div className="pmx-page pmx-fade-in">
          <header className="pmx-page-heading">
            <div>
              <span className="pmx-eyebrow">Sistema</span>
              <h1>Aparência institucional</h1>
              <p>A identidade Premix permanece fixa. Você pode alternar apenas o modo de exibição e a densidade operacional.</p>
            </div>
            {prefsLoaded && <span className="pmx-save-status"><span /> Preferências sincronizadas</span>}
          </header>

          <section className="pmx-settings-grid">
            <article className="pmx-card pmx-settings-card">
              <div className="pmx-settings-card__heading">
                <div><span className="pmx-eyebrow">Tema</span><h2>Modo de exibição</h2></div>
                <span className="pmx-brand-lock">Identidade Premix</span>
              </div>
              <p>Azul institucional para estrutura e ações, laranja para destaques e cores semânticas somente para status.</p>
              <div className="pmx-theme-grid">
                {['premix_claro', 'premix_escuro'].map((key) => {
                  const item = TEMAS[key];
                  const ativo = tema === key;
                  return (
                    <button key={key} className={`pmx-theme-option ${ativo ? 'is-active' : ''}`} onClick={() => { setTema(key); savePrefs({ tema:key }); }}>
                      <span className="pmx-theme-option__preview" style={{background:item.bg}}>
                        <i style={{background:'#173F69'}} />
                        <b style={{background:item.surface,borderColor:item.border}}><em style={{background:'#20558A'}} /><em style={{background:'#F15A24'}} /></b>
                      </span>
                      <span><strong>{item.nome}</strong><small>{item.descricao}</small></span>
                      {ativo && <span className="pmx-theme-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="pmx-card pmx-settings-card">
              <div className="pmx-settings-card__heading"><div><span className="pmx-eyebrow">Layout</span><h2>Densidade da informação</h2></div></div>
              <p>Ajuste o espaçamento sem alterar os dados ou a ordem operacional.</p>
              <div className="pmx-density-grid">
                {[
                  { k:'compacto', l:'Compacto', d:'Mais registros por tela' },
                  { k:'normal', l:'Equilibrado', d:'Padrão recomendado' },
                  { k:'confortavel', l:'Confortável', d:'Mais espaço visual' },
                ].map((item) => (
                  <button key={item.k} className={`pmx-density-option ${densidade === item.k ? 'is-active' : ''}`} onClick={() => { setDensidade(item.k); savePrefs({ densidade:item.k }); }}>
                    <span className={`pmx-density-lines pmx-density-lines--${item.k}`}><i/><i/><i/></span>
                    <strong>{item.l}</strong><small>{item.d}</small>
                  </button>
                ))}
              </div>
            </article>

            <article className="pmx-card pmx-settings-card pmx-settings-card--wide">
              <div className="pmx-settings-card__heading"><div><span className="pmx-eyebrow">Navegação</span><h2>Barra lateral</h2></div></div>
              <div className="pmx-sidebar-options">
                <button className={!sidebarCol ? 'is-active' : ''} onClick={() => setSidebarCol(false)}><span className="pmx-sidebar-preview"><i/><b/></span><strong>Expandida</strong><small>Ícones e nomes visíveis</small></button>
                <button className={sidebarCol ? 'is-active' : ''} onClick={() => setSidebarCol(true)}><span className="pmx-sidebar-preview pmx-sidebar-preview--compact"><i/><b/></span><strong>Compacta</strong><small>Mais área de trabalho</small></button>
              </div>
            </article>

            <article className="pmx-card pmx-brand-guideline pmx-settings-card--wide">
              <div className="pmx-brand-guideline__mark">P</div>
              <div><span className="pmx-eyebrow">Padrão visual</span><h2>Premix, sem distrações</h2><p>Wallpapers e cores livres foram removidos da área operacional. O painel mantém azul e laranja da organização, com fundo neutro, tipografia consistente e contraste adequado.</p></div>
              <button className="pmx-button pmx-button--secondary" onClick={() => { setTema('premix_claro'); setDensidade('normal'); setSidebarCol(false); savePrefs({ tema:'premix_claro', densidade:'normal', cor_primaria:'#20558A', wallpaper:null, wallpaper_opacidade:0 }); showToast('Padrão Premix restaurado'); }}>Restaurar padrão</button>
            </article>
          </section>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0;transform:scale(.96) } to { opacity:1;transform:scale(1) } }
        @keyframes slideUp { from { opacity:0;transform:translateX(-50%) translateY(20px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }
      `}</style>
        </div>{/* end main */}
      </div>{/* end grid */}
      </div>{/* end z-index wrapper */}

      {rejectUnlock && (
        <div className="pmx-detail-overlay" style={{zIndex:8800}} onClick={(event)=>{if(event.target===event.currentTarget){setRejectUnlock(null);setRejectUnlockReason('');}}}>
          <form onSubmit={async (event)=>{event.preventDefault();const reason=rejectUnlockReason.trim();if(!reason){showToast('Informe o motivo da rejeição');return;}await rejeitarDesbloqueio(rejectUnlock, reason);setRejectUnlock(null);setRejectUnlockReason('');}} style={{background:'#fff',borderRadius:16,width:'min(520px,100%)',boxShadow:'0 24px 64px rgba(16,24,40,.20)',border:'1px solid #E5E9EF',overflow:'hidden'}}>
            <div style={{padding:'20px 22px',borderBottom:'1px solid #E5E9EF'}}><span className="pmx-eyebrow">Desbloqueio</span><h3 style={{margin:'3px 0 4px',fontSize:18,color:'#1A2332'}}>Devolver solicitação</h3><p style={{margin:0,fontSize:13,color:'#667085'}}>Registre claramente o motivo para manter o histórico operacional.</p></div>
            <div style={{padding:22}}><label style={{display:'grid',gap:7,fontSize:12,fontWeight:650,color:'#344054'}}>Motivo da rejeição<textarea autoFocus value={rejectUnlockReason} onChange={(event)=>setRejectUnlockReason(event.target.value)} rows={5} maxLength={1200} placeholder="Descreva o que precisa ser corrigido..." style={{...fieldStyle(),minHeight:120,resize:'vertical',fontWeight:400}} /></label></div>
            <div style={{padding:'14px 22px',display:'flex',justifyContent:'flex-end',gap:9,background:'#F8F9FB',borderTop:'1px solid #E5E9EF'}}><button type="button" className="pmx-button pmx-button--secondary" onClick={()=>{setRejectUnlock(null);setRejectUnlockReason('');}}>Cancelar</button><button type="submit" className="pmx-button" style={{background:'#E63946',color:'#fff'}}>Devolver solicitação</button></div>
          </form>
        </div>
      )}

      {/* ══ MODAL DE CONFIRMAÇÃO CUSTOMIZADO ══ */}
      {confirmModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(26,35,50,.55)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .15s ease'}} onClick={e=>{if(e.target===e.currentTarget) setConfirmModal(null)}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:420,boxShadow:'0 24px 64px rgba(16,24,40,.18),0 8px 16px rgba(16,24,40,.08)',animation:'scaleIn .2s cubic-bezier(.16,1,.3,1)',border:'1px solid #E5E9EF',overflow:'hidden'}}>
            <div style={{padding:'24px 24px 18px',display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{width:44,height:44,borderRadius:11,background: confirmModal.danger ? '#FEE2E2' : '#DBEAFE',color: confirmModal.danger ? '#E63946' : '#2563EB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {confirmModal.danger ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <h3 style={{fontFamily:'Geist,-apple-system,sans-serif',fontSize:17,fontWeight:700,color:'#1A2332',margin:'0 0 6px 0',letterSpacing:'-.3px'}}>{confirmModal.title}</h3>
                <p style={{fontSize:13,color:'#4F5868',lineHeight:1.5,margin:0}}>{confirmModal.message}</p>
              </div>
            </div>
            <div style={{padding:'14px 24px 18px',display:'flex',gap:10,justifyContent:'flex-end',background:'#F8F9FB',borderTop:'1px solid #E5E9EF'}}>
              <button onClick={()=>setConfirmModal(null)} style={{padding:'10px 18px',borderRadius:9,border:'1px solid #E5E9EF',background:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:500,cursor:'pointer',color:'#4F5868'}}>Cancelar</button>
              <button onClick={async ()=>{ const fn = confirmModal.onConfirm; setConfirmModal(null); try { await fn(); } catch(e) { console.error('[confirmModal]', e); showToast('Erro inesperado'); } }} autoFocus style={{padding:'10px 18px',borderRadius:9,border:'none',background: confirmModal.danger ? '#E63946' : '#20558A',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:`0 1px 2px ${confirmModal.danger?'rgba(230,57,70,.3)':'rgba(32,85,138,.3)'}, inset 0 1px 0 rgba(255,255,255,.15)`}}>
                {confirmModal.danger ? 'Excluir' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Componentes (DataSection, ActionBtn, PillBtn, SmBtn, StatNum) e helpers de
   estilo (inputStyle, fieldStyle, etc.) foram movidos para
   components/shared.js e lib/styleHelpers.js — importados no topo do arquivo. */
