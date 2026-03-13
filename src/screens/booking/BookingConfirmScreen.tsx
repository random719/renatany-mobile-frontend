import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { createRentalRequest } from '../../services/bookingService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'BookingConfirm'>;

export const BookingConfirmScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const {
    listingId, listingTitle, ownerEmail,
    startDate, endDate, totalDays,
    dailyRate, platformFee, deposit, totalAmount,
    message,
  } = route.params;

  const handleConfirm = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'You must be logged in to make a rental request.');
      return;
    }
    setIsLoading(true);
    try {
      const result = await createRentalRequest({
        item_id: listingId,
        renter_email: user.email,
        owner_email: ownerEmail,
        start_date: startDate,
        end_date: endDate,
        total_amount: totalAmount,
        platform_fee: platformFee,
        security_deposit: deposit,
        message: message || undefined,
      });
      navigation.navigate('BookingSuccess', {
        rentalRequestId: result.id,
        listingTitle,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send rental request.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>Confirm Request</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Rental Summary</Text>
          <Text style={styles.itemTitle}>{listingTitle}</Text>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-range" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{startDate}  →  {endDate}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>{totalDays} day{totalDays > 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>Owner: {ownerEmail}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Pricing Breakdown</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Rental subtotal</Text>
            <Text style={styles.priceValue}>${dailyRate.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Platform fee (10%)</Text>
            <Text style={styles.priceValue}>${platformFee.toFixed(2)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Security deposit (20%)</Text>
            <Text style={styles.priceValue}>${deposit.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {message ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Your Message</Text>
            <Text style={styles.messageText}>"{message}"</Text>
          </View>
        ) : null}

        <View style={styles.noticeBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#2563EB" />
          <Text style={styles.noticeText}>
            Your request will be sent to the owner. They have 48 hours to approve or decline.
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={handleConfirm}
          loading={isLoading}
          disabled={isLoading}
          style={styles.confirmBtn}
          contentStyle={styles.confirmBtnContent}
          icon="send"
        >
          Send Rental Request
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
  itemTitle: { fontWeight: '600', color: '#0F172A', fontSize: typography.tabLabel, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  infoText: { color: '#475569', fontSize: typography.body },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceLabel: { color: '#64748B', fontSize: typography.body },
  priceValue: { color: '#0F172A', fontWeight: '600', fontSize: typography.body },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  totalLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.tabLabel },
  totalValue: { fontWeight: '800', color: '#0F172A', fontSize: 20 },
  messageText: { color: '#475569', fontStyle: 'italic', lineHeight: 22, fontSize: typography.body },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  noticeText: { flex: 1, color: '#1E40AF', fontSize: typography.body, lineHeight: 20 },
  confirmBtn: { marginHorizontal: 16, backgroundColor: colors.primary, borderRadius: 12 },
  confirmBtnContent: { paddingVertical: 6 },
});
