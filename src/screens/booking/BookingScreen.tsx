import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { useI18n } from '../../i18n';
import { calculatePricing } from '../../services/bookingService';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Booking'>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (s: string) => DATE_RE.test(s) && !isNaN(new Date(s).getTime());

export const BookingScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { t } = useI18n();
  const { listingId, listingTitle, pricePerDay, ownerEmail } = route.params;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');

  const totalDays = useMemo(() => {
    if (!isValidDate(startDate) || !isValidDate(endDate)) return 0;
    const diff = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    return diff > 0 ? Math.ceil(diff) : 0;
  }, [startDate, endDate]);

  const pricing = useMemo(
    () => (totalDays > 0 ? calculatePricing(pricePerDay, totalDays) : null),
    [pricePerDay, totalDays],
  );

  const canContinue =
    isValidDate(startDate) && isValidDate(endDate) && totalDays > 0 && pricing !== null;

  const handleContinue = () => {
    if (!canContinue || !pricing) return;
    navigation.navigate('BookingConfirm', {
      listingId,
      listingTitle,
      pricePerDay,
      ownerEmail,
      startDate,
      endDate,
      totalDays,
      dailyRate: pricing.dailyRate,
      platformFee: pricing.platformFee,
      deposit: pricing.deposit,
      totalAmount: pricing.totalAmount,
      message,
    });
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>{t('bookingScreen.title')}</Text>
        </View>

        <View style={styles.listingCard}>
          <MaterialCommunityIcons name="cube-outline" size={20} color={colors.accentBlue} />
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={2}>{listingTitle}</Text>
            <Text style={styles.listingPrice}>{t('publicProfile.perDay', { price: pricePerDay })}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('bookingScreen.selectDates')}</Text>

          <TextInput
            label={t('bookingScreen.startDateLabel')}
            value={startDate}
            onChangeText={setStartDate}
            mode="outlined"
            placeholder={t('bookingScreen.startDatePlaceholder')}
            left={<TextInput.Icon icon="calendar-start" />}
            error={startDate.length > 0 && !isValidDate(startDate)}
            style={styles.dateInput}
          />

          <TextInput
            label={t('bookingScreen.endDateLabel')}
            value={endDate}
            onChangeText={setEndDate}
            mode="outlined"
            placeholder={t('bookingScreen.endDatePlaceholder')}
            left={<TextInput.Icon icon="calendar-end" />}
            error={endDate.length > 0 && !isValidDate(endDate)}
            style={styles.dateInput}
          />

          {totalDays > 0 && (
            <View style={styles.durationBadge}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#2563EB" />
              <Text style={styles.durationText}>
                {t(totalDays > 1 ? 'bookingScreen.daysSelected_plural' : 'bookingScreen.daysSelected', { count: totalDays })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('bookingScreen.messageToOwnerOptional')}</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            mode="outlined"
            placeholder={t('bookingScreen.messagePlaceholder')}
            multiline
            numberOfLines={3}
            style={styles.messageInput}
          />
        </View>

        {pricing && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('bookingConfirm.pricing')}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('bookingScreen.dailyRateSummary', { price: pricePerDay, count: totalDays })}</Text>
              <Text style={styles.priceValue}>${pricing.dailyRate.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('bookingConfirm.platformFee')}</Text>
              <Text style={styles.priceValue}>${pricing.platformFee.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>{t('bookingConfirm.securityDeposit')}</Text>
              <Text style={styles.priceValue}>${pricing.deposit.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>{t('bookingConfirm.total')}</Text>
              <Text style={styles.totalValue}>${pricing.totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleContinue}
          disabled={!canContinue}
          style={styles.continueBtn}
          contentStyle={styles.continueBtnContent}
        >
          {t('bookingScreen.continueToConfirm')}
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: { fontWeight: '700', color: '#0F172A' },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listingInfo: { flex: 1 },
  listingTitle: { fontWeight: '600', color: '#0F172A', fontSize: typography.tabLabel, marginBottom: 4 },
  listingPrice: { color: colors.accentBlue, fontWeight: '700', fontSize: typography.body },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.body, marginBottom: 12 },
  dateInput: { marginBottom: 12 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  durationText: { color: '#2563EB', fontWeight: '600', fontSize: typography.body },
  messageInput: { minHeight: 80 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: { color: '#64748B', fontSize: typography.body },
  priceValue: { color: '#0F172A', fontWeight: '600', fontSize: typography.body },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  totalLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.tabLabel },
  totalValue: { fontWeight: '800', color: '#0F172A', fontSize: 20 },
  continueBtn: { marginHorizontal: 16, marginTop: 8, backgroundColor: colors.primary, borderRadius: 12 },
  continueBtnContent: { paddingVertical: 6 },
});
