// ============================================================
// DashboardLayout.jsx
// Squelette commun à FarmerDashboard et LogisticsDashboard.
//
// Structure visuelle :
//   ┌──────────┬─────────────────────────────────────────┐
//   │          │  Topbar (titre onglet | ville | avatar) │
//   │ Sidebar  ├─────────────────────────────────────────┤
//   │          │                                         │
//   │          │   Zone contenu (onglet actif)           │
//   │          │                                         │
//   └──────────┴─────────────────────────────────────────┘
//
// Topbar droite : ville de l'utilisateur + avatar initiales + username.
// Pas d'horloge (déjà présente dans le hero de WeatherTab).
// Pas d'icône profil redondante (l'avatar suffit).
//
// Props reçues :
//   navItems    {Array}     — onglets du rôle (depuis navigation.js)
//   activeTab   {string}    — clé de l'onglet affiché
//   onTabChange {Function}  — change l'onglet actif
//   children    {ReactNode} — contenu de l'onglet actif
//
// Ce composant lit AuthContext pour afficher le username
// et la ville dans la topbar — sans les recevoir en prop.
// Le mode sombre est géré ici et propagé vers le bas.
// ============================================================

import { useState, useEffect, useContext } from 'react';
import { useNavigate }                     from 'react-router-dom';
import { AuthContext }                     from '../../context/AuthContext';
import Sidebar                             from './Sidebar';
import { TAB_TITLES }                      from '../../constants/navigation';
import { COLORS, TOPBAR, FONTS, SHADOW }   from '../../constants/theme';

