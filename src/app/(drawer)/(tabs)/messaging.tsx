import { Redirect } from 'expo-router';

// Puente para iPad sidebar: redirige a la ruta real de mensajería
export default function MessagingBridge() {
  return <Redirect href="/(drawer)/messaging" />;
}
