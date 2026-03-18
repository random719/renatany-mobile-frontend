import React, { useState } from "react";
import {
  StyleSheet,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSignIn } from "@clerk/expo/legacy";
import { getEmailError } from "../../utils/validators";
import { colors, typography } from "../../theme";
import { useI18n } from "../../i18n";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { AuthStackParamList } from "../../types/navigation";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "ForgotPassword">;
};

export const ForgotPasswordScreen = ({ navigation }: Props) => {
  const { t } = useI18n();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const emailError = emailTouched ? getEmailError(email) : undefined;

  const handleSendCode = async () => {
    setEmailTouched(true);
    if (getEmailError(email) || !isLoaded) return;

    setIsLoading(true);
    setError(null);
    setSuccessMessage("");
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setCodeSent(true);
      setSuccessMessage(t('auth.verificationCodeSent', { email }));
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          t('auth.codeVerificationFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded) return;
    if (!code) {
      setError(t('auth.verificationCodeRequired'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setSuccessMessage(t('auth.passwordResetSuccess'));
      } else if (result.status === "needs_new_password") {
        setIsVerifyingCode(false);
        setIsSettingPassword(true);
      } else {
        setError(t('auth.codeVerificationIncomplete'));
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message || err?.message || t('auth.codeVerificationFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded) return;
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.passwordMinLength'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn.resetPassword({
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        setError(t('auth.passwordResetIncomplete'));
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message || err?.message || t('auth.passwordResetFailed'),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {!codeSent && !isSettingPassword ? (
            <>
              {/* Back link */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => navigation.navigate("Login")}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={20}
                  color={colors.textSecondary}
                />
                <Text style={styles.backText}>{t('auth.backToSignIn')}</Text>
              </TouchableOpacity>

              {/* Title */}
              <Text style={styles.title}>{t('auth.resetPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.resetPasswordSubtitle')}
              </Text>

              <Text style={styles.inputLabel}>{t('auth.email')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
                onBlur={() => setEmailTouched(true)}
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
              {error && <HelperText type="error">{error}</HelperText>}

              <Button
                mode="contained"
                onPress={handleSendCode}
                loading={isLoading}
                disabled={isLoading}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                buttonColor="#111827"
              >
                {t('auth.sendVerificationCode')}
              </Button>
            </>
          ) : codeSent && !isSettingPassword ? (
            <View>
              <View style={styles.verifyIconWrap}>
                <MaterialCommunityIcons
                  name="email-outline"
                  size={28}
                  color="#4B5563"
                />
              </View>
              <Text style={styles.verifyTitle}>{t('auth.verifyYourCode')}</Text>
              <Text style={styles.verifySubtitle}>
                {t('auth.verifySubtitle')}{"\n"}
                <Text style={styles.verifyEmail}>{email}</Text>
              </Text>

              <Text style={styles.inputLabel}>{t('auth.verificationCodeLabel')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setError(null);
                }}
                placeholder={t('auth.verificationCodePlaceholder')}
                autoCapitalize="none"
                keyboardType="numeric"
                maxLength={6}
                style={[styles.input, styles.codeInput]}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                disabled={isLoading}
              />
              {error && <HelperText type="error">{error}</HelperText>}

              {successMessage ? (
                <View style={[styles.successBox, { marginBottom: 16 }]}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              <Button
                mode="contained"
                onPress={handleVerifyCode}
                loading={isLoading}
                disabled={isLoading || code.length < 6}
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                buttonColor={colors.primary}
              >
                {t('auth.verifyCode')}
              </Button>

              <View style={styles.resendContainer}>
                <Text style={styles.linkText}>{t('auth.didntReceive')}</Text>
                <TouchableOpacity onPress={handleSendCode} disabled={isLoading}>
                  <Text style={styles.linkTextHighlight}>{t('auth.resend')}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setCodeSent(false);
                  setCode("");
                  setError(null);
                  setSuccessMessage("");
                }}
                disabled={isLoading}
                style={styles.backToEmailBtn}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.backToEmailText}>{t('auth.backToEmail')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Title */}
              <Text style={styles.title}>{t('auth.setNewPassword')}</Text>
              <Text style={styles.subtitle}>
                {t('auth.setNewPasswordSubtitle')}
              </Text>

              <Text style={styles.inputLabel}>{t('auth.newPassword')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder=""
                secureTextEntry
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock-outline" size={20} />}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                disabled={isLoading}
              />
              <Text style={styles.helperText}>
                {t('auth.passwordHint')}
              </Text>

              <Text style={styles.inputLabel}>{t('auth.confirmNewPassword')}</Text>
              <TextInput
                mode="outlined"
                dense
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setError(null);
                }}
                placeholder=""
                secureTextEntry
                autoCapitalize="none"
                left={<TextInput.Icon icon="lock-outline" size={20} />}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                disabled={isLoading}
              />

              {error && <HelperText type="error">{error}</HelperText>}

              <Button
                mode="contained"
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={
                  isLoading ||
                  password.length < 8 ||
                  password !== confirmPassword
                }
                style={styles.submitButton}
                contentStyle={styles.submitButtonContent}
                labelStyle={styles.submitButtonLabel}
                buttonColor="#111827"
              >
                {t('auth.resetPasswordAction')}
              </Button>

              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                disabled={isLoading}
                style={styles.backToEmailBtn}
              >
                <Text style={styles.backToEmailText}>{t('auth.backToSignIn')}</Text>
              </TouchableOpacity>
            </View>
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
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 6,
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
  helperText: {
    fontSize: typography.small,
    color: colors.textSecondary,
    marginBottom: 16,
    marginLeft: 4,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  successText: {
    flex: 1,
    fontSize: typography.body,
    color: colors.success,
    lineHeight: 20,
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
    fontWeight: "600",
    color: "#FFFFFF",
  },
  verifyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginBottom: 24,
  },
  verifyTitle: {
    fontSize: typography.headline,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  verifySubtitle: {
    fontSize: typography.label,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  verifyEmail: {
    color: "#111827",
    fontWeight: "600",
  },
  resendContainer: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  linkTextHighlight: {
    fontSize: typography.body,
    color: "#4B5563",
    fontWeight: "600",
  },
  backToEmailBtn: {
    marginTop: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  backToEmailText: {
    fontSize: typography.body,
    color: "#4B5563",
    fontWeight: "500",
  },
  codeInput: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 4,
    fontSize: typography.sectionTitle,
  },
});
