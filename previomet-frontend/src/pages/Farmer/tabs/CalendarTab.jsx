// ============================================================
// CalendarTab.jsx  —  Fichier 9/12  (version finale)
// Onglet Calendrier Cultural — exclusif à l'agriculteur.
//
// LOGIQUE DYNAMIQUE PAR SPÉCIFICITÉ DE CULTURE :
//
// Le backend (recommendations.py) contient les SEUILS propres
// à chaque culture (riz, maïs, tomate, cacao, etc.).
// Ce composant NE calcule pas lui-même les seuils —
// il délègue au backend via l'API recommandations.
//
// Algorithme :
//   1. Récupère les prévisions J+1 à J+7 via /weather/predict
//   2. Pour chaque jour avec données, envoie au backend :
//        conditions météo du jour + spécificités de l'utilisateur
//   3. Le backend applique ses SEUILS culture par culture
//        et renvoie : danger  → 🔴 Risqué
//                     warning → 🟡 Vigilance
//                     success → 🟢 Propice
//   4. Un jour est classé selon la règle de priorité :
//        si au moins 1 "danger"  → Risqué
//        sinon si au moins 1 "warning" → Vigilance
//        sinon si au moins 1 "success" → Propice
//        sinon → Neutre
//   5. Les jours sans données backend → Neutre (jamais hardcodé)
//   6. Les conseils sont extraits directement des réponses backend
//        (titres + détails des recommandations groupées par période)
// ============================================================

import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext }        from '../../../context/AuthContext';
import { getWeatherPredict, getRecommendations } from '../../../api/farmer';

// ── Noms des mois en français ────────────────────────────────
const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

const JOURS_COURTS = ['L','M','M','J','V','S','D'];

// ── Règle de priorité danger > warning > success > neutre ────
function classifyFromRecos(recos) {
  if (!recos || recos.length === 0) return 'neutre';
  const types = recos.map((r) => r.type);
  if (types.includes('danger'))  return 'risque';
  if (types.includes('warning')) return 'attention';
  if (types.includes('success')) return 'propice';
  return 'neutre';
}

// ── Regroupe des nombres consécutifs en plages ───────────────
function groupConsecutive(days) {
  if (!days.length) return [];
  const sorted = [...days].sort((a, b) => a - b);
  const ranges = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) ranges[ranges.length - 1].push(sorted[i]);
    else ranges.push([sorted[i]]);
  }
  return ranges;
}

