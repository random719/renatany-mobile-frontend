import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Divider, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSignIn, useSignUp } from '@clerk/expo/legacy';
import { GoogleIcon, FacebookIcon } from '../../components/SocialIcons';
import { getEmailError, getPasswordError } from '../../utils/validators';
import { colors, typography } from '../../theme';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen = ({ navigation }: Props) => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);

  const emailError = emailTouched ? getEmailError(email) : undefined;
  const passwordError = passwordTouched ? getPasswordError(password) : undefined;

  const canSubmit = !getEmailError(email) && !getPasswordError(password);

  const handleSignIn = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!canSubmit || !isLoaded) return;

    setIsLoading(true);
    setClerkError(null);
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });

      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
        // The AppNavigator will automatically switch to Main stack because of Clerk's SignedIn component or due to our token syncing later.
      } else {
        console.log(JSON.stringify(completeSignIn, null, 2));
      }
    } catch (err: any) {
      setClerkError(err.errors?.[0]?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !isSignUpLoaded) return;
    setIsLoading(true);
    setClerkError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ path: 'oauth-native-callback' });
      await signIn.create({ strategy: 'oauth_google', redirectUrl });

      const verificationUrl = signIn.firstFactorVerification?.externalVerificationRedirectURL?.toString();
      if (!verificationUrl) {
        setClerkError('Google sign in could not be started');
        return;
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(verificationUrl, redirectUrl);
      if (authSessionResult.type !== 'success' || !authSessionResult.url) {
        if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
          setClerkError('Google sign in was cancelled');
        } else {
          setClerkError('Google sign in could not be completed');
        }
        return;
      }

      const params = new URL(authSessionResult.url).searchParams;
      const rotatingTokenNonce = params.get('rotating_token_nonce') || '';
      await signIn.reload({ rotatingTokenNonce });

      if (signIn.status === 'complete' && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        return;
      }

      if (signIn.firstFactorVerification?.status === 'transferable') {
        await signUp.create({ transfer: true });
        if (signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
          return;
        }
      }

      setClerkError('Google sign in could not be completed');
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || 'Google sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    if (!isLoaded || !isSignUpLoaded) return;
    setIsLoading(true);
    setClerkError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ path: 'oauth-native-callback' });
      await signIn.create({ strategy: 'oauth_facebook', redirectUrl });

      const verificationUrl = signIn.firstFactorVerification?.externalVerificationRedirectURL?.toString();
      if (!verificationUrl) {
        setClerkError('Facebook sign in could not be started');
        return;
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(verificationUrl, redirectUrl);
      if (authSessionResult.type !== 'success' || !authSessionResult.url) {
        if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
          setClerkError('Facebook sign in was cancelled');
        } else {
          setClerkError('Facebook sign in could not be completed');
        }
        return;
      }

      const params = new URL(authSessionResult.url).searchParams;
      const rotatingTokenNonce = params.get('rotating_token_nonce') || '';
      await signIn.reload({ rotatingTokenNonce });

      if (signIn.status === 'complete' && signIn.createdSessionId) {
        await setActive({ session: signIn.createdSessionId });
        return;
      }

      if (signIn.firstFactorVerification?.status === 'transferable') {
        await signUp.create({ transfer: true });
        if (signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
          return;
        }
      }

      setClerkError('Facebook sign in could not be completed');
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || 'Facebook sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="home-outline" size={32} color="#FFFFFF" />
              <Text style={styles.logoText}>Rentable</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome to Rentany</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Social Buttons */}
          <Button
            mode="outlined"
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={styles.socialButton}
            contentStyle={styles.socialButtonContent}
            labelStyle={styles.socialButtonLabel}
            icon={() => <GoogleIcon size={20} />}
          >
            Continue with Google
          </Button>

          <Button
            mode="outlined"
            onPress={handleFacebookSignIn}
            disabled={isLoading}
            style={styles.socialButton}
            contentStyle={styles.socialButtonContent}
            labelStyle={styles.socialButtonLabel}
            icon={() => <FacebookIcon size={20} />}
          >
            Continue with Facebook
          </Button>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <Divider style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <Divider style={styles.dividerLine} />
          </View>

          {/* Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            mode="outlined"
            dense
            value={email}
            onChangeText={(t) => { setEmail(t); setClerkError(null); }}
            onBlur={() => setEmailTouched(true)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" size={20} />}
            error={!!emailError}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            disabled={isLoading}
          />
          {emailError && <HelperText type="error">{emailError}</HelperText>}

          {/* Password */}
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            mode="outlined"
            dense
            value={password}
            onChangeText={(t) => { setPassword(t); setClerkError(null); }}
            onBlur={() => setPasswordTouched(true)}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" size={20} />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            error={!!passwordError}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            disabled={isLoading}
          />
          {passwordError && <HelperText type="error">{passwordError}</HelperText>}

          {/* Error from Clerk */}
          {clerkError && <HelperText type="error" style={styles.storeError}>{clerkError}</HelperText>}

          {/* Sign In Button */}
          <Button
            mode="contained"
            onPress={handleSignIn}
            loading={isLoading}
            disabled={isLoading}
            style={styles.signInButton}
            contentStyle={styles.signInButtonContent}
            labelStyle={styles.signInButtonLabel}
            buttonColor={colors.primary}
          >
            Sign in
          </Button>

          {/* Footer Links */}
          <View style={styles.footerRow}>
            <Button
              mode="text"
              onPress={() => navigation.navigate('ForgotPassword')}
              labelStyle={styles.footerLink}
              compact
            >
              Forgot password?
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate('Register')}
              labelStyle={styles.footerLink}
              compact
            >
              Need an account? Sign up
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: typography.micro,
    marginTop: 2,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: 24,
  },
  socialButton: {
    marginBottom: 12,
    borderColor: colors.border,
    borderRadius: 8,
  },
  socialButtonContent: {
    height: 48,
  },
  socialButtonLabel: {
    color: colors.textPrimary,
    fontSize: typography.body,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
    fontSize: typography.small,
  },
  inputLabel: {
    fontSize: typography.body,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.cardLight,
    marginBottom: 4,
    height: 48,
    fontSize: typography.body,
  },
  inputContent: {
    paddingLeft: 0,
  },
  inputOutline: {
    borderRadius: 8,
    borderColor: colors.border,
    borderWidth: 1,
  },
  storeError: {
    textAlign: 'center',
    marginTop: 4,
  },
  signInButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  signInButtonContent: {
    height: 48,
  },
  signInButtonLabel: {
    fontSize: typography.tabLabel,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerLink: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
});
