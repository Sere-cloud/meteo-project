import requests

url = "https://api.open-meteo.com/v1/forecast"
params = {
    "latitude": 4.0511,
    "longitude": 9.7679,
    "hourly": "temperature_2m",
    "forecast_days": 1
}

try:
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()
    print("✅ Connexion OK")
    print(f"Nombre d'heures reçues : {len(data['hourly']['temperature_2m'])}")
except requests.exceptions.ConnectionError as e:
    print(f"❌ Erreur réseau (DNS / connexion) : {e}")
except requests.exceptions.Timeout:
    print("❌ Timeout — Open-Meteo met trop de temps à répondre")
except Exception as e:
    print(f"❌ Autre erreur : {e}")