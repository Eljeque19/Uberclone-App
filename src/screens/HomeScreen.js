import React, { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Notifications from 'expo-notifications';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useTripRequests } from '../hooks/useTripRequests';
import { useRequestSimulator } from '../hooks/useRequestSimulator';
import { s, colors } from '../components/ui';
import { t } from '../services/i18n';

export default function HomeScreen({ navigation }) {
  const { uid, driver, approved, available, setAvailable, language, activeTripId } = useDriver();
  const [simulate, setSimulate] = useState(false);
  const canWork = approved && available && !activeTripId;
  const { location } = useDriverLocation(uid, available);
  const { incoming } = useTripRequests(uid, canWork);
  useRequestSimulator({ enabled: approved && available && simulate, paused: !!incoming || !!activeTripId, driver, location });

  useEffect(() => { // token FCM del dispositivo para notificaciones con la app en segundo plano
    if (!approved) return;
    (async () => {
      try { // En Expo Go (Android) el token FCM no está disponible: se ignora sin romper la app.
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        await updateDoc(doc(db, 'drivers', uid), { fcmToken: token });
      } catch (e) { /* requiere development build para push en segundo plano */ }
    })();
  }, [approved, uid]);

  useEffect(() => { if (incoming) navigation.navigate('IncomingRequest', { tripId: incoming.id }); }, [incoming, navigation]);

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} showsUserLocation
        region={location ? { ...location, latitudeDelta: 0.02, longitudeDelta: 0.02 } : undefined}>
        {location && <Marker coordinate={location} title="Tú" />}
      </MapView>
      <View style={[s.card, { position: 'absolute', left: 12, right: 12, bottom: 20, marginBottom: 0 }]}>
        {!approved ? (
          <Text style={{ color: colors.danger, fontWeight: '600' }}>
            Tu cuenta está {driver?.status === 'pending' ? 'pendiente de aprobación' : 'rechazada'}. No puedes ponerte disponible aún.
          </Text>
        ) : (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>{available ? t(language, 'available') : t(language, 'unavailable')}</Text>
              <Switch value={available} onValueChange={setAvailable} trackColor={{ true: colors.accent }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <Text style={s.muted}>Simular pedidos automáticos</Text>
              <Switch value={simulate} onValueChange={setSimulate} disabled={!available} trackColor={{ true: colors.accent }} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}