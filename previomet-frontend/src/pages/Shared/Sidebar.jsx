// src/pages/Shared/Sidebar.jsx

import { useState, useEffect }               from 'react';
import { SIDEBAR, FONTS }         from '../../constants/theme';
import logoWhite                  from '../../assets/atmospheric-conditions white.png';
import exitIcon                   from '../../assets/exit.png';

export default function Sidebar({
  navItems,
  activeTab,
  onTabChange,
  onLogout,
  recoCount        = 0,
  sidebarGradient  = 'linear-gradient(180deg, #0a1a4a 0%, #0e4f7a 55%, #0e7c8a 100%)',
}) {
  const [isOpen,            setIsOpen]            = useState(true);
  
  const [hoveredKey, setHoveredKey]        = useState(null);
  const [hoveredDisconnect, setHoveredDisconnect] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsOpen(false); // sidebar fermée par défaut sur mobile
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const sidebarWidth = isOpen ? SIDEBAR.widthOpen : SIDEBAR.widthClosed;

  const S = {
    sidebar: {
      width: sidebarWidth,
      minWidth: isMobile ? 0 : sidebarWidth,
      background: sidebarGradient,
      display: 'flex', flexDirection: 'column',
      transition: `width ${SIDEBAR.transitionMs}ms cubic-bezier(0.4,0,0.2,1),
                   min-width ${SIDEBAR.transitionMs}ms cubic-bezier(0.4,0,0.2,1)`,
      overflow: 'hidden',
      // Sur mobile : superposition en overlay
      position: isMobile ? 'absolute' : 'relative',
      top: isMobile ? 0 : 'auto',
      left: isMobile ? 0 : 'auto',
      height: isMobile ? '100%' : 'auto',
      zIndex: 20, flexShrink: 0,
    },
    header: {
      padding: '18px 6px', display: 'flex', alignItems: 'center', gap: 6,
      borderBottom: '1px solid rgba(255,255,255,0.12)', minHeight: 70, flexShrink: 0,
    },
    hamburger: {
      width: 50, height: 50, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, transition: 'background 0.2s',
      background: 'none', border: 'none', padding: 0,
    },
    logoWrap: {
      display: 'flex', alignItems: 'center', gap: 9,
      whiteSpace: 'nowrap', overflow: 'hidden',
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'auto' : 'none',
      transition: 'opacity 0.2s',
    },
    logoText: {
      fontFamily: FONTS.title, fontWeight: 800,
      fontSize: 26, color: 'white', letterSpacing: '0.8px',
    },
    navZone: {
      flex: 1, padding: '10px 8px',
      display: 'flex', flexDirection: 'column', gap: 6,
      overflowY: 'auto', overflowX: 'hidden',
    },
    navItem: (isActive, isHovered) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px', borderRadius: 10, cursor: 'pointer',
      whiteSpace: 'nowrap', fontFamily: FONTS.body, fontSize: 14,
      fontWeight: isActive ? 700 : 500,
      color: 'white',
      background: isActive
        ? 'rgba(255,255,255,0.22)'
        : isHovered ? 'rgba(255,255,255,0.13)' : 'transparent',
      opacity: isActive ? 1 : isHovered ? 1 : 0.85,
      transition: 'all 0.2s', overflow: 'hidden', userSelect: 'none',
      position: 'relative',
      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    }),
    navIconWrap: { position: 'relative', flexShrink: 0, width: 22, textAlign: 'center' },
    // Icônes images : filtrées en blanc pour s'harmoniser avec tous les fonds de sidebar
    navIconImg: {
      width: 20, height: 20, objectFit: 'contain',
      filter: 'brightness(0) invert(1)',
      display: 'block', margin: '0 auto',
    },
    navIconFA: { fontSize: 17, color: 'white', width: 22, textAlign: 'center' },
    navLabel: {
      opacity: isOpen ? 1 : 0, transition: 'opacity 0.15s',
      pointerEvents: isOpen ? 'auto' : 'none',
      flex: 1, color: 'white',
    },
    footer: {
      padding: '6px 8px 10px',
      borderTop: '1px solid rgba(255,255,255,0.12)',
      display: 'flex', flexDirection: 'column', gap: 2,
    },
    // Déconnexion : blanc de base, fond rouge vif + ombre au hover
    disconnectItem: (hovered) => ({
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 12px', borderRadius: 10, cursor: 'pointer',
      whiteSpace: 'nowrap', fontFamily: FONTS.body, fontSize: 14, fontWeight: 600,
      transition: 'all 0.2s', overflow: 'hidden', userSelect: 'none',
      background: hovered ? '#e74c3c' : 'rgba(255,255,255,0.07)',
      color: 'white',
      border: hovered ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
      boxShadow: hovered ? '0 2px 12px rgba(231,76,60,0.4)' : 'none',
    }),
    disconnectIconImg: {
      width: 20, height: 20, objectFit: 'contain',
      filter: 'brightness(0) invert(1)',
      flexShrink: 0, display: 'block',
    },
  };

  return (
    <aside style={S.sidebar}>

      {/* ── En-tête / Hamburger ── */}
      <div style={S.header}>
        <button
          style={S.hamburger}
          onClick={() => setIsOpen(p => !p)}
          aria-label={isOpen ? 'Fermer la sidebar' : 'Ouvrir la sidebar'}
        >
          <img src={logoWhite} alt="PrevioMet"
            style={{ width: 32, height: 32, objectFit: 'contain', display: 'block' }}
          />
        </button>
        <div style={S.logoWrap}>
          <span style={S.logoText}>PrevioMet</span>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={S.navZone}>
        {navItems.map((item) => {
          const isActive  = item.key === activeTab;
          const isHovered = hoveredKey === item.key;
          const showBadge = item.key === 'recommandations' && recoCount > 0;

          return (
            <div
              key={item.key}
              style={S.navItem(isActive, isHovered)}
              onClick={() => onTabChange(item.key)}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTabChange(item.key)}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* ── Icône : image PNG si disponible, sinon FontAwesome ── */}
              <div style={S.navIconWrap}>
                {item.iconImg ? (
                  <img src={item.iconImg} alt="" style={S.navIconImg} aria-hidden="true" />
                ) : (
                  <i className={item.icon} style={S.navIconFA} aria-hidden="true" />
                )}
                {/* Badge rouge */}
                {showBadge && (
                  <span style={{
                    position: 'absolute', top: -3, right: -5,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#e74c3c',
                    border: '1.5px solid rgba(0,0,0,0.25)',
                    display: 'block',
                  }} />
                )}
              </div>

              {/* ── Label + compteur badge ── */}
              <span style={S.navLabel}>
                {item.label}
                {showBadge && isOpen && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 800,
                    background: '#e74c3c', color: 'white',
                    borderRadius: 20, padding: '1px 6px',
                    verticalAlign: 'middle', lineHeight: 1.4,
                  }}>
                    {recoCount}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </nav>

      {/* ── Pied : déconnexion ── */}
      <div style={S.footer}>
        <div
          style={S.disconnectItem(hoveredDisconnect)}
          onClick={onLogout}
          onMouseEnter={() => setHoveredDisconnect(true)}
          onMouseLeave={() => setHoveredDisconnect(false)}
          role="button" tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onLogout()}
          aria-label="Se déconnecter"
        >
          {/* Icône exit.png — filtrée en blanc */}
          <img src={exitIcon} alt="" style={S.disconnectIconImg} aria-hidden="true" />
          <span style={{ ...S.navLabel, opacity: isOpen ? 1 : 0 }}>
            Déconnexion
          </span>
        </div>
      </div>

    </aside>
  );
}