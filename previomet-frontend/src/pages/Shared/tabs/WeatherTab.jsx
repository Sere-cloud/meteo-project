// ============================================================
// WeatherTab.jsx  —  Fichier 6/12
// Onglet Prévisions Météo — commun à Farmer et Logistics.
//
// Structure :
//   ┌─────────────────────────────────────────────────────┐
//   │  HERO  (image bg + overlay + date/heure/ville + 🌤️) │
//   ├──────────────────┬──────────────────────────────────┤
//   │  4 STAT CARDS    │  Graphe "Prévision du jour"      │
//   │  (Temp/Vent/     │  (Recharts LineChart, H+3/6/12)  │
//   │   Pluie/Humidité)│  + Prévisions futures (5 jours)  │
//   └──────────────────┴──────────────────────────────────┘
//
// Props reçues :
//   heroImage {string}  — URL de l'image hero (agri ou logi)
//   accentColor {string} — couleur d'accent (vert agri, bleu logi)
//
// Données dynamiques : toutes issues du backend via Axios.
//   - /weather/current → météo actuelle (temp, vent, pluie, hum)
//   - /weather/predict → prévisions horaires + 5 jours
//
// Le mode sombre est lu depuis les CSS variables --pm-* injectées
// par DashboardLayout sur le nœud racine — aucune prop isDark.
// ============================================================

import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext }                              from '../../../context/AuthContext';
import { getWeatherCurrent, getWeatherPredict } from '../../../api/farmer';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Area,
  AreaChart, BarChart, Bar, Cell,
} from 'recharts';

// ── Constantes ───────────────────────────────────────────────
const DAYS_FR   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

// Icône météo dynamique selon conditions (température + pluie)
function getWeatherIcon(temp, precipitation) {
  if (precipitation > 20) return '⛈️';
  if (precipitation > 5)  return '🌧️';
  if (temp > 35)           return '☀️';
  if (temp > 28)           return '🌤️';
  return '⛅';
}

// Icône héro dynamique selon heure
function getHeroIcon(hour) {
  if (hour >= 6  && hour < 12) return '☀️';
  if (hour >= 12 && hour < 17) return '🌤️';
  if (hour >= 17 && hour < 20) return '🌅';
  return '🌙';
}

