'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildRecentActivity,
  buildUnifiedQueue,
  getCompleteness,
  getDuplicateCandidates,
  getOperationalStatus,
  getRecordName,
  getReturnReasons,
  recordToClipboardText,
} from '../lib/panelMetrics';

const fmtDate = (date, withTime = false) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const typeLabel = { fornecedor: 'Fornecedor', produto: 'Produto', desbloqueio: 'Desbloqueio', tarefa: 'Tarefa' };
const priorityRank = { critica: 4, alta: 3, normal: 2, nova: 1 };

export function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    alert: <><path d="M10.3 3.5 2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></>,
    box: <><path d="m7.5 4.3 9 5.1"/><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></>,
    unlock: <><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.8-1.3"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></>,
    trend: <><path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/></>,
    copy: <><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    filter: <><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    duplicate: <><rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2"/></>,
    refresh: <><path d="M20 7h-5V2"/><path d="M20 2 16.5 5.5A8 8 0 1 0 20 12"/></>,
  };
  return <svg {...common}>{paths[name] || paths.dashboard}</svg>;
}

export function StatusChip({ item, type = 'fornecedor' }) {
  const status = item?._status || getOperationalStatus(item, type);
  return <span className={`pmx-status pmx-status--${status.tone}`}>{status.label}</span>;
}

export function Completeness({ record, type = 'fornecedor', compact = false }) {
  const data = record?._completeness || getCompleteness(record, type);
  return (
    <div className={`pmx-completeness ${compact ? 'pmx-completeness--compact' : ''}`} title="Todos os dados recebidos estão disponíveis para cópia">
      <div className="pmx-completeness__head"><span>Dados recebidos</span><strong>{data.percent}%</strong></div>
      <div className="pmx-progress"><span style={{ width: `${data.percent}%` }} /></div>
      {!compact && <small>Dados disponíveis para o Protheus</small>}
    </div>
  );
}

function MetricCard({ label, value, helper, tone = 'brand', icon, onClick }) {
  return (
    <button type="button" className={`pmx-metric pmx-metric--${tone}`} onClick={onClick} disabled={!onClick}>
      <span className="pmx-metric__accent" aria-hidden="true" />
      <span className="pmx-metric__body">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{helper}</em>
      </span>
      <span className="pmx-metric__meta" aria-hidden="true"><Icon name={icon} size={17} />{onClick && <Icon name="arrow" size={14} />}</span>
    </button>
  );
}

function PriorityBadge({ priority }) {
  const labels = { critica: 'Crítica', alta: 'Alta', normal: 'Normal', nova: 'Nova' };
  return <span className={`pmx-priority pmx-priority--${priority}`}>{labels[priority] || priority}</span>;
}

