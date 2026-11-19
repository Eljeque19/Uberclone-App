import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { calculateFare, formatCOP } from '../utils/calculateFare';
import { PRICING } from '../config/pricing';
import { Btn, Row, s, colors } from '../components/ui';

const PAY = { mercadopago: 'Mercado Pago', stripe: 'Stripe', cash: 'Efectivo' };

export default function IncomingRequestScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { uid, setActiveTripId } = useDriver();
  const [trip, setTrip] = useState(null);
  const [left, setLeft] = useState(PRICING.acceptTimeoutSec);
  const doneRef = useRef(false); // evita rechazar/aceptar más de una vez

  useEffect(() => onSnapshot(doc(db, 'trips', tripId), (d) => setTrip({ id: d.id, ...d.data() })), [tripId]);

  const reject = useCallback(async () => { // rechazo: pasa al siguiente conductor
    if (doneRef.current) return;
    doneRef.current = true;
    try { await updateDoc(doc(db, 'trips', tripId), { rejectedBy: arrayUnion(uid), candidateDriverId: null }); } catch (e) { /* sin red: se cierra igual */ }
    if (navigation.canGoBack()) navigation.goBack();
  }, [tripId, uid, navigation]);

  const accept = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    await updateDoc(doc(db, 'trips', tripId), { status: 'accepted', driverId: uid });
    setActiveTripId(tripId);
    navigation.replace('TripInProgress', { tripId });
  }, [tripId, uid, navigation, setActiveTripId]);

  useEffect(() => { // temporizador de 15 s con limpieza; al llegar a 0 se rechaza automáticamente
    const id = setInterval(() => setLeft((n) => Math.max(n - 1, 0)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left <= 0) reject(); }, [left, reject]);

  if (!trip) return null;
  const est = calculateFare({ distanceKm: trip.distanceKm, durationMin: trip.durationMin, category: trip.category, tip: trip.tip || 0 });
  return (
    <View style={s.screen}>
      <Text style={[s.title, { color: left <= 5 ? colors.danger : colors.primary }]}>Nueva solicitud · {Math.max(left, 0)} s</Text>
      <View style={s.card}>
        <Row k="Origen" v={trip.origin?.address} />
        <Row k="Destino" v={trip.destination?.address} />
        <Row k="Distancia" v={`${trip.distanceKm} km`} />
        <Row k="Duración" v={`${trip.durationMin} min`} />
        <Row k="Categoría" v={trip.category} />
        <Row k="Método de pago" v={PAY[trip.paymentMethod]} />
        <Row k="Tarifa estimada" v={formatCOP(est.fare)} />
        <Row k="Tu ganancia neta estimada" v={formatCOP(est.driverEarnings)} bold />
      </View>
      <Btn title="Aceptar" onPress={accept} color={colors.accent} />
      <Btn title="Rechazar" onPress={reject} color={colors.danger} />
    </View>
  );
}
