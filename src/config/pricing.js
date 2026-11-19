// Único archivo de configuración de tarifas (valores didácticos, COP enteros).
export const PRICING = {
  baseFare: 3500,
  perKm: 1200,
  perMinute: 250,
  minimumFare: 6000,
  multipliers: { economy: 1.0, xl: 1.4, premium: 1.8 },
  commissionRate: 0.2,
  roundTo: 100,
  acceptTimeoutSec: 15,
  locationIntervalMs: 5000,
  pageSize: 20,
};

// Simulador de pasajeros (demo): crea pedidos automáticos en Firestore mientras estás Disponible.
// Agrega 'mercadopago' a methods cuando el backend de pagos esté listo.
export const SIMULATOR = { firstDelaySec: 4, intervalSec: 20, methods: ['cash'], carLegSeconds: 25, carTickMs: 250, waitForArrival: true };  // waitForArrival: los botones esperan a que el carrito llegue
