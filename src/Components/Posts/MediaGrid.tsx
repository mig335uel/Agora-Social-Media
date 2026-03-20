import React from 'react';
import { View, Image, StyleSheet, Dimensions, Pressable } from 'react-native';

interface MediaGridProps {
    media: { media_url: string | null }[];
}

const { width } = Dimensions.get('window');
const GRID_PADDING = 32; // Ajuste según el contenedor
const GRID_WIDTH = width - GRID_PADDING;

export default function MediaGrid({ media }: MediaGridProps) {
    if (!media || media.length === 0) return null;

    const renderImages = () => {
        const count = media.length;

        if (count === 1) {
            return (
                <Pressable style={styles.singleImageContainer}>
                    <Image source={{ uri: media[0].media_url! }} style={styles.image} resizeMode="cover" />
                </Pressable>
            );
        }

        if (count === 2) {
            return (
                <View style={styles.gridContainer}>
                    {media.map((item, index) => (
                        <Pressable key={index} style={styles.halfImage}>
                            <Image source={{ uri: item.media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                    ))}
                </View>
            );
        }

        if (count === 3) {
            return (
                <View style={styles.gridContainer}>
                    <Pressable style={styles.halfImage}>
                        <Image source={{ uri: media[0].media_url! }} style={styles.image} resizeMode="cover" />
                    </Pressable>
                    <View style={styles.columnContainer}>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[1].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[2].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                    </View>
                </View>
            );
        }

        if (count >= 4) {
            return (
                <View style={styles.gridContainer}>
                    <View style={styles.columnContainer}>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[0].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[1].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                    </View>
                    <View style={styles.columnContainer}>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[2].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
                        <Pressable style={styles.quarterImage}>
                            <Image source={{ uri: media[3].media_url! }} style={styles.image} resizeMode="cover" />
                        </Pressable>
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
