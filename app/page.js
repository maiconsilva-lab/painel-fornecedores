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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Montserrat,system-ui,sans-serif',padding:20}}>
      <div style={{background:'#fff',borderRadius:20,padding:'52px 44px',maxWidth:400,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 25px 60px rgba(0,0,0,.25)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#059669,#C8A951,#059669)'}} />
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:44,marginBottom:28}} />
        <h2 style={{fontSize:'1rem',fontWeight:700,letterSpacing:'.5px',marginBottom:4,color:'#0f172a'}}>Painel de Fornecedores</h2>
        <p style={{fontSize:'.8rem',color:'#94a3b8',marginBottom:32}}>Núcleo Fiscal — Acesso restrito</p>
        <form onSubmit={doLogin} style={{display:'flex',flexDirection:'column',gap:14}}>
          <input placeholder="E-mail corporativo" type="email" value={loginForm.email} onChange={e=>setLF({...loginForm,email:e.target.value})} disabled={loginLocked} style={inputStyle()} />
          <input placeholder="Senha" type="password" value={loginForm.senha} onChange={e=>setLF({...loginForm,senha:e.target.value})} disabled={loginLocked} style={inputStyle()} />
          {loginErr && <p style={{color:'#DC2626',fontSize:'.78rem',margin:'-4px 0',textAlign:'left'}}>{loginErr}</p>}
          <button type="submit" disabled={loginLocked} style={{width:'100%',padding:'14px',background:loginLocked?'#94a3b8':'#059669',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:700,fontSize:'.88rem',cursor:loginLocked?'not-allowed':'pointer',letterSpacing:'.3px',transition:'.2s',marginTop:4}}>
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
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Montserrat,system-ui,sans-serif',padding:20}}>
      <div style={{background:'#fff',borderRadius:20,padding:'52px 44px',maxWidth:400,width:'100%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 25px 60px rgba(0,0,0,.25)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#059669,#C8A951,#059669)'}} />
        <div style={{width:56,height:56,borderRadius:14,background:'#ECFDF5',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'1.5rem'}}>🔐</div>
        <h2 style={{fontSize:'1rem',fontWeight:700,marginBottom:4}}>Alterar Senha</h2>
        <p style={{fontSize:'.78rem',color:'#94a3b8',marginBottom:24}}>{user.primeiro_login ? 'Primeiro acesso — crie uma nova senha' : 'Trocar senha atual'}</p>
        <form onSubmit={doChangePw} style={{display:'flex',flexDirection:'column',gap:14}}>
          <input placeholder="Nova senha (mín. 8 caracteres, maiúscula + número)" type="password" value={newPw.nova} onChange={e=>setNP({...newPw,nova:e.target.value})} style={inputStyle()} />
          <input placeholder="Confirmar nova senha" type="password" value={newPw.conf} onChange={e=>setNP({...newPw,conf:e.target.value})} style={inputStyle()} />
          {pwMsg && <p style={{color:'#DC2626',fontSize:'.78rem',margin:'-4px 0',textAlign:'left'}}>{pwMsg}</p>}
          <button type="submit" style={{width:'100%',padding:'14px',background:'#059669',color:'#fff',border:'none',borderRadius:10,fontFamily:'inherit',fontWeight:700,fontSize:'.88rem',cursor:'pointer'}}>Salvar Nova Senha</button>
        </form>
        {!user.primeiro_login && <button onClick={()=>setCP(false)} style={{marginTop:14,background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:'.78rem'}}>Cancelar</button>}
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════
     RENDER — MAIN APP
     ═══════════════════════════════════════════════ */
  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif'}}>
      {/* Toast */}
      {toast && <div style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',background:'#0f172a',color:'#fff',padding:'12px 24px',borderRadius:10,fontSize:'.84rem',fontWeight:600,zIndex:9999,boxShadow:'0 8px 30px rgba(0,0,0,.2)',animation:'slideUp .3s ease'}}>{toast}</div>}

      {/* ══ HEADER ══ */}
      <header style={{background:'#0f172a',position:'sticky',top:0,zIndex:100,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
        <div style={{height:3,background:'linear-gradient(90deg,#00A650 0%,#00A650 35%,#C8A951 50%,#E63946 65%,#E63946 100%)'}} />
        <div style={{padding:'0 28px',display:'flex',alignItems:'center',justifyContent:'space-between',maxWidth:1440,margin:'0 auto',height:60}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:26}} />
            <div style={{height:20,width:1,background:'rgba(255,255,255,.12)'}} />
            <span style={{color:'#e2e8f0',fontSize:'.78rem',fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase'}}>Núcleo Fiscal</span>
          </div>

          <nav style={{display:'flex',gap:2}}>
            {[
              { k:'cadastros', l:'Cadastros', icon:'📋' },
              { k:'kanban',    l:'Gestão de Tarefas', icon:'📊' },
              ...(isAdmin ? [{ k:'admin', l:'Equipe', icon:'⚙️' }] : [])
            ].map(n => (
              <button key={n.k} onClick={()=>{ setPage(n.k); setSel(null); setShowModal(false); }} style={{
                padding:'8px 18px',borderRadius:8,border:'none',
                background: page===n.k ? 'rgba(5,150,105,.15)' : 'transparent',
                color: page===n.k ? '#34d399' : 'rgba(255,255,255,.5)',
                fontFamily:'inherit',fontSize:'.8rem',fontWeight: page===n.k ? 700 : 500,
                cursor:'pointer',transition:'.2s',letterSpacing:'.2px'
              }}>
                {n.icon} {n.l}
              </button>
            ))}
          </nav>

          <div style={{position:'relative'}}>
            <button onClick={()=>setShowLogout(!showLogout)} style={{display:'flex',alignItems:'center',gap:10,padding:'6px 12px 6px 6px',background:'rgba(255,255,255,.06)',borderRadius:12,border:'none',cursor:'pointer'}}>
              <div style={{width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,#059669,#34d399)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'.75rem',fontWeight:700}}>{user.nome.split(' ').map(n=>n[0]).slice(0,2).join('')}</div>
              <div style={{textAlign:'left',lineHeight:1.2}}>
                <div style={{color:'#e2e8f0',fontSize:'.78rem',fontWeight:600}}>{user.nome.split(' ').slice(0,2).join(' ')}</div>
                <div style={{color:'#64748b',fontSize:'.65rem'}}>{user.cargo}</div>
              </div>
              <span style={{color:'#64748b',fontSize:'.6rem',marginLeft:4}}>▾</span>
            </button>
            {showLogout && (
              <div style={{position:'absolute',top:'calc(100% + 6px)',right:0,background:'#fff',borderRadius:12,boxShadow:'0 10px 40px rgba(0,0,0,.12)',border:'1px solid #e2e8f0',minWidth:190,overflow:'hidden',zIndex:200}}>
                <button onClick={()=>{setCP(true);setShowLogout(false)}} style={menuItem()}>🔑 Trocar senha</button>
                <div style={{height:1,background:'#f1f5f9',margin:'0 12px'}} />
                <button onClick={()=>{localStorage.removeItem('premix_user');setUser(null)}} style={{...menuItem(),color:'#DC2626'}}>↪ Sair</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══ PAGE: CADASTROS ══ */}
      {page === 'cadastros' && (
        <div style={{maxWidth:1440,margin:'0 auto',padding:'24px 28px'}}>

          {/* Sub-abas: Fornecedores | Produtos | Desbloqueios */}
          <div style={{display:'flex',gap:6,marginBottom:20,padding:6,background:'#f1f5f9',borderRadius:14,width:'fit-content'}}>
            {[
              { k:'fornecedores', l:'Fornecedores', n: forn.length, icon:'🏢' },
              { k:'produtos',     l:'Produtos',     n: produtos.length, icon:'📦' },
              { k:'desbloqueios', l:'Desbloqueios', n: desbloqueios.length, icon:'🔓' },
            ].map(s => (
              <button key={s.k} onClick={()=>{ setSubTab(s.k); setSel(null); setShowModal(false); setTab('pendentes'); }} style={{
                padding:'10px 20px',borderRadius:10,border:'none',
                background: subTab===s.k ? '#fff' : 'transparent',
                color: subTab===s.k ? '#059669' : '#64748b',
                fontFamily:'inherit',fontSize:'.82rem',fontWeight: subTab===s.k ? 700 : 500,
                cursor:'pointer',transition:'.2s',
                boxShadow: subTab===s.k ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                display:'flex',alignItems:'center',gap:8
              }}>
                <span>{s.icon}</span>
                <span>{s.l}</span>
                <span style={{
                  background: subTab===s.k ? '#ECFDF5' : '#e2e8f0',
                  color: subTab===s.k ? '#059669' : '#94a3b8',
                  padding:'2px 8px',borderRadius:20,fontSize:'.65rem',fontWeight:700,minWidth:20,textAlign:'center'
                }}>{s.n}</span>
              </button>
            ))}
          </div>

          {/* ── Sub-aba: PRODUTOS ── */}
          {subTab === 'produtos' && (
            <div>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:20}}>
                {[
                  { n: produtos.filter(p=>p.status==='pendente').length,   l:'Pendentes',  c:'#D97706', bg:'#FFFBEB' },
                  { n: produtos.filter(p=>p.status==='em_analise').length, l:'Em Análise', c:'#2563EB', bg:'#EFF6FF' },
                  { n: produtos.filter(p=>p.status==='aprovado').length,   l:'Aprovados',  c:'#059669', bg:'#ECFDF5' },
                  { n: produtos.filter(p=>p.status==='rejeitado').length,  l:'Devolvidos', c:'#DC2626', bg:'#FEF2F2' },
                ].map((s,i)=>(
                  <div key={i} style={{padding:'16px 18px',borderRadius:12,background:s.bg,border:'1px solid rgba(0,0,0,.04)'}}>
                    <div style={{fontSize:'.7rem',color:s.c,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>{s.l}</div>
                    <div style={{fontSize:'1.7rem',fontWeight:800,color:s.c,marginTop:2}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Lista */}
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <h2 style={{fontSize:'.95rem',fontWeight:700,color:'#0f172a'}}>Cadastros de Produtos</h2>
                  <span style={{fontSize:'.72rem',color:'#94a3b8'}}>{produtos.length} total</span>
                </div>

                {produtos.length === 0 ? (
                  <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
                    <div style={{fontSize:'2.5rem',marginBottom:12}}>📦</div>
                    <div style={{fontWeight:600}}>Nenhum cadastro de produto ainda</div>
                    <div style={{fontSize:'.78rem',marginTop:4}}>Os cadastros aparecem aqui quando enviados pelo formulário interno</div>
                  </div>
                ) : (
                  <div style={{display:'grid',gap:8}}>
                    {produtos.map(p => {
                      const st = ST[p.status] || ST.pendente;
                      const isFinal = p.status === 'aprovado' || p.status === 'rejeitado';
                      return (
                        <div key={p.id} style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                              <span style={{background:st.bg,color:st.c,padding:'2px 10px',borderRadius:20,fontSize:'.68rem',fontWeight:700}}>{st.l}</span>
                              {p.codigo_protheus && <span style={{fontFamily:'monospace',background:'#ECFDF5',color:'#059669',padding:'2px 8px',borderRadius:5,fontSize:'.72rem',fontWeight:700}}>{p.codigo_protheus}</span>}
                              {p.ncm && <span style={{fontSize:'.7rem',color:'#64748b'}}>NCM: <strong>{p.ncm}</strong></span>}
                              {p.unidade_medida && <span style={{fontSize:'.7rem',color:'#64748b'}}>UN: <strong>{p.unidade_medida}</strong></span>}
                            </div>
                            <div style={{fontWeight:600,color:'#0f172a',fontSize:'.88rem',marginBottom:2,lineHeight:1.3}}>{(p.descricao||'').slice(0,140)}{p.descricao && p.descricao.length > 140 ? '…' : ''}</div>
                            {p.finalidade && <div style={{fontSize:'.74rem',color:'#475569',marginBottom:4}}><strong>Finalidade:</strong> {p.finalidade}</div>}
                            <div style={{fontSize:'.72rem',color:'#94a3b8'}}>
                              {p.nome_solicitante} ({p.email_solicitante}) · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                              {p.atribuido_para && <span> · Em análise: <strong style={{color:'#475569'}}>{p.atribuido_para}</strong></span>}
                            </div>
                            {p.motivo_devolucao && <div style={{color:'#DC2626',marginTop:4,fontSize:'.72rem'}}>Motivo: {p.motivo_devolucao}</div>}
                          </div>
                          {!isFinal && (
                            <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                              {p.status === 'pendente' && (
                                <button onClick={()=>pegarProduto(p.id)} style={btnAction('#2563EB','#EFF6FF')}>📌 Pegar</button>
                              )}
                              <button onClick={()=>{
                                const cod = prompt('Código do produto no Protheus:');
                                if (cod) concluirProduto(p, cod);
                              }} style={btnAction('#059669','#ECFDF5')}>✓ Concluir</button>
                              {isAdmin && <button onClick={()=>excluirProduto(p.id)} style={btnAction('#94a3b8','#F8FAFC')}>🗑</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sub-aba: DESBLOQUEIOS ── */}
          {subTab === 'desbloqueios' && (
            <div>
              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12,marginBottom:20}}>
                {[
                  { n: desbloqueios.filter(d=>d.status==='pendente').length,     l:'Pendentes',     c:'#D97706', bg:'#FFFBEB' },
                  { n: desbloqueios.filter(d=>d.status==='em_analise').length,   l:'Em Análise',    c:'#2563EB', bg:'#EFF6FF' },
                  { n: desbloqueios.filter(d=>d.status==='desbloqueado').length, l:'Desbloqueados', c:'#059669', bg:'#ECFDF5' },
                  { n: desbloqueios.filter(d=>d.status==='rejeitado').length,    l:'Rejeitados',    c:'#DC2626', bg:'#FEF2F2' },
                ].map((s,i)=>(
                  <div key={i} style={{padding:'16px 18px',borderRadius:12,background:s.bg,border:'1px solid rgba(0,0,0,.04)'}}>
                    <div style={{fontSize:'.7rem',color:s.c,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase'}}>{s.l}</div>
                    <div style={{fontSize:'1.7rem',fontWeight:800,color:s.c,marginTop:2}}>{s.n}</div>
                  </div>
                ))}
              </div>

              {/* Lista */}
              <div style={{background:'#fff',borderRadius:16,border:'1px solid #e2e8f0',padding:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <h2 style={{fontSize:'.95rem',fontWeight:700,color:'#0f172a'}}>Pedidos de Desbloqueio</h2>
                  <span style={{fontSize:'.72rem',color:'#94a3b8'}}>{desbloqueios.length} total</span>
                </div>

                {desbloqueios.length === 0 ? (
                  <div style={{textAlign:'center',padding:60,color:'#94a3b8'}}>
                    <div style={{fontSize:'2.5rem',marginBottom:12}}>🔓</div>
                    <div style={{fontWeight:600}}>Nenhum pedido de desbloqueio ainda</div>
                    <div style={{fontSize:'.78rem',marginTop:4}}>Os pedidos aparecem aqui quando enviados pelo formulário interno</div>
                  </div>
                ) : (
                  <div style={{display:'grid',gap:8}}>
                    {desbloqueios.map(d => {
                      const st = ST[d.status === 'desbloqueado' ? 'aprovado' : d.status] || ST.pendente;
                      const statusLabel = d.status === 'desbloqueado' ? 'Desbloqueado' : st.l;
                      const isFinal = d.status === 'desbloqueado' || d.status === 'rejeitado';
                      return (
                        <div key={d.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:10,border:'1px solid #e2e8f0',background:'#fff'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                              <span style={{fontFamily:'monospace',background:'#fef3c7',color:'#92400e',padding:'2px 8px',borderRadius:5,fontSize:'.78rem',fontWeight:700}}>{d.codigo_produto}</span>
                              <span style={{fontWeight:600,color:'#0f172a',fontSize:'.9rem'}}>{d.nome_produto}</span>
                              <span style={{background:st.bg,color:st.c,padding:'2px 10px',borderRadius:20,fontSize:'.68rem',fontWeight:700}}>{statusLabel}</span>
                            </div>
                            <div style={{fontSize:'.72rem',color:'#94a3b8'}}>
                              {d.nome_solicitante} ({d.email_solicitante}) · {new Date(d.created_at).toLocaleDateString('pt-BR')}
                              {d.atribuido_para && <span> · Em análise: <strong style={{color:'#475569'}}>{d.atribuido_para}</strong></span>}
                              {d.motivo_rejeicao && <div style={{color:'#DC2626',marginTop:4,fontSize:'.72rem'}}>Motivo da rejeição: {d.motivo_rejeicao}</div>}
                            </div>
                          </div>
                          {!isFinal && (
                            <div style={{display:'flex',gap:6,flexShrink:0}}>
                              {d.status === 'pendente' && (
                                <button onClick={()=>pegarDesbloqueio(d.id)} style={btnAction('#2563EB','#EFF6FF')}>📌 Pegar</button>
                              )}
                              <button onClick={()=>concluirDesbloqueio(d)} style={btnAction('#059669','#ECFDF5')}>✓ Desbloquear</button>
                              <button onClick={()=>{
                                const m = prompt('Motivo da rejeição:');
                                if (m) rejeitarDesbloqueio(d, m);
                              }} style={btnAction('#DC2626','#FEF2F2')}>↩ Rejeitar</button>
                              {isAdmin && <button onClick={()=>excluirDesbloqueio(d.id)} style={btnAction('#94a3b8','#F8FAFC')}>🗑</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sub-aba: FORNECEDORES (conteúdo existente) ── */}
          {subTab === 'fornecedores' && (<>
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:14,marginBottom:24}}>
            {[
              { n: pend.filter(f=>f.status==='pendente').length,   l:'Pendentes',  c:'#D97706', bg:'linear-gradient(135deg,#FFFBEB,#FEF3C7)' },
              { n: pend.filter(f=>f.status==='em_analise').length, l:'Em Análise', c:'#2563EB', bg:'linear-gradient(135deg,#EFF6FF,#DBEAFE)' },
              { n: done.filter(f=>f.status==='aprovado').length,   l:'Concluídos', c:'#059669', bg:'linear-gradient(135deg,#ECFDF5,#D1FAE5)' },
              { n: done.filter(f=>f.status==='rejeitado').length,  l:'Devolvidos', c:'#DC2626', bg:'linear-gradient(135deg,#FEF2F2,#FEE2E2)' },
              { n: forn.length,                                     l:'Total',     c:'#0f172a', bg:'linear-gradient(135deg,#f8fafc,#e2e8f0)' },
            ].map((s,i) => (
              <div key={i} style={{padding:'20px',borderRadius:14,background:s.bg,border:'1px solid rgba(0,0,0,.04)'}}>
                <div style={{fontSize:'.72rem',color:s.c,fontWeight:600,letterSpacing:'.3px',textTransform:'uppercase',opacity:.8}}>{s.l}</div>
                <div style={{fontSize:'2rem',fontWeight:800,color:s.c,marginTop:4,letterSpacing:'-1px'}}>{s.n}</div>
              </div>
            ))}
          </div>

          {/* Tabs + Filtros */}
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',border:'1px solid #e2e8f0',borderBottom:'none'}}>
            <div style={{display:'flex',borderBottom:'1px solid #e2e8f0'}}>
              {[
                { k:'pendentes', l:'Tarefas', n:pend.length },
                { k:'concluidos', l:'Concluídos & Devolvidos', n:done.length }
              ].map(t => (
                <button key={t.k} onClick={()=>{setTab(t.k);setSel(null);setShowModal(false)}} style={{
                  padding:'14px 24px',border:'none',background:'transparent',
                  fontFamily:'inherit',fontSize:'.82rem',fontWeight: tab===t.k ? 700 : 500,
                  color: tab===t.k ? '#059669' : '#94a3b8',cursor:'pointer',
                  borderBottom: tab===t.k ? '2px solid #059669' : '2px solid transparent',
                  marginBottom:-1,transition:'.15s'
                }}>
                  {t.l} <span style={{background: tab===t.k?'#059669':'#e2e8f0',color: tab===t.k?'#fff':'#94a3b8',padding:'2px 8px',borderRadius:20,fontSize:'.68rem',fontWeight:700,marginLeft:6}}>{t.n}</span>
                </button>
              ))}
            </div>
            <div style={{padding:'14px 18px',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{position:'relative',flex:'1 1 280px'}}>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:'.85rem',color:'#94a3b8'}}>🔍</span>
                <input placeholder="Buscar nome, CNPJ, e-mail..." value={tab==='pendentes'?search:searchDone} onChange={e=>tab==='pendentes'?setSearch(e.target.value):setSearchDone(e.target.value)} style={{...inputStyle(),paddingLeft:36,marginBottom:0}} />
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
          </div>

          {/* Lista de Cadastros */}
          <div style={{background:'#fff',padding:'8px 18px 18px',borderRadius:'0 0 16px 16px',border:'1px solid #e2e8f0',borderTop:'none',minHeight:300}}>
            {loading ? (
              <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>
                <div style={{fontSize:'1.2rem',marginBottom:8}}>Carregando...</div>
              </div>
            ) : (tab==='pendentes' ? listPend : listDone).length === 0 ? (
              <div style={{textAlign:'center',padding:80,color:'#94a3b8'}}>
                <div style={{fontSize:'2.5rem',marginBottom:12}}>📭</div>
                <div style={{fontWeight:600}}>Nenhum cadastro encontrado</div>
              </div>
            ) : (
              <div style={{display:'grid',gap:8}}>
                {(tab==='pendentes' ? listPend : listDone).map(f => {
                  const st = ST[f.status] || ST.pendente;
                  return (
                    <div key={f.id} onClick={()=>openDetail(f)} style={{
                      display:'flex',alignItems:'center',gap:16,padding:'14px 18px',borderRadius:12,
                      border:'1px solid #e2e8f0',cursor:'pointer',transition:'.15s',
                      background: sel?.id===f.id ? '#f0fdf4' : '#fff',
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#059669'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=sel?.id===f.id?'#059669':'#e2e8f0'}>
                      <div style={{width:42,height:42,borderRadius:10,background:st.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>
                        {f.tipo_cadastro==='pf'?'👤':f.tipo_cadastro==='motorista'?'🚛':'🏢'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:'.88rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#0f172a'}}>{sanitize(f.razao_social || f.nome_completo || 'Sem nome')}</div>
                        <div style={{fontSize:'.75rem',color:'#94a3b8',marginTop:2}}>{f.cnpj || f.cpf || '-'} • {f.email || '-'}</div>
                      </div>
                      <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                        <span style={{padding:'4px 10px',borderRadius:6,fontSize:'.68rem',fontWeight:700,background:'#f1f5f9',color:'#475569'}}>{TL[f.tipo_cadastro] || 'PJ'}</span>
                        <span style={{padding:'4px 10px',borderRadius:6,fontSize:'.68rem',fontWeight:700,background:st.bg,color:st.c}}>{st.l}</span>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0,minWidth:100}}>
                        <div style={{fontSize:'.7rem',color:'#94a3b8'}}>{fmtDate(f.created_at)}</div>
                        {f.atribuido_para && <div style={{fontSize:'.68rem',color:'#2563EB',fontWeight:600,marginTop:2}}>👤 {f.atribuido_para.split(' ')[0]}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>)}{/* fim sub-aba fornecedores */}
        </div>
      )}

      {/* ══ MODAL CENTRAL — DETALHE DO CADASTRO ══ */}
      {showModal && sel && (
        <div style={{position:'fixed',inset:0,background:'rgba(15,23,42,.6)',backdropFilter:'blur(4px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}} onClick={e=>{if(e.target===e.currentTarget)closeDetail()}}>
          <div style={{background:'#fff',borderRadius:20,width:'100%',maxWidth:720,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 25px 60px rgba(0,0,0,.2)',animation:'scaleIn .25s ease'}}>
            {/* Header */}
            <div style={{padding:'20px 28px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:ST[sel.status]?.bg||'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem'}}>
                  {sel.tipo_cadastro==='pf'?'👤':sel.tipo_cadastro==='motorista'?'🚛':'🏢'}
                </div>
                <div>
                  <h2 style={{fontSize:'1rem',fontWeight:700,color:'#0f172a',margin:0}}>{sanitize(sel.razao_social || sel.nome_completo)}</h2>
                  <span style={{fontSize:'.75rem',color:'#94a3b8'}}>{TL[sel.tipo_cadastro]||'PJ'} • {fmtDate(sel.created_at)}</span>
                </div>
              </div>
              <button onClick={closeDetail} style={{width:36,height:36,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',cursor:'pointer',fontSize:'1rem',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',transition:'.15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>✕</button>
            </div>

            {/* Scrollable Body */}
            <div style={{padding:'24px 28px',overflowY:'auto',flex:1}}>
              {/* Ações */}
              <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                {sel.status==='pendente' && !sel.atribuido_para && <ActionBtn onClick={()=>assignTo(sel.id,user.nome)} color="#059669" bg="#ECFDF5" disabled={saving}>📌 Pegar para mim</ActionBtn>}
                {(sel.status==='pendente'||sel.status==='em_analise') && <>
                  <ActionBtn onClick={()=>setShowAssign(true)} color="#2563EB" bg="#EFF6FF" disabled={saving}>👥 Direcionar</ActionBtn>
                  <ActionBtn onClick={()=>setShowConcluir(true)} color="#059669" bg="#ECFDF5" disabled={saving}>✓ Concluir</ActionBtn>
                  <ActionBtn onClick={()=>setShowDev(true)} color="#DC2626" bg="#FEF2F2" disabled={saving}>↩ Devolver</ActionBtn>
                </>}
                {isSubAdmin && <ActionBtn onClick={()=>deleteForn(sel.id)} color="#DC2626" bg="#FEF2F2">🗑 Excluir</ActionBtn>}
              </div>

              {/* Assign Panel */}
              {showAssign && (
                <div style={{padding:16,background:'#EFF6FF',borderRadius:12,marginBottom:16,border:'1px solid #BFDBFE'}}>
                  <div style={{fontSize:'.78rem',fontWeight:700,color:'#2563EB',marginBottom:10}}>Direcionar para:</div>
                  <div style={{display:'grid',gap:6}}>
                    {usuarios.filter(u=>u.ativo).map(u => (
                      <button key={u.id} onClick={()=>assignTo(sel.id,u.nome)} style={{padding:'10px 14px',borderRadius:8,border:'1px solid #BFDBFE',background:'#fff',cursor:'pointer',textAlign:'left',fontSize:'.82rem',fontFamily:'inherit',transition:'.15s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <strong>{u.nome}</strong> <span style={{color:'#94a3b8',fontSize:'.72rem'}}>— {u.cargo}</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>setShowAssign(false)} style={{marginTop:8,background:'none',border:'none',color:'#94a3b8',cursor:'pointer',fontSize:'.75rem'}}>Cancelar</button>
                </div>
              )}

              {/* Devolutiva — motivo + campos a corrigir + link único */}
              {showDev && (
                <div style={{padding:18,background:'#FEF2F2',borderRadius:14,marginBottom:16,border:'1px solid #FECACA'}}>
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
                <div style={{padding:20,background:'#ECFDF5',borderRadius:14,marginBottom:16,border:'1px solid #A7F3D0'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div style={{width:32,height:32,borderRadius:8,background:'#059669',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.9rem'}}>✓</div>
                    <div style={{fontSize:'.88rem',fontWeight:700,color:'#059669'}}>Concluir Cadastro</div>
                  </div>
                  <div style={{fontSize:'.74rem',color:'#64748b',marginBottom:16}}>Informe apenas o código gerado pelo sistema. O e-mail será enviado para o solicitante automaticamente.</div>

                  <div style={{display:'grid',gap:12}}>
                    <div>
                      <label style={{fontSize:'.72rem',fontWeight:700,color:'#059669',textTransform:'uppercase',letterSpacing:'.3px',marginBottom:4,display:'block'}}>Código do Fornecedor *</label>
                      <input value={concluirData.codigo} onChange={e=>setConcluirData({...concluirData,codigo:e.target.value})} placeholder="Ex: FORN-00451" style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #A7F3D0',fontSize:'.9rem',fontWeight:600,outline:'none',fontFamily:'inherit',background:'#fff',letterSpacing:'.5px'}} autoFocus />
                    </div>

                    {/* Dados do solicitante (vindos do cadastro) */}
                    <div style={{background:'#fff',borderRadius:10,border:'1px solid #D1FAE5',padding:14}}>
                      <div style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:8}}>Será enviado para</div>
                      {(sel?.email_solicitante) ? (
                        <div style={{fontSize:'.85rem',color:'#0f172a'}}>
                          <div style={{fontWeight:600}}>{sel.nome_solicitante || 'Solicitante'}</div>
                          <div style={{color:'#64748b',fontSize:'.8rem',marginTop:2}}>{sel.email_solicitante}</div>
                        </div>
                      ) : (
                        <div style={{fontSize:'.8rem',color:'#dc2626',background:'#fef2f2',padding:'8px 12px',borderRadius:6,border:'1px solid #fecaca'}}>
                          ⚠️ Este cadastro não tem e-mail do solicitante (cadastro antigo, antes da atualização do formulário). Não será possível enviar o e-mail automaticamente.
                        </div>
                      )}
                    </div>

                    {/* Preview do e-mail */}
                    <div style={{background:'#fff',borderRadius:10,border:'1px solid #D1FAE5',padding:16}}>
                      <div style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:8}}>Pré-visualização do e-mail</div>
                      <div style={{fontSize:'.82rem',color:'#0f172a',lineHeight:1.7}}>
                        <p>Olá{sel?.nome_solicitante ? ` ${sel.nome_solicitante}` : ''},</p>
                        <p style={{marginTop:8}}>O cadastro de fornecedor que você solicitou foi concluído com sucesso!</p>
                        <div style={{margin:'12px 0',padding:'14px 18px',background:'#ECFDF5',borderRadius:10,border:'1px solid #A7F3D0',textAlign:'center'}}>
                          <div style={{fontSize:'.7rem',color:'#059669',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Código de Fornecedor Premix</div>
                          <div style={{fontSize:'1.3rem',fontWeight:800,color:'#059669',letterSpacing:'1px'}}>{concluirData.codigo || '—'}</div>
                        </div>
                        <p style={{fontSize:'.78rem',color:'#64748b',marginTop:8}}>Em caso de dúvidas, entre em contato com o Núcleo Fiscal.</p>
                        <p style={{fontSize:'.78rem',color:'#64748b',marginTop:4}}>Atenciosamente,<br/>Núcleo Fiscal — Premix</p>
                      </div>
                    </div>

                    <div style={{display:'flex',gap:10,marginTop:4}}>
                      <button onClick={concluirCadastro} disabled={sendingEmail || !sel?.email_solicitante} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background: (sendingEmail || !sel?.email_solicitante) ? '#94a3b8' : '#059669',color:'#fff',fontFamily:'inherit',fontWeight:700,fontSize:'.84rem',cursor: (sendingEmail || !sel?.email_solicitante) ? 'not-allowed' : 'pointer',transition:'.15s'}}>
                        {sendingEmail ? '⏳ Enviando...' : '✓ Concluir e Enviar E-mail'}
                      </button>
                      <button onClick={()=>{setShowConcluir(false);setConcluirData({codigo:''})}} style={{padding:'12px 20px',borderRadius:10,border:'1px solid #A7F3D0',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:'.84rem',cursor:'pointer',color:'#64748b'}}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Badges */}
              {sel.atribuido_para && <div style={{padding:'10px 14px',background:'#EFF6FF',borderRadius:10,fontSize:'.78rem',marginBottom:14,color:'#2563EB',display:'flex',alignItems:'center',gap:6}}>👤 Responsável: <strong>{sel.atribuido_para}</strong>{sel.finalizado_por && <span style={{color:'#94a3b8'}}> • Finalizado por: <strong style={{color:'#059669'}}>{sel.finalizado_por}</strong></span>}</div>}
              {sel.motivo_devolucao && <div style={{padding:'10px 14px',background:'#FEF2F2',borderRadius:10,fontSize:'.78rem',marginBottom:14,color:'#DC2626'}}>↩ <strong>Motivo:</strong> {sanitize(sel.motivo_devolucao)}</div>}

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
                <div style={{fontSize:'.78rem',fontWeight:700,color:'#0f172a',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>📎 Documentos</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[[sel.comprovante_cnpj_url,'CNPJ'],[sel.contrato_social_url,'Contrato Social'],[sel.comprovante_bancario_url,'Comp. Bancário'],[sel.documento_identidade_url,'Doc. Identidade']].filter(([u])=>u).map(([u,l],i) => (
                    <a key={i} href={u} target="_blank" rel="noreferrer noopener" style={{padding:'8px 14px',background:'#EFF6FF',borderRadius:8,color:'#2563EB',fontSize:'.75rem',fontWeight:600,textDecoration:'none',transition:'.15s',border:'1px solid #BFDBFE'}}
                      onMouseEnter={e=>e.currentTarget.style.background='#DBEAFE'} onMouseLeave={e=>e.currentTarget.style.background='#EFF6FF'}>
                      📄 {l}
                    </a>
                  ))}
                  {![[sel.comprovante_cnpj_url],[sel.contrato_social_url],[sel.comprovante_bancario_url],[sel.documento_identidade_url]].some(([u])=>u) && <span style={{fontSize:'.78rem',color:'#94a3b8'}}>Nenhum documento anexado</span>}
                </div>
              </div>

              {/* Observações */}
              <div>
                <div style={{fontSize:'.78rem',fontWeight:700,color:'#0f172a',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>📝 Observações internas</div>
                <textarea ref={obsRef} defaultValue={sel.observacoes_internas||''} key={sel.id} placeholder="Adicione anotações internas aqui..." onBlur={()=>saveObs(sel.id)} style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1px solid #e2e8f0',fontSize:'.84rem',minHeight:70,resize:'vertical',outline:'none',fontFamily:'inherit',background:'#f8fafc',transition:'.15s'}} onFocus={e=>e.target.style.borderColor='#059669'} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAGE: GESTÃO DE TAREFAS ══ */}
      {page === 'kanban' && (
        <div style={{maxWidth:1440,margin:'0 auto',padding:'24px 28px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'.78rem',fontWeight:700,color:'#0f172a',marginRight:6}}>Filtrar:</span>
              <PillBtn active={kanView==='todos'} onClick={()=>setKanView('todos')}>Todos</PillBtn>
              {usuarios.filter(u=>u.ativo).map(u => (
                <PillBtn key={u.id} active={kanView===u.nome} onClick={()=>setKanView(u.nome)}>{u.nome.split(' ')[0]}</PillBtn>
              ))}
            </div>
            <button onClick={()=>setShowNewTask(true)} style={{padding:'10px 22px',borderRadius:10,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontSize:'.82rem',fontWeight:700,cursor:'pointer',boxShadow:'0 2px 10px rgba(5,150,105,.25)',transition:'.15s'}}>
              + Nova Tarefa
            </button>
          </div>

          {/* New Task Form */}
          {showNewTask && (
            <div style={{background:'#fff',borderRadius:16,padding:24,marginBottom:20,border:'1px solid #e2e8f0',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
              <div style={{fontSize:'.88rem',fontWeight:700,marginBottom:16,color:'#0f172a'}}>Nova Tarefa</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
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
                <div style={{gridColumn:'1/-1',display:'flex',gap:10}}>
                  <button onClick={addKanTask} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontWeight:700,fontSize:'.82rem',cursor:'pointer'}}>Criar Tarefa</button>
                  <button onClick={()=>setShowNewTask(false)} style={{padding:'10px 24px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontFamily:'inherit',fontWeight:500,fontSize:'.82rem',cursor:'pointer',color:'#94a3b8'}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Colunas */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,alignItems:'flex-start'}}>
            {KAN_COLS.map(col => {
              const tasks = kanFiltered.filter(t => t.status === col.k);
              return (
                <div key={col.k} style={{background:'#f1f5f9',borderRadius:14,padding:10,minHeight:300}}>
                  <div style={{fontSize:'.75rem',fontWeight:700,color:col.c,marginBottom:10,padding:'8px 10px',display:'flex',justifyContent:'space-between',alignItems:'center',textTransform:'uppercase',letterSpacing:'.3px'}}>
                    <span>{col.l}</span>
                    <span style={{background:col.c,color:'#fff',borderRadius:20,padding:'2px 9px',fontSize:'.65rem',fontWeight:700}}>{tasks.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {tasks.map(t => {
                      const p = PRI[t.prioridade] || PRI.media;
                      const progress = calcProgress(t.checklist);
                      return (
                        <div key={t.id} onClick={()=>setEditTask(t)} style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1px solid #e2e8f0',cursor:'pointer',transition:'.15s'}}
                          onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,.06)'}
                          onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                            <div style={{fontSize:'.84rem',fontWeight:600,lineHeight:1.3,flex:1,color:'#0f172a'}}>{sanitize(t.titulo)}</div>
                            <span style={{padding:'3px 8px',borderRadius:6,fontSize:'.62rem',fontWeight:700,background:p.bg,color:p.c,flexShrink:0}}>{p.l}</span>
                          </div>
                          {t.descricao && <div style={{fontSize:'.74rem',color:'#94a3b8',marginTop:6,lineHeight:1.4}}>{sanitize(t.descricao.substring(0,80))}{t.descricao.length>80?'...':''}</div>}
                          {t.checklist && t.checklist.length > 0 && (
                            <div style={{marginTop:10}}>
                              <div style={{display:'flex',justifyContent:'space-between',fontSize:'.65rem',color:'#94a3b8',marginBottom:4}}>
                                <span>{t.checklist.filter(i=>i.feito).length}/{t.checklist.length} itens</span>
                                <span style={{fontWeight:700,color:progress===100?'#059669':'#94a3b8'}}>{progress}%</span>
                              </div>
                              <div style={{height:4,background:'#e2e8f0',borderRadius:4,overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${progress}%`,background:progress===100?'#059669':'#2563EB',transition:'.3s',borderRadius:4}} />
                              </div>
                            </div>
                          )}
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'#94a3b8',marginTop:10}}>
                            <span>👤 {(t.atribuido_para||'').split(' ')[0]}</span>
                            {t.prazo && <span>📅 {fmtDateShort(t.prazo)}</span>}
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
        </div>
      )}

      {/* ══ PAGE: ADMIN ══ */}
      {page === 'admin' && isAdmin && (
        <div style={{maxWidth:1440,margin:'0 auto',padding:'24px 28px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <h2 style={{fontSize:'1.1rem',fontWeight:700,color:'#0f172a'}}>Gestão da Equipe</h2>
              <p style={{fontSize:'.82rem',color:'#94a3b8',marginTop:4}}>Gerencie acessos, perfis e permissões</p>
            </div>
            <button onClick={()=>setShowNewUser(true)} style={{padding:'10px 22px',borderRadius:10,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontSize:'.82rem',fontWeight:700,cursor:'pointer'}}>+ Novo Usuário</button>
          </div>

          {showNewUser && (
            <div style={{background:'#fff',borderRadius:16,padding:24,marginBottom:20,border:'1px solid #e2e8f0'}}>
              <div style={{fontSize:'.88rem',fontWeight:700,marginBottom:16}}>Novo Usuário</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <input placeholder="Nome completo *" value={newUser.nome} onChange={e=>setNewUser({...newUser,nome:e.target.value})} style={fieldStyle()} />
                <input placeholder="E-mail *" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} style={fieldStyle()} />
                <input placeholder="Cargo" value={newUser.cargo} onChange={e=>setNewUser({...newUser,cargo:e.target.value})} style={fieldStyle()} />
                <input placeholder="Telefone" value={newUser.telefone} onChange={e=>setNewUser({...newUser,telefone:e.target.value})} style={fieldStyle()} />
                <select value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})} style={fieldStyle()}>
                  <option value="user">Usuário</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option>
                </select>
                <input placeholder="Senha inicial" value={newUser.senha_hash} onChange={e=>setNewUser({...newUser,senha_hash:e.target.value})} style={fieldStyle()} />
                <div style={{gridColumn:'1/-1',display:'flex',gap:10}}>
                  <button onClick={addUser} style={{padding:'10px 24px',borderRadius:8,border:'none',background:'#059669',color:'#fff',fontFamily:'inherit',fontWeight:700,cursor:'pointer'}}>Criar Usuário</button>
                  <button onClick={()=>setShowNewUser(false)} style={{padding:'10px 24px',borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontFamily:'inherit',fontWeight:500,cursor:'pointer',color:'#94a3b8'}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Tabela Usuários */}
          <div style={{background:'#fff',borderRadius:16,overflow:'hidden',border:'1px solid #e2e8f0'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr style={{background:'#f8fafc'}}>
                  {['Nome','E-mail','Cargo','Perfil','Status','Ações'].map(h => (
                    <th key={h} style={{padding:'14px 18px',textAlign:'left',fontSize:'.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.5px',color:'#94a3b8',borderBottom:'1px solid #e2e8f0'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const editing = editUser?.id === u.id;
                  return (
                    <tr key={u.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td style={tdS()}>
                        {editing ? <input defaultValue={u.nome} id={`u-nome-${u.id}`} style={fieldStyle()} /> :
                        <div><div style={{fontWeight:600,fontSize:'.84rem'}}>{u.nome}</div>{u.telefone && <div style={{fontSize:'.72rem',color:'#94a3b8'}}>{u.telefone}</div>}</div>}
                      </td>
                      <td style={tdS()}>{editing ? <input defaultValue={u.email} id={`u-email-${u.id}`} style={fieldStyle()} /> : <span style={{fontSize:'.82rem',color:'#64748b'}}>{u.email}</span>}</td>
                      <td style={tdS()}>{editing ? <input defaultValue={u.cargo} id={`u-cargo-${u.id}`} style={fieldStyle()} /> : <span style={{fontSize:'.82rem'}}>{u.cargo}</span>}</td>
                      <td style={tdS()}>
                        {editing ? <select defaultValue={u.role} id={`u-role-${u.id}`} style={fieldStyle()}><option value="user">Usuário</option><option value="subadmin">Sub-Admin</option><option value="admin">Admin</option></select>
                        : <span style={{padding:'4px 10px',borderRadius:6,fontSize:'.68rem',fontWeight:700,background:u.role==='admin'?'#FEF2F2':u.role==='subadmin'?'#FFFBEB':'#EFF6FF',color:u.role==='admin'?'#DC2626':u.role==='subadmin'?'#D97706':'#2563EB'}}>{u.role==='admin'?'Admin':u.role==='subadmin'?'Sub-Admin':'Usuário'}</span>}
                      </td>
                      <td style={tdS()}>
                        <span style={{padding:'4px 10px',borderRadius:6,fontSize:'.68rem',fontWeight:700,background:u.ativo?'#ECFDF5':'#FEF2F2',color:u.ativo?'#059669':'#DC2626'}}>{u.ativo?'Ativo':'Inativo'}</span>
                      </td>
                      <td style={tdS()}>
                        {editing ? (
                          <div style={{display:'flex',gap:6}}>
                            <button onClick={()=>updateUser(u.id,{nome:document.getElementById(`u-nome-${u.id}`).value,email:document.getElementById(`u-email-${u.id}`).value.toLowerCase(),cargo:document.getElementById(`u-cargo-${u.id}`).value,role:document.getElementById(`u-role-${u.id}`).value})} style={{padding:'6px 12px',borderRadius:6,border:'none',background:'#059669',color:'#fff',fontSize:'.72rem',fontWeight:700,cursor:'pointer'}}>Salvar</button>
                            <button onClick={()=>setEditUser(null)} style={{padding:'6px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#fff',fontSize:'.72rem',cursor:'pointer',color:'#94a3b8'}}>✕</button>
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
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes scaleIn { from { opacity:0;transform:scale(.96) } to { opacity:1;transform:scale(1) } }
        @keyframes slideUp { from { opacity:0;transform:translateX(-50%) translateY(20px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }
      `}</style>
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
function btnAction(color, bg) {
  return { padding:'7px 12px',borderRadius:8,border:`1px solid ${color}33`,background:bg,color,fontFamily:'inherit',fontSize:'.74rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'.15s' };
}
