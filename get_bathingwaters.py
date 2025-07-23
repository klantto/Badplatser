import requests
import json

url = "https://gw.havochvatten.se/external-public/bathing-waters/v2/bathing-waters"
res = requests.get(url)
res.raise_for_status()
sites = res.json()

gothenburg = [
    {"id": site["bathingWaterId"], "name": site["name"]}
    for site in sites
    if site.get("municipality", "").lower() == "göteborg"
]

with open("bathingwaters_gbg.json", "w", encoding="utf-8") as f:
    json.dump(gothenburg, f, ensure_ascii=False, indent=2)

print("✅ Sparade badplatser i bathingwaters_gbg.json")
