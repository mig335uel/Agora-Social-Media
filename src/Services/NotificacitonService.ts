import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { supabase } from "../lib/supbase/supabase";

/**
 * Solicita permisos de notificación y obtiene el Expo Push Token.
 */
export async function requestNotificationPermission() {
  console.log("--- Iniciando requestNotificationPermission (Expo SDK) ---");

  if (!Device.isDevice) {
    console.log('DEBUG: No es un dispositivo físico. Saltando permiso.');
    return null;
  }

  // 1. Permisos para Android 13+ y iOS
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log("DEBUG: Permiso denegado.");
    Alert.alert('Permiso denegado', 'Activa las notificaciones en ajustes.');
    return null;
  }

  // 2. Obtener Token
  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("DEBUG: Token obtenido:", token);
    return token;
  } catch (error: any) {
    console.warn("DEBUG: No se pudo obtener el token:", error.message);
    return null;
  }
}

/**
 * Registra el dispositivo en Supabase.
 */
export async function saveDeviceToken(userId: string, token: string) {
  const { error } = await supabase
    .from('devices')
    .upsert({
      user_id: userId,
      fcm_token: token,
      device_name: Device.deviceName || 'Unknown',
      platform: Platform.OS,
      device_identifier: Device.osBuildId || 'Unknown',
      last_seen: new Date().toISOString()
    }, { onConflict: 'user_id, fcm_token' });

  if (error) console.error("Error guardando token:", error.message);
  else console.log("✅ Token guardado");
}


export async function getNotifcations(userId: string){
  const { data, error } = await supabase
    .from('notifications')
    .select('*, users!sender_id(*)')
    .eq('receiver_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error obteniendo notificaciones:", error.message);
    return [];
  }

  return data;
}

/**
 * Marca todas las notificaciones no leídas de un usuario como leídas.
 * Se llama al abrir la pantalla de notificaciones para resetear el badge.
 */
export async function markAllAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error("Error marcando como leídas:", error.message);
  }
}