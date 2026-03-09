import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../../theme';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Splash'>;
};

export const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <MaterialCommunityIcons name="home-outline" size={48} color="#FFFFFF" />
        <Text style={styles.logoLabel}>Rentable</Text>
      </View>
      <Text style={styles.appName}>Rentany</Text>
      <Text style={styles.tagline}>Rent anything, from anyone.</Text>
      <ActivityIndicator animating color="#FFFFFF" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoLabel: {
    color: '#FFFFFF',
    fontSize: typography.tiny,
    marginTop: 2,
  },
  appName: {
    fontSize: typography.displayXL,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: typography.tabLabel,
    color: 'rgba(255,255,255,0.7)',
  },
  loader: {
    marginTop: 48,
  },
});
