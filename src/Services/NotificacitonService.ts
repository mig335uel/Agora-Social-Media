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

  // Configurar canal para Android (Requerido para Android 8.0+)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
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

  // 2. Obtener Token FCM (Firebase Cloud Messaging)
  try {
    // @ts-ignore - Algunas versiones de tipos de expo-notifications no incluyen projectId, pero es válido en runtime.
    const token = (await Notifications.getDevicePushTokenAsync({
      projectId: "5daba5d2-4908-419a-9034-2e3ea691e59f"
    })).data;
    console.log("DEBUG: Token FCM obtenido:", token);
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
  try {
    // 1. LIMPIEZA AGRESIVA (Constraint-Agnostic)
    // Borramos cualquier registro previo de este token o de este dispositivo para este usuario.
    // Esto hace que el "insert" posterior nunca choque con una PK o Unique Constraint.
    await supabase
      .from('devices')
      .delete()
      .or(`fcm_token.eq."${token}",and(user_id.eq."${userId}",device_identifier.eq."${Device.osBuildId || 'Unknown'}")`);

    // 2. INSERTAR NUEVO REGISTRO
    const { error } = await supabase
      .from('devices')
      .insert({
        user_id: userId,
        fcm_token: token,
        device_name: Device.deviceName || 'Unknown',
        platform: Platform.OS,
        device_identifier: Device.osBuildId || 'Unknown',
        last_seen: new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error Supabase al registrar dispositivo:", error.message, error.details);
    } else {
      console.log("✅ Dispositivo registrado con éxito para:", userId);
    }
  } catch (err) {
    console.error("❌ Error inesperado en saveDeviceToken:", err);
  }
}



export async function getNotifcations(userId: string) {
  if (!userId || userId === "undefined") return [];

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
  } else {
    // Sincronizar el badge del icono de la app a 0
    Notifications.setBadgeCountAsync(0);
  }
}

/**
 * Obtiene el conteo de notificaciones no leídas y actualiza el badge del icono de la app.
 */
export async function updateAppBadge(userId: string) {
  if (!userId || userId === "undefined") return;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (!error && count !== null) {
    Notifications.setBadgeCountAsync(count);
  }
}