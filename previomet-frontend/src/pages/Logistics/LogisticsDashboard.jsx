// ============================================================
// LogisticsDashboard.jsx  —  Fichier 11/12
// Dashboard principal du logisticien.
//
// Rôle : orchestrateur léger, miroir de FarmerDashboard avec
//        les différences propres au rôle logisticien :
//
//   DIFFÉRENCES vs FarmerDashboard :
//   ┌─────────────────────────────────────────────────────────┐
//   │  Onglets      : 3 (pas de CalendarTab)                  │
//   │  Accent       : bleu #0e4f7a / fond #e8f4f8             │
//   │  ProfileTab   : showSpecs = false (pas de spécificités) │
//   │  RecoTab      : accentColor bleu (non urgentes en bleu) │
//   │  WeatherTab   : image hero logistique                   │
//   └─────────────────────────────────────────────────────────┘
//
// CE QUI EST IDENTIQUE à FarmerDashboard :
//   - DashboardLayout (sidebar + topbar)
//   - Mode sombre (CSS vars --pm-*, localStorage)
//   - Déconnexion directe /login sans modal
//   - AuthContext pour username, ville, token
//   - Aucun hardcode — toutes données viennent du backend
// ============================================================

import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate }       from 'react-router-dom';
import { AuthContext }       from '../../context/AuthContext';
import { NAV_LOGISTICS }     from '../../constants/navigation';
import { LOGISTICS_THEME }   from '../../constants/theme';

// Composants partagés
import DashboardLayout       from '../Shared/DashboardLayout';

// Onglets communs (partagés avec Farmer)
import WeatherTab            from '../Shared/tabs/WeatherTab';
import RecommendationsTab    from '../Shared/tabs/RecommendationsTab';
import ProfileTab            from '../Shared/tabs/ProfileTab';

// ── Couleurs spécifiques logisticien ─────────────────────────
const ACCENT       = LOGISTICS_THEME?.accentColor ?? '#0e4f7a';
const ACCENT_LIGHT = LOGISTICS_THEME?.accentLight ?? '#e8f4f8';

// ── Image hero WeatherTab logisticien ────────────────────────
// Remplacer par : import heroLogi from '../../assets/logi_hero.jpg'
let HERO_IMAGE;
try {
  HERO_IMAGE = new URL('../../assets/logi_hero.jpg', import.meta.url).href;
} catch {
  // Fallback : image route/transport en milieu tropical
  HERO_IMAGE = 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&q=80';
}

// ── Composant principal ───────────────────────────────────────
export default function LogisticsDashboard() {
  const navigate         = useNavigate();
  const { user, logout } = useContext(AuthContext);

  // ── Onglet actif (3 onglets : meteo, recommandations, profil) ─
  const [activeTab, setActiveTab] = useState(NAV_LOGISTICS[0]?.key ?? 'meteo');

  // ── Mode sombre ─────────────────────────────────────────────
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('pm_dark') === '1'; }
    catch { return false; }
  });

  const rootRef = useRef(null);

  // Injecte les variables CSS du thème à chaque changement de mode
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (isDark) {
      el.style.setProperty('--pm-bg',      '#0e1422');
      el.style.setProperty('--pm-card',    '#1a2235');
      el.style.setProperty('--pm-text',    '#e8edf8');
      el.style.setProperty('--pm-muted',   '#7a94b8');
      el.style.setProperty('--pm-surface', '#222d42');
      el.style.setProperty('--pm-border',  'rgba(255,255,255,0.08)');
    } else {
      el.style.setProperty('--pm-bg',      '#f0f4f8');
      el.style.setProperty('--pm-card',    '#ffffff');
      el.style.setProperty('--pm-text',    '#0a1a4a');
      el.style.setProperty('--pm-muted',   '#5a7a9a');
      el.style.setProperty('--pm-surface', '#f8fafc');
      el.style.setProperty('--pm-border',  'rgba(14,76,122,0.12)');
    }
  }, [isDark]);

  function handleToggleDark() {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('pm_dark', next ? '1' : '0'); } catch {}
  }

  // ── Déconnexion ─────────────────────────────────────────────
  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  // ── Rendu de l'onglet actif ─────────────────────────────────
  function renderTab() {
    switch (activeTab) {
      case 'meteo':
        return (
          <WeatherTab
            heroImage   ={HERO_IMAGE}
            accentColor ={ACCENT}
            accentLight ={ACCENT_LIGHT}
          />
        );

      case 'recommandations':
        return (
          <RecommendationsTab
            accentColor ={ACCENT}       // bleu → non-urgentes en bleu
            accentLight ={ACCENT_LIGHT}
          />
        );

      case 'profil':
        return (
          <ProfileTab
            accentColor ={ACCENT}
            accentLight ={ACCENT_LIGHT}
            showSpecs   ={false}        // logisticien : pas de spécificités
          />
        );

      // Pas de case 'calendrier' — exclusif agriculteur
      default:
        return null;
    }
  }

  // ── Titre topbar ────────────────────────────────────────────
  const activeLabel = NAV_LOGISTICS.find((n) => n.key === activeTab)?.label ?? '';

  // ── Rendu ──────────────────────────────────────────────────
  return (
    <div ref={rootRef} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DashboardLayout
        /* Navigation */
        navItems     ={NAV_LOGISTICS}
        activeTab    ={activeTab}
        onTabChange  ={setActiveTab}

        /* Topbar */
        pageTitle    ={activeLabel}

        /* Mode sombre */
        isDark       ={isDark}
        onToggleDark ={handleToggleDark}

        /* Déconnexion */
        onLogout     ={handleLogout}

        /* Identité utilisateur */
        username     ={user?.username ?? ''}
        role         ="Logisticien"
      >
        {renderTab()}
      </DashboardLayout>
    </div>
  );
}
