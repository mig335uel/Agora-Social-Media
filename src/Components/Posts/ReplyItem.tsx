import React from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/Types/Posts';

// Utilidades (reutilizadas de PostCard para consistencia)
const formatCount = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
};

const timeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
};

interface ReplyItemProps {
  post: Post;
  isLast?: boolean;
}

export default function ReplyItem({ post, isLast = false }: ReplyItemProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#0f0f0f';
  const subColor = isDark ? '#8b8b8b' : '#6b6b6b';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const renderStyledContent = (content: string) => {
    const regex = /([@#][\wñáéíóú]+)/g;
    const parts = content.split(regex);
    return parts.map((part, index) => {
      if (part.match(regex)) {
        return <Text key={index} style={styles.mention}>{part}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  return (
    <View style={[styles.container, !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {/* Avatar a la izquierda, similar al feed pero sin la "card" envolvente */}
      <View style={styles.avatarColumn}>
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: post.user?.profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
            style={styles.avatar}
          />
        </View>
        {/* Aquí podrías añadir la línea vertical si fuera un hilo complejo */}
      </View>

      <View style={styles.contentColumn}>
        {/* Header: Nombre + Username + Fecha */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
              {post.user?.display_name}
            </Text>
            {post.user?.is_verified && (
              <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" style={{ marginLeft: 2 }} />
            )}
            <Text style={[styles.subText, { color: subColor }]} numberOfLines={1}>
              @{post.user?.username} · {timeAgo(post.created_at)}
            </Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color={subColor} />
          </TouchableOpacity>
        </View>

        {/* Cuerpo de la respuesta */}
        <Text style={[styles.contentText, { color: textColor }]}>
          {renderStyledContent(post.content)}
        </Text>

        {post.media_url && (
          <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
        )}

        {/* Acciones simplificadas */}
        <View style={styles.actions}>
          <ActionItem name="chatbubble-outline" count={post.replies_count} color={subColor} />
          <ActionItem name="repeat-outline" count={post.reposts_count} color={subColor} />
          <ActionItem name="heart-outline" count={post.likes_count} color={subColor} />
          <ActionItem name="share-outline" color={subColor} />
        </View>
      </View>
    </View>
  );
}

function ActionItem({ name, count, color }: any) {
  return (
    <TouchableOpacity style={styles.actionItem} activeOpacity={0.6}>
      <Ionicons name={name} size={16} color={color} />
      {count !== undefined && (
        <Text style={[styles.actionCount, { color }]}>{formatCount(count)}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  avatarColumn: {
    marginRight: 12,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  contentColumn: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  displayName: {
    fontWeight: '700',
    fontSize: 14,
  },
  subText: {
    fontSize: 13,
    flexShrink: 1,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  mention: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginRight: 10,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
