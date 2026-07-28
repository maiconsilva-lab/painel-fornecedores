'use client';

import { useEffect, useRef } from 'react';

export const CURSOR_PRESETS = [
  { id: 'padrao', label: 'Padrão do sistema', desc: 'O cursor normal do seu computador' },
  { id: 'minimalista', label: 'Minimalista', desc: 'Só um pontinho discreto' },
  { id: 'elegante', label: 'Elegante', desc: 'Ponto + anel com deslize suave' },
  { id: 'destaque', label: 'Destaque', desc: 'Anel maior, mais visível' },
];

/* Cursor customizado, opcional por usuário (escolhido em Aparência).
   'padrao' não renderiza nada — mantém o cursor nativo do sistema. */
export default function CustomCursor({ preset = 'padrao' }) {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const raf = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (typeof window === 'undefined' || preset === 'padrao') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tooSmall = window.innerWidth < 900;
    if (isTouch || reducedMotion || tooSmall) return;

    document.documentElement.classList.add('pmx-custom-cursor-active', `pmx-cursor-${preset}`);

    const onMove = (e) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };

    const clickableSelector = 'a, button, input, textarea, select, [role="button"], .pmx-clickable, [onclick]';
    const onOver = (e) => { if (e.target.closest?.(clickableSelector)) document.documentElement.classList.add('pmx-cursor-hover'); };
    const onOut = (e) => { if (e.target.closest?.(clickableSelector)) document.documentElement.classList.remove('pmx-cursor-hover'); };
    const onDown = () => document.documentElement.classList.add('pmx-cursor-down');
    const onUp = () => document.documentElement.classList.remove('pmx-cursor-down');
    const onLeave = () => { if (dotRef.current) dotRef.current.style.opacity = '0'; if (ringRef.current) ringRef.current.style.opacity = '0'; };
    const onEnter = () => { if (dotRef.current) dotRef.current.style.opacity = '1'; if (ringRef.current) ringRef.current.style.opacity = '1'; };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    const tick = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.18;
      ring.current.y += (pos.current.y - ring.current.y) * 0.18;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.current.x}px, ${ring.current.y}px, 0)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove('pmx-custom-cursor-active', 'pmx-cursor-hover', 'pmx-cursor-down', `pmx-cursor-${preset}`);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [preset]);

  if (preset === 'padrao') return null;

  return (
    <>
      {preset !== 'minimalista' && <div ref={ringRef} className="pmx-cursor-ring" aria-hidden="true" />}
      <div ref={dotRef} className="pmx-cursor-dot" aria-hidden="true" />
    </>
  );
}
