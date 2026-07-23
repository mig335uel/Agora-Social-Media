import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { supabase } from '../lib/supbase/supabase';

export interface ProcessedVideo {
  uri: string;
  type: 'video';
}

/**
 * Abre la librería para seleccionar un vídeo (máximo 3 minutos de duración).
 */
export const pickAndCompressVideo = async (): Promise<ProcessedVideo | null> => {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: true,
    videoMaxDuration: 180, // Máximo 3 minutos (180 segundos)
    quality: 1,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return null;
  }

  const selectedAsset = pickerResult.assets[0];

  // Validación de la duración del vídeo seleccionado
  if (selectedAsset.duration) {
    const durationInSeconds = selectedAsset.duration > 1000 ? selectedAsset.duration / 1000 : selectedAsset.duration;
    if (durationInSeconds > 180) {
      Alert.alert("Vídeo demasiado largo", "Los vídeos en Agora no pueden superar los 3 minutos de duración.");
      return null;
    }
  }

  console.log("Vídeo seleccionado (máx 3 mins):", selectedAsset.uri);

  return {
    uri: selectedAsset.uri,
    type: 'video',
  };
};

/**
 * Pre-sube un vídeo en segundo plano al seleccionar para publicación instantánea.
 */
export const uploadVideoPreload = async (videoUri: string): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const folder = user?.id || 'temp';
    const fileExt = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
    const isMov = fileExt === 'mov';
    const finalExt = isMov ? 'mp4' : fileExt;
    const fileName = `preload_${Date.now()}_${Math.random().toString(36).substring(7)}.${finalExt}`;
    const filePath = `${folder}/${fileName}`;

    console.log("⚡ Pre-subiendo vídeo en segundo plano...", videoUri);

    const formData = new FormData();
    formData.append('file', {
      uri: videoUri,
      name: fileName,
      type: isMov ? 'video/mp4' : `video/${finalExt}`,
    } as any);

    const { error } = await supabase.storage
      .from('post_media')
      .upload(filePath, formData, {
        contentType: isMov ? 'video/mp4' : `video/${finalExt}`,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error("Error en pre-subida de vídeo:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('post_media').getPublicUrl(filePath);
    return publicUrlData?.publicUrl ?? null;
  } catch (error) {
    console.error("Error en pre-subida de vídeo:", error);
    return null;
  }
};

/**
 * Sube el archivo de vídeo directamente al bucket 'post_media' en Supabase como MP4.
 */
export const uploadPostVideo = async (postId: string, videoUri: string): Promise<string | null> => {
  if (videoUri.startsWith('http')) {
    return videoUri;
  }
  try {
    const fileExt = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
    const isMov = fileExt === 'mov';
    const finalExt = isMov ? 'mp4' : fileExt;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${finalExt}`;
    const filePath = `${postId}/${fileName}`;

    console.log("Subiendo vídeo directamente a post_media...", videoUri);

    const formData = new FormData();
    formData.append('file', {
      uri: videoUri,
      name: fileName,
      type: isMov ? 'video/mp4' : `video/${finalExt}`,
    } as any);

    const { error } = await supabase.storage
      .from('post_media')
      .upload(filePath, formData, {
        contentType: isMov ? 'video/mp4' : `video/${finalExt}`,
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
