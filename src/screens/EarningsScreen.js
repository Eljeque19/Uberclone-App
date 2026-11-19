import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useDriver } from '../context/DriverContext';
import { useEarnings } from '../hooks/useEarnings';
import { formatCOP } from '../utils/calculateFare';
import { Row, s, colors } from '../components/ui';

const Block = ({ title, d }) => (
  <View style={s.card}>
    <Text style={s.title}>{title}</Text>
    <Row k="Viajes" v={d.count} />
    <Row k="Total facturado" v={formatCOP(d.billed)} />
    <Row k="Comisiones" v={formatCOP(d.commissions)} />
    <Row k="Propinas" v={formatCOP(d.tips)} />
    <Row k="Ganancia neta" v={formatCOP(d.net)} bold />
    <Row k="Promedio por viaje" v={formatCOP(d.average)} />
  </View>
);

export default function EarningsScreen() {
  const { uid } = useDriver();
  const { today, week, month, balance } = useEarnings(uid);
  return (
    <ScrollView style={s.screen}>
      <View style={[s.card, { backgroundColor: colors.primary }]}>
        <Text style={{ color: '#fff' }}>Saldo del conductor</Text>
        <Text style={{ color: balance < 0 ? '#FCA5A5' : '#fff', fontSize: 28, fontWeight: '800' }}>{formatCOP(balance)}</Text>
        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Pagos por pasarela − comisiones de viajes en efectivo</Text>
      </View>
      <Block title="Hoy" d={today} />
      <Block title="Esta semana" d={week} />
      <Block title="Este mes" d={month} />
    </ScrollView>
  );
}
