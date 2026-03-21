import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, useColorScheme, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Post } from '@/Types/Posts';
import MediaGrid from './MediaGrid';
import { EditorDeTexto } from '../EditorDeTexto';
import { ProcessedImage } from '@/Services/ImageService';
import { createPost, getTrendingTopics, toggleLike, repostPost, recordShare } from '@/Services/PostService';
import { searchUsers } from '@/Services/UserService';

interface PrincipalPostProps {
  post: Post;
  onRefresh?: () => void;
}

// Utilidades (puedes moverlas a un utils.ts después)
const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + 
         date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PrincipalPost({ post, onRefresh }: PrincipalPostProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const textColor = isDark ? '#ffffff' : '#000000';
  const subColor = isDark ? '#a0a0a0' : '#666666';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  const renderStyledContent = (content: string) => {
    const regex = /([@#][\wñáéíóú]+)/g;
    const parts = content.split(regex);
    return parts.map((part, index) => {
      if (part.match(regex)) {
        return (
          <Text key={index} style={styles.mention}>
            {part}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const [isReplyModalVisible, setIsReplyModalVisible] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [localPost, setLocalPost] = useState<Post>(post);

  useEffect(() => {
    setLocalPost(post);
  }, [post]);
 
  const handlePublishReply = async (content: string, images: ProcessedImage[]) => {
    try {
      await createPost(content, images, post.id);
      setIsReplyModalVisible(false);
      setReplyContent('');
      if (onRefresh) onRefresh();
      // Podríamos añadir una notificación de éxito aquí
    } catch (error) {
      console.error("Error al responder:", error);
    }
  };

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

  const postToRender = localPost;

  return (
    <View style={styles.container}>
      {/* Header: Autor con degradado premium */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['#3b82f6', '#fbbf24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Image
              source={{ uri: postToRender.user?.profile_picture_url || (postToRender as any).profile_picture_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png" }}
              style={styles.avatar}
            />
          </LinearGradient>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: textColor }]}>
              {postToRender.user?.display_name || (postToRender as any).display_name} {(postToRender.user?.is_verified || (postToRender as any).is_verified) === true ? <Ionicons name="checkmark-circle" size={16} color="#3b82f6" /> : null}
            </Text>
            <Text style={[styles.username, { color: subColor }]}>@{postToRender.user?.username || (postToRender as any).username}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={subColor} />
        </TouchableOpacity>
      </View>

      {/* Cuerpo del Post */}
      <View style={styles.body}>
        <Text style={[styles.content, { color: textColor }]}>
          {renderStyledContent(postToRender.content)}
        </Text>
        
        {postToRender.media && postToRender.media.length > 0 && (
          <MediaGrid media={postToRender.media} />
        )}
      </View>

      {/* Metadatos: Fecha y hora */}
      <View style={[styles.metaContainer, { borderBottomColor: borderColor }]}>
        <Text style={[styles.dateText, { color: subColor }]}>
          {formatFullDate(postToRender.created_at)}
        </Text>
      </View>

      {/* Estadísticas: Con estilo Blur similar al perfil */}
      <View style={[styles.statsContainer, { borderBottomColor: borderColor }]}>
        <BlurView
          intensity={isDark ? 10 : 30}
          tint={isDark ? 'dark' : 'light'}
          style={styles.statsBlur}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{postToRender.reposts_count}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>REPOSTS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{postToRender.likes_count}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>ME GUSTA</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: borderColor }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textColor }]}>{postToRender.shares_count || 0}</Text>
            <Text style={[styles.statLabel, { color: subColor }]}>COMPARTIDOS</Text>
          </View>
        </BlurView>
      </View>

      {/* Botones de Acción Globales */}
      <View style={styles.actionsContainer}>
        <ActionIcon 
            name={postToRender.is_replied ? "chatbubble" : "chatbubble-outline"} 
            color={postToRender.is_replied ? (isDark ? '#3b82f6' : '#1d4ed8') : subColor} 
            onPress={() => setIsReplyModalVisible(true)} 
        />
        <ActionIcon 
            name={postToRender.is_reposted ? "repeat" : "repeat-outline"} 
            color={postToRender.is_reposted ? "#00BA7C" : subColor} 
            onPress={handleRepost} 
        />
        <ActionIcon 
            name={postToRender.is_liked ? "heart" : "heart-outline"} 
            color={postToRender.is_liked ? "#F91880" : subColor} 
            onPress={handleLike} 
        />
        <ActionIcon name="bookmark-outline" color={subColor} />
        <ActionIcon name="share-outline" color={subColor} onPress={handleShare} />
      </View>
 
      {/* Modal de Respuesta (Estilo Bottom Sheet) */}
      <Modal
        visible={isReplyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop para cerrar al tocar fuera */}
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setIsReplyModalVisible(false)} 
          />
          
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#121212' : '#fff' }]}>
            {/* Handle visual típico de bottom sheet */}
            <View style={styles.modalHandle} />

            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: borderColor, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setIsReplyModalVisible(false)}>
                <Text style={{ color: '#3b82f6', fontSize: 16 }}>Cancelar</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: textColor }}>Responder</Text>
              </View>
            </View>
            
            <View style={{ flex: 1 }}>
              <EditorDeTexto 
                value={replyContent} 
                onChange={setReplyContent}
                isDark={isDark}
                placeholder={`Responder a @${postToRender.user?.username || (postToRender as any).username}...`}
                onSearchMention={searchUsers}
                onSearchHashtag={getTrendingTopics}
                onPublish={handlePublishReply}
                appBar={false}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ActionIcon({ name, color, color2, inactive = false, onPress }: any) {
  return (
    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6} onPress={onPress}>
      <Ionicons name={name} size={24} color={inactive ? color2 : color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 20,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row'
  },
  nameRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 15,
  },
  moreBtn: {
    padding: 8,
  },
  body: {
    marginBottom: 16,
  },
  content: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '400',
  },
  mention: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  mediaContainer: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  media: {
    width: '100%',
    height: 300,
  },
  metaContainer: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateText: {
    fontSize: 15,
  },
  statsContainer: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statsBlur: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    alignSelf: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  actionBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});
