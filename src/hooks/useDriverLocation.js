import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { PRICING } from '../config/pricing';

export function useDriverLocation(driverId, tracking) {
  const [location, setLocation] = useState(null);

  useEffect(() => { // ubicación inicial para el mapa
    let alive = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const p = await Location.getCurrentPositionAsync({});
      if (alive) setLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude });
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { // seguimiento solo mientras esté Disponible
    if (!tracking || !driverId) return undefined;
    let sub; let cancelled = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: PRICING.locationIntervalMs, distanceInterval: 10 },
      (p) => {
        const c = { latitude: p.coords.latitude, longitude: p.coords.longitude };
        setLocation(c);
        updateDoc(doc(db, 'drivers', driverId), { location: c, locationUpdatedAt: serverTimestamp() }).catch(() => {});
      },
    ).then((s) => { if (cancelled) s.remove(); else sub = s; });
    return () => { cancelled = true; if (sub) sub.remove(); }; // limpieza: detiene el seguimiento
  }, [tracking, driverId]);

  return { location };
}
