import requests

url = "https://gw.havochvatten.se/external-public/bathing-waters/v2/bathing-waters"
res = requests.get(url)
res.raise_for_status()

sites = res.json().get("bathings", sites := res.json())  # hantera både "bathings" och direkt JSON-array
# Filtrera på Göteborg
gothenburg = [
    {"id": site["id"] if "id" in site else site.get("bathingWaterId"),
     "name": site["name"]}
    for site in sites
    if site.get("municipality", "").lower() == "göteborg"
]

# Sortera och skriv ut
gothenburg_sorted = sorted(gothenburg, key=lambda x: x["name"])
print("Badplatser i Göteborg med ID:\n")
for s in gothenburg_sorted:
    print(f'{s["id"]}: {s["name"]}')
