# backend/recommendations.py

from datetime import datetime, timedelta

# ─── Seuils météo ────────────────────────────────────────────────

SEUILS = {

    # ══════════════════════════════════════════════════════════════
    # AGRICULTURE
    # ══════════════════════════════════════════════════════════════

    # ── Cultures de rente ─────────────────────────────────────────
    "cacao": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Risque de pourriture brune détecté",
            "detail": (
                "Les précipitations dépassent 20mm, ce qui crée une humidité "
                "excessive favorisant la pourriture brune des cabosses. "
                "Suspendez immédiatement la récolte. Inspectez vos cabosses et "
                "retirez celles présentant des taches brunes. Appliquez un "
                "fongicide à base de cuivre sur les plants exposés. Couvrez les "
                "tas de cabosses récoltées avec une bâche imperméable."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de moniliose sur cacaoyers",
            "detail": (
                "L'humidité dépasse 85%, créant des conditions parfaites pour le "
                "développement de la moniliose. Inspectez les cabosses "
                "régulièrement. Retirez et brûlez les cabosses infectées. "
                "Appliquez un traitement fongicide préventif sur l'ensemble de "
                "la parcelle."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Stress thermique sur cacaoyers",
            "detail": (
                "La température dépasse 35°C, ce qui provoque l'avortement des "
                "fleurs et stresse les jeunes plants. Arrosez les jeunes "
                "cacaoyers tôt le matin. Vérifiez l'ombrage des parcelles — "
                "les cacaoyers ne supportent pas le soleil direct prolongé."
            )
        },
        {
            "condition": lambda m: m["vent"] > 40,
            "type": "warning",
            "titre": "Vent fort — risque de chute de cabosses",
            "detail": (
                "Le vent dépasse 40 km/h, ce qui peut provoquer la chute "
                "prématurée des cabosses. Évitez les travaux en hauteur. "
                "Après le passage du vent, ramassez les cabosses tombées et "
                "traitez-les rapidement pour éviter les pertes."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 30 and 70 <= m["humidite"] <= 80 and 3 <= m["precipitation"] <= 15,
            "type": "success",
            "titre": "Conditions optimales pour le cacao",
            "detail": (
                "Température, humidité et précipitations sont dans les plages "
                "idéales. C'est le moment parfait pour la pollinisation manuelle "
                "si vous la pratiquez, pour observer la croissance des cabosses "
                "et pour planifier les travaux d'entretien."
            )
        },
    ],

    "cafe_robusta": [
        {
            "condition": lambda m: m["temperature"] > 32,
            "type": "danger",
            "titre": "Risque de grillure des feuilles",
            "detail": (
                "La température dépasse 32°C, ce qui provoque la grillure des "
                "feuilles des caféiers. Ombrez les jeunes plants avec des "
                "branchages ou des filets d'ombrage. Arrosez en soirée pour "
                "rafraîchir le sol sans brûler les feuilles."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "danger",
            "titre": "Risque de rouille orangée",
            "detail": (
                "Les fortes pluies favorisent la rouille orangée du caféier. "
                "Après la pluie, appliquez un traitement au cuivre sur les "
                "feuilles. Inspectez régulièrement le dessous des feuilles "
                "pour détecter les taches jaune-orangé caractéristiques."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "warning",
            "titre": "Humidité excessive — surveiller le feuillage",
            "detail": (
                "L'humidité élevée favorise la rouille et l'anthracnose. "
                "Inspectez le feuillage de vos caféiers. Si des taches "
                "apparaissent, traitez immédiatement au fongicide cuivrique. "
                "Évitez tout arrosage supplémentaire."
            )
        },
        {
            "condition": lambda m: 18 <= m["temperature"] <= 28 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions idéales pour la floraison",
            "detail": (
                "Les conditions actuelles sont parfaites pour la floraison et "
                "la nouaison des cerises de café. Profitez-en pour observer "
                "l'état de vos plants et noter les parcelles les plus "
                "productives pour la prochaine récolte."
            )
        },
    ],

    "cafe_arabica": [
        {
            "condition": lambda m: m["temperature"] > 28,
            "type": "danger",
            "titre": "Chaleur excessive pour l'arabica",
            "detail": (
                "L'arabica est plus sensible à la chaleur que le robusta. "
                "Au-dessus de 28°C, la qualité du grain se dégrade. "
                "Renforcez l'ombrage et arrosez matin et soir si possible."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "danger",
            "titre": "Risque de rouille orangée sur arabica",
            "detail": (
                "Les fortes précipitations favorisent la rouille. L'arabica "
                "y est particulièrement vulnérable. Appliquez un traitement "
                "préventif au cuivre dès la fin de la pluie. Élaguez pour "
                "améliorer la circulation de l'air entre les plants."
            )
        },
        {
            "condition": lambda m: 15 <= m["temperature"] <= 24 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions idéales pour l'arabica",
            "detail": (
                "Ces conditions fraîches et humides sont parfaites pour "
                "l'arabica. Excellent moment pour effectuer la taille "
                "d'entretien et appliquer de l'engrais organique."
            )
        },
    ],

    "palmier_huile": [
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 33,
            "type": "danger",
            "titre": "Sécheresse critique pour le palmier",
            "detail": (
                "L'absence de pluie combinée à une forte chaleur stresse "
                "gravement les palmiers, surtout les jeunes plants. Irriguez "
                "les jeunes palmiers si possible. Pour les adultes, surveillez "
                "les signes de stress : feuilles qui jaunissent ou pendent."
            )
        },
        {
            "condition": lambda m: m["vent"] > 50,
            "type": "danger",
            "titre": "Vent violent — danger pour les palmiers",
            "detail": (
                "Des vents supérieurs à 50 km/h peuvent coucher les jeunes "
                "palmiers. Inspectez les tuteurs après le passage du vent. "
                "Évitez les travaux en hauteur sur les échelles d'observation."
            )
        },
        {
            "condition": lambda m: 5 <= m["precipitation"] <= 20 and 25 <= m["temperature"] <= 32,
            "type": "success",
            "titre": "Conditions idéales — récolte et engrais",
            "detail": (
                "Conditions parfaites pour la récolte des régimes et "
                "l'application d'engrais. Profitez de cette fenêtre pour "
                "effectuer les travaux d'entretien des parcelles."
            )
        },
    ],

    "hevea": [
        {
            "condition": lambda m: m["precipitation"] > 15,
            "type": "danger",
            "titre": "Suspendre les saignées",
            "detail": (
                "La pluie dilue le latex et expose les blessures de saignée "
                "aux infections fongiques. Suspendez toutes les saignées "
                "pendant et après la pluie. Attendez que l'écorce soit "
                "complètement sèche avant de reprendre."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 90,
            "type": "danger",
            "titre": "Risque de pourriture du panneau de saignée",
            "detail": (
                "L'humidité extrême favorise la pourriture des panneaux. "
                "Inspectez les zones de saignée. Appliquez un fongicide sur "
                "les panneaux affectés. Réduisez la profondeur des incisions."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 60 <= m["humidite"] <= 78 and m["precipitation"] == 0,
            "type": "success",
            "titre": "Conditions idéales pour la saignée",
            "detail": (
                "Temps sec, température et humidité optimales. Effectuez les "
                "saignées tôt le matin entre 5h et 8h pour maximiser le "
                "rendement en latex. C'est la meilleure fenêtre de travail."
            )
        },
    ],

    "coton": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Reporter la récolte du coton",
            "detail": (
                "Le coton mouillé perd de sa valeur commerciale et développe "
                "des moisissures rapidement. Reportez toute récolte. Si du "
                "coton est déjà récolté, étalez-le immédiatement sous abri "
                "ventilé pour séchage d'urgence."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 38,
            "type": "danger",
            "titre": "Chute des capsules — stress hydrique",
            "detail": (
                "La chaleur extrême provoque la chute prématurée des capsules "
                "de coton. Irriguez si possible. Évitez tout travail au sol "
                "qui compacte la terre et aggrave le stress hydrique."
            )
        },
        {
            "condition": lambda m: 28 <= m["temperature"] <= 35 and m["humidite"] < 65 and m["precipitation"] == 0,
            "type": "success",
            "titre": "Conditions idéales pour la récolte",
            "detail": (
                "Temps chaud et sec — conditions parfaites pour la récolte "
                "et le séchage du coton. Organisez les équipes de cueillette "
                "et prévoyez des zones de stockage bien ventilées."
            )
        },
    ],

    "the": [
        {
            "condition": lambda m: m["temperature"] > 30,
            "type": "danger",
            "titre": "Brûlure des jeunes pousses de thé",
            "detail": (
                "Au-dessus de 30°C, les jeunes pousses de théier brûlent et "
                "perdent leur qualité. Installez un ombrage temporaire. "
                "Arrosez tôt le matin uniquement. Reportez la cueillette "
                "aux heures fraîches."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "warning",
            "titre": "Reporter la cueillette du thé",
            "detail": (
                "Les feuilles de thé mouillées fermentent mal et produisent "
                "un thé de mauvaise qualité. Attendez que les feuilles soient "
                "sèches avant toute cueillette. En général, attendre 4 à 6 "
                "heures après la fin de la pluie."
            )
        },
        {
            "condition": lambda m: 18 <= m["temperature"] <= 28 and 70 <= m["humidite"] <= 80,
            "type": "success",
            "titre": "Conditions idéales pour la cueillette du thé",
            "detail": (
                "Température fraîche et humidité correcte — les bourgeons "
                "sont tendres et aromatiques. C'est le moment idéal pour "
                "la cueillette fine. Récoltez les deux premières feuilles "
                "et le bourgeon terminal."
            )
        },
    ],

    # ── Maraîchage ────────────────────────────────────────────────
    "tomate": [
        {
            "condition": lambda m: m["humidite"] > 80 and m["temperature"] > 28,
            "type": "danger",
            "titre": "Risque élevé de mildiou sur tomates",
            "detail": (
                "L'humidité élevée combinée à la chaleur crée les conditions "
                "parfaites pour le mildiou (Phytophthora). Inspectez le "
                "feuillage — taches brunes avec liseré jaune au-dessus, "
                "duvet blanc en-dessous. Traitez au mancozèbe ou au cuivre "
                "immédiatement. Évitez tout arrosage par aspersion."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "danger",
            "titre": "Risque d'éclatement des fruits et fonte des semis",
            "detail": (
                "Les fortes pluies provoquent l'éclatement des tomates mûres "
                "et la fonte des semis. Récoltez immédiatement les tomates "
                "bien colorées avant la pluie si possible. Vérifiez le "
                "drainage des parcelles — évacuez l'eau stagnante."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Chute des fleurs de tomate",
            "detail": (
                "Au-dessus de 35°C, les fleurs de tomate tombent sans former "
                "de fruit. Arrosez exclusivement en soirée. Paillez le sol "
                "pour maintenir la fraîcheur. Installez un ombrage léger "
                "si la chaleur persiste plusieurs jours."
            )
        },
        {
            "condition": lambda m: m["vent"] > 35,
            "type": "warning",
            "titre": "Vent fort — protéger les plants",
            "detail": (
                "Le vent peut briser les tiges et blesser les fruits. "
                "Vérifiez les tuteurs et renforcez l'attachage des tiges "
                "principales. Les blessures causées par le vent sont des "
                "portes d'entrée aux maladies bactériennes."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 60 <= m["humidite"] <= 75 and m["precipitation"] == 0,
            "type": "success",
            "titre": "Conditions idéales pour traitement et pollinisation",
            "detail": (
                "Temps sans pluie, humidité et température optimales. "
                "Moment idéal pour appliquer des traitements phytosanitaires "
                "— agissez tôt le matin. Les pollinisateurs sont actifs : "
                "bonne période de nouaison."
            )
        },
    ],

    "piment": [
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Chute massive des fleurs de piment",
            "detail": (
                "La chaleur excessive provoque la chute des fleurs avant "
                "qu'elles se transforment en fruits. Arrosez en soirée. "
                "Paillez le sol avec de la paille ou des feuilles mortes "
                "pour maintenir la fraîcheur des racines."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque d'anthracnose sur piments",
            "detail": (
                "L'humidité excessive favorise l'anthracnose — taches noires "
                "et pourriture des fruits. Retirez et détruisez les fruits "
                "atteints. Appliquez un fongicide à base de mancozèbe. "
                "Évitez tout arrosage par-dessus le feuillage."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 32 and 55 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Excellente période de fructification",
            "detail": (
                "Conditions idéales pour la croissance et la fructification "
                "du piment. Profitez-en pour apporter un engrais riche en "
                "potassium qui améliore la qualité et le piquant des fruits."
            )
        },
    ],

    "chou": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Risque de fonte des semis et pourriture",
            "detail": (
                "Les fortes pluies provoquent la fonte des semis et la "
                "pourriture du collet. Vérifiez le drainage — l'eau ne doit "
                "pas stagner. Buttez la base des plants pour les protéger. "
                "Évitez tout arrosage supplémentaire."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de hernie du chou",
            "detail": (
                "L'humidité excessive favorise la hernie du chou, une maladie "
                "fongique du sol très destructrice. Chaulez le sol si le pH "
                "est acide. Ne replantez pas du chou sur une parcelle atteinte "
                "avant 4 ans. Traitez avec un fongicide homologué."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 30,
            "type": "danger",
            "titre": "Le chou monte en graine",
            "detail": (
                "Au-dessus de 30°C, le chou monte en graine et perd toute "
                "valeur marchande. Récoltez immédiatement les pommes bien "
                "formées. Pour les plants jeunes, installez un ombrage et "
                "arrosez matin et soir."
            )
        },
        {
            "condition": lambda m: 15 <= m["temperature"] <= 25 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions parfaites pour le chou",
            "detail": (
                "Fraîcheur et humidité idéales pour la formation de la pomme. "
                "Apportez un engrais azoté pour favoriser la croissance "
                "foliaire. Vérifiez l'absence de chenilles qui profitent "
                "aussi de ces conditions."
            )
        },
    ],

    "oignon": [
        {
            "condition": lambda m: m["humidite"] > 80,
            "type": "danger",
            "titre": "Risque de mildiou de l'oignon",
            "detail": (
                "Le mildiou de l'oignon se développe rapidement par forte "
                "humidité — feuilles qui jaunissent et se couchent. "
                "Appliquez un fongicide systémique. Réduisez l'arrosage "
                "au strict minimum. Veillez à une bonne aération entre "
                "les rangées."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 15,
            "type": "warning",
            "titre": "Reporter la récolte des bulbes",
            "detail": (
                "Les bulbes gorgés d'eau se conservent très mal et pourrissent "
                "rapidement. Attendez un temps sec pour récolter. Si la "
                "récolte est urgente, étalez les bulbes immédiatement "
                "sous abri ventilé pour séchage."
            )
        },
        {
            "condition": lambda m: 20 <= m["temperature"] <= 30 and m["humidite"] < 70 and m["precipitation"] == 0,
            "type": "success",
            "titre": "Moment idéal pour la récolte et le séchage",
            "detail": (
                "Temps chaud et sec — conditions parfaites pour récolter "
                "et sécher les bulbes d'oignon. Laissez les bulbes au sol "
                "2 à 3 jours après arrachage puis stockez dans un endroit "
                "sec et ventilé."
            )
        },
    ],

    "ail": [
        {
            "condition": lambda m: m["humidite"] > 80,
            "type": "danger",
            "titre": "Risque de pourriture blanche de l'ail",
            "detail": (
                "L'humidité élevée favorise la pourriture blanche, un "
                "champignon qui détruit les bulbes dans le sol. Améliorez "
                "le drainage. Évitez tout arrosage. Retirez et brûlez les "
                "plants infectés — ne les compostez pas."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Excès d'eau fatal pour l'ail",
            "detail": (
                "L'ail supporte très mal l'excès d'eau. Vérifiez et améliorez "
                "d'urgence le drainage des parcelles. Si le sol est gorgé d'eau, "
                "créez des rigoles d'évacuation. Évitez de marcher dans "
                "les rangs pour ne pas compacter le sol mouillé."
            )
        },
        {
            "condition": lambda m: 18 <= m["temperature"] <= 28 and 55 <= m["humidite"] <= 70,
            "type": "success",
            "titre": "Conditions idéales pour la bulbification",
            "detail": (
                "Température et humidité parfaites pour la formation des "
                "bulbes. Réduisez légèrement l'arrosage pour concentrer "
                "les arômes. C'est le moment d'apporter un engrais riche "
                "en potassium et phosphore."
            )
        },
    ],

    "laitue": [
        {
            "condition": lambda m: m["temperature"] > 28,
            "type": "danger",
            "titre": "La laitue monte en fleur",
            "detail": (
                "Au-dessus de 28°C, la laitue monte en graine — elle devient "
                "amère et invendable. Récoltez immédiatement les laitues "
                "bien formées. Pour les jeunes plants, installez un ombrage "
                "50% et arrosez matin et soir."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de pourriture grise sur laitue",
            "detail": (
                "L'humidité excessive provoque la pourriture grise des "
                "feuilles externes. Retirez les feuilles atteintes. "
                "Espacez davantage les plants pour améliorer la ventilation. "
                "Évitez l'arrosage par aspersion — arrosez au pied."
            )
        },
        {
            "condition": lambda m: 15 <= m["temperature"] <= 22 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions parfaites pour la laitue",
            "detail": (
                "Fraîcheur idéale pour une laitue croquante et bien formée. "
                "Bon moment pour les semis en pépinière et les repiquages. "
                "Arrosez modérément le matin uniquement."
            )
        },
    ],

    "concombre": [
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque d'oïdium sur concombre",
            "detail": (
                "L'oïdium se manifeste par un feutrage blanc sur les feuilles. "
                "Appliquez du soufre mouillable ou du bicarbonate de soude "
                "dilué. Supprimez les feuilles très atteintes. Améliorez "
                "la circulation d'air entre les plants."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "warning",
            "titre": "Protéger les fruits du contact au sol",
            "detail": (
                "Les fortes pluies projettent de la terre sur les fruits "
                "et favorisent la pourriture. Posez des tuteurs ou des "
                "paillages sous les fruits. Vérifiez le drainage de la parcelle."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 32 and 60 <= m["humidite"] <= 78,
            "type": "success",
            "titre": "Croissance rapide des concombres",
            "detail": (
                "Conditions idéales pour une croissance rapide. Récoltez "
                "régulièrement — un concombre laissé trop longtemps sur "
                "le plant épuise la plante et réduit la production suivante."
            )
        },
    ],

    "haricot_vert": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Risque de rouille et anthracnose",
            "detail": (
                "Les pluies fortes favorisent la rouille et l'anthracnose "
                "du haricot. Après la pluie, appliquez un fongicide "
                "préventif. Évitez de travailler dans la parcelle tant "
                "que les feuilles sont mouillées — cela propage les spores."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 32,
            "type": "danger",
            "titre": "Chute des fleurs — gousses vides",
            "detail": (
                "La chaleur excessive provoque la chute des fleurs et "
                "donne des gousses vides. Arrosez en soirée. Paillez "
                "le sol. Si la chaleur persiste, attendez la prochaine "
                "saison pour replanter."
            )
        },
        {
            "condition": lambda m: 20 <= m["temperature"] <= 28 and 55 <= m["humidite"] <= 72,
            "type": "success",
            "titre": "Conditions idéales pour le haricot vert",
            "detail": (
                "Floraison et formation des gousses dans les meilleures "
                "conditions. Apportez un engrais potassique pour améliorer "
                "la qualité des gousses. Récoltez tous les 2 jours pour "
                "stimuler la production."
            )
        },
    ],

    "gombo": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Chute et pourriture des fruits de gombo",
            "detail": (
                "Les fortes pluies provoquent la chute et la pourriture "
                "des fruits. Récoltez les gombos mûrs avant la pluie. "
                "Vérifiez le drainage — le gombo ne supporte pas "
                "les sols gorgés d'eau."
            )
        },
        {
            "condition": lambda m: m["temperature"] < 18,
            "type": "danger",
            "titre": "Froid bloquant la croissance du gombo",
            "detail": (
                "Le gombo est très sensible au froid. En-dessous de 18°C, "
                "la croissance est bloquée et les fleurs avortent. "
                "Couvrez les plants la nuit si possible. Attendez le "
                "retour de la chaleur pour semer de nouveaux plants."
            )
        },
        {
            "condition": lambda m: 28 <= m["temperature"] <= 35 and 55 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Le gombo adore ces conditions",
            "detail": (
                "Chaleur et humidité idéales pour une croissance rapide "
                "du gombo. Récoltez tous les 2 à 3 jours — les fruits "
                "doivent être récoltés jeunes (8-10 cm) pour rester tendres "
                "et éviter qu'ils ne durcissent."
            )
        },
    ],

    "aubergine_africaine": [
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de verticilliose sur aubergine",
            "detail": (
                "La verticilliose provoque un flétrissement brutal des tiges. "
                "Il n'existe pas de traitement curatif — retirez et brûlez "
                "les plants atteints. Ne replantez pas d'aubergine sur "
                "cette parcelle avant 3 ans."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 38,
            "type": "danger",
            "titre": "Brûlures des fruits d'aubergine",
            "detail": (
                "La chaleur extrême provoque des brûlures sur les fruits "
                "exposés au soleil direct. Installez un ombrage léger. "
                "Arrosez abondamment en soirée. Les fruits brûlés sont "
                "invendables — récoltez-les pour limiter les pertes."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 33 and 60 <= m["humidite"] <= 78,
            "type": "success",
            "titre": "Excellentes conditions pour l'aubergine",
            "detail": (
                "Fructification dans les meilleures conditions. Taillez "
                "les rameaux secondaires pour concentrer l'énergie sur "
                "les fruits principaux. Apportez un engrais potassique "
                "pour améliorer la qualité."
            )
        },
    ],

    "poivron": [
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Chute des fleurs de poivron",
            "detail": (
                "Même mécanisme que le piment — la chaleur fait tomber "
                "les fleurs. Ombrez les plants et arrosez en soirée. "
                "Paillez le sol pour maintenir la fraîcheur des racines."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de botrytis sur poivron",
            "detail": (
                "La pourriture grise (botrytis) se développe par forte "
                "humidité. Retirez les parties atteintes. Appliquez un "
                "fongicide adapté. Évitez les arrosages le soir qui "
                "maintiennent l'humidité nocturne."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 55 <= m["humidite"] <= 72,
            "type": "success",
            "titre": "Conditions idéales pour le poivron",
            "detail": (
                "Nouaison et coloration des fruits dans les meilleures "
                "conditions. Pour obtenir des poivrons rouges ou jaunes, "
                "laissez-les mûrir sur le plant — ils changeront de couleur "
                "naturellement."
            )
        },
    ],

    # ── Fruits tropicaux ──────────────────────────────────────────
    "banane_plantain": [
        {
            "condition": lambda m: m["vent"] > 35,
            "type": "danger",
            "titre": "Risque de verse des bananiers",
            "detail": (
                "Les vents forts couchent facilement les bananiers chargés "
                "de régimes. Tuteurez immédiatement les plants les plus "
                "exposés avec des bambous ou des piquets. Récoltez les "
                "régimes presque mûrs avant que le vent ne les fasse tomber."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "warning",
            "titre": "Éviter la récolte par forte pluie",
            "detail": (
                "Les régimes récoltés sous la pluie sont gorgés d'eau "
                "et pourrissent plus vite. Attendez la fin de la pluie "
                "pour récolter. Couvrez les régimes déjà récoltés avec "
                "des feuilles de bananier."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 32 and 5 <= m["precipitation"] <= 15,
            "type": "success",
            "titre": "Conditions idéales pour le bananier",
            "detail": (
                "Pluie modérée et chaleur optimale. Bon moment pour "
                "planter de nouveaux rejets et apporter de l'engrais. "
                "Inspectez les régimes en cours de développement."
            )
        },
    ],

    "ananas": [
        {
            "condition": lambda m: m["temperature"] > 38,
            "type": "danger",
            "titre": "Brûlures sur plants d'ananas",
            "detail": (
                "La chaleur extrême brûle les jeunes plants. Couvrez-les "
                "avec des feuilles de palmier ou un voile d'ombrage. "
                "Arrosez tôt le matin pour rafraîchir le sol sans brûler "
                "les feuilles par réfraction."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de fusariose sur ananas",
            "detail": (
                "La fusariose est la principale maladie fongique de l'ananas "
                "par forte humidité. Traitez au fongicide. Assurez un bon "
                "drainage — l'ananas ne supporte pas les sols engorgés."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 30 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Fructification optimale de l'ananas",
            "detail": (
                "Conditions idéales pour le grossissement du fruit. "
                "Vérifiez la coloration de la base des fruits — quand "
                "elle vire au jaune, la récolte est proche."
            )
        },
    ],

    "mangue": [
        {
            "condition": lambda m: m["precipitation"] > 10 and m["humidite"] > 80,
            "type": "danger",
            "titre": "Risque d'anthracnose sur manguier",
            "detail": (
                "La pluie et l'humidité pendant la floraison provoquent "
                "l'anthracnose — taches noires sur fleurs et jeunes fruits. "
                "Traitez au cuivre ou au mancozèbe. Évitez l'arrosage "
                "par-dessus le feuillage."
            )
        },
        {
            "condition": lambda m: m["vent"] > 40,
            "type": "danger",
            "titre": "Chute de mangues immatures",
            "detail": (
                "Les vents forts font tomber les mangues avant maturité. "
                "Ramassez les mangues tombées pour les vendre rapidement "
                "ou les transformer. Inspectez les branches chargées "
                "et récoltez les fruits presque mûrs."
            )
        },
        {
            "condition": lambda m: m["precipitation"] == 0 and 20 <= m["temperature"] <= 30,
            "type": "success",
            "titre": "Conditions favorables à la floraison",
            "detail": (
                "La saison sèche avec des températures modérées est idéale "
                "pour la floraison du manguier. Ne perturbez pas les "
                "branches fleuries. C'est la période la plus critique "
                "pour le rendement de la prochaine récolte."
            )
        },
    ],

    "papaye": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Risque de pourriture racinaire sur papayer",
            "detail": (
                "Le papayer est extrêmement sensible à l'excès d'eau. "
                "Créez des rigoles de drainage autour des plants. "
                "Si le sol est déjà gorgé, surélevez la zone de plantation. "
                "Un papayer dont les racines pourrissent est perdu en 48h."
            )
        },
        {
            "condition": lambda m: m["vent"] > 40,
            "type": "danger",
            "titre": "Verse des papayers — tuteurage urgent",
            "detail": (
                "Les papayers ont un tronc fragile et tombent facilement. "
                "Tuteurez tous les plants avec des bambous solides. "
                "Récoltez les fruits presque mûrs avant le passage du vent."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 35 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Excellente période pour le papayer",
            "detail": (
                "Conditions idéales pour la croissance et la fructification. "
                "Arrosez régulièrement mais sans excès. Bon moment pour "
                "apporter un engrais équilibré NPK."
            )
        },
    ],

    "avocat": [
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "danger",
            "titre": "Risque de pourriture racinaire sur avocatier",
            "detail": (
                "L'excès d'eau favorise Phytophthora, champignon qui détruit "
                "les racines des avocatiers. Améliorez le drainage. "
                "Traitez le sol avec un fongicide systémique adapté. "
                "Un avocatier adulte résiste mieux mais les jeunes plants "
                "sont très vulnérables."
            )
        },
        {
            "condition": lambda m: m["vent"] > 35,
            "type": "warning",
            "titre": "Chute prématurée d'avocats",
            "detail": (
                "Le vent arrache les avocats avant maturité. Ramassez "
                "les fruits tombés et mettez-les à mûrir dans un endroit "
                "sombre et chaud. Évitez de les exposer directement au soleil "
                "pour la maturation."
            )
        },
        {
            "condition": lambda m: 20 <= m["temperature"] <= 28 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions idéales pour l'avocatier",
            "detail": (
                "Floraison et nouaison dans les meilleures conditions. "
                "Ne perturbez pas les branches fleuries. Arrosez modérément "
                "et régulièrement — l'avocatier préfère un arrosage stable "
                "plutôt qu'irrégulier."
            )
        },
    ],

    "agrumes": [
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque de gommose sur agrumes",
            "detail": (
                "La gommose (Phytophthora) se manifeste par des écoulements "
                "de gomme sur le tronc. Grattez les parties atteintes et "
                "appliquez de la bouillie bordelaise. Améliorez le drainage "
                "autour du tronc — la base ne doit jamais être en contact "
                "avec de l'eau stagnante."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "warning",
            "titre": "Chute de fleurs et jeunes fruits",
            "detail": (
                "Les fortes pluies font tomber les fleurs et les jeunes fruits. "
                "C'est une perte normale dans une certaine mesure. Si les "
                "chutes sont excessives, vérifiez que le drainage est correct "
                "et que les plants ne souffrent pas d'un excès d'azote."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 5 <= m["precipitation"] <= 15,
            "type": "success",
            "titre": "Coloration et sucrosité optimales",
            "detail": (
                "Conditions idéales pour la maturation des agrumes. "
                "La différence jour/nuit de température améliore la coloration "
                "et la sucrosité. Bon moment pour récolter les fruits mûrs "
                "et apporter un engrais potassique."
            )
        },
    ],

    # ── Céréales et tubercules ────────────────────────────────────
    "mais": [
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 33,
            "type": "danger",
            "titre": "Stress hydrique critique sur maïs",
            "detail": (
                "Le maïs en floraison est très sensible au manque d'eau. "
                "Irriguez si possible, en priorité les parcelles en floraison. "
                "Paillez le sol pour limiter l'évaporation. "
                "Un stress de 3 jours pendant la floraison peut réduire "
                "le rendement de 50%."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Risque de verse et pourriture de tige",
            "detail": (
                "Les fortes pluies couchent le maïs (verse) et favorisent "
                "la pourriture de tige. Drainablez les parcelles. "
                "Les plants versés peuvent être redressés s'ils sont jeunes. "
                "Après la récolte, détruisez les résidus infectés."
            )
        },
        {
            "condition": lambda m: 5 <= m["precipitation"] <= 20 and 22 <= m["temperature"] <= 30,
            "type": "success",
            "titre": "Conditions idéales pour le maïs",
            "detail": (
                "Pluie modérée et chaleur optimale. Excellent moment pour "
                "les semis ou l'apport d'engrais azoté en couverture. "
                "Profitez-en pour sarcler et butter les plants."
            )
        },
    ],

    "manioc": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Risque de pourriture des tubercules",
            "detail": (
                "L'excès d'eau dans un sol mal drainé provoque la pourriture "
                "des tubercules de manioc. Vérifiez le drainage. Évitez "
                "de récolter dans un sol gorgé d'eau — les tubercules "
                "se cassent et s'abîment."
            )
        },
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 35,
            "type": "warning",
            "titre": "Sécheresse — surveiller les jeunes plants",
            "detail": (
                "Le manioc adulte résiste bien à la sécheresse mais les "
                "jeunes plants (moins de 3 mois) sont vulnérables. "
                "Arrosez les jeunes plants si nécessaire. Paillez le sol "
                "pour limiter l'évaporation."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 35 and 10 <= m["precipitation"] <= 20,
            "type": "success",
            "titre": "Conditions idéales pour le manioc",
            "detail": (
                "Chaleur et humidité optimales pour la croissance des "
                "tubercules. Bon moment pour les boutures et l'entretien "
                "des parcelles. Sarciez pour éliminer la concurrence "
                "des mauvaises herbes."
            )
        },
    ],

    "sorgho_mil": [
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "danger",
            "titre": "Risque d'ergot à la floraison",
            "detail": (
                "L'ergot du sorgho est un champignon qui remplace les grains "
                "par des corps toxiques noirs. Les pluies pendant la floraison "
                "favorisent sa propagation. Les grains atteints sont toxiques "
                "pour les humains et les animaux — triez soigneusement "
                "la récolte."
            )
        },
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 40,
            "type": "danger",
            "titre": "Chaleur extrême — grains vides",
            "detail": (
                "Au-delà de 40°C sans pluie, les épis donnent des grains "
                "vides. Irriguez si possible. Le sorgho et le mil sont "
                "résistants mais ont une limite — protégez les plants "
                "les plus jeunes en priorité."
            )
        },
        {
            "condition": lambda m: 28 <= m["temperature"] <= 38 and 40 <= m["humidite"] <= 65,
            "type": "success",
            "titre": "Conditions idéales pour sorgho et mil",
            "detail": (
                "Ces cultures sont parfaitement adaptées à ces conditions "
                "chaudes et relativement sèches. Excellent moment pour "
                "les travaux d'entretien et le sarclage."
            )
        },
    ],

    "riz": [
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Stérilité pollinique du riz",
            "detail": (
                "Au-dessus de 35°C pendant la floraison, les grains de riz "
                "sont vides. Irriguez avec de l'eau fraîche pour refroidir "
                "les parcelles. Récoltez tôt le matin quand la floraison "
                "a lieu — les températures sont plus basses."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 90,
            "type": "danger",
            "titre": "Risque de pyriculariose sur riz",
            "detail": (
                "La pyriculariose est la maladie la plus destructrice du riz. "
                "Elle se développe par forte humidité. Appliquez un fongicide "
                "systémique dès les premiers symptômes (taches losangiques "
                "grises sur les feuilles). Réduisez l'apport d'azote "
                "qui aggrave la maladie."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 30,
            "type": "success",
            "titre": "Température idéale pour le riz",
            "detail": (
                "Conditions thermiques parfaites pour la croissance et "
                "le tallage du riz. Maintenez une lame d'eau de 5 à 10 cm "
                "dans les rizières. Bon moment pour apporter de l'engrais "
                "azoté en couverture."
            )
        },
    ],

    "igname_macabo_taro": [
        {
            "condition": lambda m: m["precipitation"] > 35,
            "type": "danger",
            "titre": "Risque de pourriture des tubercules",
            "detail": (
                "L'excès d'eau pourrit rapidement ces tubercules dans le sol. "
                "Vérifiez le drainage des buttes de plantation. Si des "
                "tubercules sont mûrs, récoltez-les avant qu'ils ne pourrissent. "
                "Évitez de travailler dans les parcelles inondées."
            )
        },
        {
            "condition": lambda m: m["temperature"] < 18,
            "type": "danger",
            "titre": "Froid bloquant la croissance",
            "detail": (
                "Ces cultures tropicales souffrent sous 18°C. La croissance "
                "s'arrête. Mulchez le sol pour maintenir la chaleur des "
                "racines. Attendez le retour de la chaleur — les tubercules "
                "ne sont pas perdus mais la croissance sera retardée."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 30 and 10 <= m["precipitation"] <= 25,
            "type": "success",
            "titre": "Conditions idéales pour les tubercules",
            "detail": (
                "Chaleur et humidité optimales pour le grossissement des "
                "tubercules. Buttez les plants pour favoriser le développement. "
                "Bon moment pour apporter du compost ou de l'engrais organique."
            )
        },
    ],

    # ── Légumineuses ──────────────────────────────────────────────
    "arachide": [
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "danger",
            "titre": "Risque d'aflatoxine — danger sanitaire",
            "detail": (
                "L'aflatoxine est un champignon toxique qui se développe "
                "sur l'arachide par forte humidité. Ne stockez jamais "
                "de l'arachide humide. Séchez immédiatement toute récolte "
                "sous abri ventilé. L'aflatoxine est cancérigène — "
                "prenez ce risque très au sérieux."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 15,
            "type": "warning",
            "titre": "Reporter la récolte des gousses",
            "detail": (
                "Les gousses récoltées mouillées moisissent rapidement. "
                "Attendez 2 à 3 jours secs après la pluie avant de récolter. "
                "Si la récolte est urgente, étalez immédiatement sous "
                "un abri bien ventilé."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 32 and 55 <= m["humidite"] <= 70,
            "type": "success",
            "titre": "Remplissage optimal des gousses",
            "detail": (
                "Conditions parfaites pour le remplissage des gousses "
                "d'arachide. Ne perturbez pas le sol — les gynophores "
                "(tiges qui s'enfoncent en terre) sont en train de former "
                "les gousses. Évitez tout sarclage profond."
            )
        },
    ],

    "soja": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Risque de rouille asiatique du soja",
            "detail": (
                "La rouille asiatique se propage par les éclaboussures "
                "de pluie. Appliquez un fongicide systémique dès les "
                "premiers symptômes (petites pustules brunes sous les feuilles). "
                "C'est la maladie la plus destructrice du soja."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Stérilité pollinique du soja",
            "detail": (
                "Au-dessus de 35°C, le soja ne se pollinise plus correctement. "
                "Arrosez en soirée si possible. Les gousses formées avant "
                "la chaleur ne sont pas affectées — protégez les plants "
                "encore en floraison."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 60 <= m["humidite"] <= 75 and 10 <= m["precipitation"] <= 15,
            "type": "success",
            "titre": "Conditions idéales pour le soja",
            "detail": (
                "Bonne nouaison attendue. Apportez un engrais phosphaté "
                "pour favoriser la formation des gousses. Sarciez pour "
                "éliminer les mauvaises herbes qui concurrencent les plants."
            )
        },
    ],

    "niebe": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Risque d'anthracnose sur niébé",
            "detail": (
                "Les fortes pluies favorisent l'anthracnose — taches sombres "
                "sur les gousses. Traitez au fongicide. Évitez de travailler "
                "dans la parcelle quand les feuilles sont mouillées."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 38,
            "type": "danger",
            "titre": "Chute des fleurs de niébé",
            "detail": (
                "La chaleur extrême fait tomber les fleurs avant la nouaison. "
                "Le niébé est résistant mais a ses limites. Arrosez en soirée. "
                "Attendez le retour de températures plus clémentes."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 35 and 50 <= m["humidite"] <= 65,
            "type": "success",
            "titre": "Conditions idéales pour le niébé",
            "detail": (
                "Le niébé s'adapte parfaitement à ces conditions chaudes "
                "et relativement sèches. Bon moment pour semer et entretenir. "
                "Récoltez les gousses vertes pour la consommation "
                "ou attendez la maturité complète pour les graines sèches."
            )
        },
    ],

    "voandzou": [
        {
            "condition": lambda m: m["humidite"] > 80,
            "type": "danger",
            "titre": "Pourriture des gousses souterraines",
            "detail": (
                "Le voandzou forme ses gousses sous terre comme l'arachide. "
                "L'humidité excessive les fait pourrir. Vérifiez le drainage. "
                "Si le sol est gorgé d'eau, créez des rigoles d'évacuation "
                "autour des buttes de plantation."
            )
        },
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 36,
            "type": "warning",
            "titre": "Sécheresse — surveiller la floraison",
            "detail": (
                "La sécheresse pendant la floraison réduit la formation "
                "des gousses. Le voandzou est rustique mais arrosez "
                "si possible pendant cette phase critique."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 33 and 50 <= m["humidite"] <= 70,
            "type": "success",
            "titre": "Bonnes conditions pour le voandzou",
            "detail": (
                "Conditions adaptées à cette culture rustique. Bon moment "
                "pour semer et effectuer les travaux d'entretien. "
                "Le voandzou enrichit le sol en azote — pensez à la rotation "
                "des cultures."
            )
        },
    ],

    # ── Cultures de saison froide ─────────────────────────────────
    "carotte": [
        {
            "condition": lambda m: m["temperature"] > 28,
            "type": "danger",
            "titre": "Carottes fourchues et amères",
            "detail": (
                "Au-dessus de 28°C, les carottes se bifurquent et deviennent "
                "amères — elles perdent leur valeur marchande. Installez "
                "un ombrage 40 à 50%. Arrosez tôt le matin pour rafraîchir "
                "le sol. Récoltez rapidement les carottes matures."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "warning",
            "titre": "Risque de fissuration des racines",
            "detail": (
                "Les fortes pluies après une période sèche font éclater "
                "les racines de carottes. Maintenez un arrosage régulier "
                "et modéré pour éviter les alternances sec/humide. "
                "Récoltez les carottes matures avant la pluie si possible."
            )
        },
        {
            "condition": lambda m: 15 <= m["temperature"] <= 22 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions parfaites pour la carotte",
            "detail": (
                "Fraîcheur idéale pour des carottes bien formées et sucrées. "
                "Bon moment pour les semis directs. Ameublissez le sol "
                "en profondeur — les carottes ont besoin d'un sol meuble "
                "sur au moins 30 cm."
            )
        },
    ],

    "pomme_de_terre": [
        {
            "condition": lambda m: m["temperature"] > 30,
            "type": "danger",
            "titre": "Tubérisation bloquée",
            "detail": (
                "Au-dessus de 30°C, la pomme de terre arrête de former "
                "des tubercules et peut entrer en dormance prématurée. "
                "Ombrez les parcelles. Arrosez abondamment en soirée. "
                "Si la chaleur persiste, attendez la prochaine saison fraîche."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85 and m["precipitation"] > 20,
            "type": "danger",
            "titre": "Mildiou de la pomme de terre — urgence",
            "detail": (
                "Le mildiou peut détruire une parcelle entière en 3 à 4 jours "
                "par temps chaud et humide. Appliquez immédiatement un "
                "fongicide systémique. Retirez et brûlez les fanes atteintes. "
                "Ne récoltez pas sous la pluie — les tubercules s'infectent."
            )
        },
        {
            "condition": lambda m: 15 <= m["temperature"] <= 22 and 10 <= m["precipitation"] <= 15,
            "type": "success",
            "titre": "Conditions idéales pour la pomme de terre",
            "detail": (
                "Fraîcheur et humidité modérée — tubérisation optimale. "
                "Buttez les plants pour protéger les tubercules de la lumière "
                "(les tubercules verts sont toxiques). Apportez un engrais "
                "potassique pour améliorer la qualité."
            )
        },
    ],

    "poireau_celeri_epinard": [
        {
            "condition": lambda m: m["temperature"] > 28,
            "type": "danger",
            "titre": "Montaison prématurée — bolting",
            "detail": (
                "La chaleur déclenche la montaison en fleur — les légumes "
                "feuilles perdent toute valeur. Récoltez immédiatement "
                "tout ce qui est commercialisable. Installez un ombrage "
                "dense pour les plants restants."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "warning",
            "titre": "Risque de fonte des semis",
            "detail": (
                "L'humidité excessive détruit les semis de ces légumes "
                "délicats. Réduisez drastiquement l'arrosage. Améliorez "
                "la ventilation en espaçant les plants. Appliquez un "
                "fongicide préventif en poudre sur le sol."
            )
        },
        {
            "condition": lambda m: 13 <= m["temperature"] <= 22 and 60 <= m["humidite"] <= 75,
            "type": "success",
            "titre": "Conditions parfaites pour légumes de saison fraîche",
            "detail": (
                "Température et humidité idéales pour poireau, céleri "
                "et épinard. Bon moment pour les semis et repiquages. "
                "Ces légumes poussent lentement mais qualitativement "
                "dans ces conditions."
            )
        },
    ],

    # ── Cultures pérennes ─────────────────────────────────────────
    "kolatier": [
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 35,
            "type": "danger",
            "titre": "Chute de noix de cola immatures",
            "detail": (
                "La sécheresse combinée à la chaleur provoque la chute "
                "des noix avant maturité. Irriguez les jeunes kolatiers "
                "si possible. Les arbres adultes résistent mieux mais "
                "inspectez régulièrement les noix en cours de développement."
            )
        },
        {
            "condition": lambda m: m["vent"] > 45,
            "type": "danger",
            "titre": "Casse des branches du kolatier",
            "detail": (
                "Les vents forts brisent les branches chargées de noix. "
                "Après le vent, ramassez les noix tombées et vendez-les "
                "rapidement — elles ne se conservent pas longtemps une "
                "fois détachées de l'arbre."
            )
        },
        {
            "condition": lambda m: 22 <= m["temperature"] <= 30 and 70 <= m["humidite"] <= 80 and m["precipitation"] > 0,
            "type": "success",
            "titre": "Conditions idéales pour le kolatier",
            "detail": (
                "Pluie et chaleur modérée favorisent la croissance et "
                "la fructification. Bon moment pour l'entretien des "
                "arbres et la récolte des noix mûres (couleur rosée "
                "à rouge selon la variété)."
            )
        },
    ],

    "safoutier": [
        {
            "condition": lambda m: m["precipitation"] == 0 and m["temperature"] > 35,
            "type": "danger",
            "titre": "Chute prématurée des safous",
            "detail": (
                "La sécheresse provoque la chute prématurée des safous "
                "avant maturité. Les safous tombés verts ne mûrissent "
                "pas correctement. Irriguez les jeunes arbres si possible."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "warning",
            "titre": "Risque d'éclatement des safous mûrs",
            "detail": (
                "Les fortes pluies font éclater les safous à maturité. "
                "Récoltez immédiatement les régimes mûrs avant la pluie. "
                "Les safous éclatés pourrissent en 24h — vendez ou "
                "transformez-les rapidement."
            )
        },
        {
            "condition": lambda m: 24 <= m["temperature"] <= 32 and 10 <= m["precipitation"] <= 20,
            "type": "success",
            "titre": "Grossissement et maturation optimaux",
            "detail": (
                "Conditions idéales pour le grossissement des safous. "
                "Observez la couleur — les safous mûrs passent du vert "
                "au bleu-noir. Planifiez la récolte et les débouchés "
                "commerciaux à l'avance."
            )
        },
    ],

    "moringa": [
        {
            "condition": lambda m: m["precipitation"] > 30 and m["humidite"] > 85,
            "type": "danger",
            "titre": "Pourriture racinaire sur moringa",
            "detail": (
                "Le moringa est très sensible à l'excès d'eau malgré "
                "sa résistance générale. La pourriture racinaire est "
                "fatale et rapide. Créez des rigoles de drainage urgentes. "
                "Buttez la base des plants pour éloigner l'eau du tronc."
            )
        },
        {
            "condition": lambda m: m["temperature"] < 18,
            "type": "warning",
            "titre": "Croissance ralentie du moringa",
            "detail": (
                "Le moringa ralentit significativement sous 18°C. "
                "Ce n'est pas fatal pour les arbres adultes mais "
                "les jeunes plants sont vulnérables. Protégez-les "
                "avec un paillage épais autour des racines."
            )
        },
        {
            "condition": lambda m: 25 <= m["temperature"] <= 38,
            "type": "success",
            "titre": "Le moringa prospère dans ces conditions",
            "detail": (
                "Le moringa adore la chaleur et se développe rapidement. "
                "Taillez régulièrement pour favoriser la production de "
                "feuilles. Récoltez les feuilles jeunes pour une meilleure "
                "valeur nutritive."
            )
        },
    ],

    # ══════════════════════════════════════════════════════════════
    # LOGISTIQUE
    # ══════════════════════════════════════════════════════════════

    "transport_perissables": [
        {
            "condition": lambda m: m["temperature"] > 30,
            "type": "danger",
            "titre": "Température critique pour les périssables",
            "detail": (
                "La température dépasse 30°C — dégradation accélérée "
                "des fruits, légumes, poissons et viandes. Vérifiez "
                "immédiatement la chaîne du froid. Si vous n'avez pas "
                "de véhicule réfrigéré, effectuez le transport de nuit "
                "ou tôt le matin avant 7h."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "warning",
            "titre": "Humidité favorisant les moisissures",
            "detail": (
                "L'humidité élevée accélère le développement des "
                "moisissures sur les produits non emballés. Vérifiez "
                "l'état des produits avant chargement. Évitez les "
                "arrêts prolongés sans ventilation."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 15,
            "type": "warning",
            "titre": "Bâchage hermétique obligatoire",
            "detail": (
                "La pluie risque de contaminer les produits non couverts. "
                "Vérifiez l'étanchéité de la bâche avant le départ. "
                "Évitez les chargements/déchargements sous la pluie "
                "pour les produits sensibles."
            )
        },
    ],

    "transport_pharmaceutique": [
        {
            "condition": lambda m: m["temperature"] > 25,
            "type": "danger",
            "titre": "Rupture possible de la chaîne du froid",
            "detail": (
                "Au-dessus de 25°C, les médicaments thermosensibles "
                "se dégradent. Vérifiez que le compartiment réfrigéré "
                "fonctionne. Si vous transportez des vaccins, la "
                "température ne doit jamais dépasser 8°C — un écart "
                "rend le lot inutilisable."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 10,
            "type": "warning",
            "titre": "Protéger les emballages pharmaceutiques",
            "detail": (
                "L'humidité détériore les emballages et peut contaminer "
                "certains produits. Assurez-vous que le compartiment "
                "de transport est étanche. Utilisez des sachets "
                "imperméables pour les produits non conditionnés."
            )
        },
        {
            "condition": lambda m: m["vent"] > 40,
            "type": "warning",
            "titre": "Suspendre les opérations de chargement",
            "detail": (
                "Le vent fort risque de faire tomber des caisses "
                "de médicaments fragiles. Attendez que le vent se "
                "calme pour les opérations de chargement et "
                "déchargement."
            )
        },
    ],

    "transport_agricole_brut": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Humidification des sacs — perte de valeur",
            "detail": (
                "La pluie mouille les sacs de cacao, café et céréales, "
                "favorisant les moisissures et réduisant la valeur "
                "commerciale. Vérifiez l'arrimage des bâches. "
                "Évitez le chargement sous la pluie. En cas de pluie "
                "surprise, arrêtez-vous sous un abri."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "danger",
            "titre": "Routes rurales impraticables",
            "detail": (
                "Les pistes rurales vers les zones de production deviennent "
                "dangereuses au-dessus de 30mm de pluie. Reporter le "
                "chargement. Informez les producteurs du délai. "
                "Planifiez le transport pour les premières heures suivant "
                "la fin de la pluie quand le sol est encore ferme."
            )
        },
        {
            "condition": lambda m: m["vent"] > 35,
            "type": "warning",
            "titre": "Arrimage renforcé des bâches",
            "detail": (
                "Le vent peut soulever les bâches de protection sur "
                "les camions ouverts. Vérifiez et renforcez l'arrimage "
                "avant de prendre la route. Réduisez la vitesse pour "
                "limiter la résistance au vent."
            )
        },
    ],

    "transport_construction": [
        {
            "condition": lambda m: m["precipitation"] > 10,
            "type": "danger",
            "titre": "Le ciment prend par l'humidité",
            "detail": (
                "Le ciment en contact avec l'humidité fait une prise "
                "prématurée et irréversible — il devient inutilisable. "
                "Bâchage étanche obligatoire. Vérifiez l'étanchéité "
                "avant chaque départ. En cas de doute, reportez "
                "le transport de ciment."
            )
        },
        {
            "condition": lambda m: m["vent"] > 40,
            "type": "danger",
            "titre": "Danger — tôles et planches en vol",
            "detail": (
                "Les tôles et planches mal arrimées peuvent s'envoler "
                "et causer des accidents graves. Arrêtez-vous et "
                "vérifiez l'arrimage. Réduisez la charge si nécessaire. "
                "En cas de vent violent, garez-vous en lieu sûr et "
                "attendez."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 25,
            "type": "warning",
            "titre": "Routes de chantier impraticables",
            "detail": (
                "Les routes non goudronnées des chantiers deviennent "
                "impraticables pour les camions lourds. Reporter "
                "la livraison. Informez le client du délai. Prévoyez "
                "une livraison tôt le matin après une nuit sans pluie."
            )
        },
    ],

    "distribution_carburant": [
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "danger",
            "titre": "Routes glissantes — danger pour citernes",
            "detail": (
                "Les routes mouillées sont critiques pour les camions-citernes "
                "qui ont un centre de gravité élevé. Réduisez impérativement "
                "la vitesse. Augmentez les distances de sécurité. "
                "Évitez les routes secondaires non goudronnées."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 38,
            "type": "danger",
            "titre": "Dilatation du carburant — ne pas remplir à 100%",
            "detail": (
                "Par forte chaleur, le carburant se dilate dans la citerne. "
                "Laissez obligatoirement 5% de volume libre pour éviter "
                "les débordements et surpressions. Évitez de laisser "
                "la citerne exposée au soleil direct pendant les arrêts."
            )
        },
        {
            "condition": lambda m: m["vent"] > 50 and m["precipitation"] > 15,
            "type": "danger",
            "titre": "Risque orageux — garez-vous immédiatement",
            "detail": (
                "La foudre représente un danger extrême pour les citernes "
                "de carburant. En cas de conditions orageuses, garez-vous "
                "immédiatement à l'écart des arbres et des infrastructures "
                "métalliques. Coupez le moteur et attendez la fin de l'orage."
            )
        },
    ],

    "livraison_colis": [
        {
            "condition": lambda m: m["precipitation"] > 10,
            "type": "danger",
            "titre": "Routes glissantes — danger pour motos",
            "detail": (
                "La pluie rend les routes très glissantes pour les "
                "livreurs à moto. Réduisez impérativement la vitesse. "
                "Évitez les freinages brusques. Si la pluie est forte, "
                "abritez-vous et attendez — votre sécurité prime sur "
                "les délais de livraison."
            )
        },
        {
            "condition": lambda m: m["precipitation"] > 20,
            "type": "warning",
            "titre": "Protéger les colis de la pluie",
            "detail": (
                "Les colis non protégés seront endommagés. Emballez "
                "tous les colis dans des sachets imperméables avant "
                "le départ. Vérifiez votre casque et équipement "
                "imperméable. Prévenez le client d'un possible retard."
            )
        },
        {
            "condition": lambda m: m["vent"] > 30,
            "type": "warning",
            "titre": "Instabilité des motos chargées",
            "detail": (
                "Le vent latéral déstabilise les motos chargées. "
                "Réduisez la charge si possible. Ralentissez sur les "
                "axes dégagés exposés au vent. Soyez particulièrement "
                "vigilant sur les ponts et les zones ouvertes."
            )
        },
    ],

    "transport_betail": [
        {
            "condition": lambda m: m["temperature"] > 32,
            "type": "danger",
            "titre": "Stress thermique sur animaux en transit",
            "detail": (
                "Au-dessus de 32°C, les bovins et ovins subissent un "
                "stress thermique sévère en transit. Effectuez le transport "
                "uniquement de nuit ou avant 7h du matin. Assurez une "
                "ventilation maximale du véhicule. Prévoyez de l'eau "
                "pour les animaux à chaque arrêt."
            )
        },
        {
            "condition": lambda m: m["temperature"] > 35,
            "type": "danger",
            "titre": "Danger de mortalité pour les volailles",
            "detail": (
                "Au-dessus de 35°C, les volailles en cage non ventilée "
                "meurent rapidement par hyperthermie. Arrêtez-vous "
                "immédiatement et ventillez les cages. Arrosez légèrement "
                "les cages avec de l'eau fraîche. Ne reprenez la route "
                "qu'à la fraîcheur."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85 and m["temperature"] > 30,
            "type": "danger",
            "titre": "Conditions fatales pour les volailles",
            "detail": (
                "L'effet combiné chaleur + humidité est fatal pour les "
                "volailles en cage. C'est une urgence. Arrêtez-vous "
                "immédiatement. Sortez les animaux si possible. "
                "Évitez absolument ces conditions pour tout transport "
                "de volailles."
            )
        },
    ],

    "approvisionnement_industriel": [
        {
            "condition": lambda m: m["precipitation"] > 30,
            "type": "warning",
            "titre": "Routes vers zones industrielles dégradées",
            "detail": (
                "Les routes secondaires vers les zones industrielles "
                "deviennent difficiles pour les camions lourds. "
                "Prévoyez des délais supplémentaires. Informez "
                "le client destinataire. Évitez les routes non "
                "goudronnées avec des charges lourdes."
            )
        },
        {
            "condition": lambda m: m["vent"] > 45,
            "type": "danger",
            "titre": "Suspendre les opérations de grue",
            "detail": (
                "Le vent fort rend dangereuses les opérations de "
                "chargement/déchargement de pièces longues (tuyaux, "
                "profilés métalliques). Suspendez immédiatement "
                "les opérations de grue. Attendez que le vent "
                "soit inférieur à 30 km/h pour reprendre."
            )
        },
        {
            "condition": lambda m: m["humidite"] > 85,
            "type": "warning",
            "titre": "Protection des pièces métalliques",
            "detail": (
                "L'humidité élevée accélère la corrosion des pièces "
                "métalliques non protégées. Couvrez les pièces avec "
                "des bâches imperméables. Vérifiez les emballages "
                "anti-humidité à la livraison."
            )
        },
    ],
}

SEUILS["igname"]  = SEUILS["igname_macabo_taro"]
SEUILS["macabo"]  = SEUILS["igname_macabo_taro"]   
SEUILS["taro"]    = SEUILS["igname_macabo_taro"]
SEUILS["sorgho"]  = SEUILS["sorgho_mil"]
SEUILS["mil"]     = SEUILS["sorgho_mil"]
SEUILS["poireau"] = SEUILS["poireau_celeri_epinard"]
SEUILS["celeri"]  = SEUILS["poireau_celeri_epinard"]
SEUILS["epinard"] = SEUILS["poireau_celeri_epinard"]


# ─── Moteur de recommandations ────────────────────────────────────

def generer_recommandations(meteo: dict, cultures: list, horizon: str = "actuel") -> list:
    """
    Génère les recommandations pour une liste de cultures/activités
    selon les conditions météo données.

    meteo    : dict avec temperature, humidite, precipitation, vent
    cultures : liste des cultures/activités de l'utilisateur
    horizon  : label affiché (ex: "actuel", "H+3", "J+2")
    """
    recommandations = []
    date_str = datetime.now().strftime("%Y-%m-%d")

    for culture in cultures:
        cle = culture.lower().replace(" ", "_").replace("é", "e").replace("è", "e").replace("ê", "e")
        regles = SEUILS.get(cle, [])

        for regle in regles:
            try:
                if regle["condition"](meteo):
                    recommandations.append({
                        "date":    date_str,
                        "horizon": horizon,
                        "culture": culture,
                        "type":    regle["type"],
                        "titre":   regle["titre"],
                        "detail":  regle["detail"],
                    })
            except Exception:
                continue

    return recommandations


def generer_toutes_recommandations(predictions: dict, cultures: list) -> list:
    """
    Génère les recommandations sur tous les horizons.
    predictions : résultat de predictor.predire()
    cultures    : liste des cultures/activités de l'utilisateur
    """
    toutes = []

    # Conditions actuelles
    toutes += generer_recommandations(predictions["actuel"], cultures, "Actuellement")

    # Horizons horaires
    for horizon, meteo in predictions["horaires"].items():
        label = horizon.replace("H", "H+")
        toutes += generer_recommandations(meteo, cultures, label)

    # Horizons journaliers
    for horizon, meteo in predictions["jours"].items():
        label = horizon.replace("J", "J+")
        toutes += generer_recommandations(meteo, cultures, label)

    return toutes