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

export default function TripInProgressScreen({ route, navigation }) {
  const { tripId } = route.params;
  const { uid, setActiveTripId } = useDriver();
  const { location } = useDriverLocation(uid, true);
  const mapRef = useRef(null);
  const [trip, setTrip] = useState(null);
  const [startPoint, setStartPoint] = useState(null); // origen congelado: no se pide ruta en cada movimiento
  const [line, setLine] = useState([]);
  const [carIdx, setCarIdx] = useState(0);
  const [track, setTrack] = useState(true);

  useEffect(() => onSnapshot(doc(db, 'trips', tripId), (d) => setTrip({ id: d.id, ...d.data() })), [tripId]);
  useEffect(() => { if (trip?.status === 'accepted') updateDoc(doc(db, 'trips', tripId), { status: 'driver_arriving' }); }, [trip?.status, tripId]);
  useEffect(() => { if (trip?.status === 'driver_arriving' && location && !startPoint) setStartPoint(location); }, [trip?.status, location, startPoint]);
  useEffect(() => { // el pasajero puede cancelar antes de in_progress
    if (trip?.status === 'cancelled') { setActiveTripId(null); navigation.popToTop(); }
  }, [trip?.status, navigation, setActiveTripId]);

  const toPickup = !trip || trip.status === 'driver_arriving' || trip.status === 'accepted';
  const origin = trip ? (toPickup ? startPoint : trip.origin) : null;
  const destination = trip ? (toPickup ? trip.origin : trip.destination) : null;
  const oKey = origin ? `${toCoord(origin).latitude},${toCoord(origin).longitude}` : null;
  const dKey = destination ? `${toCoord(destination).latitude},${toCoord(destination).longitude}` : null;

  useEffect(() => { // una sola petición de ruta por tramo (OSRM, gratis)
    if (!oKey || !dKey) return undefined;
    let alive = true;
    setLine([]); setCarIdx(0);
    getRoute(origin, destination).then((r) => {
      if (!alive || !r) return;
      setLine(r.coordinates);
      if (!toPickup) { // guarda la ruta reducida para dibujarla en el historial
        const step = Math.max(1, Math.floor(r.coordinates.length / 100));
        updateDoc(doc(db, 'trips', tripId), { route: r.coordinates.filter((_, i) => i % step === 0) }).catch(() => {});
      }
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oKey, dKey]);

  // Carrito en movimiento sobre la ruta (simulación). AI-assisted: see docs/AI_LOG.md #5
  useEffect(() => {
    if (line.length < 2) return undefined;
    const step = Math.max(1, Math.ceil(line.length / ((SIM.carLegSeconds * 1000) / SIM.carTickMs)));
    const id = setInterval(() => setCarIdx((i) => Math.min(i + step, line.length - 1)), SIM.carTickMs);
    return () => clearInterval(id); // limpieza
  }, [line]);
  const car = line.length ? line[Math.min(carIdx, line.length - 1)] : null;
  const arrived = line.length > 1 && carIdx >= line.length - 1;
  useEffect(() => { if (car && mapRef.current) mapRef.current.animateToRegion({ ...car, latitudeDelta: 0.012, longitudeDelta: 0.012 }, SIM.carTickMs); }, [car]);
  useEffect(() => { // Android: dibuja el ícono del carrito una vez y luego deja de redibujarlo
    if (!car) return undefined;
    setTrack(true); const id = setTimeout(() => setTrack(false), 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!car]);

  if (!trip) return null;
  const onboard = () => updateDoc(doc(db, 'trips', tripId), { status: 'in_progress' });
  const cancel = async () => { await updateDoc(doc(db, 'trips', tripId), { status: 'cancelled' }); setActiveTripId(null); navigation.popToTop(); };
  const finish = async () => {
    const f = calculateFare({ distanceKm: trip.distanceKm, durationMin: trip.durationMin, category: trip.category, tip: trip.tip || 0 });
    await updateDoc(doc(db, 'trips', tripId), { ...f, status: 'completed', completedAt: serverTimestamp(), paymentStatus: 'pending' });
    navigation.replace('PaymentSummary', { tripId });
  };

  const title = toPickup
    ? (arrived ? 'Llegaste al punto de recogida' : 'Hacia el punto de recogida')
    : (arrived ? 'Llegaste al destino' : 'Hacia el destino');

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }}
        initialRegion={{ ...toCoord(trip.origin), latitudeDelta: 0.03, longitudeDelta: 0.03 }}>
        {destination ? <Marker coordinate={toCoord(destination)} /> : null}
        {line.length > 0 ? <Polyline coordinates={line} strokeWidth={5} strokeColor={colors.accent} /> : null}
        {car ? (
          <Marker coordinate={car} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={track}>
            <View style={{ padding: 4 }}><Text style={{ fontSize: 30 }}>🚗</Text></View>
          </Marker>
        ) : null}
      </MapView>
      <View style={[s.card, { position: 'absolute', left: 12, right: 12, bottom: 20, marginBottom: 0 }]}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.muted}>{toPickup ? trip.origin?.address : trip.destination?.address}</Text>
        {toPickup && <Btn title="Pasajero a bordo" onPress={onboard} />}
        {toPickup && <Btn title="Cancelar viaje" onPress={cancel} color={colors.danger} />}
        {trip.status === 'in_progress' && <Btn title="Finalizar viaje" onPress={finish} color={colors.accent} />}
      </View>
    </View>
  );
}