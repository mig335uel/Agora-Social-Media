import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supbase/supabase';
import { decode } from 'base64-arraybuffer';

/**
 * Interfaz para representar una imagen ya procesada localmente y lista para subir.
 */
export interface ProcessedImage {
  uri: string;
  base64: string;
}

/**
 * Abre la librería de imágenes, permite al usuario elegir una o varias y las procesa a formato WebP.
 * @param allowMultiple Si se permite elegir más de una imagen.
 */
export const pickAndProcessImage = async (allowMultiple: boolean = false): Promise<ProcessedImage[]> => {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: !allowMultiple, // El recorte solo funciona con una sola imagen
    allowsMultipleSelection: allowMultiple,
    quality: 1,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) return [];

  const processedImages: ProcessedImage[] = [];

  for (const asset of pickerResult.assets) {
    try {
      const webpImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.WEBP,
          base64: true
        }
      );

      if (webpImage.base64) {
        processedImages.push({
          uri: webpImage.uri,
          base64: webpImage.base64
        });
      }
    } catch (error) {
      console.error("Error processing asset:", asset.uri, error);
    }
  }

  return processedImages;
};

/**
 * Sube una imagen procesada a una carpeta específica dentro del bucket 'post_media'.
 * La carpeta llevará el nombre del ID del post para organizar el almacenamiento.
 */
export const uploadPostImage = async (postId: string, image: ProcessedImage): Promise<string | null> => {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
  const filePath = `${postId}/${fileName}`; // Organizado por ID de post (carpeta única por post)

  const { error } = await supabase.storage
    .from('post_media')
    .upload(filePath, decode(image.base64), {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error("Error al subir a post_media:", error.message);
    return null;
  }

  const { data: PublicUrlData } = await supabase.storage.from('post_media').getPublicUrl(filePath);
  const publicUrl = PublicUrlData?.publicUrl ?? null;


  return publicUrl;
};

// Mantenemos esta para compatibilidad o la refactorizamos
export const uploadAgoraImage = async () => {
  const processedList = await pickAndProcessImage();
  if (processedList.length === 0) return null;

  // Si no hay postId, lo subimos a una carpeta 'temp' o raíz
  return uploadPostImage('general', processedList[0]);
};

/**
 * Sube una imagen de avatar procesada al bucket 'avatars'.
 * La organiza dentro de una carpeta con el ID del usuario.
 */
export const uploadAvatarImage = async (userId: string, image: ProcessedImage): Promise<string | null> => {
  // Usamos timestamp para forzar actualización de caché (ya que el nombre cambia)
  const fileName = `${Date.now()}-avatar.webp`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(filePath, decode(image.base64), {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: true // Si un avatar anterior con el mismo nombre existiese, lo pisa (aunque Date.now lo evita)
    });

  if (error) {
    console.error("Error al subir a avatars:", error.message);
    return null;
  }

  const { data: PublicUrlData } = await supabase.storage.from('avatars').getPublicUrl(filePath);
  return PublicUrlData?.publicUrl ?? null;
};