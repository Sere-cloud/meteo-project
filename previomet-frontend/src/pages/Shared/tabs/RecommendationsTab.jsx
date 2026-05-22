// src/pages/Shared/tabs/RecommendationsTab.jsx
// Props : accentColor, accentLight, onRecoCount, showSpecs

import { useState, useEffect } from 'react';
import { getProfile, getRecommendations, deleteRecommendation, deleteAllRecommendations } from '../../../api/farmer';

// ── Calcul de la date cible depuis l'horizon ──────────────────────────────────
function horizonToDateLabel(horizon) {
  const now = new Date();

  if (!horizon || horizon === 'Actuellement') {
    return `Aujourd'hui · ${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;
  }

  const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];

  const matchH = horizon.match(/^H\+(\d+)$/);
  if (matchH) {
    const h      = parseInt(matchH[1]);
    const target = new Date(now.getTime() + h * 3600 * 1000);
    const hh     = String(target.getHours()).padStart(2,'0');
    const mm     = String(target.getMinutes()).padStart(2,'0');
    const isToday    = target.toDateString() === now.toDateString();
    const isTomorrow = target.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    if (isToday)    return `Aujourd'hui à ${hh}h${mm}`;
    if (isTomorrow) return `Demain à ${hh}h${mm}`;
    return `${target.getDate()} ${MONTHS[target.getMonth()]} à ${hh}h${mm}`;
  }

  const matchJ = horizon.match(/^J\+(\d+)$/);
  if (matchJ) {
    const j      = parseInt(matchJ[1]);
    const target = new Date(now);
    target.setDate(target.getDate() + j);
    target.setHours(0, 0, 0, 0);
    const isTomorrow = j === 1;
    const dayLabel   = `${target.getDate()} ${MONTHS[target.getMonth()]}`;
    if (isTomorrow) return `Demain · ${dayLabel}`;
    return `Dans ${j} jours · ${dayLabel}`;
  }

  return horizon;
}

function buildProfilLabel(profile, showSpecs) {
  if (!profile) return '—';
  const items = showSpecs
    ? (profile.specificites ?? [])
    : (profile.categories   ?? []);
  return items.length ? items.join(' · ') : (profile.role ?? '—');
}

function isUrgent(reco) { return reco.type === 'danger'; }

function sortByDate(arr) {
  return [...arr].sort((a, b) => {
    const da = new Date(a.date ?? 0);
    const db = new Date(b.date ?? 0);
    return db - da;
  });
}

