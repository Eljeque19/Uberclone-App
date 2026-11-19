import 'react-native-gesture-handler';
import React from 'react';
import { DriverProvider } from './src/context/DriverContext';
import Navigation from './src/navigation';

export default function App() {
  return <DriverProvider><Navigation /></DriverProvider>;
}
