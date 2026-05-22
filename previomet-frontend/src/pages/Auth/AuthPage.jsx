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
import logoImg    from '../../assets/atmospheric-conditions.png';

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
            data.address?.city    ||
            data.address?.town    ||
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
  const cats         = CATEGORIES[selectedRole] || [];
  const currentCat   = selectedCats[currentCatIdx];
  const currentSpecs = currentCat ? (SPECIFICITES[currentCat.id] || []) : [];

  // Props partagés entre les deux instances de PanneauFormulaire
  const formProps = {
    tab, switchTab,
    loginForm, registerForm,
    onLoginSubmit, onRegisterSubmit,
    apiError, loading,
    geoLoading, geoLocked,
  };

  // ════════════════════════════════════════════════════════
  // 7. RENDU — conteneur 200% qui translate pour la transition
  // ════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        input::placeholder     { color: rgba(255,255,255,0.4); }
        input:focus, select:focus { outline:none; border-color:rgba(255,255,255,0.65) !important; }
        select option          { color:#0a1a4a; background:white; }
        .chip:hover            { border-color:#0e7c8a !important; background:#e0f5f7 !important; }
        
        /* Scrollbar personnalisée pour le modal */
        .modal-scroll::-webkit-scrollbar       { width: 10px; border-radius: 99px; }
        .modal-scroll::-webkit-scrollbar-track { background: rgba(14,76,122,0.06); border-radius: 99px; margin: 18px 0;}
        .modal-scroll::-webkit-scrollbar-thumb { background: rgba(14,76,122,0.6); border-radius: 99px; border: 2px solid white; }
        .modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(14,76,122,0.6); }
      `}</style>

      {/* Fenêtre visible = 100vw. Le rail intérieur fait 200vw et glisse. */}
      <div style={{ width: '100%', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          display: 'flex',
          width: '200%',
          height: '100%',
          transform: tab === 'login' ? 'translateX(0)' : 'translateX(-50%)',
          transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1)',
        }}>

          {/* ── Slot LOGIN : illustration gauche | formulaire droite ── */}
          <div style={{ width: '50%', height: '100%', display: 'flex', flexShrink: 0 }}>
            <PanneauIllustration onSwitch={() => switchTab('register')} switchLabel="S'inscrire" switchHint="Pas encore de compte ?" />
            <PanneauFormulaire activeTab="login" {...formProps} />
          </div>

          {/* ── Slot REGISTER : formulaire gauche | illustration droite ── */}
          <div style={{ width: '50%', height: '100%', display: 'flex', flexShrink: 0 }}>
            <PanneauFormulaire activeTab="register" {...formProps} />
            <PanneauIllustration onSwitch={() => switchTab('login')} switchLabel="Se connecter" switchHint="Déjà un compte ?" />
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODALS — s'affichent par-dessus tout le reste
      ════════════════════════════════════════════════════════ */}
      {modalStep && (
        <div
          onClick={() => setModalStep(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(10,26,74,0.55)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-scroll"
            style={{
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
                    const specs    = SPECIFICITES[cat.id] || [];
                    return (
                      <div key={cat.id} className="chip" onClick={() => toggleCat(cat)} style={{
                        padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${selected ? '#0e7c8a' : 'rgba(14,76,122,0.12)'}`,
                        background: selected ? '#e0f5f7' : 'white',
                        transition: 'all 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: specs.length ? 6 : 0 }}>
                          <span style={{ fontSize: 18 }}>{cat.icon}</span>
                          <span style={{ fontSize: 13.5, fontWeight: selected ? 700 : 500, color: '#0a1a4a' }}>{cat.label}</span>
                        </div>
                        {specs.length > 0 && (
                          <p style={{ fontSize: 11, color: selected ? '#0e7c8a' : '#5a7a9a', margin: 0, lineHeight: 1.6 }}>
                            {specs.join(' · ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={confirmCategories}
                  disabled={selectedCats.length === 0}
                  style={{ ...modalBtnStyle, opacity: selectedCats.length === 0 ? 0.5 : 1 }}
                >
                  Valider →
                </button>
              </>
            )}

            {/* ── Modal 2 : Spécificités (agriculteur uniquement) ── */}
            {modalStep === 'specificites' && currentCat && (
              <>
                <h3 style={modalTitleStyle}>{currentCat.icon} {currentCat.label}</h3>
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
                <button onClick={confirmSpecs} style={modalBtnStyle}>
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
                <h3 style={{ ...modalTitleStyle, fontSize: 20, marginBottom: 8 }}>Tout est prêt !</h3>
                <p style={{ fontSize: 14, color: '#5a7a9a', marginBottom: 6, lineHeight: 1.7 }}>
                  <strong>Domaine :</strong> {selectedRole}
                </p>
                <p style={{ fontSize: 14, color: '#5a7a9a', marginBottom: 22, lineHeight: 1.7 }}>
                  <strong>Catégories :</strong> {selectedCats.map(c => c.label).join(', ')}
                </p>
                {apiError && <p style={errorStyle}>{apiError}</p>}
                <button onClick={submitRegistration} disabled={loading} style={modalBtnStyle}>
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
// PANNEAU ILLUSTRATION — réutilisé dans les deux slots
// ════════════════════════════════════════════════════════
function PanneauIllustration({ onSwitch, switchLabel, switchHint }) {
  return (
    <div style={{
      flex: 1, background: 'white',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '200px 90px', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
        <img src={logoImg} alt="logo" style={{ width: 40, height: 40 }} />
        <span style={{
          fontFamily: "'Syne', sans-serif", fontSize: 26,
          fontWeight: 700, color: '#0a1a4a', letterSpacing: '0.5px',
        }}>
          PrevioMet
        </span>
      </div>

      <img src={weatherSvg} alt="illustration météo" style={{ width: '100%', maxWidth: 370, height: 'auto' }} />

      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: '#0a1a4a', marginBottom: 10 }}>
          Prévisions météo intelligentes
        </p>
        <p style={{ color: '#5a7a9a', fontSize: 14, lineHeight: 1.8 }}>
          Conçu pour les agriculteurs et logisticiens du Cameroun.<br/>
          Anticipez, planifiez, agissez.
        </p>
      </div>

      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <p style={{ fontSize: 13, color: '#5a7a9a', marginBottom: 10 }}>{switchHint}</p>
        <button onClick={onSwitch} style={{
          padding: '10px 20px', borderRadius: 9, cursor: 'pointer',
          fontSize: 16, fontWeight: 600, fontFamily: "'Inter', sans-serif",
          background: 'linear-gradient(135deg, #0a1a4a, #0e7c8a)',
          color: 'white', border: 'none', width: 200, height: 50,
        }}>
          {switchLabel}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// PANNEAU FORMULAIRE — réutilisé dans les deux slots
// activeTab = 'login' | 'register' — détermine quel form afficher
// ════════════════════════════════════════════════════════
function PanneauFormulaire({
  activeTab, tab,
  loginForm, registerForm,
  onLoginSubmit, onRegisterSubmit,
  apiError, loading,
  geoLoading, geoLocked,
}) {
  // Ce panneau ne rend son contenu que quand il est dans le slot actif
  const isActive = activeTab === tab;

  return (
    <div style={{
      width: 700,
      background: 'linear-gradient(160deg, #0a1a4a 0%, #0e4f7a 45%, #0e7c8a 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '50px 50px', overflowY: 'auto', position: 'relative',
    }}>
      {/* Cercles décoratifs en arrière-plan */}
      <div style={{
        position: 'absolute', bottom: -80, right: -80,
        width: 300, height: 300, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', top: '40%', left: -40,
        width: 180, height: 180, borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)', pointerEvents: 'none',
      }}/>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Formulaire Connexion ── */}
        {activeTab === 'login' && (
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
              {isActive && apiError && <p style={errorStyle}>{apiError}</p>}
              <button type="submit" disabled={loading} style={btnStyle}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
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
        {activeTab === 'register' && (
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
              {isActive && apiError && <p style={errorStyle}>{apiError}</p>}
              <button type="submit" disabled={loading} style={btnStyle}>
                Continuer →
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
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
  color: 'white', border: '1px solid white', borderRadius: 9,
  fontSize: 16, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif", letterSpacing: '0.3px', marginTop: 6,
};

const titleStyle      = { fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 6 };
const subtitleStyle   = { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 24 };
const errorStyle      = { color: '#ff8a80', fontSize: 13, marginBottom: 12 };
const modalTitleStyle = { fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#0a1a4a', marginBottom: 5 };
const modalSubStyle   = { fontSize: 13, color: '#5a7a9a', marginBottom: 20 };
const modalBtnStyle   = {
  width: '100%', padding: 13,
  background: 'linear-gradient(135deg, #0a1a4a, #0e7c8a)',
  color: 'white', border: 'none', borderRadius: 9,
  fontSize: 15, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif", letterSpacing: '0.3px', marginTop: 6,
};