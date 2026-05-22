// src/pages/Shared/tabs/ProfileTab.jsx
import { useState, useEffect, useContext } from 'react';
import { AuthContext }               from '../../../context/AuthContext';
import { getProfile, updateProfile } from '../../../api/farmer';
import { CATEGORIES, SPECIFICITES }  from '../../../data';
import editIcon                      from '../../../assets/edit.png';

function getInitials(u = '') {
  const p = u.split('_').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : u.slice(0,2).toUpperCase() || '??';
}
function normalizeSpecsList(raw = []) {
  const r = [];
  raw.forEach((item) => typeof item === 'string' && item.split(',').forEach((s) => {
    const t = s.trim(); if (t && !r.includes(t)) r.push(t);
  }));
  return r;
}

const inputStyle = {
  padding:'10px 13px', borderRadius:9, border:'1.5px solid rgba(14,76,122,0.15)',
  fontSize:14, fontFamily:'DM Sans,sans-serif', outline:'none', width:'100%',
  boxSizing:'border-box',
  // ↓ var(--pm-text) → vert foncé chez l'agriculteur
  color:'var(--pm-text,#0a1a4a)',
  background:'var(--pm-card,#fff)', transition:'border-color .2s',
};

function ReadField({ label, value, muted, full }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, gridColumn:full?'1/-1':undefined }}>
      <div style={{ fontSize:11.5, fontWeight:800, color:'var(--pm-muted,#5a7a9a)', textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
      {/* ↓ valeur lue → var(--pm-text) */}
      <div style={{ fontSize:15, fontWeight:muted?400:600, color:muted?'var(--pm-muted,#5a7a9a)':'var(--pm-text,#0a1a4a)', fontStyle:muted?'italic':'normal' }}>{value}</div>
    </div>
  );
}

function EditField({ label, full, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, gridColumn:full?'1/-1':undefined }}>
      <div style={{ fontSize:11.5, fontWeight:800, color:'var(--pm-muted,#5a7a9a)', textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
      {children}
    </div>
  );
}

function ChipSelect({ options, selected, onChange, max=3, accentColor, accentLight }) {
  const toggle = (val) => selected.includes(val)
    ? onChange(selected.filter(v=>v!==val))
    : selected.length < max && onChange([...selected, val]);
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
      {options.map((opt) => {
        const label = typeof opt==='string'?opt:opt.label;
        const value = typeof opt==='string'?opt:opt.id;
        const active = selected.includes(value);
        return (
          <button key={value} type="button" onClick={()=>toggle(value)} style={{
            padding:'6px 14px', borderRadius:20,
            border:`1.5px solid ${active?accentColor:'rgba(14,76,122,0.15)'}`,
            background:active?accentLight:'transparent',
            color:active?accentColor:'var(--pm-muted,#5a7a9a)',
            fontSize:13, fontWeight:active?700:500, fontFamily:'DM Sans,sans-serif',
            cursor:selected.length>=max&&!active?'not-allowed':'pointer',
            opacity:selected.length>=max&&!active?0.45:1, transition:'all .2s',
          }}>
            {typeof opt!=='string'&&opt.icon?`${opt.icon} `:''}{label}
          </button>
        );
      })}
      <div style={{ width:'100%', fontSize:11.5, color:'var(--pm-muted,#5a7a9a)', marginTop:2 }}>
        {selected.length}/{max} sélectionné{selected.length>1?'s':''}
      </div>
    </div>
  );
}

