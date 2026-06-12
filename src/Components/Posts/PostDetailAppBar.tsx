import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActionSheetIOS, Alert, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReportModal from '@/Components/ReportModal';

interface PostDetailAppBarProps {
  title?: string;
  showBack?: boolean;
  postId?: string;      // si se pasa, aparece el botón de opciones
  isOwner?: boolean;    // true si el post es del usuario actual
  onDelete?: () => void;
}

export default function PostDetailAppBar({
  title = "Publicación",
  showBack = true,
  postId,
  isOwner = false,
  onDelete,
}: PostDetailAppBarProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [reportVisible, setReportVisible] = useState(false);

  const textColor  = isDark ? '#ffffff' : '#000000';
  const bgColor    = isDark ? '#000000' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const subColor   = isDark ? '#8e8e93' : '#6c6c70';

  const handleOptions = () => {
    if (!postId) return;

    if (Platform.OS === 'ios') {
      const options = isOwner
        ? ['Eliminar publicación', 'Cancelar']
        : ['Reportar publicación', 'Cancelar'];

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: isOwner ? 0 : undefined,
          cancelButtonIndex: options.length - 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            if (isOwner) onDelete?.();
            else setReportVisible(true);
          }
        }
      );
    } else {
      const buttons = isOwner
        ? [
            { text: 'Cancelar', style: 'cancel' as const },
            { text: 'Eliminar', style: 'destructive' as const, onPress: onDelete },
          ]
        : [
            { text: 'Cancelar', style: 'cancel' as const },
            { text: 'Reportar publicación', onPress: () => setReportVisible(true) },
          ];

      Alert.alert('Opciones', '¿Qué deseas hacer?', buttons);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: bgColor, borderBottomColor: borderColor }]}>
        {/* Izquierda: botón atrás */}
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                size={24}
                color={textColor}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Centro: título */}
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>

        {/* Derecha: opciones ··· */}
        <View style={styles.side}>
          {postId ? (
            <TouchableOpacity
              onPress={handleOptions}
              style={styles.iconBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={subColor} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Modal de reporte (solo si postId existe y no es el owner) */}
      {postId && !isOwner && (
        <ReportModal
          visible={reportVisible}
          context="post"
          targetId={postId}
          onClose={() => setReportVisible(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
});
