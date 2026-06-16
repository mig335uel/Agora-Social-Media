import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform, useColorScheme, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/Types/Posts';
import MediaGrid from './MediaGrid';
import { toggleLike, repostPost, recordShare } from '@/Services/PostService';
import LinkPreviewCard from './LinkPreviewCard';

// ─── Extrae la primera URL de un texto ────────────────────────────────────────
const URL_REGEX = /https?:\/\/[^\s<>"]+/;
function extractFirstUrl(text: string): string | null {
    const match = text.match(URL_REGEX);
    return match ? match[0] : null;
}

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
  onRefresh?: () => void;
}
export default function ReplyItem({ post, isLast = false, onRefresh }: ReplyItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#0f0f0f';
  const subColor = isDark ? '#8b8b8b' : '#6b6b6b';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const [localPost, setLocalPost] = useState<Post>(post);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const handleLike = async () => {
    // Optimistic Update
    const liked = !localPost.is_liked;
    setLocalPost({
      ...localPost,
      is_liked: liked,
      likes_count: Math.max(0, (localPost.likes_count || 0) + (liked ? 1 : -1))
    });

    try {
      await toggleLike(localPost.id);
    } catch (error) {
      console.error("Error al dar like:", error);
      if (onRefresh) onRefresh();
    }
  };

  const handleRepost = async () => {
    // Optimistic Update
    const reposted = !localPost.is_reposted;
    setLocalPost({
      ...localPost,
      is_reposted: reposted,
      reposts_count: Math.max(0, (localPost.reposts_count || 0) + (reposted ? 1 : -1))
    });

    try {
      await repostPost(localPost.id);
    } catch (error) {
      console.error("Error al repostear:", error);
      if (onRefresh) onRefresh();
    }
  };

  const handleShare = async () => {
    // Optimistic Update
    setLocalPost({
      ...localPost,
      shares_count: (localPost.shares_count || 0) + 1
    });

    try {
      await recordShare(localPost.id);
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const renderStyledContent = (content: string) => {
    const regex = /(@[\w\u00f1\u00e1\u00e9\u00ed\u00f3\u00fa]+|#[\w\u00f1\u00e1\u00e9\u00ed\u00f3\u00fa]+|https?:\/\/[^\s<>"]+)/g;
    const parts = content.split(regex);
    return parts.map((part, index) => {
      if (part.match(/^[@#]/)) {
        return <Text key={index} style={styles.mention}>{part}</Text>;
      }
      if (part.match(/^https?:\/\//)) {
        return (
          <Text
            key={index}
            style={styles.linkText}
            onPress={() => Linking.openURL(part).catch(() => {})}
          >
            {part}
          </Text>
        );
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
            source={{ uri: localPost.user?.profile_picture_url || (localPost as any).profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
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
              {localPost.user?.display_name || (localPost as any).display_name}
            </Text>
            {(localPost.user?.is_verified || (localPost as any).is_verified) && (
              <Ionicons name="checkmark-circle" size={14} color="#1DA1F2" style={{ marginLeft: 2 }} />
            )}
            <Text style={[styles.subText, { color: subColor }]} numberOfLines={1}>
              @{localPost.user?.username || (localPost as any).username} · {timeAgo(localPost.created_at)}
            </Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color={subColor} />
          </TouchableOpacity>
        </View>

        {/* Cuerpo de la respuesta */}
        <Text style={[styles.contentText, { color: textColor }]}>
          {renderStyledContent(localPost.content)}
        </Text>

        {/* ── Link Preview Card ── */}
        {(() => {
          const url = extractFirstUrl(localPost.content);
          return url ? <LinkPreviewCard url={url} isDark={isDark} /> : null;
        })()}

        {localPost.media && localPost.media.length > 0 && (
          <MediaGrid media={localPost.media} />
        )}

        {/* Acciones simplificadas */}
        <View style={styles.actions}>
          <ActionItem 
            name={localPost.is_replied ? "chatbubble" : "chatbubble-outline"} 
            count={localPost.replies_count} 
            color={localPost.is_replied ? (isDark ? '#3b82f6' : '#1d4ed8') : subColor} 
          />
          <ActionItem 
            name={localPost.is_reposted ? "repeat" : "repeat-outline"} 
            count={localPost.reposts_count} 
            color={localPost.is_reposted ? "#00BA7C" : subColor} 
            onPress={handleRepost}
          />
          <ActionItem 
            name={localPost.is_liked ? "heart" : "heart-outline"} 
            count={localPost.likes_count} 
            color={localPost.is_liked ? "#F91880" : subColor} 
            onPress={handleLike}
          />
          <ActionItem 
            name="share-outline" 
            color={subColor} 
            onPress={handleShare}
          />
        </View>
      </View>
    </View>
  );
}

function ActionItem({ name, count, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionItem} activeOpacity={0.6} onPress={onPress}>
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
  linkText: {
    color: '#3b82f6',
    fontWeight: '400',
    textDecorationLine: 'underline',
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
