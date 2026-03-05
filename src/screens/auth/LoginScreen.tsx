import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Divider, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleIcon, FacebookIcon } from '../../components/SocialIcons';
import { useAuthStore } from '../../store/authStore';
import { getEmailError, getPasswordError } from '../../utils/validators';
import { colors } from '../../theme';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

export const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { login, loginWithGoogle, loginWithFacebook, isLoading, error, clearError } = useAuthStore();

  const emailError = emailTouched ? getEmailError(email) : undefined;
  const passwordError = passwordTouched ? getPasswordError(password) : undefined;

  const canSubmit = !getEmailError(email) && !getPasswordError(password);

  const handleSignIn = () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (canSubmit) {
      clearError();
      login(email, password);
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
            onPress={loginWithGoogle}
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
            onPress={loginWithFacebook}
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
            onChangeText={(t) => { setEmail(t); clearError(); }}
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
            onChangeText={(t) => { setPassword(t); clearError(); }}
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

          {/* Error from store */}
          {error && <HelperText type="error" style={styles.storeError}>{error}</HelperText>}

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
    fontSize: 10,
    marginTop: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.cardLight,
    marginBottom: 4,
    height: 48,
    fontSize: 14,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  footerLink: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
