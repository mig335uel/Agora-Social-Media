// Añade esta función a tu archivo de servicios

import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from "../lib/supbase/supabase";
export async function requestNotificationPermission() {
  let token;
  console.log("--- Iniciando requestNotificationPermission ---");

  // 1. Evitar errores en simuladores
  if (!Device.isDevice) {
    console.log('DEBUG: No es un dispositivo físico. Saltando permiso.');
    return null;
  }

  // 2. Comprobar si ya tenemos permiso
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  console.log("DEBUG: Estado de permiso existente:", existingStatus);
  let finalStatus = existingStatus;

  // 3. Si no lo tenemos, lanzamos el popup nativo del sistema
  if (existingStatus !== 'granted') {
    console.log("DEBUG: Solicitando nuevos permisos...");
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log("DEBUG: Nuevo estado de permiso:", finalStatus);
  }

  // 4. Si el usuario rechaza
  if (finalStatus !== 'granted') {
    console.log("DEBUG: Permiso denegado por el usuario.");
    Alert.alert(
      'Permiso denegado',
      'Para recibir avisos de likes y comentarios, activa las notificaciones en ajustes.'
    );
    return null;
  }

  // 5. Obtener el Token
  try {
    token = (await Notifications.getDevicePushTokenAsync()).data;
    console.log("DEBUG: Token de Firebase obtenido con éxito:", token);
  } catch (error: any) {
    // Si falla por falta de entitlements en real device, capturamos el error para que no crashee la app
    console.warn("DEBUG: No se pudo obtener el token de notificación (posiblemente faltan los permisos 'aps-environment' en Xcode):", error.message);
    return null;
  }

  return token;
}

export async function saveDeviceToken(userId: string, token: string) {
  console.log("Intentando guardar token en Supabase para el user:", userId);
  
  const { error } = await supabase
    .from('devices')
    .upsert({
      user_id: userId,
      fcm_token: token,
      device_name: Device.deviceName || 'Unknown',
      platform: Platform.OS,
      device_identifier: Device.osBuildId || 'Simulator',
      last_seen: new Date().toISOString()
    }, { onConflict: 'user_id, fcm_token' });

  if (error) {
    console.error("Error RLS o de Database en tabla 'devices':", error.message);
  } else {
    console.log("✅ Token guardado correctamente en la tabla 'devices'");
  }
}