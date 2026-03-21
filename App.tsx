import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import * as WebBrowser from 'expo-web-browser';
import { lightTheme } from './src/theme';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Toast } from './src/components/common/Toast';

WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function useWebAutofillFix() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.textContent = `
      input:-webkit-autofill,
      input:-webkit-autofill:hover,
      input:-webkit-autofill:focus,
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px white inset !important;
        box-shadow: 0 0 0 30px white inset !important;
        -webkit-text-fill-color: #111827 !important;
      }
      input {
        font-size: 14px !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }
      input::placeholder {
        font-size: 14px !important;
        color: #9CA3AF !important;
      }
      input:focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
}

export default function App() {
  useWebAutofillFix();

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env</Text>
      </View>
    );
  }

  const content = (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={Platform.OS === 'web' ? undefined : tokenCache}
    >
      <SafeAreaProvider>
        <PaperProvider theme={lightTheme}>
          <StatusBar style="auto" />
          <AppNavigator />
          <Toast />
        </PaperProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrapper}>
        <View style={styles.webContainer}>{content}</View>
      </View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  webContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    overflow: 'hidden',
  },
});
