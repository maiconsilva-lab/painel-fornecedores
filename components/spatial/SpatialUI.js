'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function SpatialBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || window.innerWidth < 760) return undefined;
    let raf = 0;
    let targetX = .5; let targetY = .35; let x = targetX; let y = targetY;
    const move = (event) => {
      targetX = event.clientX / window.innerWidth;
      targetY = event.clientY / window.innerHeight;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      x += (targetX - x) * .12;
      y += (targetY - y) * .12;
      root.style.setProperty('--spatial-x', `${x * 100}%`);
      root.style.setProperty('--spatial-y', `${y * 100}%`);
      root.style.setProperty('--spatial-shift-x', `${(x - .5) * 18}px`);
      root.style.setProperty('--spatial-shift-y', `${(y - .5) * 14}px`);
      if (Math.abs(targetX - x) > .001 || Math.abs(targetY - y) > .001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={ref} className="pmx-spatial-background" aria-hidden="true">
      <div className="pmx-spatial-background__grid" />
      <div className="pmx-spatial-background__blue" />
      <div className="pmx-spatial-background__orange" />
      <div className="pmx-spatial-background__noise" />
      <div className="pmx-spatial-background__vignette" />
      <div className="pmx-spatial-cursor-light" />
    </div>
  );
}

export function TiltSurface({ children, className = '', as: Tag = 'div', intensity = 4, ...props }) {
  const ref = useRef(null);
  const move = (event) => {
    const element = ref.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 760) return;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty('--tilt-rx', `${(0.5 - y) * intensity}deg`);
    element.style.setProperty('--tilt-ry', `${(x - 0.5) * intensity}deg`);
    element.style.setProperty('--tilt-x', `${x * 100}%`);
    element.style.setProperty('--tilt-y', `${y * 100}%`);
  };
  const leave = () => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty('--tilt-rx', '0deg');
    element.style.setProperty('--tilt-ry', '0deg');
    element.style.setProperty('--tilt-x', '50%');
    element.style.setProperty('--tilt-y', '50%');
  };
  return <Tag ref={ref} className={`pmx-tilt-surface ${className}`} onPointerMove={move} onPointerLeave={leave} {...props}>{children}</Tag>;
}

export function CountUp({ value, duration = 750 }) {
  const numeric = Number(value);
  const [display, setDisplay] = useState(Number.isFinite(numeric) ? 0 : value);
  const previous = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(numeric)) { setDisplay(value); return undefined; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(numeric); previous.current = numeric; return undefined; }
    const startValue = previous.current;
    const delta = numeric - startValue;
    const started = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(startValue + delta * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else previous.current = numeric;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric, duration, value]);
  return <>{display}</>;
}

export function PageMotion({ pageKey, children }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        className="pmx-page-motion"
        initial={{ opacity:0, y:14, scale:.996, filter:'blur(5px)' }}
        animate={{ opacity:1, y:0, scale:1, filter:'blur(0px)' }}
        exit={{ opacity:0, y:-8, scale:.998, filter:'blur(3px)' }}
        transition={{ duration:.42, ease:[.16,1,.3,1] }}
        layout
      >
        {children}
      </motion.div>
    </AnimatePresence>
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

export function useMagneticButtons(scopeRef) {
  useEffect(() => {
    const scope = scopeRef?.current || document;
    if (!scope || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 760) return undefined;
    const bound = new WeakMap();
    const bind = (button) => {
      if (bound.has(button)) return;
      const move = (event) => {
        const rect = button.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        button.style.setProperty('--magnet-x', `${dx * .1}px`);
        button.style.setProperty('--magnet-y', `${dy * .1}px`);
      };
      const leave = () => { button.style.setProperty('--magnet-x', '0px'); button.style.setProperty('--magnet-y', '0px'); };
      button.addEventListener('pointermove', move);
      button.addEventListener('pointerleave', leave);
      bound.set(button, { move, leave });
    };
    const scan = () => scope.querySelectorAll('.pmx-button--primary,.pmx-cta,.pmx-spatial-magnetic').forEach(bind);
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(scope, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      scope.querySelectorAll('.pmx-button--primary,.pmx-cta,.pmx-spatial-magnetic').forEach((button) => {
        const handlers = bound.get(button);
        if (!handlers) return;
        button.removeEventListener('pointermove', handlers.move);
        button.removeEventListener('pointerleave', handlers.leave);
      });
    };
  }, [scopeRef]);
}
