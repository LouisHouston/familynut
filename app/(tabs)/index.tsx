import React from 'react';
import { View, Image, StyleSheet, Button, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import ParallaxScrollView from '@/components/ParallaxScrollView';

export default function HomeScreen() {
  const router = useRouter(); 

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#000', dark: '#000' }} headerImage={undefined}>
      <View style={styles.container}>
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
        <Text style={styles.welcomeText}>Welcome!</Text>
      </View>

      <View style={styles.spacer} />

      {/* Buttons at the Bottom */}
      <View style={styles.buttonContainer}>
        {/* Register Button */}
        <TouchableOpacity
          style={styles.buttonWrapper}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity style={styles.buttonWrapper} onPress={() => router.push('/login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 20,
  },
  reactLogo: {
    width: 100,
    height: 100,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingBottom: 40,
    backgroundColor: '#000',
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: '#444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
