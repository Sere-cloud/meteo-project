// src/pages/Shared/tabs/WeatherTab.jsx
import { useState, useEffect, useContext } from 'react';
import { AuthContext }                      from '../../../context/AuthContext';
import { getWeatherCurrent, getWeatherPredict } from '../../../api/farmer';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

const DAYS_FR    = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS_FR  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

const VILLES_OPTIONS = [
  { key:'douala',     label:'Douala'     }, { key:'yaounde',    label:'Yaoundé'    },
  { key:'bafoussam',  label:'Bafoussam'  }, { key:'garoua',     label:'Garoua'     },
  { key:'bamenda',    label:'Bamenda'    }, { key:'ngaoundere', label:'Ngaoundéré' },
  { key:'bertoua',    label:'Bertoua'    }, { key:'ebolowa',    label:'Ebolowa'    },
  { key:'buea',       label:'Buea'       }, { key:'maroua',     label:'Maroua'     },
];

function getWeatherIcon(temp, precipitation) {
  if (precipitation > 20) return '⛈️';
  if (precipitation > 5)  return '🌧️';
  if (temp > 35)          return '☀️';
  if (temp > 28)          return '🌤️';
  return '⛅';
}

function DayTickX({ x, y, payload }) {
  const parts = (payload.value || '').split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#5a7a9a" fontFamily="DM Sans">{parts[0]}</text>
      {parts[1] === '1' && (
        <text x={0} y={0} dy={24} textAnchor="middle" fontSize={9} fill="#e65100" fontWeight={700} fontFamily="DM Sans">+1j</text>
      )}
    </g>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid rgba(14,76,122,0.12)', borderRadius:10,
      padding:'10px 14px', boxShadow:'0 4px 16px rgba(10,26,74,0.12)', fontSize:13, fontFamily:'DM Sans,sans-serif' }}>
      <div style={{ fontWeight:700, color:'var(--pm-text,#0a1a4a)', marginBottom:4 }}>{(label||'').split('|')[0]}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color, fontWeight:600 }}>
          {p.name} : {p.value != null ? `${p.value}°C` : '—'}
        </div>
      ))}
    </div>
  );
}

