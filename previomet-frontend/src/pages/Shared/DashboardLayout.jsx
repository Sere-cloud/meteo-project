// src/pages/Shared/DashboardLayout.jsx
import { useContext }  from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Sidebar         from './Sidebar';
import { TAB_TITLES }  from '../../constants/navigation';
import { TOPBAR, FONTS, SHADOW, COLORS, SIDEBAR_GRADIENTS, FARMER_THEME } from '../../constants/theme';

export default function DashboardLayout({
  navItems, activeTab, onTabChange, children,
  recoCount       = 0,
  sidebarGradient = SIDEBAR_GRADIENTS.logistics,
  pageBg          = COLORS.pageBg,
  accentColor     = COLORS.blueDark,
  avatarGradient  = `linear-gradient(135deg, ${COLORS.blueDark}, ${COLORS.teal})`,
}) {
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const handleLogout     = () => { logout(); navigate('/login', { replace: true }); };
  const topbarTitle      = TAB_TITLES[activeTab] ?? activeTab;

  const isFarmer = accentColor === FARMER_THEME.accentColor;
  const textPri  = isFarmer ? '#0D3D2B' : COLORS.textPrimary;
  const textMut  = isFarmer ? '#2D6B4A' : COLORS.textMuted;
  const border   = isFarmer ? 'rgba(13,61,43,0.12)' : COLORS.border;

  const getInitials = (u = '') => {
    const p = u.split('_').filter(Boolean);
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : u.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .pm-content::-webkit-scrollbar{width:5px}
        .pm-content::-webkit-scrollbar-thumb{background:${isFarmer?'rgba(13,61,43,0.18)':'rgba(14,76,122,0.18)'};border-radius:3px}
      `}</style>

      {/* ✅ Ce div EST le seul conteneur 100vh — les dashboards parents ne doivent plus en ajouter un */}
      <div style={{
        display:'flex', height:'100vh', overflow:'hidden',
        fontFamily:FONTS.body, background:pageBg,
        '--pm-bg':pageBg, '--pm-card':COLORS.cardBg,
        '--pm-surface':isFarmer?'#f2f8f5':'#f8fafc',
        '--pm-border':border, '--pm-text':textPri, '--pm-muted':textMut,
        '--pm-topbar':COLORS.white, '--pm-accent':accentColor,
      }}>
        <Sidebar
          navItems={navItems} activeTab={activeTab} onTabChange={onTabChange}
          onLogout={handleLogout} recoCount={recoCount} sidebarGradient={sidebarGradient}
        />

        {/* Colonne droite : topbar fixe + contenu scrollable */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minWidth:0 }}>
          <header style={{
            background:COLORS.white, borderBottom:`1px solid ${border}`,
            padding:'0 clamp(12px,3%,28px)', height:TOPBAR.height,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            flexShrink:0, boxShadow:SHADOW.sm, gap:8, overflow:'hidden',
          }}>
            <span style={{ fontFamily:FONTS.title, fontSize:18, fontWeight:700, color:textPri }}>
              {topbarTitle}
            </span>
            <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:textMut, minWidth:0, flexShrink:1, overflow:'hidden' }}>
              {user?.ville && (
                <>
                  <i className="fa-solid fa-map-pin" style={{ fontSize:15, color:textMut }} />
                  <span style={{ color:textPri, fontWeight:600 }}>{user.ville}</span>
                  <span style={{ color:border, userSelect:'none' }}>|</span>
                </>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:14, borderLeft:`1px solid ${border}` }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:avatarGradient, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, flexShrink:0 }}>
                  {getInitials(user?.username ?? '')}
                </div>
                <span style={{ fontSize:13.5, fontWeight:600, color:textPri, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'clamp(60px,15vw,160px)' }}>
                  {user?.username ?? '—'}
                </span>
              </div>
            </div>
          </header>

          {/* ✅ Zone scrollable verticalement, occupe tout l'espace restant */}
          <main key={activeTab} className="pm-content" style={{ flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}