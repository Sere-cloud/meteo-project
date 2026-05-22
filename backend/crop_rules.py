# backend/crop_rules.py
# Source de vérité unique : règles météo (danger/warning/success) + conditions de semis.
# Importé par recommendations.py uniquement — ne pas importer ailleurs.

# ── Helpers de condition ──────────────────────────────────────────────────────
def _c(m, t_min=None, t_max=None, h_min=None, h_max=None,
       p_min=None, p_max=None, v_min=None, v_max=None,
       p_eq=None, t_lt=None):
    """Évalue un ensemble de seuils sur un dict météo m."""
    t, h, p, v = m["temperature"], m["humidite"], m["precipitation"], m["vent"]
    if t_min  is not None and t  < t_min:  return False
    if t_max  is not None and t  > t_max:  return False
    if t_lt   is not None and t  >= t_lt:  return False
    if h_min  is not None and h  < h_min:  return False
    if h_max  is not None and h  > h_max:  return False
    if p_min  is not None and p  < p_min:  return False
    if p_max  is not None and p  > p_max:  return False
    if v_min  is not None and v  < v_min:  return False
    if v_max  is not None and v  > v_max:  return False
    if p_eq   is not None and p  != p_eq:  return False
    return True

def R(type_, titre, detail, **kw):
    """Crée une règle {condition, type, titre, detail}."""
    return {"condition": lambda m, kw=kw: _c(m, **kw), "type": type_, "titre": titre, "detail": detail}