// ── Composant principal ───────────────────────────────────────
export default function CalendarTab({
  accentColor = '#1a7a3a',
  accentLight = '#e8f5ec',
}) {
  const { user } = useContext(AuthContext);

  const today        = new Date();
  const currentMonth = today.getMonth();
  const currentYear  = today.getFullYear();
  const currentDay   = today.getDate();

  // ── States ─────────────────────────────────────────────────
  const [forecast,     setForecast]     = useState([]);
  const [dayRecos,     setDayRecos]     = useState({}); // { 'YYYY-MM-DD': [...recos] }
  const [loadingFc,    setLoadingFc]    = useState(true);
  const [loadingRecos, setLoadingRecos] = useState(false);
  const [error,        setError]        = useState(null);

  // Cultures actives : spécificités en priorité, sinon catégories
  const cultures = useMemo(() => {
    const specs = user?.specificites ?? [];
    const cats  = user?.categories   ?? [];
    return specs.length > 0 ? specs : cats;
  }, [user]);

  // ── Étape 1 : Prévisions météo ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchForecast() {
      setLoadingFc(true);
      setError(null);
      try {
        const data = await getWeatherPredict();
        if (!cancelled) setForecast(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled)
          setError(err?.response?.data?.detail ?? 'Erreur de chargement des prévisions.');
      } finally {
        if (!cancelled) setLoadingFc(false);
      }
    }
    fetchForecast();
    return () => { cancelled = true; };
  }, []);

  // ── Étape 2 : Recommandations par jour via le backend ──────
  // Pour chaque jour prévu, on envoie les conditions météo + cultures
  // au backend qui applique ses SEUILS propres à chaque culture.
  useEffect(() => {
    if (loadingFc || forecast.length === 0 || cultures.length === 0) return;

    let cancelled = false;
    async function fetchDayRecos() {
      setLoadingRecos(true);
      const results = {};

      await Promise.all(
        forecast.map(async (f) => {
          const dateStr = f.date ?? f.datetime?.slice(0, 10);
          if (!dateStr) return;
          try {
            const recos = await getRecommendations({
              temperature:   f.temperature_max ?? f.temperature ?? 28,
              humidite:      f.humidity        ?? f.humidite    ?? 65,
              precipitation: f.precipitation   ?? f.rain        ?? 0,
              vent:          f.wind_speed      ?? f.vent        ?? 10,
              cultures,
            });
            results[dateStr] = Array.isArray(recos) ? recos : [];
          } catch {
            results[dateStr] = [];
          }
        })
      );

      if (!cancelled) { setDayRecos(results); setLoadingRecos(false); }
    }

    fetchDayRecos();
    return () => { cancelled = true; };
  }, [loadingFc, forecast, cultures]);

  // ── Map jour → classification + données ────────────────────
  const dayMap = useMemo(() => {
    const map = {};
    forecast.forEach((f) => {
      const dateStr = f.date ?? f.datetime?.slice(0, 10);
      if (!dateStr) return;
      const date = new Date(dateStr + 'T00:00:00');
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) return;
      const day  = date.getDate();
      const recos = dayRecos[dateStr] ?? null;
      map[day] = {
        type:    recos !== null ? classifyFromRecos(recos) : 'en-attente',
        recos:   recos ?? [],
        tempMax: f.temperature_max ?? f.temperature ?? null,
        precip:  f.precipitation   ?? f.rain        ?? null,
      };
    });
    return map;
  }, [forecast, dayRecos, currentMonth, currentYear]);

  // ── Conseils du mois : issus du backend uniquement ─────────
  const adviceItems = useMemo(() => {
    const propiceDays   = [];
    const risqueDays    = [];
    const attentionDays = [];
    const conseils      = new Map();

    Object.entries(dayMap).forEach(([dayStr, info]) => {
      const day = parseInt(dayStr, 10);
      if (info.type === 'propice')   propiceDays.push(day);
      if (info.type === 'risque')    risqueDays.push(day);
      if (info.type === 'attention') attentionDays.push(day);
      (info.recos ?? []).forEach((r) => {
        if (!conseils.has(r.titre))
          conseils.set(r.titre, { titre: r.titre, detail: r.detail, type: r.type });
      });
    });

    const items = [];

    groupConsecutive(propiceDays).forEach((range) => {
      const label = range.length === 1 ? `${range[0]}` : `${range[0]}–${range[range.length-1]}`;
      items.push({ type: 'ok', text: `✓ Période favorable : ${label} ${MOIS_FR[currentMonth]}` });
    });
    groupConsecutive(risqueDays).forEach((range) => {
      const label = range.length === 1 ? `${range[0]}` : `${range[0]}–${range[range.length-1]}`;
      items.push({ type: 'warn', text: `⚠ Période risquée : ${label} ${MOIS_FR[currentMonth]}` });
    });
    groupConsecutive(attentionDays).forEach((range) => {
      const label = range.length === 1 ? `${range[0]}` : `${range[0]}–${range[range.length-1]}`;
      items.push({ type: 'warn', text: `⚠ Vigilance : ${label} ${MOIS_FR[currentMonth]}` });
    });

    // Conseils spécifiques du backend (dédupliqués, max 4)
    let count = 0;
    conseils.forEach((c) => {
      if (count >= 4) return;
      items.push({
        type: c.type === 'success' ? 'ok' : 'warn',
        text: `${c.titre} — ${c.detail}`,
      });
      count++;
    });

    if (items.length === 0) {
      items.push({
        type: 'ok',
        text: cultures.length === 0
          ? '✓ Renseignez vos cultures dans votre profil pour des conseils personnalisés.'
          : '✓ Conditions favorables ce mois-ci. Consultez les prévisions quotidiennes.',
      });
    }

    return items;
  }, [dayMap, currentMonth, cultures]);

  // ── Calendrier ──────────────────────────────────────────────
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstWeekDay = (() => {
    const d = new Date(currentYear, currentMonth, 1).getDay();
    return (d + 6) % 7;
  })();

  // ── Styles des jours ────────────────────────────────────────
  const TYPE_STYLES = {
    propice:     { bg: '#e8f5ec', color: '#1a7a3a' },
    risque:      { bg: '#fdecea', color: '#c0392b' },
    attention:   { bg: '#fff8e1', color: '#b07d00' },
    neutre:      { bg: 'var(--pm-bg, #f0f4f8)', color: 'var(--pm-muted, #5a7a9a)' },
    'en-attente':{ bg: 'var(--pm-bg, #f0f4f8)', color: 'var(--pm-muted, #5a7a9a)' },
  };

  const TYPE_LABELS = {
    propice:     '🟢 Propice',
    risque:      '🔴 Risqué',
    attention:   '🟡 Vigilance',
    neutre:      '⬜ Neutre',
    'en-attente':'⬜ Neutre',
  };

  // ── Tooltip ─────────────────────────────────────────────────
  const [hovered, setHovered] = useState(null);

  const isLoading = loadingFc || loadingRecos;

  // ── Styles inline ───────────────────────────────────────────
  const S = {
    root: {
      padding: '28px 32px', minHeight: '100%',
      background: 'var(--pm-bg, #f0f4f8)', fontFamily: 'Nunito, sans-serif',
    },
    card: {
      background: 'var(--pm-card, #ffffff)', borderRadius: 18,
      boxShadow: '0 2px 20px rgba(10,26,74,0.07)',
      padding: '28px 32px', maxWidth: 780, margin: '0 auto',
    },
    calHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 20, flexWrap: 'wrap', gap: 12,
    },
    calMonth: {
      fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700,
      color: 'var(--pm-text, #0a1a4a)',
    },
    cultureSub: { fontSize: 12.5, color: 'var(--pm-muted, #5a7a9a)', marginTop: 4 },
    legend: { display: 'flex', gap: 14, flexWrap: 'wrap' },
    legItem: {
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700, color: 'var(--pm-muted, #5a7a9a)',
    },
    legDot: { width: 11, height: 11, borderRadius: 3, flexShrink: 0 },
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
      gap: 6, marginBottom: 24,
    },
    dayName: {
      textAlign: 'center', fontSize: 12, fontWeight: 700,
      color: 'var(--pm-muted, #5a7a9a)', padding: '4px 0 8px',
    },
    dayBase: {
      borderRadius: 10, padding: '10px 4px', textAlign: 'center',
      fontSize: 14, fontWeight: 600, cursor: 'default',
      transition: 'transform .15s', position: 'relative', userSelect: 'none',
    },
    advSection: { borderTop: '1.5px solid rgba(14,76,122,0.08)', paddingTop: 22 },
    advTitle: {
      fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
      color: 'var(--pm-text, #0a1a4a)', marginBottom: 14,
    },
    advList: { display: 'flex', flexDirection: 'column', gap: 10 },
    advItem: (t) => ({
      padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.65,
      fontWeight: 500,
      background: t === 'ok' ? 'rgba(26,122,58,0.08)' : 'rgba(176,125,0,0.09)',
      color:      t === 'ok' ? '#1a6a35'              : '#8a5500',
      borderLeft: `4px solid ${t === 'ok' ? '#1a7a3a' : '#c08000'}`,
    }),
    noteBox: {
      background: 'rgba(14,76,122,0.05)', borderRadius: 10,
      padding: '10px 14px', fontSize: 12.5,
      color: 'var(--pm-muted, #5a7a9a)', fontStyle: 'italic',
      marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
    },
    spinnerWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 24px', gap: 12,
    },
    spinner: {
      width: 34, height: 34, borderRadius: '50%',
      border: '3px solid rgba(14,76,122,0.12)',
      borderTop: `3px solid ${accentColor}`, animation: 'spin .8s linear infinite',
    },
    errorBox: {
      background: 'rgba(220,53,69,0.08)', border: '1.5px solid rgba(220,53,69,0.25)',
      borderRadius: 10, padding: '14px 18px', color: '#c0392b',
      fontSize: 14, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
    },
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cal-day:hover { transform: scale(1.07); }
        .adv-anim { animation: fadeUp .3s ease both; }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .cal-tooltip {
          position:fixed; background:#0a1a4a; color:white;
          padding:6px 12px; border-radius:8px; font-size:12px;
          font-family:Nunito,sans-serif; font-weight:600;
          pointer-events:none; z-index:9999; white-space:nowrap;
          box-shadow:0 4px 14px rgba(0,0,0,.22); transform:translateY(-110%);
        }
      `}</style>

      {/* Tooltip flottant */}
      {hovered && (
        <div className="cal-tooltip" style={{ left: hovered.x, top: hovered.y }}>
          {TYPE_LABELS[hovered.type] ?? '⬜'}
          {hovered.tempMax !== null ? ` · ${Math.round(hovered.tempMax)}°C` : ''}
          {hovered.precip  !== null ? ` · ${Math.round(hovered.precip)}mm`  : ''}
        </div>
      )}

      <div style={S.root}>
        <div style={S.card}>

          {/* ── En-tête ──────────────────────────────── */}
          <div style={S.calHeader}>
            <div>
              <div style={S.calMonth}>
                {MOIS_FR[currentMonth]} {currentYear}
                {user?.ville ? ` — ${user.ville}` : ''}
              </div>
              {cultures.length > 0 && (
                <div style={S.cultureSub}>
                  <i className="fa-solid fa-seedling"
                     style={{ color: accentColor, marginRight: 5 }} />
                  {cultures.join(' · ')}
                </div>
              )}
            </div>
            <div style={S.legend}>
              {[
                { label: 'Propice',   dot: '#2a8a3a' },
                { label: 'Risqué',    dot: '#e74c3c' },
                { label: 'Vigilance', dot: '#c08000' },
                { label: 'Neutre',    dot: '#aaa'    },
              ].map(({ label, dot }) => (
                <div key={label} style={S.legItem}>
                  <div style={{ ...S.legDot, background: dot }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Erreur ───────────────────────────────── */}
          {error && (
            <div style={S.errorBox}>
              <i className="fa-solid fa-triangle-exclamation" />{error}
            </div>
          )}

          {/* ── Spinner ──────────────────────────────── */}
          {isLoading && !error && (
            <div style={S.spinnerWrap}>
              <div style={S.spinner} />
              <div style={{ fontSize: 13, color: 'var(--pm-muted, #5a7a9a)' }}>
                {loadingFc ? 'Chargement des prévisions…' : 'Analyse par culture en cours…'}
              </div>
            </div>
          )}

          {/* ── Grille + Conseils ────────────────────── */}
          {!isLoading && !error && (
            <>
              {cultures.length === 0 && (
                <div style={S.noteBox}>
                  <i className="fa-solid fa-circle-info" />
                  Renseignez vos cultures dans votre profil pour un
                  calendrier personnalisé.
                </div>
              )}

              {/* Grille */}
              <div style={S.grid}>
                {JOURS_COURTS.map((j, i) => (
                  <div key={i} style={S.dayName}>{j}</div>
                ))}
                {Array.from({ length: firstWeekDay }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const info    = dayMap[day] ?? { type: 'neutre', recos: [], tempMax: null, precip: null };
                  const isToday = day === currentDay;
                  const cs      = TYPE_STYLES[info.type] ?? TYPE_STYLES.neutre;
                  return (
                    <div
                      key={day}
                      className="cal-day"
                      style={{
                        ...S.dayBase,
                        background:    cs.bg,
                        color:         cs.color,
                        fontWeight:    isToday ? 800 : 600,
                        outline:       isToday ? `2.5px solid ${accentColor}` : 'none',
                        outlineOffset: '1px',
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHovered({ type: info.type, tempMax: info.tempMax,
                          precip: info.precip, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {day}
                      {isToday && (
                        <div style={{
                          position: 'absolute', bottom: 4, left: '50%',
                          transform: 'translateX(-50%)', width: 5, height: 5,
                          borderRadius: '50%', background: accentColor,
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Conseils */}
              <div style={S.advSection}>
                <div style={S.advTitle}>
                  <i className="fa-solid fa-lightbulb"
                     style={{ color: accentColor, marginRight: 8 }} />
                  Conseils du mois
                </div>
                <div style={S.advList}>
                  {adviceItems.map((item, i) => (
                    <div key={i} className="adv-anim"
                         style={{ ...S.advItem(item.type), animationDelay: `${i * 0.06}s` }}>
                      {item.text}
                    </div>
                  ))}
                </div>
                {user?.specificites?.length > 0 && (
                  <div style={S.noteBox}>
                    <i className="fa-solid fa-seedling" style={{ color: accentColor }} />
                    Analyse basée sur : {user.specificites.join(', ')}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}
