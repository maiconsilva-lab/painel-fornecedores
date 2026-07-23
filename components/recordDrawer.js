'use client';

import { useMemo, useState } from 'react';
import { allVisibleFields, fieldsForType, getCompleteness, getDuplicateCandidates, getOperationalStatus, getRecordName, humanizeField, isFilled, recordToClipboardText } from '../lib/panelMetrics';
import { Completeness, Icon, StatusChip } from './premiumPanels';

const META_KEYS = new Set(['id', 'created_at', 'updated_at', 'status', 'atribuido_para', 'finalizado_por', 'data_finalizacao', 'observacoes_internas', 'motivo_devolucao', 'motivo_rejeicao', 'codigo_protheus']);
const typeLabels = { produto: 'Cadastro de produto', desbloqueio: 'Pedido de desbloqueio' };

function CopyField({ label, value, onToast }) {
  if (!isFilled(value)) return null;
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const copy = async () => {
    await navigator.clipboard.writeText(display);
    onToast?.(`${label} copiado`);
  };
  return <div className="pmx-copy-field"><div><small>{label}</small><strong>{display}</strong></div><button onClick={copy} title={`Copiar ${label}`}><Icon name="copy" size={14} /></button></div>;
}

export default function RecordDrawer({ record, type, collection = [], onClose, onTake, onComplete, onDelete, isAdmin, onToast }) {
  const [code, setCode] = useState(record.codigo_protheus || '');
  const [tab, setTab] = useState('dados');
  const status = getOperationalStatus(record, type);
  const completeness = getCompleteness(record, type);
  const duplicates = useMemo(() => getDuplicateCandidates(record, type, collection), [record, type, collection]);
  const fields = fieldsForType(record, type);
  const extra = allVisibleFields(record).filter(([label]) => !fields.some(([current]) => current === label) && !META_KEYS.has(label.toLowerCase().replaceAll(' ', '_')));
  const docs = Object.entries(record).filter(([key, value]) => key.endsWith('_url') && isFilled(value));
  const final = ['aprovado', 'desbloqueado', 'rejeitado', 'cancelado'].includes(record.status);

  const copyAll = async () => {
    await navigator.clipboard.writeText(recordToClipboardText(record, type));
    onToast?.('Todos os dados foram copiados');
  };

  const finish = () => {
    if (type === 'produto' && !code.trim()) { onToast?.('Informe o código Protheus'); return; }
    onComplete?.(record, code.trim());
  };

  return (
    <div className="pmx-detail-overlay" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="pmx-detail-drawer" role="dialog" aria-modal="true" aria-label={getRecordName(record, type)}>
        <header className="pmx-record-drawer__header">
          <div className={`pmx-record-drawer__icon pmx-record-drawer__icon--${type}`}><Icon name={type === 'produto' ? 'box' : 'unlock'} size={22} /></div>
          <div className="pmx-record-drawer__title"><span className="pmx-eyebrow">{typeLabels[type]}</span><h2>{getRecordName(record, type)}</h2><div><StatusChip item={record} type={type} /> <span>Recebido em {new Date(record.created_at).toLocaleDateString('pt-BR')}</span></div></div>
          <button className="pmx-drawer-close" onClick={onClose} aria-label="Fechar"><span>×</span></button>
        </header>

        <div className="pmx-record-drawer__summary">
          <Completeness record={record} type={type} />
          <button className="pmx-button pmx-button--secondary" onClick={copyAll}><Icon name="copy" size={15} /> Copiar todos os dados</button>
        </div>

        <nav className="pmx-drawer-tabs">
          <button className={tab === 'dados' ? 'active' : ''} onClick={() => setTab('dados')}>Dados Protheus</button>
          <button className={tab === 'documentos' ? 'active' : ''} onClick={() => setTab('documentos')}>Documentos <span>{docs.length}</span></button>
          <button className={tab === 'historico' ? 'active' : ''} onClick={() => setTab('historico')}>Histórico</button>
        </nav>

        <div className="pmx-record-drawer__body">
          {tab === 'dados' && <>
            {duplicates.length > 0 && <section className="pmx-duplicate-alert"><Icon name="duplicate" size={18} /><div><strong>Possível duplicidade encontrada</strong><p>Confira antes de cadastrar no Protheus: {duplicates.slice(0, 3).map((item) => getRecordName(item, type)).join(', ')}.</p></div></section>}
            <section className="pmx-data-block"><header><div><span className="pmx-eyebrow">Sequência operacional</span><h3>Informações para cadastro</h3></div><button onClick={copyAll}>Copiar seção</button></header><div className="pmx-copy-grid">{fields.map(([label, value]) => <CopyField key={label} label={label} value={value} onToast={onToast} />)}</div></section>
            {extra.length > 0 && <section className="pmx-data-block"><header><div><span className="pmx-eyebrow">Dados adicionais</span><h3>Outras informações recebidas</h3></div></header><div className="pmx-copy-grid">{extra.map(([label, value]) => <CopyField key={label} label={label} value={value} onToast={onToast} />)}</div></section>}
            {(record.motivo_devolucao || record.motivo_rejeicao) && <section className="pmx-return-note"><strong>Motivo da devolução</strong><p>{record.motivo_devolucao || record.motivo_rejeicao}</p></section>}
          </>}

          {tab === 'documentos' && <section className="pmx-data-block"><header><div><span className="pmx-eyebrow">Anexos</span><h3>Documentos recebidos</h3></div></header><div className="pmx-doc-grid">{docs.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noreferrer noopener"><Icon name="download" size={17} /><span><strong>{humanizeField(key.replace(/_url$/, ''))}</strong><small>Abrir em nova guia</small></span><Icon name="arrow" size={14} /></a>)}{!docs.length && <div className="pmx-empty-inline">Nenhum documento anexado a esta solicitação.</div>}</div></section>}

          {tab === 'historico' && <section className="pmx-record-timeline">
            <div><i className="success"/><span><strong>Solicitação recebida</strong><small>{record.created_at ? new Date(record.created_at).toLocaleString('pt-BR') : '—'}</small></span></div>
            {record.atribuido_para && <div><i className="info"/><span><strong>Atribuída a {record.atribuido_para}</strong><small>Status atual: {status.label}</small></span></div>}
            {(record.motivo_devolucao || record.motivo_rejeicao) && <div><i className="danger"/><span><strong>Devolvida para correção</strong><small>{record.motivo_devolucao || record.motivo_rejeicao}</small></span></div>}
            {record.data_finalizacao && <div><i className="success"/><span><strong>{type === 'produto' ? 'Cadastro concluído no Protheus' : 'Desbloqueio concluído'}</strong><small>{new Date(record.data_finalizacao).toLocaleString('pt-BR')} · {record.finalizado_por || 'Equipe'}</small></span></div>}
          </section>}
        </div>

        <footer className="pmx-record-drawer__footer">
          {!final && <>
            {!record.atribuido_para && <button className="pmx-button pmx-button--secondary" onClick={() => onTake?.(record.id)}>Assumir solicitação</button>}
            {type === 'produto' && <label className="pmx-code-field"><span>Código Protheus</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Informe o código" /></label>}
            <button className="pmx-button pmx-button--primary" onClick={finish}>{type === 'produto' ? 'Concluir cadastro' : 'Concluir desbloqueio'}</button>
          </>}
          {final && <div className="pmx-finished-banner"><Icon name="check" size={16} /> {status.label}{record.codigo_protheus ? ` · Código ${record.codigo_protheus}` : ''}</div>}
          {isAdmin && <button className="pmx-button pmx-button--danger-ghost" onClick={() => onDelete?.(record.id)}>Excluir</button>}
        </footer>
      </aside>
    </div>
  );
}
