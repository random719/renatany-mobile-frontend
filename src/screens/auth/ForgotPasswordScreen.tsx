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
import type { StackNavigationProp } from "@react-navigation/stack";
import type { AuthStackParamList } from "../../types/navigation";

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, "ForgotPassword">;
};

export const ForgotPasswordScreen = ({ navigation }: Props) => {
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
      setSuccessMessage(`Verification code sent to ${email}`);
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message ||
          err?.message ||
          "Failed to send verification code",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded) return;
    if (!code) {
      setError("Verification code is required");
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
        setSuccessMessage("Password reset successful. You are now signed in.");
      } else if (result.status === "needs_new_password") {
        setIsVerifyingCode(false);
        setIsSettingPassword(true);
      } else {
        setError("Code verification could not be completed");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message || err?.message || "Failed to verify code",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isLoaded) return;
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
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
        setError("Password reset could not be completed");
      }
    } catch (err: any) {
      setError(
        err?.errors?.[0]?.message || err?.message || "Failed to reset password",
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
                <Text style={styles.backText}>Back to sign in</Text>
              </TouchableOpacity>

              {/* Title */}
              <Text style={styles.title}>Reset your password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a verification code
                to reset your password.
              </Text>

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                mode="outlined"
                dense
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setError(null);
                }}
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
                Send verification code
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
              <Text style={styles.verifyTitle}>Verify your code</Text>
              <Text style={styles.verifySubtitle}>
                We've sent a verification code to{"\n"}
                <Text style={styles.verifyEmail}>{email}</Text>
              </Text>

              <Text style={styles.inputLabel}>Verification Code</Text>
              <TextInput
                mode="outlined"
                dense
                value={code}
                onChangeText={(t) => {
                  setCode(t);
                  setError(null);
                }}
                placeholder="Enter 6-digit code"
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
                Verify Code
              </Button>

              <View style={styles.resendContainer}>
                <Text style={styles.linkText}>Didn't receive the code? </Text>
                <TouchableOpacity onPress={handleSendCode} disabled={isLoading}>
                  <Text style={styles.linkTextHighlight}>Resend</Text>
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
                <Text style={styles.backToEmailText}>Back to email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Title */}
              <Text style={styles.title}>Set new password</Text>
              <Text style={styles.subtitle}>
                Enter your new password for Rentany
              </Text>

              <Text style={styles.inputLabel}>New Password</Text>
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
                Must be at least 8 characters
              </Text>

              <Text style={styles.inputLabel}>Confirm New Password</Text>
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
                Reset password
              </Button>

              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                disabled={isLoading}
                style={styles.backToEmailBtn}
              >
                <Text style={styles.backToEmailText}>Back to sign in</Text>
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
