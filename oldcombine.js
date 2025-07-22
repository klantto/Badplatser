// combine.js – kombinerar SMHI lufttemp och Havs- & Vattens vattentemp för hela VGR

const fs = require("fs");
const fetch = require("node-fetch");

(async () => {
  const year = 2025;
  const combined = [];

  // Lista med kommuner i Västra Götalandsregionen
  const vgrKommuner = [
    "Ale", "Alingsås", "Bengtsfors", "Bollebygd", "Borås", "Dals-Ed", "Essunga",
    "Falköping", "Färgelanda", "Grästorp", "Gullspång", "Göteborg", "Götene", "Herrljunga",
    "Hjo", "Härryda", "Karlsborg", "Kungälv", "Lerum", "Lidköping", "Lilla Edet", "Lysekil",
    "Mariestad", "Mark", "Mellerud", "Mölndal", "Munkedal", "Orust", "Partille", "Skara",
    "Skövde", "Sotenäs", "Stenungsund", "Strömstad", "Svenljunga", "Tanum", "Tibro", "Tidaholm",
    "Tjörn", "Tranemo", "Trollhättan", "Töreboda", "Uddevalla", "Ulricehamn", "Vara", "Vänersborg",
    "Åmål", "Öckerö"
  ];

  // 1. Hämta alla badplatser från Hav
  const bathingsRes = await fetch(`https://gw.havochvatten.se/external-public/bathing-waters/v2`);
  const bathings = await bathingsRes.json();

  // 2. Filtrera till de i VGR
  const vgrBadplatser = bathings.filter(bw => bw.municipality && vgrKommuner.includes(bw.municipality.name));

  for (const bw of vgrBadplatser) {
    const name = bw.name;
    const kommun = bw.municipality.name;
    let lat = bw.samplingPointPosition?.latitude;
    let lon = bw.samplingPointPosition?.longitude;
    if (!lat || !lon) continue;

    // Hämta vattenprover för denna plats
    const measurementsRes = await fetch(`https://gw.havochvatten.se/external-public/bathing-waters/v2/${bw.id}/measurements`);
    const waterData = await measurementsRes.json();

    // Hämta lufttemperatur från SMHI punktdata (via närmaste mätstation – här förenklat till Göteborgs station)
    const airRes = await fetch(`https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1/station/159880/period/latest-months/data.json`);
    const airJson = await airRes.json();
    const airData = airJson.value || [];

    // Strukturera dagsvis
    const daily = {};

    airData.forEach(entry => {
      const date = entry.date.substr(0, 10);
      if (!daily[date] || new Date(entry.date) > new Date(daily[date].airTime)) {
        daily[date] = daily[date] || {};
        daily[date].air = entry.value;
        daily[date].airTime = entry.date;
      }
    });

    waterData.forEach(entry => {
      const date = entry.sampledAt.substr(0, 10);
      if (!daily[date] || new Date(entry.sampledAt) > new Date(daily[date].waterTime)) {
        daily[date] = daily[date] || {};
        daily[date].water = entry.value;
        daily[date].waterTime = entry.sampledAt;
      }
    });

    Object.entries(daily).forEach(([date, values]) => {
      combined.push({
        date,
        location: name,
        municipality: kommun,
        air: values.air ?? null,
        water: values.water ?? null
      });
    });
  }

  combined.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync("combined_2025.json", JSON.stringify(combined, null, 2));
  console.log("✅ combined_2025.json klar med alla bad i VGR");
})();
