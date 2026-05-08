'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const ST={pendente:{l:'Pendente',c:'#E8842C',bg:'#FFF3E0',i:'⏳'},em_analise:{l:'Em Análise',c:'#1976D2',bg:'#E3F2FD',i:'🔍'},aprovado:{l:'Concluído',c:'#00A650',bg:'#E8F5E9',i:'✓'},rejeitado:{l:'Devolvido',c:'#D93025',bg:'#FEE2E2',i:'↩'}};
const TL={pj:'PJ',pf:'PF',motorista:'Motorista'};
const PRI={urgente:{l:'Urgente',c:'#D93025',bg:'#FEE2E2'},alta:{l:'Alta',c:'#E8842C',bg:'#FFF3E0'},media:{l:'Média',c:'#1976D2',bg:'#E3F2FD'},baixa:{l:'Baixa',c:'#6B7265',bg:'#F0F2F7'}};
const KAN_COLS=[{k:'backlog',l:'📋 Backlog / Mês',c:'#6B7265'},{k:'esta_semana',l:'📅 Esta Semana',c:'#E8842C'},{k:'em_andamento',l:'🔄 Em Andamento',c:'#1976D2'},{k:'concluido',l:'✅ Concluído',c:'#00A650'}];

export default function Home(){
  const[user,setUser]=useState(null);
  const[loginForm,setLF]=useState({email:'',senha:''});
  const[loginErr,setLE]=useState('');
  const[changePw,setCP]=useState(false);
  const[newPw,setNP]=useState({atual:'',nova:'',conf:''});
  const[pwMsg,setPwMsg]=useState('');

  const[forn,setForn]=useState([]);
  const[usuarios,setUsu]=useState([]);
  const[loading,setLoad]=useState(true);
  const[page,setPage]=useState('cadastros');
  const[tab,setTab]=useState('pendentes');
  const[sel,setSel]=useState(null);
  const[search,setSearch]=useState('');
  const[saving,setSav]=useState(false);
  const[showDev,setShowDev]=useState(false);
  const[devMsg,setDevMsg]=useState('');
  const[showAssign,setShowAssign]=useState(false);

  // Kanban
  const[kanban,setKanban]=useState([]);
  const[kanView,setKanView]=useState('todos');
  const[showNewTask,setShowNewTask]=useState(false);
  const[newTask,setNewTask]=useState({titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog'});
  const[editTask,setEditTask]=useState(null);

  const obsRef=useRef(null);
  const isAdmin=user&&(user.role==='admin'||user.role==='subadmin');

  // LOGIN
  const doLogin=async(e)=>{
    e.preventDefault();
    const{data,error}=await supabase.from('usuarios_painel').select('*').eq('email',loginForm.email).eq('senha_hash',loginForm.senha).eq('ativo',true).single();
    if(error||!data){setLE('E-mail ou senha inválidos');return}
    setUser(data);localStorage.setItem('premix_user',JSON.stringify(data));
    if(data.primeiro_login)setCP(true);
  };

  const doChangePw=async(e)=>{
    e.preventDefault();
    if(newPw.nova!==newPw.conf){setPwMsg('As senhas não coincidem');return}
    if(newPw.nova.length<6){setPwMsg('Mínimo 6 caracteres');return}
    const{error}=await supabase.from('usuarios_painel').update({senha_hash:newPw.nova,primeiro_login:false}).eq('id',user.id);
    if(error){setPwMsg('Erro ao atualizar');return}
    const updated={...user,senha_hash:newPw.nova,primeiro_login:false};
    setUser(updated);localStorage.setItem('premix_user',JSON.stringify(updated));
    setCP(false);setNP({atual:'',nova:'',conf:''});setPwMsg('');
  };

  useEffect(()=>{const s=localStorage.getItem('premix_user');if(s)try{setUser(JSON.parse(s))}catch{}},[]);

  // FETCH
  const fetchAll=useCallback(async()=>{
    if(!user)return;
    setLoad(true);
    const[{data:f},{data:u},{data:k}]=await Promise.all([
      supabase.from('fornecedores').select('*').order('created_at',{ascending:false}),
      supabase.from('usuarios_painel').select('*').eq('ativo',true),
      supabase.from('kanban_tarefas').select('*').order('ordem',{ascending:true}),
    ]);
    if(f)setForn(f);if(u)setUsu(u);if(k)setKanban(k);
    setLoad(false);
  },[user]);

  useEffect(()=>{fetchAll()},[fetchAll]);

  // REALTIME
  useEffect(()=>{
    if(!user)return;
    const ch=supabase.channel('rt-all')
      .on('postgres_changes',{event:'*',schema:'public',table:'fornecedores'},()=>fetchAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'kanban_tarefas'},()=>fetchAll())
      .subscribe();
    return()=>{supabase.removeChannel(ch)};
  },[user,fetchAll]);

  const updateStatus=async(id,s)=>{setSav(true);const u={status:s};if(s==='aprovado'){u.finalizado_por=user.nome;u.data_finalizacao=new Date().toISOString()}await supabase.from('fornecedores').update(u).eq('id',id);if(sel?.id===id)setSel({...sel,...u});await fetchAll();setSav(false)};

  const assignTo=async(id,nome)=>{setSav(true);await supabase.from('fornecedores').update({atribuido_para:nome,status:'em_analise'}).eq('id',id);if(sel?.id===id)setSel({...sel,atribuido_para:nome,status:'em_analise'});setShowAssign(false);await fetchAll();setSav(false)};

  const deleteForn=async(id)=>{if(!confirm('Tem certeza que deseja excluir este cadastro?'))return;await supabase.from('fornecedores').delete().eq('id',id);setSel(null);await fetchAll()};

  const saveObs=async(id)=>{if(!obsRef.current)return;await supabase.from('fornecedores').update({observacoes_internas:obsRef.current.value}).eq('id',id)};

  const sendDevolutiva=()=>{
    if(!sel||!devMsg.trim())return;
    const subj=encodeURIComponent('Premix — Correção necessária no seu cadastro de fornecedor');
    const body=encodeURIComponent(`Prezado(a),\n\nIdentificamos uma pendência no seu cadastro de fornecedor enviado à Premix:\n\n➤ MOTIVO DA DEVOLUÇÃO:\n${devMsg}\n\nPor favor, acesse o link abaixo e envie um novo cadastro com as informações corrigidas:\nhttps://formulario-fornecedor-nine.vercel.app\n\nEm caso de dúvidas, entre em contato com o Núcleo Fiscal.\n\nAtenciosamente,\n${user.nome}\nNúcleo Fiscal — Premix`);
    window.open(`mailto:${sel.email}?subject=${subj}&body=${body}`,'_blank');
    supabase.from('fornecedores').update({status:'rejeitado',motivo_devolucao:devMsg,finalizado_por:user.nome,data_finalizacao:new Date().toISOString()}).eq('id',sel.id).then(()=>fetchAll());
    setSel({...sel,status:'rejeitado',motivo_devolucao:devMsg});
    setShowDev(false);setDevMsg('');
  };

  // KANBAN
  const addKanTask=async(e)=>{e.preventDefault();if(!newTask.titulo.trim()||!newTask.atribuido_para)return;await supabase.from('kanban_tarefas').insert({...newTask,criado_por:user.nome});setShowNewTask(false);setNewTask({titulo:'',descricao:'',atribuido_para:'',prioridade:'media',prazo:'',status:'backlog'});await fetchAll()};
  const moveKanTask=async(id,newStatus)=>{await supabase.from('kanban_tarefas').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',id);await fetchAll()};
  const deleteKanTask=async(id)=>{if(!confirm('Excluir esta tarefa?'))return;await supabase.from('kanban_tarefas').delete().eq('id',id);if(editTask?.id===id)setEditTask(null);await fetchAll()};
  const updateKanTask=async(id,data)=>{await supabase.from('kanban_tarefas').update({...data,updated_at:new Date().toISOString()}).eq('id',id);setEditTask(null);await fetchAll()};

  const fmtDate=d=>{if(!d)return'-';return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
  const fmtDateShort=d=>{if(!d)return'';return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})};
  const cp=t=>{navigator.clipboard.writeText(t||'')};

  const pend=forn.filter(f=>f.status==='pendente'||f.status==='em_analise');
  const done=forn.filter(f=>f.status==='aprovado'||f.status==='rejeitado');
  const list=(tab==='pendentes'?pend:done).filter(f=>{if(!search)return true;const s=search.toLowerCase();return(f.razao_social||'').toLowerCase().includes(s)||(f.cnpj||'').includes(s)||(f.nome_fantasia||'').toLowerCase().includes(s)||(f.email||'').toLowerCase().includes(s)||(f.nome_completo||'').toLowerCase().includes(s)||(f.cpf||'').includes(s)});

  const kanFiltered=kanView==='todos'?kanban:kanban.filter(t=>t.atribuido_para===kanView);

  // Styles
  const S={
    bg:'#F5F6F0',card:'#FFFFFF',dark:'#1A1A1A',green:'#00A650',gold:'#C8A951',
    border:'#D8DDD2',muted:'#6B7265',text:'#1A1A1A',
    font:'Montserrat,sans-serif',fontB:'Open Sans,sans-serif',
  };

  // ========= LOGIN =========
  if(!user)return(
    <div style={{minHeight:'100vh',background:S.dark,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:S.font}}>
      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'92%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${S.green},${S.gold},${S.green})`}}/>
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:50,marginBottom:24}}/>
        <h2 style={{fontSize:'1.1rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'1px',marginBottom:4}}>Painel de Fornecedores</h2>
        <p style={{fontSize:'.78rem',color:S.muted,marginBottom:28}}>Núcleo Fiscal — Acesso restrito</p>
        <form onSubmit={doLogin}>
          <input placeholder="E-mail corporativo" type="email" value={loginForm.email} onChange={e=>setLF({...loginForm,email:e.target.value})} style={{width:'100%',padding:'13px 16px',border:`1.5px solid ${S.border}`,borderRadius:8,marginBottom:12,fontSize:'.9rem',outline:'none',fontFamily:S.fontB,background:'#FAFBF8'}}/>
          <input placeholder="Senha" type="password" value={loginForm.senha} onChange={e=>setLF({...loginForm,senha:e.target.value})} style={{width:'100%',padding:'13px 16px',border:`1.5px solid ${S.border}`,borderRadius:8,marginBottom:12,fontSize:'.9rem',outline:'none',fontFamily:S.fontB,background:'#FAFBF8'}}/>
          {loginErr&&<p style={{color:'#D93025',fontSize:'.78rem',marginBottom:12}}>{loginErr}</p>}
          <button type="submit" style={{width:'100%',padding:'14px',background:S.green,color:'#fff',border:'none',borderRadius:8,fontFamily:S.font,fontWeight:800,fontSize:'.88rem',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px',boxShadow:'0 4px 14px rgba(0,166,80,.3)',transition:'.2s'}}>Entrar</button>
        </form>
      </div>
    </div>
  );

  // ========= CHANGE PASSWORD =========
  if(changePw)return(
    <div style={{minHeight:'100vh',background:S.dark,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:S.font}}>
      <div style={{background:'#fff',borderRadius:16,padding:'48px 40px',maxWidth:420,width:'92%',textAlign:'center',position:'relative',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${S.green},${S.gold},${S.green})`}}/>
        <h2 style={{fontSize:'1rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>Alterar Senha</h2>
        <p style={{fontSize:'.78rem',color:S.muted,marginBottom:24}}>Primeiro acesso — crie uma nova senha</p>
        <form onSubmit={doChangePw}>
          <input placeholder="Nova senha (mín. 6 caracteres)" type="password" value={newPw.nova} onChange={e=>setNP({...newPw,nova:e.target.value})} style={{width:'100%',padding:'13px 16px',border:`1.5px solid ${S.border}`,borderRadius:8,marginBottom:12,fontSize:'.9rem',outline:'none',fontFamily:S.fontB}}/>
          <input placeholder="Confirmar nova senha" type="password" value={newPw.conf} onChange={e=>setNP({...newPw,conf:e.target.value})} style={{width:'100%',padding:'13px 16px',border:`1.5px solid ${S.border}`,borderRadius:8,marginBottom:12,fontSize:'.9rem',outline:'none',fontFamily:S.fontB}}/>
          {pwMsg&&<p style={{color:'#D93025',fontSize:'.78rem',marginBottom:12}}>{pwMsg}</p>}
          <button type="submit" style={{width:'100%',padding:'14px',background:S.green,color:'#fff',border:'none',borderRadius:8,fontFamily:S.font,fontWeight:800,fontSize:'.88rem',cursor:'pointer',textTransform:'uppercase',letterSpacing:'1px'}}>Salvar Nova Senha</button>
        </form>
        <button onClick={()=>setCP(false)} style={{marginTop:12,background:'none',border:'none',color:S.muted,cursor:'pointer',fontSize:'.78rem'}}>Pular por agora</button>
      </div>
    </div>
  );

  // ========= MAIN =========
  return(
    <div style={{minHeight:'100vh',background:S.bg,fontFamily:S.fontB}}>
      {/* HEADER */}
      <header style={{background:S.dark,position:'sticky',top:0,zIndex:100}}>
        <div style={{height:3,background:`linear-gradient(90deg,${S.green},${S.gold},${S.green})`}}/>
        <div style={{padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,maxWidth:1500,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:28}}/>
            <div style={{height:24,width:1,background:'rgba(255,255,255,.15)'}}/>
            <div>
              <div style={{color:'#fff',fontSize:'.78rem',fontWeight:800,fontFamily:S.font,letterSpacing:'1px',textTransform:'uppercase'}}>Núcleo Fiscal</div>
            </div>
          </div>

          {/* NAV */}
          <div style={{display:'flex',gap:2}}>
            {[{k:'cadastros',l:'📋 Cadastros'},{k:'kanban',l:'📊 Kanban'}].map(n=>(
              <button key={n.k} onClick={()=>{setPage(n.k);setSel(null)}} style={{padding:'8px 18px',borderRadius:6,border:'none',background:page===n.k?'rgba(0,166,80,.15)':'transparent',color:page===n.k?S.green:'rgba(255,255,255,.6)',fontFamily:S.font,fontSize:'.75rem',fontWeight:page===n.k?800:600,cursor:'pointer',textTransform:'uppercase',letterSpacing:'.5px',transition:'.2s'}}>
                {n.l}
              </button>
            ))}
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'7px 14px',borderRadius:6,border:'none',background:'rgba(255,255,255,.08)',color:'#fff',fontSize:'.8rem',width:200,outline:'none',fontFamily:S.fontB}}/>
            <div style={{color:'rgba(255,255,255,.5)',fontSize:'.72rem',padding:'0 6px',fontFamily:S.font}}>
              {user.nome.split(' ')[0]} <span style={{fontSize:'.6rem',opacity:.5}}>({user.cargo})</span>
            </div>
            <button onClick={()=>setCP(true)} title="Alterar senha" style={{background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,color:'rgba(255,255,255,.4)',cursor:'pointer',padding:'6px 8px',fontSize:'.7rem'}}>🔑</button>
            <button onClick={()=>{localStorage.removeItem('premix_user');setUser(null)}} style={{padding:'6px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.1)',background:'transparent',color:'rgba(255,255,255,.5)',cursor:'pointer',fontSize:'.7rem',fontFamily:S.font,fontWeight:600}}>Sair</button>
          </div>
        </div>
      </header>

      {/* ============ CADASTROS PAGE ============ */}
      {page==='cadastros'&&(
        <div style={{maxWidth:1500,margin:'0 auto',padding:'20px 20px'}}>
          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:20}}>
            {[{n:pend.length,l:'Pendentes',c:'#E8842C',i:'⏳'},{n:done.filter(f=>f.status==='aprovado').length,l:'Concluídos',c:'#00A650',i:'✓'},{n:done.filter(f=>f.status==='rejeitado').length,l:'Devolvidos',c:'#D93025',i:'↩'},{n:forn.length,l:'Total',c:'#1A1A1A',i:'📋'}].map((s,i)=>(
              <div key={i} style={{padding:'16px 18px',borderRadius:10,background:S.card,border:`1px solid ${S.border}`,boxShadow:'0 1px 3px rgba(0,0,0,.02)'}}>
                <div style={{fontSize:'.68rem',color:S.muted,fontWeight:700,fontFamily:S.font,textTransform:'uppercase',letterSpacing:'.5px'}}>{s.i} {s.l}</div>
                <div style={{fontSize:'1.8rem',fontWeight:900,color:s.c,fontFamily:S.font,marginTop:4}}>{s.n}</div>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div style={{display:'flex',gap:2,marginBottom:16,borderBottom:`2px solid ${S.border}`,paddingBottom:0}}>
            {[{k:'pendentes',l:'📋 Tarefas Pendentes',n:pend.length},{k:'concluidos',l:'✓ Concluídos / Devolvidos',n:done.length}].map(t=>(
              <button key={t.k} onClick={()=>{setTab(t.k);setSel(null)}} style={{
                padding:'12px 22px',borderRadius:'8px 8px 0 0',border:`1px solid ${S.border}`,borderBottom:tab===t.k?`3px solid ${S.green}`:`1px solid ${S.border}`,
                background:tab===t.k?S.card:S.bg,fontFamily:S.font,fontSize:'.76rem',fontWeight:tab===t.k?800:500,
                color:tab===t.k?S.green:S.muted,cursor:'pointer',textTransform:'uppercase',letterSpacing:'.5px',transition:'.15s',marginBottom:-2
              }}>{t.l} ({t.n})</button>
            ))}
          </div>

          <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
            {/* LIST */}
            <div style={{flex:'1 1 400px',minWidth:0}}>
              {loading?<div style={{textAlign:'center',padding:60,color:S.muted,background:S.card,borderRadius:10}}>Carregando...</div>
              :list.length===0?<div style={{textAlign:'center',padding:60,background:S.card,borderRadius:10,color:S.muted,border:`1px solid ${S.border}`}}><div style={{fontSize:'2.5rem',marginBottom:10}}>📭</div><div style={{fontFamily:S.font,fontWeight:700,textTransform:'uppercase',fontSize:'.85rem'}}>Nenhum cadastro</div></div>
              :<div style={{display:'flex',flexDirection:'column',gap:6}}>
                {list.map(f=>{const st=ST[f.status]||ST.pendente;const isSel=sel?.id===f.id;return(
                  <div key={f.id} onClick={()=>setSel(f)} style={{background:S.card,border:`2px solid ${isSel?S.green:'transparent'}`,borderRadius:10,padding:'14px 16px',cursor:'pointer',transition:'.15s',boxShadow:isSel?`0 4px 16px rgba(0,166,80,.1)`:'0 1px 3px rgba(0,0,0,.02)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:'.88rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:S.font}}>{f.razao_social||f.nome_completo||'Sem nome'}</div>
                        <div style={{fontSize:'.73rem',color:S.muted,marginTop:2}}>{f.cnpj||f.cpf||'-'} • {f.email||'-'}</div>
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <span style={{padding:'3px 8px',borderRadius:4,fontSize:'.62rem',fontWeight:800,background:'#F0F2F7',color:S.dark,fontFamily:S.font,textTransform:'uppercase'}}>{TL[f.tipo_cadastro]||'PJ'}</span>
                        <span style={{padding:'3px 8px',borderRadius:4,fontSize:'.62rem',fontWeight:800,background:st.bg,color:st.c,fontFamily:S.font}}>{st.i} {st.l}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'.66rem',color:S.muted,marginTop:6}}>
                      <span>{fmtDate(f.created_at)}</span>
                      {f.atribuido_para&&<span>👤 {f.atribuido_para}</span>}
                    </div>
                  </div>
                )})}
              </div>}
            </div>

            {/* DETAIL */}
            {sel&&(
              <div style={{flex:'0 0 520px',background:S.card,borderRadius:12,border:`1px solid ${S.border}`,position:'sticky',top:65,maxHeight:'calc(100vh - 80px)',overflowY:'auto',boxShadow:'0 4px 20px rgba(0,0,0,.04)'}}>
                {/* Detail Header */}
                <div style={{padding:'16px 20px',borderBottom:`1px solid ${S.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:S.card,zIndex:5,borderRadius:'12px 12px 0 0'}}>
                  <div>
                    <h2 style={{fontSize:'.9rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',letterSpacing:'.3px'}}>{sel.razao_social||sel.nome_completo}</h2>
                    <span style={{fontSize:'.68rem',color:S.muted,fontFamily:S.font}}>{TL[sel.tipo_cadastro]||'PJ'} • {fmtDate(sel.created_at)}</span>
                  </div>
                  <button onClick={()=>setSel(null)} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:S.muted}}>✕</button>
                </div>

                <div style={{padding:'16px 20px'}}>
                  {/* ACTIONS */}
                  <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap'}}>
                    {sel.status==='pendente'&&!sel.atribuido_para&&(
                      <button disabled={saving} onClick={()=>assignTo(sel.id,user.nome)} style={btnStyle(S.green,'#E8F5E9')}>📌 Pegar para mim</button>
                    )}
                    {(sel.status==='pendente'||sel.status==='em_analise')&&(
                      <>
                        <button disabled={saving} onClick={()=>setShowAssign(true)} style={btnStyle('#1976D2','#E3F2FD')}>👥 Direcionar</button>
                        <button disabled={saving} onClick={()=>updateStatus(sel.id,'aprovado')} style={btnStyle(S.green,'#E8F5E9')}>✓ Concluir</button>
                        <button disabled={saving} onClick={()=>setShowDev(true)} style={btnStyle('#D93025','#FEE2E2')}>↩ Devolver</button>
                      </>
                    )}
                    {isAdmin&&<button onClick={()=>deleteForn(sel.id)} style={btnStyle('#D93025','#FEE2E2')}>🗑 Excluir</button>}
                  </div>

                  {/* ASSIGN MODAL */}
                  {showAssign&&(
                    <div style={{padding:14,background:'#E3F2FD',borderRadius:8,marginBottom:14,border:'1px solid #90CAF9'}}>
                      <div style={{fontSize:'.78rem',fontWeight:800,color:'#1976D2',marginBottom:8,fontFamily:S.font,textTransform:'uppercase'}}>Direcionar para:</div>
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        {usuarios.map(u=>(
                          <button key={u.id} onClick={()=>assignTo(sel.id,u.nome)} style={{padding:'8px 12px',borderRadius:6,border:`1px solid ${S.border}`,background:S.card,cursor:'pointer',textAlign:'left',fontSize:'.8rem',fontFamily:S.fontB,transition:'.15s'}}>
                            <strong>{u.nome}</strong> <span style={{color:S.muted,fontSize:'.7rem'}}>— {u.cargo}</span>
                          </button>
                        ))}
                      </div>
                      <button onClick={()=>setShowAssign(false)} style={{marginTop:8,background:'none',border:'none',color:S.muted,cursor:'pointer',fontSize:'.75rem'}}>Cancelar</button>
                    </div>
                  )}

                  {/* DEVOLUTIVA */}
                  {showDev&&(
                    <div style={{padding:16,background:'#FEE2E2',borderRadius:8,marginBottom:14,border:'1px solid #EF9A9A'}}>
                      <div style={{fontSize:'.78rem',fontWeight:800,color:'#B71C1C',marginBottom:4,fontFamily:S.font,textTransform:'uppercase'}}>Devolutiva por E-mail</div>
                      <div style={{fontSize:'.72rem',color:S.muted,marginBottom:8}}>Para: <strong>{sel.email}</strong></div>
                      <div style={{fontSize:'.72rem',color:'#B71C1C',marginBottom:6}}>Especifique o motivo da devolução:</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:8}}>
                        {['Dados bancários de terceiros','CNPJ divergente','Contrato Social ilegível','IE inválida ou faltante','Comprovante bancário faltante','Dados incompletos'].map(m=>(
                          <button key={m} onClick={()=>setDevMsg(prev=>prev?prev+'; '+m:m)} style={{padding:'5px 10px',borderRadius:20,border:'1px solid #EF9A9A',background:'#fff',color:'#B71C1C',fontSize:'.7rem',cursor:'pointer',fontFamily:S.fontB,fontWeight:600}}>{m}</button>
                        ))}
                      </div>
                      <textarea value={devMsg} onChange={e=>setDevMsg(e.target.value)} placeholder="Descreva detalhadamente o que precisa ser corrigido..." style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1.5px solid #EF9A9A',fontSize:'.82rem',minHeight:80,resize:'vertical',outline:'none',fontFamily:S.fontB}}/>
                      <div style={{display:'flex',gap:8,marginTop:8}}>
                        <button onClick={sendDevolutiva} style={{padding:'9px 18px',borderRadius:6,border:'none',background:'#D93025',color:'#fff',fontFamily:S.font,fontSize:'.75rem',fontWeight:800,cursor:'pointer',textTransform:'uppercase'}}>📧 Enviar Devolutiva</button>
                        <button onClick={()=>{setShowDev(false);setDevMsg('')}} style={{padding:'9px 18px',borderRadius:6,border:`1px solid ${S.border}`,background:'#fff',fontFamily:S.font,fontSize:'.75rem',fontWeight:600,cursor:'pointer',color:S.muted}}>Cancelar</button>
                      </div>
                    </div>
                  )}

                  {sel.atribuido_para&&<div style={{padding:'8px 12px',background:'#E3F2FD',borderRadius:6,fontSize:'.76rem',marginBottom:12,color:'#1976D2',fontWeight:500}}>👤 Responsável: <strong>{sel.atribuido_para}</strong>{sel.finalizado_por&&<span> • Finalizado por: <strong>{sel.finalizado_por}</strong></span>}</div>}

                  {sel.motivo_devolucao&&<div style={{padding:'10px 12px',background:'#FEE2E2',borderRadius:6,fontSize:'.76rem',marginBottom:12,color:'#B71C1C'}}>↩ <strong>Motivo da devolução:</strong> {sel.motivo_devolucao}</div>}

                  {/* DATA */}
                  {(sel.tipo_cadastro==='pj'||!sel.tipo_cadastro)?(
                    <DB t="Empresa" items={[['Razão Social',sel.razao_social],['Fantasia',sel.nome_fantasia],['CNPJ',sel.cnpj],['IE',sel.inscricao_estadual_isento?'ISENTO':sel.inscricao_estadual],['Ramo',sel.ramo_atividade],['Produtos',sel.produtos_servicos]]} cp={cp}/>
                  ):(
                    <DB t={sel.tipo_cadastro==='motorista'?'Motorista':'Pessoa Física'} items={[['Nome',sel.nome_completo],['CPF',sel.cpf],['RG',sel.rg],...(sel.tipo_cadastro==='motorista'?[['CNH',sel.cnh_categoria],['ANTT',sel.antt]]:[])] } cp={cp}/>
                  )}
                  <DB t="Contato" items={[['Responsável',sel.responsavel_nome],['Cargo',sel.responsavel_cargo],['Telefone',sel.telefone],['Celular',sel.celular],['E-mail',sel.email],['Website',sel.website]]} cp={cp}/>
                  <DB t="Endereço" items={[['CEP',sel.cep],['Logradouro',`${sel.logradouro||''}, ${sel.numero||''}`],['Complemento',sel.complemento],['Bairro',sel.bairro],['Cidade',sel.cidade],['Estado',sel.estado]]} cp={cp}/>
                  {sel.tipo_cadastro!=='motorista'&&<DB t="Banco" items={[['Banco',sel.banco],['Agência',sel.agencia],['Conta',`${sel.conta||''} (${sel.tipo_conta||''})`],['Titular',sel.titular_conta],['CPF/CNPJ Titular',sel.cpf_cnpj_titular],['PIX',sel.pix]]} cp={cp}/>}

                  {/* DOCS */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:'.72rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',letterSpacing:'.5px',color:S.dark,marginBottom:8,borderBottom:`2px solid ${S.green}`,paddingBottom:4,display:'inline-block'}}>Documentos</div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {[[sel.comprovante_cnpj_url,'CNPJ'],[sel.contrato_social_url,'Contrato Social'],[sel.comprovante_bancario_url,'Comp. Bancário'],[sel.documento_identidade_url,'Doc. Identidade']].filter(([u])=>u).map(([u,l],i)=>(
                        <a key={i} href={u} target="_blank" rel="noreferrer" style={{padding:'7px 12px',background:'#E3F2FD',borderRadius:6,color:'#1976D2',fontSize:'.72rem',fontWeight:700,textDecoration:'none',fontFamily:S.font,textTransform:'uppercase'}}>📎 {l}</a>
                      ))}
                    </div>
                  </div>

                  {/* OBS */}
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:'.72rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',letterSpacing:'.5px',color:S.dark,marginBottom:6}}>Observações</div>
                    <textarea ref={obsRef} defaultValue={sel.observacoes_internas||''} key={sel.id} placeholder="Anotações internas..." onBlur={()=>saveObs(sel.id)} style={{width:'100%',padding:'10px 12px',borderRadius:6,border:`1.5px solid ${S.border}`,fontSize:'.82rem',minHeight:60,resize:'vertical',outline:'none',fontFamily:S.fontB,background:'#FAFBF8'}}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ KANBAN PAGE ============ */}
      {page==='kanban'&&(
        <div style={{maxWidth:1500,margin:'0 auto',padding:'20px 20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
            <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'.78rem',fontWeight:800,fontFamily:S.font,textTransform:'uppercase',color:S.dark,marginRight:8}}>Visualizar:</span>
              <button onClick={()=>setKanView('todos')} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${kanView==='todos'?S.green:S.border}`,background:kanView==='todos'?'rgba(0,166,80,.06)':'transparent',color:kanView==='todos'?S.green:S.muted,fontFamily:S.font,fontSize:'.72rem',fontWeight:700,cursor:'pointer',textTransform:'uppercase'}}>Todos</button>
              {usuarios.map(u=>(
                <button key={u.id} onClick={()=>setKanView(u.nome)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${kanView===u.nome?S.green:S.border}`,background:kanView===u.nome?'rgba(0,166,80,.06)':'transparent',color:kanView===u.nome?S.green:S.muted,fontFamily:S.font,fontSize:'.72rem',fontWeight:600,cursor:'pointer'}}>{u.nome.split(' ')[0]}</button>
              ))}
            </div>
            <button onClick={()=>setShowNewTask(true)} style={{padding:'10px 20px',borderRadius:8,border:'none',background:S.green,color:'#fff',fontFamily:S.font,fontSize:'.78rem',fontWeight:800,cursor:'pointer',textTransform:'uppercase',letterSpacing:'.5px',boxShadow:'0 2px 8px rgba(0,166,80,.25)'}}>+ Nova Tarefa</button>
          </div>

          {/* NEW TASK MODAL */}
          {showNewTask&&(
            <div style={{background:S.card,borderRadius:12,padding:24,marginBottom:20,border:`1px solid ${S.border}`,boxShadow:'0 4px 16px rgba(0,0,0,.04)'}}>
              <div style={{fontSize:'.85rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',marginBottom:16}}>Nova Tarefa</div>
              <form onSubmit={addKanTask} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{gridColumn:'1/-1'}}><input placeholder="Título da tarefa *" value={newTask.titulo} onChange={e=>setNewTask({...newTask,titulo:e.target.value})} style={inputStyle}/></div>
                <div style={{gridColumn:'1/-1'}}><textarea placeholder="Descrição (opcional)" value={newTask.descricao} onChange={e=>setNewTask({...newTask,descricao:e.target.value})} style={{...inputStyle,minHeight:60,resize:'vertical'}}/></div>
                <select value={newTask.atribuido_para} onChange={e=>setNewTask({...newTask,atribuido_para:e.target.value})} style={inputStyle}>
                  <option value="">Atribuir para *</option>
                  {usuarios.map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
                </select>
                <select value={newTask.prioridade} onChange={e=>setNewTask({...newTask,prioridade:e.target.value})} style={inputStyle}>
                  <option value="urgente">🔴 Urgente</option><option value="alta">🟠 Alta</option><option value="media">🔵 Média</option><option value="baixa">⚪ Baixa</option>
                </select>
                <input type="date" value={newTask.prazo} onChange={e=>setNewTask({...newTask,prazo:e.target.value})} style={inputStyle}/>
                <select value={newTask.status} onChange={e=>setNewTask({...newTask,status:e.target.value})} style={inputStyle}>
                  {KAN_COLS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}
                </select>
                <div style={{gridColumn:'1/-1',display:'flex',gap:8}}>
                  <button type="submit" style={{padding:'10px 22px',borderRadius:6,border:'none',background:S.green,color:'#fff',fontFamily:S.font,fontSize:'.78rem',fontWeight:800,cursor:'pointer',textTransform:'uppercase'}}>Criar Tarefa</button>
                  <button type="button" onClick={()=>setShowNewTask(false)} style={{padding:'10px 22px',borderRadius:6,border:`1px solid ${S.border}`,background:'transparent',fontFamily:S.font,fontSize:'.78rem',fontWeight:600,cursor:'pointer',color:S.muted}}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* KANBAN BOARD */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,alignItems:'flex-start'}}>
            {KAN_COLS.map(col=>{
              const tasks=kanFiltered.filter(t=>t.status===col.k);
              return(
                <div key={col.k} style={{background:'rgba(0,0,0,.02)',borderRadius:10,padding:10,minHeight:300}}>
                  <div style={{fontSize:'.72rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',letterSpacing:'.5px',color:col.c,marginBottom:10,padding:'0 4px',display:'flex',justifyContent:'space-between'}}>
                    <span>{col.l}</span><span style={{background:col.c,color:'#fff',borderRadius:10,padding:'1px 8px',fontSize:'.65rem'}}>{tasks.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {tasks.map(t=>{const p=PRI[t.prioridade]||PRI.media;return(
                      <div key={t.id} style={{background:S.card,borderRadius:8,padding:'12px 12px',border:`1px solid ${S.border}`,boxShadow:'0 1px 3px rgba(0,0,0,.02)',cursor:'pointer'}} onClick={()=>setEditTask(t)}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:4}}>
                          <div style={{fontSize:'.8rem',fontWeight:700,fontFamily:S.font,lineHeight:1.3}}>{t.titulo}</div>
                          <span style={{padding:'2px 6px',borderRadius:4,fontSize:'.58rem',fontWeight:800,background:p.bg,color:p.c,fontFamily:S.font,flexShrink:0}}>{p.l}</span>
                        </div>
                        {t.descricao&&<div style={{fontSize:'.72rem',color:S.muted,marginTop:4,lineHeight:1.3}}>{t.descricao.substring(0,80)}{t.descricao.length>80?'...':''}</div>}
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:'.65rem',color:S.muted,marginTop:8}}>
                          <span>👤 {t.atribuido_para?.split(' ')[0]}</span>
                          {t.prazo&&<span>📅 {fmtDateShort(t.prazo)}</span>}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              );
            })}
          </div>

          {/* EDIT TASK MODAL */}
          {editTask&&(
            <div style={{position:'fixed',inset:0,background:'rgba(26,26,26,.7)',backdropFilter:'blur(3px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={e=>{if(e.target===e.currentTarget)setEditTask(null)}}>
              <div style={{background:S.card,borderRadius:12,padding:28,maxWidth:480,width:'92%',position:'relative',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
                <div style={{fontSize:'.85rem',fontWeight:900,fontFamily:S.font,textTransform:'uppercase',marginBottom:16}}>Editar Tarefa</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  <input defaultValue={editTask.titulo} id="et-titulo" style={inputStyle} placeholder="Título"/>
                  <textarea defaultValue={editTask.descricao} id="et-desc" style={{...inputStyle,minHeight:60}} placeholder="Descrição"/>
                  <select defaultValue={editTask.atribuido_para} id="et-assign" style={inputStyle}>
                    {usuarios.map(u=><option key={u.id} value={u.nome}>{u.nome}</option>)}
                  </select>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <select defaultValue={editTask.prioridade} id="et-pri" style={inputStyle}>
                      <option value="urgente">🔴 Urgente</option><option value="alta">🟠 Alta</option><option value="media">🔵 Média</option><option value="baixa">⚪ Baixa</option>
                    </select>
                    <select defaultValue={editTask.status} id="et-status" style={inputStyle}>
                      {KAN_COLS.map(c=><option key={c.k} value={c.k}>{c.l}</option>)}
                    </select>
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:6}}>
                    <button onClick={()=>{updateKanTask(editTask.id,{titulo:document.getElementById('et-titulo').value,descricao:document.getElementById('et-desc').value,atribuido_para:document.getElementById('et-assign').value,prioridade:document.getElementById('et-pri').value,status:document.getElementById('et-status').value})}} style={{flex:1,padding:'10px',borderRadius:6,border:'none',background:S.green,color:'#fff',fontFamily:S.font,fontWeight:800,fontSize:'.78rem',cursor:'pointer',textTransform:'uppercase'}}>Salvar</button>
                    <button onClick={()=>deleteKanTask(editTask.id)} style={{padding:'10px 16px',borderRadius:6,border:'none',background:'#FEE2E2',color:'#D93025',fontFamily:S.font,fontWeight:800,fontSize:'.78rem',cursor:'pointer'}}>🗑</button>
                    <button onClick={()=>setEditTask(null)} style={{padding:'10px 16px',borderRadius:6,border:`1px solid ${S.border}`,background:'transparent',fontFamily:S.font,fontWeight:600,fontSize:'.78rem',cursor:'pointer',color:S.muted}}>Fechar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DB({t,items,cp}){
  const v=items.filter(([,val])=>val&&String(val).trim()&&![',' ,'-','  ,'].includes(String(val).trim()));
  if(!v.length)return null;
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:'.72rem',fontWeight:900,fontFamily:'Montserrat,sans-serif',textTransform:'uppercase',letterSpacing:'.5px',color:'#1A1A1A',marginBottom:8,borderBottom:'2px solid #00A650',paddingBottom:4,display:'inline-block'}}>{t}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 12px'}}>
        {v.map(([l,val],i)=>(
          <div key={i} style={{padding:'5px 0',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #F0F2F7'}}>
            <div><div style={{fontSize:'.62rem',color:'#6B7265',fontWeight:700,fontFamily:'Montserrat,sans-serif',textTransform:'uppercase',letterSpacing:'.3px'}}>{l}</div><div style={{fontSize:'.84rem',fontWeight:500,wordBreak:'break-word'}}>{val}</div></div>
            <button onClick={e=>{e.stopPropagation();cp(String(val))}} title="Copiar" style={{background:'none',border:'none',cursor:'pointer',fontSize:'.65rem',color:'#6B7265',padding:'4px',flexShrink:0,opacity:.5,transition:'.15s'}}>📋</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function btnStyle(c,bg){return{padding:'7px 14px',borderRadius:6,border:`2px solid ${c}`,background:bg,color:c,fontFamily:'Montserrat,sans-serif',fontSize:'.72rem',fontWeight:800,cursor:'pointer',textTransform:'uppercase',letterSpacing:'.3px',transition:'.15s'}}

const inputStyle={padding:'10px 12px',border:'1.5px solid #D8DDD2',borderRadius:6,fontSize:'.85rem',outline:'none',fontFamily:'Open Sans,sans-serif',width:'100%',background:'#FAFBF8'};
