'use client';

import { useEffect, useRef } from 'react';

/* Cursor customizado sutil: um ponto fixo acompanha o mouse instantaneamente,
   um anel maior desliza atrás com suavização (lerp). Sobre elementos
   clicáveis, o anel cresce um pouco e o ponto encolhe — feedback discreto,
   sem nada piscando ou girando rápido (lição da Spatial UI de hoje mais
   cedo). Desliga sozinho em telas de toque, telas pequenas e quando
   prefers-reduced-motion está ativo. */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const raf = useRef(null);
  const pos = useRef({ x: -100, y: -100 });
  const ring = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tooSmall = window.innerWidth < 900;
    if (isTouch || reducedMotion || tooSmall) return;

    document.documentElement.classList.add('pmx-custom-cursor-active');

    const onMove = (e) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    };

    const clickableSelector = 'a, button, input, textarea, select, [role="button"], .pmx-clickable, [onclick]';
    const onOver = (e) => {
      if (e.target.closest?.(clickableSelector)) document.documentElement.classList.add('pmx-cursor-hover');
    };
    const onOut = (e) => {
      if (e.target.closest?.(clickableSelector)) document.documentElement.classList.remove('pmx-cursor-hover');
    };
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
      document.documentElement.classList.remove('pmx-custom-cursor-active', 'pmx-cursor-hover', 'pmx-cursor-down');
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver, true);
      document.removeEventListener('mouseout', onOut, true);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="pmx-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="pmx-cursor-dot" aria-hidden="true" />
    </>
  );
}
