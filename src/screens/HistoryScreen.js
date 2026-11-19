import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { formatCOP } from '../utils/calculateFare';
import { PRICING } from '../config/pricing';
import { DateField, s, colors } from '../components/ui';

const PERIODS = ['Hoy', 'Semana', 'Mes', 'Rango'];
const METHODS = [['all', 'Todos'], ['mercadopago', 'Mercado Pago'], ['stripe', 'Stripe'], ['cash', 'Efectivo']];
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
function range(period, from, to) {
  const now = new Date(); const start = sod(now); let end = new Date(now.getTime() + 1);
  if (period === 'Semana') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === 'Mes') start.setDate(1);
  if (period === 'Rango') { const a = from ? sod(from) : start; const b = to ? new Date(sod(to).getTime() + 86399999) : end; return [a, b]; }
  return [start, end];
}
const chip = (on) => ({ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 6, backgroundColor: on ? colors.primary : '#E5E7EB' });

export default function HistoryScreen({ navigation }) {
  const { uid } = useDriver();
  const [period, setPeriod] = useState('Hoy');
  const [method, setMethod] = useState('all');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [items, setItems] = useState([]); const [cursor, setCursor] = useState(null);
  const [more, setMore] = useState(true); const [loading, setLoading] = useState(false); const [error, setError] = useState('');

  const load = useCallback(async (reset) => {
    if (loading) return;
    setLoading(true); setError('');
    try {
      const [a, b] = range(period, from, to);
      const parts = [where('driverId', '==', uid), where('createdAt', '>=', a), where('createdAt', '<=', b), orderBy('createdAt', 'desc')];
      if (!reset && cursor) parts.push(startAfter(cursor));
      const snap = await getDocs(query(collection(db, 'trips'), ...parts, limit(PRICING.pageSize)));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems((p) => (reset ? rows : [...p, ...rows]));
      setCursor(snap.docs[snap.docs.length - 1] || null);
      setMore(snap.docs.length === PRICING.pageSize);
    } catch (e) { setError('No se pudo cargar (si es la primera vez, crea el índice que sugiere la consola de Firestore).'); }
    finally { setLoading(false); }
  }, [uid, period, from, to, cursor, loading]);

  useEffect(() => { setCursor(null); load(true); /* eslint-disable-next-line */ }, [period, from, to]);
  const shown = method === 'all' ? items : items.filter((t) => t.paymentMethod === method);

  return (
    <View style={s.screen}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {PERIODS.map((p) => <Pressable key={p} style={chip(p === period)} onPress={() => setPeriod(p)}><Text style={{ color: p === period ? '#fff' : '#111' }}>{p}</Text></Pressable>)}
      </View>
      {period === 'Rango' && (<View><DateField label="Desde" value={from} onChange={setFrom} /><DateField label="Hasta" value={to} onChange={setTo} /></View>)}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
        {METHODS.map(([k, l]) => <Pressable key={k} style={chip(k === method)} onPress={() => setMethod(k)}><Text style={{ color: k === method ? '#fff' : '#111' }}>{l}</Text></Pressable>)}
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
      <FlatList data={shown} keyExtractor={(i) => i.id}
        onEndReached={() => more && !loading && load(false)} onEndReachedThreshold={0.4}
        ListEmptyComponent={!loading && <Text style={[s.muted, { textAlign: 'center', marginTop: 40 }]}>No tienes viajes en este filtro.</Text>}
        renderItem={({ item: t }) => (
          <Pressable style={s.card} onPress={() => navigation.navigate('TripDetail', { trip: JSON.parse(JSON.stringify({ ...t, createdAt: t.createdAt?.toDate?.(), completedAt: t.completedAt?.toDate?.() })) })}>
            <Text style={{ fontWeight: '700' }}>{t.createdAt?.toDate?.().toLocaleString('es-CO')}</Text>
            <Text numberOfLines={1}>{t.origin?.address} → {t.destination?.address}</Text>
            <Text style={s.muted}>{t.category} · {formatCOP(t.fare)} · neto {formatCOP(t.driverEarnings)} · {t.paymentStatus || '—'}</Text>
          </Pressable>
        )} />
    </View>
  );
}
