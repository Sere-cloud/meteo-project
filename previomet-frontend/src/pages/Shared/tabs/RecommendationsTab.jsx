// ============================================================
// RecommendationsTab.jsx  —  Fichier 7/12
// Onglet Recommandations — commun à Farmer et Logistics.
//
// Structure :
//   ┌─────────────────────────────────────────────────────┐
//   │  Topbar : profil actif (catégories + specs)         │
//   │           + bouton "Tout supprimer"                 │
//   ├─────────────────────────────────────────────────────┤
//   │  Section URGENTES (rouge)                           │
//   │    └── Cards accordion (chevron déroulant)          │
//   ├─────────────────────────────────────────────────────┤
//   │  Section NON URGENTES (vert agri / bleu logi)       │
//   │    └── Cards accordion                             │
//   ├─────────────────────────────────────────────────────┤
//   │  État vide illustré (si aucune reco)                │
//   └─────────────────────────────────────────────────────┘
//
// Props reçues :
//   accentColor {string}  — couleur des non-urgentes
//                           (#1a7a3a agri  |  #0e4f7a logi)
//   accentLight {string}  — fond clair de l'accent
//                           (#e8f5ec agri  |  #e8f4f8 logi)
//
// Données dynamiques :
//   GET /recommendations/  → liste complète des recommandations
//   DELETE /recommendations/{id}  → suppression unitaire
//   DELETE /recommendations/      → suppression globale
// ============================================================

import { useState, useEffect, useContext } from 'react';
import { AuthContext }                     from '../../../context/AuthContext';
import { getRecommendations, deleteRecommendation, deleteAllRecommendations } from '../../../api/farmer';

// ── Formatage de date ISO → "12 Mai 2026 · 08h30" ───────────
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin',
                'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${
      String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
  } catch {
    return iso;
  }
}

// ── Libellé du profil actif depuis user ─────────────────────
function buildProfilLabel(user) {
  if (!user) return '—';
  const parts = [];
  if (user.categories?.length) {
    parts.push(...user.categories.map((c) => c));
  }
  if (user.specificites?.length) {
    parts.push(...user.specificites.map((s) => s));
  }
  return parts.length ? parts.join('  ·  ') : (user.activite ?? '—');
}

