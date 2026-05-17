from ml.predictor import predire
from backend.recommendations import generer_toutes_recommandations

predictions = predire(4.0511, 9.7679)
cultures = ['cacao', 'tomate', 'transport_perissables']
recs = generer_toutes_recommandations(predictions, cultures)

for r in recs:
    print(f"[{r['horizon']}] {r['type'].upper()} — {r['culture']} : {r['titre']}")