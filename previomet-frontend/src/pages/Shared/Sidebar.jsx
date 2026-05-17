// ============================================================
// Sidebar.jsx
// Composant sidebar réutilisable — Agriculteur & Logisticien.
//
// Props reçues :
//   navItems   {Array}    — liste d'onglets depuis navigation.js
//                           [{ key, label, icon }]
//   activeTab  {string}   — clé de l'onglet actuellement actif
//   onTabChange {Function} — appelée avec la clé du nouvel onglet
//   isDark     {boolean}  — état du mode sombre
//   onToggleDark {Function} — bascule le mode sombre
//   onLogout   {Function} — gère la déconnexion
//
// Ce composant ne connaît pas le rôle de l'utilisateur.
// Il reçoit uniquement ce dont il a besoin via les props.
// ============================================================

import { useState } from 'react';
import { COLORS, SIDEBAR, FONTS } from '../../constants/theme';

// -------------------------------------------------------
// Sous-composant : Logo SVG PrevioMet
// Le SVG nuage + signal est défini une seule fois ici.
// -------------------------------------------------------
function LogoSVG() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 40 40"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <ellipse cx="20" cy="26" rx="16" ry="10"
        fill="rgba(255,255,255,0.25)" stroke="white" strokeWidth="2" />
      <ellipse cx="14" cy="20" rx="11" ry="8"
        fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="2" />
      <ellipse cx="26" cy="19" rx="10" ry="7"
        fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="2" />
      <path
        d="M8 26 Q13 17 20 22 Q26 14 33 19"
        stroke="#7dd3fc" strokeWidth="2.2"
        strokeLinecap="round" fill="none"
      />
      <circle cx="33" cy="19" r="3" fill="#7dd3fc" />
    </svg>
  );
}

