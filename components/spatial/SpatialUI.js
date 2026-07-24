'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/*
 * V4.1 Calm Motion
 * A profundidade visual permanece, mas movimentos amplos de câmera, tilt,
 * magnetismo e transições com blur/escala foram removidos. A interface deve
 * parecer fluida sem deslocar o campo visual do usuário.
 */
export function SpatialBackground() {
  return (
    <div className="pmx-spatial-background" aria-hidden="true">
      <div className="pmx-spatial-background__grid" />
      <div className="pmx-spatial-background__blue" />
      <div className="pmx-spatial-background__orange" />
      <div className="pmx-spatial-background__noise" />
      <div className="pmx-spatial-background__vignette" />
    </div>
  );
}

export function TiltSurface({ children, className = '', as: Tag = 'div', ...props }) {
  return <Tag className={`pmx-tilt-surface ${className}`} {...props}>{children}</Tag>;
}

export function CountUp({ value, duration = 320 }) {
  const numeric = Number(value);
  const [display, setDisplay] = useState(Number.isFinite(numeric) ? numeric : value);
  const previous = useRef(Number.isFinite(numeric) ? numeric : 0);

  useEffect(() => {
    if (!Number.isFinite(numeric)) {
      setDisplay(value);
      return undefined;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startValue = previous.current;
    const delta = numeric - startValue;
    if (reduced || delta === 0) {
      setDisplay(numeric);
      previous.current = numeric;
      return undefined;
    }

    const started = performance.now();
    let raf = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplay(Math.round(startValue + delta * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else previous.current = numeric;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, duration, value]);

  return <>{display}</>;
}

export function PageMotion({ pageKey, children }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={pageKey}
      className="pmx-page-motion"
      initial={reduced ? false : { opacity: 0.965 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.14, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

export function ProtheusFlowSpatial({ received = 0, validation = 0, ready = 0, done = 0 }) {
  const steps = [
    { label: 'Recebido', value: received, tone: 'blue' },
    { label: 'Validando', value: validation, tone: 'orange' },
    { label: 'Pronto', value: ready, tone: 'blue' },
    { label: 'Cadastrado', value: done, tone: 'green' },
  ];

  return (
    <section className="pmx-spatial-flow" aria-label="Fluxo operacional Protheus">
      <div className="pmx-spatial-flow__label"><span>Fluxo operacional</span><b>Visão operacional consolidada</b></div>
      <div className="pmx-spatial-flow__track">
        <div className="pmx-spatial-flow__line"><i /><i /><i /></div>
        {steps.map((step, index) => (
          <div className={`pmx-spatial-flow__step pmx-spatial-flow__step--${step.tone}`} key={step.label} style={{ '--step-index': index }}>
            <div className="pmx-spatial-flow__node"><span /><strong><CountUp value={step.value} /></strong></div>
            <div><b>{step.label}</b><small>{index === 0 ? 'solicitações' : index === 1 ? 'em conferência' : index === 2 ? 'para lançamento' : 'finalizados'}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Mantido para compatibilidade com app/page.js. O magnetismo foi removido
   porque deslocamentos ligados ao cursor prejudicam estabilidade visual. */
export function useMagneticButtons() {
  useEffect(() => undefined, []);
}
