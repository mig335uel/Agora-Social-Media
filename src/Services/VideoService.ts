import * as ImagePicker from 'expo-image-picker';
import { Video } from 'react-native-compressor';
import { supabase } from '../lib/supbase/supabase';
import { decode } from 'base64-arraybuffer';

export interface ProcessedVideo {
  uri: string;
  type: 'video';
}

/**
 * Abre la librería para seleccionar un vídeo y lo comprime sin pérdida de calidad visual.
 * Utiliza react-native-compressor para reducir drásticamente los MB manteniendo la nitidez.
 */
export const pickAndCompressVideo = async (): Promise<ProcessedVideo | null> => {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    allowsEditing: true,
    quality: 1,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return null;
  }

  const selectedAsset = pickerResult.assets[0];

  try {
    console.log("Comprimiendo vídeo sin pérdida de calidad...", selectedAsset.uri);

    // Compresión inteligente de vídeo H.264/MP4 manteniendo resolución óptima
    const compressedUri = await Video.compress(
      selectedAsset.uri,
      {
        compressionMethod: 'auto',
        bitrate: 6000 // Bitrate óptimo para HD móvil sin artefactos visuales
      },
      (progress) => {
        console.log(`Progreso de compresión de vídeo: ${Math.round(progress * 100)}%`);
      }
    );

    console.log("✅ Vídeo comprimido correctamente:", compressedUri);

    return {
      uri: compressedUri,
      type: 'video',
    };
  } catch (error) {
    console.error("❌ Error al comprimir el vídeo, usando original:", error);
    return {
      uri: selectedAsset.uri,
      type: 'video',
    };
  }
};

/**
 * Sube un vídeo comprimido al bucket 'post_media' en Supabase.
 */
export const uploadPostVideo = async (postId: string, videoUri: string): Promise<string | null> => {
  try {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
    const filePath = `${postId}/${fileName}`;

    // Leemos el archivo en Blob / ArrayBuffer para la subida
    const response = await fetch(videoUri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from('post_media')
      .upload(filePath, blob, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error("Error al subir vídeo a post_media:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('post_media').getPublicUrl(filePath);
    return publicUrlData?.publicUrl ?? null;
  } catch (error) {
    console.error("Error procesando subida de vídeo:", error);
    return null;
  }
};