// -------------------------------------------------------
// Composant principal : Sidebar
// -------------------------------------------------------
export default function Sidebar({
  navItems,
  activeTab,
  onTabChange,
  isDark,
  onToggleDark,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Largeur courante selon l'état ouvert/fermé
  const sidebarWidth = isOpen ? SIDEBAR.widthOpen : SIDEBAR.widthClosed;

  // -------------------------------------------------------
  // STYLES
  // Définis en objets JS pour garder tout dans un seul fichier
  // et pouvoir calculer dynamiquement (ex: width selon isOpen).
  // -------------------------------------------------------
  const styles = {
    sidebar: {
      width: sidebarWidth,
      minWidth: sidebarWidth,
      background: COLORS.sidebarBg,
      display: 'flex',
      flexDirection: 'column',
      transition: `width ${SIDEBAR.transitionMs}ms cubic-bezier(0.4,0,0.2,1),
                   min-width ${SIDEBAR.transitionMs}ms cubic-bezier(0.4,0,0.2,1)`,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 20,
      flexShrink: 0,
    },

    // En-tête : hamburger + logo
    header: {
      padding: '18px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      minHeight: 70,
      flexShrink: 0,
    },

    hamburger: {
      width: 40,
      height: 40,
      borderRadius: 10,
      background: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: 17,
      flexShrink: 0,
      transition: 'background 0.2s',
    },

    // Logo texte — disparaît quand la sidebar est fermée
    logoWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.2s',
    },

    logoText: {
      fontFamily: FONTS.title,
      fontWeight: 800,
      fontSize: 19,
      color: 'white',
      letterSpacing: '-0.3px',
    },

    // Zone de navigation centrale — scrollable si beaucoup d'onglets
    navZone: {
      flex: 1,
      padding: '10px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      overflowY: 'auto',
      overflowX: 'hidden',
    },

    // Un item de navigation
    navItem: (isActive) => ({
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 12px',
      borderRadius: 10,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
      fontFamily: FONTS.body,
      fontSize: 14,
      fontWeight: isActive ? 700 : 500,
      background: isActive
        ? 'rgba(255,255,255,0.18)'
        : 'transparent',
      transition: 'all 0.2s',
      overflow: 'hidden',
      userSelect: 'none',
    }),

    navIcon: {
      fontSize: 17,
      flexShrink: 0,
      width: 20,
      textAlign: 'center',
    },

    navLabel: {
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 0.15s',
      pointerEvents: isOpen ? 'auto' : 'none',
    },

    // Séparateur entre la nav et le pied de sidebar
    footer: {
      padding: 8,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    },

    // Toggle mode sombre — style interrupteur/torche ON/OFF
    modeRow: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 10,
      cursor: 'pointer',
      color: 'rgba(255,255,255,0.75)',
      fontFamily: FONTS.body,
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      transition: 'background 0.2s',
      userSelect: 'none',
    },

    // Le switch visuel (pastille qui glisse)
    switchTrack: {
      width: 36,
      height: 20,
      borderRadius: 10,
      background: isDark
        ? 'rgba(125,211,252,0.5)'
        : 'rgba(255,255,255,0.2)',
      position: 'relative',
      flexShrink: 0,
      transition: 'background 0.2s',
    },

    switchThumb: {
      position: 'absolute',
      top: 3,
      left: isDark ? 19 : 3,
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s',
    },

    modeLabel: {
      opacity: isOpen ? 1 : 0,
      transition: 'opacity 0.15s',
      flex: 1,
    },

    // Bouton déconnexion
    disconnectItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '11px 12px',
      borderRadius: 10,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      color: 'rgba(255,130,130,0.85)',
      fontFamily: FONTS.body,
      fontSize: 14,
      fontWeight: 500,
      transition: 'all 0.2s',
      overflow: 'hidden',
      userSelect: 'none',
    },
  };

  // -------------------------------------------------------
  // Gestion du hover sur les nav items (état local)
  // -------------------------------------------------------
  const [hoveredKey, setHoveredKey] = useState(null);
  const [hoveredDisconnect, setHoveredDisconnect] = useState(false);
  const [hoveredMode, setHoveredMode] = useState(false);

  return (
    <aside style={styles.sidebar}>

      {/* ── En-tête : hamburger + logo ── */}
      <div style={styles.header}>
        <button
          style={styles.hamburger}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}
          title={isOpen ? 'Réduire' : 'Agrandir'}
        >
          <i className={`fa-solid ${isOpen ? 'fa-bars' : 'fa-bars'}`} />
        </button>

        <div style={styles.logoWrap}>
          <LogoSVG />
          <span style={styles.logoText}>PrevioMet</span>
        </div>
      </div>

      {/* ── Navigation principale ── */}
      <nav style={styles.navZone}>
        {navItems.map((item) => {
          const isActive = item.key === activeTab;
          const isHovered = hoveredKey === item.key;

          return (
            <div
              key={item.key}
              style={{
                ...styles.navItem(isActive),
                // Hover uniquement si non actif
                background: isActive
                  ? 'rgba(255,255,255,0.18)'
                  : isHovered
                  ? 'rgba(255,255,255,0.12)'
                  : 'transparent',
                color: isActive || isHovered ? 'white' : 'rgba(255,255,255,0.7)',
              }}
              onClick={() => onTabChange(item.key)}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTabChange(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              <i className={item.icon} style={styles.navIcon} />
              <span style={styles.navLabel}>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* ── Pied de sidebar : mode + déconnexion ── */}
      <div style={styles.footer}>

        {/* Toggle mode clair / sombre */}
        <div
          style={{
            ...styles.modeRow,
            background: hoveredMode
              ? 'rgba(255,255,255,0.08)'
              : 'transparent',
          }}
          onClick={onToggleDark}
          onMouseEnter={() => setHoveredMode(true)}
          onMouseLeave={() => setHoveredMode(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggleDark()}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {/* Icône soleil / lune */}
          <i
            className={`fa-solid ${isDark ? 'fa-moon' : 'fa-sun'}`}
            style={{ ...styles.navIcon, color: isDark ? '#7dd3fc' : '#fcd34d' }}
          />

          {/* Label + switch visuel */}
          <span style={styles.modeLabel}>
            {isDark ? 'Mode sombre' : 'Mode clair'}
          </span>

          {/* Switch interrupteur — visible uniquement si sidebar ouverte */}
          {isOpen && (
            <div style={styles.switchTrack}>
              <div style={styles.switchThumb} />
            </div>
          )}
        </div>

        {/* Bouton déconnexion */}
        <div
          style={{
            ...styles.disconnectItem,
            background: hoveredDisconnect
              ? 'rgba(255,80,80,0.15)'
              : 'transparent',
            color: hoveredDisconnect
              ? '#ff9090'
              : 'rgba(255,130,130,0.85)',
          }}
          onClick={onLogout}
          onMouseEnter={() => setHoveredDisconnect(true)}
          onMouseLeave={() => setHoveredDisconnect(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onLogout()}
          aria-label="Se déconnecter"
        >
          <i
            className="fa-solid fa-right-from-bracket"
            style={styles.navIcon}
          />
          <span style={styles.navLabel}>Déconnexion</span>
        </div>
      </div>

    </aside>
  );
}
