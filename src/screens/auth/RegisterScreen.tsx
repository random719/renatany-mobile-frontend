import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { getEmailError, getPasswordError, getConfirmPasswordError } from '../../utils/validators';
import { colors } from '../../theme';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../types/navigation';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

export const RegisterScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });

  const { register, isLoading, error, clearError } = useAuthStore();

  const emailError = touched.email ? getEmailError(email) : undefined;
  const passwordError = touched.password ? getPasswordError(password) : undefined;
  const confirmError = touched.confirm ? getConfirmPasswordError(password, confirmPassword) : undefined;

  const canSubmit =
    !getEmailError(email) && !getPasswordError(password) && !getConfirmPasswordError(password, confirmPassword);

  const handleRegister = () => {
    setTouched({ email: true, password: true, confirm: true });
    if (canSubmit) {
      clearError();
      register('', email, password);
    }
  };

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
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Create your account</Text>

          {/* Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            mode="outlined"
            dense
            value={email}
            onChangeText={(t) => { setEmail(t); clearError(); }}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
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
            onBlur={() => setTouched((s) => ({ ...s, password: true }))}
            placeholder="Min. 8 characters"
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
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <TextInput
            mode="outlined"
            dense
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
            onBlur={() => setTouched((s) => ({ ...s, confirm: true }))}
            placeholder="Re-enter password"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" size={20} />}
            error={!!confirmError}
            style={styles.input}
            outlineStyle={styles.inputOutline}
            contentStyle={styles.inputContent}
            disabled={isLoading}
          />
          {confirmError && <HelperText type="error">{confirmError}</HelperText>}

          {error && <HelperText type="error" style={styles.storeError}>{error}</HelperText>}

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
            Continue
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
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 20,
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
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  submitButtonContent: {
    height: 48,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
