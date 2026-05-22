// src/pages/Shared/DashboardLayout.jsx

import { useContext }  from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Sidebar         from './Sidebar';
import { TAB_TITLES }  from '../../constants/navigation';
import {
  TOPBAR, FONTS, SHADOW,
  COLORS,
  SIDEBAR_GRADIENTS,
  FARMER_THEME,
} from '../../constants/theme';

export default function DashboardLayout({
  navItems,
  activeTab,
  onTabChange,
  children,
  recoCount        = 0,
  sidebarGradient  = SIDEBAR_GRADIENTS.logistics,
  pageBg           = COLORS.pageBg,
  accentColor      = COLORS.blueDark,
  avatarGradient   = `linear-gradient(135deg, ${COLORS.blueDark}, ${COLORS.teal})`,
}) {
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const topbarTitle = TAB_TITLES[activeTab] ?? activeTab;

  // ── Couleur de texte principal selon le rôle ──────────────────────────────
  // Dashboard agriculteur → #0D3D2B (vert foncé du dégradé)
  // Autres dashboards     → #0a1a4a (bleu foncé habituel)
  const isFarmer  = accentColor === FARMER_THEME.accentColor;
  const textPri   = isFarmer ? '#0D3D2B' : COLORS.textPrimary;
  const textMut   = isFarmer ? '#2D6B4A' : COLORS.textMuted;   // mutée légèrement verte aussi

  const topbarBg  = COLORS.white;
  const border    = isFarmer ? 'rgba(13,61,43,0.12)' : COLORS.border;
  const cardBg    = COLORS.cardBg;
  const surfaceBg = isFarmer ? '#f2f8f5' : '#f8fafc';

  const styles = {
    root: {
      display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative',
      fontFamily: FONTS.body, background: pageBg,
      '--pm-bg':      pageBg,
      '--pm-card':    cardBg,
      '--pm-surface': surfaceBg,
      '--pm-border':  border,
      '--pm-text':    textPri,    // ← injecté ici, propagé à tous les composants enfants
      '--pm-muted':   textMut,    // ← idem
      '--pm-topbar':  topbarBg,
      '--pm-accent':  accentColor,
    },
    main: {
      flex: 1, overflow: 'hidden',
      display: 'flex', flexDirection: 'column', minWidth: 0,
    },
    topbar: {
      background: topbarBg,
      borderBottom: `1px solid ${border}`,
      padding: '0 clamp(12px, 3%, 28px)',
      height: TOPBAR.height,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, boxShadow: SHADOW.sm,
      gap: 8, overflow: 'hidden',
    },
    // Intitulé de l'onglet actif dans la topbar → couleur du rôle
    topbarTitle: {
      fontFamily: FONTS.title, fontSize: 18, fontWeight: 700,
      color: textPri,
    },
    topbarRight: {
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13.5, color: textMut,
      minWidth: 0, flexShrink: 1, overflow: 'hidden',
    },
    topbarSep: { color: border, userSelect: 'none' },
    userBadge: {
      display: 'flex', alignItems: 'center', gap: 8,
      paddingLeft: 14, borderLeft: `1px solid ${border}`,
    },
    avatar: {
      width: 32, height: 32, borderRadius: '50%',
      background: avatarGradient,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: 13, fontWeight: 700,
      flexShrink: 0, userSelect: 'none',
    },
    // Nom d'utilisateur dans la topbar
    username: {
      fontSize: 13.5, fontWeight: 600, color: textPri,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      maxWidth: 'clamp(60px, 15vw, 160px)',
    },
  };

  const getInitials = (u = '') => {
    const parts = u.split('_').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return u.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pm-content::-webkit-scrollbar { width: 5px; }
        .pm-content::-webkit-scrollbar-thumb {
          background: ${isFarmer ? 'rgba(13,61,43,0.18)' : 'rgba(14,76,122,0.18)'}; border-radius: 3px;
        }
      `}</style>

      <div style={styles.root}>
        <Sidebar
          navItems={navItems}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onLogout={handleLogout}
          recoCount={recoCount}
          sidebarGradient={sidebarGradient}
        />

        <div style={styles.main}>
          <header style={styles.topbar}>
            <span style={styles.topbarTitle}>{topbarTitle}</span>
            <div style={styles.topbarRight}>
              {user?.ville && (
                <>
                  <i className="fa-solid fa-map-pin" style={{ fontSize: 15, color: textMut }} />
                  {/* Ville affichée dans la couleur du rôle */}
                  <span style={{ color: textPri, fontWeight: 600 }}>{user.ville}</span>
                  <span style={styles.topbarSep}>|</span>
                </>
              )}
              <div style={styles.userBadge}>
                <div style={styles.avatar} title={user?.username ?? ''}>
                  {getInitials(user?.username ?? '')}
                </div>
                <span style={styles.username}>{user?.username ?? '—'}</span>
              </div>
            </div>
          </header>

          <main key={activeTab} className="pm-content" style={styles.contentZone}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}