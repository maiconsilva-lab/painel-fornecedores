'use client';

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Html, Line, Points, PointMaterial, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = {
  navy: '#071d31',
  blue: '#2f83bd',
  cyan: '#79d1ff',
  orange: '#f15a24',
  green: '#2bb681',
  white: '#eef9ff',
};

function Core({ reduced = false }) {
  const group = useRef();
  const ringA = useRef();
  const ringB = useRef();
  useFrame((state, delta) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    group.current.rotation.y += delta * .12;
    group.current.rotation.x = Math.sin(t * .33) * .06;
    ringA.current.rotation.z += delta * .13;
    ringB.current.rotation.x -= delta * .11;
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[.72, 64, 64]} />
        <meshPhysicalMaterial color="#226da7" roughness={.15} metalness={.28} transmission={.12} thickness={.8} clearcoat={1} clearcoatRoughness={.12} emissive="#103f69" emissiveIntensity={.45} />
      </mesh>
      <mesh scale={1.02}>
        <sphereGeometry args={[.72, 64, 64]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={.085} side={THREE.BackSide} />
      </mesh>
      <mesh position={[-.22,.24,.56]} scale={[.23,.13,.08]}>
        <sphereGeometry args={[1,32,16]} />
        <meshBasicMaterial color="#d8f5ff" transparent opacity={.6} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={ringA} rotation={[1.06,.12,.18]}>
        <mesh>
          <torusGeometry args={[1.12,.012,8,160]} />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={.46} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={ringB} rotation={[.25,.72,-.32]}>
        <mesh>
          <torusGeometry args={[1.42,.009,8,160]} />
          <meshBasicMaterial color={COLORS.orange} transparent opacity={.34} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <pointLight color={COLORS.blue} intensity={2.8} distance={8} decay={2} />
      <pointLight color={COLORS.orange} intensity={1.4} distance={6} decay={2} position={[1.1,-.4,.5]} />
    </group>
  );
}

function StageNode({ position, label, value, accent = 'blue', index, reduced }) {
  const ref = useRef();
  const color = accent === 'orange' ? COLORS.orange : accent === 'green' ? COLORS.green : COLORS.blue;
  useFrame((state) => {
    if (reduced || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = Math.sin(t * .36 + index) * .08;
    ref.current.rotation.x = Math.cos(t * .31 + index * .7) * .025;
  });
  return (
    <Float speed={reduced ? 0 : .72 + index * .05} rotationIntensity={reduced ? 0 : .16} floatIntensity={reduced ? 0 : .22} floatingRange={[-.08,.08]}>
      <group ref={ref} position={position}>
        <RoundedBox args={[1.72,.72,.22]} radius={.16} smoothness={6}>
          <meshPhysicalMaterial color="#173f62" roughness={.2} metalness={.18} transmission={.18} thickness={.35} transparent opacity={.92} clearcoat={.75} clearcoatRoughness={.18} />
        </RoundedBox>
        <mesh position={[-.63,0,.125]}>
          <sphereGeometry args={[.065,24,24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <pointLight color={color} intensity={.9} distance={1.7} position={[-.63,0,.18]} />
        <Html transform distanceFactor={7.4} position={[-.38,0,.14]} style={{pointerEvents:'none'}}>
          <div className="pmx-r3f-node-label">
            <strong>{label}</strong><span>{value}</span>
          </div>
        </Html>
      </group>
    </Float>
  );
}

function FlowLines({ positions }) {
  return (
    <>
      {positions.slice(0,-1).map((point,index) => {
        const next = positions[index+1];
        const midX = (point[0]+next[0])/2;
        const bend = index % 2 ? -.35 : .35;
        return <Line key={index} points={[point,[midX,(point[1]+next[1])/2+bend,.05],next]} color={index === 1 ? COLORS.orange : COLORS.cyan} lineWidth={.65} transparent opacity={.42} dashed dashSize={.08} gapSize={.06} />;
      })}
    </>
  );
}

function ParticleCloud({ count = 90, reduced = false }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const values = new Float32Array(count * 3);
    for (let i=0;i<count;i+=1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.65 + Math.random() * 3.7;
      values[i*3] = Math.cos(angle) * radius;
      values[i*3+1] = (Math.random()-.5) * 3.6;
      values[i*3+2] = Math.sin(angle) * radius * .55 + (Math.random()-.5) * 1.3;
    }
    return values;
  }, [count]);
  useFrame((state,delta) => {
    if (reduced || !ref.current) return;
    ref.current.rotation.y += delta * .018;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime*.15)*.06;
  });
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent color={COLORS.cyan} size={.025} sizeAttenuation depthWrite={false} opacity={.6} blending={THREE.AdditiveBlending}/>
    </Points>
  );
}