# ── Règles par culture ────────────────────────────────────────────────────────
SEUILS = {

  "cacao": [
    R("danger","Risque de pourriture brune détecté",
      "Les précipitations dépassent 20mm, favorisant la pourriture brune des cabosses. "
      "Suspendez la récolte, retirez les cabosses atteintes, appliquez un fongicide cuivrique "
      "et couvrez les tas récoltés avec une bâche.", p_min=20.01),
    R("danger","Risque de moniliose sur cacaoyers",
      "Humidité >85% — conditions parfaites pour la moniliose. Inspectez, retirez et brûlez "
      "les cabosses infectées, appliquez un fongicide préventif.", h_min=85.01),
    R("danger","Stress thermique sur cacaoyers",
      "Température >35°C — avortement des fleurs. Arrosez tôt le matin et vérifiez l'ombrage.", t_min=35.01),
    R("warning","Vent fort — risque de chute de cabosses",
      "Vent >40km/h. Évitez les travaux en hauteur, ramassez les cabosses tombées rapidement.", v_min=40.01),
    R("success","Conditions optimales pour le cacao",
      "Température, humidité et précipitations idéales. Moment parfait pour la pollinisation manuelle "
      "et les travaux d'entretien.", t_min=24, t_max=30, h_min=70, h_max=80, p_min=3, p_max=15),
  ],

  "cafe_robusta": [
    R("danger","Risque de grillure des feuilles",
      "Température >32°C — grillure des feuilles. Ombrez les jeunes plants, arrosez en soirée.", t_min=32.01),
    R("danger","Risque de rouille orangée",
      "Fortes pluies >25mm. Appliquez du cuivre après la pluie, inspectez le dessous des feuilles.", p_min=25.01),
    R("warning","Humidité excessive — surveiller le feuillage",
      "Humidité >85%. Inspectez le feuillage, traitez au fongicide cuivrique si nécessaire.", h_min=85.01),
    R("success","Conditions idéales pour la floraison",
      "Parfait pour la floraison et la nouaison. Notez les parcelles les plus productives.", t_min=18, t_max=28, h_min=60, h_max=75),
  ],

  "cafe_arabica": [
    R("danger","Chaleur excessive pour l'arabica",
      "Température >28°C — qualité du grain dégradée. Renforcez l'ombrage, arrosez matin et soir.", t_min=28.01),
    R("danger","Risque de rouille orangée sur arabica",
      "Précipitations >25mm. Traitez au cuivre, élaguez pour améliorer la circulation d'air.", p_min=25.01),
    R("success","Conditions idéales pour l'arabica",
      "Conditions fraîches et humides parfaites. Bon moment pour la taille et l'engrais organique.", t_min=15, t_max=24, h_min=60, h_max=75),
  ],

  "palmier_huile": [
    R("danger","Sécheresse critique pour le palmier",
      "Absence de pluie + chaleur >33°C. Irriguez les jeunes palmiers, surveillez les signes de stress.", p_eq=0, t_min=33.01),
    R("danger","Vent violent — danger pour les palmiers",
      "Vent >50km/h. Inspectez les tuteurs, évitez les travaux en hauteur.", v_min=50.01),
    R("success","Conditions idéales — récolte et engrais",
      "Parfait pour la récolte des régimes et l'application d'engrais.", p_min=5, p_max=20, t_min=25, t_max=32),
  ],

  "hevea": [
    R("danger","Suspendre les saignées",
      "Pluie >15mm — le latex est dilué et les blessures s'infectent. Attendez que l'écorce soit sèche.", p_min=15.01),
    R("danger","Risque de pourriture du panneau de saignée",
      "Humidité >90%. Inspectez les panneaux, appliquez un fongicide, réduisez la profondeur.", h_min=90.01),
    R("success","Conditions idéales pour la saignée",
      "Temps sec, température et humidité optimales. Saignez entre 5h et 8h.", t_min=22, t_max=30, h_min=60, h_max=78, p_eq=0),
  ],

  "coton": [
    R("danger","Reporter la récolte du coton",
      "Pluie >30mm — le coton mouillé moisit. Étalez immédiatement sous abri ventilé.", p_min=30.01),
    R("danger","Chute des capsules — stress hydrique",
      "Température >38°C. Irriguez, évitez le compactage du sol.", t_min=38.01),
    R("success","Conditions idéales pour la récolte",
      "Chaud et sec — parfait pour récolter et sécher le coton.", t_min=28, t_max=35, h_max=64.99, p_eq=0),
  ],

  "the": [
    R("danger","Brûlure des jeunes pousses de thé",
      "Température >30°C. Installez un ombrage, arrosez tôt le matin uniquement.", t_min=30.01),
    R("warning","Reporter la cueillette du thé",
      "Pluie >20mm. Attendez que les feuilles soient sèches (4-6h après la pluie).", p_min=20.01),
    R("success","Conditions idéales pour la cueillette du thé",
      "Bourgeons tendres et aromatiques. Récoltez les deux premières feuilles et le bourgeon.", t_min=18, t_max=28, h_min=70, h_max=80),
  ],

  "tomate": [
    R("danger","Risque élevé de mildiou sur tomates",
      "Humidité >80% + chaleur >28°C — conditions parfaites pour le mildiou. Traitez au mancozèbe ou cuivre.", h_min=80.01, t_min=28.01),
    R("danger","Risque d'éclatement des fruits et fonte des semis",
      "Pluie >25mm. Récoltez les tomates colorées, vérifiez le drainage.", p_min=25.01),
    R("danger","Chute des fleurs de tomate",
      "Température >35°C. Arrosez en soirée, paillez, installez un ombrage léger.", t_min=35.01),
    R("warning","Vent fort — protéger les plants",
      "Vent >35km/h. Vérifiez les tuteurs — les blessures sont des portes d'entrée aux maladies.", v_min=35.01),
    R("success","Conditions idéales pour traitement et pollinisation",
      "Temps sec, humidité et température optimales. Traitez tôt le matin.", t_min=22, t_max=30, h_min=60, h_max=75, p_eq=0),
  ],

  "piment": [
    R("danger","Chute massive des fleurs de piment",
      "Température >35°C. Arrosez en soirée, paillez le sol.", t_min=35.01),
    R("danger","Risque d'anthracnose sur piments",
      "Humidité >85% — taches noires sur fruits. Retirez les fruits atteints, traitez au mancozèbe.", h_min=85.01),
    R("success","Excellente période de fructification",
      "Conditions idéales. Apportez un engrais potassique.", t_min=24, t_max=32, h_min=55, h_max=75),
  ],

  "chou": [
    R("danger","Risque de fonte des semis et pourriture",
      "Pluie >30mm. Vérifiez le drainage, buttez la base des plants.", p_min=30.01),
    R("danger","Risque de hernie du chou",
      "Humidité >85% — maladie fongique destructrice. Chaulez le sol, traitez au fongicide.", h_min=85.01),
    R("danger","Le chou monte en graine",
      "Température >30°C. Récoltez les pommes formées, installez un ombrage.", t_min=30.01),
    R("success","Conditions parfaites pour le chou",
      "Fraîcheur et humidité idéales. Apportez un engrais azoté.", t_min=15, t_max=25, h_min=60, h_max=75),
  ],

  "oignon": [
    R("danger","Risque de mildiou de l'oignon",
      "Humidité >80%. Appliquez un fongicide systémique, réduisez l'arrosage.", h_min=80.01),
    R("warning","Reporter la récolte des bulbes",
      "Pluie >15mm — les bulbes mouillés pourrissent vite.", p_min=15.01),
    R("success","Moment idéal pour la récolte et le séchage",
      "Chaud et sec. Laissez 2-3 jours au sol puis stockez en endroit ventilé.", t_min=20, t_max=30, h_max=69.99, p_eq=0),
  ],

  "ail": [
    R("danger","Risque de pourriture blanche de l'ail",
      "Humidité >80%. Améliorez le drainage, retirez et brûlez les plants infectés.", h_min=80.01),
    R("danger","Excès d'eau fatal pour l'ail",
      "Pluie >20mm. Créez des rigoles d'évacuation, ne compactez pas le sol mouillé.", p_min=20.01),
    R("success","Conditions idéales pour la bulbification",
      "Parfait pour la formation des bulbes. Apportez un engrais potassique et phosphoré.", t_min=18, t_max=28, h_min=55, h_max=70),
  ],

  "laitue": [
    R("danger","La laitue monte en fleur",
      "Température >28°C — devient amère. Récoltez immédiatement, installez un ombrage 50%.", t_min=28.01),
    R("danger","Risque de pourriture grise sur laitue",
      "Humidité >85%. Retirez les feuilles atteintes, espacez les plants.", h_min=85.01),
    R("success","Conditions parfaites pour la laitue",
      "Bon moment pour les semis et repiquages. Arrosez modérément le matin.", t_min=15, t_max=22, h_min=60, h_max=75),
  ],

  "concombre": [
    R("danger","Risque d'oïdium sur concombre",
      "Humidité >85% — feutrage blanc sur feuilles. Appliquez du soufre mouillable.", h_min=85.01),
    R("warning","Protéger les fruits du contact au sol",
      "Pluie >25mm. Posez des tuteurs sous les fruits, vérifiez le drainage.", p_min=25.01),
    R("success","Croissance rapide des concombres",
      "Conditions idéales. Récoltez régulièrement pour stimuler la production.", t_min=24, t_max=32, h_min=60, h_max=78),
  ],

  "haricot_vert": [
    R("danger","Risque de rouille et anthracnose",
      "Pluie >20mm. Appliquez un fongicide, ne travaillez pas quand les feuilles sont mouillées.", p_min=20.01),
    R("danger","Chute des fleurs — gousses vides",
      "Température >32°C. Arrosez en soirée, paillez.", t_min=32.01),
    R("success","Conditions idéales pour le haricot vert",
      "Floraison et gousses dans les meilleures conditions. Récoltez tous les 2 jours.", t_min=20, t_max=28, h_min=55, h_max=72),
  ],

  "gombo": [
    R("danger","Chute et pourriture des fruits de gombo",
      "Pluie >30mm. Récoltez les gombos mûrs, vérifiez le drainage.", p_min=30.01),
    R("danger","Froid bloquant la croissance du gombo",
      "Température <18°C — croissance bloquée, fleurs avortent. Couvrez les plants la nuit.", t_lt=18),
    R("success","Le gombo adore ces conditions",
      "Conditions idéales. Récoltez tous les 2-3 jours à 8-10 cm.", t_min=28, t_max=35, h_min=55, h_max=75),
  ],

  "aubergine_africaine": [
    R("danger","Risque de verticilliose sur aubergine",
      "Humidité >85% — flétrissement brutal sans traitement curatif. Brûlez les plants atteints.", h_min=85.01),
    R("danger","Brûlures des fruits d'aubergine",
      "Température >38°C. Installez un ombrage, arrosez abondamment en soirée.", t_min=38.01),
    R("success","Excellentes conditions pour l'aubergine",
      "Fructification optimale. Taillez les rameaux secondaires, apportez un engrais potassique.", t_min=25, t_max=33, h_min=60, h_max=78),
  ],

  "poivron": [
    R("danger","Chute des fleurs de poivron",
      "Température >35°C. Ombrez les plants, arrosez en soirée, paillez.", t_min=35.01),
    R("danger","Risque de botrytis sur poivron",
      "Humidité >85%. Retirez les parties atteintes, traitez au fongicide.", h_min=85.01),
    R("success","Conditions idéales pour le poivron",
      "Nouaison et coloration optimales. Laissez mûrir sur le plant pour coloration.", t_min=22, t_max=30, h_min=55, h_max=72),
  ],

  "banane_plantain": [
    R("danger","Risque de verse des bananiers",
      "Vent >35km/h. Tuteurez immédiatement, récoltez les régimes presque mûrs.", v_min=35.01),
    R("warning","Éviter la récolte par forte pluie",
      "Pluie >20mm — régimes gorgés d'eau, pourrissent vite.", p_min=20.01),
    R("success","Conditions idéales pour le bananier",
      "Pluie modérée et chaleur optimale. Plantez de nouveaux rejets, apportez de l'engrais.", t_min=22, t_max=32, p_min=5, p_max=15),
  ],

  "ananas": [
    R("danger","Brûlures sur plants d'ananas",
      "Température >38°C. Couvrez les jeunes plants, arrosez tôt le matin.", t_min=38.01),
    R("danger","Risque de fusariose sur ananas",
      "Humidité >85%. Traitez au fongicide, assurez un bon drainage.", h_min=85.01),
    R("success","Fructification optimale de l'ananas",
      "Conditions idéales. Surveillez la coloration de la base — jaune = récolte proche.", t_min=24, t_max=30, h_min=60, h_max=75),
  ],

  "mangue": [
    R("danger","Risque d'anthracnose sur manguier",
      "Pluie >10mm + humidité >80% — taches noires sur fleurs. Traitez au cuivre.", p_min=10.01, h_min=80.01),
    R("danger","Chute de mangues immatures",
      "Vent >40km/h. Ramassez les tombées, récoltez les presque mûres.", v_min=40.01),
    R("success","Conditions favorables à la floraison",
      "Saison sèche et températures modérées — idéal pour la floraison.", p_eq=0, t_min=20, t_max=30),
  ],

  "papaye": [
    R("danger","Risque de pourriture racinaire sur papayer",
      "Pluie >30mm — le papayer est perdu en 48h si les racines pourrissent. Drainer d'urgence.", p_min=30.01),
    R("danger","Verse des papayers — tuteurage urgent",
      "Vent >40km/h — tronc fragile. Tuteurez avec des bambous solides.", v_min=40.01),
    R("success","Excellente période pour le papayer",
      "Conditions idéales pour croissance et fructification. Apportez un engrais NPK.", t_min=22, t_max=35, h_min=60, h_max=75),
  ],

  "avocat": [
    R("danger","Risque de pourriture racinaire sur avocatier",
      "Pluie >25mm — Phytophthora détruit les racines. Améliorez le drainage.", p_min=25.01),
    R("warning","Chute prématurée d'avocats",
      "Vent >35km/h. Récupérez les tombés, faites-les mûrir dans le noir.", v_min=35.01),
    R("success","Conditions idéales pour l'avocatier",
      "Floraison et nouaison optimales. Arrosage stable et régulier.", t_min=20, t_max=28, h_min=60, h_max=75),
  ],

  "agrumes": [
    R("danger","Risque de gommose sur agrumes",
      "Humidité >85% — écoulements de gomme sur tronc. Grattez, appliquez bouillie bordelaise.", h_min=85.01),
    R("warning","Chute de fleurs et jeunes fruits",
      "Pluie >30mm. Vérifiez le drainage et l'apport d'azote.", p_min=30.01),
    R("success","Coloration et sucrosité optimales",
      "Conditions idéales pour la maturation. Récoltez et apportez un engrais potassique.", t_min=22, t_max=30, p_min=5, p_max=15),
  ],

  "mais": [
    R("danger","Stress hydrique critique sur maïs",
      "Pas de pluie + chaleur >33°C. Irriguez en priorité les parcelles en floraison — "
      "un stress de 3 jours peut réduire le rendement de 50%.", p_eq=0, t_min=33.01),
    R("danger","Risque de verse et pourriture de tige",
      "Pluie >30mm. Drainer les parcelles, détruire les résidus infectés après récolte.", p_min=30.01),
    R("success","Conditions idéales pour le maïs",
      "Pluie modérée et chaleur optimale. Bon moment pour semis, engrais azoté, sarclage.", p_min=5, p_max=20, t_min=22, t_max=30),
  ],

  "manioc": [
    R("danger","Risque de pourriture des tubercules",
      "Pluie >30mm. Vérifiez le drainage, ne récoltez pas dans un sol gorgé d'eau.", p_min=30.01),
    R("warning","Sécheresse — surveiller les jeunes plants",
      "Pas de pluie + chaleur >35°C. Arrosez les moins de 3 mois, paillez le sol.", p_eq=0, t_min=35.01),
    R("success","Conditions idéales pour le manioc",
      "Chaleur et humidité optimales. Bon moment pour boutures et entretien.", t_min=25, t_max=35, p_min=10, p_max=20),
  ],

  "sorgho_mil": [
    R("danger","Risque d'ergot à la floraison",
      "Pluie >25mm — champignon toxique qui remplace les grains. Triez soigneusement la récolte.", p_min=25.01),
    R("danger","Chaleur extrême — grains vides",
      "Pas de pluie + chaleur >40°C. Irriguez si possible, protégez les jeunes plants.", p_eq=0, t_min=40.01),
    R("success","Conditions idéales pour sorgho et mil",
      "Adapté à ces conditions chaudes et sèches. Bon moment pour l'entretien et le sarclage.", t_min=28, t_max=38, h_min=40, h_max=65),
  ],

  "riz": [
    R("danger","Stérilité pollinique du riz",
      "Température >35°C. Irriguez avec de l'eau fraîche, récoltez tôt le matin.", t_min=35.01),
    R("danger","Risque de pyriculariose sur riz",
      "Humidité >90% — maladie la plus destructrice du riz. Traitez au fongicide systémique.", h_min=90.01),
    R("success","Température idéale pour le riz",
      "Parfait pour la croissance et le tallage. Maintenez 5-10cm d'eau dans les rizières.", t_min=24, t_max=30),
  ],

  "igname_macabo_taro": [
    R("danger","Risque de pourriture des tubercules",
      "Pluie >35mm. Vérifiez le drainage des buttes, récoltez les tubercules mûrs.", p_min=35.01),
    R("danger","Froid bloquant la croissance",
      "Température <18°C — croissance arrêtée. Mulchez le sol.", t_lt=18),
    R("success","Conditions idéales pour les tubercules",
      "Grossissement optimal. Buttez les plants, apportez du compost.", t_min=24, t_max=30, p_min=10, p_max=25),
  ],

  "arachide": [
    R("danger","Risque d'aflatoxine — danger sanitaire",
      "Humidité >85% — champignon cancérigène. Ne stockez jamais d'arachide humide, séchez immédiatement.", h_min=85.01),
    R("warning","Reporter la récolte des gousses",
      "Pluie >15mm. Attendez 2-3 jours secs avant de récolter.", p_min=15.01),
    R("success","Remplissage optimal des gousses",
      "Parfait pour la formation des gousses. Évitez tout sarclage profond.", t_min=25, t_max=32, h_min=55, h_max=70),
  ],

  "soja": [
    R("danger","Risque de rouille asiatique du soja",
      "Pluie >20mm — la plus destructrice du soja. Appliquez un fongicide systémique.", p_min=20.01),
    R("danger","Stérilité pollinique du soja",
      "Température >35°C. Arrosez en soirée, protégez les plants en floraison.", t_min=35.01),
    R("success","Conditions idéales pour le soja",
      "Bonne nouaison attendue. Apportez un engrais phosphaté, sarciez.", t_min=22, t_max=30, h_min=60, h_max=75, p_min=10, p_max=15),
  ],

  "niebe": [
    R("danger","Risque d'anthracnose sur niébé",
      "Pluie >20mm. Traitez au fongicide, ne travaillez pas les feuilles mouillées.", p_min=20.01),
    R("danger","Chute des fleurs de niébé",
      "Température >38°C. Arrosez en soirée.", t_min=38.01),
    R("success","Conditions idéales pour le niébé",
      "Adapté à ces conditions chaudes et sèches. Bon moment pour semer.", t_min=25, t_max=35, h_min=50, h_max=65),
  ],

  "voandzou": [
    R("danger","Pourriture des gousses souterraines",
      "Humidité >80%. Vérifiez le drainage, créez des rigoles.", h_min=80.01),
    R("warning","Sécheresse — surveiller la floraison",
      "Pas de pluie + chaleur >36°C. Arrosez si possible pendant la floraison.", p_eq=0, t_min=36.01),
    R("success","Bonnes conditions pour le voandzou",
      "Culture rustique bien adaptée. Pensez à la rotation des cultures.", t_min=25, t_max=33, h_min=50, h_max=70),
  ],

  "carotte": [
    R("danger","Carottes fourchues et amères",
      "Température >28°C — perte de valeur marchande. Installez un ombrage 40-50%.", t_min=28.01),
    R("warning","Risque de fissuration des racines",
      "Pluie >25mm après période sèche. Maintenez un arrosage régulier et modéré.", p_min=25.01),
    R("success","Conditions parfaites pour la carotte",
      "Bon moment pour les semis directs. Ameublissez le sol sur 30cm.", t_min=15, t_max=22, h_min=60, h_max=75),
  ],

  "pomme_de_terre": [
    R("danger","Tubérisation bloquée",
      "Température >30°C — arrêt de formation des tubercules. Ombrez, arrosez en soirée.", t_min=30.01),
    R("danger","Mildiou de la pomme de terre — urgence",
      "Humidité >85% + pluie >20mm — peut détruire une parcelle en 3-4 jours. Agissez immédiatement.", h_min=85.01, p_min=20.01),
    R("success","Conditions idéales pour la pomme de terre",
      "Tubérisation optimale. Buttez les plants, apportez un engrais potassique.", t_min=15, t_max=22, p_min=10, p_max=15),
  ],

  "poireau_celeri_epinard": [
    R("danger","Montaison prématurée — bolting",
      "Température >28°C. Récoltez immédiatement tout ce qui est commercialisable.", t_min=28.01),
    R("warning","Risque de fonte des semis",
      "Humidité >85%. Réduisez l'arrosage, espacez les plants.", h_min=85.01),
    R("success","Conditions parfaites pour légumes de saison fraîche",
      "Idéal pour poireau, céleri et épinard. Bon moment pour semis et repiquages.", t_min=13, t_max=22, h_min=60, h_max=75),
  ],

  "kolatier": [
    R("danger","Chute de noix de cola immatures",
      "Pas de pluie + chaleur >35°C. Irriguez les jeunes kolatiers.", p_eq=0, t_min=35.01),
    R("danger","Casse des branches du kolatier",
      "Vent >45km/h. Ramassez et vendez rapidement les noix tombées.", v_min=45.01),
    R("success","Conditions idéales pour le kolatier",
      "Pluie et chaleur modérée. Récoltez les noix mûres (couleur rosée à rouge).", t_min=22, t_max=30, h_min=70, h_max=80, p_min=0.01),
  ],

  "safoutier": [
    R("danger","Chute prématurée des safous",
      "Pas de pluie + chaleur >35°C. Irriguez les jeunes arbres.", p_eq=0, t_min=35.01),
    R("warning","Risque d'éclatement des safous mûrs",
      "Pluie >30mm. Récoltez immédiatement les régimes mûrs — les éclatés pourrissent en 24h.", p_min=30.01),
    R("success","Grossissement et maturation optimaux",
      "Idéal pour le grossissement. Surveillez la couleur : vert → bleu-noir = mûr.", t_min=24, t_max=32, p_min=10, p_max=20),
  ],

  "moringa": [
    R("danger","Pourriture racinaire sur moringa",
      "Pluie >30mm + humidité >85%. Créez des rigoles de drainage urgentes.", p_min=30.01, h_min=85.01),
    R("warning","Croissance ralentie du moringa",
      "Température <18°C. Protégez les jeunes plants avec un paillage épais.", t_lt=18),
    R("success","Le moringa prospère dans ces conditions",
      "Taillez régulièrement, récoltez les feuilles jeunes pour meilleure valeur nutritive.", t_min=25, t_max=38),
  ],

  # ── Logistique ────────────────────────────────────────────────────────────────
  "transport_perissables": [
    R("danger","Température critique pour les périssables",
      "Température >30°C — dégradation accélérée. Vérifiez la chaîne du froid, transportez de nuit.", t_min=30.01),
    R("warning","Humidité favorisant les moisissures",
      "Humidité >85%. Vérifiez l'état des produits avant chargement.", h_min=85.01),
    R("warning","Bâchage hermétique obligatoire",
      "Pluie >15mm. Vérifiez l'étanchéité de la bâche avant le départ.", p_min=15.01),
  ],

  "transport_pharmaceutique": [
    R("danger","Rupture possible de la chaîne du froid",
      "Température >25°C. Vérifiez le compartiment réfrigéré — vaccins max 8°C.", t_min=25.01),
    R("warning","Protéger les emballages pharmaceutiques",
      "Pluie >10mm. Assurez l'étanchéité du compartiment.", p_min=10.01),
    R("warning","Suspendre les opérations de chargement",
      "Vent >40km/h. Attendez le calme pour manipuler les caisses fragiles.", v_min=40.01),
  ],

  "transport_agricole_brut": [
    R("danger","Humidification des sacs — perte de valeur",
      "Pluie >20mm. Vérifiez l'arrimage des bâches, évitez le chargement sous la pluie.", p_min=20.01),
    R("danger","Routes rurales impraticables",
      "Pluie >30mm. Reportez le chargement, informez les producteurs.", p_min=30.01),
    R("warning","Arrimage renforcé des bâches",
      "Vent >35km/h. Vérifiez l'arrimage, réduisez la vitesse.", v_min=35.01),
  ],

  "transport_construction": [
    R("danger","Le ciment prend par l'humidité",
      "Pluie >10mm — prise prématurée irréversible. Bâchage étanche obligatoire.", p_min=10.01),
    R("danger","Danger — tôles et planches en vol",
      "Vent >40km/h. Vérifiez l'arrimage, garez-vous en lieu sûr si nécessaire.", v_min=40.01),
    R("warning","Routes de chantier impraticables",
      "Pluie >25mm. Reportez la livraison, prévoyez tôt le matin après la pluie.", p_min=25.01),
  ],

  "distribution_carburant": [
    R("danger","Routes glissantes — danger pour citernes",
      "Pluie >20mm. Réduisez la vitesse, évitez les routes secondaires.", p_min=20.01),
    R("danger","Dilatation du carburant — ne pas remplir à 100%",
      "Température >38°C. Laissez 5% de volume libre, évitez le soleil direct.", t_min=38.01),
    R("danger","Risque orageux — garez-vous immédiatement",
      "Vent >50km/h + pluie >15mm — danger foudre sur citerne. Coupez le moteur.", v_min=50.01, p_min=15.01),
  ],

  "livraison_colis": [
    R("danger","Routes glissantes — danger pour motos",
      "Pluie >10mm. Réduisez la vitesse, votre sécurité prime sur les délais.", p_min=10.01),
    R("warning","Protéger les colis de la pluie",
      "Pluie >20mm. Emballez dans des sachets imperméables, prévenez le client.", p_min=20.01),
    R("warning","Instabilité des motos chargées",
      "Vent >30km/h. Réduisez la charge, ralentissez sur les axes dégagés.", v_min=30.01),
  ],

  "transport_betail": [
    R("danger","Stress thermique sur animaux en transit",
      "Température >32°C. Transportez de nuit ou avant 7h, prévoyez de l'eau.", t_min=32.01),
    R("danger","Danger de mortalité pour les volailles",
      "Température >35°C. Arrêtez-vous immédiatement, ventillez et arrosez les cages.", t_min=35.01),
    R("danger","Conditions fatales pour les volailles",
      "Humidité >85% + chaleur >30°C — urgence absolue. Arrêtez-vous, sortez les animaux.", h_min=85.01, t_min=30.01),
  ],

  "approvisionnement_industriel": [
    R("warning","Routes vers zones industrielles dégradées",
      "Pluie >30mm. Prévoyez des délais supplémentaires, évitez les non-goudronnées.", p_min=30.01),
    R("danger","Suspendre les opérations de grue",
      "Vent >45km/h. Suspendez immédiatement — attendez <30km/h pour reprendre.", v_min=45.01),
    R("warning","Protection des pièces métalliques",
      "Humidité >85%. Couvrez les pièces, vérifiez les emballages anti-humidité.", h_min=85.01),
  ],
}

