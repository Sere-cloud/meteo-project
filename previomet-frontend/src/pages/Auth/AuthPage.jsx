// src/pages/Auth/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { register as apiRegister } from '../../api/auth';
import { CATEGORIES, SPECIFICITES } from '../../data';
import weatherSvg from '../../assets/Weather-amico.svg';

// ════════════════════════════════════════════════════════
// 1. SCHÉMAS DE VALIDATION ZOD
// ════════════════════════════════════════════════════════
const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Au moins 3 caractères')
    .max(20, 'Maximum 20 caractères')
    .regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et _ uniquement'),
  email:    z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Au moins 8 caractères')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  ville:    z.string().min(2, 'Ville requise'),
  role:     z.enum(['agriculteur', 'logisticien'], {
    errorMap: () => ({ message: 'Choisissez un domaine' }),
  }),
});

// ════════════════════════════════════════════════════════
// 2. COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════
export default function AuthPage() {

  const [tab, setTab] = useState('login');

  // modalStep : null | 'categories' | 'specificites' | 'confirm'
  const [modalStep,     setModalStep]     = useState(null);
  const [selectedRole,  setSelectedRole]  = useState('');
  const [selectedCats,  setSelectedCats]  = useState([]);
  const [currentCatIdx, setCurrentCatIdx] = useState(0);
  const [selectedSpecs, setSelectedSpecs] = useState({});
  const [pendingData,   setPendingData]   = useState(null);

  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);

  const [geoVille,   setGeoVille]   = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoLocked,  setGeoLocked]  = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const loginForm    = useForm({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm({ resolver: zodResolver(registerSchema) });

  const switchTab = (newTab) => {
    setTab(newTab);
    setApiError('');
    if (newTab === 'register' && !geoVille) detecterVille();
  };

  // ── Géolocalisation automatique ───────────────────────────────
  const detecterVille = async () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const ville =
            data.address?.city ||
            data.address?.town  ||
            data.address?.village || '';
          if (ville) {
            setGeoVille(ville);
            setGeoLocked(true);
            registerForm.setValue('ville', ville);
          }
        } catch {
          // Erreur réseau → champ libre
        } finally {
          setGeoLoading(false);
        }
      },
      () => setGeoLoading(false)
    );
  };

  // ════════════════════════════════════════════════════════
  // 3. SOUMISSION CONNEXION
  // ════════════════════════════════════════════════════════
  const onLoginSubmit = async (data) => {
    setLoading(true);
    setApiError('');
    try {
      const role = await login(data.email, data.password);
      if (role === 'agriculteur')      navigate('/farmer');
      else if (role === 'logisticien') navigate('/logistics');
      else                             navigate('/admin');
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // 4. SOUMISSION INSCRIPTION → ouvre le flux de modals
  // ════════════════════════════════════════════════════════
  const onRegisterSubmit = (data) => {
    setApiError('');
    setSelectedRole(data.role);
    setSelectedCats([]);
    setSelectedSpecs({});
    setCurrentCatIdx(0);
    setPendingData(data);
    setModalStep('categories');
  };

  // ════════════════════════════════════════════════════════
  // 5. LOGIQUE DES MODALS
  // ════════════════════════════════════════════════════════
  const toggleCat = (cat) => {
    const max = selectedRole === 'agriculteur' ? 3 : 1;
    setSelectedCats(prev => {
      const exists = prev.find(c => c.id === cat.id);
      if (exists) return prev.filter(c => c.id !== cat.id);
      if (prev.length >= max) return prev;
      return [...prev, cat];
    });
  };

  const confirmCategories = () => {
    if (selectedCats.length === 0) return;
    if (selectedRole === 'logisticien') {
      setModalStep('confirm');
    } else {
      setCurrentCatIdx(0);
      setModalStep('specificites');
    }
  };

  const toggleSpec = (catId, spec) => {
    setSelectedSpecs(prev => {
      const current = prev[catId] || [];
      const exists  = current.includes(spec);
      if (exists) return { ...prev, [catId]: current.filter(s => s !== spec) };
      if (current.length >= 3) return prev;
      return { ...prev, [catId]: [...current, spec] };
    });
  };

  const confirmSpecs = () => {
    if (currentCatIdx < selectedCats.length - 1) {
      setCurrentCatIdx(i => i + 1);
    } else {
      setModalStep('confirm');
    }
  };

  // ── Envoi final au backend ─────────────────────────────────────
  const submitRegistration = async () => {
    setLoading(true);
    setApiError('');
    try {
      const activities = selectedCats.map(cat => ({
        domaine:          pendingData.role,
        grande_categorie: cat.id,
        specificite:      (selectedSpecs[cat.id] || []).join(', ') || null,
      }));
      await apiRegister({
        username:   pendingData.username,
        email:      pendingData.email,
        password:   pendingData.password,
        ville:      pendingData.ville,
        role:       pendingData.role,
        activities,
      });
      setModalStep(null);
      switchTab('login');
      registerForm.reset();
    } catch (err) {
      setApiError(err.response?.data?.detail || "Erreur lors de l'inscription");
      setModalStep(null);
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  // 6. DONNÉES POUR LE RENDU
  // ════════════════════════════════════════════════════════
  const cats        = CATEGORIES[selectedRole] || [];
  const currentCat  = selectedCats[currentCatIdx];
  const currentSpecs = currentCat ? (SPECIFICITES[currentCat.id] || []) : [];

  // Panneau illustration à gauche sur login, à droite sur register
  const illustrationLeft = tab === 'login';

  // ════════════════════════════════════════════════════════
  // 7. RENDU
  // ════════════════════════════════════════════════════════
  return (
    <>
      {/* Animations de transition entre les deux panneaux */}
      <style>{`
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(40px);  } to { opacity:1; transform:translateX(0); } }
        .panel-illus           { animation: slideInLeft  0.42s cubic-bezier(0.4,0,0.2,1) both; }
        .panel-illus.right     { animation: slideInRight 0.42s cubic-bezier(0.4,0,0.2,1) both; }
        .panel-form            { animation: slideInRight 0.42s cubic-bezier(0.4,0,0.2,1) both; }
        .panel-form.left       { animation: slideInLeft  0.42s cubic-bezier(0.4,0,0.2,1) both; }
        input::placeholder     { color: rgba(255,255,255,0.4); }
        input:focus, select:focus { outline:none; border-color:rgba(255,255,255,0.65) !important; }
        select option          { color:#0a1a4a; background:white; }
        .chip:hover            { border-color:#0e7c8a !important; background:#e0f5f7 !important; }
      `}</style>

      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

        {/* ── Panneau gauche : illustration + branding ── */}
        <div
          className={`panel-illus${illustrationLeft ? '' : ' right'}`}
          style={{
            flex: 1, background: 'white',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '28px 40px', gap: 20,
            order: illustrationLeft ? 0 : 1,
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/atmospheric-conditions.png" alt="logo" style={{ width: 36, height: 36 }} />
            <span style={{
              fontFamily: "'Syne', sans-serif", fontSize: 24,
              fontWeight: 700, color: '#0a1a4a', letterSpacing: '0.5px',
            }}>
              PrevioMet
            </span>
          </div>

          {/* Illustration SVG Storyset */}
          <img src={weatherSvg} alt="illustration météo" style={{ width: '100%', maxWidth: 370, height: 'auto' }} />

          {/* Tagline */}
          <div style={{ textAlign: 'center', maxWidth: 320 }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: '#0a1a4a', marginBottom: 8 }}>
              Prévisions météo intelligentes
            </p>
            <p style={{ color: '#5a7a9a', fontSize: 13, lineHeight: 1.8 }}>
              Conçu pour les agriculteurs et logisticiens du Cameroun.<br/>
              Anticipez, planifiez, agissez.
            </p>
          </div>

          {/* Bouton de bascule vers l'autre formulaire */}
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <p style={{ fontSize: 13, color: '#5a7a9a', marginBottom: 10 }}>
              {tab === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}
            </p>
            <button
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              style={{
                padding: '10px 32px', borderRadius: 9, cursor: 'pointer',
                fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                background: 'linear-gradient(135deg, #0a1a4a, #0e7c8a)',
                color: 'white', border: 'none',
              }}
            >
              {tab === 'login' ? "S'inscrire" : "Se connecter"}
            </button>
          </div>
        </div>

        {/* ── Panneau droit : formulaires ── */}
        <div
          className={`panel-form${illustrationLeft ? '' : ' left'}`}
          style={{
            width: 750,
            background: 'linear-gradient(160deg, #0a1a4a 0%, #0e4f7a 45%, #0e7c8a 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '50px 50px', overflowY: 'auto', position: 'relative',
            order: illustrationLeft ? 1 : 0,
          }}
        >
          {/* Cercles décoratifs en arrière-plan */}
          <div style={{
            position: 'absolute', bottom: -80, right: -80,
            width: 300, height: 300, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }}/>
          <div style={{
            position: 'absolute', top: '40%', right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
          }}/>

          <div style={{ position: 'relative', zIndex: 1 }}>

            {/* ── Formulaire Connexion ── */}
            {tab === 'login' && (
              <div>
                <h2 style={titleStyle}>Bon retour 👋</h2>
                <p style={subtitleStyle}>Connectez-vous pour accéder à vos prévisions</p>

                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                  <Field label="Email" error={loginForm.formState.errors.email?.message}>
                    <input
                      type="email" placeholder="vous@exemple.com"
                      {...loginForm.register('email')}
                      style={inputStyle(!!loginForm.formState.errors.email)}
                    />
                  </Field>
                  <Field label="Mot de passe" error={loginForm.formState.errors.password?.message}>
                    <input
                      type="password" placeholder="••••••••"
                      {...loginForm.register('password')}
                      style={inputStyle(!!loginForm.formState.errors.password)}
                    />
                  </Field>

                  {apiError && <p style={errorStyle}>{apiError}</p>}

                  <button type="submit" disabled={loading} style={btnStyle}>
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </button>

                  <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255, 255, 255, 0.82)' }}>
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => alert('Fonctionnalité mot de passe oublié — Phase 5')}
                    >
                      Mot de passe oublié ?
                    </span>
                  </p>
                </form>
              </div>
            )}

            {/* ── Formulaire Inscription ── */}
            {tab === 'register' && (
              <div>
                <h2 style={titleStyle}>Créer un compte</h2>
                <p style={subtitleStyle}>Rejoignez PrevioMet en quelques étapes</p>

                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                  <Field label="Nom d'utilisateur" error={registerForm.formState.errors.username?.message}>
                    <input
                      placeholder="jean_dupont"
                      {...registerForm.register('username')}
                      style={inputStyle(!!registerForm.formState.errors.username)}
                    />
                  </Field>
                  <Field label="Email" error={registerForm.formState.errors.email?.message}>
                    <input
                      type="email" placeholder="vous@exemple.com"
                      {...registerForm.register('email')}
                      style={inputStyle(!!registerForm.formState.errors.email)}
                    />
                  </Field>
                  <Field label="Mot de passe" error={registerForm.formState.errors.password?.message}>
                    <input
                      type="password" placeholder="Min. 8 car., 1 majuscule, 1 chiffre"
                      {...registerForm.register('password')}
                      style={inputStyle(!!registerForm.formState.errors.password)}
                    />
                  </Field>
                  <Field label="Ville" error={registerForm.formState.errors.ville?.message}>
                    <input
                      placeholder={geoLoading ? '📍 Détection de votre position...' : 'Ex : Douala, Edéa, Bafoussam...'}
                      {...registerForm.register('ville')}
                      disabled={geoLocked}
                      style={{
                        ...inputStyle(!!registerForm.formState.errors.ville),
                        background: geoLocked ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)',
                      }}
                    />
                    {geoLoading && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        Demande de permission en cours...
                      </p>
                    )}
                    {geoLocked && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                        📍 Position détectée automatiquement
                      </p>
                    )}
                    {!geoLoading && !geoLocked && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                        Ou autorisez la localisation pour remplissage automatique
                      </p>
                    )}
                  </Field>
                  <Field label="Domaine d'activité" error={registerForm.formState.errors.role?.message}>
                    <select
                      {...registerForm.register('role')}
                      style={inputStyle(!!registerForm.formState.errors.role)}
                    >
                      <option value="">-- Choisissez --</option>
                      <option value="agriculteur">Agriculture</option>
                      <option value="logisticien">Logistique</option>
                    </select>
                  </Field>

                  {apiError && <p style={errorStyle}>{apiError}</p>}

                  <button type="submit" disabled={loading} style={btnStyle}>
                    Continuer →
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODALS — s'affichent par-dessus tout le reste
      ════════════════════════════════════════════════════════ */}
      {modalStep && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,26,74,0.55)',
          backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: 'white', borderRadius: 18, padding: 32,
            width: 500, maxWidth: '92vw', maxHeight: '82vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(10,26,74,0.25)',
          }}>

            {/* ── Modal 1 : Choix des catégories ── */}
            {modalStep === 'categories' && (
              <>
                <h3 style={modalTitleStyle}>
                  {selectedRole === 'agriculteur' ? '🌱 Vos types de culture' : '🚛 Votre activité logistique'}
                </h3>
                <p style={modalSubStyle}>
                  {selectedRole === 'agriculteur'
                    ? "Choisissez jusqu'à 3 catégories"
                    : 'Choisissez votre activité principale (1 seul choix)'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {cats.map(cat => {
                    const selected = !!selectedCats.find(c => c.id === cat.id);
                    return (
                      <div key={cat.id} className="chip" onClick={() => toggleCat(cat)} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${selected ? '#0e7c8a' : 'rgba(14,76,122,0.12)'}`,
                        background: selected ? '#e0f5f7' : 'white',
                        fontSize: 13.5, fontWeight: selected ? 700 : 500,
                        color: '#0a1a4a', transition: 'all 0.2s',
                      }}>
                        <span style={{ fontSize: 18 }}>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={confirmCategories}
                  disabled={selectedCats.length === 0}
                  style={{ ...btnStyle, ...modalBtnOverride, opacity: selectedCats.length === 0 ? 0.5 : 1 }}
                >
                  Valider →
                </button>
              </>
            )}

            {/* ── Modal 2 : Spécificités (agriculteur uniquement) ── */}
            {modalStep === 'specificites' && currentCat && (
              <>
                <h3 style={modalTitleStyle}>
                  {currentCat.icon} {currentCat.label}
                </h3>
                <p style={modalSubStyle}>
                  Précisez jusqu'à 3 spécificités ({currentCatIdx + 1}/{selectedCats.length})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
                  {currentSpecs.map(spec => {
                    const selected = (selectedSpecs[currentCat.id] || []).includes(spec);
                    return (
                      <div key={spec} className="chip" onClick={() => toggleSpec(currentCat.id, spec)} style={{
                        padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${selected ? '#0e7c8a' : 'rgba(14,76,122,0.12)'}`,
                        background: selected ? '#e0f5f7' : 'white',
                        fontSize: 13.5, fontWeight: selected ? 700 : 500,
                        color: '#0a1a4a', transition: 'all 0.2s',
                      }}>
                        {spec}
                      </div>
                    );
                  })}
                </div>
                <button onClick={confirmSpecs} style={{ ...btnStyle, ...modalBtnOverride }}>
                  {currentCatIdx < selectedCats.length - 1 ? 'Suivant →' : 'Terminer →'}
                </button>
                <p onClick={() => setModalStep('categories')} style={{
                  marginTop: 14, fontSize: 13, color: '#5a7a9a',
                  cursor: 'pointer', textAlign: 'center',
                }}>
                  ← Retour aux catégories
                </p>
              </>
            )}

            {/* ── Modal 3 : Confirmation finale ── */}
            {modalStep === 'confirm' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <h3 style={{ ...modalTitleStyle, fontSize: 20, marginBottom: 8 }}>
                  Tout est prêt !
                </h3>
                <p style={{ fontSize: 14, color: '#5a7a9a', marginBottom: 6, lineHeight: 1.7 }}>
                  <strong>Domaine :</strong> {selectedRole}
                </p>
                <p style={{ fontSize: 14, color: '#5a7a9a', marginBottom: 22, lineHeight: 1.7 }}>
                  <strong>Catégories :</strong> {selectedCats.map(c => c.label).join(', ')}
                </p>

                {apiError && <p style={errorStyle}>{apiError}</p>}

                <button onClick={submitRegistration} disabled={loading} style={{ ...btnStyle, ...modalBtnOverride }}>
                  {loading ? 'Création du compte...' : 'Créer mon compte'}
                </button>
                <p onClick={() => setModalStep('categories')} style={{
                  marginTop: 14, fontSize: 13, color: '#5a7a9a', cursor: 'pointer',
                }}>
                  ← Modifier mes choix
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════
// COMPOSANTS ET STYLES UTILITAIRES
// ════════════════════════════════════════════════════════
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 12.5, fontWeight: 700,
        color: 'rgba(255,255,255,0.6)', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: '#ff8a80', marginTop: 5 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}

