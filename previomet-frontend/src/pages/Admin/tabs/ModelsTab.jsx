// src/pages/Admin/tabs/ModelsTab.jsx

import { useState, useEffect, useRef } from "react";
import { getModels, launchTraining, getTrainStatus, resetTrainState } from "../../../api/admin";

const VARIABLES = [
  { key: "temperature",   label: "🌡️ Température",      maeUnite: "°C"  },
  { key: "vent",          label: "💨 Vent",              maeUnite: "km/h"},
  { key: "precipitation", label: "🌧️ Précipitations",   maeUnite: "mm"  },
  { key: "humidite",      label: "💧 Humidité de l'air", maeUnite: "%"   },
];

const HORIZONS_ORDER = ["H3", "H6", "H12", "H24", "J2", "J3", "J4", "J5"];

const HORIZON_LABELS = {
  H3:"H+3h", H6:"H+6h", H12:"H+12h", H24:"H+24h",
  J2:"Jour 2", J3:"Jour 3", J4:"Jour 4", J5:"Jour 5",
};

const VAR_LABELS = {
  temperature:"Température", vent:"Vent",
  precipitation:"Précipitations", humidite:"Humidité",
};

const SEUILS_STATUT = {
  temperature:   { excellent: 1.0,  bon: 2.0  },
  humidite:      { excellent: 5.0,  bon: 10.0 },
  precipitation: { excellent: 0.5,  bon: 1.5  },
  vent:          { excellent: 2.0,  bon: 4.0  },
};

function getStatut(mae, variableKey) {
  const s = SEUILS_STATUT[variableKey] ?? { excellent: 1.0, bon: 2.0 };
  if (mae <= s.excellent) return { label: "Excellent",    bg: "#e8f5ec", color: "#1a7a3a" };
  if (mae <= s.bon)       return { label: "Bon",          bg: "#e8f4f8", color: "#0e4f7a" };
  return                         { label: "À surveiller", bg: "#fef3c7", color: "#b45309" };
}

function findBestWorstMAE(metriques) {
  let best  = { mae: Infinity,  horizon: "", variable: "" };
  let worst = { mae: -Infinity, horizon: "", variable: "" };
  HORIZONS_ORDER.forEach(h => {
    if (!metriques[h]) return;
    VARIABLES.forEach(({ key }) => {
      const data = metriques[h]?.[key];
      if (!data) return;
      const mae = data.MAE;
      if (mae < best.mae)  best  = { mae, horizon: h, variable: key };
      if (mae > worst.mae) worst = { mae, horizon: h, variable: key };
    });
  });
  return { best, worst };
}

function jourDepuisEntrainement(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return `${diff}j`;
}

function compterModeles(metriques) {
  let count = 0;
  HORIZONS_ORDER.forEach(h => {
    if (!metriques[h]) return;
    VARIABLES.forEach(({ key }) => { if (metriques[h][key]) count++; });
  });
  return count;
}

function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerTxt}>Chargement des modèles...</p>
    </div>
  );
}

function ErreurBloc({ message, onRetry }) {
  return (
    <div style={styles.erreurBloc}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={styles.erreurTxt}>{message}</p>
      <button style={styles.retryBtn} onClick={onRetry}>Réessayer</button>
    </div>
  );
}

