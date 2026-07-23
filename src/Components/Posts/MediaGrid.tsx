import { media_feature, Post } from '@/Types/Posts';
import React from 'react';
import { View, Image, StyleSheet, Dimensions, Pressable } from 'react-native';
import PostVideoPlayer from './PostVideoPlayer';

interface MediaGridProps {
    media: media_feature[];
    onImagePress?: (index: number) => void;
    post?: Post;
    isVisible?: boolean;
    onLike?: (postId: string) => void;
    onRepost?: (postId: string) => void;
    onShare?: (postId: string) => void;
    onReply?: (content: string, images: any[], postId: string) => Promise<void>;
    onOpenReplyModal?: () => void;
}

const { width } = Dimensions.get('window');

const IS_VIDEO_REGEX = /\.(mp4|mov|m4v|webm|m3u8)(\?.*)?$/i;
function isVideoUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return IS_VIDEO_REGEX.test(url) || url.includes('/video/') || url.includes('.mp4');
}

export default function MediaGrid({
    media,
    onImagePress,
    post,
    isVisible = true,
    onLike,
    onRepost,
    onShare,
    onReply,
    onOpenReplyModal,
}: MediaGridProps) {
    if (!media || media.length === 0) return null;

    const renderItem = (item: media_feature, index: number, containerStyle: any) => {
        const itemUrl = item.image;
        if (!itemUrl) return null;

        if (isVideoUrl(itemUrl)) {
            return (
                <View key={index} style={containerStyle}>
                    <PostVideoPlayer
                        videoUrl={itemUrl}
                        style={styles.image}
                        post={post}
                        isVisible={isVisible}
                        onLike={onLike}
                        onRepost={onRepost}
                        onShare={onShare}
                        onReply={onReply}
                        onOpenReplyModal={onOpenReplyModal}
                    />
                </View>
            );
        }

        return (
            <Pressable key={index} onPress={() => onImagePress?.(index)} style={containerStyle}>
                <Image source={{ uri: itemUrl }} style={styles.image} resizeMode="cover" />
            </Pressable>
        );
    };

    const renderImages = () => {
        const count = media.length;

        if (count === 1) {
            return renderItem(media[0], 0, styles.singleImageContainer);
        }

        if (count === 2) {
            return (
                <View style={styles.gridContainer}>
                    {renderItem(media[0], 0, styles.halfImage)}
                    {renderItem(media[1], 1, styles.halfImage)}
                </View>
            );
        }

        if (count === 3) {
            return (
                <View style={styles.gridContainer}>
                    {renderItem(media[0], 0, styles.halfImage)}
                    <View style={styles.columnContainer}>
                        {renderItem(media[1], 1, styles.quarterImage)}
                        {renderItem(media[2], 2, styles.quarterImage)}
                    </View>
                </View>
            );
        }

        if (count >= 4) {
            return (
                <View style={styles.gridContainer}>
                    <View style={styles.columnContainer}>
                        {renderItem(media[0], 0, styles.quarterImage)}
                        {renderItem(media[1], 1, styles.quarterImage)}
                    </View>
                    <View style={styles.columnContainer}>
                        {renderItem(media[2], 2, styles.quarterImage)}
                        {renderItem(media[3], 3, styles.quarterImage)}
                    </View>
                </View>
            );
        }

        return null;
    };

    return <View style={styles.container}>{renderImages()}</View>;
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginVertical: 10,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(128,128,128,0.2)',
    },
    singleImageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
    },
    gridContainer: {
        flexDirection: 'row',
        width: '100%',
        aspectRatio: 16 / 9,
        gap: 2,
    },
    columnContainer: {
        flex: 1,
        gap: 2,
    },
    halfImage: {
        flex: 1,
        height: '100%',
    },
    quarterImage: {
        flex: 1,
        width: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
