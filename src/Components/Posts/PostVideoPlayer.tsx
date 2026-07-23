import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';

interface PostVideoPlayerProps {
  videoUrl: string;
  style?: any;
}

export default function PostVideoPlayer({ videoUrl, style }: PostVideoPlayerProps) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
  });

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={styles.video}
        player={player}
        allowsPictureInPicture
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
