'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/* ── Status & Configs ────────────────────────────── */
const ST = {
  pendente:   { l:'Pendente',   c:'#D97706', bg:'#FFFBEB', i:'clock' },
  em_analise: { l:'Em Análise', c:'#2563EB', bg:'#EFF6FF', i:'search' },
  aprovado:   { l:'Concluído',  c:'#059669', bg:'#ECFDF5', i:'check-circle' },
  rejeitado:  { l:'Devolvido',  c:'#DC2626', bg:'#FEF2F2', i:'arrow-uturn-left' },
};
const TL = { pj:'PJ', pf:'PF', motorista:'Motorista' };
const PRI = {
  urgente: { l:'Urgente', c:'#DC2626', bg:'#FEF2F2' },
  alta:    { l:'Alta',    c:'#D97706', bg:'#FFFBEB' },
  media:   { l:'Média',   c:'#2563EB', bg:'#EFF6FF' },
  baixa:   { l:'Baixa',   c:'#6B7280', bg:'#F3F4F6' },
};
const KAN_COLS = [
  { k:'backlog',       l:'Backlog',       c:'#6B7280' },
  { k:'esta_semana',   l:'Esta Semana',   c:'#D97706' },
  { k:'em_andamento',  l:'Em Andamento',  c:'#2563EB' },
  { k:'concluido',     l:'Concluído',     c:'#059669' },
];

/* ── Sistema de Temas ─────────────────────────────── */
const TEMAS = {
  premix_claro: {
    nome: 'Premix Claro',
    descricao: 'Tema institucional Premix (padrão)',
    bg: '#F5F7FA', surface: '#FFFFFF', surface2: '#F8F9FB', border: '#E5E9EF',
    text1: '#1A2332', text2: '#4F5868', text3: '#8B94A3',
    primary: '#00A650', primaryDark: '#008C44', primaryLight: '#E6F7EE',
  },
  premix_escuro: {
    nome: 'Premix Escuro',
    descricao: 'Versão noturna do tema Premix',
    bg: '#0A0F14', surface: '#161B22', surface2: '#1C2128', border: '#30363D',
    text1: '#E6EDF3', text2: '#9BA8B5', text3: '#6B7785',
    primary: '#34D399', primaryDark: '#10B981', primaryLight: 'rgba(52,211,153,.15)',
  },
  foco: {
    nome: 'Foco',
    descricao: 'Minimalista cinza, sem distrações',
    bg: '#FAFAFA', surface: '#FFFFFF', surface2: '#F4F4F5', border: '#E4E4E7',
    text1: '#18181B', text2: '#52525B', text3: '#A1A1AA',
    primary: '#3F3F46', primaryDark: '#27272A', primaryLight: '#F4F4F5',
  },
  campo: {
    nome: 'Campo',
    descricao: 'Verde Premix + dourado, ar rural',
    bg: '#F7F8F3', surface: '#FFFFFF', surface2: '#F0F2E8', border: '#D9DCC8',
    text1: '#2A3520', text2: '#556045', text3: '#8B9474',
    primary: '#00A650', primaryDark: '#008C44', primaryLight: '#E6F7EE',
  },
  noite: {
    nome: 'Noite',
    descricao: 'Preto puro, alta legibilidade',
    bg: '#000000', surface: '#0A0A0A', surface2: '#141414', border: '#262626',
    text1: '#FAFAFA', text2: '#A3A3A3', text3: '#737373',
    primary: '#22D3EE', primaryDark: '#06B6D4', primaryLight: 'rgba(34,211,238,.15)',
  },
};