export default function WeatherTab({ heroImage, accentColor='#0e7c8a', accentLight, isAdmin=false, showComparison=false }) {
  const { user } = useContext(AuthContext);

  const [current,      setCurrent]      = useState(null);
  const [predict,      setPredict]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [now,          setNow]          = useState(new Date());
  const [selectedCity, setSelectedCity] = useState(user?.ville_reference || 'yaounde');
  const [hoveredCard,  setHoveredCard]  = useState(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true); setError(null);
      try {
        const city = isAdmin ? selectedCity : (user?.ville_reference || user?.ville || 'yaounde');
        const [cur, pred] = await Promise.all([getWeatherCurrent(city), getWeatherPredict(city)]);
        if (!cancelled) { setCurrent(cur.data); setPredict(pred.data); }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Erreur de chargement météo');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    const refresh = setInterval(fetchAll, 10 * 60 * 1000);
    return () => { cancelled = true; clearInterval(refresh); };
  }, [selectedCity]);

  const villeAffichee = isAdmin
    ? (VILLES_OPTIONS.find(v => v.key === selectedCity)?.label ?? 'Yaoundé')
    : (user?.ville ?? '—');

  const dateStr = `${DAYS_FR[now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;

  const temp  = current?.temperature   ?? '—';
  const vent  = current?.vent          ?? '—';
  const pluie = current?.precipitation ?? '—';
  const hum   = current?.humidite      ?? '—';

  const dayChartData = (() => {
    const h = now.getHours();
    const h3 = h+3, h6 = h3+6, h12 = h6+12;
    const omMap = {};
    if (showComparison && predict?.horaire_openmeteo)
      predict.horaire_openmeteo.forEach(p => { omMap[p.horizon] = p.temperature; });
    return [
      { label:`${String(h%24).padStart(2,'0')}h00|0`,   Système: current?.temperature ?? null, OpenMeteo: showComparison ? current?.temperature ?? null : undefined },
      { label:`${String(h3%24).padStart(2,'0')}h00|${h3>=24?'1':'0'}`,  Système: predict?.horaire?.find(p=>p.horizon==='H3')?.temperature  ?? null, OpenMeteo: showComparison ? omMap['H3']  ?? null : undefined },
      { label:`${String(h6%24).padStart(2,'0')}h00|${h6>=24?'1':'0'}`,  Système: predict?.horaire?.find(p=>p.horizon==='H6')?.temperature  ?? null, OpenMeteo: showComparison ? omMap['H6']  ?? null : undefined },
      { label:`${String(h12%24).padStart(2,'0')}h00|${h12>=24?'1':'0'}`,Système: predict?.horaire?.find(p=>p.horizon==='H12')?.temperature ?? null, OpenMeteo: showComparison ? omMap['H12'] ?? null : undefined },
    ];
  })();

  const allTemps = dayChartData.flatMap(d => [d.Système, d['OpenMeteo']]).filter(v => v != null);
  const yMin = allTemps.length ? Math.floor(Math.min(...allTemps)) - 2 : 15;
  const yMax = allTemps.length ? Math.ceil(Math.max(...allTemps))  + 2 : 40;

  const futureCards = (() => {
    if (!predict) return [];
    const h12abs   = now.getHours() + 3 + 6 + 12;
    const offBase  = h12abs >= 24 ? 2 : 1;
    const d0 = new Date(now); d0.setDate(d0.getDate() + 1);
    const jours = [{
      label: `${DAYS_SHORT[d0.getDay()]} ${d0.getDate()}`,
      icon:  getWeatherIcon(predict.horaire_h24?.temperature ?? 28, predict.horaire_h24?.precipitation ?? 0),
      temp:  predict.horaire_h24?.temperature ?? null,
      pluie: predict.horaire_h24?.precipitation ?? null,
    }];
    (predict.jours ?? []).forEach(pt => {
      const delta = parseInt(pt.horizon.replace('J',''), 10);
      const d = new Date(now); d.setDate(d.getDate() + offBase + (delta - 2) + 1);
      jours.push({
        label: `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`,
        icon:  getWeatherIcon(pt.temperature ?? 28, pt.precipitation ?? 0),
        temp:  pt.temperature ?? null,
        pluie: pt.precipitation ?? null,
      });
    });
    return jours;
  })();

  // ── Styles ────────────────────────────────────────────────────────────────
  // Toutes les couleurs de texte passent par var(--pm-text) / var(--pm-muted)
  // injectées par DashboardLayout → pas besoin de prop supplémentaire ici
  const border  = 'var(--pm-border, rgba(14,76,122,0.12))';
  const cardBg  = 'var(--pm-card,#ffffff)';
  const textPri = 'var(--pm-text,#0a1a4a)';
  const textMut = 'var(--pm-muted,#5a7a9a)';
  const surface = 'var(--pm-surface,#f8fafc)';

  const S = {
    root:    { display:'flex', flexDirection:'column', flex:1, minHeight:0, fontFamily:'DM Sans,sans-serif', padding:'0 12px' },
    hero:    { position:'relative', height:200, flexShrink:0, overflow:'hidden', borderRadius:16, marginTop:12,
               background: heroImage ? `url(${heroImage}) center/cover no-repeat` : 'linear-gradient(135deg,#0a2a5a,#0e5a7a)' },
    heroContent: { position:'relative', zIndex:2, padding:'22px 28px', height:'100%', display:'flex', flexDirection:'column', justifyContent:'center' },
    heroDate: { fontSize:26, fontWeight:800, color:'white', lineHeight:1.1, marginBottom:4, fontFamily:'DM Sans,sans-serif' },
    heroTime: { fontSize:16, fontWeight:600, color:'rgba(255,255,255,.85)', marginBottom:5 },
    heroCity: { fontSize:14, fontWeight:500, color:'rgba(255,255,255,.75)', display:'flex', alignItems:'center', gap:5 },
    body:     { display:'grid', gridTemplateColumns:'280px 1fr', gap:16, padding:'16px 0 20px', alignItems:'stretch', flex:1 },
    statCol:  { display:'flex', flexDirection:'column', gap:10 },
    statCard: { background:cardBg, borderRadius:14, border:`1px solid ${border}`, padding:'0 18px',
                display:'flex', alignItems:'center', gap:14, boxShadow:'0 2px 8px rgba(10,26,74,0.07)',
                transition:'transform .2s,box-shadow .2s', cursor:'default', flex:1, minHeight:80 },
    // ↓ valeur numérique météo : var(--pm-text) → vert foncé chez l'agriculteur, bleu chez les autres
    statVal:  { fontFamily:'DM Mono,monospace', fontSize:26, fontWeight:700, color: textPri, lineHeight:1 },
    statLbl:  { fontSize:13, color: textMut, marginTop:4, fontWeight:600 },
    graphCol: { display:'flex', flexDirection:'column', gap:14 },
    graphCard:{ background:cardBg, borderRadius:14, border:`1px solid ${border}`, padding:'20px', boxShadow:'0 2px 8px rgba(10,26,74,0.07)' },
    // ↓ titres de sections (ÉVOLUTION DES TEMPÉRATURES, PRÉVISIONS 5 JOURS…)
    secLabel: { fontSize:13, fontWeight:800, color: textMut, textTransform:'uppercase', letterSpacing:'.8px',
                display:'flex', alignItems:'center', gap:8, marginBottom:16 },
    secBar:   { display:'block', width:4, height:16, flexShrink:0, borderRadius:2,
                background:`linear-gradient(180deg,#0e4f7a,${accentColor})` },
    legBadge: (color, bg) => ({ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
                borderRadius:20, background:bg, border:`1.5px solid ${color}`, fontSize:11, fontWeight:700, color }),
    forecastRow: { display:'flex', gap:8, marginTop:4 },
    forecastDay: { flex:1, background:surface, borderRadius:11, padding:'14px 8px', textAlign:'center', border:`1px solid ${border}` },
    fdDay:   { fontSize:12, fontWeight:700, color: textMut, textTransform:'uppercase', letterSpacing:'.4px' },
    fdDate:  { fontSize:11, color: textMut, marginBottom:6 },
    fdIcon:  { fontSize:24, margin:'6px 0' },
    // ↓ température des prévisions 5 jours
    fdTemp:  { fontSize:16, fontWeight:800, color: textPri },
    fdPluie: { fontSize:11, color:'#1565c0', fontWeight:600, marginTop:3 },
    loadWrap:{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:60, color: textMut, fontSize:14, fontWeight:600 },
    spinner: { width:38, height:38, border:`4px solid ${border}`, borderTop:`4px solid ${accentColor}`, borderRadius:'50%', animation:'spin .9s linear infinite' },
    errBox:  { margin:'16px 0', padding:'16px 20px', background:'#fdecea', borderRadius:10, border:'1px solid #c0392b', color:'#c0392b', fontSize:13.5, fontWeight:600 },
    citySelect:{ background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.5)', borderRadius:8, color:'white',
                 fontSize:14, fontWeight:600, padding:'4px 10px', cursor:'pointer', fontFamily:'DM Sans,sans-serif', outline:'none', backdropFilter:'blur(4px)' },
  };

  const statCards = [
    { key:'temp',  icon:'🌡️', val:temp!=='—'?`${temp}°C`:'—',    lbl:'Température actuelle', bg:'#fff3e0', color:'#e65100' },
    { key:'vent',  icon:'💨', val:vent!=='—'?`${vent} km/h`:'—', lbl:'Vitesse du vent',       bg:'#e3f2fd', color:'#1565c0' },
    { key:'pluie', icon:'🌧️', val:pluie!=='—'?`${pluie} mm`:'—',lbl:'Précipitations',         bg:'#e8f5e9', color:'#2e7d32' },
    { key:'hum',   icon:'💧', val:hum!=='—'?`${hum}%`:'—',       lbl:"Humidité de l'air",     bg:'#e0f7fa', color:'#00695c' },
  ];

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.root}>

        {/* HERO */}
        <div style={S.hero}>
          <div style={S.heroContent}>
            <div style={S.heroDate}>{dateStr}</div>
            <div style={S.heroTime}>{timeStr}</div>
            <div style={S.heroCity}>
              <i className="fa-solid fa-map-pin" style={{ fontSize:12 }}/>
              {isAdmin ? (
                <select style={S.citySelect} value={selectedCity} onChange={e=>setSelectedCity(e.target.value)}>
                  {VILLES_OPTIONS.map(v=>(
                    <option key={v.key} value={v.key} style={{ background:'#0a2a5a', color:'white' }}>{v.label}</option>
                  ))}
                </select>
              ) : villeAffichee}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={S.loadWrap}><div style={S.spinner}/><span>Chargement des données météo…</span></div>
        ) : error ? (
          <div style={S.errBox}>⚠️ {error}</div>
        ) : (
          <div style={S.body}>

            {/* Colonne gauche — stats */}
            <div style={S.statCol}>
              {statCards.map(card=>(
                <div key={card.key} style={{
                  ...S.statCard,
                  transform:  hoveredCard===card.key ? 'translateY(-2px)' : 'none',
                  boxShadow:  hoveredCard===card.key ? '0 6px 24px rgba(10,26,74,0.13)' : '0 2px 8px rgba(10,26,74,0.07)',
                }} onMouseEnter={()=>setHoveredCard(card.key)} onMouseLeave={()=>setHoveredCard(null)}>
                  <div style={{ width:50, height:50, borderRadius:12, flexShrink:0, display:'flex',
                    alignItems:'center', justifyContent:'center', fontSize:22, background:card.bg, color:card.color }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={S.statVal}>{card.val}</div>
                    <div style={S.statLbl}>{card.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Colonne droite — graphes */}
            <div style={S.graphCol}>
              <div style={S.graphCard}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                  <div style={S.secLabel}><span style={S.secBar}/>Évolution des températures</div>
                  {showComparison && (
                    <div style={{ display:'flex', gap:6, marginLeft:'auto' }}>
                      <span style={S.legBadge(accentColor,`${accentColor}18`)}>── Système</span>
                      <span style={S.legBadge('#2e7d32','#e8f5e9')}>── OpenMeteo</span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={dayChartData} margin={{ top:14, right:16, left:-16, bottom:10 }}>
                    <defs>
                      <linearGradient id="gradSys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={accentColor} stopOpacity={0.25}/>
                        <stop offset="100%" stopColor={accentColor} stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="gradOM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#2e7d32" stopOpacity={0.18}/>
                        <stop offset="100%" stopColor="#2e7d32" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,76,122,0.08)"/>
                    <XAxis dataKey="label" tick={<DayTickX/>} height={36} axisLine={false} tickLine={false}/>
                    <YAxis domain={[yMin,yMax]} tick={{ fontSize:10.5, fill:'#5a7a9a', fontFamily:'DM Sans' }} axisLine={false} tickLine={false} unit="°"/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Area type="monotone" dataKey="Système" stroke={accentColor} strokeWidth={2.5} fill="url(#gradSys)"
                      dot={{ r:5, fill:accentColor, stroke:'white', strokeWidth:2 }} activeDot={{ r:7 }}
                      label={{ position:'top', fontSize:11, fill:accentColor, fontWeight:700, formatter:v=>v!=null?`${v}°`:'' }}/>
                    {showComparison && (
                      <Area type="monotone" dataKey="OpenMeteo" stroke="#2e7d32" strokeWidth={2} strokeDasharray="5 3"
                        fill="url(#gradOM)" dot={{ r:4, fill:'#2e7d32', stroke:'white', strokeWidth:2 }} activeDot={{ r:6 }}
                        label={{ position:'bottom', fontSize:11, fill:'#2e7d32', fontWeight:700, formatter:v=>v!=null?`${v}°`:'' }}/>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {futureCards.length > 0 && (
                <div style={S.graphCard}>
                  <div style={S.secLabel}><span style={S.secBar}/>Prévisions — 5 prochains jours</div>
                  <div style={S.forecastRow}>
                    {futureCards.map((d,i)=>(
                      <div key={i} style={S.forecastDay}>
                        <div style={S.fdDay}>{d.label.split(' ')[0]}</div>
                        <div style={S.fdDate}>{d.label.split(' ')[1]}</div>
                        <div style={S.fdIcon}>{d.icon}</div>
                        <div style={S.fdTemp}>{d.temp ?? '—'}°C</div>
                        {d.pluie != null && <div style={S.fdPluie}>💧 {d.pluie} mm</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}