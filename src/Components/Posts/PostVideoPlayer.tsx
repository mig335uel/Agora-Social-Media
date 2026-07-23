import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '@/Types/Posts';
import TikTokVideoModal from './TikTokVideoModal';

interface PostVideoPlayerProps {
  videoUrl: string;
  style?: any;
  post?: Post;
  isVisible?: boolean;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onReply?: (content: string, images: any[], postId: string) => Promise<void>;
  onOpenReplyModal?: () => void;
}

// ── Reproductor real, solo se monta cuando el post es visible ──────────────
function ActiveVideoPlayer({
  videoUrl,
  style,
  post,
  shouldPlay,
  onPressVideo,
  onPlayerReady,
  onLike,
  onRepost,
  onShare,
  onReply,
  onOpenReplyModal,
  isTikTokModalVisible,
  setIsTikTokModalVisible,
}: {
  videoUrl: string;
  style?: any;
  post?: Post;
  shouldPlay: boolean;
  onPressVideo: () => void;
  onPlayerReady: (ar: number) => void;
  onLike?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onReply?: (content: string, images: any[], postId: string) => Promise<void>;
  onOpenReplyModal?: () => void;
  isTikTokModalVisible: boolean;
  setIsTikTokModalVisible: (v: boolean) => void;
}) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const player = useVideoPlayer({ uri: videoUrl }, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
    p.preservesPitch = true;
    p.showNowPlayingNotification = false;
  });

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      player.replay();
    });
    return () => { sub.remove(); };
  }, [player]);

  useEffect(() => {
    if (shouldPlay) {
      player.play();
    } else {
      player.pause();
    }
  }, [shouldPlay, player]);

  useEffect(() => {
    const checkDimensions = () => {
      if (player.videoTrack) {
        const track = player.videoTrack as any;
        const w = track.width || track.size?.width;
        const h = track.height || track.size?.height;
        if (w && h && h > 0) {
          const ar = w / h;
          setAspectRatio(ar);
          onPlayerReady(ar);
        }
      }
    };
    checkDimensions();
    const sub = player.addListener('statusChange', checkDimensions);
    return () => { sub.remove(); };
  }, [player, onPlayerReady]);

  const isHorizontal = aspectRatio !== null && aspectRatio > 1.15;

  return (
    <>
      <TouchableOpacity
        activeOpacity={isHorizontal ? 1 : 0.9}
        onPress={onPressVideo}
        style={[
          styles.container,
          style,
          // Antes de conocer el AR, asumimos vertical (9:16) para vídeos sin track aún
          aspectRatio !== null
            ? {
                aspectRatio: isHorizontal
                  ? Math.min(2, Math.max(1.2, aspectRatio))
                  : Math.max(0.55, Math.min(1.0, aspectRatio)),
              }
            : { aspectRatio: 9 / 16 },
        ]}
      >
        <VideoView
          style={styles.video}
          player={player}
          allowsPictureInPicture={isHorizontal}
          nativeControls={isHorizontal}
          contentFit="cover"
        />
        {!isHorizontal && (
          <View style={styles.verticalOverlayBadge}>
            <Ionicons name="expand-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>Ver a pantalla completa</Text>
          </View>
        )}
      </TouchableOpacity>

      <TikTokVideoModal
        visible={isTikTokModalVisible}
        onClose={() => setIsTikTokModalVisible(false)}
        videoUrl={videoUrl}
        post={post}
        externalPlayer={player}
        externalAspectRatio={aspectRatio}
        onLike={onLike}
        onRepost={onRepost}
        onShare={onShare}
        onReply={onReply}
        onOpenReplyModal={onOpenReplyModal}
      />
    </>
  );
}

// ── Thumbnail placeholder que se muestra mientras el post no es visible ─────
function VideoThumbnail({
  style,
  onPress,
}: {
  style?: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, style, styles.thumbnailContainer]}
    >
      <View style={styles.playIconWrapper}>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.85)" />
      </View>
    </TouchableOpacity>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function PostVideoPlayer({
  videoUrl,
  style,
  post,
  isVisible = true,
  onLike,
  onRepost,
  onShare,
  onReply,
  onOpenReplyModal,
}: PostVideoPlayerProps) {
  const isFocused = useIsFocused();
  const [isTikTokModalVisible, setIsTikTokModalVisible] = useState(false);
  const [playerMounted, setPlayerMounted] = useState(false);
  const [savedAspectRatio, setSavedAspectRatio] = useState<number | null>(null);

  // Montar el reproductor en cuanto el post aparezca en pantalla (no desmontar para no perder estado)
  useEffect(() => {
    if (isVisible && !playerMounted) {
      setPlayerMounted(true);
    }
  }, [isVisible, playerMounted]);

  const shouldPlay = isVisible && isFocused && !isTikTokModalVisible;

  const isHorizontal = savedAspectRatio !== null && savedAspectRatio > 1.15;

  const handlePressVideo = () => {
    if (!isHorizontal) {
      setIsTikTokModalVisible(true);
    }
  };

  if (!playerMounted) {
    return <VideoThumbnail style={style} onPress={handlePressVideo} />;
  }

  return (
    <ActiveVideoPlayer
      videoUrl={videoUrl}
      style={style}
      post={post}
      shouldPlay={shouldPlay}
      onPressVideo={handlePressVideo}
      onPlayerReady={setSavedAspectRatio}
      onLike={onLike}
      onRepost={onRepost}
      onShare={onShare}
      onReply={onReply}
      onOpenReplyModal={onOpenReplyModal}
      isTikTokModalVisible={isTikTokModalVisible}
      setIsTikTokModalVisible={setIsTikTokModalVisible}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  thumbnailContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  verticalOverlayBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
});
