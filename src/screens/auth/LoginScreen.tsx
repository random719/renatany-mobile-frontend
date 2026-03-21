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
import { useI18n } from '../../i18n';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

type VerificationStrategy = 'none' | 'email_code' | 'totp' | 'backup_code';

export const LoginScreen = ({ navigation }: Props) => {
  const { t } = useI18n();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clerkError, setClerkError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationStrategy, setVerificationStrategy] = useState<VerificationStrategy>('none');
  const [verificationHint, setVerificationHint] = useState<string | null>(null);
  const [canUseBackupCode, setCanUseBackupCode] = useState(false);
  const [canUseAuthenticatorCode, setCanUseAuthenticatorCode] = useState(false);

  const emailError = emailTouched ? getEmailError(email) : undefined;
  const passwordError = passwordTouched ? getPasswordError(password) : undefined;

  const canSubmit = !getEmailError(email) && !getPasswordError(password);

  const resetVerificationState = () => {
    setVerificationCode('');
    setVerificationStrategy('none');
    setVerificationHint(null);
    setCanUseBackupCode(false);
    setCanUseAuthenticatorCode(false);
  };

  const updateEmail = (value: string) => {
    setEmail(value);
    setClerkError(null);
    resetVerificationState();
  };

  const updatePassword = (value: string) => {
    setPassword(value);
    setClerkError(null);
    resetVerificationState();
  };

  const getIncompleteSignInMessage = (status: string | null) => {
    switch (status) {
      case 'needs_first_factor':
        return 'Sign-in needs a first-factor verification step. Please retry your password login.';
      case 'needs_second_factor':
        return 'This account requires two-factor authentication to finish signing in.';
      case 'needs_new_password':
        return 'This account must reset its password before signing in.';
      case 'needs_identifier':
        return 'Sign-in could not determine your login identifier. Please re-enter your email.';
      case 'needs_client_trust':
        return 'This browser needs additional verification before sign-in can complete.';
      default:
        return 'Sign-in could not be completed. Please try again.';
    }
  };

  const getVerificationPrompt = (strategy: VerificationStrategy, hint: string | null) => {
    if (hint) return hint;

    switch (strategy) {
      case 'email_code':
        return 'Enter the verification code sent to your email to finish signing in.';
      case 'totp':
        return 'Enter the code from your authenticator app to finish signing in.';
      case 'backup_code':
        return 'Enter one of your backup codes to finish signing in.';
      default:
        return '';
    }
  };

  const activateSession = async (sessionId: string | null | undefined) => {
    if (!sessionId) {
      setClerkError('Sign-in completed, but no session was returned.');
      return;
    }

    await setActive({ session: sessionId });
  };

  const beginSecondFactorFlow = async (attempt: any) => {
    const supportedSecondFactors = attempt?.supportedSecondFactors ?? signIn.supportedSecondFactors ?? [];
    const hasBackupCode = supportedSecondFactors.some((factor: any) => factor?.strategy === 'backup_code');
    const hasTotp = supportedSecondFactors.some((factor: any) => factor?.strategy === 'totp');
    const emailCodeFactor = supportedSecondFactors.find((factor: any) => factor?.strategy === 'email_code');
    const totpFactor = supportedSecondFactors.find((factor: any) => factor?.strategy === 'totp');
    const backupCodeFactor = supportedSecondFactors.find((factor: any) => factor?.strategy === 'backup_code');

    setCanUseBackupCode(hasBackupCode);
    setCanUseAuthenticatorCode(hasTotp);
    setVerificationCode('');
    setClerkError(null);

    if (emailCodeFactor) {
      await signIn.prepareSecondFactor({ strategy: 'email_code' } as any);
      setVerificationStrategy('email_code');
      setVerificationHint(
        emailCodeFactor?.safeIdentifier
          ? `We sent a verification code to ${emailCodeFactor.safeIdentifier}.`
          : 'We sent a verification code to your email.',
      );
      return;
    }

    if (totpFactor) {
      setVerificationStrategy('totp');
      setVerificationHint('Enter the code from your authenticator app to finish signing in.');
      return;
    }

    if (backupCodeFactor) {
      setVerificationStrategy('backup_code');
      setVerificationHint('Enter one of your backup codes to finish signing in.');
      return;
    }

    setClerkError(
      'This sign-in needs a second verification method that this screen does not support yet.',
    );
  };

  const handleSecondFactorVerification = async () => {
    if (!isLoaded || verificationStrategy === 'none') return;
    if (!verificationCode.trim()) {
      setClerkError('Verification code is required.');
      return;
    }

    setIsLoading(true);
    setClerkError(null);

    try {
      const attempt = await signIn.attemptSecondFactor({
        strategy: verificationStrategy,
        code: verificationCode.trim(),
      } as any);

      if (attempt.status === 'complete') {
        await activateSession(attempt.createdSessionId);
        return;
      }

      console.log('Incomplete second-factor response:', JSON.stringify(attempt, null, 2));
      setClerkError(getIncompleteSignInMessage(attempt.status));
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationCode = async () => {
    if (verificationStrategy !== 'email_code') return;

    setIsLoading(true);
    setClerkError(null);

    try {
      await signIn.prepareSecondFactor({ strategy: 'email_code' } as any);
      setVerificationCode('');
      setVerificationHint('We sent a fresh verification code to your email.');
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || 'Could not resend the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isLoaded) {
      setClerkError('Authentication is still loading. Please try again.');
      return;
    }
    if (!canSubmit) return;

    // Check if there is already a complete session waiting to be activated
    if (signIn.status === 'complete' && signIn.createdSessionId) {
      await activateSession(signIn.createdSessionId);
      return;
    }

    setIsLoading(true);
    setClerkError(null);
    try {
      const completeSignIn = await signIn.create({
        strategy: 'password',
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (completeSignIn.status === 'complete') {
        resetVerificationState();
        await activateSession(completeSignIn.createdSessionId);
      } else if (
        completeSignIn.status === 'needs_client_trust' ||
        completeSignIn.status === 'needs_second_factor'
      ) {
        await beginSecondFactorFlow(completeSignIn);
      } else {
        console.log('Incomplete sign-in response:', JSON.stringify(completeSignIn, null, 2));
        setClerkError(getIncompleteSignInMessage(completeSignIn.status));
      }
    } catch (err: any) {
      const errorMessage = err.errors?.[0]?.message;
      
      // Handle "Session already exists" specifically
      if (errorMessage === 'Session already exists') {
        if (signIn.status === 'complete' && signIn.createdSessionId) {
          await activateSession(signIn.createdSessionId);
          return;
        }
      }

      setClerkError(errorMessage || err?.message || t('auth.invalidCredentials'));
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
        setClerkError(t('auth.googleStartFailed'));
        return;
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(verificationUrl, redirectUrl);
      if (authSessionResult.type !== 'success' || !authSessionResult.url) {
        if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
          setClerkError(t('auth.googleCancelled'));
        } else {
          setClerkError(t('auth.googleIncomplete'));
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

      setClerkError(t('auth.googleIncomplete'));
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || t('auth.googleFailed'));
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
        setClerkError(t('auth.facebookStartFailed'));
        return;
      }

      const authSessionResult = await WebBrowser.openAuthSessionAsync(verificationUrl, redirectUrl);
      if (authSessionResult.type !== 'success' || !authSessionResult.url) {
        if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
          setClerkError(t('auth.facebookCancelled'));
        } else {
          setClerkError(t('auth.facebookIncomplete'));
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

      setClerkError(t('auth.facebookIncomplete'));
    } catch (err: any) {
      setClerkError(err?.errors?.[0]?.message || err?.message || t('auth.facebookFailed'));
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
              <Text style={styles.logoText}>{t('auth.rentable')}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {verificationStrategy === 'none' ? t('auth.welcomeTitle') : 'Verify your sign-in'}
          </Text>
          <Text style={styles.subtitle}>
            {verificationStrategy === 'none'
              ? t('auth.signInSubtitle')
              : getVerificationPrompt(verificationStrategy, verificationHint)}
          </Text>

          {verificationStrategy === 'none' ? (
            <>
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
                {t('auth.continueWithGoogle')}
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
                {t('auth.continueWithFacebook')}
              </Button>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <Divider style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.or')}</Text>
                <Divider style={styles.dividerLine} />
              </View>

              {/* Email */}
              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={email}
                onChangeText={updateEmail}
                onChange={(event: any) => updateEmail(event?.nativeEvent?.text ?? event?.target?.value ?? '')}
                onBlur={() => setEmailTouched(true)}
                placeholder={t('auth.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                left={<TextInput.Icon icon="email-outline" size={20} />}
                error={!!emailError}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                returnKeyType="next"
                disabled={isLoading}
              />
              {emailError && <HelperText type="error">{emailError}</HelperText>}

              {/* Password */}
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={password}
                onChangeText={updatePassword}
                onChange={(event: any) => updatePassword(event?.nativeEvent?.text ?? event?.target?.value ?? '')}
                onBlur={() => setPasswordTouched(true)}
                placeholder={t('auth.passwordPlaceholder')}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
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
                returnKeyType="go"
                onSubmitEditing={handleSignIn}
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
                {t('auth.signIn')}
              </Button>

              {/* Footer Links */}
              <View style={styles.footerRow}>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  labelStyle={styles.footerLink}
                  compact
                >
                  {t('auth.forgotPassword')}
                </Button>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate('Register')}
                  labelStyle={styles.footerLink}
                  compact
                >
                  {t('auth.needAccount')}
                </Button>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>
                {verificationStrategy === 'backup_code' ? 'Backup code' : 'Verification code'}
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={verificationCode}
                onChangeText={(value) => {
                  setVerificationCode(value);
                  setClerkError(null);
                }}
                onChange={(event: any) => {
                  setVerificationCode(event?.nativeEvent?.text ?? event?.target?.value ?? '');
                  setClerkError(null);
                }}
                placeholder={
                  verificationStrategy === 'backup_code'
                    ? 'Enter one of your backup codes'
                    : 'Enter the verification code'
                }
                autoCapitalize="none"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                keyboardType={verificationStrategy === 'backup_code' ? 'default' : 'number-pad'}
                left={<TextInput.Icon icon="shield-check-outline" size={20} />}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                returnKeyType="go"
                onSubmitEditing={handleSecondFactorVerification}
                disabled={isLoading}
              />

              {clerkError && <HelperText type="error" style={styles.storeError}>{clerkError}</HelperText>}

              <Button
                mode="contained"
                onPress={handleSecondFactorVerification}
                loading={isLoading}
                disabled={isLoading || !verificationCode.trim()}
                style={styles.signInButton}
                contentStyle={styles.signInButtonContent}
                labelStyle={styles.signInButtonLabel}
                buttonColor={colors.primary}
              >
                Verify
              </Button>

              {verificationStrategy === 'email_code' ? (
                <Button
                  mode="text"
                  onPress={handleResendVerificationCode}
                  disabled={isLoading}
                  labelStyle={styles.footerLink}
                  compact
                >
                  Send a new code
                </Button>
              ) : null}

              {verificationStrategy === 'totp' && canUseBackupCode ? (
                <Button
                  mode="text"
                  onPress={() => {
                    setVerificationStrategy('backup_code');
                    setVerificationCode('');
                    setClerkError(null);
                    setVerificationHint('Enter one of your backup codes to finish signing in.');
                  }}
                  disabled={isLoading}
                  labelStyle={styles.footerLink}
                  compact
                >
                  Use a backup code instead
                </Button>
              ) : null}

              {verificationStrategy === 'backup_code' && canUseAuthenticatorCode ? (
                <Button
                  mode="text"
                  onPress={() => {
                    setVerificationStrategy('totp');
                    setVerificationCode('');
                    setClerkError(null);
                    setVerificationHint('Enter the code from your authenticator app to finish signing in.');
                  }}
                  disabled={isLoading}
                  labelStyle={styles.footerLink}
                  compact
                >
                  Use authenticator code instead
                </Button>
              ) : null}

              <Button
                mode="text"
                onPress={() => {
                  resetVerificationState();
                  setClerkError(null);
                }}
                disabled={isLoading}
                labelStyle={styles.footerLink}
                compact
              >
                Start over
              </Button>
            </>
          )}
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
