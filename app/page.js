'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const STATUS = {
  pendente:{label:'Pendente',color:'#E8842C',bg:'#FFF3E0',icon:'⏳'},
  em_analise:{label:'Em Análise',color:'#1976D2',bg:'#E3F2FD',icon:'🔍'},
  aprovado:{label:'Concluído',color:'#00A650',bg:'#E8F5E9',icon:'✓'},
  rejeitado:{label:'Devolvido',color:'#D93025',bg:'#FEE2E2',icon:'↩'},
};
const TIPO_LABEL = {pj:'PJ',pf:'PF',motorista:'Motorista'};

export default function Home(){
  const [user,setUser]=useState(null);
  const [login,setLogin]=useState({email:'',senha:''});
  const [loginErr,setLoginErr]=useState('');
  const [forn,setForn]=useState([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('pendentes');
  const [selected,setSel]=useState(null);
  const [search,setSearch]=useState('');
  const [saving,setSaving]=useState(false);
  const [showEmail,setShowEmail]=useState(false);
  const [emailMsg,setEmailMsg]=useState('');
  const [usuarios,setUsuarios]=useState([]);
  const obsRef=useRef(null);

  // LOGIN
  const doLogin=async(e)=>{
    e.preventDefault();
    const {data,error}=await supabase.from('usuarios_painel').select('*').eq('email',login.email).eq('senha_hash',login.senha).eq('ativo',true).single();
    if(error||!data){setLoginErr('E-mail ou senha inválidos');return}
    setUser(data);localStorage.setItem('premix_user',JSON.stringify(data));
  };

  useEffect(()=>{
    const saved=localStorage.getItem('premix_user');
    if(saved)try{setUser(JSON.parse(saved))}catch{}
  },[]);

  // FETCH DATA
  const fetchData=useCallback(async()=>{
    if(!user)return;
    setLoading(true);
    const {data}=await supabase.from('fornecedores').select('*').order('created_at',{ascending:false});
    if(data)setForn(data);
    const {data:u}=await supabase.from('usuarios_painel').select('*').eq('ativo',true);
    if(u)setUsuarios(u);
    setLoading(false);
  },[user]);

  useEffect(()=>{fetchData()},[fetchData]);

  // REALTIME
  useEffect(()=>{
    if(!user)return;
    const ch=supabase.channel('rt-forn').on('postgres_changes',{event:'*',schema:'public',table:'fornecedores'},()=>fetchData()).subscribe();
    return()=>{supabase.removeChannel(ch)};
  },[user,fetchData]);

  const updateStatus=async(id,s)=>{
    setSaving(true);
    const upd={status:s};
    if(s==='aprovado'){upd.finalizado_por=user.nome;upd.data_finalizacao=new Date().toISOString()}
    await supabase.from('fornecedores').update(upd).eq('id',id);
    if(selected?.id===id)setSel({...selected,...upd,status:s});
    await fetchData();setSaving(false);
  };

  const assignToMe=async(id)=>{
    setSaving(true);
    await supabase.from('fornecedores').update({atribuido_para:user.nome,status:'em_analise'}).eq('id',id);
    if(selected?.id===id)setSel({...selected,atribuido_para:user.nome,status:'em_analise'});
    await fetchData();setSaving(false);
  };

  const saveObs=async(id)=>{
    if(!obsRef.current)return;
    await supabase.from('fornecedores').update({observacoes_internas:obsRef.current.value}).eq('id',id);
  };

  const sendDevolutiva=async()=>{
    if(!selected||!emailMsg.trim())return;
    const email=selected.email;
    const subject=encodeURIComponent('Premix — Devolutiva sobre seu cadastro de fornecedor');
    const body=encodeURIComponent(emailMsg);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`,'_blank');
    await updateStatus(selected.id,'rejeitado');
    setShowEmail(false);setEmailMsg('');
  };

  const fmtDate=(d)=>{if(!d)return'-';return new Date(d).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})};
  const copyText=(t)=>{navigator.clipboard.writeText(t||'');};

  // FILTER
  const pendentes=forn.filter(f=>f.status==='pendente'||f.status==='em_analise');
  const concluidos=forn.filter(f=>f.status==='aprovado'||f.status==='rejeitado');
  const list=(tab==='pendentes'?pendentes:concluidos).filter(f=>{
    if(!search)return true;const s=search.toLowerCase();
    return(f.razao_social||'').toLowerCase().includes(s)||(f.cnpj||'').includes(s)||(f.nome_fantasia||'').toLowerCase().includes(s)||(f.email||'').toLowerCase().includes(s)||(f.nome_completo||'').toLowerCase().includes(s)||(f.cpf||'').includes(s);
  });

  // LOGIN SCREEN
  if(!user)return(
    <div style={{minHeight:'100vh',background:'#1A1A1A',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Montserrat,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:12,padding:'40px 36px',maxWidth:400,width:'90%',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:'linear-gradient(90deg,#00A650,#C8A951,#00A650)'}}/>
        <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:44,marginBottom:20}}/>
        <h2 style={{fontSize:'1rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Painel de Fornecedores</h2>
        <p style={{fontSize:'.78rem',color:'#6B7265',marginBottom:24}}>Núcleo Fiscal — Faça login para acessar</p>
        <form onSubmit={doLogin}>
          <input placeholder="E-mail" type="email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #D8DDD2',borderRadius:6,marginBottom:10,fontSize:'.88rem',outline:'none',fontFamily:'Open Sans'}}/>
          <input placeholder="Senha" type="password" value={login.senha} onChange={e=>setLogin({...login,senha:e.target.value})} style={{width:'100%',padding:'11px 14px',border:'1.5px solid #D8DDD2',borderRadius:6,marginBottom:10,fontSize:'.88rem',outline:'none',fontFamily:'Open Sans'}}/>
          {loginErr&&<p style={{color:'#D93025',fontSize:'.78rem',marginBottom:10}}>{loginErr}</p>}
          <button type="submit" style={{width:'100%',padding:'12px',background:'#00A650',color:'#fff',border:'none',borderRadius:6,fontFamily:'Montserrat',fontWeight:700,fontSize:'.85rem',cursor:'pointer',textTransform:'uppercase',letterSpacing:'.5px'}}>Entrar</button>
        </form>
      </div>
    </div>
  );

  // MAIN PANEL
  return(
    <div style={{minHeight:'100vh',background:'#F5F6F0',fontFamily:'Open Sans,sans-serif'}}>
      {/* HEADER */}
      <header style={{background:'#1A1A1A',padding:'0',position:'sticky',top:0,zIndex:100}}>
        <div style={{height:3,background:'linear-gradient(90deg,#00A650,#C8A951,#00A650)'}}/>
        <div style={{padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,maxWidth:1400,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <img src="https://premix.com.br/wp-content/uploads/2023/06/Logotipo_Premix_Positivo_Com-Bandeira.png" alt="Premix" style={{height:32,filter:'brightness(0) invert(1)'}}/>
            <div>
              <div style={{color:'#fff',fontSize:'.85rem',fontWeight:700,fontFamily:'Montserrat',letterSpacing:'.3px'}}>PAINEL DE FORNECEDORES</div>
              <div style={{color:'rgba(255,255,255,.45)',fontSize:'.7rem'}}>Núcleo Fiscal</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input placeholder="Buscar nome, CNPJ, email..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'8px 14px',borderRadius:6,border:'none',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:'.82rem',width:240,outline:'none',fontFamily:'Open Sans'}}/>
            <div style={{color:'rgba(255,255,255,.6)',fontSize:'.75rem',padding:'0 8px'}}>
              👤 {user.nome}
            </div>
            <button onClick={()=>{localStorage.removeItem('premix_user');setUser(null)}} style={{padding:'7px 14px',borderRadius:6,border:'1px solid rgba(255,255,255,.15)',background:'transparent',color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:'.72rem',fontFamily:'Montserrat',fontWeight:600}}>Sair</button>
          </div>
        </div>
      </header>

      <div style={{maxWidth:1400,margin:'0 auto',padding:'20px 20px'}}>
        {/* STATS ROW */}
        <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
          {[
            {n:pendentes.length,l:'Pendentes / Em análise',c:'#E8842C',bg:'#FFF3E0',icon:'⏳'},
            {n:concluidos.filter(f=>f.status==='aprovado').length,l:'Concluídos',c:'#00A650',bg:'#E8F5E9',icon:'✓'},
            {n:concluidos.filter(f=>f.status==='rejeitado').length,l:'Devolvidos',c:'#D93025',bg:'#FEE2E2',icon:'↩'},
            {n:forn.length,l:'Total',c:'#1A1A1A',bg:'#F0F2F7',icon:'📋'},
          ].map((s,i)=>(
            <div key={i} style={{flex:'1 1 140px',padding:'14px 16px',borderRadius:8,background:'#fff',border:'1px solid #D8DDD2',boxShadow:'0 1px 3px rgba(0,0,0,.03)'}}>
              <div style={{fontSize:'.7rem',color:'#6B7265',fontWeight:600,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.3px'}}>{s.icon} {s.l}</div>
              <div style={{fontSize:'1.6rem',fontWeight:800,color:s.c,fontFamily:'Montserrat',marginTop:2}}>{s.n}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{display:'flex',gap:4,marginBottom:16}}>
          {[{k:'pendentes',l:'📋 Tarefas Pendentes'},{k:'concluidos',l:'✓ Concluídos / Devolvidos'}].map(t=>(
            <button key={t.k} onClick={()=>{setTab(t.k);setSel(null)}} style={{
              padding:'10px 20px',borderRadius:'8px 8px 0 0',border:'1px solid #D8DDD2',borderBottom:tab===t.k?'2px solid #00A650':'1px solid #D8DDD2',
              background:tab===t.k?'#fff':'#F5F6F0',fontFamily:'Montserrat',fontSize:'.78rem',fontWeight:tab===t.k?700:500,
              color:tab===t.k?'#00A650':'#6B7265',cursor:'pointer',textTransform:'uppercase',letterSpacing:'.3px'
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
          {/* LIST */}
          <div style={{flex:'1 1 380px',minWidth:0}}>
            {loading?(
              <div style={{textAlign:'center',padding:60,color:'#6B7265',background:'#fff',borderRadius:8}}>Carregando...</div>
            ):list.length===0?(
              <div style={{textAlign:'center',padding:60,background:'#fff',borderRadius:8,color:'#6B7265',border:'1px solid #D8DDD2'}}>
                <div style={{fontSize:'2rem',marginBottom:8}}>📭</div>Nenhum cadastro encontrado
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {list.map(f=>{
                  const st=STATUS[f.status]||STATUS.pendente;
                  const isSel=selected?.id===f.id;
                  const tipoLabel=TIPO_LABEL[f.tipo_cadastro]||'PJ';
                  return(
                    <div key={f.id} onClick={()=>setSel(f)} style={{
                      background:'#fff',border:`2px solid ${isSel?'#00A650':'transparent'}`,borderRadius:8,padding:'14px 16px',
                      cursor:'pointer',transition:'.15s',boxShadow:isSel?'0 2px 12px rgba(0,166,80,.08)':'0 1px 2px rgba(0,0,0,.02)',
                    }}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'.88rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'Montserrat'}}>
                            {f.razao_social||f.nome_completo||'Sem nome'}
                          </div>
                          <div style={{fontSize:'.75rem',color:'#6B7265',marginTop:2}}>
                            {f.cnpj||f.cpf||'-'} • {f.email||'-'}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:4,flexShrink:0}}>
                          <span style={{padding:'3px 8px',borderRadius:4,fontSize:'.65rem',fontWeight:700,background:'#F0F2F7',color:'#1A1A1A',fontFamily:'Montserrat',textTransform:'uppercase'}}>{tipoLabel}</span>
                          <span style={{padding:'3px 8px',borderRadius:4,fontSize:'.65rem',fontWeight:700,background:st.bg,color:st.color,fontFamily:'Montserrat'}}>{st.icon} {st.label}</span>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'#6B7265',marginTop:6}}>
                        <span>{fmtDate(f.created_at)}</span>
                        {f.atribuido_para&&<span>👤 {f.atribuido_para}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL */}
          {selected&&(
            <div style={{flex:'0 0 500px',background:'#fff',borderRadius:8,border:'1px solid #D8DDD2',position:'sticky',top:70,maxHeight:'calc(100vh - 90px)',overflowY:'auto',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}>
              <div style={{padding:'18px 20px',borderBottom:'1px solid #D8DDD2',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'#fff',zIndex:5}}>
                <div>
                  <h2 style={{fontSize:'.95rem',fontWeight:800,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.3px'}}>
                    {selected.razao_social||selected.nome_completo}
                  </h2>
                  <span style={{fontSize:'.7rem',color:'#6B7265'}}>{TIPO_LABEL[selected.tipo_cadastro]||'PJ'} • {fmtDate(selected.created_at)}</span>
                </div>
                <button onClick={()=>setSel(null)} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#6B7265'}}>✕</button>
              </div>

              <div style={{padding:'16px 20px'}}>
                {/* ACTIONS */}
                <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
                  {!selected.atribuido_para&&selected.status==='pendente'&&(
                    <button disabled={saving} onClick={()=>assignToMe(selected.id)} style={{padding:'8px 14px',borderRadius:6,border:'none',background:'#00A650',color:'#fff',fontFamily:'Montserrat',fontSize:'.75rem',fontWeight:700,cursor:'pointer',textTransform:'uppercase'}}>
                      📌 Pegar para mim
                    </button>
                  )}
                  {(selected.status==='pendente'||selected.status==='em_analise')&&(
                    <>
                      <button disabled={saving} onClick={()=>updateStatus(selected.id,'aprovado')} style={{padding:'8px 14px',borderRadius:6,border:'2px solid #00A650',background:'#E8F5E9',color:'#00A650',fontFamily:'Montserrat',fontSize:'.75rem',fontWeight:700,cursor:'pointer',textTransform:'uppercase'}}>✓ Concluir</button>
                      <button disabled={saving} onClick={()=>setShowEmail(true)} style={{padding:'8px 14px',borderRadius:6,border:'2px solid #D93025',background:'#FEE2E2',color:'#D93025',fontFamily:'Montserrat',fontSize:'.75rem',fontWeight:700,cursor:'pointer',textTransform:'uppercase'}}>↩ Devolver</button>
                    </>
                  )}
                </div>

                {selected.atribuido_para&&(
                  <div style={{padding:'8px 12px',background:'#E3F2FD',borderRadius:6,fontSize:'.78rem',marginBottom:14,color:'#1976D2',fontWeight:500}}>
                    👤 Responsável: <strong>{selected.atribuido_para}</strong>
                    {selected.finalizado_por&&<span> • Finalizado por: <strong>{selected.finalizado_por}</strong></span>}
                  </div>
                )}

                {/* DEVOLUTIVA EMAIL MODAL */}
                {showEmail&&(
                  <div style={{padding:16,background:'#FEE2E2',borderRadius:8,marginBottom:14,border:'1px solid #EF9A9A'}}>
                    <div style={{fontSize:'.8rem',fontWeight:700,color:'#B71C1C',marginBottom:8,fontFamily:'Montserrat'}}>DEVOLUTIVA POR E-MAIL</div>
                    <div style={{fontSize:'.75rem',color:'#6B7265',marginBottom:8}}>Para: <strong>{selected.email}</strong></div>
                    <textarea value={emailMsg} onChange={e=>setEmailMsg(e.target.value)} placeholder="Descreva o que precisa ser corrigido..." style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1.5px solid #EF9A9A',fontSize:'.85rem',minHeight:80,resize:'vertical',outline:'none',fontFamily:'Open Sans'}}/>
                    <div style={{display:'flex',gap:8,marginTop:8}}>
                      <button onClick={sendDevolutiva} style={{padding:'8px 16px',borderRadius:6,border:'none',background:'#D93025',color:'#fff',fontFamily:'Montserrat',fontSize:'.75rem',fontWeight:700,cursor:'pointer'}}>Enviar e Devolver</button>
                      <button onClick={()=>{setShowEmail(false);setEmailMsg('')}} style={{padding:'8px 16px',borderRadius:6,border:'1px solid #D8DDD2',background:'#fff',fontFamily:'Montserrat',fontSize:'.75rem',fontWeight:600,cursor:'pointer',color:'#6B7265'}}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* DATA SECTIONS */}
                {selected.tipo_cadastro==='pj'||!selected.tipo_cadastro?(
                  <DataBlock title="EMPRESA" items={[
                    ['Razão Social',selected.razao_social],['Nome Fantasia',selected.nome_fantasia],
                    ['CNPJ',selected.cnpj],['IE',selected.inscricao_estadual_isento?'ISENTO':selected.inscricao_estadual],
                    ['Ramo',selected.ramo_atividade],['Produtos/Serviços',selected.produtos_servicos],
                  ]} onCopy={copyText}/>
                ):(
                  <DataBlock title={selected.tipo_cadastro==='motorista'?'MOTORISTA':'PESSOA FÍSICA'} items={[
                    ['Nome',selected.nome_completo],['CPF',selected.cpf],['RG',selected.rg],
                    ...(selected.tipo_cadastro==='motorista'?[['CNH',selected.cnh_categoria],['ANTT',selected.antt]]:[]),
                  ]} onCopy={copyText}/>
                )}

                <DataBlock title="CONTATO" items={[
                  ['Responsável',selected.responsavel_nome],['Cargo',selected.responsavel_cargo],
                  ['Telefone',selected.telefone],['Celular',selected.celular],
                  ['E-mail',selected.email],['Website',selected.website],
                ]} onCopy={copyText}/>

                <DataBlock title="ENDEREÇO" items={[
                  ['CEP',selected.cep],['Logradouro',`${selected.logradouro||''}, ${selected.numero||''}`],
                  ['Complemento',selected.complemento],['Bairro',selected.bairro],
                  ['Cidade',selected.cidade],['Estado',selected.estado],
                ]} onCopy={copyText}/>

                {selected.tipo_cadastro!=='motorista'&&(
                  <DataBlock title="DADOS BANCÁRIOS" items={[
                    ['Banco',selected.banco],['Agência',selected.agencia],
                    ['Conta',`${selected.conta||''} (${selected.tipo_conta||'corrente'})`],
                    ['Titular',selected.titular_conta],['CPF/CNPJ Titular',selected.cpf_cnpj_titular],
                    ['PIX',selected.pix],
                  ]} onCopy={copyText}/>
                )}

                {/* DOCS */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:'.75rem',fontWeight:800,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.5px',color:'#1A1A1A',marginBottom:8,borderBottom:'2px solid #00A650',paddingBottom:4,display:'inline-block'}}>DOCUMENTOS</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[
                      [selected.comprovante_cnpj_url,'Cartão CNPJ'],[selected.contrato_social_url,'Contrato Social'],
                      [selected.comprovante_bancario_url,'Comp. Bancário'],[selected.documento_identidade_url,'Doc. Identidade'],
                    ].filter(([url])=>url).map(([url,label],i)=>(
                      <a key={i} href={url} target="_blank" rel="noreferrer" style={{padding:'7px 12px',background:'#E3F2FD',borderRadius:6,color:'#1976D2',fontSize:'.75rem',fontWeight:600,textDecoration:'none',fontFamily:'Montserrat'}}>📎 {label}</a>
                    ))}
                  </div>
                </div>

                {/* OBS */}
                <div>
                  <div style={{fontSize:'.75rem',fontWeight:800,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.5px',color:'#1A1A1A',marginBottom:6}}>OBSERVAÇÕES INTERNAS</div>
                  <textarea ref={obsRef} defaultValue={selected.observacoes_internas||''} key={selected.id} placeholder="Anotações da equipe..." onBlur={()=>saveObs(selected.id)} style={{width:'100%',padding:'10px 12px',borderRadius:6,border:'1.5px solid #D8DDD2',fontSize:'.82rem',minHeight:70,resize:'vertical',outline:'none',fontFamily:'Open Sans',background:'#FAFBF8'}}/>
                </div>

                {selected.finalizado_por&&(
                  <div style={{fontSize:'.72rem',color:'#6B7265',marginTop:12,padding:'8px 12px',background:'#F5F6F0',borderRadius:6}}>
                    Finalizado por: <strong>{selected.finalizado_por}</strong> em {fmtDate(selected.data_finalizacao)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DataBlock({title,items,onCopy}){
  const valid=items.filter(([,v])=>v&&String(v).trim()&&String(v).trim()!==','&&String(v).trim()!=='-');
  if(!valid.length)return null;
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:'.75rem',fontWeight:800,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.5px',color:'#1A1A1A',marginBottom:8,borderBottom:'2px solid #00A650',paddingBottom:4,display:'inline-block'}}>{title}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 14px'}}>
        {valid.map(([label,value],i)=>(
          <div key={i} style={{padding:'5px 0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:'.65rem',color:'#6B7265',fontWeight:600,fontFamily:'Montserrat',textTransform:'uppercase',letterSpacing:'.3px'}}>{label}</div>
              <div style={{fontSize:'.84rem',fontWeight:500,wordBreak:'break-word'}}>{value}</div>
            </div>
            <button onClick={(e)=>{e.stopPropagation();onCopy(String(value))}} title="Copiar" style={{background:'none',border:'none',cursor:'pointer',fontSize:'.7rem',color:'#6B7265',padding:'4px',flexShrink:0,opacity:.6}}>📋</button>
          </div>
        ))}
      </div>
    </div>
  );
}
