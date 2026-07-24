'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, Points, PointMaterial, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = {
  blue: '#2f83bd',
  cyan: '#79d1ff',
  orange: '#f15a24',
  green: '#2bb681',
};

function Core({ reduced = false }) {
  const group = useRef();
  const ringA = useRef();
  const ringB = useRef();

  useFrame((state, delta) => {
    if (reduced || !group.current) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y += delta * 0.018;
    group.current.rotation.x = Math.sin(t * 0.12) * 0.012;
    if (ringA.current) ringA.current.rotation.z += delta * 0.022;
    if (ringB.current) ringB.current.rotation.x -= delta * 0.016;
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.67, 56, 56]} />
        <meshPhysicalMaterial
          color="#226da7"
          roughness={0.2}
          metalness={0.22}
          transmission={0.08}
          thickness={0.65}
          clearcoat={0.9}
          clearcoatRoughness={0.16}
          emissive="#103f69"
          emissiveIntensity={0.34}
        />
      </mesh>
      <mesh scale={1.025}>
        <sphereGeometry args={[0.67, 48, 48]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.055} side={THREE.BackSide} />
      </mesh>
      <mesh position={[-0.19, 0.21, 0.53]} scale={[0.2, 0.1, 0.06]}>
        <sphereGeometry args={[1, 28, 14]} />
        <meshBasicMaterial color="#dcf6ff" transparent opacity={0.48} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={ringA} rotation={[1.06, 0.12, 0.18]}>
        <mesh>
          <torusGeometry args={[1.03, 0.009, 8, 140]} />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.28} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={ringB} rotation={[0.25, 0.72, -0.32]}>
        <mesh>
          <torusGeometry args={[1.28, 0.007, 8, 140]} />
          <meshBasicMaterial color={COLORS.orange} transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <pointLight color={COLORS.blue} intensity={1.75} distance={7} decay={2} />
      <pointLight color={COLORS.orange} intensity={0.7} distance={5} decay={2} position={[1.1, -0.4, 0.5]} />
    </group>
  );
}

function StageNode({ position, label, value, accent = 'blue' }) {
  const color = accent === 'orange' ? COLORS.orange : accent === 'green' ? COLORS.green : COLORS.blue;
  return (
    <group position={position}>
      <RoundedBox args={[1.38, 0.6, 0.16]} radius={0.13} smoothness={5}>
        <meshPhysicalMaterial
          color="#173f62"
          roughness={0.25}
          metalness={0.12}
          transmission={0.1}
          thickness={0.25}
          transparent
          opacity={0.9}
          clearcoat={0.55}
          clearcoatRoughness={0.22}
        />
      </RoundedBox>
      <mesh position={[-0.52, 0, 0.095]}>
        <sphereGeometry args={[0.048, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={0.45} distance={1.2} position={[-0.52, 0, 0.13]} />
      <Html center transform distanceFactor={7.7} position={[0.08, 0, 0.1]} style={{ pointerEvents: 'none' }}>
        <div className="pmx-r3f-node-label">
          <strong>{label}</strong>
          <span>{value}</span>
        </div>
      </Html>
    </group>
  );
}

function FlowLines({ positions }) {
  return (
    <>
      {positions.slice(0, -1).map((point, index) => {
        const next = positions[index + 1];
        const midX = (point[0] + next[0]) / 2;
        const bend = index % 2 ? -0.18 : 0.18;
        return (
          <Line
            key={`${point[0]}-${next[0]}`}
            points={[point, [midX, (point[1] + next[1]) / 2 + bend, 0.02], next]}
            color={index === 1 ? COLORS.orange : COLORS.cyan}
            lineWidth={0.45}
            transparent
            opacity={0.25}
            dashed
            dashSize={0.075}
            gapSize={0.075}
          />
        );
      })}
    </>
  );
}

function ParticleCloud({ count = 34, reduced = false }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.55 + Math.random() * 2.7;
      values[i * 3] = Math.cos(angle) * radius;
      values[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
      values[i * 3 + 2] = Math.sin(angle) * radius * 0.42 + (Math.random() - 0.5) * 0.8;
    }
    return values;
  }, [count]);

  useFrame((state, delta) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y += delta * 0.004;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.07) * 0.012;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color={COLORS.cyan}
        size={0.018}
        sizeAttenuation
        depthWrite={false}
        opacity={0.32}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function Scene({ mode, counts, labels, reduced }) {
  const positions = useMemo(() => mode === 'login'
    ? [[-2.35, 0.82, 0.05], [-1.7, -1.03, 0.02], [1.7, -1.03, 0.08], [2.35, 0.82, -0.02]]
    : [[-2.08, 0.82, 0.05], [-1.5, -1.0, 0.02], [1.5, -1.0, 0.08], [2.08, 0.82, -0.02]], [mode]);

  const nodes = [
    { label: labels.request || 'Solicitação', value: `${counts.received ?? counts.queue ?? 0} recebidas`, accent: 'blue' },
    { label: labels.validate || 'Validação', value: `${counts.validation ?? counts.critical ?? 0} em análise`, accent: 'orange' },
    { label: labels.protheus || 'Protheus', value: `${counts.ready ?? 0} prontas`, accent: 'blue' },
    { label: labels.done || 'Conclusão', value: `${counts.done ?? 0} concluídas`, accent: 'green' },
  ];

  return (
    <group scale={mode === 'login' ? 1 : 0.94}>
      <ambientLight intensity={0.52} />
      <directionalLight position={[4, 5, 6]} intensity={0.9} color="#bce9ff" />
      <directionalLight position={[-5, -2, 3]} intensity={0.42} color="#ff956b" />
      <Core reduced={reduced} />
      <FlowLines positions={positions} />
      {nodes.map((node, index) => <StageNode key={node.label} {...node} position={positions[index]} />)}
      <ParticleCloud count={mode === 'login' ? 42 : 30} reduced={reduced} />
      <Sparkles count={mode === 'login' ? 10 : 6} scale={[6, 3.2, 2.2]} size={0.8} speed={reduced ? 0 : 0.035} opacity={0.18} color={COLORS.orange} />
    </group>
  );
}

export default function SpatialSceneR3F({ className = '', mode = 'hero', counts = {}, labels = {} }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className={`pmx-spatial-scene pmx-spatial-scene--${mode} pmx-spatial-scene--webgl ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 1.35]}
        camera={{ position: [0, 0, 8.4], fov: 42, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping }}
        style={{ pointerEvents: 'none' }}
      >
        <Suspense fallback={null}>
          <Scene mode={mode} counts={counts} labels={labels} reduced={reduced} />
        </Suspense>
      </Canvas>
      <div className="pmx-spatial-scene__vignette" />
    </div>
  );
}
