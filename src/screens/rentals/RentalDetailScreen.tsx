import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useAuth, useUser } from '@clerk/expo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { useI18n } from '../../i18n';
import { getConditionReports } from '../../services/conditionReportService';
import { getRentalRequestById } from '../../services/rentalService';
import { getListingById } from '../../services/listingService';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { ConditionReport, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { getConditionReportRules } from '../../utils/conditionReportRules';

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
  const { t } = useI18n();
  const route = useRoute<Route>();
  const { rentalId } = route.params;
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email;

  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [itemInfo, setItemInfo] = useState<ItemInfo | null>(null);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [data, reports] = await Promise.all([
          getRentalRequestById(rentalId),
          getConditionReports({ rental_request_id: rentalId }),
        ]);
        setRental(data);
        setConditionReports(reports);

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
        toast.error(t('rentalDetail.notFound'), () => navigation.goBack());
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
        toast.error(t('rentalDetail.sessionExpired'));
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
        toast.success(t('rentalDetail.receiptDownloaded'));
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        toast.error(t('rentalDetail.sessionExpiredReceipt'));
      } else if (msg.includes('400') || msg.includes('only available')) {
        toast.warning(t('rentalDetail.receiptUnavailable'));
      } else {
        toast.error(t('rentalDetail.receiptFailed'));
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
        <Text style={styles.notFoundText}>{t('rentalDetail.notFound')}</Text>
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
  const reportRules = getConditionReportRules(rental, conditionReports, userEmail);

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
          <Text variant="titleLarge" style={styles.headerTitle}>{t('rentalDetail.title')}</Text>
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
            <Text style={styles.dateText}>{t('rentalDetail.filed', { date: createdDate })}</Text>
          </View>
          <Text style={styles.roleTag}>{isRenter ? t('rentalDetail.renterRole') : t('rentalDetail.ownerRole')}</Text>
        </View>

        {/* Item Details */}
        {itemInfo && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('rentalDetail.itemDetails')}</Text>
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
          <Text style={styles.sectionLabel}>{t('rentalDetail.rentalPeriod')}</Text>
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
          <Text style={styles.durationText}>{t(totalDays !== 1 ? 'rentalDetail.days_plural' : 'rentalDetail.days', { count: totalDays })}</Text>
        </View>

        {/* People */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('rentalDetail.parties')}</Text>
          <InfoRow label="Renter" value={rental.renter_email} />
          <InfoRow label="Owner" value={rental.owner_email} />
        </View>

        {/* Financials */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t('rentalDetail.pricing')}</Text>
          {itemInfo?.daily_rate !== undefined && (
            <InfoRow label={t('rentalDetail.dailyRate')} value={`$${itemInfo.daily_rate.toFixed(2)}`} />
          )}
          {itemInfo?.daily_rate !== undefined && (
            <InfoRow label={t('rentalDetail.duration')} value={t(totalDays !== 1 ? 'rentalDetail.days_plural' : 'rentalDetail.days', { count: totalDays })} />
          )}
          <InfoRow label={t('rentalDetail.rentalCost')} value={`$${rentalCost.toFixed(2)}`} />
          <InfoRow label={t('rentalDetail.platformFee')} value={`$${platformFee.toFixed(2)}`} />
          <InfoRow label={t('rentalDetail.securityDeposit')} value={`$${securityDeposit.toFixed(2)}`} />
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('rentalDetail.totalPaid')}</Text>
            <Text style={styles.totalValue}>${totalPaid.toFixed(2)}</Text>
          </View>
          {!isRenter && (
            <View style={[styles.infoRow, { borderBottomWidth: 0, marginTop: 4 }]}>
              <Text style={[styles.infoLabel, { color: '#059669' }]}>{t('rentalDetail.ownerPayout')}</Text>
              <Text style={[styles.infoValue, { color: '#059669', fontWeight: '700' }]}>${ownerPayout.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Message */}
        {rental.message ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('rentalDetail.message')}</Text>
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
            {t('rentalDetail.openChat')}
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
            {t('rentalDetail.downloadReceipt')}
          </Button>

          {/* Condition Reports */}
          {rental && (
            <>
              <View style={styles.conditionSummaryCard}>
                <Text style={styles.sectionLabel}>{t('rentalDetail.conditionReports')}</Text>
                <Text style={styles.conditionSummaryText}>
                  {t('rentalDetail.pickupReports', { count: reportRules.pickupReports.length })}
                </Text>
                <Text style={styles.conditionSummaryText}>
                  {t('rentalDetail.returnReports', { count: reportRules.returnReports.length })}
                </Text>
              </View>
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
                disabled={!reportRules.canCreatePickupReport && !reportRules.userPickupReport}
              >
                {reportRules.userPickupReport ? t('rentalDetail.viewPickupReport') : t('rentalDetail.pickupReport')}
              </Button>
              {!reportRules.canCreatePickupReport && !reportRules.userPickupReport && reportRules.pickupStatusMessage ? (
                <Text style={styles.conditionHint}>{reportRules.pickupStatusMessage}</Text>
              ) : null}
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
                disabled={!reportRules.canCreateReturnReport && !reportRules.userReturnReport}
              >
                {reportRules.userReturnReport ? t('rentalDetail.viewReturnReport') : t('rentalDetail.returnReport')}
              </Button>
              {!reportRules.canCreateReturnReport && !reportRules.userReturnReport && reportRules.returnStatusMessage ? (
                <Text style={styles.conditionHint}>{reportRules.returnStatusMessage}</Text>
              ) : null}
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
              {isRenter ? t('rentalDetail.requestExtension') : t('rentalDetail.viewExtensions')}
            </Button>
          )}

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backBtnAction}
            contentStyle={styles.btnContent}
          >
            {t('common.back')}
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
  conditionSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  conditionSummaryText: { color: '#475569', fontSize: typography.small, marginTop: 4 },
  conditionHint: { color: '#64748B', fontSize: typography.small, lineHeight: 18, marginTop: -4 },
  backBtnAction: { borderColor: colors.primary, borderRadius: 12 },
  btnContent: { paddingVertical: 6 },
  notFoundText: { color: '#94A3B8', fontSize: typography.body },
});
