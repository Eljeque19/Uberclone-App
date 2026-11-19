const dict = {
  es: { home: 'Inicio', earnings: 'Ganancias', history: 'Historial', profile: 'Perfil', available: 'Disponible', unavailable: 'No disponible', logout: 'Cerrar sesión' },
  en: { home: 'Home', earnings: 'Earnings', history: 'Trip history', profile: 'Profile', available: 'Available', unavailable: 'Unavailable', logout: 'Log out' },
};
export const t = (lang, key) => (dict[lang] || dict.es)[key] || key;
