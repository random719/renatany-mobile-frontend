import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '../../i18n';
import { useToastStore, ToastVariant } from '../../store/toastStore';

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    gradient: [string, string];
    icon: string;
    title: string;
    titleColor: string;
    msgColor: string;
    btnGradient: [string, string];
  }
> = {
  success: {
    gradient: ['#34D399', '#059669'],
    icon: 'check-circle-outline',
    title: 'Success',
    titleColor: '#064E3B',
    msgColor: '#374151',
    btnGradient: ['#10B981', '#059669'],
  },
  error: {
    gradient: ['#F87171', '#DC2626'],
    icon: 'close-circle-outline',
    title: 'Oops!',
    titleColor: '#7F1D1D',
    msgColor: '#374151',
    btnGradient: ['#EF4444', '#DC2626'],
  },
  warning: {
    gradient: ['#FBBF24', '#D97706'],
    icon: 'alert-circle-outline',
    title: 'Heads Up',
    titleColor: '#78350F',
    msgColor: '#374151',
    btnGradient: ['#F59E0B', '#D97706'],
  },
  info: {
    gradient: ['#60A5FA', '#2563EB'],
    icon: 'information-outline',
    title: 'Info',
    titleColor: '#1E3A8A',
    msgColor: '#374151',
    btnGradient: ['#3B82F6', '#2563EB'],
  },
};

export const Toast = () => {
  const { t } = useI18n();
  const { visible, message, variant, hide } = useToastStore();
  const scale = useRef(new Animated.Value(0.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.8);
      opacity.setValue(0);
      iconScale.setValue(0);

      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 6,
          delay: 50,
        }).start();
      });
    } else {
      scale.setValue(0.8);
      opacity.setValue(0);
      iconScale.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const config = VARIANT_CONFIG[variant];
  const title =
    variant === 'success'
      ? t('toast.successTitle')
      : variant === 'error'
      ? t('toast.errorTitle')
      : variant === 'warning'
      ? t('toast.warningTitle')
      : t('toast.infoTitle');

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={hide} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={hide}>
        <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
          <Pressable>
            {/* Icon with gradient circle */}
            <View style={styles.iconWrapper}>
              <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                <LinearGradient
                  colors={config.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <MaterialCommunityIcons
                    name={config.icon as any}
                    size={40}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: config.titleColor }]}>
              {title}
            </Text>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Message */}
            <Text style={[styles.message, { color: config.msgColor }]}>
              {message}
            </Text>

            {/* Button */}
            <TouchableOpacity onPress={hide} activeOpacity={0.85} style={styles.btnTouchable}>
              <LinearGradient
                colors={config.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>{t('toast.gotIt')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 20,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 8,
    marginBottom: 14,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  btnTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  button: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
