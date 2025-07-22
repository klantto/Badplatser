// combine.js – Kombinerar SMHI:s lufttemperaturer och HaV:s vattentemperaturer för VGR

import fetch from 'node-fetch';
import fs from 'fs';

const today = new Date().toISOString().split('T')[0];

// Lista av badplatser vi vill inkludera (kan utökas)
const locations = [
  { name: 'Surtesjön', municipality: 'Ale', lat: 57.8235, lon: 12.0154 },
  { name: 'Hultasjön', municipality: 'Ale', lat: 57.9367, lon: 12.2428 },
  { name: 'Askimsbadet', municipality: 'Göteborg', lat: 57.6189, lon: 11.9262 }
];

async function getAirTemp(lat, lon) {
  try {
    const res = await fetch(`https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/1/station-set/all/period/latest-hour/data.json`);
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

    const forecast = data.forecasts[0].waterForecasts.find(f => f.measHour === new Date().getHours());
    return forecast ? forecast.waterTemp : null;
  } catch (err) {
    console.error('Fel vid hämtning av vattentemperatur:', err);
    return null;
  }
}

(async () => {
  const combined = [];

  for (const loc of locations) {
    const air = await getAirTemp(loc.lat, loc.lon);
    const water = await getWaterTemp(loc.name);

    combined.push({
      date: today,
      location: loc.name,
      municipality: loc.municipality,
      air,
      water
    });
  }

  fs.writeFileSync('combined_2025.json', JSON.stringify(combined, null, 2));
  console.log(`✅ Skrev ${combined.length} rader till combined_2025.json.`);
})();