/* Curadoria de wallpapers Unsplash (URLs estáveis, 1200x800 ~150kb) */
const WALLPAPERS = [
  { id:'agro1', cat:'Agro',       url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=70', autor:'Federico Respini' },
  { id:'agro2', cat:'Agro',       url:'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1200&q=70', autor:'Mark Stosberg' },
  { id:'agro3', cat:'Agro',       url:'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&q=70', autor:'No Revisions' },
  { id:'agro4', cat:'Agro',       url:'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200&q=70', autor:'Tim Mossholder' },
  { id:'nat1',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=1200&q=70', autor:'Sergei Akulich' },
  { id:'nat2',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=70', autor:'David Marcu' },
  { id:'nat3',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=70', autor:'Eberhard 🖐' },
  { id:'nat4',  cat:'Natureza',   url:'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=70', autor:'Luca Bravo' },
  { id:'abs1',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'abs2',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'abs3',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1554034483-04fda0d3507b?w=1200&q=70', autor:'Henry & Co.' },
  { id:'abs4',  cat:'Abstrato',   url:'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=70', autor:'Solen Feyissa' },
  { id:'min1',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min2',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1557682260-96773eb01377?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min3',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1620503374956-c942862f0372?w=1200&q=70', autor:'Pawel Czerwinski' },
  { id:'min4',  cat:'Minimalista', url:'https://images.unsplash.com/photo-1554034483-263c20973167?w=1200&q=70', autor:'Henry & Co.' },
  { id:'tex1',  cat:'Textura',    url:'https://images.unsplash.com/photo-1517137744914-fbb030f54116?w=1200&q=70', autor:'Annie Spratt' },
  { id:'tex2',  cat:'Textura',    url:'https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=1200&q=70', autor:'Sven Mieke' },
  { id:'tex3',  cat:'Textura',    url:'https://images.unsplash.com/photo-1573164574511-73c773193279?w=1200&q=70', autor:'Steve Johnson' },
  { id:'tex4',  cat:'Textura',    url:'https://images.unsplash.com/photo-1604147706283-d7119b5b822c?w=1200&q=70', autor:'Pawel Czerwinski' },
];

/* Cores customizáveis (paleta sugerida) */
const CORES_SUGERIDAS = ['#00A650','#008C44','#2563EB','#7C3AED','#E63946','#D97706','#C8A951','#06B6D4','#EC4899','#10B981','#6366F1','#1A2332'];


const DEV_MOTIVOS = [
  'Conta bancária divergente dos dados do cadastro',
  'Conta bancária de terceiros (não é PJ/PF do cadastro)',
  'Dados bancários incompletos ou ilegíveis',
  'CNPJ divergente da Razão Social',
  'Contrato Social ilegível ou desatualizado',
  'IE inválida, vencida ou faltante',
  'Comprovante bancário faltante ou ilegível',
  'Documento de identidade ilegível',
  'CPF/CNPJ do titular não confere',
  'Dados cadastrais incompletos',
  'Endereço incompleto ou inválido',
  'Foto/CNH do motorista ilegível',
  'ANTT/RNTRC inválido ou expirado',
  'E-mail ou telefone inválido',
  'Outros (descrever no campo abaixo)',
];

/* Mapeamento de motivo → campos do formulário que precisam ser corrigidos.
   Quando o analista escolhe o motivo, esses campos vêm marcados por padrão. */
const MOTIVO_CAMPOS = {
  'Conta bancária divergente dos dados do cadastro': ['banco','agencia','conta','titular_conta','cpf_cnpj_titular','comprovante_bancario'],
  'Conta bancária de terceiros (não é PJ/PF do cadastro)': ['titular_conta','cpf_cnpj_titular','comprovante_bancario'],
  'Dados bancários incompletos ou ilegíveis': ['banco','agencia','conta','titular_conta','comprovante_bancario'],
  'CNPJ divergente da Razão Social': ['cnpj','razao_social','comprovante_cnpj'],
  'Contrato Social ilegível ou desatualizado': ['contrato_social'],
  'IE inválida, vencida ou faltante': ['inscricao_estadual','comprovante_ie'],
  'Comprovante bancário faltante ou ilegível': ['comprovante_bancario'],
  'Documento de identidade ilegível': ['documento_identidade'],
  'CPF/CNPJ do titular não confere': ['cpf_cnpj_titular','titular_conta'],
  'Dados cadastrais incompletos': [],  // analista marca manualmente
  'Endereço incompleto ou inválido': ['cep','logradouro','numero','bairro','cidade','estado'],
  'Foto/CNH do motorista ilegível': ['documento_identidade_mot','comprovante_endereco_mot'],
  'ANTT/RNTRC inválido ou expirado': ['antt'],
  'E-mail ou telefone inválido': ['email','celular','telefone'],
  'Outros (descrever no campo abaixo)': [],
};

/* Labels amigáveis dos campos (para exibir no e-mail e no link de correção) */
const CAMPO_LABELS = {
  razao_social:'Razão Social', nome_fantasia:'Nome Fantasia', cnpj:'CNPJ',
  inscricao_estadual:'Inscrição Estadual', nome_completo:'Nome Completo',
  cpf:'CPF', rg:'RG', data_nascimento:'Data de Nascimento',
  nome_completo_mot:'Nome do Motorista', cpf_mot:'CPF do Motorista',
  rg_mot:'RG do Motorista', data_nascimento_mot:'Data Nasc. Motorista',
  cnh_categoria:'CNH Categoria', antt:'ANTT/RNTRC',
  responsavel_nome:'Responsável', responsavel_cargo:'Cargo',
  telefone:'Telefone', celular:'Celular', email:'E-mail', website:'Website',
  cep:'CEP', logradouro:'Logradouro', numero:'Número', complemento:'Complemento',
  bairro:'Bairro', cidade:'Cidade', estado:'UF',
  banco:'Banco', tipo_conta:'Tipo de Conta', agencia:'Agência',
  conta:'Conta', titular_conta:'Titular da Conta',
  cpf_cnpj_titular:'CPF/CNPJ do Titular', pix:'PIX',
  comprovante_cnpj:'Cartão CNPJ', contrato_social:'Contrato Social',
  comprovante_bancario:'Comprovante Bancário', documento_identidade:'Doc. com Foto',
  documento_identidade_mot:'CNH/Documento Motorista',
  comprovante_endereco_mot:'Comprovante Endereço Motorista',
  comprovante_ie:'Comprovante IE',
};

/* ── Sanitização (Segurança: XSS Prevention) ────── */
const sanitize = (str) => {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
};

export default function Home() {
  /* ── Auth State ──────────────────────────────── */
  const [user, setUser] = useState(null);
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
  const [loading, setLoad] = useState(true);
  const [page, setPage] = useState('cadastros');
  const [subTab, setSubTab] = useState('fornecedores'); // 'fornecedores' | 'produtos' | 'desbloqueios'
  const [tab, setTab] = useState('pendentes');
  const [sel, setSel] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDone, setSearchDone] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterAssign, setFilterAssign] = useState('todos');
  const [saving, setSav] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [devMotivoSel, setDevMotivoSel] = useState('');
  const [devMsg, setDevMsg] = useState('');
  const [devCampos, setDevCampos] = useState([]); // campos selecionados para correção
  const [devSending, setDevSending] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [toast, setToast] = useState('');
  const [showConcluir, setShowConcluir] = useState(false);
  const [concluirData, setConcluirData] = useState({ codigo:'' });
  const [sendingEmail, setSendingEmail] = useState(false);

  /* ── Aparência: tema, wallpaper, cor, densidade ── */
  const [tema, setTema] = useState('premix_claro');
  const [corPrimaria, setCorPrimaria] = useState('#00A650');
  const [wallpaper, setWallpaper] = useState(null);
  const [wallpaperOpacidade, setWallpaperOpacidade] = useState(8);
  const [densidade, setDensidade] = useState('normal');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [apCat, setApCat] = useState('Agro'); // categoria selecionada na galeria

  /* ── Kanban State ────────────────────────────── */
  const [kanView, setKanView] = useState('todos');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog' });
  const [editTask, setEditTask] = useState(null);
  const [newChkItem, setNewChkItem] = useState('');

  /* ── Admin State ─────────────────────────────── */
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ nome:'',email:'',senha_hash:'premix2024',cargo:'Analista',role:'user',telefone:'' });
  const [editUser, setEditUser] = useState(null);

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
    const { data, error } = await supabase.from('usuarios_painel').select('*')
      .eq('email', loginForm.email.toLowerCase().trim())
      .eq('senha_hash', loginForm.senha)
      .eq('ativo', true).maybeSingle();
    if (error || !data) {
      setLoginAttempts(a => a + 1);
      setLE('E-mail ou senha inválidos');
      return;
    }
    setUser(data);
    localStorage.setItem('premix_user', JSON.stringify(data));
    if (data.primeiro_login) setCP(true);
    setLoginAttempts(0);
  };

  const doChangePw = async (e) => {
    e.preventDefault();
    if (newPw.nova !== newPw.conf) { setPwMsg('As senhas não coincidem'); return; }
    if (newPw.nova.length < 8) { setPwMsg('Mínimo 8 caracteres'); return; }
    if (!/[A-Z]/.test(newPw.nova) || !/[0-9]/.test(newPw.nova)) { setPwMsg('Use letras maiúsculas e números'); return; }
    const { error } = await supabase.from('usuarios_painel').update({ senha_hash: newPw.nova, primeiro_login: false }).eq('id', user.id);
    if (error) { setPwMsg('Erro ao atualizar'); return; }
    const updated = { ...user, senha_hash: newPw.nova, primeiro_login: false };
    setUser(updated); localStorage.setItem('premix_user', JSON.stringify(updated));
    setCP(false); setNP({ nova:'', conf:'' }); setPwMsg('');
  };

  useEffect(() => { const s = localStorage.getItem('premix_user'); if (s) try { setUser(JSON.parse(s)); } catch {} }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [
      { data: f }, { data: u }, { data: k },
      { data: p }, { data: d }
    ] = await Promise.all([
      supabase.from('fornecedores').select('*').order('created_at', { ascending: false }),
      supabase.from('usuarios_painel').select('*').order('nome'),
      supabase.from('kanban_tarefas').select('*').order('ordem', { ascending: true }),
      supabase.from('produtos').select('*').order('created_at', { ascending: false }),
      supabase.from('desbloqueios').select('*').order('created_at', { ascending: false }),
    ]);
    if (f) setForn(f);
    if (u) setUsu(u);
    if (k) setKanban(k);
    if (p) setProdutos(p);
    if (d) setDesbloqueios(d);
    setLoad(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Aparência: carregar e salvar preferências do usuário ── */
  const loadPrefs = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from('preferencias_usuario')
        .select('*')
        .eq('user_email', user.email)
        .maybeSingle();
      if (error) { console.warn('[loadPrefs]', error.message); }
      if (data) {
        if (data.tema) setTema(data.tema);
        if (data.cor_primaria) setCorPrimaria(data.cor_primaria);
        setWallpaper(data.wallpaper || null);
        if (typeof data.wallpaper_opacidade === 'number') setWallpaperOpacidade(data.wallpaper_opacidade);
        if (data.densidade) setDensidade(data.densidade);
      }
    } catch (e) { console.warn('[loadPrefs] exception', e); }
    finally { setPrefsLoaded(true); }
  }, [user]);

  useEffect(() => { if (user) loadPrefs(); }, [user, loadPrefs]);

  const savePrefs = async (patch) => {
    if (!user?.email) return;
    const payload = {
      user_email: user.email,
      tema, cor_primaria: corPrimaria,
      wallpaper, wallpaper_opacidade: wallpaperOpacidade,
      densidade,
      ...patch,
    };
    try {
      // upsert por user_email (UNIQUE)
      const { error } = await supabase
        .from('preferencias_usuario')
        .upsert(payload, { onConflict: 'user_email' });
      if (error) {
        console.warn('[savePrefs]', error.message);
        showToast('Erro ao salvar preferências');
      }
    } catch (e) {
      console.warn('[savePrefs] exception', e);
    }
  };

  /* ── Tema ativo (com cor primária custom aplicada) ── */
  const T = (() => {
    const base = TEMAS[tema] || TEMAS.premix_claro;
    return { ...base, primary: corPrimaria || base.primary };
  })();

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
      usuarios_painel: setUsu,
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

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('rt-all')
      .on('postgres_changes', { event:'*', schema:'public', table:'fornecedores' }, p => applyRealtimeChange('fornecedores', p))
      .on('postgres_changes', { event:'*', schema:'public', table:'produtos' },     p => applyRealtimeChange('produtos', p))
      .on('postgres_changes', { event:'*', schema:'public', table:'desbloqueios' }, p => applyRealtimeChange('desbloqueios', p))
      .on('postgres_changes', { event:'*', schema:'public', table:'kanban_tarefas' }, p => applyRealtimeChange('kanban_tarefas', p))
      .on('postgres_changes', { event:'*', schema:'public', table:'usuarios_painel' }, p => applyRealtimeChange('usuarios_painel', p))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchAll]);

  /* ── Ações Fornecedores ──────────────────────── */
  const updateStatus = async (id, s) => {
    setSav(true);
    const u = { status: s };
    if (s === 'aprovado') { u.finalizado_por = user.nome; u.data_finalizacao = new Date().toISOString(); }
    await supabase.from('fornecedores').update(u).eq('id', id);
    if (sel?.id === id) setSel({ ...sel, ...u });
    logAcao('mudou_status', 'fornecedor', id, { para: s });
    setSav(false);
  };

  /* ── EmailJS — configs ────────────────────────── */
  const EMAILJS_SERVICE  = 'service_w7xzoya';
  const EMAILJS_PUBLIC   = 'A5igXA6RKwkf84zyR';

  // Você terá UM template no EmailJS com várias variáveis genéricas.
  // O conteúdo do e-mail muda conforme as variáveis preenchidas.
  // (Ver LEIA-PRIMEIRO sobre como configurar este template único.)
  const EMAILJS_TEMPLATE_APROVADO   = 'template_9r33gy7';   // existente: cadastro aprovado
  const EMAILJS_TEMPLATE_DEVOLVIDO  = 'template_devolvido'; // novo: criar no EmailJS
  const EMAILJS_TEMPLATE_DESBLOQ    = 'template_desbloqueado'; // novo: criar no EmailJS

  /* ── Envia um e-mail genérico via EmailJS ── */
  const sendEmail = async (templateId, params) => {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE,
          template_id: templateId,
          user_id: EMAILJS_PUBLIC,
          template_params: params,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error('[sendEmail] EmailJS falhou:', res.status, body);
        return { ok: false, error: `${res.status} — ${body.slice(0,80)}` };
      }
      return { ok: true };
    } catch (err) {
      console.error('[sendEmail] Exceção:', err);
      return { ok: false, error: err.message || 'desconhecido' };
    }
  };

  /* ── Registra ação no log de auditoria ──
     Falha silenciosa: se a auditoria falhar, a operação principal continua.
     Não usa await intencionalmente — fire-and-forget pra não travar UI. */
  const logAcao = (acao, tipoCadastro, cadastroId, detalhes = null) => {
    try {
      supabase.from('auditoria').insert({
        ator_nome: user?.nome || 'desconhecido',
        ator_email: user?.email || null,
        acao,
        tipo_cadastro: tipoCadastro,
        cadastro_id: cadastroId,
        detalhes,
      }).then(({ error }) => {
        if (error) console.warn('[logAcao] falhou (não crítico):', error.message);
      });
    } catch (e) {
      console.warn('[logAcao] exceção (não crítico):', e);
    }
  };

  /* ── Gera token único de correção e devolve a URL pública ──
     URL: https://formulario-fornecedor-nine.vercel.app/corrigir?token=XYZ
     O token só vale uma vez e expira em 30 dias (validado pelo formulário). */
  const FORM_URL_BASE = 'https://formulario-fornecedor-nine.vercel.app';
  const gerarTokenCorrecao = async (tipoCadastro, cadastroId, motivo, camposACorrigir) => {
    const { data, error } = await supabase
      .from('tokens_correcao')
      .insert({
        tipo_cadastro: tipoCadastro,
        cadastro_id: cadastroId,
        gerado_por: user.nome,
        motivo,
        campos_a_corrigir: camposACorrigir,
      })
      .select('token')
      .single();
    if (error || !data?.token) {
      console.error('[gerarTokenCorrecao] erro:', error);
      return null;
    }
    return `${FORM_URL_BASE}/corrigir?token=${data.token}`;
  };

  const concluirCadastro = async () => {
    if (!concluirData.codigo.trim()) { showToast('Informe o código do fornecedor'); return; }

    const emailSolic = (sel?.email_solicitante || '').trim();
    const nomeSolic  = (sel?.nome_solicitante || '').trim();

    if (!emailSolic) {
      showToast('Este cadastro não tem e-mail do solicitante (cadastro antigo).');
      return;
    }

    setSendingEmail(true);

    const upd = {
      status: 'aprovado',
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
      codigo_fornecedor: concluirData.codigo.trim(),
    };

    const { data: updRes, error: updErr } = await supabase
      .from('fornecedores')
      .update(upd)
      .eq('id', sel.id)
      .select();

    if (updErr) {
      console.error('[concluirCadastro] Erro no UPDATE Supabase:', updErr);
      showToast(`Erro ao concluir: ${updErr.message}`);
      setSendingEmail(false);
      return;
    }
    if (!updRes || updRes.length === 0) {
      showToast('Cadastro não foi alterado (verifique permissões RLS).');
      setSendingEmail(false);
      return;
    }

    // Envia e-mail (não bloqueia o sucesso do cadastro se falhar)
    const r = await sendEmail(EMAILJS_TEMPLATE_APROVADO, {
      to_name: nomeSolic || 'Solicitante',
      to_email: emailSolic,
      codigo_fornecedor: concluirData.codigo.trim(),
      fornecedor_nome: sel.razao_social || sel.nome_completo || 'N/A',
    });
    if (r.ok) showToast('Cadastro concluído e e-mail enviado!');
    else showToast(`Cadastro concluído, mas e-mail falhou: ${r.error}`);

    // Auditoria (fire-and-forget)
    logAcao('aprovou', 'fornecedor', sel.id, {
      codigo: concluirData.codigo.trim(),
      email_enviado: r.ok,
    });

    if (sel) setSel({ ...sel, ...upd });
    setShowConcluir(false);
    setConcluirData({ codigo:'' });
    setSendingEmail(false);
    // Não precisa fetchAll() — realtime atualiza a lista automaticamente
  };

  /* ──────────────────────────────────────────────────────────────
     AÇÕES — PRODUTOS
     ────────────────────────────────────────────────────────────── */

  const pegarProduto = async (id) => {
    await supabase.from('produtos').update({ atribuido_para: user.nome, status:'em_analise' }).eq('id', id);
    logAcao('atribuiu', 'produto', id, { para: user.nome });
  };

  const excluirProduto = async (id) => {
    if (!confirm('Excluir este cadastro de produto?')) return;
    await supabase.from('produtos').delete().eq('id', id);
    logAcao('excluiu', 'produto', id);
  };

  const concluirProduto = async (produto, codigoProtheus) => {
    if (!codigoProtheus || !codigoProtheus.trim()) {
      showToast('Informe o código Protheus do produto');
      return;
    }
    const upd = {
      status: 'aprovado',
      codigo_protheus: codigoProtheus.trim(),
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    const { error } = await supabase.from('produtos').update(upd).eq('id', produto.id).select();
    if (error) { showToast(`Erro: ${error.message}`); return; }

    const r = await sendEmail(EMAILJS_TEMPLATE_APROVADO, {
      to_name: produto.nome_solicitante,
      to_email: produto.email_solicitante,
      codigo_fornecedor: codigoProtheus.trim(),   // reaproveita o mesmo template
      fornecedor_nome: (produto.descricao || '').slice(0,80),
    });
    if (r.ok) showToast('Produto cadastrado e e-mail enviado!');
    else showToast(`Produto cadastrado, mas e-mail falhou: ${r.error}`);

    logAcao('aprovou', 'produto', produto.id, { codigo_protheus: codigoProtheus.trim(), email_enviado: r.ok });
  };

  /* ──────────────────────────────────────────────────────────────
     AÇÕES — DESBLOQUEIOS
     ────────────────────────────────────────────────────────────── */

  const pegarDesbloqueio = async (id) => {
    await supabase.from('desbloqueios').update({ atribuido_para: user.nome, status:'em_analise' }).eq('id', id);
    logAcao('atribuiu', 'desbloqueio', id, { para: user.nome });
  };

  const excluirDesbloqueio = async (id) => {
    if (!confirm('Excluir este pedido de desbloqueio?')) return;
    await supabase.from('desbloqueios').delete().eq('id', id);
    logAcao('excluiu', 'desbloqueio', id);
  };

  const concluirDesbloqueio = async (d) => {
    const upd = {
      status: 'desbloqueado',
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    const { error } = await supabase.from('desbloqueios').update(upd).eq('id', d.id).select();
    if (error) { showToast(`Erro: ${error.message}`); return; }

    const r = await sendEmail(EMAILJS_TEMPLATE_DESBLOQ, {
      to_name: d.nome_solicitante,
      to_email: d.email_solicitante,
      codigo_produto: d.codigo_produto,
      nome_produto: d.nome_produto,
    });
    if (r.ok) showToast('Produto desbloqueado e e-mail enviado!');
    else showToast(`Desbloqueado, mas e-mail falhou: ${r.error}`);

    logAcao('desbloqueou', 'desbloqueio', d.id, {
      codigo: d.codigo_produto,
      email_enviado: r.ok,
    });
  };

  const rejeitarDesbloqueio = async (d, motivo) => {
    if (!motivo || !motivo.trim()) { showToast('Informe o motivo da rejeição'); return; }
    const upd = {
      status: 'rejeitado',
      motivo_rejeicao: motivo.trim(),
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    const { error } = await supabase.from('desbloqueios').update(upd).eq('id', d.id);
    if (error) { showToast(`Erro: ${error.message}`); return; }
    showToast('Desbloqueio rejeitado');
    logAcao('rejeitou', 'desbloqueio', d.id, { motivo: motivo.trim() });
  };

  const assignTo = async (id, nome) => {
    setSav(true);
    await supabase.from('fornecedores').update({ atribuido_para: nome, status:'em_analise' }).eq('id', id);
    if (sel?.id === id) setSel({ ...sel, atribuido_para: nome, status:'em_analise' });
    logAcao('atribuiu', 'fornecedor', id, { para: nome });
    setShowAssign(false);
    setSav(false);
  };
  const deleteForn = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cadastro?')) return;
    await supabase.from('fornecedores').delete().eq('id', id);
    logAcao('excluiu', 'fornecedor', id);
    setSel(null);
    setShowModal(false);
  };
  const saveObs = async (id) => {
    if (!obsRef.current) return;
    await supabase.from('fornecedores').update({ observacoes_internas: obsRef.current.value }).eq('id', id);
    showToast('Observação salva');
  };

  /* ── Devolução com motivo + token de correção + e-mail automático ──
     Fluxo:
     1. Valida que motivo e campos foram informados
     2. Gera token único na tabela tokens_correcao (vincula ao cadastro)
     3. Marca cadastro como 'rejeitado' no banco + grava motivo e campos
     4. Envia e-mail com motivo + link único de correção via EmailJS
     5. Registra na auditoria
  */
  const sendDevolutiva = async () => {
    if (!sel) return;

    // Validações
    const motivoFinal = (devMotivoSel === 'Outros (descrever no campo abaixo)' || !devMotivoSel)
      ? devMsg.trim()
      : (devMotivoSel + (devMsg.trim() ? `\n\nObservação adicional: ${devMsg.trim()}` : ''));
    if (!motivoFinal) {
      showToast('Selecione um motivo ou descreva o problema');
      return;
    }
    if (devCampos.length === 0 && devMotivoSel !== 'Dados cadastrais incompletos' && devMotivoSel !== 'Outros (descrever no campo abaixo)') {
      if (!confirm('Você não marcou nenhum campo para correção. Deseja continuar mesmo assim?')) return;
    }

    const emailDest = (sel.email_solicitante || sel.email || '').trim();
    if (!emailDest) {
      showToast('Cadastro sem e-mail do solicitante. Não é possível enviar devolutiva automática.');
      return;
    }

    setDevSending(true);

    // 1. Gera token de correção
    const linkCorrecao = await gerarTokenCorrecao('fornecedor', sel.id, motivoFinal, devCampos);
    if (!linkCorrecao) {
      showToast('Erro ao gerar link de correção. Tente novamente.');
      setDevSending(false);
      return;
    }

    // 2. Atualiza cadastro
    const upd = {
      status: 'rejeitado',
      motivo_devolucao: motivoFinal,
      campos_a_corrigir: devCampos,
      devolvido_em: new Date().toISOString(),
      devolvido_por: user.nome,
      finalizado_por: user.nome,
      data_finalizacao: new Date().toISOString(),
    };
    const { error: updErr } = await supabase
      .from('fornecedores')
      .update(upd)
      .eq('id', sel.id);

    if (updErr) {
      console.error('[sendDevolutiva] Erro update:', updErr);
      showToast(`Erro ao devolver: ${updErr.message}`);
      setDevSending(false);
      return;
    }

    // 3. Monta lista legível de campos a corrigir
    const camposLegiveis = devCampos
      .map(c => CAMPO_LABELS[c] || c)
      .join(', ') || '(nenhum campo específico — revise o cadastro completo)';

    // 4. Envia e-mail
    const r = await sendEmail(EMAILJS_TEMPLATE_DEVOLVIDO, {
      to_name:         (sel.nome_solicitante || 'Solicitante').trim(),
      to_email:        emailDest,
      fornecedor_nome: sel.razao_social || sel.nome_completo || 'Cadastro',
      motivo:          motivoFinal,
      campos_corrigir: camposLegiveis,
      link_correcao:   linkCorrecao,
      analista_nome:   user.nome,
    });
    if (r.ok) showToast('Devolutiva enviada — e-mail despachado ao solicitante');
    else showToast(`Cadastro devolvido, mas e-mail falhou: ${r.error}`);

    // 5. Auditoria
    logAcao('devolveu', 'fornecedor', sel.id, {
      motivo: motivoFinal,
      campos_a_corrigir: devCampos,
      email_enviado: r.ok,
    });

    setSel({ ...sel, ...upd });
    setShowDev(false);
    setDevMotivoSel('');
    setDevMsg('');
    setDevCampos([]);
    setDevSending(false);
  };

  /* ── Kanban ──────────────────────────────────── */
  const addKanTask = async (e) => {
    e.preventDefault();
    if (!newTask.titulo.trim() || !newTask.atribuido_para) { alert('Preencha título e atribua a alguém'); return; }
    const dt = { ...newTask, criado_por: user.nome, checklist: [], comentarios: [] };
    if (!dt.prazo) delete dt.prazo;
    const { error } = await supabase.from('kanban_tarefas').insert(dt);
    if (error) { alert('Erro: ' + error.message); return; }
    setShowNewTask(false);
    setNewTask({ titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog' });
    await fetchAll();
  };
  const moveKanTask = async (id, newStatus) => { await supabase.from('kanban_tarefas').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id); await fetchAll(); };
  const deleteKanTask = async (id) => { if (!confirm('Excluir esta tarefa?')) return; await supabase.from('kanban_tarefas').delete().eq('id', id); if (editTask?.id === id) setEditTask(null); await fetchAll(); };
  const updateKanTask = async (id, data) => { await supabase.from('kanban_tarefas').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id); if (editTask?.id === id) { const { data: nt } = await supabase.from('kanban_tarefas').select('*').eq('id', id).single(); if (nt) setEditTask(nt); } await fetchAll(); };

  const addChkItem = async () => {
    if (!newChkItem.trim() || !editTask) return;
    const newList = [...(editTask.checklist || []), { id: Date.now(), texto: sanitize(newChkItem), feito: false }];
    await updateKanTask(editTask.id, { checklist: newList });
    setNewChkItem('');
  };
  const toggleChkItem = async (itemId) => {
    if (!editTask) return;
    const newList = (editTask.checklist || []).map(i => i.id === itemId ? { ...i, feito: !i.feito } : i);
    await updateKanTask(editTask.id, { checklist: newList });
  };
  const removeChkItem = async (itemId) => {
    if (!editTask) return;
    const newList = (editTask.checklist || []).filter(i => i.id !== itemId);
    await updateKanTask(editTask.id, { checklist: newList });
  };

  /* ── Usuarios (admin) ────────────────────────── */
  const addUser = async (e) => {
    e.preventDefault();
    if (!newUser.nome.trim() || !newUser.email.trim()) return;
    const { error } = await supabase.from('usuarios_painel').insert({ ...newUser, email: newUser.email.toLowerCase(), ativo: true, primeiro_login: true });
    if (error) { alert('Erro: ' + error.message); return; }
    setShowNewUser(false);
    setNewUser({ nome:'',email:'',senha_hash:'premix2024',cargo:'Analista',role:'user',telefone:'' });
    await fetchAll();
  };
  const updateUser = async (id, data) => {
    const { error } = await supabase.from('usuarios_painel').update(data).eq('id', id);
    if (error) { alert('Erro: ' + error.message); return; }
    setEditUser(null); await fetchAll();
  };
  const deleteUser = async (id, nome) => {
    if (!confirm(`Excluir o usuário ${nome}?`)) return;
    await supabase.from('usuarios_painel').delete().eq('id', id);
    await fetchAll();
  };
  const toggleUserActive = async (u) => {
    await supabase.from('usuarios_painel').update({ ativo: !u.ativo }).eq('id', u.id);
    await fetchAll();
  };
  const resetUserPw = async (id, nome) => {
    if (!confirm(`Resetar senha de ${nome} para "premix2024"?`)) return;
    await supabase.from('usuarios_painel').update({ senha_hash:'premix2024', primeiro_login: true }).eq('id', id);
    showToast('Senha resetada');
    await fetchAll();
  };

  /* ── Helpers ─────────────────────────────────── */
  const fmtDate = d => { if (!d) return '-'; return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); };
  const fmtDateShort = d => { if (!d) return ''; return new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }); };
  const cp = t => { navigator.clipboard.writeText(t || ''); showToast('Copiado!'); };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

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
      return (f.razao_social||'').toLowerCase().includes(s) || (f.cnpj||'').includes(s) || (f.nome_fantasia||'').toLowerCase().includes(s) || (f.email||'').toLowerCase().includes(s) || (f.nome_completo||'').toLowerCase().includes(s) || (f.cpf||'').includes(s);
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

  /* ═══════════════════════════════════════════════
     RENDER — LOGIN
     ═══════════════════════════════════════════════ */
  if (!user) return (
    <div style={{minHeight:'100vh',background:'#F5F7FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",padding:20,position:'relative',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        @keyframes loginFadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .login-input:focus { background:#fff !important; border-color:#00A650 !important; box-shadow:0 0 0 3px #E6F7EE !important; }
        .login-input { transition: all .15s; }
        .login-btn:hover:not(:disabled) { background:#008C44 !important; box-shadow:0 6px 16px rgba(0,166,80,.35); transform:translateY(-1px); }
        .login-btn { transition: all .15s; }
      `}</style>
      {/* Decorative background */}
      <div style={{position:'absolute',top:'-200px',right:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(0,166,80,.08) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-200px',left:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(200,169,81,.08) 0%,transparent 70%)',pointerEvents:'none'}} />

      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 12px 32px rgba(16,24,40,.08),0 4px 8px rgba(16,24,40,.04)',border:'1px solid #E5E9EF',animation:'loginFadeIn .35s cubic-bezier(.16,1,.3,1)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#00A650 0%,#00A650 30%,#C8A951 50%,#E63946 70%,#E63946 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite'}} />
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:44,marginBottom:28}} />
        <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:20,fontWeight:700,letterSpacing:'-.4px',marginBottom:6,color:'#1A2332'}}>Painel de Fornecedores</h2>
        <p style={{fontSize:13,color:'#8B94A3',marginBottom:32}}>Núcleo Fiscal — Acesso restrito</p>
        <form onSubmit={doLogin} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input className="login-input" placeholder="E-mail corporativo" type="email" value={loginForm.email} onChange={e=>setLF({...loginForm,email:e.target.value})} disabled={loginLocked} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          <input className="login-input" placeholder="Senha" type="password" value={loginForm.senha} onChange={e=>setLF({...loginForm,senha:e.target.value})} disabled={loginLocked} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          {loginErr && <p style={{color:'#E63946',fontSize:12,margin:'-2px 0',textAlign:'left',fontWeight:500}}>{loginErr}</p>}
          <button className="login-btn" type="submit" disabled={loginLocked} style={{width:'100%',padding:'13px',background:loginLocked?'#B5BCC6':'#00A650',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:600,fontSize:14,cursor:loginLocked?'not-allowed':'pointer',letterSpacing:'.2px',marginTop:6,boxShadow:loginLocked?'none':'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>
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
    <div style={{minHeight:'100vh',background:'#F5F7FA',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Inter','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",padding:20,position:'relative',overflow:'hidden'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        @keyframes loginFadeIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .cp-input:focus { background:#fff !important; border-color:#00A650 !important; box-shadow:0 0 0 3px #E6F7EE !important; }
        .cp-input { transition: all .15s; }
        .cp-btn:hover { background:#008C44 !important; box-shadow:0 6px 16px rgba(0,166,80,.35); transform:translateY(-1px); }
        .cp-btn { transition: all .15s; }
      `}</style>
      <div style={{position:'absolute',top:'-200px',right:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(0,166,80,.08) 0%,transparent 70%)',pointerEvents:'none'}} />
      <div style={{position:'absolute',bottom:'-200px',left:'-200px',width:500,height:500,background:'radial-gradient(circle,rgba(200,169,81,.08) 0%,transparent 70%)',pointerEvents:'none'}} />

      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 12px 32px rgba(16,24,40,.08),0 4px 8px rgba(16,24,40,.04)',border:'1px solid #E5E9EF',animation:'loginFadeIn .35s cubic-bezier(.16,1,.3,1)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#00A650 0%,#00A650 30%,#C8A951 50%,#E63946 70%,#E63946 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite'}} />
        <div style={{width:56,height:56,borderRadius:14,background:'#E6F7EE',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',color:'#00A650'}}>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:20,fontWeight:700,letterSpacing:'-.4px',marginBottom:6,color:'#1A2332'}}>Alterar Senha</h2>
        <p style={{fontSize:13,color:'#8B94A3',marginBottom:28}}>{user.primeiro_login ? 'Primeiro acesso — crie uma nova senha' : 'Trocar senha atual'}</p>
        <form onSubmit={doChangePw} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input className="cp-input" placeholder="Nova senha (mín. 8 caracteres, maiúscula + número)" type="password" value={newPw.nova} onChange={e=>setNP({...newPw,nova:e.target.value})} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          <input className="cp-input" placeholder="Confirmar nova senha" type="password" value={newPw.conf} onChange={e=>setNP({...newPw,conf:e.target.value})} style={{width:'100%',padding:'12px 14px',background:'#F8F9FB',border:'1px solid #E5E9EF',borderRadius:10,fontSize:14,fontFamily:'inherit',color:'#1A2332',outline:'none'}} />
          {pwMsg && <p style={{color:'#E63946',fontSize:12,margin:'-2px 0',textAlign:'left',fontWeight:500}}>{pwMsg}</p>}
          <button className="cp-btn" type="submit" style={{width:'100%',padding:'13px',background:'#00A650',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:600,fontSize:14,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)',marginTop:6}}>Salvar Nova Senha</button>
        </form>
        {!user.primeiro_login && <button onClick={()=>setCP(false)} style={{marginTop:16,background:'none',border:'none',color:'#8B94A3',cursor:'pointer',fontSize:13,fontWeight:500}}>Cancelar</button>}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     RENDER — MAIN APP
     ═══════════════════════════════════════════════ */
  return (
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:"'Inter','Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif",color:T.text1,fontSize:14,lineHeight:1.5,WebkitFontSmoothing:'antialiased',position:'relative'}}>
      {/* Wallpaper background (sutil, atrás de tudo) */}
      {wallpaper && (
        <div aria-hidden="true" style={{
          position:'fixed',inset:0,zIndex:0,pointerEvents:'none',
          backgroundImage:`url(${wallpaper})`,backgroundSize:'cover',backgroundPosition:'center',
          opacity: wallpaperOpacidade / 100,
        }} />
      )}
      <div style={{position:'relative',zIndex:1}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translate(-50%,12px) } to { opacity:1; transform:translate(-50%,0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }
        @keyframes premixShimmer { from { background-position:0% 0 } to { background-position:200% 0 } }
        .sb-link:hover { background:#F8F9FB; color:#1A2332 !important; }
        .sb-link.active::before { content:''; position:absolute; left:-12px; top:50%; transform:translateY(-50%); width:3px; height:20px; background:#00A650; border-radius:0 2px 2px 0; }
        .pmx-row:hover { background:#F8F9FB; }
        .pmx-row { transition: background .12s; }
        .pmx-stat:hover { border-color:#D4D9E0 !important; box-shadow:0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04); transform:translateY(-1px); }
        .pmx-stat { transition: all .2s; }
        .pmx-act:hover { background:#fff !important; border-color:#D4D9E0 !important; transform:translateY(-1px); box-shadow:0 1px 2px rgba(16,24,40,.04); }
        .pmx-act { transition: all .15s; }
        .pmx-act.primary:hover { background:#00A650 !important; color:#fff !important; box-shadow:0 4px 8px rgba(0,166,80,.3) !important; }
        .pmx-act.danger:hover  { background:#E63946 !important; color:#fff !important; box-shadow:0 4px 8px rgba(230,57,70,.3) !important; }
        .pmx-cta:hover { background:#008C44 !important; box-shadow:0 4px 12px rgba(0,166,80,.35); transform:translateY(-1px); }
        .pmx-cta { transition: all .15s; }
        .pmx-icon-btn:hover { background:#F8F9FB; color:#1A2332 !important; }
        .pmx-icon-btn { transition: all .15s; }
        .pmx-subtab:hover { color:#1A2332 !important; }
        .pmx-subtab { transition: color .15s; }
        .pmx-search-input:focus { background:#fff !important; border-color:${T.primary} !important; box-shadow:0 0 0 3px ${T.primaryLight}; }
        .pmx-search-input { transition: all .15s; }
        .pmx-fade-in { animation: fadeIn .25s ease; }

        /* Theme overrides para sidebar, topbar, page-head — só os elementos com classe pmx-themed */
        .pmx-themed-bg { background: ${T.surface} !important; border-color: ${T.border} !important; }
        .pmx-themed-text { color: ${T.text1} !important; }
        .pmx-themed-muted { color: ${T.text2} !important; }
        .pmx-themed-faint { color: ${T.text3} !important; }
        .pmx-themed-surface2 { background: ${T.surface2} !important; }
        .sb-link.active { background: ${T.primaryLight} !important; color: ${T.primaryDark} !important; }
        .sb-link.active::before { background: ${T.primary} !important; }
      `}</style>

      {/* Toast */}
      {toast && <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',background:'#1A2332',color:'#fff',padding:'12px 24px',borderRadius:10,fontSize:'.84rem',fontWeight:600,zIndex:9999,boxShadow:'0 12px 32px rgba(16,24,40,.18)',animation:'slideUp .3s cubic-bezier(.16,1,.3,1)'}}>{toast}</div>}

      {/* ══ APP LAYOUT: SIDEBAR + MAIN ══ */}
      <div style={{display:'grid',gridTemplateColumns:'240px 1fr',minHeight:'100vh'}}>

        {/* ── SIDEBAR ── */}
        <aside className="pmx-themed-bg" style={{background:T.surface,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',position:'sticky',top:0,height:'100vh',zIndex:50}}>
          {/* Brand */}
          <div style={{padding:'18px 20px 16px',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #E5E9EF'}}>
            <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:30}} />
          </div>

          {/* Nav */}
          <nav style={{padding:'12px 12px 0',flex:1,overflowY:'auto'}}>
            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#B5BCC6',padding:'14px 12px 6px'}}>Geral</div>
            {[
              { k:'cadastros', l:'Cadastros',         icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>, count: forn.length + produtos.length + desbloqueios.length },
              { k:'kanban',    l:'Gestão de Tarefas', icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>, count: kanban.filter(k=>k.status!=='concluido').length, alert: true },
            ].map(n => {
              const active = page === n.k;
              return (
                <a key={n.k} onClick={()=>{ setPage(n.k); setSel(null); setShowModal(false); }} className={'sb-link' + (active ? ' active' : '')} style={{
                  display:'flex',alignItems:'center',gap:11,padding:'9px 12px',borderRadius:8,
                  fontSize:13,fontWeight: active ? 600 : 500,
                  color: active ? '#008C44' : '#4F5868',
                  background: active ? '#E6F7EE' : 'transparent',
                  textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1
                }}>
                  {n.icon}
                  <span style={{flex:1}}>{n.l}</span>
                  {n.count > 0 && <span style={{fontWeight:700,fontSize:10,padding:'2px 7px',background: active ? '#00A650' : (n.alert ? '#E63946' : '#EEF1F5'),color: (active || n.alert) ? '#fff' : '#4F5868',borderRadius:20,minWidth:22,textAlign:'center',fontFamily:'Plus Jakarta Sans,sans-serif'}}>{n.count}</span>}
                </a>
              );
            })}

            {isAdmin && (<>
              <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#B5BCC6',padding:'14px 12px 6px'}}>Administração</div>
              <a onClick={()=>{ setPage('admin'); setSel(null); setShowModal(false); }} className={'sb-link' + (page==='admin' ? ' active' : '')} style={{
                display:'flex',alignItems:'center',gap:11,padding:'9px 12px',borderRadius:8,fontSize:13,
                fontWeight: page==='admin' ? 600 : 500,
                color: page==='admin' ? '#008C44' : '#4F5868',
                background: page==='admin' ? '#E6F7EE' : 'transparent',
                textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1
              }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span style={{flex:1}}>Equipe</span>
                {usuarios.length > 0 && <span style={{fontWeight:700,fontSize:10,padding:'2px 7px',background: page==='admin' ? '#00A650' : '#EEF1F5',color: page==='admin' ? '#fff' : '#4F5868',borderRadius:20,minWidth:22,textAlign:'center',fontFamily:'Plus Jakarta Sans,sans-serif'}}>{usuarios.length}</span>}
              </a>
            </>)}

            <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#B5BCC6',padding:'18px 12px 6px'}}>Aparência</div>
            <a onClick={()=>{ setPage('aparencia'); setSel(null); setShowModal(false); }} className={'sb-link' + (page==='aparencia' ? ' active' : '')} style={{display:'flex',alignItems:'center',gap:11,padding:'9px 12px',borderRadius:8,fontSize:13,fontWeight: page==='aparencia' ? 600 : 500,color: page==='aparencia' ? '#008C44' : '#4F5868',background: page==='aparencia' ? '#E6F7EE' : 'transparent',textDecoration:'none',cursor:'pointer',position:'relative',marginBottom:1}}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              <span style={{flex:1}}>Temas & Cores</span>
              <span style={{fontSize:9,fontWeight:700,padding:'1px 6px',background:'#E6F7EE',color:'#008C44',borderRadius:4,letterSpacing:'.3px'}}>NOVO</span>
            </a>
          </nav>

          {/* Footer user */}
          <div style={{padding:14,borderTop:'1px solid #E5E9EF',display:'flex',alignItems:'center',gap:11,cursor:'pointer',position:'relative'}} onClick={()=>setShowLogout(!showLogout)}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#00A650 0%,#008C44 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:12,color:'#fff',boxShadow:'0 4px 12px rgba(0,166,80,.25), inset 0 1px 0 rgba(255,255,255,.2)',flexShrink:0}}>{user.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1A2332',lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.nome.split(' ').slice(0,2).join(' ')}</div>
              <div style={{fontSize:11,color:'#8B94A3'}}>{user.cargo}</div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8B94A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{transform: showLogout ? 'rotate(180deg)' : 'rotate(0)',transition:'.15s'}}><polyline points="6 9 12 15 18 9"/></svg>
            {showLogout && (
              <div style={{position:'absolute',bottom:'calc(100% + 6px)',left:14,right:14,background:'#fff',borderRadius:10,boxShadow:'0 12px 32px rgba(16,24,40,.12),0 4px 8px rgba(16,24,40,.06)',border:'1px solid #E5E9EF',overflow:'hidden',zIndex:200}}>
                <button onClick={(e)=>{e.stopPropagation();setCP(true);setShowLogout(false)}} style={menuItem()}>🔑 Trocar senha</button>
                <div style={{height:1,background:'#EEF1F5'}} />
                <button onClick={(e)=>{e.stopPropagation();localStorage.removeItem('premix_user');setUser(null)}} style={{...menuItem(),color:'#E63946'}}>↪ Sair</button>
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{display:'flex',flexDirection:'column',minWidth:0}}>

          {/* TOPBAR */}
          <header className="pmx-themed-bg" style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:'12px 28px',display:'flex',alignItems:'center',gap:20,position:'sticky',top:0,zIndex:10}}>
            <div style={{height:2,background:'linear-gradient(90deg,#00A650 0%,#00A650 30%,#C8A951 50%,#E63946 70%,#E63946 100%)',backgroundSize:'200% 100%',animation:'premixShimmer 8s linear infinite',position:'absolute',top:0,left:0,right:0}} />

            <div style={{flex:1,maxWidth:480,position:'relative'}}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#8B94A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="pmx-search-input" type="text" placeholder="Buscar fornecedor, produto, CNPJ, e-mail..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:'100%',padding:'10px 14px 10px 38px',background:'#F8F9FB',border:'1px solid transparent',borderRadius:8,fontFamily:'inherit',fontSize:13,color:'#1A2332',outline:'none'}} />
            </div>

            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6}}>
              <button className="pmx-icon-btn" title="Notificações" style={{width:36,height:36,borderRadius:8,background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#4F5868',cursor:'pointer',position:'relative'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              </button>
              <button className="pmx-icon-btn" title="Ajuda" style={{width:36,height:36,borderRadius:8,background:'transparent',border:'none',display:'flex',alignItems:'center',justifyContent:'center',color:'#4F5868',cursor:'pointer'}}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
              </button>
            </div>
          </header>


      {/* ══ PAGE: CADASTROS ══ */}
      {page === 'cadastros' && (
        <div className="pmx-fade-in">
          {/* Page Header (breadcrumb + title) */}
          <div className="pmx-themed-bg" style={{background:T.surface,padding:'16px 28px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:'#8B94A3',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{cursor:'pointer'}}>Núcleo Fiscal</span>
              <span>›</span>
              <span style={{color:'#1A2332',fontWeight:500}}>Cadastros</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Cadastros</h1>
              <div style={{display:'flex',gap:8}}>
                <span style={{fontSize:12,color:'#8B94A3'}}>Atualizado em tempo real</span>
                <span style={{width:8,height:8,borderRadius:'50%',background:'#00A650',boxShadow:'0 0 0 4px rgba(0,166,80,.15)',alignSelf:'center'}} />
              </div>
            </div>
          </div>

          {/* Sub-tabs (estilo Bitrix: linha horizontal, underline) */}
          <div className="pmx-themed-bg" style={{background:T.surface,padding:'0 28px',borderBottom:`1px solid ${T.border}`,display:'flex',gap:0}}>
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
                  color: active ? '#008C44' : '#4F5868',
                  cursor:'pointer',display:'inline-flex',alignItems:'center',gap:8
                }}>
                  {s.icon}
                  <span>{s.l}</span>
                  <span style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:10,padding:'1px 7px',background: active ? '#E6F7EE' : '#EEF1F5',color: active ? '#008C44' : '#4F5868',borderRadius:20,minWidth:20,textAlign:'center'}}>{s.n}</span>
                  {active && <span style={{position:'absolute',bottom:-1,left:12,right:12,height:2,background:'#00A650',borderRadius:'2px 2px 0 0'}} />}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div style={{padding:'22px 28px 32px'}}>

          {/* ── Sub-aba: PRODUTOS ── */}
          {subTab === 'produtos' && (
            <div>
              {/* Stats Produtos */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14,marginBottom:22}}>
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
                    <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Painel Produtos */}
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',margin:0}}>Cadastros de Produtos</h2>
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
                          <tr key={p.id} className="pmx-row" style={{borderBottom:'1px solid #E5E9EF'}}>
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
                              {p.codigo_protheus ? <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,fontWeight:700,padding:'2px 8px',background:'#E6F7EE',color:'#008C44',borderRadius:5,letterSpacing:'.5px'}}>{p.codigo_protheus}</span> : <span style={{color:'#B5BCC6',fontSize:12}}>—</span>}
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
                                    <button className="pmx-act" onClick={()=>pegarProduto(p.id)} title="Pegar para mim" style={actBtn()}>
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                                    </button>
                                  )}
                                  <button className="pmx-act primary" onClick={()=>{const cod = prompt('Código do produto no Protheus:'); if (cod) concluirProduto(p, cod);}} title="Concluir" style={actBtn('primary')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                  </button>
                                  {isAdmin && <button className="pmx-act danger" onClick={()=>excluirProduto(p.id)} title="Excluir" style={actBtn('danger')}>
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
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:14,marginBottom:22}}>
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
                    <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Painel Desbloqueios */}
              <div style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
                <div style={{padding:'14px 20px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',margin:0}}>Pedidos de Desbloqueio</h2>
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
                          <tr key={d.id} className="pmx-row" style={{borderBottom:'1px solid #E5E9EF'}}>
                            <td style={tdSnew()}>
                              <div style={{display:'flex',alignItems:'center',gap:12}}>
                                <div style={{width:36,height:36,borderRadius:9,background:'#FEF3C7',color:'#B45309',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                                </div>
                                <div style={{minWidth:0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2,flexWrap:'wrap'}}>
                                    <span style={{fontFamily:'JetBrains Mono,monospace',background:'#FEF3C7',color:'#B45309',padding:'2px 8px',borderRadius:5,fontSize:11,fontWeight:700}}>{d.codigo_produto}</span>
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
                                    <button className="pmx-act" onClick={()=>pegarDesbloqueio(d.id)} title="Pegar para mim" style={actBtn()}>
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>
                                    </button>
                                  )}
                                  <button className="pmx-act primary" onClick={()=>concluirDesbloqueio(d)} title="Desbloquear" style={actBtn('primary')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                  </button>
                                  <button className="pmx-act danger" onClick={()=>{const m = prompt('Motivo da rejeição:'); if (m) rejeitarDesbloqueio(d, m);}} title="Rejeitar" style={actBtn('danger')}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                                  </button>
                                  {isAdmin && <button className="pmx-act" onClick={()=>excluirDesbloqueio(d.id)} title="Excluir" style={actBtn()}>
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
          <div style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:14,marginBottom:22}}>
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
                <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:28,fontWeight:700,color:'#1A2332',lineHeight:1.1,letterSpacing:'-.8px'}}>{s.n}</div>
              </div>
            ))}
          </div>

          {/* Painel principal: tabs + filtros + lista */}
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #E5E9EF',overflow:'hidden'}}>
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
                    color: active ? '#008C44' : '#4F5868',
                    cursor:'pointer',display:'inline-flex',alignItems:'center',gap:7
                  }}>
                    {t.l}
                    <span style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:10,padding:'1px 7px',background: active ? '#E6F7EE' : '#EEF1F5',color: active ? '#008C44' : '#4F5868',borderRadius:20}}>{t.n}</span>
                    {active && <span style={{position:'absolute',bottom:-1,left:12,right:12,height:2,background:'#00A650'}} />}
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
                <option value="pj">PJ</option><option value="pf">PF</option><option value="motorista">Motorista</option>
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
                    const tipoColors = { pf:{bg:'#EDE9FE',c:'#7C3AED'}, motorista:{bg:'#FEE2E2',c:'#E63946'}, atualizacao:{bg:'#FEF3C7',c:'#B45309'}, default:{bg:'#DBEAFE',c:'#2563EB'} };
                    const tipo = tipoColors[f.tipo_cadastro] || tipoColors.default;
                    const tipoIcon = f.tipo_cadastro==='pf'
                      ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      : f.tipo_cadastro==='motorista'
                      ? <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                      : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>;
                    return (
                      <tr key={f.id} className="pmx-row" onClick={()=>openDetail(f)} style={{borderBottom:'1px solid #E5E9EF',cursor:'pointer',background: sel?.id===f.id ? '#F0FDF4' : 'transparent'}}>
                        <td style={tdSnew()}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{width:36,height:36,borderRadius:9,background:tipo.bg,color:tipo.c,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{tipoIcon}</div>
                            <div style={{minWidth:0}}>
                              <div style={{fontWeight:600,color:'#1A2332',fontSize:13,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                {sanitize(f.razao_social || f.nome_completo || 'Sem nome')}
                                <span style={{display:'inline-block',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'.4px',padding:'1px 6px',borderRadius:3,background:tipo.bg,color:tipo.c}}>{TL[f.tipo_cadastro]||'PJ'}</span>
                              </div>
                              <div style={{fontSize:11,color:'#8B94A3',marginTop:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:280}}>{f.email || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{...tdSnew(),fontFamily:'JetBrains Mono,SF Mono,Consolas,monospace',fontSize:12,color:'#4F5868'}}>{f.cnpj || f.cpf || '-'}</td>
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
                              <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#00A650,#008C44)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:10,color:'#fff'}}>{f.atribuido_para.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
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

      {/* ══ MODAL CENTRAL — DETALHE DO CADASTRO ══ */}
      {showModal && sel && (
        <div style={{position:'fixed',inset:0,background:'rgba(26,35,50,.55)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}} onClick={e=>{if(e.target===e.currentTarget)closeDetail()}}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:760,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 64px rgba(16,24,40,.18),0 8px 16px rgba(16,24,40,.08)',animation:'scaleIn .25s cubic-bezier(.16,1,.3,1)',border:'1px solid #E5E9EF'}}>
            {/* Header */}
            <div style={{padding:'18px 24px',borderBottom:'1px solid #E5E9EF',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,background:'linear-gradient(180deg,#F8F9FB 0%,#fff 100%)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:11,background: sel.tipo_cadastro==='pf'?'#EDE9FE':sel.tipo_cadastro==='motorista'?'#FEE2E2':'#DBEAFE', color: sel.tipo_cadastro==='pf'?'#7C3AED':sel.tipo_cadastro==='motorista'?'#E63946':'#2563EB', display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {sel.tipo_cadastro==='pf'
                    ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    : sel.tipo_cadastro==='motorista'
                    ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                    : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>}
                </div>
                <div>
                  <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:16,fontWeight:700,color:'#1A2332',margin:0,letterSpacing:'-.3px'}}>{sanitize(sel.razao_social || sel.nome_completo)}</h2>
                  <span style={{fontSize:12,color:'#8B94A3'}}>{TL[sel.tipo_cadastro]||'PJ'} · {fmtDate(sel.created_at)}</span>
                </div>
              </div>
              <button className="pmx-icon-btn" onClick={closeDetail} style={{width:36,height:36,borderRadius:8,border:'1px solid #E5E9EF',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#8B94A3'}}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{padding:'22px 24px',overflowY:'auto',flex:1,background:'#FAFBFC'}}>
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
                        <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:11}}>{u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
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
                <div style={{padding:20,background:'#fff',borderRadius:12,marginBottom:16,border:'1px solid #A7F3D0',boxShadow:'0 1px 2px rgba(0,166,80,.06)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <div style={{width:32,height:32,borderRadius:8,background:'#00A650',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332'}}>Concluir Cadastro</div>
                  </div>
                  <div style={{fontSize:12,color:'#8B94A3',marginBottom:16,paddingLeft:42}}>Informe o código gerado pelo sistema. O e-mail será enviado para o solicitante automaticamente.</div>

                  <div style={{display:'grid',gap:12}}>
                    <div>
                      <label style={{fontSize:11,fontWeight:700,color:'#008C44',textTransform:'uppercase',letterSpacing:'.4px',marginBottom:5,display:'block'}}>Código do Fornecedor *</label>
                      <input value={concluirData.codigo} onChange={e=>setConcluirData({...concluirData,codigo:e.target.value})} placeholder="Ex: FORN-00451" style={{width:'100%',padding:'12px 14px',borderRadius:9,border:'1px solid #A7F3D0',fontSize:14,fontWeight:600,outline:'none',fontFamily:'JetBrains Mono,SF Mono,Consolas,monospace',background:'#F0FDF4',letterSpacing:'.5px',color:'#1A2332'}} autoFocus />
                    </div>

                    {/* Dados do solicitante (vindos do cadastro) */}
                    <div style={{background:'#F8F9FB',borderRadius:9,border:'1px solid #E5E9EF',padding:12}}>
                      <div style={{fontSize:10,color:'#8B94A3',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Será enviado para</div>
                      {(sel?.email_solicitante) ? (
                        <div style={{fontSize:13,color:'#1A2332',display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#00A650,#008C44)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:12}}>{(sel.nome_solicitante || 'S').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
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
                          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:800,color:'#008C44',letterSpacing:'1.5px'}}>{concluirData.codigo || '—'}</div>
                        </div>
                        <p style={{fontSize:12,color:'#8B94A3',marginTop:8}}>Em caso de dúvidas, entre em contato com o Núcleo Fiscal.</p>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:10,marginTop:4}}>
                      <button onClick={concluirCadastro} disabled={sendingEmail || !sel?.email_solicitante} style={{flex:1,padding:'13px',borderRadius:10,border:'none',background: (sendingEmail || !sel?.email_solicitante) ? '#B5BCC6' : '#00A650',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:14,cursor: (sendingEmail || !sel?.email_solicitante) ? 'not-allowed' : 'pointer',transition:'.15s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow: (sendingEmail || !sel?.email_solicitante) ? 'none' : '0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>
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
                  <div style={{width:24,height:24,borderRadius:'50%',background:'linear-gradient(135deg,#3B82F6,#2563EB)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:10,flexShrink:0}}>{sel.atribuido_para.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
                  <span style={{color:'#4F5868'}}>Responsável: <strong style={{color:'#1A2332'}}>{sel.atribuido_para}</strong>{sel.finalizado_por && <span style={{color:'#8B94A3'}}> · Finalizado por: <strong style={{color:'#008C44'}}>{sel.finalizado_por}</strong></span>}</span>
                </div>
              )}
              {sel.motivo_devolucao && (
                <div style={{padding:'12px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:9,fontSize:13,marginBottom:12,display:'flex',gap:10}}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:2}}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
                  <div style={{color:'#991B1B'}}><strong>Motivo da devolução:</strong> {sanitize(sel.motivo_devolucao)}</div>
                </div>
              )}

              {/* Dados do Cadastro — Layout Profissional */}
              {(sel.tipo_cadastro === 'pj' || !sel.tipo_cadastro) ? (
                <DataSection title="Dados da Empresa" icon="🏢" items={[['Razão Social',sel.razao_social],['Nome Fantasia',sel.nome_fantasia],['CNPJ',sel.cnpj],['Inscrição Estadual',sel.inscricao_estadual_isento?'ISENTO':sel.inscricao_estadual],['Ramo de Atividade',sel.ramo_atividade],['Produtos/Serviços',sel.produtos_servicos]]} onCopy={cp} />
              ) : (
                <DataSection title={sel.tipo_cadastro==='motorista'?'Dados do Motorista':'Dados Pessoais'} icon={sel.tipo_cadastro==='motorista'?'🚛':'👤'} items={[['Nome Completo',sel.nome_completo],['CPF',sel.cpf],['RG',sel.rg],...(sel.tipo_cadastro==='motorista'?[['CNH',sel.cnh_categoria],['ANTT',sel.antt]]:[])]} onCopy={cp} />
              )}
              <DataSection title="Contato" icon="📞" items={[['Responsável',sel.responsavel_nome],['Cargo',sel.responsavel_cargo],['Telefone',sel.telefone],['Celular',sel.celular],['E-mail',sel.email],['Website',sel.website]]} onCopy={cp} />
              <DataSection title="Endereço" icon="📍" items={[['CEP',sel.cep],['Logradouro',`${sel.logradouro||''}, ${sel.numero||''}`],['Complemento',sel.complemento],['Bairro',sel.bairro],['Cidade',sel.cidade],['Estado',sel.estado]]} onCopy={cp} />
              {sel.tipo_cadastro !== 'motorista' && <DataSection title="Dados Bancários" icon="🏦" items={[['Banco',sel.banco],['Agência',sel.agencia],['Conta',`${sel.conta||''} (${sel.tipo_conta||''})`],['Titular',sel.titular_conta],['CPF/CNPJ Titular',sel.cpf_cnpj_titular],['PIX',sel.pix]]} onCopy={cp} />}

              {/* Documentos */}
              <div style={{marginBottom:20}}>
                <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13,fontWeight:700,color:'#1A2332',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#00A650" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  Documentos anexados
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[[sel.comprovante_cnpj_url,'CNPJ'],[sel.contrato_social_url,'Contrato Social'],[sel.comprovante_bancario_url,'Comp. Bancário'],[sel.documento_identidade_url,'Doc. Identidade']].filter(([u])=>u).map(([u,l],i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer noopener" style={{padding:'9px 14px',background:'#fff',borderRadius:8,color:'#2563EB',fontSize:12,fontWeight:600,textDecoration:'none',transition:'.15s',border:'1px solid #BFDBFE',display:'inline-flex',alignItems:'center',gap:7,boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}
                      onMouseEnter={e=>{e.currentTarget.style.background='#F0F7FF';e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 4px 8px rgba(37,99,235,.15)';}} onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 2px rgba(16,24,40,.04)';}}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {l}
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.5}}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  ))}
                  {![[sel.comprovante_cnpj_url],[sel.contrato_social_url],[sel.comprovante_bancario_url],[sel.documento_identidade_url]].some(([u])=>u) && <span style={{fontSize:13,color:'#8B94A3',fontStyle:'italic'}}>Nenhum documento anexado</span>}
                </div>
              </div>

              {/* Observações */}
              <div>
                <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13,fontWeight:700,color:'#1A2332',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#00A650" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Observações internas
                </div>
                <textarea ref={obsRef} defaultValue={sel.observacoes_internas||''} key={sel.id} placeholder="Adicione anotações internas aqui... (apenas a equipe do Núcleo Fiscal vê)" onBlur={()=>saveObs(sel.id)} style={{width:'100%',padding:'12px 14px',borderRadius:9,border:'1px solid #E5E9EF',fontSize:13,minHeight:80,resize:'vertical',outline:'none',fontFamily:'inherit',background:'#fff',transition:'.15s',color:'#1A2332',lineHeight:1.5}} onFocus={e=>{e.target.style.borderColor='#00A650';e.target.style.boxShadow='0 0 0 3px #E6F7EE';}} onBlurCapture={e=>{e.target.style.borderColor='#E5E9EF';e.target.style.boxShadow='none';}} />
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
            <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Gestão de Tarefas</h1>
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
            <button className="pmx-cta" onClick={()=>setShowNewTask(true)} style={{padding:'10px 18px',borderRadius:9,border:'none',background:'#00A650',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nova Tarefa
            </button>
          </div>

          {/* New Task Form */}
          {showNewTask && (
            <div style={{background:'#fff',borderRadius:12,padding:22,marginBottom:20,border:'1px solid #E5E9EF',boxShadow:'0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04)'}}>
              <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,marginBottom:14,color:'#1A2332'}}>Nova Tarefa</div>
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
                  <button onClick={addKanTask} className="pmx-cta" style={{padding:'10px 20px',borderRadius:9,border:'none',background:'#00A650',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    Criar Tarefa
                  </button>
                  <button onClick={()=>setShowNewTask(false)} style={{padding:'10px 20px',borderRadius:9,border:'1px solid #E5E9EF',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:13,cursor:'pointer',color:'#4F5868'}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Colunas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,alignItems:'flex-start'}}>
            {KAN_COLS.map(col => {
              const tasks = kanFiltered.filter(t => t.status === col.k);
              return (
                <div key={col.k} style={{background:'#fff',borderRadius:12,padding:10,minHeight:300,border:'1px solid #E5E9EF',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                  <div style={{padding:'4px 8px 12px 8px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #E5E9EF',marginBottom:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:7}}>
                      <span style={{width:8,height:8,borderRadius:'50%',background:col.c}} />
                      <span style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:12,fontWeight:700,color:'#1A2332',textTransform:'uppercase',letterSpacing:'.5px'}}>{col.l}</span>
                    </div>
                    <span style={{background:'#F8F9FB',color:'#4F5868',borderRadius:20,padding:'2px 9px',fontSize:11,fontWeight:700,fontFamily:'Plus Jakarta Sans,sans-serif',border:'1px solid #E5E9EF'}}>{tasks.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {tasks.map(t => {
                      const p = PRI[t.prioridade] || PRI.media;
                      const progress = calcProgress(t.checklist);
                      return (
                        <div key={t.id} onClick={()=>setEditTask(t)} style={{background:'#fff',borderRadius:9,padding:'12px 14px',border:'1px solid #E5E9EF',cursor:'pointer',transition:'all .15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='#00A650';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,166,80,.1)';e.currentTarget.style.transform='translateY(-1px)';}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='#E5E9EF';e.currentTarget.style.boxShadow='none';e.currentTarget.style.transform='translateY(0)';}}>
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
                              <div style={{width:18,height:18,borderRadius:'50%',background:'linear-gradient(135deg,#00A650,#008C44)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:8}}>{(t.atribuido_para||'??').split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
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
            <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Equipe</h1>
          </div>
          <div style={{padding:'22px 28px 32px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:16,fontWeight:700,color:'#1A2332',margin:0}}>Gestão da Equipe</h2>
              <p style={{fontSize:13,color:'#8B94A3',marginTop:2}}>Gerencie acessos, perfis e permissões</p>
            </div>
            <button className="pmx-cta" onClick={()=>setShowNewUser(true)} style={{padding:'10px 18px',borderRadius:9,border:'none',background:'#00A650',color:'#fff',fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)',display:'inline-flex',alignItems:'center',gap:7}}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
              Novo Usuário
            </button>
          </div>

          {showNewUser && (
            <div style={{background:'#fff',borderRadius:12,padding:22,marginBottom:20,border:'1px solid #E5E9EF',boxShadow:'0 4px 12px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.04)'}}>
              <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,marginBottom:14,color:'#1A2332'}}>Novo Usuário</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <input placeholder="Nome completo *" value={newUser.nome} onChange={e=>setNewUser({...newUser,nome:e.target.value})} style={fieldStyle()} />
                <input placeholder="E-mail *" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} style={fieldStyle()} />
                <input placeholder="Cargo" value={newUser.cargo} onChange={e=>setNewUser({...newUser,cargo:e.target.value})} style={fieldStyle()} />
                <input placeholder="Telefone" value={newUser.telefone} onChange={e=>setNewUser({...newUser,telefone:e.target.value})} style={fieldStyle()} />
                <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} style={fieldStyle()}>
                  <option value="user">Usuário</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option>
                </select>
                <input placeholder="Senha inicial" value={newUser.senha_hash} onChange={e=>setNewUser({...newUser,senha_hash:e.target.value})} style={fieldStyle()} />
                <div style={{gridColumn:'1/-1',display:'flex',gap:10,marginTop:4}}>
                  <button onClick={addUser} className="pmx-cta" style={{padding:'10px 20px',borderRadius:9,border:'none',background:'#00A650',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)'}}>Criar Usuário</button>
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
                          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#00A650,#008C44)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Plus Jakarta Sans,sans-serif',fontWeight:700,fontSize:11,flexShrink:0}}>{u.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</div>
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
                            <button onClick={()=>updateUser(u.id,{nome:document.getElementById(`u-nome-${u.id}`).value,email:document.getElementById(`u-email-${u.id}`).value.toLowerCase(),cargo:document.getElementById(`u-cargo-${u.id}`).value,role:document.getElementById(`u-role-${u.id}`).value})} style={{padding:'6px 12px',borderRadius:7,border:'none',background:'#00A650',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Salvar</button>
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

      {/* ══ PAGE: APARÊNCIA — Temas, Cores, Wallpapers ══ */}
      {page === 'aparencia' && (
        <div className="pmx-fade-in">
          <div className="pmx-themed-bg" style={{background:T.surface,padding:'16px 28px',borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:12,color:'#8B94A3',marginBottom:6,display:'flex',alignItems:'center',gap:6}}>
              <span style={{cursor:'pointer'}}>Núcleo Fiscal</span>
              <span>›</span>
              <span style={{color:'#1A2332',fontWeight:500}}>Temas & Cores</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <h1 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:22,fontWeight:700,color:'#1A2332',letterSpacing:'-.4px',margin:0}}>Aparência</h1>
                <p style={{fontSize:13,color:'#8B94A3',marginTop:2}}>Personalize a aparência do painel. Mudanças são salvas automaticamente.</p>
              </div>
              {prefsLoaded && (
                <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 14px',background:'#E6F7EE',color:'#008C44',borderRadius:20,fontSize:12,fontWeight:600}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:'#00A650',boxShadow:'0 0 0 3px rgba(0,166,80,.2)'}} />
                  Salvando automaticamente
                </div>
              )}
            </div>
          </div>

          <div style={{padding:'22px 28px 40px'}}>

            {/* SEÇÃO 1: TEMAS */}
            <section style={{marginBottom:32}}>
              <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',marginBottom:4}}>Tema</h2>
              <p style={{fontSize:12,color:'#8B94A3',marginBottom:14}}>Escolha um conjunto de cores para o painel. As mudanças aparecem em tempo real.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                {Object.entries(TEMAS).map(([k, t]) => {
                  const ativo = tema === k;
                  return (
                    <button key={k} onClick={()=>{setTema(k);savePrefs({tema:k});}} style={{
                      textAlign:'left',padding:14,borderRadius:12,
                      border: ativo ? '2px solid #00A650' : '2px solid transparent',
                      background:'#fff',cursor:'pointer',fontFamily:'inherit',
                      boxShadow: ativo ? '0 4px 12px rgba(0,166,80,.2)' : '0 1px 2px rgba(16,24,40,.04)',
                      transition:'all .15s',position:'relative'
                    }}>
                      {/* Preview do tema */}
                      <div style={{display:'flex',gap:0,height:60,borderRadius:8,overflow:'hidden',marginBottom:10,border:'1px solid '+t.border}}>
                        <div style={{flex:'0 0 30%',background:t.surface,borderRight:'1px solid '+t.border,position:'relative'}}>
                          <div style={{position:'absolute',top:6,left:6,right:6,height:4,background:t.primary,borderRadius:2}} />
                          <div style={{position:'absolute',top:14,left:6,width:'70%',height:3,background:t.text2,borderRadius:2,opacity:.4}} />
                          <div style={{position:'absolute',top:22,left:6,width:'50%',height:3,background:t.text2,borderRadius:2,opacity:.3}} />
                        </div>
                        <div style={{flex:1,background:t.bg,padding:6,display:'flex',gap:4,alignItems:'flex-start'}}>
                          <div style={{flex:1,background:t.surface,borderRadius:4,padding:5}}>
                            <div style={{height:3,background:t.primary,borderRadius:2,marginBottom:3,width:'40%'}} />
                            <div style={{height:2,background:t.text2,borderRadius:2,opacity:.3}} />
                          </div>
                          <div style={{width:18,height:18,borderRadius:4,background:t.primary}} />
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div>
                          <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:14,fontWeight:700,color:'#1A2332'}}>{t.nome}</div>
                          <div style={{fontSize:11,color:'#8B94A3',marginTop:1}}>{t.descricao}</div>
                        </div>
                        {ativo && (
                          <div style={{width:22,height:22,borderRadius:'50%',background:'#00A650',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* SEÇÃO 2: COR PRIMÁRIA */}
            <section style={{marginBottom:32}}>
              <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',marginBottom:4}}>Cor primária</h2>
              <p style={{fontSize:12,color:'#8B94A3',marginBottom:14}}>Cor de destaque usada em botões, links e elementos ativos.</p>
              <div style={{background:'#fff',padding:18,borderRadius:12,border:'1px solid #E5E9EF',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>
                <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:16}}>
                  {CORES_SUGERIDAS.map(cor => (
                    <button key={cor} onClick={()=>{setCorPrimaria(cor);savePrefs({cor_primaria:cor});}} title={cor} style={{
                      width:38,height:38,borderRadius:10,border: corPrimaria===cor ? '3px solid #1A2332' : '2px solid #E5E9EF',
                      background:cor,cursor:'pointer',padding:0,transition:'all .15s',
                      boxShadow: corPrimaria===cor ? `0 4px 12px ${cor}66` : '0 1px 2px rgba(16,24,40,.06)',
                      transform: corPrimaria===cor ? 'scale(1.1)' : 'scale(1)'
                    }} />
                  ))}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',borderTop:'1px solid #E5E9EF',paddingTop:14}}>
                  <label style={{fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.5px'}}>Personalizada:</label>
                  <input type="color" value={corPrimaria} onChange={e=>setCorPrimaria(e.target.value)} onBlur={()=>savePrefs({})} style={{width:42,height:36,padding:2,border:'1px solid #E5E9EF',borderRadius:8,cursor:'pointer'}} />
                  <input type="text" value={corPrimaria} onChange={e=>setCorPrimaria(e.target.value)} onBlur={()=>savePrefs({})} placeholder="#00A650" style={{padding:'9px 12px',borderRadius:8,border:'1px solid #E5E9EF',fontSize:13,fontFamily:'JetBrains Mono,monospace',color:'#1A2332',outline:'none',width:110,background:'#F8F9FB'}} />
                  {/* Preview do botão (próximo do input) */}
                  <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'4px 10px 4px 14px',background:'#F8F9FB',borderRadius:20,border:'1px solid #E5E9EF'}}>
                    <span style={{fontSize:11,color:'#8B94A3',fontWeight:600}}>Preview:</span>
                    <button style={{padding:'7px 14px',borderRadius:7,border:'none',background:corPrimaria,color:'#fff',fontFamily:'inherit',fontSize:12,fontWeight:600,cursor:'default',boxShadow:`0 1px 2px ${corPrimaria}66, inset 0 1px 0 rgba(255,255,255,.15)`}}>Botão</button>
                  </div>
                </div>
              </div>
            </section>

            {/* SEÇÃO 3: WALLPAPER */}
            <section style={{marginBottom:32}}>
              <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',marginBottom:4}}>Wallpaper</h2>
              <p style={{fontSize:12,color:'#8B94A3',marginBottom:14}}>Imagem de fundo sutil. Use opacidade baixa para não distrair durante o trabalho.</p>
              <div style={{background:'#fff',padding:18,borderRadius:12,border:'1px solid #E5E9EF',boxShadow:'0 1px 2px rgba(16,24,40,.04)'}}>

                {/* Categorias */}
                <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                  {['Agro','Natureza','Abstrato','Minimalista','Textura'].map(c => (
                    <button key={c} onClick={()=>setApCat(c)} style={{
                      padding:'6px 14px',borderRadius:20,border:'1px solid '+ (apCat===c ? '#00A650' : '#E5E9EF'),
                      background: apCat===c ? '#E6F7EE' : '#fff',
                      color: apCat===c ? '#008C44' : '#4F5868',
                      fontFamily:'inherit',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all .15s'
                    }}>{c}</button>
                  ))}
                </div>

                {/* Grade de wallpapers */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:18}}>
                  {/* Opção "Sem wallpaper" */}
                  <button onClick={()=>{setWallpaper(null);savePrefs({wallpaper:null});}} style={{
                    aspectRatio:'3/2',borderRadius:10,
                    border: !wallpaper ? '3px solid #00A650' : '1px solid #E5E9EF',
                    background:'linear-gradient(135deg,#F8F9FB 0%,#EEF1F5 100%)',cursor:'pointer',padding:0,
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,
                    transition:'all .15s',position:'relative'
                  }}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#8B94A3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    <span style={{fontSize:11,color:'#4F5868',fontWeight:600}}>Sem wallpaper</span>
                    {!wallpaper && <div style={{position:'absolute',top:6,right:6,width:20,height:20,borderRadius:'50%',background:'#00A650',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>}
                  </button>

                  {WALLPAPERS.filter(w=>w.cat===apCat).map(w => {
                    const ativo = wallpaper === w.url;
                    return (
                      <button key={w.id} onClick={()=>{setWallpaper(w.url);savePrefs({wallpaper:w.url});}} title={`Foto por ${w.autor} no Unsplash`} style={{
                        aspectRatio:'3/2',borderRadius:10,
                        border: ativo ? '3px solid #00A650' : '1px solid #E5E9EF',
                        background:`url(${w.url}) center/cover no-repeat,#F8F9FB`,
                        cursor:'pointer',padding:0,transition:'all .15s',position:'relative',overflow:'hidden'
                      }}>
                        {ativo && <div style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',background:'#00A650',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 6px rgba(0,0,0,.3)'}}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>}
                        <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'4px 8px',background:'linear-gradient(180deg,transparent,rgba(0,0,0,.6))',color:'#fff',fontSize:9,fontWeight:500,opacity:.9,textAlign:'left'}}>📷 {w.autor}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Opacidade do wallpaper */}
                {wallpaper && (
                  <div style={{borderTop:'1px solid #E5E9EF',paddingTop:14}}>
                    <label style={{fontSize:12,fontWeight:600,color:'#4F5868',marginBottom:6,display:'block'}}>Opacidade: <strong style={{color:'#00A650'}}>{wallpaperOpacidade}%</strong> <span style={{fontWeight:400,color:'#8B94A3'}}>· menor = mais sutil</span></label>
                    <input type="range" min="3" max="40" step="1" value={wallpaperOpacidade} onChange={e=>setWallpaperOpacidade(parseInt(e.target.value))} onMouseUp={()=>savePrefs({})} onTouchEnd={()=>savePrefs({})} style={{width:'100%',accentColor:'#00A650',cursor:'pointer'}} />
                  </div>
                )}

                {/* Upload próprio (placeholder) */}
                <div style={{borderTop:'1px solid #E5E9EF',marginTop:14,paddingTop:14,fontSize:12,color:'#8B94A3',display:'flex',alignItems:'center',gap:8}}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Upload de imagem própria — disponível em breve (precisamos configurar o Storage do Supabase para isso).</span>
                </div>
              </div>
            </section>

            {/* SEÇÃO 4: DENSIDADE */}
            <section style={{marginBottom:32}}>
              <h2 style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:15,fontWeight:700,color:'#1A2332',marginBottom:4}}>Densidade</h2>
              <p style={{fontSize:12,color:'#8B94A3',marginBottom:14}}>Ajuste o espaçamento entre elementos.</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[
                  { k:'compacto',     l:'Compacto',     d:'Mais informação na tela' },
                  { k:'normal',       l:'Normal',       d:'Equilíbrio padrão' },
                  { k:'confortavel',  l:'Confortável',  d:'Mais respiração visual' },
                ].map(d => {
                  const ativo = densidade === d.k;
                  return (
                    <button key={d.k} onClick={()=>{setDensidade(d.k);savePrefs({densidade:d.k});}} style={{
                      textAlign:'left',padding:'14px 16px',borderRadius:10,
                      border: ativo ? '2px solid #00A650' : '1px solid #E5E9EF',
                      background: ativo ? '#E6F7EE' : '#fff',
                      cursor:'pointer',fontFamily:'inherit',transition:'all .15s'
                    }}>
                      <div style={{fontFamily:'Plus Jakarta Sans,sans-serif',fontSize:13,fontWeight:700,color: ativo ? '#008C44' : '#1A2332',marginBottom:2}}>{d.l}</div>
                      <div style={{fontSize:11,color:'#8B94A3'}}>{d.d}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Disclaimer/créditos */}
            <div style={{background:'#fff',padding:14,borderRadius:10,border:'1px solid #E5E9EF',fontSize:12,color:'#8B94A3',display:'flex',alignItems:'flex-start',gap:10}}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#00A650" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <div>
                <strong style={{color:'#1A2332'}}>Sobre as imagens:</strong> wallpapers cortesia do <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style={{color:'#00A650',fontWeight:600,textDecoration:'none'}}>Unsplash</a>, fotografias profissionais de uso livre. Os créditos aparecem em cada miniatura.
              </div>
            </div>
          </div>
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
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════ */

function DataSection({ title, icon, items, onCopy }) {
  const valid = items.filter(([, val]) => val && String(val).trim() && String(val).trim() !== ',');
  if (!valid.length) return null;
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:'.78rem',fontWeight:700,color:'#0f172a',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
        {icon} {title}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,background:'#f8fafc',borderRadius:12,padding:16,border:'1px solid #f1f5f9'}}>
        {valid.map(([label, val], i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:2}}>{label}</div>
              <div style={{fontSize:'.86rem',fontWeight:500,wordBreak:'break-word',color:'#0f172a'}}>{sanitize(String(val))}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();onCopy(String(val))}} title="Copiar" style={{background:'none',border:'none',cursor:'pointer',fontSize:'.7rem',color:'#94a3b8',padding:4,flexShrink:0,opacity:.6,transition:'.15s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.6'}>📋</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, color, bg, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'8px 14px',borderRadius:8,border:`1.5px solid ${color}`,background:bg,
      color,fontFamily:'inherit',fontSize:'.75rem',fontWeight:700,cursor:disabled?'not-allowed':'pointer',
      transition:'.15s',opacity:disabled?.5:1
    }}>{children}</button>
  );
}

function PillBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 14px',borderRadius:20,
      border: active ? '1.5px solid #059669' : '1.5px solid #e2e8f0',
      background: active ? 'rgba(5,150,105,.06)' : '#fff',
      color: active ? '#059669' : '#94a3b8',
      fontFamily:'inherit',fontSize:'.75rem',fontWeight: active ? 700 : 500,cursor:'pointer',transition:'.15s'
    }}>{children}</button>
  );
}

function SmBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding:'5px 8px',borderRadius:6,
      border: danger ? 'none' : '1px solid #e2e8f0',
      background: danger ? '#FEF2F2' : '#f8fafc',
      cursor:'pointer',fontSize:'.78rem',transition:'.15s'
    }}>{children}</button>
  );
}

function StatNum({ label, value, color }) {
  return (
    <div>
      <div style={{fontSize:'.62rem',color:'#94a3b8',textTransform:'uppercase',fontWeight:600,letterSpacing:'.3px'}}>{label}</div>
      <div style={{fontWeight:800,fontSize:'1.2rem',color,marginTop:2}}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════ */
function inputStyle() {
  return { width:'100%',padding:'12px 14px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'.88rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',transition:'.15s',color:'#0f172a' };
}
function fieldStyle() {
  return { width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'.84rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',transition:'.15s',color:'#0f172a' };
}
function selectStyle() {
  return { padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'.82rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',cursor:'pointer',color:'#0f172a' };
}
function menuItem() {
  return { display:'block',width:'100%',padding:'11px 18px',border:'none',background:'transparent',textAlign:'left',fontSize:'.82rem',fontFamily:'inherit',fontWeight:500,cursor:'pointer',color:'#0f172a',transition:'.15s' };
}
function tdS() {
  return { padding:'14px 18px',fontSize:'.84rem',verticalAlign:'middle' };
}
function thS() {
  return { textAlign:'left',padding:'11px 16px',fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.4px',background:'#F8F9FB',borderBottom:'1px solid #E5E9EF' };
}
function tdSnew() {
  return { padding:'14px 16px',fontSize:13,color:'#1A2332',verticalAlign:'middle' };
}
function btnAction(color, bg) {
  return { padding:'7px 12px',borderRadius:8,border:`1px solid ${color}33`,background:bg,color,fontFamily:'inherit',fontSize:'.74rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'.15s' };
}
function actBtn(variant) {
  const base = { width:30,height:30,borderRadius:7,border:'1px solid #E5E9EF',background:'#F8F9FB',color:'#4F5868',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'all .15s' };
  if (variant === 'primary') return {...base,background:'#E6F7EE',borderColor:'rgba(0,166,80,.3)',color:'#008C44'};
  if (variant === 'danger')  return {...base,background:'#FEE2E2',borderColor:'rgba(230,57,70,.3)',color:'#E63946'};
  return base;
}
function modalActBtn(variant) {
  const base = { display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .15s',border:'1px solid' };
  if (variant === 'primary') return {...base,background:'#00A650',borderColor:'#00A650',color:'#fff',boxShadow:'0 1px 2px rgba(0,166,80,.3),inset 0 1px 0 rgba(255,255,255,.15)'};
  if (variant === 'danger')  return {...base,background:'#fff',borderColor:'#FECACA',color:'#E63946'};
  if (variant === 'info')    return {...base,background:'#fff',borderColor:'#BFDBFE',color:'#2563EB'};
  return {...base,background:'#fff',borderColor:'#E5E9EF',color:'#4F5868'};
}