// ── RecoCard ──────────────────────────────────────────────────────────────────
function RecoCard({ reco, accentColor, accentLight, onDelete }) {
  const [open,    setOpen]    = useState(false);
  const [hovered, setHovered] = useState(false);

  const urgent      = isUrgent(reco);
  const borderColor = urgent ? '#c0392b' : reco.type === 'warning' ? '#e67e22' : accentColor;
  const badgeBg     = urgent ? '#fdecea' : reco.type === 'warning' ? '#fef3e2' : accentLight;
  const badgeColor  = urgent ? '#c0392b' : reco.type === 'warning' ? '#d35400' : accentColor;
  const badgeLabel  = urgent ? '⚠ Urgent' : reco.type === 'warning' ? '⚡ Attention' : '✓ Conseil';

  const dateLabel = horizonToDateLabel(reco.horizon);

  return (
    <div style={{
      background:   'var(--pm-card,#ffffff)',
      borderRadius: 14,
      border:       '1px solid rgba(14,76,122,0.12)',
      borderLeft:   `5px solid ${borderColor}`,
      marginBottom: 10,
      boxShadow:    '0 2px 8px rgba(10,26,74,0.06)',
      overflow:     'hidden',
    }}>
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen(p => !p)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(p => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding:        '13px 16px',
          display:        'flex', alignItems: 'flex-start',
          justifyContent: 'space-between',
          cursor:         'pointer',
          background:     hovered ? 'rgba(14,76,122,0.025)' : 'transparent',
          transition:     'background .15s', userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: '3px 9px',
            borderRadius: 20, display: 'inline-block', marginBottom: 6,
            background: badgeBg, color: badgeColor,
          }}>
            {badgeLabel}
          </span>

          <div style={{
            fontSize: 11.5, color: 'var(--pm-muted,#5a7a9a)',
            marginBottom: 4, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          }}>
            {reco.culture && <span>{reco.culture}</span>}
            {reco.culture && <span style={{ opacity: 0.4 }}>·</span>}
            <span style={{
              background: 'rgba(14,76,122,0.07)',
              borderRadius: 6, padding: '1px 7px',
              fontSize: 11, fontWeight: 700,
              color: borderColor,
            }}>
              📅 {dateLabel}
            </span>
          </div>

          <div style={{
            fontSize: 13.5, fontWeight: 700,
            color: 'var(--pm-text,#0a1a4a)', lineHeight: 1.35,
          }}>
            {reco.titre ?? '—'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12, flexShrink: 0 }}>
          <button
            title="Supprimer"
            onClick={(e) => { e.stopPropagation(); onDelete(reco.id); }}
            style={{
              border: 'none', background: 'none', cursor: 'pointer',
              color: 'rgba(192,57,43,0.4)', fontSize: 13,
              padding: '2px 5px', borderRadius: 6, transition: 'all .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color='#c0392b'; e.currentTarget.style.background='#fdecea'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color='rgba(192,57,43,0.4)'; e.currentTarget.style.background='none'; }}
          >🗑</button>
          <span style={{
            fontSize: 11, color: 'var(--pm-muted,#5a7a9a)',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .25s',
          }}>▼</span>
        </div>
      </div>

      {open && (
        <div style={{
          padding: '10px 16px 14px',
          fontSize: 13, color: 'var(--pm-muted,#5a7a9a)',
          lineHeight: 1.7, borderTop: '1px solid rgba(14,76,122,0.07)',
        }}>
          {reco.detail ?? '(Aucun détail disponible)'}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function RecommendationsTab({
  accentColor = '#1a7a3a',
  accentLight = '#e8f5ec',
  onRecoCount = null,
  showSpecs   = true,
}) {
  const [profile,  setProfile]  = useState(null);
  const [recos,    setRecos]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const [profileRes, recosRes] = await Promise.all([
          getProfile(),
          getRecommendations(),
        ]);
        if (!cancelled) {
          setProfile(profileRes?.data ?? profileRes);
          const raw  = recosRes?.data ?? recosRes;
          const list = Array.isArray(raw) ? raw : (raw?.recommendations ?? []);
          setRecos(list);
          // Informe le parent du nombre initial (pour le badge sur les autres onglets).
          // FarmerDashboard ignore ce count si on est déjà sur cet onglet.
          if (onRecoCount) onRecoCount(list.length);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleDelete(id) {
    setRecos(prev => {
      const next = prev.filter(r => r.id !== id);
      if (onRecoCount) onRecoCount(next.length);
      return next;
    });
    try { await deleteRecommendation(id); } catch {}
  }

  async function handleDeleteAll() {
    if (!window.confirm('Supprimer toutes les recommandations ?')) return;
    setDeleting(true);
    try {
      await deleteAllRecommendations();
      setRecos([]);
      if (onRecoCount) onRecoCount(0);
    } catch {
      setError('Impossible de supprimer toutes les recommandations');
    } finally {
      setDeleting(false);
    }
  }

  const urgentes = sortByDate(recos.filter(r =>  isUrgent(r)));
  const conseils = sortByDate(recos.filter(r => !isUrgent(r)));

  const profilLabel = buildProfilLabel(profile, showSpecs);
  const border      = 'rgba(14,76,122,0.12)';

  const S = {
    root:    { padding: '20px 24px', flex: 1, overflowY: 'auto', fontFamily: 'DM Sans, sans-serif' },
    topbar:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
    profilLine:  { fontSize: 13.5, color: 'var(--pm-muted,#5a7a9a)', fontWeight: 600 },
    profilValue: { color: 'var(--pm-text,#0a1a4a)', fontWeight: 700 },
    delBtn: {
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', border: '1.5px solid #c0392b',
      borderRadius: 9, background: 'none', color: '#c0392b',
      fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
      fontFamily: 'DM Sans, sans-serif', transition: 'background .2s',
      opacity: deleting ? 0.6 : 1,
    },
    sectionTitle: (color) => ({
      fontSize: 12, fontWeight: 800, marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 7, color,
      textTransform: 'uppercase', letterSpacing: '.5px',
    }),
    emptyWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '60px 24px', color: 'var(--pm-muted,#5a7a9a)', gap: 10,
    },
    loadWrap: {
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 14, padding: 60,
      color: 'var(--pm-muted,#5a7a9a)', fontSize: 14, fontWeight: 600,
    },
    spinner: {
      width: 36, height: 36,
      border: `4px solid ${border}`, borderTop: `4px solid ${accentColor}`,
      borderRadius: '50%', animation: 'spin 0.9s linear infinite',
    },
    errorBox: {
      padding: '14px 18px', background: '#fdecea', borderRadius: 10,
      border: '1px solid #c0392b', color: '#c0392b',
      fontSize: 13, fontWeight: 600, marginBottom: 14,
    },
  };

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.root}>

        <div style={S.topbar}>
          <div style={S.profilLine}>
            Profil actif :&nbsp;
            <span style={S.profilValue}>{profilLabel}</span>
          </div>
          {recos.length > 0 && (
            <button
              style={S.delBtn} disabled={deleting} onClick={handleDeleteAll}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fdecea'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              🗑 {deleting ? 'Suppression…' : 'Tout supprimer'}
            </button>
          )}
        </div>

        {error && <div style={S.errorBox}>⚠ {error}</div>}

        {loading ? (
          <div style={S.loadWrap}>
            <div style={S.spinner}/>
            <span>Chargement des recommandations…</span>
          </div>

        ) : recos.length === 0 ? (
          <div style={S.emptyWrap}>
            <div style={{ fontSize: 48, opacity: .3 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Aucune recommandation</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
              Les recommandations apparaîtront ici selon vos cultures et les conditions météo.
            </div>
          </div>

        ) : (
          <>
            {urgentes.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={S.sectionTitle('#c0392b')}>
                  ⚠ Urgentes — Action immédiate requise
                  <span style={{
                    marginLeft: 4, background: '#fdecea', color: '#c0392b',
                    borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800,
                  }}>
                    {urgentes.length}
                  </span>
                </div>
                {urgentes.map((r, i) => (
                  <RecoCard key={r.id ?? i} reco={r}
                    accentColor={accentColor} accentLight={accentLight}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {conseils.length > 0 && (
              <div>
                <div style={S.sectionTitle(accentColor)}>
                  ✓ Conseils & optimisation
                  <span style={{
                    marginLeft: 4, background: accentLight, color: accentColor,
                    borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800,
                  }}>
                    {conseils.length}
                  </span>
                </div>
                {conseils.map((r, i) => (
                  <RecoCard key={r.id ?? i} reco={r}
                    accentColor={accentColor} accentLight={accentLight}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}