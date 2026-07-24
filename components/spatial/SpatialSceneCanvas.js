'use client';

import { useEffect, useMemo, useRef } from 'react';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

function rotatePoint(point, rx, ry, rz = 0) {
  let { x, y, z } = point;
  const cosX = Math.cos(rx); const sinX = Math.sin(rx);
  const y1 = y * cosX - z * sinX;
  const z1 = y * sinX + z * cosX;
  y = y1; z = z1;
  const cosY = Math.cos(ry); const sinY = Math.sin(ry);
  const x2 = x * cosY + z * sinY;
  const z2 = -x * sinY + z * cosY;
  x = x2; z = z2;
  const cosZ = Math.cos(rz); const sinZ = Math.sin(rz);
  return { x: x * cosZ - y * sinZ, y: x * sinZ + y * cosZ, z };
}

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

function drawGlowLine(ctx, from, to, alpha = 1) {
  const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  gradient.addColorStop(0, `rgba(60,145,218,${0.08 * alpha})`);
  gradient.addColorStop(.45, `rgba(92,178,238,${0.65 * alpha})`);
  gradient.addColorStop(.7, `rgba(241,90,36,${0.55 * alpha})`);
  gradient.addColorStop(1, `rgba(241,90,36,${0.08 * alpha})`);
  ctx.save();
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1.3;
  ctx.shadowBlur = 12;
  ctx.shadowColor = 'rgba(66,150,220,.42)';
  ctx.beginPath();
  const bend = Math.max(22, Math.abs(to.x - from.x) * .22);
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(from.x + bend, from.y - 12, to.x - bend, to.y + 12, to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function project(point, width, height, focal = 680, cameraZ = 8.5) {
  const z = point.z + cameraZ;
  const scale = focal / Math.max(1.2, z * 92);
  return {
    x: width / 2 + point.x * 88 * scale,
    y: height / 2 + point.y * 88 * scale,
    scale,
    depth: z,
  };
}

function drawCore(ctx, point, size, t, mode) {
  const pulse = 1 + Math.sin(t * 1.2) * .025;
  const radius = size * pulse;
  ctx.save();
  const glow = ctx.createRadialGradient(point.x - radius * .22, point.y - radius * .28, radius * .05, point.x, point.y, radius * 1.55);
  glow.addColorStop(0, 'rgba(190,233,255,.98)');
  glow.addColorStop(.18, 'rgba(76,168,226,.92)');
  glow.addColorStop(.48, 'rgba(23,77,127,.88)');
  glow.addColorStop(.72, 'rgba(14,49,84,.42)');
  glow.addColorStop(1, 'rgba(9,32,55,0)');
  ctx.fillStyle = glow;
  ctx.shadowBlur = mode === 'login' ? 44 : 30;
  ctx.shadowColor = 'rgba(53,150,219,.66)';
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * 1.5, 0, TAU);
  ctx.fill();

  const body = ctx.createRadialGradient(point.x - radius * .3, point.y - radius * .33, radius * .06, point.x, point.y, radius);
  body.addColorStop(0, '#d7f2ff');
  body.addColorStop(.16, '#71bee9');
  body.addColorStop(.46, '#286da9');
  body.addColorStop(.78, '#133d68');
  body.addColorStop(1, '#0a2846');
  ctx.fillStyle = body;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.fill();

  ctx.globalCompositeOperation = 'screen';
  const shine = ctx.createLinearGradient(point.x - radius, point.y - radius, point.x + radius, point.y + radius);
  shine.addColorStop(0, 'rgba(255,255,255,.46)');
  shine.addColorStop(.45, 'rgba(255,255,255,0)');
  shine.addColorStop(1, 'rgba(241,90,36,.24)');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius * .96, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < 3; i += 1) {
    const ringRadius = radius * (1.35 + i * .34);
    ctx.strokeStyle = i === 1 ? 'rgba(241,90,36,.18)' : 'rgba(105,188,238,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, ringRadius, ringRadius * (.32 + i * .04), t * (.12 + i * .03), 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNode(ctx, projected, node, isLogin, t) {
  const scale = clamp(projected.scale, .62, 1.25);
  const width = (isLogin ? 132 : 116) * scale;
  const height = (isLogin ? 53 : 48) * scale;
  const x = projected.x - width / 2;
  const y = projected.y - height / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(4,23,42,.38)';
  ctx.shadowBlur = 20 * scale;
  ctx.shadowOffsetY = 9 * scale;
  const fill = ctx.createLinearGradient(x, y, x + width, y + height);
  fill.addColorStop(0, 'rgba(255,255,255,.23)');
  fill.addColorStop(.45, 'rgba(38,95,143,.18)');
  fill.addColorStop(1, 'rgba(9,40,68,.48)');
  roundedRect(ctx, x, y, width, height, 14 * scale);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = node.accent === 'orange' ? 'rgba(255,142,93,.64)' : 'rgba(167,222,255,.5)';
  ctx.stroke();

  const iconX = x + 17 * scale;
  const iconY = y + height / 2;
  ctx.fillStyle = node.accent === 'orange' ? 'rgba(241,90,36,.94)' : 'rgba(71,164,224,.94)';
  ctx.shadowBlur = 14;
  ctx.shadowColor = node.accent === 'orange' ? 'rgba(241,90,36,.55)' : 'rgba(71,164,224,.55)';
  ctx.beginPath();
  ctx.arc(iconX, iconY, 5 * scale * (1 + Math.sin(t * 1.8 + node.index) * .06), 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(241,248,253,.96)';
  ctx.font = `${600} ${11.5 * scale}px Geist, Arial, sans-serif`;
  ctx.fillText(node.label, x + 31 * scale, y + height * .38);
  ctx.fillStyle = 'rgba(183,210,228,.72)';
  ctx.font = `${500} ${8.6 * scale}px Geist, Arial, sans-serif`;
  ctx.fillText(node.value, x + 31 * scale, y + height * .68);
  ctx.restore();
}

export default function SpatialScene({
  className = '',
  mode = 'hero',
  counts = {},
  labels = {},
  interactive = true,
  quality = 'auto',
}) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const visibleRef = useRef(true);
  const reducedRef = useRef(false);
  const nodes = useMemo(() => [
    { index: 0, label: labels.request || 'Solicitação', value: `${counts.received ?? counts.queue ?? 0} recebidas`, x: -2.75, y: .62, z: .38, accent: 'blue' },
    { index: 1, label: labels.validate || 'Validação', value: `${counts.validation ?? counts.critical ?? 0} em análise`, x: -.94, y: -.92, z: -.32, accent: 'orange' },
    { index: 2, label: labels.protheus || 'Protheus', value: `${counts.ready ?? 0} prontas`, x: 1.06, y: -.74, z: .1, accent: 'blue' },
    { index: 3, label: labels.done || 'Conclusão', value: `${counts.done ?? 0} concluídas`, x: 2.82, y: .64, z: -.22, accent: 'orange' },
  ], [counts, labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d', { alpha: true });
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = media.matches;
    const onMedia = () => { reducedRef.current = media.matches; };
    media.addEventListener?.('change', onMedia);

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let last = performance.now();
    let elapsed = 0;
    const particleCount = quality === 'low' || window.innerWidth < 700 ? 32 : mode === 'login' ? 92 : 68;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * TAU + Math.random() * .35,
      radius: 1.55 + Math.random() * 2.35,
      y: (Math.random() - .5) * 2.2,
      z: (Math.random() - .5) * 1.7,
      speed: .06 + Math.random() * .18,
      size: .55 + Math.random() * 1.7,
      orange: i % 5 === 0,
      phase: Math.random() * TAU,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.2 : 1.8);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const onVisibility = () => { visibleRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVisibility);

    const draw = (now) => {
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      if (visibleRef.current) elapsed += reducedRef.current ? 0 : dt;
      pointerRef.current.x = lerp(pointerRef.current.x, pointerRef.current.tx, .055);
      pointerRef.current.y = lerp(pointerRef.current.y, pointerRef.current.ty, .055);
      const pointer = pointerRef.current;
      ctx.clearRect(0, 0, width, height);

      const rx = -.11 + pointer.y * .11;
      const ry = elapsed * .12 + pointer.x * .22;
      const rz = Math.sin(elapsed * .18) * .025;
      const projectedNodes = nodes.map((node) => {
        const float = reducedRef.current ? 0 : Math.sin(elapsed * .58 + node.index * 1.4) * .08;
        const rotated = rotatePoint({ x: node.x, y: node.y + float, z: node.z }, rx, ry, rz);
        return { ...project(rotated, width, height, mode === 'login' ? 760 : 690), node, rotated };
      });

      for (let i = 0; i < projectedNodes.length - 1; i += 1) {
        drawGlowLine(ctx, projectedNodes[i], projectedNodes[i + 1], .8 + Math.sin(elapsed * .8 + i) * .12);
      }

      const coreRotated = rotatePoint({ x: 0, y: 0, z: 0 }, rx, ry, rz);
      const core = project(coreRotated, width, height, mode === 'login' ? 760 : 690);

      particles.forEach((particle, index) => {
        const a = particle.angle + elapsed * particle.speed;
        const p = {
          x: Math.cos(a) * particle.radius,
          y: particle.y + Math.sin(a * 1.7 + particle.phase) * .18,
          z: Math.sin(a) * particle.radius * .35 + particle.z,
        };
        const rotated = rotatePoint(p, rx, ry, rz);
        const projected = project(rotated, width, height, mode === 'login' ? 760 : 690);
        const alpha = clamp(.18 + (1.8 - rotated.z) * .08, .12, .72);
        ctx.save();
        ctx.fillStyle = particle.orange ? `rgba(241,90,36,${alpha})` : `rgba(116,199,246,${alpha})`;
        ctx.shadowBlur = particle.orange ? 9 : 7;
        ctx.shadowColor = particle.orange ? 'rgba(241,90,36,.45)' : 'rgba(89,182,237,.45)';
        ctx.beginPath();
        ctx.arc(projected.x, projected.y, particle.size * clamp(projected.scale, .45, 1.4), 0, TAU);
        ctx.fill();
        ctx.restore();
        if (index % 9 === 0) drawGlowLine(ctx, projected, core, .14);
      });

      drawCore(ctx, core, (mode === 'login' ? 52 : 43) * clamp(core.scale, .8, 1.3), elapsed, mode);
      projectedNodes
        .sort((a, b) => b.depth - a.depth)
        .forEach((point) => drawNode(ctx, point, point.node, mode === 'login', elapsed));

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      media.removeEventListener?.('change', onMedia);
    };
  }, [nodes, mode, quality]);

  const onPointerMove = (event) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerRef.current.tx = clamp(((event.clientX - rect.left) / rect.width - .5) * 2, -1, 1);
    pointerRef.current.ty = clamp(((event.clientY - rect.top) / rect.height - .5) * 2, -1, 1);
  };
  const onPointerLeave = () => {
    pointerRef.current.tx = 0;
    pointerRef.current.ty = 0;
  };

  return (
    <div className={`pmx-spatial-scene pmx-spatial-scene--${mode} ${className}`} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="pmx-spatial-scene__scan" />
      <div className="pmx-spatial-scene__vignette" />
    </div>
  );
}
