import { useAuth } from "@/scripts/AuthProvider";
import { useRouter } from "expo-router";
import { View, Text, Button, StyleSheet } from "react-native";

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        {user ? `Welcome, ${user.email}` : "Welcome!"}
      </Text>

      {user ? (
        <Button title="Logout" onPress={logout} />
      ) : (
        <Button title="Go to Login" onPress={() => router.push("/login")} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" },
  welcomeText: { color: "#fff", fontSize: 20, marginBottom: 20 },
});