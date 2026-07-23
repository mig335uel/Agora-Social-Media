import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Image,
    Share,
    Animated,
    Dimensions,
    StatusBar,
    PanResponder,
    Easing,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView, VideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Post } from '@/Types/Posts';
import { recordInteractions } from '@/Services/InteractionService';
import { recordShare } from '@/Services/PostService';
import VerifiedBadge from '../verifiedBadge';

const { width: SW, height: SH } = Dimensions.get('window');

interface TikTokVideoModalProps {
    visible: boolean;
    onClose: () => void;
    videoUrl: string;
    post?: Post;
    /** Player ya inicializado del reproductor inline — evita re-descargar el vídeo */
    externalPlayer?: VideoPlayer;
    /** Aspect ratio ya detectado por el inline player */
    externalAspectRatio?: number | null;
    onLike?: (postId: string) => void;
    onRepost?: (postId: string) => void;
    onShare?: (postId: string) => void;
    onReply?: (content: string, images: any[], postId: string) => Promise<void>;
    onOpenReplyModal?: () => void;
}

const fmt = (n: number | undefined | null): string => {
    if (!n) return '0';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
    return n.toString();
};

export default function TikTokVideoModal({
    visible,
    onClose,
    videoUrl,
    post,
    externalPlayer,
    externalAspectRatio,
    onLike,
    onRepost,
    onShare,
    onReply,
    onOpenReplyModal,
}: TikTokVideoModalProps) {
    const insets = useSafeAreaInsets();
    // Dimensiones reactivas al girar el teléfono
    const { width: screenW, height: screenH } = useWindowDimensions();
    const [isPlaying, setIsPlaying] = useState(true);
    const [isLiked, setIsLiked] = useState(post?.is_liked || false);
    const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
    const [isReposted, setIsReposted] = useState(post?.is_reposted || false);
    const [repostsCount, setRepostsCount] = useState(post?.reposts_count || 0);
    const [showPlayIcon, setShowPlayIcon] = useState(false);

    // ── Orientación del vídeo ──────────────────────────────────────────────
    // Inicializamos con el aspect ratio ya conocido del inline player (evita flash de layout)
    const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(externalAspectRatio ?? null);
    const isLandscape = videoAspectRatio !== null && videoAspectRatio > 1.15;

    // Animaciones
    const playAnim = useRef(new Animated.Value(0)).current;
    const discAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(SH)).current;

    // Tracking dwell time
    const startTimeRef = useRef<number | null>(null);

    // Slide-in al abrir
    useEffect(() => {
        if (visible) {
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 65,
                friction: 11,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(SH);
        }
    }, [visible, slideAnim]);

    // Swipe down para cerrar
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => g.dy > 15 && Math.abs(g.dx) < 60,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) slideAnim.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 100 || g.vy > 0.8) {
                    Animated.timing(slideAnim, {
                        toValue: SH,
                        duration: 220,
                        useNativeDriver: true,
                    }).start(handleClose);
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        tension: 70,
                        friction: 10,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = () => {
        try { player.pause(); } catch (e) {}
        setIsPlaying(false);
        onClose();
    };

    // Sync post state
    useEffect(() => {
        if (post) {
            setIsLiked(post.is_liked || false);
            setLikesCount(post.likes_count || 0);
            setIsReposted(post.is_reposted || false);
            setRepostsCount(post.reposts_count || 0);
        }
    }, [post]);

    // Dwell time tracking
    useEffect(() => {
        if (visible) {
            startTimeRef.current = Date.now();
        } else {
            if (startTimeRef.current && post?.id) {
                const sec = Math.round((Date.now() - startTimeRef.current) / 1000);
                if (sec >= 1) {
                    recordInteractions([{ post_id: post.id, dwell_time_seconds: sec }]);
                }
                startTimeRef.current = null;
            }
        }
    }, [visible, post?.id]);

    // Player — reutilizamos el del reproductor inline si está disponible (ya tiene datos en buffer)
    const ownPlayer = useVideoPlayer(
        externalPlayer ? null : { uri: videoUrl },
        (p) => {
            p.loop = true;
            p.timeUpdateEventInterval = 0.1;
            p.preservesPitch = true;
            p.showNowPlayingNotification = false;
        }
    );
    const player = externalPlayer ?? ownPlayer;

    // Detectar orientación del vídeo
    useEffect(() => {
        const check = () => {
            if (player.videoTrack) {
                const t = player.videoTrack as any;
                const w = t.width || t.size?.width;
                const h = t.height || t.size?.height;
                if (w && h && h > 0) setVideoAspectRatio(w / h);
            }
        };
        check();
        const sub = player.addListener('statusChange', check);
        return () => { sub.remove(); };
    }, [player]);

    // Looping
    useEffect(() => {
        const sub = player.addListener('playToEnd', () => { player.replay(); });
        return () => { sub.remove(); };
    }, [player]);

    // Play / pause por visibilidad
    useEffect(() => {
        if (visible) {
            player.play();
            setIsPlaying(true);
        } else {
            player.pause();
            setIsPlaying(false);
        }
        return () => { try { player.pause(); } catch (e) {} };
    }, [visible, player]);

    // Animación disco
    useEffect(() => {
        if (visible && isPlaying) {
            Animated.loop(
                Animated.timing(discAnim, {
                    toValue: 1,
                    duration: 4500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            discAnim.stopAnimation();
        }
    }, [visible, isPlaying, discAnim]);

    const discSpin = discAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const togglePlayPause = () => {
        if (isPlaying) {
            player.pause();
            setIsPlaying(false);
            setShowPlayIcon(true);
            Animated.sequence([
                Animated.timing(playAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
                Animated.delay(380),
                Animated.timing(playAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
            ]).start(() => setShowPlayIcon(false));
        } else {
            player.play();
            setIsPlaying(true);
        }
    };

    const handleLikePress = () => {
        const next = !isLiked;
        setIsLiked(next);
        setLikesCount(p => (next ? p + 1 : Math.max(0, p - 1)));
        if (post?.id && onLike) onLike(post.id);
    };

    const handleRepostPress = () => {
        const next = !isReposted;
        setIsReposted(next);
        setRepostsCount(p => (next ? p + 1 : Math.max(0, p - 1)));
        if (post?.id && onRepost) onRepost(post.id);
    };

    const handleSharePress = async () => {
        if (!post) return;
        try {
            if (onShare) onShare(post.id); else await recordShare(post.id);
            await Share.share({
                message: `Mira esta publicación de @${post.user?.username || 'agora'}: ${post.content}`,
                url: videoUrl,
            });
        } catch (e) {}
    };

    const handleCommentPress = () => {
        if (onOpenReplyModal) { onOpenReplyModal(); }
        else if (post?.id) { handleClose(); router.push(`/post/${post.id}`); }
    };

    const handleUserProfilePress = () => {
        const uid = post?.user?.id || (post as any)?.user_id;
        if (uid) { handleClose(); router.push(`/perfil/${uid}`); }
    };

    const renderStyledText = (content?: string) => {
        if (!content) return null;
        const regex = /([@#][\wñáéíóú]+)/g;
        return content.split(regex).map((part, i) =>
            part.match(/^[@#]/) ? (
                <Text key={i} style={s.hashtag}>{part}</Text>
            ) : (
                <Text key={i} style={s.captionText}>{part}</Text>
            )
        );
    };

    if (!visible) return null;

    const user = post?.user || (post as any);

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={false}
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <StatusBar hidden />
            <View style={s.root}>
                <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]} {...panResponder.panHandlers}>

                    {/* ── Reproductor ── */}
                    <View style={[s.videoBg]}>
                        <TouchableWithoutFeedback onPress={togglePlayPause}>
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: screenW,
                                height: screenH,
                            }}>
                                <VideoView
                                    style={{ width: screenW, height: screenH }}
                                    player={player}
                                    contentFit="cover"
                                    allowsPictureInPicture={false}
                                    nativeControls={false}
                                />
                                {showPlayIcon && (
                                    <Animated.View style={[s.playOverlay, {
                                        opacity: playAnim,
                                        transform: [{ scale: playAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.15] }) }]
                                    }]}>
                                        <View style={s.playIconCircle}>
                                            <Ionicons name={isPlaying ? 'play' : 'pause'} size={52} color="#fff" />
                                        </View>
                                    </Animated.View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>


                    {/* ── Overlay inferior ── */}
                    {!isLandscape && (
                        <View
                            style={[s.bottomGradient, {
                                bottom: Math.max(insets.bottom + 16, 24),
                                paddingBottom: 0,
                            }]}
                            pointerEvents="box-none"
                        >
                            {/* Fila de pista de audio — estilo Reels pill */}
                            <TouchableOpacity style={s.audioPill} activeOpacity={0.75}>
                                <Animated.View style={[s.audioPillDisc, { transform: [{ rotate: discSpin }] }]}>
                                    <Ionicons name="musical-note" size={9} color="#fff" />
                                </Animated.View>
                                <Text style={s.audioPillText} numberOfLines={1}>
                                    Pista original · @{user?.username || 'agora'}
                                </Text>
                            </TouchableOpacity>

                            {/* Fila de usuario */}
                            <TouchableOpacity style={s.userRow} onPress={handleUserProfilePress} activeOpacity={0.85}>
                                {user?.profile_picture_url ? (
                                    <Image source={{ uri: user.profile_picture_url }} style={s.inlineAvatar} />
                                ) : (
                                    <View style={s.inlineAvatarPlaceholder}>
                                        <Ionicons name="person" size={14} color="#fff" />
                                    </View>
                                )}
                                <View style={s.userTextCol}>
                                    <View style={s.nameBadgeRow}>
                                        <Text style={s.displayName} numberOfLines={1}>
                                            {user?.display_name || user?.username || 'Agora'}
                                        </Text>
                                        {user?.is_verified && <VerifiedBadge width={14} height={14} />}
                                    </View>
                                    <Text style={s.handle} numberOfLines={1}>@{user?.username || 'agora'}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Descripción / caption */}
                            {post?.content ? (
                                <Text style={s.caption} numberOfLines={2}>
                                    {renderStyledText(post.content)}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* ── Gradiente inferior landscape ── */}
                    {isLandscape && (
                        <View style={[s.landscapeCaption, { bottom: Math.max(insets.bottom + 16, 20) }]}>
                            <TouchableOpacity style={s.userRow} onPress={handleUserProfilePress} activeOpacity={0.8}>
                                {user?.profile_picture_url ? (
                                    <Image source={{ uri: user.profile_picture_url }} style={s.inlineAvatar} />
                                ) : (
                                    <View style={s.inlineAvatarPlaceholder}>
                                        <Ionicons name="person" size={16} color="#fff" />
                                    </View>
                                )}
                                <Text style={s.displayName} numberOfLines={1}>
                                    {user?.display_name || user?.username || 'Agora'}
                                </Text>
                                {user?.is_verified && <VerifiedBadge width={15} height={15} />}
                                <Text style={s.handle}>@{user?.username || 'agora'}</Text>
                            </TouchableOpacity>
                            {post?.content ? (
                                <Text style={s.caption} numberOfLines={2}>{renderStyledText(post.content)}</Text>
                            ) : null}
                        </View>
                    )}

                    {/* ── Top bar ── */}
                    <View style={[s.topBar, { top: Math.max(insets.top + 8, 18) }]}>
                        <TouchableOpacity style={s.closeBtn} onPress={handleClose} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                            <Ionicons name="chevron-down" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={s.agoraBadge}>
                            <Ionicons name="flash-sharp" size={11} color="#60a5fa" style={{ marginRight: 4 }} />
                            <Text style={s.agoraBadgeText}>AGORA SHORTS</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* ── Columna lateral de acciones ── */}
                    {!isLandscape && (
                        <View style={[s.rightBar, { bottom: Math.max(insets.bottom + 16, 24) }]}>
                            {/* Avatar con anillo Agora */}
                            <TouchableOpacity style={s.avatarWrap} onPress={handleUserProfilePress} activeOpacity={0.8}>
                                {user?.profile_picture_url ? (
                                    <Image source={{ uri: user.profile_picture_url }} style={s.avatar} />
                                ) : (
                                    <View style={s.avatarPlaceholder}>
                                        <Ionicons name="person" size={22} color="#fff" />
                                    </View>
                                )}
                                <View style={s.followDot}>
                                    <Ionicons name="add" size={10} color="#fff" />
                                </View>
                            </TouchableOpacity>

                            {/* Like */}
                            <TouchableOpacity style={s.actionBtn} onPress={handleLikePress} activeOpacity={0.7}>
                                <Ionicons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={29}
                                    color={isLiked ? '#F91880' : '#fff'}
                                />
                                <Text style={s.actionLabel}>{fmt(likesCount)}</Text>
                            </TouchableOpacity>

                            {/* Comentarios */}
                            <TouchableOpacity style={s.actionBtn} onPress={handleCommentPress} activeOpacity={0.7}>
                                <Ionicons name="chatbubble-ellipses" size={27} color="#fff" />
                                <Text style={s.actionLabel}>{fmt(post?.replies_count)}</Text>
                            </TouchableOpacity>

                            {/* Repost */}
                            <TouchableOpacity style={s.actionBtn} onPress={handleRepostPress} activeOpacity={0.7}>
                                <Ionicons
                                    name={isReposted ? 'repeat' : 'repeat-outline'}
                                    size={27}
                                    color={isReposted ? '#00BA7C' : '#fff'}
                                />
                                <Text style={s.actionLabel}>{fmt(repostsCount)}</Text>
                            </TouchableOpacity>

                            {/* Compartir */}
                            <TouchableOpacity style={s.actionBtn} onPress={handleSharePress} activeOpacity={0.7}>
                                <Ionicons name="paper-plane-outline" size={25} color="#fff" />
                                <Text style={s.actionLabel}>Enviar</Text>
                            </TouchableOpacity>

                            {/* Disco giratorio */}
                            <Animated.View style={[s.disc, { marginTop: 8, transform: [{ rotate: discSpin }] }]}>
                                <Ionicons name="musical-note" size={13} color="#60a5fa" />
                            </Animated.View>
                        </View>
                    )}

                    {/* ── Botones landscape (bottom center) ── */}
                    {isLandscape && (
                        <View style={[s.landscapeActions, { bottom: Math.max(insets.bottom + 16, 20) }]}>
                            <TouchableOpacity style={s.lsBtn} onPress={handleLikePress}>
                                <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? '#F91880' : '#fff'} />
                                <Text style={s.lsLabel}>{fmt(likesCount)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.lsBtn} onPress={handleCommentPress}>
                                <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                                <Text style={s.lsLabel}>{fmt(post?.replies_count)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.lsBtn} onPress={handleRepostPress}>
                                <Ionicons name={isReposted ? 'repeat' : 'repeat-outline'} size={22} color={isReposted ? '#00BA7C' : '#fff'} />
                                <Text style={s.lsLabel}>{fmt(repostsCount)}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.lsBtn} onPress={handleSharePress}>
                                <Ionicons name="paper-plane-outline" size={22} color="#fff" />
                                <Text style={s.lsLabel}>Enviar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#000',
    },
    sheet: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
    videoWrapperPortrait: {
        ...StyleSheet.absoluteFillObject,
    },
    videoWrapperLandscape: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // ── Top bar
    topBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        zIndex: 100,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    agoraBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(96,165,250,0.35)',
    },
    agoraBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
    },
    // ── Right action bar
    rightBar: {
        position: 'absolute',
        right: 12,
        alignItems: 'center',
        zIndex: 90,
        gap: 4,
    },
    avatarWrap: {
        alignItems: 'center',
        marginBottom: 20,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2.5,
        borderColor: '#3b82f6',
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2.5,
        borderColor: '#3b82f6',
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    followDot: {
        position: 'absolute',
        bottom: -5,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#000',
    },
    divider: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginVertical: 8,
    },
    actionBtn: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    actionLabel: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        marginTop: 3,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    disc: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#0f172a',
        borderWidth: 2,
        borderColor: 'rgba(96,165,250,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    // ── Bottom overlay
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 72,
        paddingHorizontal: 14,
        paddingTop: 0,
        zIndex: 80,
    },
    // Pista de audio — pill estilo Reels
    audioPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 12,
        gap: 6,
        maxWidth: '90%',
    },
    audioPillDisc: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: 'rgba(96,165,250,0.25)',
        borderWidth: 1,
        borderColor: 'rgba(96,165,250,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioPillText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    // Fila usuario
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 8,
    },
    userTextCol: {
        flex: 1,
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    inlineAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: '#3b82f6',
    },
    inlineAvatarPlaceholder: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
        borderColor: '#3b82f6',
        backgroundColor: '#1e3a5f',
        justifyContent: 'center',
        alignItems: 'center',
    },
    displayName: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    handle: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    caption: {
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 6,
    },
    captionText: {
        color: 'rgba(255,255,255,0.88)',
    },
    hashtag: {
        color: '#60a5fa',
        fontWeight: '700',
    },
    // Deprecated audio row (kept for landscape)
    audioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    miniDisc: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#0f172a',
        borderWidth: 1.5,
        borderColor: 'rgba(96,165,250,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    // ── Landscape layout
    landscapeCaption: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 80,
    },
    landscapeActions: {
        position: 'absolute',
        right: 20,
        flexDirection: 'column',
        zIndex: 90,
        alignItems: 'center',
        gap: 8,
    },
    lsBtn: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
        minWidth: 52,
    },
    lsLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        marginTop: 3,
    },
});
