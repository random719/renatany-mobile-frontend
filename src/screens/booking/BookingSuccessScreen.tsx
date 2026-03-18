import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useI18n } from '../../i18n';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'BookingSuccess'>;

export const BookingSuccessScreen = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const route = useRoute<Route>();
  const { rentalRequestId, listingTitle } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="check-circle" size={80} color="#10B981" />
      </View>

      <Text variant="headlineMedium" style={styles.title}>{t('bookingSuccess.title')}</Text>

      <Text style={styles.subtitle}>
        {t('bookingSuccess.subtitle', { title: listingTitle })}
      </Text>

      <View style={styles.idBox}>
        <Text style={styles.idLabel}>{t('bookingSuccess.requestId')}</Text>
        <Text style={styles.idValue}>{rentalRequestId}</Text>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('MyConversations')}
          style={styles.primaryBtn}
          contentStyle={styles.btnContent}
          icon="message-outline"
        >
          {t('bookingSuccess.viewRequests')}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
          style={styles.secondaryBtn}
          contentStyle={styles.btnContent}
          icon="home-outline"
        >
          {t('bookingSuccess.backHome')}
        </Button>
      </View>

      <Text style={styles.footerNote}>
        {t('bookingSuccess.footer')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: { marginBottom: 24 },
  title: { fontWeight: '800', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  subtitle: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: typography.tabLabel,
    marginBottom: 24,
  },
  listingName: { fontWeight: '700', color: '#0F172A' },
  idBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  idLabel: { color: '#94A3B8', fontSize: typography.small, marginBottom: 4 },
  idValue: { fontWeight: '700', color: '#0F172A', fontSize: typography.body, fontFamily: 'monospace' },
  actions: { width: '100%', gap: 12, marginBottom: 24 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12 },
  secondaryBtn: { borderColor: colors.primary, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  footerNote: {
    color: '#94A3B8',
    fontSize: typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
});