function AccordeonVariable({ variable, metriques, defaultOpen }) {
  const [ouvert, setOuvert] = useState(defaultOpen || false);

  const lignes = HORIZONS_ORDER.map(h => {
    const data = metriques[h]?.[variable.key];
    if (!data) return null;
    return { horizon: h, mae: data.MAE, rmse: data.RMSE };
  }).filter(Boolean);

  const maeMoyenne = lignes.length
    ? (lignes.reduce((a, l) => a + l.mae, 0) / lignes.length).toFixed(2)
    : "—";

  return (
    <div style={styles.accordion}>
      <div
        style={{ ...styles.accHead, ...(ouvert ? styles.accHeadOpen : {}) }}
        onClick={() => setOuvert(!ouvert)}
      >
        <span style={styles.accLabel}>{variable.label}</span>
        <div style={styles.accRight}>
          <span style={styles.accBadge}>{lignes.length} / 8 modèles</span>
          <span style={styles.accPrec}>
            {maeMoyenne !== "—" ? `${maeMoyenne} ${variable.maeUnite} moy.` : "—"}
          </span>
          <svg width="14" height="14" viewBox="0 0 14 14"
            style={{ transform: ouvert ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease", flexShrink: 0 }}>
            <path d="M2 4.5l5 5 5-5" stroke="#5a7a9a" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {ouvert && (
        <div style={styles.accBody}>
          <div style={{ ...styles.modelRow, ...styles.modelRowHeader }}>
            <span>Horizon</span>
            <span>MAE</span>
            <span>RMSE</span>
            <span>Statut</span>
          </div>
          {lignes.map(({ horizon, mae, rmse }) => {
            const statut = getStatut(mae, variable.key);
            return (
              <div key={horizon} style={styles.modelRow}>
                <span style={styles.horizonPill}>{HORIZON_LABELS[horizon]}</span>
                <span style={styles.maeVal}>
                  ±{mae.toFixed(2)} {variable.maeUnite}
                </span>
                <span style={styles.rmseVal}>{rmse.toFixed(2)}</span>
                <span style={{ ...styles.statutPill, background: statut.bg, color: statut.color }}>
                  {statut.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CercleProgression({ progress }) {
  const rayon   = 46;
  const circonf = 2 * Math.PI * rayon;
  const offset  = circonf - (progress / 100) * circonf;
  return (
    <div style={styles.progCercleWrap}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs>
          <linearGradient id="pgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="#0a1a4a" />
            <stop offset="100%" stopColor="#0e7c8a" />
          </linearGradient>
        </defs>
        <circle cx="55" cy="55" r={rayon} fill="none" stroke="#e8f0f8" strokeWidth="10" />
        <circle cx="55" cy="55" r={rayon} fill="none" stroke="url(#pgGrad)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circonf} strokeDashoffset={offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px", transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div style={styles.progPctText}>{progress}%</div>
    </div>
  );
}

export default function ModelsTab() {
  const [etat,         setEtat]         = useState("chargement");
  const [metriques,    setMetriques]    = useState(null);
  const [erreurMsg,    setErreurMsg]    = useState("");
  const [trainEtat,    setTrainEtat]    = useState("idle");
  const [trainProgress,setTrainProgress]= useState(0);
  const [trainMessage, setTrainMessage] = useState("");
  const [trainDuree,   setTrainDuree]   = useState("");
  const [trainError,   setTrainError]   = useState("");
  const pollingRef = useRef(null);

  useEffect(() => {
    chargerModeles();
    // Vérifier s'il y a un entraînement déjà en cours au montage
    verifierStatutInitial();
    return () => stopPolling();
  }, []);

  async function chargerModeles() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      const res = await getModels();
      setMetriques(res.data);
      setEtat("donnees");
    } catch (err) {
      setErreurMsg(err?.response?.data?.detail || "Impossible de charger les métriques.");
      setEtat("erreur");
    }
  }

  async function verifierStatutInitial() {
    try {
      const res = await getTrainStatus();
      const s = res.data;
      if (s.running) {
        // Un entraînement tourne déjà côté backend → on reprend le polling
        setTrainEtat("en_cours");
        setTrainProgress(s.progress);
        setTrainMessage(s.message);
        startPolling();
      }
    } catch {
      // Pas bloquant
    }
  }

  function startPolling() {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await getTrainStatus();
        const s = res.data;
        setTrainProgress(s.progress);
        setTrainMessage(s.message);

        if (s.done) {
          stopPolling();
          if (s.success) {
            setTrainDuree(s.duration || "");
            setTrainEtat("succes");
            setTimeout(() => chargerModeles(), 1500);
          } else {
            setTrainError(s.error || s.message || "Erreur inconnue");
            setTrainEtat("erreur_train");
          }
        }
      } catch {
        // On laisse le polling tourner même en cas d'erreur réseau passagère
      }
    }, 2000); // toutes les 2 secondes
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function lancerEntrainement() {
    if (trainEtat === "en_cours") return;
    setTrainEtat("en_cours");
    setTrainProgress(5);
    setTrainMessage("Initialisation...");
    setTrainError("");
    try {
      await launchTraining();
      startPolling();
    } catch (err) {
      const detail = err?.response?.data?.detail || "Impossible de lancer l'entraînement.";
      setTrainError(detail);
      setTrainMessage(detail);
      setTrainEtat("erreur_train");
    }
  }

  async function resetTrain() {
    stopPolling();
    try {
      await resetTrainState();
    } catch {
      // Pas bloquant si le reset échoue
    }
    setTrainEtat("idle");
    setTrainProgress(0);
    setTrainMessage("");
    setTrainDuree("");
    setTrainError("");
  }

  const nbModeles   = metriques ? compterModeles(metriques) : 0;
  const dateEntr    = metriques?.date_entrainement ?? null;
  const joursDepuis = jourDepuisEntrainement(dateEntr);
  const { best: bestMAE, worst: worstMAE } = metriques
    ? findBestWorstMAE(metriques)
    : { best: { mae: null, horizon: "", variable: "" }, worst: { mae: null, horizon: "", variable: "" } };

  if (etat === "chargement") return <Spinner />;
  if (etat === "erreur") return <div style={styles.pad}><ErreurBloc message={erreurMsg} onRetry={chargerModeles} /></div>;

  return (
    <div style={styles.pad}>

      {/* 4 cartes stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{nbModeles}</div>
          <div style={styles.statLbl}>Modèles disponibles</div>
          <div style={styles.statSub}>XGBoost</div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: "#1a7a3a" }}>
            {bestMAE.mae !== null
              ? `${bestMAE.mae.toFixed(3)} ${VARIABLES.find(v => v.key === bestMAE.variable)?.maeUnite ?? ""}`
              : "—"}
          </div>
          <div style={styles.statLbl}>Meilleur MAE</div>
          <div style={styles.statSub}>
            {bestMAE.variable && bestMAE.horizon
              ? `${VAR_LABELS[bestMAE.variable]} · ${HORIZON_LABELS[bestMAE.horizon]}`
              : "—"}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={{ ...styles.statNum, color: "#b45309" }}>
            {worstMAE.mae !== null
              ? `${worstMAE.mae.toFixed(2)} ${VARIABLES.find(v => v.key === worstMAE.variable)?.maeUnite ?? ""}`
              : "—"}
          </div>
          <div style={styles.statLbl}>MAE le plus risqué</div>
          <div style={styles.statSub}>
            {worstMAE.variable && worstMAE.horizon
              ? `${VAR_LABELS[worstMAE.variable]} · ${HORIZON_LABELS[worstMAE.horizon]}`
              : "—"}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statNum}>{joursDepuis}</div>
          <div style={styles.statLbl}>Depuis dernier entraîn.</div>
          {dateEntr && <div style={styles.statSub}>{dateEntr}</div>}
        </div>
      </div>

      {/* Accordéons */}
      {trainEtat === "idle" && (
        <>
          <div style={styles.accordionsWrap}>
            {VARIABLES.map((v, i) => (
              <AccordeonVariable key={v.key} variable={v} metriques={metriques} defaultOpen={i === 0} />
            ))}
          </div>
          <button style={styles.trainBtn} onClick={lancerEntrainement}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
            </svg>
            Lancer l'entraînement
          </button>
        </>
      )}

      {trainEtat === "en_cours" && (
        <div style={styles.trainBox}>
          <CercleProgression progress={trainProgress} />
          <div style={styles.trainTitre}>Entraînement en cours...</div>
          <div style={styles.trainSub}>{nbModeles} modèles · 8 horizons · 4 variables</div>
          <div style={styles.trainMsg}>{trainMessage}</div>
        </div>
      )}

      {trainEtat === "succes" && (
        <div style={styles.trainBox}>
          <div style={styles.checkCercle}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l7 7 13-13" stroke="#1a7a3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={styles.trainTitre}>Entraînement terminé avec succès</div>
          {trainDuree && <div style={styles.trainSub}>Durée : {trainDuree} · {nbModeles} modèles mis à jour</div>}
          <button style={styles.retryBtn} onClick={resetTrain}>Retour aux modèles</button>
        </div>
      )}

      {trainEtat === "erreur_train" && (
        <div style={styles.trainBox}>
          <span style={{ fontSize: 40 }}>❌</span>
          <div style={styles.trainTitre}>Erreur durant l'entraînement</div>
          <div style={styles.trainMsg}>{trainMessage}</div>
          {trainError && (
            <pre style={styles.trainErrDetail}>{trainError}</pre>
          )}
          <button style={styles.retryBtn} onClick={resetTrain}>Retour</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  pad: { padding: "24px", flex: 1, overflowY: "auto", background: "#f0f4f8", minHeight: "100%" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "22px" },
  statCard: { background: "#fff", borderRadius: "14px", border: "1px solid rgba(14,76,122,0.12)", padding: "20px", boxShadow: "0 2px 8px rgba(10,26,74,0.07)" },
  statNum: { fontFamily: "'DM Sans', sans-serif", fontSize: "28px", fontWeight: "700", color: "#0a1a4a" },
  statLbl: { fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#0a1a4a", marginTop: "4px", fontWeight: "500" },
  statSub: { fontFamily: "'DM Sans', sans-serif", fontSize: "11.5px", color: "#5a7a9a", marginTop: "4px" },
  accordionsWrap: { marginBottom: "20px" },
  accordion: { marginBottom: "10px", borderRadius: "14px", border: "1px solid rgba(14,76,122,0.12)", overflow: "hidden", background: "#fff", boxShadow: "0 2px 8px rgba(10,26,74,0.07)" },
  accHead: { padding: "15px 18px", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: "600", fontSize: "14.5px", color: "#0a1a4a", transition: "background 0.2s", userSelect: "none", fontFamily: "'DM Sans', sans-serif" },
  accHeadOpen: { background: "#e8f4f8", borderBottom: "1px solid rgba(14,76,122,0.12)" },
  accLabel: { fontWeight: "600", color: "#0a1a4a" },
  accRight: { display: "flex", alignItems: "center", gap: "10px" },
  accBadge: { fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#5a7a9a", fontWeight: "500" },
  accPrec: { fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#0e7c8a", fontWeight: "600", background: "#e0f5f7", padding: "2px 8px", borderRadius: "999px" },
  accBody: { background: "#fff" },
  modelRow: { display: "grid", gridTemplateColumns: "100px 140px 100px 130px", alignItems: "center", gap: "10px", padding: "11px 18px", borderTop: "1px solid rgba(14,76,122,0.08)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" },
  modelRowHeader: { background: "#f8fafd", fontSize: "11px", fontWeight: "600", color: "#5a7a9a", textTransform: "uppercase", letterSpacing: "0.05em", borderTop: "none" },
  horizonPill: { display: "inline-block", background: "#e8f0f8", color: "#0a3a6a", borderRadius: "6px", padding: "3px 10px", fontSize: "12px", fontWeight: "600", fontFamily: "'DM Sans', sans-serif" },
  maeVal: { color: "#0e4f7a", fontWeight: "500", fontSize: "13px", fontFamily: "'DM Mono', monospace" },
  rmseVal: { color: "#5a7a9a", fontSize: "13px", fontFamily: "'DM Mono', monospace" },
  statutPill: { fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: "600", padding: "3px 10px", borderRadius: "20px", display: "inline-block" },
  trainBtn: { display: "inline-flex", alignItems: "center", gap: "9px", background: "linear-gradient(135deg,#0a1a4a,#0e7c8a)", color: "white", padding: "12px 26px", borderRadius: "9px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", fontFamily: "'DM Sans', sans-serif", marginTop: "8px", boxShadow: "0 4px 12px rgba(14,76,122,0.25)" },
  trainBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px", background: "#fff", borderRadius: "14px", border: "1px solid rgba(14,76,122,0.12)", boxShadow: "0 2px 8px rgba(10,26,74,0.07)", gap: "12px" },
  trainTitre: { fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: "600", color: "#0a1a4a", textAlign: "center" },
  trainSub: { fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#5a7a9a", textAlign: "center" },
  trainMsg: { fontFamily: "'DM Sans', sans-serif", fontSize: "12.5px", color: "#8aa0b8", textAlign: "center", fontStyle: "italic", maxWidth: "400px" },
  trainErrDetail: { fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#c0392b", background: "#fdecea", padding: "12px 16px", borderRadius: "8px", maxWidth: "500px", width: "100%", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: "0" },
  progCercleWrap: { position: "relative", width: "110px", height: "110px", marginBottom: "6px" },
  progPctText: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: "'DM Sans', sans-serif", fontSize: "22px", fontWeight: "700", color: "#0a1a4a" },
  checkCercle: { width: "72px", height: "72px", borderRadius: "50%", background: "#e8f5ec", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px" },
  spinnerWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "16px" },
  spinner: { width: "40px", height: "40px", border: "4px solid #e8f0f8", borderTop: "4px solid #0e7c8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  spinnerTxt: { fontFamily: "'DM Sans', sans-serif", color: "#5a7a9a", fontSize: "14px", fontWeight: "500" },
  erreurBloc: { display: "flex", flexDirection: "column", alignItems: "center", padding: "48px", background: "#fff", borderRadius: "14px", border: "1px solid #fdecea", gap: "12px", textAlign: "center" },
  erreurTxt: { color: "#c0392b", fontSize: "14px", maxWidth: "400px", fontWeight: "500", fontFamily: "'DM Sans', sans-serif" },
  retryBtn: { background: "#0a1a4a", color: "white", border: "none", borderRadius: "8px", padding: "10px 22px", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", marginTop: "8px" },
};