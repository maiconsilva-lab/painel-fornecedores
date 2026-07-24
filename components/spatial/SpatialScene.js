'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useState } from 'react';
import SpatialSceneCanvas from './SpatialSceneCanvas';

const SpatialSceneR3F = dynamic(() => import('./SpatialSceneR3F'), {
  ssr: false,
  loading: () => <div className="pmx-spatial-scene__loading" aria-hidden="true"><span/><i/><b/></div>,
});

class SpatialErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn('[Premix Spatial] WebGL indisponível; utilizando fallback Canvas.', error);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function canUseWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2', { powerPreference:'high-performance' }) || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function SpatialScene(props) {
  const [engine, setEngine] = useState('checking');

  useEffect(() => {
    const lowPower = window.matchMedia('(max-width: 900px)').matches || Boolean(navigator.connection?.saveData);
    setEngine(!lowPower && canUseWebGL() ? 'webgl' : 'canvas');
  }, []);

  const fallback = <SpatialSceneCanvas {...props} quality={engine === 'checking' ? 'low' : props.quality} />;
  if (engine !== 'webgl') return fallback;

  return (
    <SpatialErrorBoundary fallback={fallback}>
      <SpatialSceneR3F {...props} />
    </SpatialErrorBoundary>
  );
}