export function OverviewDashboard({ fornecedores, produtos, desbloqueios, kanban, user, onNavigate, onOpen }) {
  const queue = useMemo(() => buildUnifiedQueue(fornecedores, produtos, desbloqueios), [fornecedores, produtos, desbloqueios]);
  const activity = useMemo(() => buildRecentActivity(fornecedores, produtos, desbloqueios, kanban), [fornecedores, produtos, desbloqueios, kanban]);
  const reasons = useMemo(() => getReturnReasons([...fornecedores, ...produtos, ...desbloqueios]).slice(0, 5), [fornecedores, produtos, desbloqueios]);
  const completedToday = [...fornecedores, ...produtos, ...desbloqueios].filter((item) => item.data_finalizacao && new Date(item.data_finalizacao).toDateString() === new Date().toDateString()).length;
  const overdueTasks = kanban.filter((task) => task.status !== 'concluido' && task.prazo && new Date(`${task.prazo}T23:59:59`) < new Date()).length;
  const critical = queue.filter((item) => item._priority === 'critica').length;
  const unassigned = queue.filter((item) => !item.atribuido_para).length;
  const ready = queue.filter((item) => ['pendente', 'em_analise', 'pronto'].includes(item.status)).length;
  const myQueue = queue.filter((item) => item.atribuido_para === user?.nome || !item.atribuido_para).slice(0, 7);

  return (
    <div className="pmx-page pmx-page--dashboard">
      <section className="pmx-executive-intro">
        <div className="pmx-executive-intro__content">
          <span className="pmx-eyebrow">Central de Cadastros Premix</span>
          <h1>Olá, {user?.nome?.split(' ')[0] || 'equipe'}.</h1>
          <p>Controle operacional dos dados recebidos para cadastro no Protheus, com prioridades, responsáveis e histórico em uma única visão.</p>
          <div className="pmx-operational-pulse"><i aria-hidden="true" /><span>{queue.length ? `${queue.length} solicitações aguardam tratamento` : 'Operação em dia'}</span><b>{critical ? `${critical} críticas` : 'sem itens críticos'}</b></div>
        </div>
        <div className="pmx-executive-intro__actions">
          <button className="pmx-button pmx-button--secondary" onClick={() => onNavigate('fila')}>Abrir fila Protheus</button>
          <button className="pmx-button pmx-button--primary" onClick={() => onNavigate('cadastros')}>Consultar cadastros</button>
        </div>
      </section>

      <section className="pmx-metrics-grid">
        <MetricCard label="Aguardando ação" value={queue.length} helper={`${unassigned} sem responsável`} tone="warning" icon="clock" onClick={() => onNavigate('fila')} />
        <MetricCard label="Prontos para cadastrar" value={ready} helper="Dados recebidos e disponíveis" tone="brand" icon="check" onClick={() => onNavigate('fila')} />
        <MetricCard label="Prioridade crítica" value={critical} helper="5 dias ou mais na fila" tone="danger" icon="alert" onClick={() => onNavigate('fila')} />
        <MetricCard label="Concluídos hoje" value={completedToday} helper="Cadastros e desbloqueios" tone="success" icon="trend" />
        <MetricCard label="Tarefas vencidas" value={overdueTasks} helper="Gestão de tarefas" tone={overdueTasks ? 'danger' : 'neutral'} icon="dashboard" onClick={() => onNavigate('kanban')} />
      </section>

      <section className="pmx-dashboard-grid">
        <article className="pmx-card pmx-card--flush pmx-dashboard-grid__main pmx-section-panel">
          <header className="pmx-card__header">
            <div><span className="pmx-eyebrow">Operação</span><h2>Minha fila no Protheus</h2></div>
            <button className="pmx-link-button" onClick={() => onNavigate('fila')}>Ver fila completa <Icon name="arrow" size={15} /></button>
          </header>
          <div className="pmx-table-wrap">
            <table className="pmx-premium-table">
              <thead><tr><th>Prioridade</th><th>Solicitação</th><th>Tipo</th><th>Recebido</th><th>Dados recebidos</th><th>Status</th><th /></tr></thead>
              <tbody>
                {myQueue.map((item) => (
                  <tr key={`${item._type}-${item.id}`} onClick={() => onOpen(item)}>
                    <td><PriorityBadge priority={item._priority} /></td>
                    <td><strong>{item._name}</strong><small>{item._document || item.email_solicitante || item.email || 'Sem documento'}</small></td>
                    <td>{typeLabel[item._type]}</td>
                    <td><strong>{item._age === 0 ? 'Hoje' : `${item._age} dia${item._age > 1 ? 's' : ''}`}</strong><small>{fmtDate(item.created_at)}</small></td>
                    <td><Completeness record={item} type={item._type} compact /></td>
                    <td><StatusChip item={item} type={item._type} /></td>
                    <td><span className="pmx-row-arrow"><Icon name="arrow" size={15} /></span></td>
                  </tr>
                ))}
                {myQueue.length === 0 && <tr><td colSpan="7"><div className="pmx-empty-inline">Nenhuma solicitação aguardando ação.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="pmx-card pmx-card--flush pmx-section-panel pmx-activity-panel">
          <header className="pmx-card__header"><div><span className="pmx-eyebrow">Atualizações</span><h2>Atividade recente</h2></div></header>
          <div className="pmx-activity-list">
            {activity.slice(0, 8).map((item) => (
              <div className="pmx-activity" key={item.id}>
                <span className={`pmx-activity__dot pmx-activity__dot--${item.tone}`} />
                <div><strong>{item.name}</strong><p>{item.status} · {item.user}</p><small>{fmtDate(item.date, true)}</small></div>
              </div>
            ))}
            {activity.length === 0 && <div className="pmx-empty-inline">As atualizações aparecerão aqui.</div>}
          </div>
        </aside>
      </section>

      <section className="pmx-dashboard-lower-grid">
        <article className="pmx-card pmx-card--flush pmx-section-panel">
          <header className="pmx-card__header"><div><span className="pmx-eyebrow">Visão por categoria</span><h2>Volume operacional</h2></div></header>
          <div className="pmx-category-grid">
            <CategoryCard icon="building" label="Fornecedores" total={fornecedores.length} pending={fornecedores.filter((i) => ['pendente', 'em_analise'].includes(i.status)).length} done={fornecedores.filter((i) => i.status === 'aprovado').length} onClick={() => onNavigate('cadastros')} />
            <CategoryCard icon="box" label="Produtos" total={produtos.length} pending={produtos.filter((i) => ['pendente', 'em_analise'].includes(i.status)).length} done={produtos.filter((i) => i.status === 'aprovado').length} onClick={() => onNavigate('produtos')} />
            <CategoryCard icon="unlock" label="Desbloqueios" total={desbloqueios.length} pending={desbloqueios.filter((i) => ['pendente', 'em_analise'].includes(i.status)).length} done={desbloqueios.filter((i) => i.status === 'desbloqueado').length} onClick={() => onNavigate('desbloqueios')} />
            <CategoryCard icon="users" label="Tarefas" total={kanban.length} pending={kanban.filter((i) => i.status !== 'concluido').length} done={kanban.filter((i) => i.status === 'concluido').length} onClick={() => onNavigate('kanban')} />
          </div>
        </article>
        <article className="pmx-card pmx-card--flush pmx-section-panel">
          <header className="pmx-card__header"><div><span className="pmx-eyebrow">Qualidade do fluxo</span><h2>Motivos de devolução</h2></div></header>
          <div className="pmx-reason-list">
            {reasons.map((row, index) => <div key={row.label}><span><b>{index + 1}</b>{row.label}</span><strong>{row.count}</strong></div>)}
            {!reasons.length && <div className="pmx-empty-inline">Nenhuma devolução registrada.</div>}
          </div>
        </article>
      </section>
    </div>
  );
}

function CategoryCard({ icon, label, total, pending, done, onClick }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <button className="pmx-category-card" onClick={onClick}>
      <span className="pmx-category-card__icon"><Icon name={icon} /></span>
      <span className="pmx-category-card__content"><small>{label}</small><strong>{total}</strong><em>{pending} em andamento · {done} concluídos</em><span className="pmx-progress"><span style={{ width: `${pct}%` }} /></span></span>
      <Icon name="arrow" size={16} />
    </button>
  );
}

