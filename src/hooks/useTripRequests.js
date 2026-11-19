import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// Solicitudes en tiempo real: viajes 'requested' que este conductor no ha rechazado.
export function useTripRequests(driverId, enabled) {
  const [incoming, setIncoming] = useState(null);
  useEffect(() => {
    if (!enabled || !driverId) { setIncoming(null); return undefined; }
    const q = query(collection(db, 'trips'), where('status', '==', 'requested'));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((t) => !(t.rejectedBy || []).includes(driverId) && (!t.candidateDriverId || t.candidateDriverId === driverId));
      setIncoming(list[0] || null);
    });
  }, [driverId, enabled]);
  return { incoming };
}
