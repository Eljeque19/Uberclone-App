import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { getRoute, toCoord } from '../services/routing';
import { calculateFare } from '../utils/calculateFare';
import { SIMULATOR as SIM } from '../config/pricing';
import { Btn, s, colors } from '../components/ui';

const CAR = require('../../assets/car.png');

// Rumbo (grados) entre dos puntos, para girar el carrito hacia donde avanza.
const bearing = (a, b) => {
  const r = (x) => (x * Math.PI) / 180;
  const y = Math.sin(r(b.longitude - a.longitude)) * Math.cos(r(b.latitude));
  const x = Math.cos(r(a.latitude)) * Math.sin(r(b.latitude)) - Math.sin(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.cos(r(b.longitude - a.longitude));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

export default function TripInProgressScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { uid, setActiveTripId } = useDriver();
  const { location } = useDriverLocation(uid, true);
  const mapRef = useRef(null);
  const headingRef = useRef(0);
  const [trip, setTrip] = useState(null);
  const [startPoint, setStartPoint] = useState(null); // origen congelado: no se pide ruta en cada movimiento
  const [line, setLine] = useState([]);
  const [carIdx, setCarIdx] = useState(0);
  const [routeFailed, setRouteFailed] = useState(false);

  useEffect(() => onSnapshot(doc(db, 'trips', tripId), (d) => setTrip({ id: d.id, ...d.data() })), [tripId]);
  useEffect(() => { if (trip?.status === 'accepted') updateDoc(doc(db, 'trips', tripId), { status: 'driver_arriving' }); }, [trip?.status, tripId]);
  useEffect(() => { if (trip?.status === 'driver_arriving' && location && !startPoint) setStartPoint(location); }, [trip?.status, location, startPoint]);
  useEffect(() => { // el pasajero puede cancelar antes de in_progress
    if (trip?.status === 'cancelled') { setActiveTripId(null); navigation.popToTop(); }
  }, [trip?.status, navigation, setActiveTripId]);

  const toPickup = !trip || trip.status === 'driver_arriving' || trip.status === 'accepted';
  const origin = trip ? (toPickup ? startPoint : trip.origin) : null;
  const destination = trip ? (toPickup ? trip.origin : trip.destination) : null;
  const startCoord = origin ? toCoord(origin) : null;
  const oKey = startCoord ? `${startCoord.latitude},${startCoord.longitude}` : null;
  const dKey = destination ? `${toCoord(destination).latitude},${toCoord(destination).longitude}` : null;

  useEffect(() => { // una sola petición de ruta por tramo (OSRM, gratis), con 3 intentos
    if (!oKey || !dKey) return undefined;
    let alive = true; let timer;
    setLine([]); setCarIdx(0); setRouteFailed(false);
    const load = (attempt) => {
      getRoute(origin, destination).then((r) => {
        if (!alive) return;
        if (!r) throw new Error('sin ruta');
        setLine(r.coordinates);
        if (!toPickup) { // guarda la ruta reducida para dibujarla en el historial
          const step = Math.max(1, Math.floor(r.coordinates.length / 100));
          updateDoc(doc(db, 'trips', tripId), { route: r.coordinates.filter((_, i) => i % step === 0) }).catch(() => {});
        }
      }).catch(() => {
        if (!alive) return;
        if (attempt < 3) timer = setTimeout(() => load(attempt + 1), 2000); else setRouteFailed(true);
      });
    };
    load(1);
    return () => { alive = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oKey, dKey]);

  // Carrito en movimiento sobre la ruta (simulación). AI-assisted: see docs/AI_LOG.md #5
  useEffect(() => {
    if (line.length < 2) return undefined;
    const step = Math.max(1, Math.ceil(line.length / ((SIM.carLegSeconds * 1000) / SIM.carTickMs)));
    const id = setInterval(() => setCarIdx((i) => Math.min(i + step, line.length - 1)), SIM.carTickMs);
    return () => clearInterval(id); // limpieza
  }, [line]);

  const idx = Math.min(carIdx, Math.max(line.length - 1, 0));
  const car = line.length ? line[idx] : startCoord; // antes de tener ruta, el carrito ya aparece en el punto de salida
  const next = line.length > 1 ? line[Math.min(idx + 1, line.length - 1)] : null;
  if (car && next && (next.latitude !== car.latitude || next.longitude !== car.longitude)) headingRef.current = bearing(car, next);
  const arrived = line.length > 1 && idx >= line.length - 1;
  const pct = line.length > 1 ? Math.round((idx / (line.length - 1)) * 100) : 0;
  const canAdvance = !SIM.waitForArrival || arrived || routeFailed;

  useEffect(() => { if (car && mapRef.current) mapRef.current.animateToRegion({ ...car, latitudeDelta: 0.012, longitudeDelta: 0.012 }, SIM.carTickMs); }, [car?.latitude, car?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trip) return null;
  const onboard = () => updateDoc(doc(db, 'trips', tripId), { status: 'in_progress' });
  const cancel = async () => { await updateDoc(doc(db, 'trips', tripId), { status: 'cancelled' }); setActiveTripId(null); navigation.popToTop(); };
  const finish = async () => {
    const f = calculateFare({ distanceKm: trip.distanceKm, durationMin: trip.durationMin, category: trip.category, tip: trip.tip || 0 });
    await updateDoc(doc(db, 'trips', tripId), { ...f, status: 'completed', completedAt: serverTimestamp(), paymentStatus: 'pending' });
    navigation.replace('PaymentSummary', { tripId });
  };

  const title = toPickup ? (arrived ? 'Llegaste al punto de recogida' : 'Yendo por el pasajero') : (arrived ? 'Llegaste al destino' : 'Llevando al pasajero');
  const progress = routeFailed ? 'No se pudo calcular la ruta; puedes continuar manualmente.'
    : !line.length ? 'Calculando ruta…' : arrived ? 'Listo' : `Recorrido: ${pct}%`;

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }}
        initialRegion={{ ...toCoord(trip.origin), latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
        {destination ? <Marker coordinate={toCoord(destination)} pinColor={toPickup ? 'green' : 'red'} title={toPickup ? 'Pasajero' : 'Destino'} /> : null}
        {line.length > 0 ? <Polyline coordinates={line} strokeWidth={5} strokeColor={colors.accent} /> : null}
        {car ? <Marker coordinate={car} image={CAR} anchor={{ x: 0.5, y: 0.5 }} flat rotation={headingRef.current} zIndex={10} /> : null}
      </MapView>
      <View style={[s.card, { position: 'absolute', left: 12, right: 12, bottom: 20, marginBottom: 0 }]}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.muted}>{toPickup ? trip.origin?.address : trip.destination?.address}</Text>
        <Text style={[s.muted, { marginTop: 4 }]}>{progress}</Text>
        {toPickup && <Btn title="Pasajero a bordo" onPress={onboard} disabled={!canAdvance} />}
        {toPickup && <Btn title="Cancelar viaje" onPress={cancel} color={colors.danger} />}
        {trip.status === 'in_progress' && <Btn title="Finalizar viaje" onPress={finish} color={colors.accent} disabled={!canAdvance} />}
      </View>
    </View>
  );
}
