import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getRoute } from '../services/routing';
import { SIMULATOR } from '../config/pricing';

// Pedidos automáticos de pasajeros (demo). AI-assisted: see docs/AI_LOG.md #5
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const offset = (p, km) => { // punto aleatorio a 'km' kilómetros de p
  const ang = Math.random() * 2 * Math.PI;
  return {
    latitude: p.latitude + (km * Math.cos(ang)) / 111,
    longitude: p.longitude + (km * Math.sin(ang)) / (111 * Math.cos((p.latitude * Math.PI) / 180)),
  };
};
async function addressOf(p, fallback) {
  try {
    const [a] = await Location.reverseGeocodeAsync(p);
    if (a) {
      const street = [a.street || a.name, a.streetNumber].filter(Boolean).join(' ');
      const text = [street, a.district || a.subregion || a.city].filter(Boolean).join(', ');
      if (text) return text;
    }
  } catch (e) { /* sin geocodificador: usa el texto por defecto */ }
  return fallback;
}

export function useRequestSimulator({ enabled, paused, driver, location }) {
  const locRef = useRef(location);
  const pausedRef = useRef(paused);
  const busy = useRef(false);
  const count = useRef(0);
  locRef.current = location;
  pausedRef.current = paused;

  useEffect(() => {
    if (!enabled || !driver) return undefined;
    let alive = true;
    const create = async () => {
      const here = locRef.current;
      if (!alive || pausedRef.current || busy.current || !here) return;
      busy.current = true;
      try {
        const origin = offset(here, rand(0.4, 1.5));
        const dest = offset(origin, rand(2, 6));
        const route = await getRoute(origin, dest).catch(() => null);
        const distanceKm = route?.distanceKm ?? Math.round(rand(2, 6) * 10) / 10;
        const durationMin = route?.durationMin ?? Math.max(5, Math.round(distanceKm * 3));
        const [oa, da] = await Promise.all([addressOf(origin, 'Punto de recogida'), addressOf(dest, 'Destino')]);
        if (!alive) return;
        count.current += 1;
        await addDoc(collection(db, 'trips'), {
          status: 'requested', simulated: true, passengerId: `pasajero_sim_${count.current}`,
          category: driver.vehicle?.category || 'economy', paymentMethod: pick(SIMULATOR.methods),
          distanceKm, durationMin, tip: pick([0, 0, 1000, 2000]),
          origin: { lat: origin.latitude, lng: origin.longitude, address: oa },
          destination: { lat: dest.latitude, lng: dest.longitude, address: da },
          createdAt: serverTimestamp(),
        });
      } catch (e) { /* se reintenta en el siguiente ciclo */ } finally { busy.current = false; }
    };
    const first = setTimeout(create, SIMULATOR.firstDelaySec * 1000);
    const id = setInterval(create, SIMULATOR.intervalSec * 1000);
    return () => { alive = false; clearTimeout(first); clearInterval(id); }; // limpieza
  }, [enabled, driver?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
