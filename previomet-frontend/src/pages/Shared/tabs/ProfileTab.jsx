// src/pages/Shared/tabs/ProfileTab.jsx
// Onglet Mon Profil — commun à Farmer et Logistics.
// Props : accentColor, accentLight, showSpecs (true = agriculteur)

import { useState, useEffect, useContext } from 'react';
import { AuthContext }                     from '../../../context/AuthContext';
import { getProfile, updateProfile }       from '../../../api/farmer';
import { VILLES, CATEGORIES, SPECIFICITES } from '../../../data';

function getInitials(username = '') {
  const parts = username.split('_').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase() || '??';
}

function ReadField({ label, value, muted = false, full = false }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, gridColumn: full ? '1/-1' : undefined }}>
      <div style={{ fontSize:11.5, fontWeight:800, color:'var(--pm-muted,#5a7a9a)', textTransform:'uppercase', letterSpacing:'.5px' }}>
        {label}
      </div>
      <div style={{ fontSize:15, fontWeight: muted ? 400 : 600, color: muted ? 'var(--pm-muted,#5a7a9a)' : 'var(--pm-text,#0a1a4a)', fontStyle: muted ? 'italic' : 'normal' }}>
        {value}
      </div>
    </div>
  );
}

function EditField({ label, full = false, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn: full ? '1/-1' : undefined }}>
      <div style={{ fontSize:11.5, fontWeight:800, color:'var(--pm-muted,#5a7a9a)', textTransform:'uppercase', letterSpacing:'.5px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  padding:'10px 13px', borderRadius:9, border:'1.5px solid rgba(14,76,122,0.15)',
  fontSize:14, fontFamily:'Nunito,sans-serif', outline:'none', width:'100%',
  boxSizing:'border-box', color:'var(--pm-text,#0a1a4a)', background:'var(--pm-card,#ffffff)', transition:'border-color .2s',
};

// Chips cliquables pour multi-select catégories / spécificités
function ChipSelect({ options, selected, onChange, max = 3, accentColor, accentLight }) {
  function toggle(val) {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else if (selected.length < max) onChange([...selected, val]);
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {options.map((opt) => {
        const label  = typeof opt === 'string' ? opt : opt.label;
        const value  = typeof opt === 'string' ? opt : opt.id;
        const active = selected.includes(value);
        return (
          <button key={value} type="button" onClick={() => toggle(value)} style={{
            padding:'6px 14px', borderRadius:20,
            border:`1.5px solid ${active ? accentColor : 'rgba(14,76,122,0.15)'}`,
            background: active ? accentLight : 'transparent',
            color:      active ? accentColor : 'var(--pm-muted,#5a7a9a)',
            fontSize:13, fontWeight: active ? 700 : 500,
            cursor: selected.length >= max && !active ? 'not-allowed' : 'pointer',
            opacity: selected.length >= max && !active ? 0.45 : 1,
            fontFamily:'Nunito,sans-serif', transition:'all .2s',
          }}>
            {typeof opt !== 'string' && opt.icon ? `${opt.icon} ` : ''}{label}
          </button>
        );
      })}
      <div style={{ width:'100%', fontSize:11.5, color:'var(--pm-muted,#5a7a9a)', marginTop:2 }}>
        {selected.length}/{max} sélectionné{selected.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function ProfileTab({ accentColor = '#1a7a3a', accentLight = '#e8f5ec', showSpecs = true }) {
  const { user, setUser } = useContext(AuthContext);

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveOk,    setSaveOk]    = useState(false);

  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formVille,    setFormVille]    = useState('');
  const [formCats,     setFormCats]     = useState([]);
  const [formSpecs,    setFormSpecs]    = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      setLoading(true); setError(null);
      try {
        const res  = await getProfile();
        const data = res?.data ?? res; // supporte axios (.data) ou fetch brut
        if (!cancelled) {
          setProfile(data);
          setFormUsername(data.username ?? '');
          setFormVille(data.ville ?? '');
          setFormCats(data.categories ?? []);
          setFormSpecs(data.specificites ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.detail ?? 'Erreur de chargement du profil');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  function startEdit() {
    setFormUsername(profile?.username ?? '');
    setFormPassword('');
    setFormVille(profile?.ville ?? '');
    setFormCats(profile?.categories ?? []);
    setFormSpecs(profile?.specificites ?? []);
    setSaveError(null); setSaveOk(false); setEditing(true);
  }

  function cancelEdit() { setEditing(false); setSaveError(null); }

  async function handleSave() {
    setSaving(true); setSaveError(null);
    try {
      const payload = { username: formUsername, ville: formVille, categories: formCats, specificites: formSpecs };
      if (formPassword.trim()) payload.password = formPassword;
      const res     = await updateProfile(payload);
      const updated = res?.data ?? res;
      setProfile(updated);
      if (setUser) setUser((prev) => ({ ...prev, ...updated }));
      setSaveOk(true); setEditing(false);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError(err?.response?.data?.detail ?? 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  // Spécificités disponibles selon les catégories sélectionnées
  const availableSpecs = (() => {
    if (!showSpecs) return [];
    const all = [];
    formCats.forEach((cat) => {
      (SPECIFICITES?.[cat] ?? []).forEach((s) => { if (!all.includes(s)) all.push(s); });
    });
    return all;
  })();

  function handleCatsChange(newCats) {
    setFormCats(newCats);
    if (showSpecs) {
      const valid = [];
      newCats.forEach((cat) => {
        (SPECIFICITES?.[cat] ?? []).forEach((s) => { if (formSpecs.includes(s) && !valid.includes(s)) valid.push(s); });
      });
      setFormSpecs(valid);
    }
  }

  const border = 'rgba(14,76,122,0.12)';
  const S = {
    root:      { padding:24, flex:1, overflowY:'auto', fontFamily:'Nunito,sans-serif' },
    card:      { background:'var(--pm-card,#ffffff)', borderRadius:16, border:`1px solid ${border}`, padding:28, boxShadow:'0 2px 8px rgba(10,26,74,0.07)', maxWidth:800 },
    top:       { display:'flex', alignItems:'center', gap:18, marginBottom:24, paddingBottom:22, borderBottom:`1px solid ${border}` },
    avatar:    { width:64, height:64, borderRadius:'50%', background:`linear-gradient(135deg,#0a1a4a,${accentColor})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:'white', flexShrink:0, userSelect:'none', fontFamily:'Syne,sans-serif' },
    name:      { fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'var(--pm-text,#0a1a4a)' },
    role:      { fontSize:13, color:'var(--pm-muted,#5a7a9a)', marginTop:3, fontWeight:600 },
    editBtn:   { marginLeft:'auto', width:40, height:40, borderRadius:10, border:`1.5px solid ${border}`, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:accentColor, fontSize:16, transition:'background .2s', flexShrink:0 },
    grid:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 },
    saveBtns:  { display:'flex', gap:10, marginTop:24 },
    btnSave:   { padding:'10px 28px', background:`linear-gradient(135deg,#0a1a4a,${accentColor})`, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor: saving ? 'wait' : 'pointer', fontFamily:'Nunito,sans-serif', opacity: saving ? 0.7 : 1 },
    btnCancel: { padding:'10px 22px', background:'none', border:`1.5px solid ${border}`, borderRadius:9, cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'Nunito,sans-serif', color:'var(--pm-muted,#5a7a9a)' },
    toastOk:   { marginTop:12, padding:'10px 16px', background:'#e8f5ec', borderRadius:9, border:'1px solid #1a7a3a', color:'#1a7a3a', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 },
    errorBox:  { marginBottom:16, padding:'12px 16px', background:'#fdecea', borderRadius:9, border:'1px solid #c0392b', color:'#c0392b', fontSize:13.5, fontWeight:600 },
    loadWrap:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:60, color:'var(--pm-muted,#5a7a9a)', fontSize:14, fontWeight:600 },
    spinner:   { width:38, height:38, border:`4px solid ${border}`, borderTop:`4px solid ${accentColor}`, borderRadius:'50%', animation:'spin 0.9s linear infinite' },
    lockedField: { ...inputStyle, background:'var(--pm-surface,#f8fafc)', color:'var(--pm-muted,#5a7a9a)', fontStyle:'italic', cursor:'not-allowed', display:'flex', alignItems:'center', gap:6 },
  };

  if (loading) return (
    <>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={S.root}><div style={S.loadWrap}><div style={S.spinner}/><span>Chargement du profil…</span></div></div>
    </>
  );

  if (error) return (
    <div style={S.root}><div style={S.errorBox}><i className="fa-solid fa-triangle-exclamation" style={{marginRight:8}}/>{error}</div></div>
  );

  const p              = profile ?? {};
  const initials       = getInitials(p.username ?? '');
  const roleLabel      = p.role === 'agriculteur' ? '🌱 Agriculture' : p.role === 'logisticien' ? '🚛 Logistique' : (p.activite ?? '—');
  const catsDisplay    = (p.categories  ?? []).join('  ·  ') || '—';
  const specsDisplay   = (p.specificites ?? []).join('  ·  ') || '—';
  const categoriesOpts = CATEGORIES?.[p.role] ?? CATEGORIES?.agriculteur ?? [];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        .pf-input:focus  { border-color:${accentColor} !important; }
        .pf-select:focus { border-color:${accentColor} !important; }
      `}</style>

      <div style={S.root}>
        <div style={S.card}>

          {/* En-tête */}
          <div style={S.top}>
            <div style={S.avatar}>{initials}</div>
            <div>
              <div style={S.name}>{p.username ?? '—'}</div>
              <div style={S.role}>{roleLabel}&nbsp;·&nbsp;{p.ville ?? '—'}</div>
            </div>
            {!editing && (
              <button style={S.editBtn} title="Modifier le profil" onClick={startEdit}
                onMouseEnter={(e) => { e.currentTarget.style.background = accentLight; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                <i className="fa-solid fa-pen"/>
              </button>
            )}
          </div>

          {saveError && (
            <div style={S.errorBox}>
              <i className="fa-solid fa-triangle-exclamation" style={{marginRight:8}}/>{saveError}
            </div>
          )}

          {/* Mode lecture */}
          {!editing && (
            <div style={S.grid}>
              <ReadField label="Nom d'utilisateur" value={p.username ?? '—'} />
              <ReadField label="Email"             value={p.email ?? '—'} />
              <ReadField label="Mot de passe"      value="••••••••" />
              <ReadField label="Ville"             value={p.ville ?? '—'} />
              <ReadField label="Activité"          value={`${roleLabel} (non modifiable)`} muted full />
              <ReadField label="Catégories"        value={catsDisplay} full />
              {showSpecs && <ReadField label="Spécificités" value={specsDisplay} full />}
            </div>
          )}

          {/* Mode édition */}
          {editing && (
            <div style={S.grid}>
              <EditField label="Nom d'utilisateur">
                <input className="pf-input" style={inputStyle} value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)} placeholder="Nom d'utilisateur" maxLength={30}/>
              </EditField>

              <EditField label="Email">
                <div style={S.lockedField}>
                  <i className="fa-solid fa-lock" style={{fontSize:11}}/>{p.email ?? '—'}<span style={{fontSize:11}}>(non modifiable)</span>
                </div>
              </EditField>

              <EditField label="Nouveau mot de passe">
                <input className="pf-input" style={inputStyle} type="password" value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer"/>
              </EditField>

              <EditField label="Ville">
                <select className="pf-select" style={{...inputStyle, cursor:'pointer'}}
                  value={formVille} onChange={(e) => setFormVille(e.target.value)}>
                  <option value="">Sélectionner une ville</option>
                  {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </EditField>

              <EditField label="Activité" full>
                <div style={S.lockedField}>
                  <i className="fa-solid fa-lock" style={{fontSize:11}}/>{roleLabel}<span style={{fontSize:11}}>(non modifiable)</span>
                </div>
              </EditField>

              <EditField label={`Catégories (${formCats.length}/3)`} full>
                <ChipSelect options={categoriesOpts} selected={formCats} onChange={handleCatsChange}
                  max={3} accentColor={accentColor} accentLight={accentLight}/>
              </EditField>

              {showSpecs && availableSpecs.length > 0 && (
                <EditField label={`Spécificités (${formSpecs.length}/3)`} full>
                  <ChipSelect options={availableSpecs} selected={formSpecs} onChange={setFormSpecs}
                    max={3} accentColor={accentColor} accentLight={accentLight}/>
                </EditField>
              )}

              {showSpecs && formCats.length === 0 && (
                <div style={{ gridColumn:'1/-1', fontSize:12.5, color:'var(--pm-muted)', fontStyle:'italic' }}>
                  Sélectionnez d'abord une catégorie pour accéder aux spécificités.
                </div>
              )}
            </div>
          )}

          {/* Boutons */}
          {editing && (
            <div style={S.saveBtns}>
              <button style={S.btnSave} disabled={saving} onClick={handleSave}>
                {saving
                  ? <><i className="fa-solid fa-circle-notch fa-spin" style={{marginRight:7}}/>Enregistrement…</>
                  : <><i className="fa-solid fa-floppy-disk"          style={{marginRight:7}}/>Enregistrer</>}
              </button>
              <button style={S.btnCancel} onClick={cancelEdit}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--pm-surface,#f8fafc)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                Annuler
              </button>
            </div>
          )}

          {saveOk && (
            <div style={S.toastOk}>
              <i className="fa-solid fa-circle-check"/>Profil mis à jour avec succès !
            </div>
          )}

        </div>
      </div>
    </>
  );
}