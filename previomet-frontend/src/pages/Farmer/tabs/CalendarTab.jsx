// src/pages/Farmer/tabs/CalendarTab.jsx
import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { AuthContext }    from '../../../context/AuthContext';
import { getProfile, getWeatherPredict, getRecommendations } from '../../../api/farmer';

const MOIS_FR      = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS_COURTS = ['L','M','M','J','V','S','D'];

const HORIZON_TO_OFFSET = {
  'Actuellement':0,'H+3':0,'H+6':0,'H+12':0,'H+24':1,
  'J+2':1,'J+3':2,'J+4':3,'J+5':4,
};

const normalizeForecast = (raw, today) => {
  const fb = { humidite: raw.horaire_h24?.humidite ?? null, vent: raw.horaire_h24?.vent ?? null };
  const rows = [];
  if (raw.horaire_h24) rows.push({ date: today.toISOString().slice(0,10), ...raw.horaire_h24 });
  (raw.jours ?? []).forEach(j => {
    const off = parseInt(j.horizon?.replace('J','') ?? '0', 10);
    if (!off) return;
    const d = new Date(today); d.setDate(today.getDate() + off - 1);
    rows.push({ date: d.toISOString().slice(0,10), temperature: j.temperature ?? null,
      humidite: j.humidite ?? fb.humidite, precipitation: j.precipitation ?? null, vent: j.vent ?? fb.vent });
  });
  return rows;
};

const classifyMeteo = f => {
  const p=f.precipitation??0, t=f.temperature??25, v=f.vent??0;
  if (p>20||v>40||t>38) return 'risque';
  if (p>8 ||v>25||t>34) return 'attention';
  if (p<3 &&t>=18&&t<=32&&v<20) return 'propice';
  return 'neutre';
};

const classifyFromRecos = recos => {
  if (!recos?.length) return 'neutre';
  const t = recos.map(r=>r.type);
  if (t.includes('danger'))  return 'risque';
  if (t.includes('warning')) return 'attention';
  if (t.includes('success')) return 'propice';
  return 'neutre';
};

const getSemisCultures = (f, cultures, semisData) =>
  cultures.filter(c => semisData?.[c]?.semis_defini);

const groupConsecutive = days => {
  if (!days.length) return [];
  const s = [...days].sort((a,b)=>a-b);
  const r = [[s[0]]];
  for (let i=1;i<s.length;i++) s[i]===s[i-1]+1 ? r[r.length-1].push(s[i]) : r.push([s[i]]);
  return r.map(g => g.length===1 ? `${g[0]}` : `${g[0]}–${g[g.length-1]}`);
};

const TYPE_STYLES = {
  propice:   { bg:'#e8f5ec', color:'#1a7a3a', border:'#b7dfc4' },
  semis:     { bg:'#e8f0fe', color:'#1a56c4', border:'#a8c4f5' },
  risque:    { bg:'#fdecea', color:'#c0392b', border:'#f5b7b1' },
  attention: { bg:'#fff8e1', color:'#b07d00', border:'#ffe082' },
  neutre:    { bg:'#f0f4f8', color:'#5a7a9a', border:'transparent' },
};
const TYPE_LABELS = {
  propice:'🟢 Propice', semis:'🔵 Semis idéal',
  risque:'🔴 Risqué',   attention:'🟡 Vigilance', neutre:'⬜ Neutre',
};

