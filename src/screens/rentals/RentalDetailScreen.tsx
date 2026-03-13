import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getRentalRequestById } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RentalDetail'>;

const STATUS_COLOR: Record<RentalRequest['status'], string> = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  rejected: '#EF4444',
  paid: '#8B5CF6',
  cancelled: '#6B7280',
  completed: '#10B981',
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
);

export const RentalDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rentalId } = route.params;
  const { user } = useAuthStore();

  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRentalRequestById(rentalId);
        setRental(data);
      } catch {
        Alert.alert('Error', 'Failed to load rental details.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [rentalId]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!rental) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Rental not found.</Text>
      </View>
    );
  }

  const isRenter = rental.renter_email === user?.email;
  const statusColor = STATUS_COLOR[rental.status] ?? '#6B7280';
  const startDate = new Date(rental.start_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const endDate = new Date(rental.end_date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const createdDate = new Date(rental.created_date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const totalDays = Math.max(
    1,
    Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / 86400000),
  );

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>Rental Details</Text>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {rental.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.dateText}>Filed {createdDate}</Text>
          </View>
          <Text style={styles.roleTag}>{isRenter ? 'You are the renter' : 'You are the owner'}</Text>
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Rental Period</Text>
          <View style={styles.datesRow}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateBlockLabel}>Start</Text>
              <Text style={styles.dateBlockValue}>{startDate}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#CBD5E1" />
            <View style={[styles.dateBlock, { alignItems: 'flex-end' }]}>
              <Text style={styles.dateBlockLabel}>End</Text>
              <Text style={styles.dateBlockValue}>{endDate}</Text>
            </View>
          </View>
          <Text style={styles.durationText}>{totalDays} day{totalDays !== 1 ? 's' : ''}</Text>
        </View>

        {/* People */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Parties</Text>
          <InfoRow label="Renter" value={rental.renter_email} />
          <InfoRow label="Owner" value={rental.owner_email} />
          <InfoRow label="Item ID" value={rental.item_id} />
        </View>

        {/* Financials */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Financials</Text>
          {rental.platform_fee !== undefined && (
            <InfoRow label="Platform fee" value={`$${rental.platform_fee.toFixed(2)}`} />
          )}
          {rental.security_deposit !== undefined && (
            <InfoRow label="Security deposit" value={`$${rental.security_deposit.toFixed(2)}`} />
          )}
          {rental.total_paid !== undefined && (
            <InfoRow label="Total paid" value={`$${rental.total_paid.toFixed(2)}`} />
          )}
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>${rental.total_amount?.toFixed(2) ?? '—'}</Text>
          </View>
        </View>

        {/* Message */}
        {rental.message ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Message</Text>
            <Text style={styles.messageText}>"{rental.message}"</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate('Chat', {
                rentalRequestId: rental.id,
                otherUserEmail: isRenter ? rental.owner_email : rental.renter_email,
                itemId: rental.item_id,
              })
            }
            style={styles.chatBtn}
            contentStyle={styles.btnContent}
            icon="message-outline"
          >
            Open Chat
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backBtnAction}
            contentStyle={styles.btnContent}
          >
            Back
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontWeight: '700', fontSize: typography.small },
  dateText: { color: '#64748B', fontSize: typography.small },
  roleTag: { color: '#64748B', fontSize: typography.small, fontStyle: 'italic' },
  sectionLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.body, marginBottom: 12 },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateBlock: { flex: 1 },
  dateBlockLabel: { color: '#94A3B8', fontSize: typography.small, marginBottom: 4 },
  dateBlockValue: { color: '#0F172A', fontWeight: '600', fontSize: typography.body },
  durationText: { color: '#64748B', fontSize: typography.small, fontStyle: 'italic' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { color: '#64748B', fontSize: typography.body },
  infoValue: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: typography.body,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  totalRow: { borderBottomWidth: 0, marginTop: 4 },
  totalLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.tabLabel },
  totalValue: { fontWeight: '800', color: '#0F172A', fontSize: 20 },
  messageText: { color: '#475569', fontStyle: 'italic', lineHeight: 22, fontSize: typography.body },
  actions: { marginHorizontal: 16, gap: 10 },
  chatBtn: { backgroundColor: colors.primary, borderRadius: 12 },
  backBtnAction: { borderColor: colors.primary, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  notFoundText: { color: '#94A3B8', fontSize: typography.body },
});
