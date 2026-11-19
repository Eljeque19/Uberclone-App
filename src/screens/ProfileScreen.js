import React, { useState } from 'react';
import { ScrollView, Text, View, Image } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useDriver } from '../context/DriverContext';
import { Field, DropdownField, Btn, Row, s } from '../components/ui';
import { validatePersonal } from '../utils/validators';
import { t } from '../services/i18n';

export default function ProfileScreen() {
  const { uid, driver, language, setLanguage, logout } = useDriver();
  const [name, setName] = useState(driver.personal.fullName);
  const [phone, setPhone] = useState(driver.personal.phone);
  const [msg, setMsg] = useState('');
  const errs = validatePersonal({ ...driver.personal, fullName: name, phone });
  const save = async () => { await updateDoc(doc(db, 'drivers', uid), { 'personal.fullName': name, 'personal.phone': phone }); setMsg('Datos guardados'); };
  const v = driver.vehicle; const d = driver.documents;
  return (
    <ScrollView style={s.screen}>
      <Image source={{ uri: driver.personal.photo }} style={{ width: 90, height: 90, borderRadius: 45, alignSelf: 'center' }} />
      <Text style={[s.muted, { textAlign: 'center', marginTop: 6 }]}>Estado de la cuenta: {driver.status}</Text>
      <Field label="Nombre completo" value={name} onChangeText={setName} error={errs.fullName} maxLength={50} />
      <Field label="Celular" value={phone} onChangeText={setPhone} error={errs.phone} keyboardType="phone-pad" maxLength={10} />
      <Btn title="Guardar cambios" onPress={save} disabled={!!errs.fullName || !!errs.phone} />
      {!!msg && <Text style={{ marginTop: 6 }}>{msg}</Text>}
      <View style={[s.card, { marginTop: 16 }]}>
        <Text style={s.title}>Vehículo</Text>
        <Row k="Placa" v={v.plate} /><Row k="Vehículo" v={`${v.brand} ${v.model} ${v.year}`} /><Row k="Categoría" v={v.category} /><Row k="Color" v={v.color} />
      </View>
      <View style={s.card}>
        <Text style={s.title}>Documentos</Text>
        <Row k="Licencia vence" v={d.licenseExpiry} /><Row k="SOAT vence" v={d.soatExpiry} />
        {d.techExpiry && <Row k="Revisión vence" v={d.techExpiry} />}<Row k="Mercado Pago" v={d.mpEmail} />
      </View>
      <DropdownField label="Idioma" value={language} onChange={setLanguage} options={[{ label: 'Español', value: 'es' }, { label: 'English', value: 'en' }]} />
      <Btn title={t(language, 'logout')} onPress={logout} color="#DC2626" />
    </ScrollView>
  );
}