# Alias (partage de règles)
SEUILS["igname"]  = SEUILS["igname_macabo_taro"]
SEUILS["macabo"]  = SEUILS["igname_macabo_taro"]
SEUILS["taro"]    = SEUILS["igname_macabo_taro"]
SEUILS["sorgho"]  = SEUILS["sorgho_mil"]
SEUILS["mil"]     = SEUILS["sorgho_mil"]
SEUILS["poireau"] = SEUILS["poireau_celeri_epinard"]
SEUILS["celeri"]  = SEUILS["poireau_celeri_epinard"]
SEUILS["epinard"] = SEUILS["poireau_celeri_epinard"]

# ── Conditions de semis par culture ──────────────────────────────────────────
# Extraites depuis les règles "success" existantes + ajustées pour le semis.
# Seules les cultures annuelles/maraîchères sont concernées — les pérennes
# (cacao, palmier, hévéa…) se plantent indépendamment des prévisions 5j.
SEMIS = {
  "mais":            lambda m: _c(m, t_min=20, t_max=30, p_min=5,  p_max=20),
  "manioc":          lambda m: _c(m, t_min=24, t_max=32, p_min=8),
  "riz":             lambda m: _c(m, t_min=22, t_max=30, p_min=10),
  "sorgho":          lambda m: _c(m, t_min=26, t_max=36, h_min=40, h_max=65),
  "sorgho_mil":      lambda m: _c(m, t_min=26, t_max=36, h_min=40, h_max=65),
  "mil":             lambda m: _c(m, t_min=26, t_max=36, h_min=40, h_max=65),
  "arachide":        lambda m: _c(m, t_min=25, t_max=32, h_min=55, h_max=70, p_max=9.99),
  "soja":            lambda m: _c(m, t_min=22, t_max=30, h_min=60, h_max=75, p_min=8),
  "niebe":           lambda m: _c(m, t_min=25, t_max=32, h_min=50, h_max=65),
  "voandzou":        lambda m: _c(m, t_min=25, t_max=33, h_min=50, h_max=70),
  "tomate":          lambda m: _c(m, t_min=20, t_max=28, h_min=55, h_max=72, p_max=4.99),
  "piment":          lambda m: _c(m, t_min=22, t_max=30, h_min=55, h_max=72),
  "poivron":         lambda m: _c(m, t_min=22, t_max=30, h_min=55, h_max=72),
  "chou":            lambda m: _c(m, t_min=15, t_max=22, h_min=60, h_max=75),
  "oignon":          lambda m: _c(m, t_min=18, t_max=26, h_max=69.99, p_max=4.99),
  "ail":             lambda m: _c(m, t_min=16, t_max=24, h_min=50, h_max=68, p_max=7.99),
  "laitue":          lambda m: _c(m, t_min=14, t_max=22, h_min=60, h_max=75),
  "carotte":         lambda m: _c(m, t_min=14, t_max=20, h_min=60, h_max=72, p_max=4.99),
  "concombre":       lambda m: _c(m, t_min=22, t_max=30, h_min=58, h_max=75),
  "haricot_vert":    lambda m: _c(m, t_min=20, t_max=28, h_min=55, h_max=72),
  "gombo":           lambda m: _c(m, t_min=26, t_max=34, h_min=50, h_max=70),
  "aubergine_africaine": lambda m: _c(m, t_min=24, t_max=32, h_min=58, h_max=75),
  "pomme_de_terre":  lambda m: _c(m, t_min=14, t_max=20, p_min=8,  p_max=15),
  "poireau":         lambda m: _c(m, t_min=13, t_max=22, h_min=60, h_max=75),
  "poireau_celeri_epinard": lambda m: _c(m, t_min=13, t_max=22, h_min=60, h_max=75),
  "celeri":          lambda m: _c(m, t_min=13, t_max=22, h_min=60, h_max=75),
  "epinard":         lambda m: _c(m, t_min=13, t_max=22, h_min=60, h_max=75),
  "igname":          lambda m: _c(m, t_min=24, t_max=30, p_min=10, p_max=25),
  "igname_macabo_taro": lambda m: _c(m, t_min=24, t_max=30, p_min=10, p_max=25),
  "macabo":          lambda m: _c(m, t_min=24, t_max=30, p_min=10),
  "taro":            lambda m: _c(m, t_min=22, t_max=30, p_min=10),
  "banane_plantain": lambda m: _c(m, t_min=22, t_max=30, p_min=8),
  "ananas":          lambda m: _c(m, t_min=22, t_max=28, h_min=60, h_max=75),
  "papaye":          lambda m: _c(m, t_min=22, t_max=32, h_min=60, h_max=75),
  "moringa":         lambda m: _c(m, t_min=24, t_max=36, p_min=5),
  # Cultures annuelles ajoutées
  "coton":           lambda m: _c(m, t_min=24, t_max=32, h_max=65, p_max=4.99),
  "haricot_vert":    lambda m: _c(m, t_min=20, t_max=28, h_min=55, h_max=72),
}