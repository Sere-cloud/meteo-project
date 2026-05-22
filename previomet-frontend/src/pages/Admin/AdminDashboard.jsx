// src/pages/Admin/AdminDashboard.jsx

import { useState }        from 'react';
import { useContext }      from 'react';
import { AuthContext }     from '../../context/AuthContext';
import DashboardLayout     from '../Shared/DashboardLayout';
import OverviewTab         from './tabs/OverviewTab';
import WeatherTab          from '../Shared/tabs/WeatherTab';
import ModelsTab           from './tabs/ModelsTab';
import UsersTab            from './tabs/UsersTab';
import { NAV_ADMIN, DEFAULT_TAB_ADMIN } from '../../constants/navigation';
import { ADMIN_THEME }     from '../../constants/theme';
import adImg               from '../../assets/ad.png';

const ACCENT       = ADMIN_THEME.accentColor;
const ACCENT_LIGHT = ADMIN_THEME.accentLight;
const SIDEBAR_GRAD = ADMIN_THEME.sidebarGradient;
const PAGE_BG      = ADMIN_THEME.pageBg;
const AVATAR_GRAD  = ADMIN_THEME.avatarGradient;

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState(DEFAULT_TAB_ADMIN);

  // L'admin n'a pas de badge recommandations
  // Le logout est géré directement par DashboardLayout via AuthContext

  function renderTab() {
    switch (activeTab) {
      case 'tableau_de_bord': return <OverviewTab />;
      case 'meteo':
        return (
          <WeatherTab
            heroImage={adImg}
            accentColor={ACCENT}
            accentLight={ACCENT_LIGHT}
            isAdmin={true}
            showComparison={true}
          />
        );
      case 'modeles':      return <ModelsTab />;
      case 'utilisateurs': return <UsersTab />;
      default:             return <OverviewTab />;
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardLayout
        navItems={NAV_ADMIN}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recoCount={0}
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