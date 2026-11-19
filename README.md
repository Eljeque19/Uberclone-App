# UberClone — Versión Conductor

App móvil (React Native + Expo, iOS/Android) para conductores: registro con validaciones, disponibilidad con ubicación en tiempo real, solicitudes con temporizador de 15 s, navegación con Google Directions, cobro con Mercado Pago (o Stripe en modo prueba) o efectivo, ganancias, saldo e historial.

## Estructura
- `src/config/pricing.js` — única fuente de tarifas y comisión (20 %).
- `src/utils/calculateFare.js` — función pura `calculateFare` (estimación y cierre del viaje). Prueba: `npm test`.
- `src/utils/validators.js` — validaciones del registro (errores bajo cada campo).
- `src/hooks/` — `useDriverLocation`, `useTripRequests`, `useEarnings` (con `useEffect` + limpieza y `useMemo`).
- `src/context/DriverContext.js` — sesión, disponibilidad e idioma (Context); AsyncStorage solo guarda idioma y último estado.
- `src/navigation/` — Stack (viaje), Tabs (registro), Drawer (perfil, historial, ganancias).
- `backend/` — Express: crea la preferencia de Mercado Pago / PaymentIntent de Stripe, recibe el webhook y envía FCM.
- `firestore.rules` — reglas básicas (el conductor no puede aprobarse solo).

## Instalación
1. Crea la base: `npx create-expo-app@latest uberclone-driver --template blank` y copia dentro `App.js`, `app.json`, `src/`, `tests/`, `firestore.rules`, `.env.example`, `.gitignore`.
2. Instala dependencias compatibles con tu SDK:
```
npx expo install react-native-maps expo-location expo-image-picker expo-notifications expo-web-browser \
  @react-native-async-storage/async-storage @react-native-picker/picker @react-native-community/datetimepicker \
  @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs @react-navigation/drawer \
  react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens
npm i firebase react-native-maps-directions
```
3. Copia `.env.example` a `.env` y llena las variables (Firebase, Google Maps restringida por app, Cloudinary con preset *unsigned*, URL del backend).
4. Backend (access_token = el de las credenciales de la cuenta de prueba VENDEDOR; abre siempre init_point, no sandbox_init_point): `cd backend && cp .env.example .env && npm i && npm start` (usa credenciales **de prueba** y una cuenta de servicio de Firebase; expón el puerto con ngrok para el webhook).
5. Firestore: crea el índice compuesto que sugiera la consola (`driverId` + `createdAt`) y publica `firestore.rules`.
6. `npx expo start` (para FCM y mapas con llave propia usa un *development build*: `npx expo run:android`).

## Probar el flujo
1. Regístrate (3 pestañas). La cuenta queda `pending`; en Firestore cambia `drivers/{uid}.status` a `approved`.
2. Crea un viaje en la colección `trips` con `status: "requested"`, `origin/destination {lat,lng,address}`, `distanceKm`, `durationMin`, `category`, `paymentMethod`, `passengerId`, `createdAt` (timestamp).
3. Con el conductor Disponible aparece la solicitud → acepta → "Pasajero a bordo" → "Finalizar" → cobro (tarjeta de prueba de Mercado Pago) o efectivo → historial y ganancias.

## Seguridad
`access_token` y `secret key` solo en `backend/.env` (excluido de Git). El backend recalcula el monto desde el viaje guardado. No se guardan tarjetas ni cuentas bancarias.

## Uso de IA
Este proyecto usó herramientas de IA. Ver la bitácora en [docs/AI_LOG.md](docs/AI_LOG.md).
