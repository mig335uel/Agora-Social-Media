import { Stack } from "expo-router";



export default function EditarLayout() {
    return (
        <Stack>
            <Stack.Screen name="[id]" options={{ title: "Editar Perfil", headerShown: false }} />
        </Stack>
    );
}