export default function DashboardLayout({
  navItems,
  activeTab,
  onTabChange,
  children,
}) {
  const navigate           = useNavigate();
  const { user, logout }   = useContext(AuthContext);

  // ── Mode sombre ──────────────────────────────────────
  // Persisté dans localStorage pour survivre aux rechargements.
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('previomet_dark') === 'true';
  });

  // Applique / retire la classe 'dark' sur <body> quand isDark change.
  // Cela permet d'éventuelles règles CSS globales liées au thème.
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('previomet_dark', String(isDark));
  }, [isDark]);

  const handleToggleDark = () => setIsDark((prev) => !prev);

  // ── Déconnexion ───────────────────────────────────────
  // Vide le localStorage via la fonction logout d'AuthContext,
  // puis redirige vers /login sans laisser d'historique.
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // ── Titre de la topbar ────────────────────────────────
  // Résolu dynamiquement depuis TAB_TITLES selon l'onglet actif.
  const topbarTitle = TAB_TITLES[activeTab] ?? activeTab;

  // ── Couleurs adaptées au mode sombre ─────────────────
  // Chaque couleur a sa variante claire et sombre.
  // La transition 0.3s rend le basculement fluide et stylé.
  const bg        = isDark ? '#0f172a'                  : COLORS.pageBg;
  const topbarBg  = isDark ? '#1e293b'                  : COLORS.white;
  const border    = isDark ? 'rgba(255,255,255,0.08)'   : COLORS.border;
  const textPri   = isDark ? '#e2e8f0'                  : COLORS.textPrimary;
  const textMut   = isDark ? '#94a3b8'                  : COLORS.textMuted;
  // Fond des cartes dans les onglets — transmis via CSS variable sur root
  const cardBg    = isDark ? '#1e293b'                  : COLORS.cardBg;
  // Fond secondaire (inputs, tableaux, lignes alternées)
  const surfaceBg = isDark ? '#273548'                  : '#f8fafc';

  // ── Styles ────────────────────────────────────────────
  const styles = {
    // Conteneur racine — occupe tout l'écran, pas de scroll global
    // Les CSS variables --pm-* permettent aux onglets enfants de
    // s'adapter au mode sombre sans recevoir de props supplémentaires.
    root: {
      display:         'flex',
      height:          '100vh',
      overflow:        'hidden',
      fontFamily:      FONTS.body,
      background:      bg,
      transition:      'background 0.3s',
      // Variables CSS transmises à tous les enfants via le DOM
      '--pm-bg':       bg,
      '--pm-card':     cardBg,
      '--pm-surface':  surfaceBg,
      '--pm-border':   border,
      '--pm-text':     textPri,
      '--pm-muted':    textMut,
      '--pm-topbar':   topbarBg,
    },

    // Zone droite : topbar + contenu
    main: {
      flex:            1,
      overflow:        'hidden',
      display:         'flex',
      flexDirection:   'column',
      minWidth:        0, // évite le débordement flex
    },

    // Topbar
    topbar: {
      background:      topbarBg,
      borderBottom:    `1px solid ${border}`,
      padding:         `0 28px`,
      height:          TOPBAR.height,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'space-between',
      flexShrink:      0,
      boxShadow:       SHADOW.sm,
      transition:      'background 0.3s, border-color 0.3s',
    },

    // Titre de l'onglet actif — à gauche de la topbar
    topbarTitle: {
      fontFamily:      FONTS.title,
      fontSize:        18,
      fontWeight:      700,
      color:           textPri,
      transition:      'color 0.3s',
    },

    // Zone droite de la topbar : ville | avatar + username
    topbarRight: {
      display:         'flex',
      alignItems:      'center',
      gap:             14,
      fontSize:        13.5,
      color:           textMut,
      transition:      'color 0.3s',
    },

    topbarIcon: {
      fontSize:        15,
    },

    topbarSep: {
      color:           border,
      userSelect:      'none',
    },

    // Avatar + username (à droite, comme dans l'image fournie)
    userBadge: {
      display:         'flex',
      alignItems:      'center',
      gap:             8,
      paddingLeft:     14,
      borderLeft:      `1px solid ${border}`,
    },

    avatar: {
      width:           32,
      height:          32,
      borderRadius:    '50%',
      background:      `linear-gradient(135deg, ${COLORS.blueDark}, ${COLORS.teal})`,
      display:         'flex',
      alignItems:      'center',
      justifyContent:  'center',
      color:           'white',
      fontSize:        13,
      fontWeight:      700,
      flexShrink:      0,
      userSelect:      'none',
    },

    username: {
      fontSize:        13.5,
      fontWeight:      600,
      color:           textPri,
      transition:      'color 0.3s',
    },

    // Zone de contenu de l'onglet actif — scrollable verticalement
    contentZone: {
      flex:            1,
      overflowY:       'auto',
      display:         'flex',
      flexDirection:   'column',
      // Animation fadeUp à chaque changement d'onglet
      animation:       'fadeUp 0.3s ease',
      background:      bg,
      transition:      'background 0.3s',
    },
  };

  // Initiales de l'utilisateur pour l'avatar (ex: "MA" pour marie_atangana)
  const getInitials = (username = '') => {
    const parts = username.split('_').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Keyframe fadeUp injectée une seule fois dans le <head> via un style tag */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        /* Scrollbar discrète sur la zone de contenu */
        .pm-content::-webkit-scrollbar { width: 5px; }
        .pm-content::-webkit-scrollbar-thumb {
          background: rgba(14,76,122,0.18);
          border-radius: 3px;
        }
      `}</style>

      <div style={styles.root}>

        {/* ── Sidebar ── */}
        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          isDark={isDark}
          onToggleDark={handleToggleDark}
          onLogout={handleLogout}
        />

        {/* ── Zone principale droite ── */}
        <div style={styles.main}>

          {/* ── Topbar ── */}
          <header style={styles.topbar}>

            {/* Gauche : titre de l'onglet actif */}
            <span style={styles.topbarTitle}>{topbarTitle}</span>

            {/* Droite : ville | avatar + username */}
            <div style={styles.topbarRight}>

              {/* Ville — affichée uniquement si disponible */}
              {user?.ville && (
                <>
                  <i className="fa-solid fa-map-pin" style={styles.topbarIcon} />
                  <span>{user.ville}</span>
                  <span style={styles.topbarSep}>|</span>
                </>
              )}

              {/* Avatar circulaire (initiales) + username */}
              <div style={styles.userBadge}>
                <div style={styles.avatar} title={user?.username ?? ''}>
                  {getInitials(user?.username ?? '')}
                </div>
                <span style={styles.username}>
                  {user?.username ?? '—'}
                </span>
              </div>

            </div>
          </header>

          {/* ── Contenu de l'onglet actif ── */}
          {/*
            La prop `key={activeTab}` force React à démonter/remonter
            le contenu à chaque changement d'onglet, ce qui :
              1. Relance l'animation fadeUp
              2. Réinitialise les états locaux de chaque onglet
              3. Redéclenche les useEffect (appels API) de l'onglet
          */}
          <main
            key={activeTab}
            className="pm-content"
            style={styles.contentZone}
          >
            {children}
          </main>

        </div>
      </div>
    </>
  );
}
