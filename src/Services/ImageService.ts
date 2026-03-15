import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supbase/supabase';
import { decode } from 'base64-arraybuffer';

export const uploadAgoraImage = async () => {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  });

  if (pickerResult.canceled || !pickerResult.assets[0].uri) return null;

  // 1. Transformación a WebP (Ahorro de espacio y velocidad)
  const webpImage = await ImageManipulator.manipulateAsync(
    pickerResult.assets[0].uri,
    [{ resize: { width: 1200 } }], // Un ancho estándar para posts
    { 
      compress: 0.8, 
      format: ImageManipulator.SaveFormat.WEBP, 
      base64: true 
    }
  );

  if (!webpImage.base64) return null;

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
  const filePath = `${fileName}`; // Se guarda en la raíz del bucket 'post_media'

  // 2. Subida al bucket 'post_media'
  const { data, error } = await supabase.storage
    .from('post_media') // 👈 Nombre exacto de tu captura
    .upload(filePath, decode(webpImage.base64), {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Error al subir a post_media:", error.message);
    return null;
  }

  // 3. Generar URL Pública
  const { data: { publicUrl } } = supabase.storage
    .from('post_media')
    .getPublicUrl(filePath);

  return publicUrl;
};