function exportQueueCsv(rows) {
  const headers = ['Prioridade', 'Tipo', 'Cadastro', 'Documento', 'Responsável', 'Dias na fila', 'Dados recebidos', 'Situação', 'Recebido em'];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = rows.map((item) => [item._priority, typeLabel[item._type], item._name, item._document, item.atribuido_para, item._age, `${item._completeness.percent}%`, item._status.label, fmtDate(item.created_at)].map(escape).join(';'));
  const blob = new Blob([`\uFEFF${headers.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fila-protheus-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ProtheusQueue({ fornecedores, produtos, desbloqueios, usuarios = [], onOpen, onToast }) {
  const all = useMemo(() => buildUnifiedQueue(fornecedores, produtos, desbloqueios), [fornecedores, produtos, desbloqueios]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [owner, setOwner] = useState('todos');
  const [priority, setPriority] = useState('todos');
  const [sort, setSort] = useState('priority');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState([]);
  const [savedViews, setSavedViews] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem('pmx_queue_views') || '[]'); } catch { return []; }
  });
  const [activeView, setActiveView] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);
  const [viewName, setViewName] = useState('');

  useEffect(() => setPage(1), [search, type, status, owner, priority, sort, pageSize]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('pmx_queue_views', JSON.stringify(savedViews.slice(0, 12)));
  }, [savedViews]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = all.filter((item) => {
      if (type !== 'todos' && item._type !== type) return false;
      if (status !== 'todos' && item.status !== status) return false;
      if (priority !== 'todos' && item._priority !== priority) return false;
      if (owner === 'sem_responsavel' && item.atribuido_para) return false;
      if (owner !== 'todos' && owner !== 'sem_responsavel' && item.atribuido_para !== owner) return false;
      if (term && ![item._name, item._document, item.email, item.email_solicitante, item.atribuido_para].some((value) => String(value || '').toLowerCase().includes(term))) return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      if (sort === 'oldest') return b._age - a._age;
      if (sort === 'newest') return a._age - b._age;
      if (sort === 'name') return a._name.localeCompare(b._name, 'pt-BR');
      if (sort === 'readiness') return b._completeness.percent - a._completeness.percent;
      return priorityRank[b._priority] - priorityRank[a._priority] || b._age - a._age;
    });
  }, [all, search, type, status, owner, priority, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const visibleIds = visible.map((item) => `${item._type}:${item.id}`);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const toggleVisible = () => setSelected((current) => allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])]);
  const selectedRows = all.filter((item) => selected.includes(`${item._type}:${item.id}`));
  const copySelected = async () => {
    if (!selectedRows.length) return;
    await navigator.clipboard.writeText(selectedRows.map((item) => recordToClipboardText(item, item._type)).join('\n\n────────────────────\n\n'));
    onToast?.(`${selectedRows.length} cadastro(s) copiado(s)`);
  };

  const activeFilters = [type !== 'todos', status !== 'todos', owner !== 'todos', priority !== 'todos', Boolean(search)].filter(Boolean).length;
  const clearFilters = () => { setSearch(''); setType('todos'); setStatus('todos'); setOwner('todos'); setPriority('todos'); setSort('priority'); setActiveView(''); };
  const applySavedView = (name) => {
    setActiveView(name);
    const view = savedViews.find((item) => item.name === name);
    if (!view) return;
    setSearch(view.search || ''); setType(view.type || 'todos'); setStatus(view.status || 'todos');
    setOwner(view.owner || 'todos'); setPriority(view.priority || 'todos'); setSort(view.sort || 'priority');
    setPageSize(view.pageSize || 25);
  };
  const openSaveView = () => {
    setViewName(activeView || `Visão ${savedViews.length + 1}`);
    setShowSaveView(true);
  };
  const saveCurrentView = () => {
    const name = viewName.trim();
    if (!name) return;
    const view = { name:name.slice(0, 40), search, type, status, owner, priority, sort, pageSize };
    setSavedViews((current) => [view, ...current.filter((item) => item.name !== view.name)].slice(0, 12));
    setActiveView(view.name);
    setShowSaveView(false);
    setViewName('');
    onToast?.(`Visão “${view.name}” salva`);
  };
  const removeCurrentView = () => {
    if (!activeView) return;
    setSavedViews((current) => current.filter((item) => item.name !== activeView));
    onToast?.(`Visão “${activeView}” removida`);
    setActiveView('');
  };

  return (
    <div className="pmx-page">
      <PageHeading eyebrow="Operação" title="Fila Protheus" description="Solicitações organizadas por prioridade, tempo de espera, responsável e situação operacional." actions={<button className="pmx-button pmx-button--secondary" onClick={() => exportQueueCsv(filtered)}><Icon name="download" size={15} /> Exportar CSV</button>} />
      <div className="pmx-card pmx-card--flush">
        <div className="pmx-queue-summary">
          <div><span>Total na fila</span><strong>{all.length}</strong></div>
          <div><span>Críticas</span><strong>{all.filter((i) => i._priority === 'critica').length}</strong></div>
          <div><span>Sem responsável</span><strong>{all.filter((i) => !i.atribuido_para).length}</strong></div>
          <div><span>Dados disponíveis</span><strong>{all.filter((i) => i.status !== 'rejeitado').length}</strong></div>
        </div>

        <div className="pmx-saved-views">
          <label><span>Visão salva</span><select value={activeView} onChange={(e) => applySavedView(e.target.value)}><option value="">Visão atual</option>{savedViews.map((view) => <option key={view.name} value={view.name}>{view.name}</option>)}</select></label>
          {!showSaveView ? <button onClick={openSaveView}>Salvar visão</button> : (
            <form className="pmx-saved-view-form" onSubmit={(event) => { event.preventDefault(); saveCurrentView(); }}>
              <input autoFocus value={viewName} onChange={(event) => setViewName(event.target.value)} maxLength={40} aria-label="Nome da visão" />
              <button type="submit">Confirmar</button>
              <button type="button" onClick={() => { setShowSaveView(false); setViewName(''); }}>Cancelar</button>
            </form>
          )}
          {activeView && !showSaveView && <button className="is-danger" onClick={removeCurrentView}>Excluir visão</button>}
        </div>

        <div className="pmx-toolbar">
          <label className="pmx-search-field"><Icon name="search" size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); setActiveView(''); }} placeholder="Buscar cadastro, documento ou responsável..." /></label>
          <select value={type} onChange={(e) => setType(e.target.value)}><option value="todos">Todos os tipos</option><option value="fornecedor">Fornecedores</option><option value="produto">Produtos</option><option value="desbloqueio">Desbloqueios</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="todos">Todos os status</option><option value="pendente">Aguardando análise</option><option value="em_analise">Em cadastro</option><option value="rejeitado">Devolvido</option></select>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="todos">Todos os responsáveis</option><option value="sem_responsavel">Sem responsável</option>{usuarios.filter((u) => u.ativo).map((u) => <option key={u.id} value={u.nome}>{u.nome}</option>)}</select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="todos">Todas as prioridades</option><option value="critica">Crítica</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="nova">Nova</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="priority">Prioridade</option><option value="oldest">Mais antigos</option><option value="newest">Mais recentes</option><option value="readiness">Maior volume de dados</option><option value="name">Nome A–Z</option></select>
          {activeFilters > 0 && <button className="pmx-filter-clear" onClick={clearFilters}>Limpar ({activeFilters})</button>}
        </div>

        {selectedRows.length > 0 && <div className="pmx-bulkbar"><strong>{selectedRows.length} selecionado(s)</strong><button onClick={copySelected}><Icon name="copy" size={14} /> Copiar dados</button><button onClick={() => exportQueueCsv(selectedRows)}><Icon name="download" size={14} /> Exportar seleção</button><button onClick={() => setSelected([])}>Limpar seleção</button></div>}

        <div className="pmx-table-wrap">
          <table className="pmx-premium-table pmx-premium-table--selectable">
            <thead><tr><th className="pmx-check-cell"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Selecionar página" /></th><th>Prioridade</th><th>Cadastro</th><th>Tipo</th><th>Responsável</th><th>Tempo na fila</th><th>Dados recebidos</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {visible.map((item) => {
                const key = `${item._type}:${item.id}`;
                const duplicates = getDuplicateCandidates(item, item._type, item._type === 'fornecedor' ? fornecedores : item._type === 'produto' ? produtos : desbloqueios);
                return (
                  <tr key={key} onClick={() => onOpen(item)} className={selected.includes(key) ? 'is-selected' : ''}>
                    <td className="pmx-check-cell" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selected.includes(key)} onChange={() => setSelected((current) => current.includes(key) ? current.filter((id) => id !== key) : [...current, key])} aria-label={`Selecionar ${item._name}`} /></td>
                    <td><PriorityBadge priority={item._priority} /></td>
                    <td><strong>{item._name}</strong><small>{item._document || item.email_solicitante || item.email || 'Sem documento'}{duplicates.length > 0 && <span className="pmx-duplicate-hint"><Icon name="duplicate" size={11} /> possível duplicidade</span>}</small></td>
                    <td>{typeLabel[item._type]}</td>
                    <td>{item.atribuido_para || <span className="pmx-muted">Não atribuído</span>}</td>
                    <td><strong>{item._age === 0 ? 'Hoje' : `${item._age} dia${item._age > 1 ? 's' : ''}`}</strong><small>{fmtDate(item.created_at)}</small></td>
                    <td><Completeness record={item} type={item._type} compact /></td>
                    <td><StatusChip item={item} type={item._type} /></td>
                    <td><span className="pmx-row-arrow"><Icon name="arrow" size={15} /></span></td>
                  </tr>
                );
              })}
              {!visible.length && <tr><td colSpan="9"><div className="pmx-empty-inline">Nenhum item corresponde aos filtros aplicados.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize = null }) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(total, page * pageSize);
  return <div className="pmx-pagination"><span>Exibindo {start}–{end} de {total}</span><div>{onPageSize && <label>Linhas <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>}<button disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button><strong>{page} / {totalPages}</strong><button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Próxima</button></div></div>;
}

export function ReportsDashboard({ fornecedores, produtos, desbloqueios, kanban, usuarios }) {
  const [period, setPeriod] = useState('all');
  const cutoff = period === 'all' ? 0 : Date.now() - Number(period) * 86400000;
  const filterPeriod = (rows) => rows.filter((item) => !cutoff || new Date(item.created_at).getTime() >= cutoff);
  const f = filterPeriod(fornecedores), p = filterPeriod(produtos), d = filterPeriod(desbloqueios), tasks = filterPeriod(kanban);
  const total = f.length + p.length + d.length;
  const completed = f.filter((i) => i.status === 'aprovado').length + p.filter((i) => i.status === 'aprovado').length + d.filter((i) => i.status === 'desbloqueado').length;
  const returned = f.filter((i) => i.status === 'rejeitado').length + p.filter((i) => i.status === 'rejeitado').length + d.filter((i) => i.status === 'rejeitado').length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;
  const reasons = getReturnReasons([...f, ...p, ...d]).slice(0, 7);
  const team = usuarios.filter((u) => u.ativo).map((u) => ({
    name: u.nome,
    assigned: f.filter((i) => i.atribuido_para === u.nome).length + p.filter((i) => i.atribuido_para === u.nome).length + d.filter((i) => i.atribuido_para === u.nome).length,
    completed: f.filter((i) => i.finalizado_por === u.nome && i.status === 'aprovado').length + p.filter((i) => i.finalizado_por === u.nome && i.status === 'aprovado').length + d.filter((i) => i.finalizado_por === u.nome && i.status === 'desbloqueado').length,
    tasks: tasks.filter((i) => i.atribuido_para === u.nome && i.status !== 'concluido').length,
  })).sort((a, b) => b.completed - a.completed);
  const max = Math.max(1, ...team.map((i) => i.completed));
  const categoryMax = Math.max(f.length, p.length, d.length, 1);

  return (
    <div className="pmx-page">
      <PageHeading eyebrow="Gestão" title="Relatórios operacionais" description="Indicadores de volume, conclusão, devoluções e distribuição de trabalho." actions={<select className="pmx-period-select" value={period} onChange={(e) => setPeriod(e.target.value)}><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option><option value="all">Todo o período</option></select>} />
      <section className="pmx-metrics-grid pmx-metrics-grid--4">
        <MetricCard label="Solicitações recebidas" value={total} helper="No período selecionado" tone="brand" icon="dashboard" />
        <MetricCard label="Cadastros concluídos" value={completed} helper={`${completionRate}% do volume`} tone="success" icon="check" />
        <MetricCard label="Devoluções" value={returned} helper={total ? `${Math.round((returned / total) * 100)}% do volume` : '0% do volume'} tone="warning" icon="alert" />
        <MetricCard label="Tarefas abertas" value={tasks.filter((i) => i.status !== 'concluido').length} helper="Equipe operacional" tone="neutral" icon="users" />
      </section>
      <section className="pmx-report-grid">
        <article className="pmx-card"><span className="pmx-eyebrow">Distribuição</span><h2>Cadastros por categoria</h2><div className="pmx-bars"><ReportBar label="Fornecedores" value={f.length} max={categoryMax} /><ReportBar label="Produtos" value={p.length} max={categoryMax} /><ReportBar label="Desbloqueios" value={d.length} max={categoryMax} /></div></article>
        <article className="pmx-card"><span className="pmx-eyebrow">Qualidade</span><h2>Resultado das solicitações</h2><div className="pmx-donut" style={{ '--value': completionRate }}><div><strong>{completionRate}%</strong><span>concluídos</span></div></div><div className="pmx-legend"><span><i className="success" />Concluídos: {completed}</span><span><i className="warning" />Em andamento: {Math.max(0, total - completed - returned)}</span><span><i className="danger" />Devolvidos: {returned}</span></div></article>
        <article className="pmx-card"><span className="pmx-eyebrow">Causa raiz</span><h2>Principais motivos de devolução</h2><div className="pmx-reason-list pmx-reason-list--report">{reasons.map((row, index) => <div key={row.label}><span><b>{index + 1}</b>{row.label}</span><strong>{row.count}</strong></div>)}{!reasons.length && <div className="pmx-empty-inline">Nenhuma devolução registrada.</div>}</div></article>
        <article className="pmx-card"><span className="pmx-eyebrow">SLA</span><h2>Tempo em fila</h2><div className="pmx-sla-grid"><div><strong>{buildUnifiedQueue(f, p, d).filter((i) => i._age <= 1).length}</strong><span>até 1 dia</span></div><div><strong>{buildUnifiedQueue(f, p, d).filter((i) => i._age >= 2 && i._age <= 4).length}</strong><span>2 a 4 dias</span></div><div><strong>{buildUnifiedQueue(f, p, d).filter((i) => i._age >= 5).length}</strong><span>5+ dias</span></div></div></article>
        <article className="pmx-card pmx-report-grid__wide"><span className="pmx-eyebrow">Equipe</span><h2>Produção por responsável</h2><div className="pmx-team-performance">{team.map((member) => <div key={member.name} className="pmx-team-row"><div><strong>{member.name}</strong><small>{member.assigned} atribuídos · {member.tasks} tarefas abertas</small></div><div className="pmx-team-row__bar"><span style={{ width: `${(member.completed / max) * 100}%` }} /></div><strong>{member.completed}</strong></div>)}{!team.length && <div className="pmx-empty-inline">Nenhum usuário ativo disponível.</div>}</div></article>
      </section>
    </div>
  );
}

function ReportBar({ label, value, max }) {
  return <div className="pmx-report-bar"><div><span>{label}</span><strong>{value}</strong></div><div className="pmx-progress"><span style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}

export function HistoryTimeline({ fornecedores, produtos, desbloqueios, kanban, auditLog = [] }) {
  const activity = useMemo(() => {
    const base = buildRecentActivity(fornecedores, produtos, desbloqueios, kanban, 500);
    const recordMap = new Map([
      ...fornecedores.map((item) => [`fornecedor:${item.id}`, getRecordName(item, 'fornecedor')]),
      ...produtos.map((item) => [`produto:${item.id}`, getRecordName(item, 'produto')]),
      ...desbloqueios.map((item) => [`desbloqueio:${item.id}`, getRecordName(item, 'desbloqueio')]),
      ...kanban.map((item) => [`tarefa:${item.id}`, item.titulo || 'Tarefa']),
    ]);
    const actionLabels = {
      mudou_status: 'Status alterado', aprovou: 'Cadastro concluído no Protheus', atribuiu: 'Responsável alterado',
      excluiu: 'Registro excluído', desbloqueou: 'Produto desbloqueado', rejeitou: 'Solicitação devolvida',
      devolveu: 'Cadastro devolvido para correção', criou: 'Registro criado', editou: 'Registro atualizado',
      moveu: 'Tarefa movimentada', concluiu: 'Tarefa concluída',
    };
    const detailed = auditLog.map((log) => {
      const type = typeLabel[log.tipo_cadastro] ? log.tipo_cadastro : 'sistema';
      const action = actionLabels[log.acao] || String(log.acao || 'Ação registrada').replaceAll('_', ' ');
      const details = log.detalhes && typeof log.detalhes === 'object'
        ? Object.entries(log.detalhes).slice(0, 4).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${String(value)}`).join(' · ')
        : '';
      const tone = /exclu|rejeit|devolv/i.test(log.acao || '') ? 'danger' : /aprov|conclu|desbloq/i.test(log.acao || '') ? 'success' : 'info';
      return {
        id: `audit-${log.id}`,
        type,
        name: recordMap.get(`${type}:${log.cadastro_id}`) || `${typeLabel[type] || 'Sistema'} ${log.cadastro_id || ''}`.trim(),
        date: log.created_at,
        status: details ? `${action} · ${details}` : action,
        tone,
        user: log.ator_nome || log.ator_email || 'Sistema',
        source: 'audit',
      };
    });
    const seen = new Set();
    return [...detailed, ...base]
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .filter((item) => {
        const parsedDate = new Date(item.date);
        const timeKey = Number.isNaN(parsedDate.getTime()) ? String(item.date) : parsedDate.toISOString().slice(0, 16);
        const key = `${item.type}|${item.name}|${item.status}|${timeKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 1000);
  }, [fornecedores, produtos, desbloqueios, kanban, auditLog]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('todos');
  const [page, setPage] = useState(1);
  const pageSize = 30;
  const filtered = activity.filter((item) => (type === 'todos' || item.type === type) && (!search || `${item.name} ${item.status} ${item.user}`.toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, type]);

  return (
    <div className="pmx-page">
      <PageHeading eyebrow="Governança" title="Histórico e auditoria" description="Linha do tempo consolidada com ações registradas, responsáveis, datas e alterações operacionais." />
      <div className="pmx-card pmx-card--flush">
        <div className="pmx-toolbar pmx-toolbar--history"><label className="pmx-search-field"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ação, cadastro ou responsável..." /></label><select value={type} onChange={(e) => setType(e.target.value)}><option value="todos">Todos os tipos</option><option value="fornecedor">Fornecedores</option><option value="produto">Produtos</option><option value="desbloqueio">Desbloqueios</option><option value="tarefa">Tarefas</option><option value="sistema">Sistema</option></select></div>
        <div className="pmx-history-card">
          {visible.map((item) => <div className="pmx-history-row" key={item.id}><div className={`pmx-history-row__icon pmx-history-row__icon--${item.tone}`}><Icon name={item.type === 'produto' ? 'box' : item.type === 'desbloqueio' ? 'unlock' : item.type === 'tarefa' ? 'dashboard' : item.type === 'sistema' ? 'refresh' : 'building'} /></div><div className="pmx-history-row__content"><div><span className="pmx-eyebrow">{typeLabel[item.type] || 'Sistema'}{item.source === 'audit' ? ' · Auditoria' : ''}</span><strong>{item.name}</strong></div><p>{item.status}</p><small>Responsável: {item.user}</small></div><time>{fmtDate(item.date, true)}</time></div>)}
          {!visible.length && <div className="pmx-empty-inline">Nenhuma atividade corresponde à busca.</div>}
        </div>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={pageSize} onPage={setPage} />
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, actions }) {
  return <header className="pmx-page-heading"><div><span className="pmx-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="pmx-page-heading__actions">{actions}</div>}</header>;
}
