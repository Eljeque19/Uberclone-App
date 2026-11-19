import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfWeek = () => { const d = startOfDay(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }; // lunes
const startOfMonth = () => { const d = startOfDay(); d.setDate(1); return d; };

function summarize(trips, from) {
  const list = trips.filter((t) => (t.completedAt?.toDate?.() || 0) >= from);
  const sum = (k) => list.reduce((a, t) => a + (t[k] || 0), 0);
  const net = sum('driverEarnings');
  return { count: list.length, billed: sum('fare'), commissions: sum('commission'), tips: sum('tip'), net, average: list.length ? Math.round(net / list.length) : 0 };
}

export function useEarnings(driverId) {
  const [trips, setTrips] = useState([]);
  useEffect(() => {
    if (!driverId) return undefined;
    const q = query(collection(db, 'trips'), where('driverId', '==', driverId), orderBy('createdAt', 'desc'), limit(500));
    return onSnapshot(q, (s) => setTrips(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => ['completed', 'paid'].includes(t.status))));
  }, [driverId]);

  return useMemo(() => {
    // Saldo = ganancias de viajes pagados por pasarela − comisiones de viajes en efectivo
    const balance = trips.reduce((acc, t) => {
      if (t.paymentMethod === 'cash') return acc - (t.commission || 0);
      return t.status === 'paid' ? acc + (t.driverEarnings || 0) : acc;
    }, 0);
    return { today: summarize(trips, startOfDay()), week: summarize(trips, startOfWeek()), month: summarize(trips, startOfMonth()), balance };
  }, [trips]);
}
