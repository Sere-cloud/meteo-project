// src/pages/Admin/tabs/ModelsTab.jsx
// Onglet Modèles — Dashboard Admin
// Données 100% dynamiques depuis GET /admin/models et POST /admin/train
// 8 horizons par variable : H3, H6, H12, H24, J2, J3, J4, J5
// 3 états : chargement | données | erreur

import { useState, useEffect, useRef } from "react";
import { getModels, launchTrainingFetch } from "../../../api/admin";
import { useAuth } from "../../../context/AuthContext";

// ─── Constantes ────────────────────────────────────────────────────────────────

const VARIABLES = [
  { key: "temperature",   label: "🌡️ Température",     unite: "°C",   maeUnite: "°C"  },
  { key: "vent",          label: "💨 Vent",             unite: "km/h", maeUnite: ""    },
  { key: "precipitation", label: "🌧️ Précipitations",  unite: "mm",   maeUnite: "mm"  },
  { key: "humidite",      label: "💧 Humidité de l'air", unite: "%",   maeUnite: "%"   },
];

const HORIZONS_ORDER = ["H3", "H6", "H12", "H24", "J2", "J3", "J4", "J5"];

const HORIZON_LABELS = {
  H3:  "H+3h",
  H6:  "H+6h",
  H12: "H+12h",
  H24: "H+24h",
  J2:  "Jour 2",
  J3:  "Jour 3",
  J4:  "Jour 4",
  J5:  "Jour 5",
};

// Calcul précision à partir du MAE (normalisé entre 0 et 1)
// MAE est déjà normalisé dans metrics.json (ex: 0.0313 = 3.13%)
function maeToPrecision(mae) {
  return Math.max(0, Math.min(100, Math.round((1 - mae) * 100)));
}

// Précision moyenne globale de tous les modèles
function calcPrecisionGlobale(metriques) {
  const toutes = [];
  HORIZONS_ORDER.forEach((h) => {
    if (!metriques[h]) return;
    VARIABLES.forEach(({ key }) => {
      if (metriques[h][key]) {
        toutes.push(maeToPrecision(metriques[h][key].MAE));
      }
    });
  });
  if (!toutes.length) return 0;
  return (toutes.reduce((a, b) => a + b, 0) / toutes.length).toFixed(1);
}

// Nombre de jours depuis la date d'entraînement
function jourDepuisEntrainement(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  return `${diff}j`;
}

// ─── Composant spinner ─────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={styles.spinnerWrap}>
      <div style={styles.spinner} />
      <p style={styles.spinnerTxt}>Chargement des modèles...</p>
    </div>
  );
}

