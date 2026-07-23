export function inputStyle() {
  return { width:'100%',padding:'12px 14px',border:'1px solid #e2e8f0',borderRadius:10,fontSize:'.88rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',transition:'.15s',color:'#0f172a' };
}
export function fieldStyle() {
  return { width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'.84rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',transition:'.15s',color:'#0f172a' };
}
export function selectStyle() {
  return { padding:'10px 12px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:'.82rem',outline:'none',fontFamily:'inherit',background:'#f8fafc',cursor:'pointer',color:'#0f172a' };
}
export function menuItem() {
  return { display:'block',width:'100%',padding:'11px 18px',border:'none',background:'transparent',textAlign:'left',fontSize:'.82rem',fontFamily:'inherit',fontWeight:500,cursor:'pointer',color:'#0f172a',transition:'.15s' };
}
export function tdS() {
  return { padding:'14px 18px',fontSize:'.84rem',verticalAlign:'middle' };
}
export function thS() {
  return { textAlign:'left',padding:'11px 16px',fontSize:11,fontWeight:600,color:'#8B94A3',textTransform:'uppercase',letterSpacing:'.4px',background:'#F8F9FB',borderBottom:'1px solid #E5E9EF' };
}
export function tdSnew() {
  return { padding:'14px 16px',fontSize:13,color:'#1A2332',verticalAlign:'middle' };
}
export function btnAction(color, bg) {
  return { padding:'7px 12px',borderRadius:8,border:`1px solid ${color}33`,background:bg,color,fontFamily:'inherit',fontSize:'.74rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'.15s' };
}
export function actBtn(variant) {
  const base = { width:30,height:30,borderRadius:7,border:'1px solid #E5E9EF',background:'#F8F9FB',color:'#4F5868',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',transition:'all .15s' };
  if (variant === 'primary') return {...base,background:'#EAF2FA',borderColor:'rgba(32,85,138,.3)',color:'#20558A'};
  if (variant === 'danger')  return {...base,background:'#FEE2E2',borderColor:'rgba(230,57,70,.3)',color:'#E63946'};
  return base;
}
export function modalActBtn(variant) {
  const base = { display:'inline-flex',alignItems:'center',gap:7,padding:'9px 16px',borderRadius:9,fontFamily:'inherit',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .15s',border:'1px solid' };
  if (variant === 'primary') return {...base,background:'#20558A',borderColor:'#20558A',color:'#fff',boxShadow:'0 1px 2px rgba(32,85,138,.3),inset 0 1px 0 rgba(255,255,255,.15)'};
  if (variant === 'danger')  return {...base,background:'#fff',borderColor:'#FECACA',color:'#E63946'};
  if (variant === 'info')    return {...base,background:'#fff',borderColor:'#BFDBFE',color:'#2563EB'};
  return {...base,background:'#fff',borderColor:'#E5E9EF',color:'#4F5868'};
}