const inputStyle = (hasError) => ({
  width: '100%', padding: '12px 14px', borderRadius: 9,
  fontSize: 14, fontFamily: "'Inter', sans-serif",
  outline: 'none', color: 'white',
  background: 'rgba(255,255,255,0.1)',
  border: `1.5px solid ${hasError ? '#ff8a80' : 'rgba(255,255,255,0.2)'}`,
  boxSizing: 'border-box', transition: 'border-color 0.2s',
});

const btnStyle = {
  width: '100%', padding: 13,
  background: 'linear-gradient(135deg, #0a1a4a, #0e7c8a)',
  color: 'white', border: 'none', borderRadius: 9,
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif", letterSpacing: '0.3px', marginTop: 6,
};

// Surcharge pour les boutons dans les modals (fond blanc → dégradé plein)
const modalBtnOverride = {
  background: 'linear-gradient(135deg, #0a1a4a, #0e7c8a)',
};

const titleStyle = {
  fontFamily: "'Syne', sans-serif", fontSize: 22,
  fontWeight: 700, color: 'white', marginBottom: 6,
};

const subtitleStyle = { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 };
const errorStyle    = { color: '#ff8a80', fontSize: 13, marginBottom: 12 };
const modalTitleStyle = {
  fontFamily: "'Syne', sans-serif", fontSize: 18,
  fontWeight: 700, color: '#0a1a4a', marginBottom: 5,
};
const modalSubStyle = { fontSize: 13, color: '#5a7a9a', marginBottom: 20 };