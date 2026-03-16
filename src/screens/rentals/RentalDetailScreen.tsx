import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useAuth, useUser } from '@clerk/expo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getRentalRequestById } from '../../services/rentalService';
import { getListingById } from '../../services/listingService';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RentalDetail'>;

interface ItemInfo {
  title: string;
  description?: string;
  images?: string[];
  category?: string;
  condition?: string;
  daily_rate?: number;
  deposit?: number;
  location?: { address?: string; city?: string } | string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  rejected: '#EF4444',
  paid: '#8B5CF6',
  cancelled: '#6B7280',
  completed: '#10B981',
  inquiry: '#7C3AED',
  declined: '#B91C1C',
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
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email;

  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [itemInfo, setItemInfo] = useState<ItemInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRentalRequestById(rentalId);
        setRental(data);

        // Fetch item details
        if (data?.item_id) {
          try {
            const result = await getListingById(data.item_id);
            if (result) {
              setItemInfo({
                title: result.listing.title,
                description: result.listing.description,
                images: result.listing.images,
                category: result.listing.category,
                condition: result.listing.condition,
                daily_rate: result.listing.pricePerDay,
                deposit: result.listing.deposit,
                location: result.listing.location,
              });
            }
          } catch {
            // Item may have been deleted
          }
        }
      } catch {
        Alert.alert('Error', 'Failed to load rental details.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [rentalId]);

  const handleDownloadReceipt = async () => {
    if (!rental) return;
    setDownloadingReceipt(true);
    try {
      const baseUrl = api.defaults.baseURL || '';
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setDownloadingReceipt(false);
        return;
      }
      const receiptUrl = `${baseUrl}/receipts?rental_request_id=${encodeURIComponent(rental.id)}`;

      const destination = new File(Paths.cache, `receipt-${rental.id}.pdf`);
      const downloaded = await File.downloadFileAsync(receiptUrl, destination, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/pdf',
        },
        idempotent: true,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt - ${rental.id}`,
        });
      } else {
        Alert.alert('Success', 'Receipt downloaded successfully.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        Alert.alert('Session Expired', 'Please log in again to download receipts.');
      } else if (msg.includes('400') || msg.includes('only available')) {
        Alert.alert('Receipt Unavailable', 'Receipts are only available for paid or completed rentals.');
      } else {
        Alert.alert('Download Failed', 'Unable to download receipt. Please try again.');
      }
    } finally {
      setDownloadingReceipt(false);
    }
  };

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

  const isRenter = rental.renter_email === userEmail;
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

  const rentalCost = rental.total_amount ?? 0;
  const platformFee = typeof rental.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
  const securityDeposit = typeof rental.security_deposit === 'number' ? rental.security_deposit : 0;
  const totalPaid = typeof rental.total_paid === 'number' ? rental.total_paid : rentalCost + platformFee + securityDeposit;
  const ownerPayout = rentalCost - platformFee;

  const locationStr = itemInfo?.location
    ? typeof itemInfo.location === 'string'
      ? itemInfo.location
      : [itemInfo.location.address, itemInfo.location.city].filter(Boolean).join(', ')
    : undefined;

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

        {/* Item Image */}
        {itemInfo?.images && itemInfo.images.length > 0 && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: itemInfo.images[0] }} style={styles.itemImage} resizeMode="cover" />
          </View>
        )}

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

        {/* Item Details */}
        {itemInfo && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Item Details</Text>
            <InfoRow label="Title" value={itemInfo.title} />
            {itemInfo.category && <InfoRow label="Category" value={itemInfo.category} />}
            {itemInfo.condition && <InfoRow label="Condition" value={itemInfo.condition} />}
            {locationStr && <InfoRow label="Location" value={locationStr} />}
            {itemInfo.description && (
              <Text style={styles.descriptionText} numberOfLines={3}>{itemInfo.description}</Text>
            )}
          </View>
        )}

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
        </View>

        {/* Financials */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Pricing Breakdown</Text>
          {itemInfo?.daily_rate !== undefined && (
            <InfoRow label="Daily rate" value={`$${itemInfo.daily_rate.toFixed(2)}`} />
          )}
          {itemInfo?.daily_rate !== undefined && (
            <InfoRow label="Duration" value={`${totalDays} day${totalDays !== 1 ? 's' : ''}`} />
          )}
          <InfoRow label="Rental cost" value={`$${rentalCost.toFixed(2)}`} />
          <InfoRow label="Platform fee" value={`$${platformFee.toFixed(2)}`} />
          <InfoRow label="Security deposit" value={`$${securityDeposit.toFixed(2)}`} />
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>${totalPaid.toFixed(2)}</Text>
          </View>
          {!isRenter && (
            <View style={[styles.infoRow, { borderBottomWidth: 0, marginTop: 4 }]}>
              <Text style={[styles.infoLabel, { color: '#059669' }]}>Owner payout</Text>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '700' }]}>${ownerPayout.toFixed(2)}</Text>
            </View>
          )}
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
            onPress={handleDownloadReceipt}
            loading={downloadingReceipt}
            disabled={downloadingReceipt}
            style={styles.receiptBtn}
            contentStyle={styles.btnContent}
            icon="download"
          >
            Download Receipt
          </Button>

          {/* Condition Reports - only for paid/completed rentals */}
          {rental && ['paid', 'completed'].includes(rental.status) && (
            <>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('ConditionReport', {
                    rentalRequestId: rental.id,
                    reportType: 'pickup',
                  })
                }
                style={styles.receiptBtn}
                contentStyle={styles.btnContent}
                icon="clipboard-check-outline"
              >
                Pickup Report
              </Button>
              <Button
                mode="outlined"
                onPress={() =>
                  navigation.navigate('ConditionReport', {
                    rentalRequestId: rental.id,
                    reportType: 'return',
                  })
                }
                style={styles.receiptBtn}
                contentStyle={styles.btnContent}
                icon="clipboard-arrow-left-outline"
              >
                Return Report
              </Button>
            </>
          )}

          {/* Rental Extension - only for paid rentals */}
          {rental && rental.status === 'paid' && (
            <Button
              mode="outlined"
              onPress={() =>
                navigation.navigate('RentalExtension', {
                  rentalRequestId: rental.id,
                  currentEndDate: rental.end_date,
                  dailyRate: itemInfo?.daily_rate || 0,
                  ownerEmail: rental.owner_email,
                  isOwner: !isRenter,
                })
              }
              style={styles.receiptBtn}
              contentStyle={styles.btnContent}
              icon="calendar-plus"
            >
              {isRenter ? 'Request Extension' : 'View Extensions'}
            </Button>
          )}

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
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
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
  descriptionText: {
    color: '#475569',
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: 8,
  },
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
  receiptBtn: { borderColor: '#111827', borderRadius: 12 },
  backBtnAction: { borderColor: colors.primary, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  notFoundText: { color: '#94A3B8', fontSize: typography.body },
});
