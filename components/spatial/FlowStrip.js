'use client';

/* Substitui a cena 3D (esfera com órbitas + caixas flutuando) por um
   fluxo horizontal simples e sóbrio, sem WebGL/3D — mesma informação
   (recebidos, em validação, prontos, concluídos), sem o visual
   "genérico de dashboard de ficção científica" que não combinava com
   a seriedade do sistema. */
export default function FlowStrip({ counts = {}, compact = false }) {
  const stages = [
    { key: 'received', label: 'Recebidos', value: counts.received ?? 0, icon: 'inbox' },
    { key: 'validation', label: 'Em validação', value: counts.validation ?? 0, icon: 'search' },
    { key: 'ready', label: 'Prontos', value: counts.ready ?? 0, icon: 'check' },
    { key: 'done', label: 'Concluídos', value: counts.done ?? 0, icon: 'flag' },
  ];

  const icons = {
    inbox: <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    check: <path d="M20 6 9 17l-5-5" />,
    flag: <><path d="M4 22V4" /><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1Z" /></>,
  };

  return (
    <div className={`pmx-flowstrip ${compact ? 'pmx-flowstrip--compact' : ''}`}>
      {stages.map((s, i) => (
        <div className="pmx-flowstrip__item" key={s.key}>
          <div className="pmx-flowstrip__card">
            <svg viewBox="0 0 24 24" width={compact ? 16 : 18} height={compact ? 16 : 18} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[s.icon]}</svg>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
          {i < stages.length - 1 && <div className="pmx-flowstrip__connector" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}
