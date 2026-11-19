import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import Stripe from 'stripe';

// Las llaves secretas viven SOLO aquí (.env excluido de Git). Credenciales de prueba únicamente.
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const MP = 'https://api.mercadopago.com';
const mpHeaders = (extra = {}) => ({ Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...extra });
const app = express();
app.use(cors()); app.use(express.json());

// Nunca confiamos en el monto del cliente: se recalcula desde el viaje guardado.
async function getTrip(tripId, amount) {
  const snap = await db.collection('trips').doc(tripId).get();
  if (!snap.exists) throw Object.assign(new Error('Viaje no existe'), { code: 404 });
  const t = snap.data();
  if (t.status !== 'completed') throw Object.assign(new Error('Viaje no completado'), { code: 409 });
  const expected = t.fare + (t.tip || 0);
  if (amount !== expected) throw Object.assign(new Error('Monto no coincide'), { code: 400 });
  return { t, expected };
}
const fail = (res, e) => res.status(e.code || 500).json({ error: e.message });

// Mercado Pago Checkout Pro con API de Orders: crea la orden y devuelve checkout_url.
// AI-assisted: see docs/AI_LOG.md #4
app.post('/payments/mercadopago', async (req, res) => {
  try {
    const { tripId, amount } = req.body;
    const { expected } = await getTrip(tripId, amount);
    const total = expected.toFixed(2);
    const r = await fetch(`${MP}/v1/orders`, {
      method: 'POST', headers: mpHeaders({ 'X-Idempotency-Key': randomUUID() }),
      body: JSON.stringify({
        type: 'online', processing_mode: 'manual', total_amount: total, external_reference: tripId,
        items: [{ title: 'Viaje UberClone', unit_price: total, quantity: 1, unit_measure: 'unit', total_amount: total }],
      }),
    });
    const order = await r.json();
    if (!r.ok || !order.checkout_url) { console.error('MP error:', JSON.stringify(order)); return res.status(502).json({ error: order.message || 'Mercado Pago rechazó la orden' }); }
    await db.collection('trips').doc(tripId).update({ paymentStatus: 'pending', paymentId: order.id });
    res.json({ checkoutUrl: order.checkout_url });
  } catch (e) { fail(res, e); }
});

// Consulta la orden en Mercado Pago y actualiza el viaje (pagado / rechazado).
async function syncOrder(orderId) {
  const r = await fetch(`${MP}/v1/orders/${orderId}`, { headers: mpHeaders() });
  const order = await r.json();
  if (!r.ok) throw new Error(order.message || 'No se pudo consultar la orden');
  const tripId = order.external_reference;
  const paidOk = parseFloat(order.total_paid_amount || '0') > 0 && parseFloat(order.total_paid_amount) >= parseFloat(order.total_amount);
  const failed = ['failed', 'canceled', 'expired'].includes(order.status);
  if (paidOk) await db.collection('trips').doc(tripId).update({ paymentStatus: 'approved', paymentId: order.id, status: 'paid' });
  else if (failed) await db.collection('trips').doc(tripId).update({ paymentStatus: 'rejected' });
  return { orderStatus: order.status, paid: paidOk };
}

app.post('/payments/verify', async (req, res) => {
  try {
    const snap = await db.collection('trips').doc(req.body.tripId).get();
    if (!snap.exists || !snap.data().paymentId) return res.status(404).json({ error: 'Sin orden de pago' });
    res.json(await syncOrder(snap.data().paymentId));
  } catch (e) { fail(res, e); }
});

// Webhook opcional (si configuras notificaciones en el panel de Mercado Pago).
app.post('/webhooks/mercadopago', async (req, res) => {
  try { const id = req.body?.data?.id; if (id && String(id).startsWith('ORD')) await syncOrder(id); } catch (e) { console.error(e); }
  res.sendStatus(200);
});

// Stripe (modo prueba): PaymentIntent. COP se envía en centavos (×100).
app.post('/payments/stripe', async (req, res) => {
  try {
    const { tripId, amount } = req.body;
    const { expected } = await getTrip(tripId, amount);
    const pi = await stripe.paymentIntents.create({ amount: expected * 100, currency: 'cop', metadata: { tripId }, automatic_payment_methods: { enabled: true } });
    await db.collection('trips').doc(tripId).update({ paymentStatus: 'pending', paymentId: pi.id });
    res.json({ clientSecret: pi.client_secret, checkoutUrl: null });
  } catch (e) { fail(res, e); }
});

// FCM: avisa a los conductores disponibles cuando llega un viaje nuevo (app en segundo plano).
let first = true;
db.collection('trips').where('status', '==', 'requested').onSnapshot(async (snap) => {
  if (first) { first = false; return; }
  for (const ch of snap.docChanges().filter((c) => c.type === 'added')) {
    const drivers = await db.collection('drivers').where('available', '==', true).where('status', '==', 'approved').get();
    const tokens = drivers.docs.map((d) => d.data().fcmToken).filter(Boolean);
    if (tokens.length) await admin.messaging().sendEachForMulticast({ tokens, notification: { title: 'Nueva solicitud de viaje', body: ch.doc.data().origin?.address || '' } });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Backend listo'));