// ─── Composant erreur ──────────────────────────────────────────────────────────
function ErreurBloc({ message, onRetry }) {
  return (
    <div style={styles.erreurBloc}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={styles.erreurTxt}>{message}</p>
      <button style={styles.retryBtn} onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}

// ─── Accordéon variable ────────────────────────────────────────────────────────
function AccordeonVariable({ variable, metriques, defaultOpen }) {
  const [ouvert, setOuvert] = useState(defaultOpen || false);

  const lignes = HORIZONS_ORDER.map((h) => {
    const data = metriques[h]?.[variable.key];
    if (!data) return null;
    const precision = maeToPrecision(data.MAE);
    return { horizon: h, mae: data.MAE, rmse: data.RMSE, precision };
  }).filter(Boolean);

  const precMoyenne = lignes.length
    ? Math.round(lignes.reduce((a, l) => a + l.precision, 0) / lignes.length)
    : 0;

  // Couleur de la barre selon précision
  function couleurBarre(p) {
    if (p >= 90) return "linear-gradient(90deg,#0a1a4a,#0e7c8a)";
    if (p >= 75) return "linear-gradient(90deg,#0e4f7a,#0e7c8a)";
    return "linear-gradient(90deg,#b45309,#d97706)";
  }

  return (
    <div style={styles.accordion}>
      {/* En-tête accordéon */}
      <div
        style={{ ...styles.accHead, ...(ouvert ? styles.accHeadOpen : {}) }}
        onClick={() => setOuvert(!ouvert)}
      >
        <span style={styles.accLabel}>{variable.label}</span>
        <div style={styles.accRight}>
          <span style={styles.accBadge}>
            {lignes.length} / 8 modèles
          </span>
          <span style={styles.accPrec}>{precMoyenne}% moy.</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            style={{
              transform: ouvert ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.25s ease",
              flexShrink: 0,
            }}
          >
            <path
              d="M2 4.5l5 5 5-5"
              stroke="#5a7a9a"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* Corps accordéon */}
      {ouvert && (
        <div style={styles.accBody}>
          {/* En-tête colonnes */}
          <div style={{ ...styles.modelRow, ...styles.modelRowHeader }}>
            <span>Horizon</span>
            <span>MAE</span>
            <span>RMSE</span>
            <span>Précision</span>
          </div>

          {lignes.map(({ horizon, mae, rmse, precision }) => (
            <div key={horizon} style={styles.modelRow}>
              {/* Horizon */}
              <span style={styles.horizonPill}>{HORIZON_LABELS[horizon]}</span>

              {/* MAE */}
              <span style={styles.maeVal}>
                ±{(mae * 100).toFixed(2)}{variable.maeUnite}
              </span>

              {/* RMSE */}
              <span style={styles.rmseVal}>
                {(rmse * 100).toFixed(2)}
              </span>

              {/* Barre de précision */}
              <div style={styles.precWrap}>
                <div style={styles.precBarBg}>
                  <div
                    style={{
                      ...styles.precBarFill,
                      width: `${precision}%`,
                      background: couleurBarre(precision),
                    }}
                  />
                </div>
                <span style={styles.precPct}>{precision}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Animation cercle de progression ──────────────────────────────────────────
function CercleProgression({ progress }) {
  const rayon = 46;
  const circonf = 2 * Math.PI * rayon; // ≈ 289
  const offset = circonf - (progress / 100) * circonf;

  return (
    <div style={styles.progCercleWrap}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <defs>
          <linearGradient id="pgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0a1a4a" />
            <stop offset="100%" stopColor="#0e7c8a" />
          </linearGradient>
        </defs>
        {/* Piste de fond */}
        <circle
          cx="55" cy="55" r={rayon}
          fill="none" stroke="#e8f0f8" strokeWidth="10"
        />
        {/* Arc de progression */}
        <circle
          cx="55" cy="55" r={rayon}
          fill="none"
          stroke="url(#pgGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circonf}
          strokeDashoffset={offset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "55px 55px",
            transition: "stroke-dashoffset 0.4s ease",
          }}
        />
      </svg>
      <div style={styles.progPctText}>{progress}%</div>
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function ModelsTab() {
  const { token } = useAuth();

  // États de chargement
  const [etat, setEtat]         = useState("chargement"); // "chargement" | "donnees" | "erreur"
  const [metriques, setMetriques] = useState(null);
  const [erreurMsg, setErreurMsg] = useState("");

  // États entraînement
  const [trainEtat, setTrainEtat]     = useState("idle"); // "idle" | "en_cours" | "succes" | "erreur"
  const [trainProgress, setTrainProgress] = useState(0);
  const [trainMessage, setTrainMessage]   = useState("");
  const [trainDuree, setTrainDuree]       = useState("");
  const abortRef = useRef(false);

  // Chargement initial des métriques
  useEffect(() => {
    chargerModeles();
  }, []);

  async function chargerModeles() {
    setEtat("chargement");
    setErreurMsg("");
    try {
      const res = await getModels();
      setMetriques(res.data);
      setEtat("donnees");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Impossible de charger les métriques. Vérifiez que le backend est démarré.";
      setErreurMsg(msg);
      setEtat("erreur");
    }
  }

  // Lancement de l'entraînement
  async function lancerEntrainement() {
    if (trainEtat === "en_cours") return;
    abortRef.current = false;
    setTrainEtat("en_cours");
    setTrainProgress(0);
    setTrainMessage("Initialisation...");

    await launchTrainingFetch(
      token,
      // onProgress
      (data) => {
        if (abortRef.current) return;
        setTrainProgress(data.progress || 0);
        setTrainMessage(data.message || "Entraînement en cours...");
      },
      // onDone
      (data) => {
        if (abortRef.current) return;
        if (data.success) {
          setTrainProgress(100);
          setTrainDuree(data.duration || "");
          setTrainEtat("succes");
          // Recharger les métriques après entraînement
          setTimeout(() => chargerModeles(), 1500);
        } else {
          setTrainMessage(data.message || "Erreur durant l'entraînement");
          setTrainEtat("erreur_train");
        }
      },
      // onError
      (msg) => {
        if (abortRef.current) return;
        setTrainMessage(msg);
        setTrainEtat("erreur_train");
      }
    );
  }

  // Réinitialiser après entraînement
  function resetTrain() {
    abortRef.current = true;
    setTrainEtat("idle");
    setTrainProgress(0);
    setTrainMessage("");
    setTrainDuree("");
  }

  // ─── Calculs stats globales ────────────────────────────────────────────────
  const precisionGlobale = metriques ? calcPrecisionGlobale(metriques) : "—";
  const nbModeles        = metriques ? HORIZONS_ORDER.filter(h => metriques[h]).length * VARIABLES.length : 0;
  const dateEntr         = metriques?.date_entrainement;
  const joursDepuis      = jourDepuisEntrainement(dateEntr);

  // ─── RENDU ────────────────────────────────────────────────────────────────

  // État chargement
  if (etat === "chargement") return <Spinner />;

  // État erreur
  if (etat === "erreur") {
    return (
      <div style={styles.pad}>
        <ErreurBloc message={erreurMsg} onRetry={chargerModeles} />
      </div>
    );
  }

  // État données
  return (
    <div style={styles.pad}>

      {/* ── 4 Cartes stats ── */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{precisionGlobale}%</div>
          <div style={styles.statLbl}>Précision globale</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{nbModeles}</div>
          <div style={styles.statLbl}>Modèles disponibles</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>XGBoost</div>
          <div style={styles.statLbl}>Bibliothèque</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{joursDepuis}</div>
          <div style={styles.statLbl}>Depuis dernier entraîn.</div>
          {dateEntr && (
            <div style={styles.statSub}>{dateEntr}</div>
          )}
        </div>
      </div>

      {/* ── Zone principale : accordéons ou entraînement ── */}
      {trainEtat === "idle" && (
        <>
          {/* Accordéons par variable */}
          <div style={styles.accordionsWrap}>
            {VARIABLES.map((v, i) => (
              <AccordeonVariable
                key={v.key}
                variable={v}
                metriques={metriques}
                defaultOpen={i === 0}
              />
            ))}
          </div>

          {/* Bouton lancer entraînement */}
          <button style={styles.trainBtn} onClick={lancerEntrainement}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M3 2.5l10 5.5-10 5.5V2.5z" />
            </svg>
            Lancer l'entraînement
          </button>
        </>
      )}

      {/* ── Entraînement en cours ── */}
      {trainEtat === "en_cours" && (
        <div style={styles.trainBox}>
          <CercleProgression progress={trainProgress} />
          <div style={styles.trainTitre}>Entraînement en cours...</div>
          <div style={styles.trainSub}>
            {nbModeles} modèles · {metriques ? Object.keys(metriques).filter(k => k !== "date_entrainement" && k !== "version").length : 8} horizons · 4 variables
          </div>
          <div style={styles.trainMsg}>{trainMessage}</div>
        </div>
      )}

      {/* ── Entraînement terminé avec succès ── */}
      {trainEtat === "succes" && (
        <div style={styles.trainBox}>
          <div style={styles.checkCercle}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 16l7 7 13-13" stroke="#1a7a3a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={styles.trainTitre}>Entraînement terminé avec succès</div>
          {trainDuree && (
            <div style={styles.trainSub}>
              Durée : {trainDuree} · {nbModeles} modèles mis à jour
            </div>
          )}
          <button style={styles.retryBtn} onClick={resetTrain}>
            Retour aux modèles
          </button>
        </div>
      )}

      {/* ── Erreur entraînement ── */}
      {trainEtat === "erreur_train" && (
        <div style={styles.trainBox}>
          <span style={{ fontSize: 40 }}>❌</span>
          <div style={styles.trainTitre}>Erreur durant l'entraînement</div>
          <div style={styles.trainMsg}>{trainMessage}</div>
          <button style={styles.retryBtn} onClick={resetTrain}>
            Retour
          </button>
        </div>
      )}

    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  pad: {
    padding: "24px",
    flex: 1,
    overflowY: "auto",
    background: "#f0f4f8",
    minHeight: "100%",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "14px",
    marginBottom: "22px",
  },
  statCard: {
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    padding: "18px",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
  },
  statNum: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "28px",
    fontWeight: "800",
    color: "#0a1a4a",
  },
  statLbl: {
    fontSize: "12.5px",
    color: "#5a7a9a",
    marginTop: "4px",
    fontWeight: "600",
  },
  statSub: {
    fontSize: "11px",
    color: "#8aa0b8",
    marginTop: "2px",
  },

  // Accordéons
  accordionsWrap: {
    marginBottom: "20px",
  },
  accordion: {
    marginBottom: "10px",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
  },
  accHead: {
    padding: "15px 18px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontWeight: "700",
    fontSize: "14.5px",
    color: "#0a1a4a",
    transition: "background 0.2s",
    userSelect: "none",
  },
  accHeadOpen: {
    background: "#e8f4f8",
    borderBottom: "1px solid rgba(14,76,122,0.12)",
  },
  accLabel: {
    fontWeight: "700",
    color: "#0a1a4a",
  },
  accRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  accBadge: {
    fontSize: "12px",
    color: "#5a7a9a",
    fontWeight: "600",
  },
  accPrec: {
    fontSize: "12px",
    color: "#0e7c8a",
    fontWeight: "700",
    background: "#e0f5f7",
    padding: "2px 8px",
    borderRadius: "999px",
  },

  // Lignes tableau
  accBody: {
    background: "#fff",
  },
  modelRow: {
    display: "grid",
    gridTemplateColumns: "90px 120px 90px 1fr",
    alignItems: "center",
    gap: "10px",
    padding: "11px 18px",
    borderTop: "1px solid rgba(14,76,122,0.08)",
    fontSize: "13.5px",
  },
  modelRowHeader: {
    background: "#f8fafd",
    fontSize: "11.5px",
    fontWeight: "800",
    color: "#5a7a9a",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderTop: "none",
  },
  horizonPill: {
    display: "inline-block",
    background: "#e8f0f8",
    color: "#0a3a6a",
    borderRadius: "6px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: "700",
  },
  maeVal: {
    color: "#0e4f7a",
    fontWeight: "600",
    fontSize: "13px",
  },
  rmseVal: {
    color: "#5a7a9a",
    fontSize: "13px",
  },
  precWrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  precBarBg: {
    height: "7px",
    borderRadius: "4px",
    background: "#e8f0f8",
    flex: 1,
    overflow: "hidden",
    maxWidth: "100px",
  },
  precBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.4s ease",
  },
  precPct: {
    fontSize: "12.5px",
    fontWeight: "700",
    color: "#0a1a4a",
    minWidth: "36px",
  },

  // Bouton entraînement
  trainBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "9px",
    background: "linear-gradient(135deg,#0a1a4a,#0e7c8a)",
    color: "white",
    padding: "12px 26px",
    borderRadius: "9px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
    fontFamily: "'Nunito', sans-serif",
    marginTop: "8px",
    boxShadow: "0 4px 12px rgba(14,76,122,0.25)",
    transition: "opacity 0.2s, transform 0.15s",
  },

  // Zone entraînement / succès / erreur
  trainBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid rgba(14,76,122,0.12)",
    boxShadow: "0 2px 8px rgba(10,26,74,0.07)",
    gap: "12px",
    animation: "fadeUp 0.3s ease",
  },
  trainTitre: {
    fontFamily: "'Syne', sans-serif",
    fontSize: "18px",
    fontWeight: "700",
    color: "#0a1a4a",
    textAlign: "center",
  },
  trainSub: {
    fontSize: "13px",
    color: "#5a7a9a",
    textAlign: "center",
  },
  trainMsg: {
    fontSize: "12.5px",
    color: "#8aa0b8",
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: "400px",
  },

  // Cercle progression
  progCercleWrap: {
    position: "relative",
    width: "110px",
    height: "110px",
    marginBottom: "6px",
  },
  progPctText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontFamily: "'Syne', sans-serif",
    fontSize: "22px",
    fontWeight: "800",
    color: "#0a1a4a",
  },

  // Check cercle succès
  checkCercle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "#e8f5ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },

  // Spinner
  spinnerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #e8f0f8",
    borderTop: "4px solid #0e7c8a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  spinnerTxt: {
    color: "#5a7a9a",
    fontSize: "14px",
    fontWeight: "600",
  },

  // Erreur
  erreurBloc: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px",
    background: "#fff",
    borderRadius: "14px",
    border: "1px solid #fdecea",
    gap: "12px",
    textAlign: "center",
  },
  erreurTxt: {
    color: "#c0392b",
    fontSize: "14px",
    maxWidth: "400px",
    fontWeight: "600",
  },
  retryBtn: {
    background: "#0a1a4a",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "10px 22px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    fontFamily: "'Nunito', sans-serif",
    marginTop: "8px",
  },
};