'use client';

import { useEffect, useMemo, useRef } from 'react';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawLine(ctx, from, to, accent) {
  const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  gradient.addColorStop(0, 'rgba(91,181,237,.08)');
  gradient.addColorStop(0.5, accent === 'orange' ? 'rgba(241,90,36,.36)' : 'rgba(91,181,237,.38)');
  gradient.addColorStop(1, 'rgba(91,181,237,.08)');
  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  const bend = Math.abs(to.x - from.x) * 0.22;
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x + bend, from.y, to.x - bend, to.y, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawNode(ctx, node) {
  const width = 112;
  const height = 48;
  const x = node.x - width / 2;
  const y = node.y - height / 2;
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(3,20,36,.22)';
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, 'rgba(30,74,108,.96)');
  gradient.addColorStop(1, 'rgba(10,42,70,.94)');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = 'rgba(157,220,255,.16)';
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, width, height, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = node.accent;
  ctx.beginPath();
  ctx.arc(x + 14, y + height / 2, 3.2, 0, TAU);
  ctx.fill();

  ctx.font = '600 10px Geist, sans-serif';
  ctx.fillStyle = 'rgba(242,249,253,.94)';
  ctx.fillText(node.label, x + 24, y + 19);
  ctx.font = '500 8px Geist, sans-serif';
  ctx.fillStyle = 'rgba(198,224,239,.66)';
  ctx.fillText(node.value, x + 24, y + 33);
  ctx.restore();
}

export default function SpatialSceneCanvas({ className = '', mode = 'hero', counts = {}, labels = {}, quality = 'normal' }) {
  const canvasRef = useRef(null);
  const nodes = useMemo(() => [
    { label: labels.request || 'Solicitação', value: `${counts.received ?? counts.queue ?? 0} recebidas`, accent: '#4ea8df' },
    { label: labels.validate || 'Validação', value: `${counts.validation ?? counts.critical ?? 0} em análise`, accent: '#f15a24' },
    { label: labels.protheus || 'Protheus', value: `${counts.ready ?? 0} prontas`, accent: '#4ea8df' },
    { label: labels.done || 'Conclusão', value: `${counts.done ?? 0} concluídas`, accent: '#2bb681' },
  ], [counts, labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    let width = 1;
    let height = 1;
    let dpr = 1;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const particles = Array.from({ length: quality === 'low' ? 18 : mode === 'login' ? 30 : 22 }, (_, index) => ({
      angle: (index / 24) * TAU + Math.random() * 0.25,
      radius: 58 + Math.random() * 115,
      speed: 0.008 + Math.random() * 0.012,
      size: 0.6 + Math.random() * 1.1,
      orange: index % 6 === 0,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.1 : 1.45);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) elapsed += dt;
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.52;
      const cy = height * 0.5;
      const radius = clamp(Math.min(width, height) * 0.12, 40, 62);
      const spreadX = clamp(width * 0.29, 122, 188);
      const spreadY = clamp(height * 0.24, 62, 98);
      const positions = [
        { x: cx - spreadX, y: cy - spreadY },
        { x: cx - spreadX * 0.7, y: cy + spreadY },
        { x: cx + spreadX * 0.7, y: cy + spreadY },
        { x: cx + spreadX, y: cy - spreadY },
      ];

      for (let index = 0; index < positions.length - 1; index += 1) {
        drawLine(ctx, positions[index], positions[index + 1], index === 1 ? 'orange' : 'blue');
      }

      particles.forEach((particle) => {
        const angle = particle.angle + elapsed * particle.speed;
        const x = cx + Math.cos(angle) * particle.radius;
        const y = cy + Math.sin(angle) * particle.radius * 0.55;
        ctx.save();
        ctx.fillStyle = particle.orange ? 'rgba(241,90,36,.36)' : 'rgba(121,209,255,.34)';
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, TAU);
        ctx.fill();
        ctx.restore();
      });

      const glow = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.28, radius * 0.08, cx, cy, radius * 1.25);
      glow.addColorStop(0, '#d9f5ff');
      glow.addColorStop(0.12, '#4da6dc');
      glow.addColorStop(0.55, '#1f6da4');
      glow.addColorStop(1, '#0c3559');
      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = 'rgba(70,166,225,.38)';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(121,209,255,.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 1.6, radius * 0.55, 0.42, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(241,90,36,.18)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * 1.95, radius * 0.42, -0.6, 0, TAU);
      ctx.stroke();
      ctx.restore();

      positions.forEach((position, index) => drawNode(ctx, { ...nodes[index], ...position }));
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [mode, nodes, quality]);

  return (
    <div className={`pmx-spatial-scene pmx-spatial-scene--${mode} pmx-spatial-scene--canvas ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="pmx-spatial-scene__vignette" />
    </div>
  );
}
