import { Stack } from "expo-router";

export default function FollowingLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false, headerTitle: "Seguidos", headerTitleStyle: { fontWeight: "900", fontSize: 20, }, headerBackButtonDisplayMode: "default", }} />
        </Stack>
    );
}
