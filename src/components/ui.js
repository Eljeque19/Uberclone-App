import React, { useState } from 'react';
import { View, Text, TextInput, Image, Pressable, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export const colors = { primary: '#111827', accent: '#06C167', danger: '#DC2626', muted: '#6B7280', bg: '#F9FAFB' };
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 4, color: colors.primary },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, backgroundColor: '#fff' },
  error: { color: colors.danger, fontSize: 12, marginTop: 2 },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  muted: { color: colors.muted },
});

export const Btn = ({ title, onPress, disabled, color }) => (
  <Pressable onPress={onPress} disabled={disabled} style={[s.btn, color && { backgroundColor: color }, disabled && { opacity: 0.4 }]}>
    <Text style={s.btnText}>{title}</Text>
  </Pressable>
);
export const Row = ({ k, v, bold }) => (
  <View style={s.row}><Text style={s.muted}>{k}</Text><Text style={bold && { fontWeight: '700' }}>{v}</Text></View>
);

export const Field = ({ label, error, ...props }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <TextInput style={[s.input, error && { borderColor: colors.danger }]} {...props} />
    {!!error && <Text style={s.error}>{error}</Text>}
  </View>
);

export const DropdownField = ({ label, value, onChange, options, error }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <View style={[s.input, { padding: 0 }, error && { borderColor: colors.danger }]}>
      <Picker selectedValue={value} onValueChange={onChange}>
        <Picker.Item label="Seleccionar..." value="" />
        {options.map((o) => <Picker.Item key={o.value ?? o} label={o.label ?? o} value={o.value ?? o} />)}
      </Picker>
    </View>
    {!!error && <Text style={s.error}>{error}</Text>}
  </View>
);

export function ImageField({ label, value, onChange, error }) {
  const pick = async (camera) => {
    const fn = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    if (camera) await ImagePicker.requestCameraPermissionsAsync();
    const r = await fn({ mediaTypes: ['images'], quality: 0.4, base64: true });
    if (!r.canceled) { const a = r.assets[0]; onChange(`data:image/jpeg;base64,${a.base64}`); }
  };
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      {!!value && <Image source={{ uri: value }} style={{ width: 90, height: 90, borderRadius: 8, marginBottom: 6 }} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={[s.input, { flex: 1, alignItems: 'center' }]} onPress={() => pick(true)}><Text>Cámara</Text></Pressable>
        <Pressable style={[s.input, { flex: 1, alignItems: 'center' }]} onPress={() => pick(false)}><Text>Galería</Text></Pressable>
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function DateField({ label, value, onChange, error, maximumDate, minimumDate }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, error && { borderColor: colors.danger }]} onPress={() => setShow(true)}>
        <Text>{value || 'Seleccionar fecha'}</Text>
      </Pressable>
      {show && (
        <DateTimePicker value={value ? new Date(value) : new Date()} mode="date" maximumDate={maximumDate} minimumDate={minimumDate}
          onChange={(e, d) => { setShow(false); if (d) onChange(d.toISOString().slice(0, 10)); }} />
      )}
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}