function VilleField({ value, onChange, accentColor }) {
  const [status, setStatus] = useState('idle');
  const [msg,    setMsg]    = useState('');
  async function handleBlur() {
    const v = value.trim(); if (!v) { setStatus('idle'); setMsg(''); return; }
    setStatus('loading');
    try {
      const data = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(v+', Cameroun')}&format=json&limit=1`,
        { headers:{ 'User-Agent':'PrevioMet/1.0' } }).then(r=>r.json());
      setStatus(data.length>0?'ok':'warn');
      setMsg(data.length>0
        ? '✅ Ville reconnue — les prévisions seront adaptées à votre zone'
        : '⚠️ Ville non reconnue — sera sauvegardée, prévisions sur la zone la plus proche');
    } catch {
      setStatus('error');
      setMsg('⚠️ Vérification impossible (réseau) — la ville sera sauvegardée telle quelle');
    }
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ position:'relative' }}>
        <input className="pf-input" style={inputStyle} value={value}
          onChange={(e)=>{ onChange(e.target.value); setStatus('idle'); setMsg(''); }}
          onBlur={handleBlur} placeholder="Ex : Douala, Edéa, Nkongsamba…" />
        {status==='loading'&&<div style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:11,color:'var(--pm-muted,#5a7a9a)',fontStyle:'italic' }}>Vérification…</div>}
      </div>
      {msg&&<div style={{ fontSize:11.5, color:status==='ok'?'#1a7a3a':'#b45309', fontWeight:600, lineHeight:1.4 }}>{msg}</div>}
      <div style={{ fontSize:11, color:'var(--pm-muted,#5a7a9a)' }}>Toute ville du Cameroun est acceptée.</div>
    </div>
  );
}

export default function ProfileTab({ accentColor='#1a7a3a', accentLight='#e8f5ec', showSpecs=true }) {
  const { user, updateUser } = useContext(AuthContext);

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
    getProfile().then((res) => {
      const data = res?.data ?? res;
      if (!cancelled) {
        setProfile(data);
        setFormUsername(data.username ?? ''); setFormVille(data.ville ?? '');
        setFormCats(data.categories ?? []); setFormSpecs(normalizeSpecsList(data.specificites ?? []));
      }
    }).catch((err) => {
      if (!cancelled) setError(err?.response?.data?.detail ?? 'Erreur de chargement');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function startEdit() {
    setFormUsername(profile?.username ?? ''); setFormPassword('');
    setFormVille(profile?.ville ?? ''); setFormCats(profile?.categories ?? []);
    setFormSpecs(normalizeSpecsList(profile?.specificites ?? []));
    setSaveError(null); setSaveOk(false); setEditing(true);
  }

  function handleCatsChange(newCats) {
    setFormCats(newCats);
    if (showSpecs) {
      const valid = newCats.flatMap(c => SPECIFICITES?.[c]??[]).map(s=>s.trim().toLowerCase());
      setFormSpecs(prev => prev.filter(s => valid.includes(s.trim().toLowerCase())));
    }
  }

  async function handleSave() {
    setSaving(true); setSaveError(null);
    try {
      const domaine = profile?.role==='logisticien'?'logistique':'agriculture';
      const activities = formCats.flatMap((cat) => {
        const specsForCat = (SPECIFICITES?.[cat]??[]).filter(s =>
          formSpecs.some(fs => fs.trim().toLowerCase()===s.trim().toLowerCase())
        );
        return specsForCat.length>0
          ? specsForCat.map(spec => ({ domaine, grande_categorie:cat, specificite:spec }))
          : [{ domaine, grande_categorie:cat, specificite:null }];
      });
      const payload = { username:formUsername, ville:formVille, activities };
      if (formPassword.trim()) payload.password = formPassword;

      const res     = await updateProfile(payload);
      const updated = res?.data ?? res;
      setProfile(updated);
      updateUser({ username:updated.username, ville:updated.ville, ville_reference:updated.ville_reference??'' });

      setSaveOk(true); setEditing(false);
      setTimeout(()=>setSaveOk(false), 3500);
    } catch (err) {
      setSaveError(err?.response?.data?.detail ?? 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  }

  const availableSpecs = showSpecs ? [...new Set(formCats.flatMap(c=>SPECIFICITES?.[c]??[]))] : [];
  const border = 'rgba(14,76,122,0.12)';
  const p      = profile ?? {};
  const initials  = getInitials(p.username ?? '');
  const roleLabel = p.role==='agriculteur'?'🌱 Agriculture':p.role==='logisticien'?'🚛 Logistique':(p.role??'—');
  const catsDisplay = (p.categories??[]).map(cat=>{
    const found = (CATEGORIES?.[p.role]??[]).find(o=>(typeof o==='string'?o:o.id)===cat);
    return found?(typeof found==='string'?found:`${found.icon??''} ${found.label}`):cat;
  }).join('  ·  ')||'—';
  const specsDisplay = normalizeSpecsList(p.specificites??[]).join('  ·  ')||'—';

  const S = {
    root:    { padding:'32px 24px', flex:1, overflowY:'auto', fontFamily:'DM Sans,sans-serif', display:'flex', justifyContent:'center', alignItems:'flex-start' },
    card:    { background:'var(--pm-card,#fff)', borderRadius:18, border:`1px solid ${border}`, padding:36, boxShadow:'0 4px 24px rgba(10,26,74,0.10)', width:'100%', maxWidth:680 },
    top:     { display:'flex', alignItems:'center', gap:20, marginBottom:28, paddingBottom:24, borderBottom:`1px solid ${border}` },
    avatar:  { width:72, height:72, borderRadius:'50%', background:`linear-gradient(135deg,#0D3D2B,${accentColor})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'white', flexShrink:0, userSelect:'none', fontFamily:'DM Sans,sans-serif' },
    editBtn: { marginLeft:'auto', width:40, height:40, borderRadius:10, border:`1.5px solid ${border}`, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, padding:0, overflow:'hidden', transition:'background .2s' },
    grid:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 },
    locked:  { ...inputStyle, background:'var(--pm-surface,#f8fafc)', color:'var(--pm-muted,#5a7a9a)', fontStyle:'italic', cursor:'not-allowed', display:'flex', alignItems:'center', gap:6 },
    saveBtns:{ display:'flex', gap:10, marginTop:28 },
    btnSave: { padding:'11px 30px', background:`linear-gradient(135deg,#0D3D2B,${accentColor})`, color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:700, cursor:saving?'wait':'pointer', fontFamily:'DM Sans,sans-serif', opacity:saving?0.7:1, display:'flex', alignItems:'center', gap:7 },
    btnCancel:{ padding:'11px 22px', background:'none', border:`1.5px solid ${border}`, borderRadius:9, cursor:'pointer', fontSize:14, fontWeight:600, fontFamily:'DM Sans,sans-serif', color:'var(--pm-muted,#5a7a9a)' },
    toastOk: { marginTop:14, padding:'10px 16px', background:'#e8f5ec', borderRadius:9, border:'1px solid #1a7a3a', color:'#1a7a3a', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8 },
    errBox:  { marginBottom:18, padding:'12px 16px', background:'#fdecea', borderRadius:9, border:'1px solid #c0392b', color:'#c0392b', fontSize:13.5, fontWeight:600 },
    spinner: { width:38, height:38, border:`4px solid ${border}`, borderTop:`4px solid ${accentColor}`, borderRadius:'50%', animation:'spin 0.9s linear infinite' },
  };

  if (loading) return (
    <><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.root}><div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:14,padding:60,color:'var(--pm-muted,#5a7a9a)',fontSize:14,fontWeight:600 }}>
        <div style={S.spinner}/><span>Chargement du profil…</span></div></div></>
  );
  if (error) return <div style={S.root}><div style={S.errBox}>{error}</div></div>;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .pf-input:focus{border-color:${accentColor}!important} .pf-edit-btn:hover{background:${accentLight}!important}`}</style>
      <div style={S.root}>
        <div style={S.card}>
          <div style={S.top}>
            <div style={S.avatar}>{initials}</div>
            <div>
              {/* Nom d'utilisateur dans la carte profil → var(--pm-text) */}
              <div style={{ fontFamily:'DM Sans,sans-serif', fontSize:22, fontWeight:800, color:'var(--pm-text,#0a1a4a)' }}>{p.username??'—'}</div>
              <div style={{ fontSize:13, color:'var(--pm-muted,#5a7a9a)', marginTop:4, fontWeight:600 }}>{roleLabel}&nbsp;·&nbsp;{p.ville??'—'}</div>
            </div>
            {!editing && (
              <button className="pf-edit-btn" style={S.editBtn} title="Modifier" onClick={startEdit}>
                <img src={editIcon} alt="Modifier" style={{ width:20,height:20,objectFit:'contain',display:'block' }}
                  onError={(e)=>{ e.currentTarget.style.display='none'; e.currentTarget.parentElement.innerHTML='✏️'; e.currentTarget.parentElement.style.fontSize='18px'; }} />
              </button>
            )}
          </div>

          {saveError && <div style={S.errBox}>{saveError}</div>}

          {!editing && (
            <div style={S.grid}>
              <ReadField label="Nom d'utilisateur" value={p.username??'—'} />
              <ReadField label="Email"             value={p.email??'—'} />
              <ReadField label="Mot de passe"      value="••••••••" />
              <ReadField label="Ville"             value={p.ville??'—'} />
              <ReadField label="Activité"          value={`${roleLabel} (non modifiable)`} muted full />
              <ReadField label="Catégories"        value={catsDisplay} full />
              {showSpecs && <ReadField label="Spécificités" value={specsDisplay} full />}
            </div>
          )}

          {editing && (
            <div style={S.grid}>
              <EditField label="Nom d'utilisateur">
                <input className="pf-input" style={inputStyle} value={formUsername}
                  onChange={(e)=>setFormUsername(e.target.value)} placeholder="Nom d'utilisateur" maxLength={30} />
              </EditField>
              <EditField label="Email">
                <div style={S.locked}>🔒 {p.email??'—'}&nbsp;<span style={{ fontSize:11 }}>(non modifiable)</span></div>
              </EditField>
              <EditField label="Nouveau mot de passe">
                <input className="pf-input" style={inputStyle} type="password" value={formPassword}
                  onChange={(e)=>setFormPassword(e.target.value)} placeholder="Laisser vide pour ne pas changer" />
              </EditField>
              <EditField label="Ville">
                <VilleField value={formVille} onChange={setFormVille} accentColor={accentColor} />
              </EditField>
              <EditField label="Activité" full>
                <div style={S.locked}>🔒 {roleLabel}&nbsp;<span style={{ fontSize:11 }}>(non modifiable)</span></div>
              </EditField>
              <EditField label={`Catégories (${formCats.length}/${p.role==='logisticien'?1:3})`} full>
                <ChipSelect options={CATEGORIES?.[p.role]??CATEGORIES?.agriculteur??[]} selected={formCats}
                  onChange={handleCatsChange} max={p.role==='logisticien'?1:3} accentColor={accentColor} accentLight={accentLight} />
              </EditField>
              {showSpecs && availableSpecs.length>0 && (
                <EditField label={`Spécificités (${formSpecs.length}/3)`} full>
                  <ChipSelect options={availableSpecs} selected={formSpecs} onChange={setFormSpecs}
                    max={3} accentColor={accentColor} accentLight={accentLight} />
                </EditField>
              )}
              {showSpecs && formCats.length===0 && (
                <div style={{ gridColumn:'1/-1', fontSize:12.5, color:'var(--pm-muted)', fontStyle:'italic' }}>
                  Sélectionnez d'abord une catégorie pour accéder aux spécificités.
                </div>
              )}
            </div>
          )}

          {editing && (
            <div style={S.saveBtns}>
              <button style={S.btnSave} disabled={saving} onClick={handleSave}>
                {saving?'⏳ Enregistrement…':'💾 Enregistrer'}
              </button>
              <button style={S.btnCancel} onClick={()=>{ setEditing(false); setSaveError(null); }}>Annuler</button>
            </div>
          )}
          {saveOk && <div style={S.toastOk}>✅ Profil mis à jour avec succès !</div>}
        </div>
      </div>
    </>
  );
}