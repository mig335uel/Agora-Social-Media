import { Redirect } from 'expo-router';

// Puente para iPad sidebar: redirige a la ruta real de ajustes
export default function SettingsBridge() {
  return <Redirect href="/(drawer)/settings" />;
}
