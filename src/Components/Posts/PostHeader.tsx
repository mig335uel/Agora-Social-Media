import React from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Usuario } from '@/Types/Users';

interface PostHeaderProps {
  user: Usuario;
  createdAt: string;
  showFollow?: boolean;
}

// Utilidad: tiempo relativo (puedes moverla a un archivo de utils luego)
const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export default function PostHeader({ user, createdAt, showFollow = false }: PostHeaderProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#0f0f0f';
  const subColor = isDark ? '#8b8b8b' : '#6b6b6b';

  return (
    <View style={styles.header}>
      <TouchableOpacity activeOpacity={0.7} style={styles.authorContainer}>
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: user.profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
            style={styles.avatar}
          />
        </View>

        {/* Info del usuario */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
              {user.display_name}
            </Text>
            {user.is_verified && (
              <Ionicons name="checkmark-circle" size={16} color="#1DA1F2" />
            )}
            <Text style={[styles.timestamp, { color: subColor }]}>
              · {timeAgo(createdAt)}
            </Text>
          </View>
          <Text style={[styles.username, { color: subColor }]} numberOfLines={1}>
            @{user.username}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Botón de opciones / Seguir */}
      <View style={styles.rightContainer}>
        {showFollow && (
          <TouchableOpacity style={styles.followBtn}>
            <Text style={styles.followText}>Seguir</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={subColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4,
  },
  authorContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  timestamp: {
    fontSize: 14,
  },
  username: {
    fontSize: 14,
    marginTop: -1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  followBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  followText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
});
