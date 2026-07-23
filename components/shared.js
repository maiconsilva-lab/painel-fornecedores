import { sanitize } from '../lib/sanitize';

export function DataSection({ title, icon, items, onCopy }) {
  const valid = items.filter(([, val]) => val && String(val).trim() && String(val).trim() !== ',');
  if (!valid.length) return null;
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:'.78rem',fontWeight:700,color:'#0f172a',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
        {icon} {title}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,background:'#f8fafc',borderRadius:12,padding:16,border:'1px solid #f1f5f9'}}>
        {valid.map(([label, val], i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:'.68rem',color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:2}}>{label}</div>
              <div style={{fontSize:'.86rem',fontWeight:500,wordBreak:'break-word',color:'#0f172a'}}>{sanitize(String(val))}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();onCopy(String(val))}} title="Copiar" style={{background:'none',border:'none',cursor:'pointer',fontSize:'.7rem',color:'#94a3b8',padding:4,flexShrink:0,opacity:.6,transition:'.15s'}}
              onMouseEnter={e=>e.currentTarget.style.opacity='1'} onMouseLeave={e=>e.currentTarget.style.opacity='.6'}>📋</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActionBtn({ onClick, color, bg, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'8px 14px',borderRadius:8,border:`1.5px solid ${color}`,background:bg,
      color,fontFamily:'inherit',fontSize:'.75rem',fontWeight:700,cursor:disabled?'not-allowed':'pointer',
      transition:'.15s',opacity:disabled?.5:1
    }}>{children}</button>
  );
}

export function PillBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:'6px 14px',borderRadius:20,
      border: active ? '1.5px solid #059669' : '1.5px solid #e2e8f0',
      background: active ? 'rgba(5,150,105,.06)' : '#fff',
      color: active ? '#059669' : '#94a3b8',
      fontFamily:'inherit',fontSize:'.75rem',fontWeight: active ? 700 : 500,cursor:'pointer',transition:'.15s'
    }}>{children}</button>
  );
}

export function SmBtn({ onClick, title, danger, children }) {
  return (
    <button onClick={onClick} title={title} style={{
      padding:'5px 8px',borderRadius:6,
      border: danger ? 'none' : '1px solid #e2e8f0',
      background: danger ? '#FEF2F2' : '#f8fafc',
      cursor:'pointer',fontSize:'.78rem',transition:'.15s'
    }}>{children}</button>
  );
}

export function StatNum({ label, value, color }) {
  return (
    <div>
      <div style={{fontSize:'.62rem',color:'#94a3b8',textTransform:'uppercase',fontWeight:600,letterSpacing:'.3px'}}>{label}</div>
      <div style={{fontWeight:800,fontSize:'1.2rem',color,marginTop:2}}>{value}</div>
    </div>
  );
}
