// combine.js – Kombinerar SMHI:s lufttemperaturer och HaV:s vattentemperaturer för VGR

import fetch from 'node-fetch';
import fs from 'fs';

const today = new Date().toISOString().split('T')[0];

async function getAirTemp(lat, lon) {
  try {
    const res = await fetch('https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1/station-set/all/period/latest-hour/data.json');
    const json = await res.json();

    let closest = null;
    let minDist = Infinity;

    for (const station of json.station) {
      const d = Math.sqrt(Math.pow(lat - station.latitude, 2) + Math.pow(lon - station.longitude, 2));
      if (d < minDist) {
        minDist = d;
        closest = station;
      }
    }

    const temp = closest.value && closest.value.length ? closest.value[0].value : null;
    return typeof temp === 'number' ? temp : null;
  } catch (err) {
    console.error('Fel vid hämtning av lufttemperatur:', err);
    return null;
  }
}

async function getWaterTemp(name) {
  try {
    const res = await fetch(`https://gw.havochvatten.se/external-public/bathing-waters/v2/forecasts?name=${encodeURIComponent(name)}`);
    const data = await res.json();

    if (!data.forecasts || !data.forecasts.length) return null;

    const nowHour = new Date().getHours();
    const forecast = data.forecasts[0].waterForecasts.find(f => f.measHour === nowHour);
    return forecast ? forecast.waterTemp : null;
  } catch (err) {
    console.error('Fel vid hämtning av vattentemperatur:', err);
    return null;
  }
}

async function getLocationsInVGR(retries = 3) {
  const url = 'https://gw.havochvatten.se/external-public/bathing-waters/v2/bathing-waters?countyName=V%C3%A4stra%20G%C3%B6talands%20l%C3%A4n';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 sek timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      const data = await res.json();
      if (!data.bathingWaters) throw new Error("Svar saknar badplatser");
      console.log(`✅ Lyckades hämta badplatser i VGR (försök ${attempt})`);
      return data.bathingWaters.map(bw => ({
        name: bw.name,
        municipality: bw.municipality.name,
        lat: parseFloat(bw.samplingPointPosition.latitude),
        lon: parseFloat(bw.samplingPointPosition.longitude)
      }));
    } catch (err) {
      console.warn(`⚠️ Försök ${attempt} misslyckades:`, err.message);
      if (attempt === retries) {
        console.error('🚫 Alla försök att hämta badplatser i VGR misslyckades.');
        return [];
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // Vänta 3 sek innan nästa försök
    }
  }
}

(async () => {
  const combined = [];
  const locations = await getLocationsInVGR();

  for (const loc of locations) {
    try {
      const air = await getAirTemp(loc.lat, loc.lon);
      const water = await getWaterTemp(loc.name);

      combined.push({
        date: today,
        location: loc.name,
        municipality: loc.municipality,
        air,
        water
      });
    } catch (error) {
      console.error(`Fel vid hämtning av data för ${loc.name}:`, error);
      combined.push({
        date: today,
        location: loc.name,
        municipality: loc.municipality,
        air: null,
        water: null
      });
    }
  }

  fs.writeFileSync('combined_2025.json', JSON.stringify(combined, null, 2));
  console.log(`✅ Skrev ${combined.length} rader till combined_2025.json.`);
})();
