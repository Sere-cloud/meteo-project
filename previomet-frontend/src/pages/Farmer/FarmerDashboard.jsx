// src/pages/Farmer/FarmerDashboard.jsx

import { useState, useContext, useRef } from 'react';
import { useNavigate }    from 'react-router-dom';
import { AuthContext }    from '../../context/AuthContext';
import { NAV_FARMER }     from '../../constants/navigation';
import { FARMER_THEME }   from '../../constants/theme';
import agriImg            from '../../assets/agri.png';

import DashboardLayout    from '../Shared/DashboardLayout';
import WeatherTab         from '../Shared/tabs/WeatherTab';
import RecommendationsTab from '../Shared/tabs/RecommendationsTab';
import ProfileTab         from '../Shared/tabs/ProfileTab';
import CalendarTab        from './tabs/CalendarTab';

const ACCENT       = FARMER_THEME.accentColor;
const ACCENT_LIGHT = FARMER_THEME.accentLight;
const SIDEBAR_GRAD = FARMER_THEME.sidebarGradient;
const PAGE_BG      = FARMER_THEME.pageBg;
const AVATAR_GRAD  = FARMER_THEME.avatarGradient;

export default function FarmerDashboard() {
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState(NAV_FARMER[0]?.key ?? 'meteo');
  const [recoCount, setRecoCount] = useState(0);

  const recoInitialisé = useRef(false);

  function handleRecoCount(count) {
    if (!recoInitialisé.current) {
      recoInitialisé.current = true;
      if (activeTab !== 'recommandations') setRecoCount(count);
    } else {
      setRecoCount(count);
    }
  }

  function handleTabChange(key) {
    if (key === 'recommandations') setRecoCount(0);
    setActiveTab(key);
  }

  function renderTab() {
    switch (activeTab) {
      case 'meteo':
        return (
          <WeatherTab
            heroImage={agriImg}
            accentColor={ACCENT}
            accentLight={ACCENT_LIGHT}
            isAdmin={false}
            showComparison={false}
          />
        );
      case 'recommandations':
        return (
          <RecommendationsTab
            accentColor={ACCENT}
            accentLight={ACCENT_LIGHT}
            onRecoCount={handleRecoCount}
            showSpecs={true}
          />
        );
      case 'profil':
        return <ProfileTab accentColor={ACCENT} accentLight={ACCENT_LIGHT} showSpecs={true} />;
      case 'calendrier':
        return <CalendarTab accentColor={ACCENT} accentLight={ACCENT_LIGHT} />;
      default:
        return null;
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardLayout
        navItems={NAV_FARMER}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        recoCount={recoCount}
        sidebarGradient={SIDEBAR_GRAD}
        pageBg={PAGE_BG}
        accentColor={ACCENT}
        avatarGradient={AVATAR_GRAD}
      >
        {renderTab()}
      </DashboardLayout>
    </div>
  );
}