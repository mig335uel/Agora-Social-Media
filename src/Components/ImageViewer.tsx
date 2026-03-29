import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Modal,
    Dimensions,
    FlatList,
    Platform,
    StatusBar,
    Animated,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Post, media_feature } from '@/Types/Posts';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface ImageViewerProps {
    post?: Post;
    media: media_feature[];
    isVisible: boolean;
    initialIndex: number;
    onClose: () => void;
    onLike?: (postId: string) => void;
    onRepost?: (postId: string) => void;
    onShare?: (postId: string) => void;
    onReply?: (postId: string) => void;
}

// ─── Utilidad: formatea números grandes ────────────────────
const formatCount = (n: number | undefined | null): string => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
};

export default function ImageViewer({
    post,
    media,
    isVisible,
    initialIndex,
    onClose,
    onLike,
    onRepost,
    onShare,
    onReply
}: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef<FlatList>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (isVisible && initialIndex !== currentIndex) {
            setCurrentIndex(initialIndex);
            // Pequeño delay para asegurar que FlatList esté listo
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({
                    index: initialIndex,
                    animated: false,
                });
            }, 50);
        }
    }, [isVisible, initialIndex]);

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: false }
    );

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item }: { item: media_feature }) => (
        <View style={styles.imageContainer}>
            <Image
                source={{ uri: item.image! }}
                style={styles.fullImage}
                resizeMode="contain"
            />
        </View>
    );

    if (!isVisible) return null;

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                
                {/* Background Blur or Black */}
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

                {/* Main Content: FlatList for swiping */}
                <FlatList
                    ref={flatListRef}
                    data={media}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                />

                {/* Top Header Overlay */}
                <SafeAreaView style={styles.topHeader} edges={['top']}>
                    <TouchableOpacity 
                        style={styles.closeButton} 
                        onPress={onClose}
                    >
                        <BlurView intensity={20} style={styles.blurButton}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </BlurView>
                    </TouchableOpacity>
                    
                    {media.length > 1 && (
                        <View style={styles.indexBadge}>
                            <BlurView intensity={20} style={[styles.blurButton, { paddingHorizontal: 12 }]}>
                                <Text style={styles.indexText}>
                                    {currentIndex + 1} / {media.length}
                                </Text>
                            </BlurView>
                        </View>
                    )}
                </SafeAreaView>

                {/* Bottom Interaction Overlay */}
                {post && (
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
                        style={styles.bottomOverlay}
                    >
                        <SafeAreaView edges={['bottom']}>
                            <View style={styles.overlayContent}>
                                {/* Post Content (Brief) */}
                                {post.content && (
                                    <Text style={styles.postContent} numberOfLines={3}>
                                        {post.content}
                                    </Text>
                                )}

                                <View style={styles.divider} />

                                {/* Action Buttons */}
                                <View style={styles.actionsRow}>
                                    <ActionButton
                                        iconName={post.is_replied ? "chatbubble" : "chatbubble-outline"}
                                        count={post.replies_count}
                                        color={post.is_replied ? '#3b82f6' : '#fff'}
                                        onPress={() => onReply?.(post.id)}
                                    />
                                    <ActionButton
                                        iconName={post.is_reposted ? "repeat" : "repeat-outline"}
                                        count={post.reposts_count}
                                        color={post.is_reposted ? "#00BA7C" : '#fff'}
                                        onPress={() => onRepost?.(post.id)}
                                    />
                                    <ActionButton
                                        iconName={post.is_liked ? "heart" : "heart-outline"}
                                        count={post.likes_count}
                                        color={post.is_liked ? "#F91880" : '#fff'}
                                        onPress={() => onLike?.(post.id)}
                                    />
                                    <ActionButton
                                        iconName="arrow-redo-outline"
                                        count={post.shares_count}
                                        color="#fff"
                                        onPress={() => onShare?.(post.id)}
                                    />
                                </View>
                            </View>
                        </SafeAreaView>
                    </LinearGradient>
                )}
            </View>
        </Modal>
    );
}

function ActionButton({ 
    iconName, 
    count, 
    color, 
    onPress 
}: { 
    iconName: keyof typeof Ionicons.glyphMap; 
    count: number | undefined; 
    color: string;
    onPress?: () => void 
}) {
    return (
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6} onPress={onPress}>
            <Ionicons name={iconName} size={22} color={color} />
            <Text style={[styles.actionCount, { color }]}>{formatCount(count)}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    imageContainer: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height,
    },
    topHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        zIndex: 10,
    },
    closeButton: {
        borderRadius: 25,
        overflow: 'hidden',
    },
    blurButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    indexBadge: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    indexText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    },
    overlayContent: {
        paddingHorizontal: 20,
    },
    postContent: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 16,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    actionCount: {
        fontSize: 14,
        fontWeight: '600',
    },
});

