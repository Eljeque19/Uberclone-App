import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { createPayment, verifyPayment } from '../services/api';
import { formatCOP } from '../utils/calculateFare';
import { Btn, Row, s, colors } from '../components/ui';

const STATUS = { approved: ['Aprobado', colors.accent], pending: ['Pendiente', '#D97706'], rejected: ['Rechazado', colors.danger], cash: ['Efectivo', colors.primary] };

export default function PaymentSummaryScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { setActiveTripId } = useDriver();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => onSnapshot(doc(db, 'trips', tripId), (d) => setTrip({ id: d.id, ...d.data() })), [tripId]); // escucha el webhook en tiempo real

  useEffect(() => { // mientras el pago está pendiente, consulta su estado cada 5 s (con limpieza)
    if (!trip || trip.status === 'paid' || trip.paymentMethod === 'cash' || trip.paymentStatus !== 'pending' || !trip.paymentId) return undefined;
    const id = setInterval(() => { verifyPayment(tripId).catch(() => {}); }, 5000);
    return () => clearInterval(id);
  }, [trip, tripId]);

  if (!trip) return null;
  const [label, color] = STATUS[trip.paymentStatus] || STATUS.pending;
  const done = trip.status === 'paid';
  const charge = async () => {
    setError('');
    try {
      const { checkoutUrl } = await createPayment(tripId, trip.fare + (trip.tip || 0), trip.paymentMethod);
      await WebBrowser.openBrowserAsync(checkoutUrl); // el pasajero paga con tarjeta de prueba
    } catch (e) { setError(e.message); }
  };
  const confirmCash = () => updateDoc(doc(db, 'trips', tripId), { status: 'paid', paymentStatus: 'cash' }); // comisión se descuenta del saldo
  const exit = () => { setActiveTripId(null); navigation.popToTop(); };

  return (
    <View style={s.screen}>
      <Text style={s.title}>Resumen del viaje</Text>
      <View style={s.card}>
        <Row k="Tarifa final" v={formatCOP(trip.fare)} />
        <Row k={`Comisión (${Math.round((trip.commissionRate || 0) * 100)}%)`} v={'-' + formatCOP(trip.commission)} />
        <Row k="Propina" v={formatCOP(trip.tip || 0)} />
        <Row k="Ganancia neta" v={formatCOP(trip.driverEarnings)} bold />
        <Row k="Estado del pago" v={<Text style={{ color, fontWeight: '700' }}>{label}</Text>} />
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      {!done && trip.paymentMethod === 'cash' && <Btn title="Confirmar efectivo recibido" onPress={confirmCash} />}
      {!done && trip.paymentMethod !== 'cash' && <Btn title="Cobrar con pasarela" onPress={charge} />}
      {(done || trip.paymentStatus === 'rejected') && <Btn title="Volver al inicio" onPress={exit} color={colors.accent} />}
    </View>
  );
}