export default function CalendarTab({ accentColor='#1a7a3a', accentLight='#e8f5ec' }) {
  const { user }     = useContext(AuthContext);
  const todayRef     = useRef(new Date());
  const today        = todayRef.current;
  const currentMonth = today.getMonth();
  const currentYear  = today.getFullYear();
  const currentDay   = today.getDate();

  const [profile,      setProfile]      = useState(null);
  const [forecast,     setForecast]     = useState([]);
  const [dayRecos,     setDayRecos]     = useState(null);
  const [loadingFc,    setLoadingFc]    = useState(true);
  const [loadingRecos, setLoadingRecos] = useState(false);
  const [error,        setError]        = useState(null);
  const [tooltip,      setTooltip]      = useState(null);
  const [semisData,    setSemisData]    = useState(null);

  useEffect(() => {
    getProfile().then(r => setProfile(r?.data ?? r)).catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    getRecommendations('semis')
      .then(r => { const raw=r?.data??r; setSemisData(raw?.cultures_semis??null); })
      .catch(() => setSemisData(null));
  }, []); // eslint-disable-line

  useEffect(() => {
    let off = false;
    setLoadingFc(true); setError(null);
    getWeatherPredict()
      .then(r => { if (!off) setForecast(normalizeForecast(r?.data ?? r, today)); })
      .catch(e => { if (!off) setError(e?.response?.data?.detail ?? 'Erreur prévisions'); })
      .finally(() => { if (!off) setLoadingFc(false); });
    return () => { off = true; };
  }, []); // eslint-disable-line

  const cultures    = useMemo(() => { const s=profile?.specificites??[],c=profile?.categories??[]; return s.length?s:c; }, [profile]);
  const culturesKey = useMemo(() => [...cultures].sort().join('|'), [cultures]);

  useEffect(() => {
    if (loadingFc || !forecast.length || !cultures.length) return;
    let off = false;
    setLoadingRecos(true);
    getRecommendations()
      .then(r => {
        if (off) return;
        const raw      = r?.data ?? r;
        const allRecos = raw?.recommendations ?? [];
        const byDate   = Object.fromEntries(forecast.map(f => [f.date, []]));
        allRecos.forEach(reco => {
          const off2 = HORIZON_TO_OFFSET[reco.horizon];
          if (off2 === undefined) return;
          const d = new Date(today); d.setDate(today.getDate() + off2);
          const k = d.toISOString().slice(0,10);
          if (byDate[k]) byDate[k].push(reco);
        });
        setDayRecos(byDate);
      })
      .catch(() => { if (!off) setDayRecos(null); })
      .finally(() => { if (!off) setLoadingRecos(false); });
    return () => { off = true; };
  }, [loadingFc, forecast, culturesKey]); // eslint-disable-line

  const dayMap = useMemo(() => {
    const map = {};
    forecast.forEach(f => {
      const d = new Date(f.date+'T00:00:00');
      if (d.getMonth()!==currentMonth||d.getFullYear()!==currentYear) return;
      const day       = d.getDate();
      const useBack   = dayRecos!==null && dayRecos[f.date]!==undefined;
      const recos     = dayRecos?.[f.date] ?? [];
      const meteoType = classifyMeteo(f);
      const recoType  = useBack ? classifyFromRecos(recos) : meteoType;
      const semisCultures = (recoType==='propice'||recoType==='neutre') ? getSemisCultures(f, cultures, semisData) : [];
      map[day] = {
        type: semisCultures.length ? 'semis' : recoType,
        source: useBack ? 'par cultures' : 'météo brute',
        recos, temperature:f.temperature, precip:f.precipitation, vent:f.vent,
        semisCultures,
      };
    });
    return map;
  }, [forecast, dayRecos, currentMonth, currentYear, cultures, semisData]);

  const adviceItems = useMemo(() => {
    const propice=[],semis=[],risque=[],attention=[];
    const conseilsMap = new Map();
    const mois = MOIS_FR[currentMonth];

    Object.entries(dayMap).forEach(([ds, info]) => {
      const d = parseInt(ds,10);
      if (info.type==='propice')   propice.push(d);
      if (info.type==='semis')     semis.push({ day:d, cultures:info.semisCultures??[] });
      if (info.type==='risque')    risque.push(d);
      if (info.type==='attention') attention.push(d);
      info.recos?.forEach(r => { if (!conseilsMap.has(r.titre)) conseilsMap.set(r.titre,r); });
    });

    const items = [];
    const semisGroups = new Map();
    semis.forEach(({day, cultures: sc}) => {
      const k = sc.slice().sort().join('|');
      if (!semisGroups.has(k)) semisGroups.set(k, { cultures:sc, days:[] });
      semisGroups.get(k).days.push(day);
    });
    semisGroups.forEach(({ cultures: sc, days }) => {
      groupConsecutive(days).forEach(r =>
        items.push({ type:'semis', icon:'🔵', text:`Semis idéaux : ${r} ${mois} — ${sc.join(', ')}` }));
    });
    groupConsecutive(propice).forEach(r =>
      items.push({ type:'ok',   icon:'🟢', text:`Période favorable : ${r} ${mois}` }));
    groupConsecutive(risque).forEach(r =>
      items.push({ type:'warn', icon:'🔴', text:`Période risquée : ${r} ${mois} — évitez les travaux exposés` }));
    groupConsecutive(attention).forEach(r =>
      items.push({ type:'warn', icon:'🟡', text:`Vigilance : ${r} ${mois} — surveillez l'évolution` }));

    let n=0;
    conseilsMap.forEach(c => {
      if (n++>=5) return;
      items.push({ type:c.type==='success'?'ok':'warn', icon:c.type==='success'?'✅':'⚠️', text:`${c.titre} — ${c.detail}` });
    });

    if (!items.length) items.push(
      cultures.length===0
        ? { type:'info', icon:'ℹ️', text:'Ajoutez vos cultures dans Mon profil pour des conseils personnalisés.' }
        : { type:'ok',  icon:'✅', text:'Conditions globalement favorables sur la période prévue.' }
    );
    return items;
  }, [dayMap, currentMonth, cultures]);

  const daysInMonth  = new Date(currentYear, currentMonth+1, 0).getDate();
  const firstWeekDay = ((new Date(currentYear,currentMonth,1).getDay())+6)%7;

  const sp = { width:32,height:32,borderRadius:'50%',border:'3px solid rgba(14,76,122,.10)',borderTop:`3px solid ${accentColor}`,animation:'spin .75s linear infinite',flexShrink:0 };

  // ↓ textes des conseils : var(--pm-text) / var(--pm-muted) → vert foncé chez l'agriculteur
  const advStyle = t => ({
    padding:'10px 14px', borderRadius:10, fontSize:13, lineHeight:1.6, fontWeight:500,
    display:'flex', alignItems:'flex-start', gap:9,
    background: t==='ok'?'rgba(26,122,58,.07)':t==='semis'?'rgba(26,86,196,.07)':t==='warn'?'rgba(176,125,0,.08)':'rgba(14,76,122,.05)',
    color:      t==='ok'?'#1a6a35':t==='semis'?'#1a3a8a':t==='warn'?'#8a5500':'var(--pm-text,#0a4a7a)',
    borderLeft:`4px solid ${t==='ok'?'#1a7a3a':t==='semis'?'#1a56c4':t==='warn'?'#c08000':accentColor}`,
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
        .cal-day:hover  { transform:scale(1.09)!important; box-shadow:0 4px 14px rgba(0,0,0,.10)!important; }
        .adv-anim       { animation:fadeUp .28s ease both; }
        .cal-col        { animation:popIn .22s ease both; }
        .cal-tt {
          position:fixed; background:#0D3D2B; color:#fff; padding:6px 13px;
          border-radius:9px; font-size:12px; font-family:'DM Sans',sans-serif;
          font-weight:600; pointer-events:none; z-index:9999;
          white-space:nowrap; box-shadow:0 4px 16px rgba(0,0,0,.22); transform:translateY(-110%);
        }
      `}</style>

      {tooltip && (
        <div className="cal-tt" style={{ left:tooltip.x, top:tooltip.y }}>
          {TYPE_LABELS[tooltip.type]??'⬜'}
          {tooltip.temperature!=null?` · ${Math.round(tooltip.temperature)}°C`:''}
          {tooltip.precip!=null?` · ${Math.round(tooltip.precip)}mm`:''}
          {tooltip.vent!=null?` · ${Math.round(tooltip.vent)}km/h`:''}
          {tooltip.semisCultures?.length ? ` 🌱 Semis : ${tooltip.semisCultures.join(', ')}` : ''}
          <span style={{opacity:.6,fontWeight:400,marginLeft:5}}>({tooltip.source})</span>
        </div>
      )}

      <div style={{ padding:'28px 20px',minHeight:'100%',background:'var(--pm-bg,#f0f4f8)',fontFamily:'"DM Sans",system-ui,sans-serif',boxSizing:'border-box' }}>
        <div style={{ background:'var(--pm-card,#fff)',borderRadius:20,boxShadow:'0 4px 28px rgba(10,26,74,.09)',padding:'28px 28px 24px',maxWidth:780,margin:'0 auto' }}>

          {/* Header — titre du mois en var(--pm-text) */}
          <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22,flexWrap:'wrap',gap:12 }}>
            <div>
              <div style={{ fontSize:20,fontWeight:800,color:'var(--pm-text,#0a1a4a)',letterSpacing:'-0.3px' }}>
                {MOIS_FR[currentMonth]} {currentYear}{user?.ville?` — ${user.ville}`:''}
              </div>
              <div style={{ fontSize:12.5,color:'var(--pm-muted,#5a7a9a)',marginTop:5 }}>
                {cultures.length>0 ? `🌱 ${cultures.join(' · ')}` : '📅 Vue météo — ajoutez vos cultures dans Mon profil'}
              </div>
            </div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
              {[['#2a8a3a','Propice'],['#1a56c4','Semis idéal'],['#e74c3c','Risqué'],['#c08000','Vigilance'],['#94a3b8','Neutre']].map(([dot,label])=>(
                <div key={label} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11.5,fontWeight:700,color:'var(--pm-muted,#5a7a9a)',background:'#f5f7fa',borderRadius:20,padding:'4px 9px' }}>
                  <div style={{ width:9,height:9,borderRadius:'50%',background:dot,flexShrink:0 }}/>{label}
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ background:'rgba(220,53,69,.07)',border:'1.5px solid rgba(220,53,69,.22)',borderRadius:10,padding:'12px 16px',color:'#c0392b',fontSize:13,marginBottom:16,fontWeight:600 }}>⚠️ {error}</div>}

          {loadingFc && !error && (
            <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'56px 0' }}>
              <div style={sp}/><div style={{ fontSize:13,color:'var(--pm-muted,#5a7a9a)' }}>Chargement des prévisions…</div>
            </div>
          )}

          {!loadingFc && !error && (<>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,marginBottom:14 }}>
              {/* Jours de la semaine — var(--pm-muted) */}
              {JOURS_COURTS.map((j,i)=>(
                <div key={i} style={{ textAlign:'center',fontSize:11,fontWeight:800,color:'var(--pm-muted,#5a7a9a)',padding:'0 0 8px',letterSpacing:'.05em' }}>{j}</div>
              ))}
              {Array.from({length:firstWeekDay}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
                const info  = dayMap[day];
                const cs    = TYPE_STYLES[info?.type??'neutre'];
                const isToday = day===currentDay;
                const isPast  = day<currentDay && !info;
                return (
                  <div key={day} className={`cal-day${info?' cal-col':''}`}
                    style={{ borderRadius:10,padding:'10px 4px 8px',textAlign:'center',fontSize:13,
                      fontWeight:isToday?900:600,cursor:'default',transition:'transform .14s ease,box-shadow .14s ease',
                      position:'relative',userSelect:'none',boxSizing:'border-box',lineHeight:1,
                      background: isPast?'transparent':cs.bg,
                      color:      isPast?'rgba(90,122,154,.30)':cs.color,
                      border:     `1.5px solid ${isPast?'transparent':cs.border}`,
                      outline:    isToday?`2.5px solid ${accentColor}`:'none',outlineOffset:'2px',
                      animationDelay:`${(day-1)*.018}s`,
                    }}
                    onMouseEnter={e=>{ if(!info)return; const r=e.currentTarget.getBoundingClientRect(); setTooltip({...info,x:r.left+r.width/2,y:r.top}); }}
                    onMouseLeave={()=>setTooltip(null)}
                  >
                    {day}
                    {isToday && <div style={{ position:'absolute',bottom:4,left:'50%',transform:'translateX(-50%)',width:5,height:5,borderRadius:'50%',background:accentColor }}/>}
                    {info?.semisCultures?.length>0 && <div style={{ position:'absolute',top:3,right:3,width:5,height:5,borderRadius:'50%',background:'#1a56c4' }}/>}
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize:11.5,color:'var(--pm-muted,#5a7a9a)',marginBottom:14,display:'flex',alignItems:'center',gap:8,minHeight:22 }}>
              {loadingRecos
                ? <><div style={{...sp,width:14,height:14,borderWidth:2}}/><span>Analyse par culture en cours…</span></>
                : <span>{cultures.length>0?`✓ Analyse personnalisée · ${Object.keys(dayMap).length} jour(s) prévu(s)`:`ℹ️ ${Object.keys(dayMap).length} jour(s) coloré(s) selon météo brute`}</span>
              }
            </div>

            {/* Conseils */}
            <div style={{ borderTop:'1.5px solid rgba(14,76,122,.08)',paddingTop:20,marginTop:4 }}>
              {/* Titre "Conseils du mois" → var(--pm-text) */}
              <div style={{ fontSize:14,fontWeight:800,color:'var(--pm-text,#0a1a4a)',marginBottom:12,letterSpacing:'-0.2px' }}>💡 Conseils du mois</div>
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {adviceItems.map((item,i)=>(
                  <div key={i} className="adv-anim" style={{ ...advStyle(item.type),animationDelay:`${i*.055}s` }}>
                    <span style={{ fontSize:15,flexShrink:0 }}>{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              {cultures.length>0 && (
                <div style={{ background:accentLight,borderRadius:10,padding:'10px 14px',fontSize:12,color:accentColor,fontWeight:600,marginTop:14,display:'flex',alignItems:'center',gap:8,border:`1px solid ${accentColor}22` }}>
                  🌱 Basé sur : {cultures.join(', ')} · Mis à jour à chaque ouverture
                </div>
              )}
            </div>
          </>)}
        </div>
      </div>
    </>
  );
}