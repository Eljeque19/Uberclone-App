import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useDriver } from '../context/DriverContext';
import { t } from '../services/i18n';
import RegisterNavigator from '../screens/register/RegisterNavigator';
import HomeScreen from '../screens/HomeScreen';
import EarningsScreen from '../screens/EarningsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import IncomingRequestScreen from '../screens/IncomingRequestScreen';
import TripInProgressScreen from '../screens/TripInProgressScreen';
import PaymentSummaryScreen from '../screens/PaymentSummaryScreen';
import TripDetailScreen from '../screens/TripDetailScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainDrawer() { // Drawer: perfil, historial, ganancias y configuración
  const { language } = useDriver();
  return (
    <Drawer.Navigator initialRouteName="Home">
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: t(language, 'home') }} />
      <Drawer.Screen name="Earnings" component={EarningsScreen} options={{ title: t(language, 'earnings') }} />
      <Drawer.Screen name="History" component={HistoryScreen} options={{ title: t(language, 'history') }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: t(language, 'profile') }} />
    </Drawer.Navigator>
  );
}

export default function Navigation() {
  const { driver, loading } = useDriver();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" /></View>;
  return (
    <NavigationContainer>
      {/* Stack: flujo del viaje; Tabs: registro (RegisterNavigator); Drawer: menú principal */}
      <Stack.Navigator>
        {!driver ? (
          <Stack.Screen name="Register" component={RegisterNavigator} options={{ title: 'Registro de conductor' }} />
        ) : (<>
          <Stack.Screen name="Drawer" component={MainDrawer} options={{ headerShown: false }} />
          <Stack.Screen name="IncomingRequest" component={IncomingRequestScreen} options={{ title: 'Solicitud', presentation: 'modal', headerBackVisible: false }} />
          <Stack.Screen name="TripInProgress" component={TripInProgressScreen} options={{ title: 'Viaje en curso', headerBackVisible: false }} />
          <Stack.Screen name="PaymentSummary" component={PaymentSummaryScreen} options={{ title: 'Cobro', headerBackVisible: false }} />
          <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: 'Detalle del viaje' }} />
        </>)}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
