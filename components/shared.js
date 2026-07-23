import { sanitize } from '../lib/sanitize';

function CopyIcon() {
  return <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>;
}

export function DataSection({ title, icon, items, onCopy }) {
  const valid = items.filter(([, val]) => val !== null && val !== undefined && String(val).trim() && String(val).trim() !== ',');
  if (!valid.length) return null;
  const copyAll = () => onCopy(valid.map(([label, val]) => `${label}: ${val}`).join('\n'));
  return (
    <section style={{marginBottom:18,background:'#fff',border:'1px solid #E2E8F0',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 2px rgba(16,24,40,.03)'}}>
      <header style={{padding:'12px 14px',borderBottom:'1px solid #EDF1F5',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,background:'linear-gradient(180deg,#fff,#FBFCFE)'}}>
        <div style={{fontSize:12,fontWeight:750,color:'#172033',display:'flex',alignItems:'center',gap:7}}><span aria-hidden="true">{icon}</span>{title}</div>
        <button onClick={copyAll} title={`Copiar ${title}`} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 8px',borderRadius:7,border:'1px solid #C7DAED',background:'#EAF2FA',color:'#20558A',fontSize:10,fontWeight:700,cursor:'pointer'}}><CopyIcon /> Copiar seção</button>
      </header>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:0}}>
        {valid.map(([label, val], i) => (
          <div key={`${label}-${i}`} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,padding:'12px 14px',borderBottom:'1px solid #F0F3F6',borderRight:'1px solid #F0F3F6',minHeight:67}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:9,color:'#8490A3',fontWeight:750,textTransform:'uppercase',letterSpacing:'.45px',marginBottom:3}}>{label}</div>
              <div style={{fontSize:12,fontWeight:550,wordBreak:'break-word',color:'#172033',lineHeight:1.35}}>{sanitize(String(val))}</div>
            </div>
            <button onClick={e=>{e.stopPropagation();onCopy(String(val))}} title={`Copiar ${label}`} style={{width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:7,cursor:'pointer',color:'#8490A3',flexShrink:0,transition:'.15s'}}><CopyIcon /></button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ActionBtn({ onClick, color, bg, disabled, children }) {
  return <button onClick={onClick} disabled={disabled} style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${color}`,background:bg,color,fontFamily:'inherit',fontSize:11,fontWeight:700,cursor:disabled?'not-allowed':'pointer',transition:'.15s',opacity:disabled?.5:1}}>{children}</button>;
}

export function PillBtn({ active, onClick, children }) {
  return <button onClick={onClick} style={{padding:'6px 14px',borderRadius:20,border:active?'1px solid #20558A':'1px solid #E2E8F0',background:active?'#EAF2FA':'#fff',color:active?'#20558A':'#667085',fontFamily:'inherit',fontSize:11,fontWeight:active?700:500,cursor:'pointer',transition:'.15s'}}>{children}</button>;
}

export function SmBtn({ onClick, title, danger, children }) {
  return <button onClick={onClick} title={title} style={{padding:'5px 8px',borderRadius:7,border:danger?'1px solid #FECACA':'1px solid #E2E8F0',background:danger?'#FEF3F2':'#F8FAFC',color:danger?'#D92D20':'#475467',cursor:'pointer',fontSize:11,transition:'.15s'}}>{children}</button>;
}

export function StatNum({ label, value, color }) {
  return <div><div style={{fontSize:9,color:'#8490A3',textTransform:'uppercase',fontWeight:700,letterSpacing:'.4px'}}>{label}</div><div style={{fontWeight:800,fontSize:18,color,marginTop:2}}>{value}</div></div>;
}
