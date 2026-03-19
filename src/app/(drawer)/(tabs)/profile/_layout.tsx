import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";
import AppBar from "@/Components/AppBar";
import useAuth from "@/hooks/useAuth";
import { MaterialTopTabs } from "@/Components/TopBar/materialtopbars";

export default function ProfileLayout() {


    const user = useAuth();
    return (
        <SafeAreaView>
            <AppBar title="Perfil" />
            <MaterialTopTabs>
                <MaterialTopTabs.Screen name="index" />
            </MaterialTopTabs>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'red',
    }
});