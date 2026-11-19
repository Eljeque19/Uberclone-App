import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { uploadImage } from '../services/api';

const Ctx = createContext(null);
export const useDriver = () => useContext(Ctx);

export function DriverProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [driver, setDriver] = useState(null);       // documento drivers/{uid} (tiempo real)
  const [loading, setLoading] = useState(true);
  const [available, setAvailableState] = useState(false);
  const [language, setLanguageState] = useState('es');
  const [activeTripId, setActiveTripId] = useState(null);

  // Preferencias (solo idioma y último estado: nada sensible en AsyncStorage)
  useEffect(() => {
    AsyncStorage.multiGet(['lang', 'lastAvailability']).then(([[, l], [, a]]) => {
      if (l) setLanguageState(l);
      if (a === 'true') setAvailableState(true);
    });
  }, []);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUid(u ? u.uid : null); if (!u) setLoading(false); }), []);

  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(doc(db, 'drivers', uid), (snap) => { // limpieza: se devuelve el unsubscribe
      setDriver(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
  }, [uid]);

  const approved = driver?.status === 'approved';

  const setAvailable = useCallback(async (value) => {
    if (value && !approved) return;
    setAvailableState(value);
    await AsyncStorage.setItem('lastAvailability', String(value));
    if (uid) await updateDoc(doc(db, 'drivers', uid), { available: value });
  }, [approved, uid]);

  const setLanguage = useCallback(async (l) => {
    setLanguageState(l);
    await AsyncStorage.setItem('lang', l);
    if (uid) await updateDoc(doc(db, 'drivers', uid), { 'personal.language': l });
  }, [uid]);

  const registerDriver = useCallback(async (personal, vehicle, docs) => {
    const cred = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
    await setDoc(doc(db, 'drivers', cred.user.uid), {
      personal: { ...personal, photo: await uploadImage(personal.photo) },
      vehicle: { ...vehicle, plate: vehicle.plate.toUpperCase(), vehiclePhoto: await uploadImage(vehicle.vehiclePhoto) },
      documents: {
        licenseNumber: docs.licenseNumber, licenseExpiry: docs.licenseExpiry, licensePhoto: await uploadImage(docs.licensePhoto),
        soatExpiry: docs.soatExpiry, soatPhoto: await uploadImage(docs.soatPhoto),
        techExpiry: docs.techExpiry || null, techPhoto: docs.techPhoto ? await uploadImage(docs.techPhoto) : null,
        mpEmail: docs.mpEmail, // solo el correo; nunca cuentas bancarias ni tarjetas
      },
      status: 'pending', // Pendiente de aprobación: cámbialo a 'approved' en Firestore para simular
      available: false, location: null, createdAt: serverTimestamp(),
    });
  }, []);

  const logout = useCallback(async () => {
    if (uid) await updateDoc(doc(db, 'drivers', uid), { available: false }).catch(() => {});
    setAvailableState(false); setActiveTripId(null);
    await AsyncStorage.removeItem('lastAvailability');
    await signOut(auth); setDriver(null);
  }, [uid]);

  const value = useMemo(() => ({
    uid, driver, loading, approved, available, setAvailable, language, setLanguage,
    activeTripId, setActiveTripId, registerDriver, logout,
  }), [uid, driver, loading, approved, available, setAvailable, language, setLanguage, activeTripId, registerDriver, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
