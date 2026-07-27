'use client';

import { useEffect, useMemo, useState } from 'react';
import FlowStrip from './FlowStrip';

const SLIDE_SECONDS = 8;

function fmtBRL(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v, withSign = true) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = withSign && n > 0 ? '+' : '';
  return `${sign}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
function TrendBadge({ value, invert = false }) {
  if (value == null) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: good ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: good ? '#4ADE80' : '#F87171' }}>
      {up ? '↗' : '↘'} {up ? 'Alta' : 'Queda'}
    </span>
  );
}

function FluxoSlide({ counts }) {
  return (
    <div className="pmx-indicator-slide pmx-indicator-slide--flow">
      <div className="pmx-indicator-slide__head"><span><i className="pmx-indicator-dot" /> FLUXO SOLICITAÇÃO → PROTHEUS</span></div>
      <FlowStrip compact counts={counts} />
    </div>
  );
}

function MetaSlide({ meta, onEdit, isAdmin }) {
  if (!meta) return <SlideEmpty label="Meta ainda não configurada" onEdit={onEdit} isAdmin={isAdmin} />;
  const pct = meta.meta_valor > 0 ? Math.min(100, (meta.carregado_valor / meta.meta_valor) * 100) : 0;
  const saldo = Math.max(0, meta.meta_valor - meta.carregado_valor);
  const hoje = new Date();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diasRestantes = diasNoMes - hoje.getDate();
  return (
    <div className="pmx-indicator-slide">
      <div className="pmx-indicator-slide__head">
        <span><i className="pmx-indicator-dot" /> PROGRESSO DA META</span>
        <b>{meta.mes_referencia}</b>
        {onEdit && <button className="pmx-indicator-edit" onClick={onEdit} title="Editar meta">✎</button>}
      </div>
      <div className="pmx-indicator-grid pmx-indicator-grid--3">
        <div><small>META {meta.mes_referencia}</small><strong>{fmtBRL(meta.meta_valor)}</strong><span>unidades</span></div>
        <div><small>CARREGADO</small><strong>{fmtBRL(meta.carregado_valor)}</strong><span>{pct.toFixed(1)}%</span></div>
        <div><small>SALDO</small><strong>{fmtBRL(saldo)}</strong><span>a carregar</span></div>
      </div>
      <div className="pmx-indicator-progress"><div style={{ width: `${pct}%` }} /></div>
      <div className="pmx-indicator-foot">
        <span>Progresso de vendas · {pct.toFixed(1)}% concluído</span>
        <span>{diasRestantes} dias restantes no mês</span>
      </div>
    </div>
  );
}

function EconomicosSlide({ ipca, cambio, selic }) {
  return (
    <div className="pmx-indicator-slide">
      <div className="pmx-indicator-slide__head"><span><i className="pmx-indicator-dot" /> INDICADORES ECONÔMICOS CHAVE</span></div>
      <div className="pmx-indicator-grid pmx-indicator-grid--3">
        <div className="pmx-indicator-card">
          <div className="pmx-indicator-card__title">IPCA · Inflação <TrendBadge value={ipca.mensal} invert /></div>
          <strong>{fmtPct(ipca.mensal)}</strong><span>mensal</span>
          <hr />
          <div className="pmx-indicator-mini"><span>Acumulado 12M</span><b>{fmtPct(ipca.acum12m, false)}</b></div>
          <div className="pmx-indicator-mini"><span>Acumulado {new Date().getFullYear()}</span><b>{fmtPct(ipca.acumAno, false)}</b></div>
        </div>
        <div className="pmx-indicator-card">
          <div className="pmx-indicator-card__title">Câmbio (USD/BRL) <TrendBadge value={cambio.var12m ? -cambio.var12m : null} /></div>
          <strong>R$ {fmtBRL(cambio.atual)}</strong><span>{cambio.dataAtual ? `Cotado em ${cambio.dataAtual}` : ''}</span>
          <hr />
          <div className="pmx-indicator-mini"><span>Variação 12M</span><b>{fmtPct(cambio.var12m, false)}</b></div>
        </div>
        <div className="pmx-indicator-card">
          <div className="pmx-indicator-card__title">Taxa Selic</div>
          <strong>{fmtPct(selic.atual, false)}</strong><span>{selic.vigenteDesde ? `Vigente desde ${selic.vigenteDesde}` : ''}</span>
        </div>
      </div>
    </div>
  );
}

function CommoditiesSlide({ commodities, onEdit, isAdmin }) {
  if (!commodities || (!commodities.boi_gordo && !commodities.soja && !commodities.milho)) {
    return <SlideEmpty label="Cotações de commodities ainda não configuradas" onEdit={onEdit} isAdmin={isAdmin} />;
  }
  const items = [
    { label: 'Boi Gordo', valor: commodities.boi_gordo, un: 'arroba (@15kg)', varv: commodities.boi_gordo_var },
    { label: 'Soja', valor: commodities.soja, un: 'saca 60kg', varv: commodities.soja_var },
    { label: 'Milho', valor: commodities.milho, un: 'saca 60kg', varv: commodities.milho_var },
  ];
  return (
    <div className="pmx-indicator-slide">
      <div className="pmx-indicator-slide__head">
        <span><i className="pmx-indicator-dot" /> COTAÇÕES DE COMMODITIES AGRÍCOLAS</span>
        {commodities.referencia_data && <b>Ref. {commodities.referencia_data}</b>}
        {onEdit && <button className="pmx-indicator-edit" onClick={onEdit} title="Editar cotações">✎</button>}
      </div>
      <div className="pmx-indicator-grid pmx-indicator-grid--3">
        {items.map((it) => (
          <div className="pmx-indicator-card" key={it.label}>
            <div className="pmx-indicator-card__title">{it.label} <TrendBadge value={it.varv} /></div>
            <strong>R$ {fmtBRL(it.valor)}</strong><span>{it.un}</span>
          </div>
        ))}
      </div>
      <p className="pmx-indicator-note">Fonte: CEPEA/ESALQ — atualizado manualmente pelo administrador (sem API pública gratuita disponível).</p>
    </div>
  );
}

function NewsSlide({ news }) {
  if (!news) return null;
  const fmtWhen = (pubDate) => {
    if (!pubDate) return '';
    const d = new Date(pubDate);
    if (Number.isNaN(d.getTime())) return '';
    const diffH = Math.round((Date.now() - d.getTime()) / 3600000);
    if (diffH < 1) return 'agora';
    if (diffH < 24) return `há ${diffH}h`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };
  return (
    <div className="pmx-indicator-slide">
      <div className="pmx-indicator-slide__head"><span><i className="pmx-indicator-dot" /> PRINCIPAIS NOTÍCIAS</span></div>
      <div className="pmx-indicator-news-grid">
        <div>
          <b className="pmx-indicator-news-col-title">Brasil · Economia (G1)</b>
          <ul>
            {(news.brasil || []).slice(0, 5).map((n, i) => (
              <li key={i}><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a><small>{fmtWhen(n.pubDate)}</small></li>
            ))}
            {(!news.brasil || news.brasil.length === 0) && <li className="pmx-indicator-news-empty">Sem notícias disponíveis no momento</li>}
          </ul>
        </div>
        <div>
          <b className="pmx-indicator-news-col-title">Mundo (BBC)</b>
          <ul>
            {(news.mundo || []).slice(0, 5).map((n, i) => (
              <li key={i}><a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a><small>{fmtWhen(n.pubDate)}</small></li>
            ))}
            {(!news.mundo || news.mundo.length === 0) && <li className="pmx-indicator-news-empty">Sem notícias disponíveis no momento</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SlideEmpty({ label, onEdit, isAdmin }) {
  return (
    <div className="pmx-indicator-slide pmx-indicator-slide--empty">
      <p>{label}</p>
      {isAdmin && onEdit && <button className="pmx-indicator-edit-cta" onClick={onEdit}>Configurar agora</button>}
    </div>
  );
}

export default function IndicatorsCarousel({ isAdmin, onEditMeta, onEditCommodities, flowCounts, dark = false }) {
  const [data, setData] = useState(null);
  const [news, setNews] = useState(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () => fetch('/api/dashboard/indicadores', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (active && json) setData(json); })
      .catch(() => {});
    load();
    const interval = setInterval(load, 5 * 60 * 1000); // BCB/commodities não mudam a cada minuto
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => fetch('/api/dashboard/news', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (active && json) setNews(json); })
      .catch(() => {});
    load();
    const interval = setInterval(load, 15 * 60 * 1000); // notícias renovam a cada 15 min
    return () => { active = false; clearInterval(interval); };
  }, []);

  const slides = useMemo(() => {
    if (!data) return [];
    const list = [];
    if (flowCounts) list.push({ key: 'fluxo', render: () => <FluxoSlide counts={flowCounts} /> });
    list.push(
      { key: 'meta', render: () => <MetaSlide meta={data.meta} onEdit={onEditMeta} isAdmin={isAdmin} /> },
      { key: 'economicos', render: () => <EconomicosSlide ipca={data.ipca} cambio={data.cambio} selic={data.selic} /> },
      { key: 'commodities', render: () => <CommoditiesSlide commodities={data.commodities} onEdit={onEditCommodities} isAdmin={isAdmin} /> },
    );
    if (news) list.push({ key: 'noticias', render: () => <NewsSlide news={news} /> });
    return list;
  }, [data, news, flowCounts, isAdmin, onEditMeta, onEditCommodities]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), SLIDE_SECONDS * 1000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (!data || slides.length === 0) {
    return <div className={`pmx-indicator-carousel pmx-indicator-carousel--loading ${dark ? 'pmx-indicator-carousel--dark' : ''}`}>Carregando indicadores…</div>;
  }

  return (
    <div className={`pmx-indicator-carousel ${dark ? 'pmx-indicator-carousel--dark' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides[slide % slides.length].render()}
      <div className="pmx-indicator-dots">
        {slides.map((s, i) => (
          <button key={s.key} className={i === slide ? 'active' : ''} onClick={() => setSlide(i)} aria-label={`Ver ${s.key}`} />
        ))}
      </div>
    </div>
  );
}