function CameraRig({ reduced = false }) {
  const { camera, pointer } = useThree();
  useFrame((state,delta) => {
    if (reduced) return;
    const targetX = pointer.x * .32;
    const targetY = pointer.y * .2;
    camera.position.x = THREE.MathUtils.damp(camera.position.x,targetX,3.2,delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y,targetY,3.2,delta);
    camera.lookAt(0,0,0);
  });
  return null;
}

function Scene({ mode, counts, labels, reduced }) {
  const group = useRef();
  const positions = useMemo(() => mode === 'login'
    ? [[-3.15,.85,.18],[-1.15,-1.08,.02],[1.22,-.94,.2],[3.2,.78,-.05]]
    : [[-3,.7,.15],[-1.02,-1,.05],[1.05,-.86,.18],[3,.7,-.04]], [mode]);
  const nodes = [
    { label: labels.request || 'Solicitação', value: `${counts.received ?? counts.queue ?? 0} recebidas`, accent:'blue' },
    { label: labels.validate || 'Validação', value: `${counts.validation ?? counts.critical ?? 0} em análise`, accent:'orange' },
    { label: labels.protheus || 'Protheus', value: `${counts.ready ?? 0} prontas`, accent:'blue' },
    { label: labels.done || 'Conclusão', value: `${counts.done ?? 0} concluídas`, accent:'green' },
  ];
  useFrame((state,delta) => {
    if (reduced || !group.current) return;
    group.current.rotation.y = Math.sin(state.clock.elapsedTime*.16)*.035;
    group.current.rotation.z = Math.cos(state.clock.elapsedTime*.13)*.01;
  });
  return (
    <group ref={group} scale={mode === 'login' ? 1.02 : .96}>
      <ambientLight intensity={.55}/>
      <directionalLight position={[4,5,6]} intensity={1.2} color="#bce9ff"/>
      <directionalLight position={[-5,-2,3]} intensity={.8} color="#ff956b"/>
      <Core reduced={reduced}/>
      <FlowLines positions={positions}/>
      {nodes.map((node,index)=><StageNode key={node.label} {...node} position={positions[index]} index={index} reduced={reduced}/>) }
      <ParticleCloud count={mode === 'login' ? 120 : 82} reduced={reduced}/>
      <Sparkles count={mode === 'login' ? 40 : 28} scale={[7,4,3]} size={1.3} speed={reduced ? 0 : .18} opacity={.38} color={COLORS.orange}/>
      <CameraRig reduced={reduced}/>
    </group>
  );
}

export default function SpatialSceneR3F({ className='', mode='hero', counts={}, labels={}, interactive=true }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className={`pmx-spatial-scene pmx-spatial-scene--${mode} pmx-spatial-scene--webgl ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1,1.55]}
        camera={{ position:[0,0,8.2], fov:42, near:.1, far:100 }}
        gl={{ antialias:true, alpha:true, powerPreference:'high-performance', toneMapping:THREE.ACESFilmicToneMapping }}
        style={{pointerEvents:interactive ? 'auto' : 'none'}}
      >
        <Suspense fallback={null}><Scene mode={mode} counts={counts} labels={labels} reduced={reduced}/></Suspense>
      </Canvas>
      <div className="pmx-spatial-scene__scan" />
      <div className="pmx-spatial-scene__vignette" />
    </div>
  );
}
