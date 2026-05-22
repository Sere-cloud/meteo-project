// src/pages/Logistics/LogisticsDashboard.jsx

import { useState, useContext, useRef } from 'react';
import { useNavigate }       from 'react-router-dom';
import { AuthContext }        from '../../context/AuthContext';
import { NAV_LOGISTICS }     from '../../constants/navigation';
import { LOGISTICS_THEME }   from '../../constants/theme';
import logisImg              from '../../assets/logis.png';

import DashboardLayout       from '../Shared/DashboardLayout';
import WeatherTab            from '../Shared/tabs/WeatherTab';
import RecommendationsTab    from '../Shared/tabs/RecommendationsTab';
import ProfileTab            from '../Shared/tabs/ProfileTab';

const ACCENT       = LOGISTICS_THEME.accentColor;
const ACCENT_LIGHT = LOGISTICS_THEME.accentLight;
const SIDEBAR_GRAD = LOGISTICS_THEME.sidebarGradient;
const PAGE_BG      = LOGISTICS_THEME.pageBg;
const AVATAR_GRAD  = LOGISTICS_THEME.avatarGradient;

export default function LogisticsDashboard() {
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState(NAV_LOGISTICS[0]?.key ?? 'meteo');
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
            heroImage={logisImg}
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
            showSpecs={false}
          />
        );
      case 'profil':
        return <ProfileTab accentColor={ACCENT} accentLight={ACCENT_LIGHT} showSpecs={false} />;
      default:
        return null;
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardLayout
        navItems={NAV_LOGISTICS}
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