// ── Sous-composant : une card accordion ─────────────────────
function RecoCard({ reco, isUrgent, accentColor, accentLight, onDelete }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const borderColor = isUrgent ? '#c0392b' : accentColor;
  const badgeBg     = isUrgent ? '#fdecea' : accentLight;
  const badgeColor  = isUrgent ? '#c0392b' : accentColor;
  const badgeLabel  = isUrgent ? '⚠ Urgent' : '✓ Conseil';

  return (
    <div
      style={{
        background:    'var(--pm-card, #ffffff)',
        borderRadius:  14,
        border:        '1px solid rgba(14,76,122,0.12)',
        borderLeft:    `5px solid ${borderColor}`,
        marginBottom:  12,
        boxShadow:     '0 2px 8px rgba(10,26,74,0.07)',
        overflow:      'hidden',
        transition:    'box-shadow .2s',
      }}
    >
      {/* En-tête cliquable */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((p) => !p)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((p) => !p)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding:         '14px 18px',
          display:         'flex',
          alignItems:      'flex-start',
          justifyContent:  'space-between',
          cursor:          'pointer',
          background:      hovered ? 'rgba(14,76,122,0.03)' : 'transparent',
          transition:      'background .15s',
          userSelect:      'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badge type */}
          <span style={{
            fontSize:     11,
            fontWeight:   700,
            padding:      '3px 10px',
            borderRadius: 20,
            display:      'inline-block',
            marginBottom: 6,
            background:   badgeBg,
            color:        badgeColor,
          }}>
            {badgeLabel}
          </span>

          {/* Titre */}
          <div style={{
            fontSize:     14,
            fontWeight:   700,
            color:        'var(--pm-text, #0a1a4a)',
            marginBottom: 3,
            lineHeight:   1.35,
          }}>
            {reco.titre ?? reco.title ?? reco.message ?? '—'}
          </div>

          {/* Date */}
          <div style={{
            fontSize:   12,
            color:      'var(--pm-muted, #5a7a9a)',
          }}>
            {formatDate(reco.created_at ?? reco.date)}
          </div>
        </div>

        {/* Chevron + bouton supprimer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12, flexShrink: 0 }}>
          {/* Supprimer unitaire */}
          <button
            title="Supprimer cette recommandation"
            onClick={(e) => { e.stopPropagation(); onDelete(reco.id); }}
            style={{
              border:         'none',
              background:     'none',
              cursor:         'pointer',
              color:          'rgba(192,57,43,0.5)',
              fontSize:       14,
              padding:        '2px 4px',
              borderRadius:   6,
              transition:     'color .15s, background .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color='#c0392b'; e.currentTarget.style.background='#fdecea'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color='rgba(192,57,43,0.5)'; e.currentTarget.style.background='none'; }}
          >
            <i className="fa-solid fa-trash-can" />
          </button>

          {/* Chevron */}
          <i
            className="fa-solid fa-chevron-down"
            style={{
              fontSize:   14,
              color:      'var(--pm-muted, #5a7a9a)',
              transition: 'transform .25s',
              transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </div>

      {/* Corps déroulant */}
      {open && (
        <div
          style={{
            padding:    '0 18px 16px',
            fontSize:   13.5,
            color:      'var(--pm-muted, #5a7a9a)',
            lineHeight: 1.65,
            animation:  'fadeUp .2s ease',
            borderTop:  '1px solid rgba(14,76,122,0.07)',
            paddingTop: 12,
          }}
        >
          {reco.contenu ?? reco.content ?? reco.description ?? '(Aucun détail disponible)'}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function RecommendationsTab({ accentColor = '#1a7a3a', accentLight = '#e8f5ec' }) {
  const { user } = useContext(AuthContext);

  // ── States ─────────────────────────────────────────────────
  const [recos,      setRecos]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [deleting,   setDeleting]   = useState(false); // suppression globale en cours

  // ── Chargement initial ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchRecos() {
      setLoading(true);
      setError(null);
      try {
        const data = await getRecommendations();
        if (!cancelled) setRecos(Array.isArray(data) ? data : (data?.recommendations ?? []));
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRecos();
    return () => { cancelled = true; };
  }, []);

  // ── Suppression d'une reco ─────────────────────────────────
  async function handleDelete(id) {
    try {
      await deleteRecommendation(id);
      setRecos((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Silencieux — la reco reste visible si la suppression échoue
    }
  }

  // ── Suppression globale ────────────────────────────────────
  async function handleDeleteAll() {
    if (!window.confirm('Supprimer toutes les recommandations ?')) return;
    setDeleting(true);
    try {
      await deleteAllRecommendations();
      setRecos([]);
    } catch (err) {
      setError('Impossible de supprimer toutes les recommandations');
    } finally {
      setDeleting(false);
    }
  }

  // ── Séparation urgentes / non urgentes ─────────────────────
  const urgentes    = recos.filter((r) => r.urgente ?? r.is_urgent ?? r.type === 'urgent');
  const nonUrgentes = recos.filter((r) => !(r.urgente ?? r.is_urgent ?? r.type === 'urgent'));

  // ── Profil actif ───────────────────────────────────────────
  const profilLabel = buildProfilLabel(user);

  // ── Styles ─────────────────────────────────────────────────
  const border  = 'rgba(14,76,122,0.12)';
  const cardBg  = 'var(--pm-card, #ffffff)';
  const textPri = 'var(--pm-text, #0a1a4a)';
  const textMut = 'var(--pm-muted, #5a7a9a)';

  const S = {
    root: {
      padding:    24,
      flex:       1,
      overflowY:  'auto',
      fontFamily: 'Nunito, sans-serif',
    },

    // Barre du haut
    topbar: {
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      marginBottom:   22,
      flexWrap:       'wrap',
      gap:            12,
    },
    profilLine: {
      fontSize:   15,
      color:      textMut,
      fontWeight: 600,
    },
    profilValue: {
      color:      textPri,
      fontWeight: 700,
    },

    // Bouton "Tout supprimer"
    delBtn: {
      display:      'flex',
      alignItems:   'center',
      gap:          7,
      padding:      '9px 18px',
      border:       '1.5px solid #c0392b',
      borderRadius: 9,
      background:   'none',
      color:        '#c0392b',
      fontSize:     13,
      fontWeight:   700,
      cursor:       'pointer',
      fontFamily:   'Nunito, sans-serif',
      transition:   'background .2s',
      opacity:      deleting ? 0.6 : 1,
    },

    // Titres de section
    sectionTitle: (color) => ({
      fontFamily:   'Syne, sans-serif',
      fontSize:     15,
      fontWeight:   700,
      marginBottom: 12,
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      color,
    }),

    // Séparateur entre sections
    sep: {
      marginTop: 20,
      marginBottom: 6,
    },

    // État vide
    emptyWrap: {
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      padding:        '60px 24px',
      color:          textMut,
      gap:            10,
    },
    emptyIco: {
      fontSize:     52,
      opacity:      .35,
      marginBottom: 6,
    },
    emptyTxt: {
      fontSize:   15,
      fontWeight: 700,
    },
    emptySub: {
      fontSize:   13,
      textAlign:  'center',
      maxWidth:   320,
      lineHeight: 1.55,
    },

    // Loading / Error
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
      width:        38,
      height:       38,
      border:       `4px solid ${border}`,
      borderTop:    `4px solid ${accentColor}`,
      borderRadius: '50%',
      animation:    'spin 0.9s linear infinite',
    },
    errorBox: {
      padding:      '16px 20px',
      background:   '#fdecea',
      borderRadius: 10,
      border:       '1px solid #c0392b',
      color:        '#c0392b',
      fontSize:     13.5,
      fontWeight:   600,
      marginBottom: 16,
    },
  };

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={S.root}>

        {/* ── Topbar ─────────────────────────────────────── */}
        <div style={S.topbar}>
          <div style={S.profilLine}>
            Profil actif :&nbsp;
            <span style={S.profilValue}>{profilLabel}</span>
          </div>

          {recos.length > 0 && (
            <button
              style={S.delBtn}
              disabled={deleting}
              onClick={handleDeleteAll}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fdecea'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <i className="fa-solid fa-trash" />
              {deleting ? 'Suppression…' : 'Tout supprimer'}
            </button>
          )}
        </div>

        {/* ── Erreur ─────────────────────────────────────── */}
        {error && (
          <div style={S.errorBox}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
            {error}
          </div>
        )}

        {/* ── Chargement ─────────────────────────────────── */}
        {loading ? (
          <div style={S.loadingWrap}>
            <div style={S.spinner} />
            <span>Chargement des recommandations…</span>
          </div>

        ) : recos.length === 0 ? (

          /* ── État vide ─────────────────────────────────── */
          <div style={S.emptyWrap}>
            <div style={S.emptyIco}>📭</div>
            <div style={S.emptyTxt}>Aucune recommandation</div>
            <div style={S.emptySub}>
              Les recommandations apparaîtront ici selon vos cultures et les conditions météo.
            </div>
          </div>

        ) : (
          <>
            {/* ── Section URGENTES ───────────────────────── */}
            {urgentes.length > 0 && (
              <>
                <div style={S.sectionTitle('#c0392b')}>
                  <i className="fa-solid fa-triangle-exclamation" />
                  Urgentes — Action immédiate requise
                </div>
                {urgentes.map((r) => (
                  <RecoCard
                    key={r.id}
                    reco={r}
                    isUrgent
                    accentColor={accentColor}
                    accentLight={accentLight}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}

            {/* ── Section NON URGENTES ───────────────────── */}
            {nonUrgentes.length > 0 && (
              <>
                <div style={{ ...S.sectionTitle(accentColor), ...(urgentes.length > 0 ? S.sep : {}) }}>
                  <i className="fa-solid fa-circle-check" />
                  Non urgentes — Optimisation
                </div>
                {nonUrgentes.map((r) => (
                  <RecoCard
                    key={r.id}
                    reco={r}
                    isUrgent={false}
                    accentColor={accentColor}
                    accentLight={accentLight}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
