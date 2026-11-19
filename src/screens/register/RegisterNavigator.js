import React, { createContext, useContext, useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Field, DropdownField, ImageField, DateField, Btn, s, colors } from '../../components/ui';
import { validatePersonal, validateVehicle, validateDocs, needsTechReview, techDueYear, addYears } from '../../utils/validators';
import { useDriver } from '../../context/DriverContext';
import { PRICING } from '../../config/pricing';

const FormCtx = createContext(null);
const Tab = createBottomTabNavigator();
const COLORS = ['Blanco', 'Negro', 'Gris', 'Plateado', 'Rojo', 'Azul', 'Verde', 'Amarillo'];

function useForm(init, validate) {
  const [values, setValues] = useState(init);
  const [touched, setTouched] = useState({});
  const errors = validate(values);
  const bind = (k) => ({
    value: values[k], error: touched[k] ? errors[k] : undefined,
    onChange: (v) => { setValues((p) => ({ ...p, [k]: v })); setTouched((p) => ({ ...p, [k]: true })); },
  });
  return { values, errors, valid: Object.keys(errors).length === 0, bind };
}
const T = ({ f, k, label, ...p }) => { const b = f.bind(k); return <Field label={label} value={b.value} error={b.error} onChangeText={b.onChange} {...p} />; };

function Provider({ children }) {
  const personal = useForm({ language: 'es' }, validatePersonal);
  const vehicle = useForm({}, validateVehicle);
  const docs = useForm({ acceptedTerms: false }, (v) => validateDocs(v, vehicle.values.year));
  const value = useMemo(() => ({ personal, vehicle, docs }), [personal, vehicle, docs]);
  return <FormCtx.Provider value={value}>{children}</FormCtx.Provider>;
}

function PersonalTab() {
  const { personal: f } = useContext(FormCtx);
  const d = new Date(); d.setFullYear(d.getFullYear() - 18);
  return (
    <ScrollView style={s.screen}>
      <ImageField label="Foto de perfil" {...f.bind('photo')} />
      <T f={f} k="fullName" label="Nombre completo" maxLength={50} />
      <T f={f} k="idNumber" label="Documento de identidad" keyboardType="numeric" maxLength={10} />
      <T f={f} k="phone" label="Número de celular" keyboardType="phone-pad" maxLength={10} />
      <DateField label="Fecha de nacimiento" maximumDate={d} {...f.bind('birthDate')} />
      <DropdownField label="Género" options={['Masculino', 'Femenino', 'Otro']} {...f.bind('gender')} />
      <T f={f} k="email" label="Correo electrónico" keyboardType="email-address" autoCapitalize="none" />
      <DropdownField label="Idioma" options={[{ label: 'Español', value: 'es' }, { label: 'English', value: 'en' }]} {...f.bind('language')} />
    </ScrollView>
  );
}

function VehicleTab() {
  const { vehicle: f } = useContext(FormCtx);
  return (
    <ScrollView style={s.screen}>
      <DropdownField label="Categoría" options={[{ label: 'Económico', value: 'economy' }, { label: 'XL', value: 'xl' }, { label: 'Premium', value: 'premium' }]} {...f.bind('category')} />
      <T f={f} k="plate" label="Placa (ABC123)" autoCapitalize="characters" maxLength={6} />
      <T f={f} k="brand" label="Marca" maxLength={30} />
      <T f={f} k="model" label="Modelo" maxLength={30} />
      <T f={f} k="year" label="Año" keyboardType="numeric" maxLength={4} />
      <DropdownField label="Color" options={COLORS} {...f.bind('color')} />
      <T f={f} k="capacity" label="Capacidad de pasajeros" keyboardType="numeric" maxLength={2} />
      <ImageField label="Foto del vehículo (con la placa visible)" {...f.bind('vehiclePhoto')} />
    </ScrollView>
  );
}

