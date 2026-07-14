import { Usuario } from "@/Types/Users";
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, ActionSheetIOS, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@/Services/authService";
import { router } from "expo-router";
import { useState } from "react";
import ReportModal from "@/Components/ReportModal";
import { GlassView } from "expo-glass-effect";


export default function ProfileAppBar({ user, isMe = true }: { user?: Usuario, isMe?: boolean }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [reportVisible, setReportVisible] = useState(false);

    const handleLogout = () => {
        signOut();
    }

    const handleBack = () => {
        router.back();
    }

    const handleSetting = () => {
        router.push('/(drawer)/settings');
    }

    const handleOptions = () => {
        if (!user?.id) return;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Reportar usuario', 'Cancelar'],
                    cancelButtonIndex: 1,
                },
                (buttonIndex) => {
                    if (buttonIndex === 0) setReportVisible(true);
                }
            );
        } else {
            Alert.alert('Opciones', '¿Qué deseas hacer?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Reportar usuario', onPress: () => setReportVisible(true) },
            ]);
        }
    };

    return (
        <>
            <View className="flex-row justify-between items-center px-6 py-4 bg-transparent mt-2">
                {Platform.OS === 'ios' ? (
                    <TouchableOpacity

                        onPress={isMe ? handleSetting : handleBack}
                    >
                        <GlassView
                            isInteractive={true}
                            glassEffectStyle="regular"
                            style={{ borderRadius: 9999999, padding: 12 }}
                            className="rounded-full">

                            <Ionicons
                                name={isMe ? "settings-outline" : "chevron-back"}
                                size={20}
                                color={isDark ? '#fff' : '#000'}
                            />
                        </GlassView>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                        onPress={isMe ? handleSetting : handleBack}
                    >
                        <Ionicons
                            name={isMe ? "settings-outline" : "chevron-back"}
                            size={20}
                            color={isDark ? '#fff' : '#000'}
                        />
                    </TouchableOpacity>
                )}

                <Text className="text-lg font-black tracking-tighter text-black dark:text-white uppercase">
                    {user?.username || 'perfil'}
                </Text>

                {isMe ? (
                    Platform.OS === 'ios' ? (
                        <TouchableOpacity

                            onPress={handleLogout}
                        >
                            <GlassView
                                isInteractive={true}
                                glassEffectStyle="regular"
                                style={{ borderRadius: 9999999, padding: 12 }}
                                className="rounded-full">

                                <Ionicons
                                    name={"log-out-outline"}
                                    size={20}
                                    color={isDark ? '#fff' : '#000'}
                                />
                            </GlassView>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                            onPress={handleLogout}
                        >
                            <Ionicons
                                name={"log-out-outline"}
                                size={20}
                                color={isDark ? '#fff' : '#000'}
                            />
                        </TouchableOpacity>
                    )
                ) : (
                    Platform.OS === 'ios' ? (
                        <TouchableOpacity

                            onPress={handleOptions}
                        >
                            <GlassView
                                isInteractive={true}
                                glassEffectStyle="regular"
                                style={{ borderRadius: 9999999, padding: 12 }}
                                className="rounded-full">

                                <Ionicons
                                    name={"ellipsis-horizontal"}
                                    size={20}
                                    color={isDark ? '#fff' : '#000'}
                                />
                            </GlassView>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
                            onPress={handleOptions}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="ellipsis-horizontal" size={20} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                    ))}
            </View>

            {/* Modal de reporte de usuario */}
            {user?.id && (
                <ReportModal
                    visible={reportVisible}
                    context="user"
                    targetId={user.id}
                    onClose={() => setReportVisible(false)}
                />
            )}
        </>
    );
}


const styles = StyleSheet.create({
    TitleText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});