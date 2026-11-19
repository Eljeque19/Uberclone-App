// Ruta gratuita con OSRM (sin API key). Alternativa a Google Directions permitida en el enunciado (sección 7).
// AI-assisted: see docs/AI_LOG.md #2
const toCoord = (p) => ({ latitude: p.latitude ?? p.lat, longitude: p.longitude ?? p.lng });

export async function getRoute(from, to) {
  const a = toCoord(from); const b = toCoord(to);
  const url = `https://router.project-osrm.org/route/v1/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const json = await res.json();
  const r = json.routes && json.routes[0];
  if (!r) return null;
  return {
    coordinates: r.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    distanceKm: Math.round((r.distance / 1000) * 10) / 10,
    durationMin: Math.round(r.duration / 60),
  };
}
export { toCoord };
