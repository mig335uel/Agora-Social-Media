import useAuth from '@/hooks/useAuth';
import { signOut } from '@/Services/authService';
import { useState } from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Modal, Platform, ActionSheetIOS, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function UserAvatar() {
    const user = useAuth();
    const [isVisible, setIsVisible] = useState<boolean>(false);

    const handlePress = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancelar', 'Cerrar Sesión'],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) signOut();
                }
            );
        } else {
            // En Android solemos usar un Alert o un Modal custom
            Alert.alert("Opciones", "¿Qué quieres hacer?", [
                { text: "Cerrar Sesión", onPress: signOut, style: "destructive" },
                { text: "Cancelar", style: "cancel" }
            ]);
        }
    };

    if (user?.profile_picture_url !== null) {
        return (
            <>
                <TouchableOpacity onPress={handlePress}>
                    <Image source={{ uri: user?.profile_picture_url }} style={styles.avatar} />
                </TouchableOpacity>
            </>
        );
    }

    return (
        <>
            <TouchableOpacity onPress={handlePress} className='rounded-full overflow-hidden'>
                <Image source={{ uri: "https://cdn-icons-png.flaticon.com/512/149/149071.png" }} style={styles.avatar} />
            </TouchableOpacity>


        </>
    );



}


const styles = StyleSheet.create({
    avatar: {
        width: 30,
        height: 30,

    }
});