// ── Sous-composant : Tooltip Recharts personnalisé ────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background:   'white',
      border:       '1px solid rgba(14,76,122,0.12)',
      borderRadius: 10,
      padding:      '10px 14px',
      boxShadow:    '0 4px 16px rgba(10,26,74,0.12)',
      fontSize:     13,
      fontFamily:   'Nunito, sans-serif',
    }}>
      <div style={{ fontWeight: 700, color: '#0a1a4a', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name} : {p.value}{p.unit ?? ''}
        </div>
      ))}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function WeatherTab({ heroImage, accentColor = '#0e7c8a' }) {
  const { user } = useContext(AuthContext);

  // ── States ─────────────────────────────────────────────────
  const [current,  setCurrent]  = useState(null);   // météo actuelle
  const [predict,  setPredict]  = useState(null);   // prévisions
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [chartMode, setChartMode] = useState('jour'); // 'jour' | 'futur'
  const [now,       setNow]     = useState(new Date());

  // ── Horloge locale ─────────────────────────────────────────
  // Mise à jour toutes les 30 secondes (léger, pas de useRef nécessaire)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // ── Appels API ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        // Les deux appels en parallèle pour plus de rapidité
        const [cur, pred] = await Promise.all([
          getWeatherCurrent(),
          getWeatherPredict(),
        ]);
        if (!cancelled) {
          setCurrent(cur);
          setPredict(pred);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail ?? 'Erreur de chargement météo');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, []);

  // ── Dérivations ────────────────────────────────────────────
  const ville     = user?.ville ?? '—';
  const heroIcon  = getHeroIcon(now.getHours());
  const dateStr   = `${DAYS_FR[now.getDay()]} ${now.getDate()} ${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}`;
  const timeStr   = `${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;

  // Valeurs actuelles (depuis l'API ou fallback ---)
  const temp  = current?.temperature  ?? '—';
  const vent  = current?.vent         ?? '—';
  const pluie = current?.precipitation ?? '—';
  const hum   = current?.humidite     ?? '—';
  const icon  = current
    ? getWeatherIcon(current.temperature, current.precipitation)
    : heroIcon;

  // ── Données graphe "Prévision du jour" ──────────────────────
  // predict?.horaire = [{horizon:'H3', temperature:29, ...}, ...]
  const dayChartData = (() => {
    if (!predict?.horaire) return [];
    const h = now.getHours();
    return predict.horaire.map((pt) => {
      const delta = parseInt(pt.horizon.replace('H',''), 10) || 0;
      const heure = (h + delta) % 24;
      return {
        label: `${heure}h00`,
        Température: pt.temperature ?? null,
        Humidité:    pt.humidite    ?? null,
        unit:        '°C',
      };
    });
  })();

  // ── Données graphe "Prévision future" (5 jours) ─────────────
  // predict?.jours = [{horizon:'J2', temperature_min:22, temperature_max:30,
  //                    precipitation:5, ...}, ...]
  const futureChartData = (() => {
    if (!predict?.jours) return [];
    return predict.jours.map((pt) => {
      const delta = parseInt(pt.horizon.replace('J',''), 10) || 0;
      const d = new Date(now);
      d.setDate(d.getDate() + (delta - 1));
      const icon2 = getWeatherIcon(pt.temperature_max ?? 28, pt.precipitation ?? 0);
      return {
        label:  `${DAYS_SHORT[d.getDay()]} ${d.getDate()}`,
        icon:   icon2,
        TMax:   pt.temperature_max  ?? null,
        TMin:   pt.temperature_min  ?? null,
        Pluie:  pt.precipitation    ?? null,
      };
    });
  })();

  // ── Couleurs thème (lues en CSS, recréées ici pour JS) ──────
  const border   = 'rgba(14,76,122,0.12)';
  const cardBg   = 'var(--pm-card, #ffffff)';
  const pageBg   = 'var(--pm-bg, #f0f4f8)';
  const textPri  = 'var(--pm-text, #0a1a4a)';
  const textMut  = 'var(--pm-muted, #5a7a9a)';
  const surface  = 'var(--pm-surface, #f8fafc)';

  // ── Styles ─────────────────────────────────────────────────
  const S = {
    root: {
      display:       'flex',
      flexDirection: 'column',
      flex:          1,
      minHeight:     0,
      fontFamily:    'Nunito, sans-serif',
    },

    // ── Hero ──────────────────────────────────────────────────
    hero: {
      position:      'relative',
      height:        220,
      flexShrink:    0,
      overflow:      'hidden',
      background:    heroImage
        ? `url(${heroImage}) center/cover no-repeat`
        : 'linear-gradient(135deg, #0a2a5a 0%, #0e5a7a 60%, #0e7c8a 100%)',
    },
    heroOverlay: {
      position:  'absolute',
      inset:     0,
      background:'linear-gradient(to right, rgba(0,0,0,.62) 0%, rgba(0,0,0,.22) 60%, transparent 100%)',
    },
    heroContent: {
      position:      'relative',
      zIndex:        2,
      padding:       '22px 28px',
      height:        '100%',
      display:       'flex',
      flexDirection: 'column',
      justifyContent:'center',
    },
    heroDate: {
      fontFamily: 'Syne, sans-serif',
      fontSize:   28,
      fontWeight: 800,
      color:      'white',
      lineHeight: 1.1,
      marginBottom: 4,
    },
    heroTime: {
      fontSize:   17,
      fontWeight: 600,
      color:      'rgba(255,255,255,.85)',
      marginBottom: 5,
    },
    heroCity: {
      fontSize:   14,
      fontWeight: 500,
      color:      'rgba(255,255,255,.70)',
      display:    'flex',
      alignItems: 'center',
      gap:        5,
    },
    heroIcon: {
      position:   'absolute',
      right:      32,
      top:        '50%',
      transform:  'translateY(-50%)',
      zIndex:     2,
      fontSize:   72,
      filter:     'drop-shadow(0 4px 16px rgba(0,0,0,.30))',
      userSelect: 'none',
    },

    // ── Body (2 colonnes) ─────────────────────────────────────
    body: {
      display:             'grid',
      gridTemplateColumns: '300px 1fr',
      gap:                 18,
      padding:             '20px 22px',
      alignItems:          'start',
      overflowY:           'auto',
      flex:                1,
    },

    // ── Stat cards ────────────────────────────────────────────
    statCol: {
      display:       'flex',
      flexDirection: 'column',
      gap:           12,
    },
    statCard: {
      background:   cardBg,
      borderRadius: 14,
      border:       `1px solid ${border}`,
      padding:      '16px 18px',
      display:      'flex',
      alignItems:   'center',
      gap:          14,
      boxShadow:    '0 2px 8px rgba(10,26,74,0.07)',
      transition:   'transform .2s, box-shadow .2s',
      cursor:       'default',
    },
    statVal: {
      fontFamily: 'Syne, sans-serif',
      fontSize:   22,
      fontWeight: 700,
      color:      textPri,
      lineHeight: 1,
    },
    statLbl: {
      fontSize:   12,
      color:      textMut,
      marginTop:  3,
      fontWeight: 600,
    },

    // ── Graphe ────────────────────────────────────────────────
    graphCol: {
      display:       'flex',
      flexDirection: 'column',
      gap:           16,
    },
    graphCard: {
      background:   cardBg,
      borderRadius: 14,
      border:       `1px solid ${border}`,
      padding:      '20px',
      boxShadow:    '0 2px 8px rgba(10,26,74,0.07)',
    },
    sectionLabel: {
      fontSize:      13,
      fontWeight:    800,
      color:         textMut,
      textTransform: 'uppercase',
      letterSpacing: '.8px',
      marginBottom:  14,
      display:       'flex',
      alignItems:    'center',
      gap:           6,
    },
    sectionBar: {
      display:      'block',
      width:        4,
      height:       16,
      background:   `linear-gradient(180deg, #0e4f7a, ${accentColor})`,
      borderRadius: 2,
      flexShrink:   0,
    },

    // Boutons toggle Jour / Futur
    toggleRow: {
      display:       'flex',
      gap:           8,
      marginBottom:  16,
    },
    toggleBtn: (active) => ({
      padding:      '6px 18px',
      borderRadius: 20,
      border:       `1.5px solid ${active ? accentColor : border}`,
      background:   active ? accentColor : 'transparent',
      color:        active ? 'white' : textMut,
      fontSize:     12.5,
      fontWeight:   700,
      cursor:       'pointer',
      fontFamily:   'Nunito, sans-serif',
      transition:   'all .2s',
    }),

    // Forecast 5 jours
    forecastRow: {
      display: 'flex',
      gap:     8,
    },
    forecastDay: {
      flex:          1,
      background:    surface,
      borderRadius:  11,
      padding:       '12px 8px',
      textAlign:     'center',
      border:        `1px solid ${border}`,
    },
    fdName: {
      fontSize:      12,
      fontWeight:    700,
      color:         textMut,
      textTransform: 'uppercase',
      letterSpacing: '.4px',
    },
    fdDate: {
      fontSize:   11,
      color:      textMut,
      marginBottom: 6,
    },
    fdIcon: {
      fontSize:   22,
      margin:     '4px 0',
    },
    fdTemps: {
      fontSize:   12,
      fontWeight: 700,
      color:      textPri,
    },
    fdPluie: {
      fontSize:   11,
      color:      '#1565c0',
      fontWeight: 600,
      marginTop:  2,
    },

    // États loading / error
    loadingWrap: {
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            14,
      padding:        60,
      color:          textMut,
      fontSize:       14,
      fontWeight:     600,
    },
    spinner: {
      width:       38,
      height:      38,
      border:      `4px solid ${border}`,
      borderTop:   `4px solid ${accentColor}`,
      borderRadius:'50%',
      animation:   'spin 0.9s linear infinite',
    },
    errorBox: {
      margin:       20,
      padding:      '16px 20px',
      background:   '#fdecea',
      borderRadius: 10,
      border:       '1px solid #c0392b',
      color:        '#c0392b',
      fontSize:     13.5,
      fontWeight:   600,
    },
  };

  // ── Icônes de stat ─────────────────────────────────────────
  const statCards = [
    {
      key:   'temp',
      icon:  '🌡️',
      val:   temp !== '—' ? `${temp}°C` : '—',
      lbl:   'Température actuelle',
      bg:    '#fff3e0', color: '#e65100',
    },
    {
      key:   'vent',
      icon:  '💨',
      val:   vent !== '—' ? `${vent} km/h` : '—',
      lbl:   'Vitesse du vent',
      bg:    '#e3f2fd', color: '#1565c0',
    },
    {
      key:   'pluie',
      icon:  '🌧️',
      val:   pluie !== '—' ? `${pluie} mm` : '—',
      lbl:   'Précipitations',
      bg:    '#e8f5e9', color: '#2e7d32',
    },
    {
      key:   'hum',
      icon:  '💧',
      val:   hum !== '—' ? `${hum}%` : '—',
      lbl:   'Humidité de l\'air',
      bg:    '#e0f7fa', color: '#00695c',
    },
  ];

  // ── Hover sur stat cards ────────────────────────────────────
  const [hoveredCard, setHoveredCard] = useState(null);

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe spin pour le spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={S.root}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={S.hero}>
          <div style={S.heroOverlay} />
          <div style={S.heroContent}>
            <div style={S.heroDate}>{dateStr}</div>
            <div style={S.heroTime}>{timeStr}</div>
            <div style={S.heroCity}>
              <i className="fa-solid fa-map-pin" style={{ fontSize: 13 }} />
              {ville}
            </div>
          </div>
          <div style={S.heroIcon} title="Conditions météo actuelles">{icon}</div>
        </div>

        {/* ── CORPS ─────────────────────────────────────── */}
        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <span>Chargement des données météo…</span>
          </div>
        ) : error ? (
          <div style={S.errorBox}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
            {error}
          </div>
        ) : (
          <div style={S.body}>

            {/* ── COLONNE GAUCHE : 4 cartes ─────────────── */}
            <div style={S.statCol}>
              {statCards.map((card) => (
                <div
                  key={card.key}
                  style={{
                    ...S.statCard,
                    transform:  hoveredCard === card.key ? 'translateY(-2px)' : 'none',
                    boxShadow:  hoveredCard === card.key
                      ? '0 4px 20px rgba(10,26,74,0.13)'
                      : '0 2px 8px rgba(10,26,74,0.07)',
                  }}
                  onMouseEnter={() => setHoveredCard(card.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div style={{
                    width:          46,
                    height:         46,
                    borderRadius:   11,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       20,
                    flexShrink:     0,
                    background:     card.bg,
                    color:          card.color,
                  }}>
                    {card.icon}
                  </div>
                  <div>
                    <div style={S.statVal}>{card.val}</div>
                    <div style={S.statLbl}>{card.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── COLONNE DROITE : graphe + prévisions ─── */}
            <div style={S.graphCol}>

              {/* Carte graphe */}
              <div style={S.graphCard}>

                {/* Label + toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={S.sectionLabel}>
                    <span style={S.sectionBar} />
                    {chartMode === 'jour' ? 'Prévisions du jour' : 'Prévisions à venir'}
                  </div>
                  <div style={S.toggleRow}>
                    <button
                      style={S.toggleBtn(chartMode === 'jour')}
                      onClick={() => setChartMode('jour')}
                    >
                      Aujourd'hui
                    </button>
                    <button
                      style={S.toggleBtn(chartMode === 'futur')}
                      onClick={() => setChartMode('futur')}
                    >
                      5 jours
                    </button>
                  </div>
                </div>

                {/* ── Graphe "Prévision du jour" — LineChart ── */}
                {chartMode === 'jour' && (
                  dayChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={dayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={accentColor} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={accentColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,76,122,0.08)" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#5a7a9a', fontFamily: 'Nunito' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10.5, fill: '#5a7a9a', fontFamily: 'Nunito' }}
                          axisLine={false}
                          tickLine={false}
                          unit="°"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="Température"
                          stroke={accentColor}
                          strokeWidth={2.5}
                          fill="url(#tempGrad)"
                          dot={{ r: 5, fill: accentColor, stroke: 'white', strokeWidth: 2 }}
                          activeDot={{ r: 7 }}
                          unit="°C"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a7a9a', fontSize: 13 }}>
                      Données horaires non disponibles
                    </div>
                  )
                )}

                {/* ── Graphe "Prévision future" — BarChart ─── */}
                {chartMode === 'futur' && (
                  futureChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={futureChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(14,76,122,0.08)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={({ x, y, payload, index }) => {
                            const d = futureChartData[index];
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#5a7a9a" fontFamily="Nunito">
                                  {payload.value}
                                </text>
                                <text x={0} y={0} dy={26} textAnchor="middle" fontSize={14}>
                                  {d?.icon ?? '🌤️'}
                                </text>
                              </g>
                            );
                          }}
                          height={42}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10.5, fill: '#5a7a9a', fontFamily: 'Nunito' }}
                          axisLine={false}
                          tickLine={false}
                          unit="°"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="TMax" name="T° max" unit="°C" radius={[6,6,0,0]}>
                          {futureChartData.map((_, i) => (
                            <Cell key={i} fill={accentColor} fillOpacity={0.85} />
                          ))}
                        </Bar>
                        <Bar dataKey="TMin" name="T° min" unit="°C" radius={[6,6,0,0]}>
                          {futureChartData.map((_, i) => (
                            <Cell key={i} fill="#0a1a4a" fillOpacity={0.25} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#5a7a9a', fontSize: 13 }}>
                      Données journalières non disponibles
                    </div>
                  )
                )}
              </div>

              {/* Carte prévisions 5 jours — format compact */}
              {futureChartData.length > 0 && (
                <div style={S.graphCard}>
                  <div style={{ ...S.sectionLabel, marginBottom: 14 }}>
                    <span style={S.sectionBar} />
                    Prévisions — 5 jours
                  </div>
                  <div style={S.forecastRow}>
                    {futureChartData.map((d, i) => (
                      <div key={i} style={S.forecastDay}>
                        <div style={S.fdName}>{d.label.split(' ')[0]}</div>
                        <div style={S.fdDate}>{d.label.split(' ')[1]}</div>
                        <div style={S.fdIcon}>{d.icon}</div>
                        <div style={S.fdTemps}>
                          {d.TMin ?? '—'}–{d.TMax ?? '—'}°
                        </div>
                        {d.Pluie != null && (
                          <div style={S.fdPluie}>
                            💧 {d.Pluie} mm
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>{/* fin graphCol */}
          </div>
        )}
      </div>
    </>
  );
}
