// src/pages/Admin/AdminDashboard.jsx
import { useState, useContext } from 'react';
import { AuthContext }     from '../../context/AuthContext';
import DashboardLayout     from '../Shared/DashboardLayout';
import OverviewTab         from './tabs/OverviewTab';
import WeatherTab          from '../Shared/tabs/WeatherTab';
import ModelsTab           from './tabs/ModelsTab';
import UsersTab            from './tabs/UsersTab';
import { NAV_ADMIN, DEFAULT_TAB_ADMIN } from '../../constants/navigation';
import { ADMIN_THEME }     from '../../constants/theme';
import adImg               from '../../assets/ad.png';

const { accentColor:ACCENT, accentLight:ACCENT_LIGHT, sidebarGradient:SIDEBAR_GRAD, pageBg:PAGE_BG, avatarGradient:AVATAR_GRAD } = ADMIN_THEME;

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB_ADMIN);

  function renderTab() {
    switch (activeTab) {
      case 'tableau_de_bord': return <OverviewTab />;
      case 'meteo':           return <WeatherTab heroImage={adImg} accentColor={ACCENT} accentLight={ACCENT_LIGHT} isAdmin showComparison />;
      case 'modeles':         return <ModelsTab />;
      case 'utilisateurs':    return <UsersTab />;
      default:                return <OverviewTab />;
    }
  }

  // ✅ Plus de div wrapper height:100vh
  return (
    <DashboardLayout
      navItems={NAV_ADMIN} activeTab={activeTab} onTabChange={setActiveTab}
      recoCount={0} sidebarGradient={SIDEBAR_GRAD} pageBg={PAGE_BG}
      accentColor={ACCENT} avatarGradient={AVATAR_GRAD}
    >
      {renderTab()}
    </DashboardLayout>
  );
}