function DocsTab() {
  const { personal, vehicle, docs: f } = useContext(FormCtx);
  const { registerDriver } = useDriver();
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const tomorrow = new Date(Date.now() + 86400000);
  const modelYear = vehicle.values.year;
  const validYear = /^\d{4}$/.test(modelYear || '');
  const techNeeded = needsTechReview(modelYear);
  const allValid = personal.valid && vehicle.valid && f.valid;
  const submit = async () => {
    setBusy(true); setSubmitError('');
    try { await registerDriver(personal.values, vehicle.values, f.values); } // al terminar, DriverContext detecta el documento y entra a la app
    catch (e) { setSubmitError(e.message); } finally { setBusy(false); }
  };
  const terms = f.bind('acceptedTerms');
  return (
    <ScrollView style={s.screen}>
      <T f={f} k="licenseNumber" label="Licencia de conducción (número, máx. 10 dígitos)" keyboardType="numeric" maxLength={10} />
      <ImageField label="Foto de la licencia" {...f.bind('licensePhoto')} />
      <DateField label="Vencimiento de la licencia" minimumDate={tomorrow} {...f.bind('licenseExpiry')} />
      <ImageField label="Foto del SOAT" {...f.bind('soatPhoto')} />
      <DateField label="Fecha de expedición del SOAT" maximumDate={new Date()} {...f.bind('soatIssueDate')} />
      {!!f.values.soatIssueDate && <Text style={s.muted}>Vence el {addYears(f.values.soatIssueDate, 1)} (vigencia de 1 año, calculado automáticamente)</Text>}
      {validYear ? (
        <Text style={[{ marginTop: 14, fontWeight: '600' }, techNeeded && { color: colors.danger }]}>
          {techNeeded
            ? `Tu vehículo (modelo ${modelYear}) cumplió 6 años en ${techDueYear(modelYear)}: necesitas tecnomecánica vigente.`
            : `Tu vehículo (modelo ${modelYear}) no requiere tecnomecánica hasta ${techDueYear(modelYear)}.`}
        </Text>
      ) : <Text style={[s.muted, { marginTop: 14 }]}>Llena el año del vehículo (pestaña Vehículo) para saber si necesitas tecnomecánica.</Text>}
      {techNeeded && (<>
        <ImageField label="Foto de la revisión técnico-mecánica" {...f.bind('techPhoto')} />
        <DateField label="Vencimiento de la revisión" minimumDate={tomorrow} {...f.bind('techExpiry')} />
      </>)}
      <T f={f} k="mpEmail" label="Correo de la cuenta de Mercado Pago" keyboardType="email-address" autoCapitalize="none" />
      <Pressable style={{ flexDirection: 'row', marginTop: 16, alignItems: 'center' }} onPress={() => terms.onChange(!terms.value)}>
        <View style={{ width: 22, height: 22, borderWidth: 2, borderColor: colors.primary, marginRight: 8, backgroundColor: terms.value ? colors.accent : '#fff' }} />
        <Text style={{ flex: 1 }}>Acepto los términos. La plataforma cobra una comisión del {PRICING.commissionRate * 100}% sobre cada viaje.</Text>
      </Pressable>
      {!!terms.error && <Text style={s.error}>{terms.error}</Text>}
      {!!submitError && <Text style={s.error}>{submitError}</Text>}
      {!allValid && <Text style={[s.muted, { marginTop: 10 }]}>Completa las tres pestañas para habilitar el envío.</Text>}
      <Btn title={busy ? 'Enviando...' : 'Enviar registro'} onPress={submit} disabled={!allValid || busy} />
    </ScrollView>
  );
}

export default function RegisterNavigator() {
  return (
    <Provider>
      <Tab.Navigator screenOptions={{ tabBarLabelStyle: { fontSize: 13, marginBottom: 6 }, tabBarIcon: () => null }}>
        <Tab.Screen name="Datos personales" component={PersonalTab} />
        <Tab.Screen name="Vehículo" component={VehicleTab} />
        <Tab.Screen name="Documentos" component={DocsTab} />
      </Tab.Navigator>
    </Provider>
  );
}