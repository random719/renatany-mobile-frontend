import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSignUp } from '@clerk/expo/legacy';
import { getEmailError, getPasswordError, getConfirmPasswordError } from '../../utils/validators';
import { colors, typography } from '../../theme';
import { useI18n } from '../../i18n';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

export const RegisterScreen = ({ navigation }: Props) => {
  const { t } = useI18n();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  
  const [isLoading, setIsLoading] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);
  
  // Pending verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const emailError = touched.email ? getEmailError(email) : undefined;
  const passwordError = touched.password ? getPasswordError(password) : undefined;
  const confirmError = touched.confirm ? getConfirmPasswordError(password, confirmPassword) : undefined;

  const canSubmit =
    !getEmailError(email) && !getPasswordError(password) && !getConfirmPasswordError(password, confirmPassword);

  const handleRegister = async () => {
    setTouched({ email: true, password: true, confirm: true });
    if (!canSubmit || !isLoaded) return;

    setIsLoading(true);
    setClerkError(null);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send the email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      
      setPendingVerification(true);
    } catch (err: any) {
      setClerkError(err.errors?.[0]?.message || t('auth.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    setIsLoading(true);
    setClerkError(null);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        // Navigation auto handled by AppNavigator observing clerk state
      } else {
        console.log(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      setClerkError(err.errors?.[0]?.message || t('auth.verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={[styles.container, { justifyContent: 'center', padding: 24 }]}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('auth.verifyEmail')}</Text>
          <Text style={{ marginBottom: 20, textAlign: 'center', color: colors.textSecondary }}>
            {t('auth.verificationCodeSentTo', { email })}
          </Text>
          <TextInput
            mode="outlined"
            value={code}
            onChangeText={(t) => { setCode(t); setClerkError(null); }}
            placeholder={t('auth.verificationCode')}
            style={styles.input}
            disabled={isLoading}
          />
          {clerkError && <HelperText type="error" style={styles.storeError}>{clerkError}</HelperText>}
          <Button
            mode="contained"
            onPress={onPressVerify}
            loading={isLoading}
            disabled={isLoading || !code}
            style={styles.submitButton}
            buttonColor={colors.primary}
          >
            {t('auth.verify')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Back link */}
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => navigation.navigate('Login')}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textSecondary} />
            <Text style={styles.backText}>{t('auth.backToSignIn')}</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>{t('auth.createAccount')}</Text>

          {/* Email */}
          <Text style={styles.inputLabel}>{t('auth.email')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={email}
            onChangeText={(t) => { setEmail(t); setClerkError(null); }}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            placeholder={t('auth.emailPlaceholder')}
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
          <Text style={styles.inputLabel}>{t('auth.password')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={password}
            onChangeText={(t) => { setPassword(t); setClerkError(null); }}
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            placeholder={t('auth.passwordMinPlaceholder')}
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

          {/* Confirm Password */}
          <Text style={styles.inputLabel}>{t('auth.confirmPassword')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setClerkError(null); }}
            onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
            placeholder={t('auth.passwordConfirmPlaceholder')}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" size={20} />}
            error={!!confirmError}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            disabled={isLoading}
          />
          {confirmError && <HelperText type="error">{confirmError}</HelperText>}

          {clerkError && <HelperText type="error" style={styles.storeError}>{clerkError}</HelperText>}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
            buttonColor={colors.primary}
          >
            {t('auth.continue')}
          </Button>
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
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
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  submitButtonContent: {
    height: 48,
  },
  submitButtonLabel: {
    fontSize: typography.tabLabel,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
