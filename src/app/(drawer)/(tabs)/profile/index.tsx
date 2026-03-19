import { SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet, Text} from "react-native";
import AppBar from "@/Components/AppBar";
import useAuth from "@/hooks/useAuth";

export default function Profile() {
    return (
        <View>
            <Text >UserScreeen</Text>
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'red',
    }
});