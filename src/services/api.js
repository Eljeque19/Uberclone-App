const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const CLOUD = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Sube una imagen (data URI base64) a Cloudinary con un preset sin firmar y devuelve la URL.
// Se envía como x-www-form-urlencoded: evita el error "Unsupported FormDataPart implementation" de Expo.
// AI-assisted: see docs/AI_LOG.md #3
export async function uploadImage(dataUri) {
  if (!dataUri || dataUri.startsWith('http')) return dataUri;
  const body = `file=${encodeURIComponent(dataUri)}&upload_preset=${encodeURIComponent(PRESET)}`;
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  const json = await res.json();
  if (!json.secure_url) throw new Error(json.error?.message || 'No se pudo subir la imagen');
  return json.secure_url;
}

// El backend crea la preferencia de Mercado Pago (o PaymentIntent de Stripe) con la llave secreta.
export async function createPayment(tripId, amount, gateway = 'mercadopago') {
  const res = await fetch(`${BACKEND}/payments/${gateway}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId, amount }),
  });
  if (!res.ok) throw new Error('No se pudo crear el pago');
  return res.json(); // { checkoutUrl }
}

// Pide al backend que consulte la orden en Mercado Pago y actualice el viaje.
export async function verifyPayment(tripId) {
  const res = await fetch(`${BACKEND}/payments/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tripId }),
  });
  return res.json();
}
