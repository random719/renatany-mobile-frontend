import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Menu, Text, TextInput } from 'react-native-paper';
import { useAuth, useUser } from '@clerk/expo';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppBottomNavBar } from '../../components/common/AppBottomNavBar';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { getRentalRequests } from '../../services/rentalService';
import { getListingById } from '../../services/listingService';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type FilterKey = 'all' | 'as_renter' | 'as_owner' | 'completed' | 'active' | 'pending' | 'cancelled';

interface ItemInfo {
  id: string;
  title: string;
  images?: string[];
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Rentals' },
  { key: 'as_renter', label: 'As Renter' },
  { key: 'as_owner', label: 'As Owner' },
  { key: 'completed', label: 'Completed' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  cancelled: 'Cancelled',
  completed: 'Completed',
  inquiry: 'Inquiry',
  declined: 'Declined',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#2563EB',
  rejected: '#DC2626',
  paid: '#0F766E',
  cancelled: '#64748B',
  completed: '#059669',
  inquiry: '#7C3AED',
  declined: '#B91C1C',
};

const formatDateRange = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endLabel = end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startLabel} - ${endLabel}`;
};

export const RentalHistoryScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { user } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? user?.email;
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, ItemInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }
    if (!quiet) setIsLoading(true);

    try {
      const [asRenter, asOwner] = await Promise.all([
        getRentalRequests({ renter_email: userEmail }),
        getRentalRequests({ owner_email: userEmail }),
      ]);
      const merged = [...asRenter, ...asOwner];
      const unique = Array.from(new Map(merged.map((rental) => [rental.id, rental])).values());
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setRentals(unique);

      // Fetch item details for all rentals
      const itemIds = [...new Set(unique.map((r) => r.item_id).filter(Boolean))];
      const itemsMap: Record<string, ItemInfo> = {};

      // Fetch items in parallel (batch of 5 to avoid overwhelming)
      const batchSize = 5;
      for (let i = 0; i < itemIds.length; i += batchSize) {
        const batch = itemIds.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (itemId) => {
            try {
              const result = await getListingById(itemId);
              if (result) {
                return {
                  id: itemId,
                  title: result.listing.title,
                  images: result.listing.images,
                };
              }
            } catch {
              // Item may have been deleted
            }
            return null;
          })
        );
        results.forEach((item) => {
          if (item) itemsMap[item.id] = item;
        });
      }

      setItems(itemsMap);
    } catch {
      // Keep the page stable even if the API fails.
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownloadReceipt = async (rentalId: string) => {
    setDownloadingId(rentalId);
    try {
      const baseUrl = api.defaults.baseURL || '';
      // Get a fresh Clerk session token
      const token = await getToken();
      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setDownloadingId(null);
        return;
      }
      const receiptUrl = `${baseUrl}/receipts?rental_request_id=${encodeURIComponent(rentalId)}`;

      const destination = new File(Paths.cache, `receipt-${rentalId}.pdf`);
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
          dialogTitle: `Receipt - ${rentalId}`,
        });
      } else {
        Alert.alert('Success', 'Receipt downloaded successfully.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        Alert.alert('Error', 'Session expired. Please log in again.');
      } else if (msg.includes('400') || msg.includes('only available for paid')) {
        Alert.alert('Error', 'Receipt is only available for paid or completed rentals.');
      } else {
        Alert.alert('Error', 'Failed to download receipt. Please try again.');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredRentals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rentals.filter((rental) => {
      // Apply filter
      if (selectedFilter === 'as_renter') {
        if (rental.renter_email !== userEmail) return false;
      } else if (selectedFilter === 'as_owner') {
        if (rental.owner_email !== userEmail) return false;
      } else if (selectedFilter === 'active') {
        if (rental.status !== 'approved' && rental.status !== 'paid') return false;
      } else if (selectedFilter !== 'all') {
        if (rental.status !== selectedFilter) return false;
      }

      if (!query) return true;

      const item = items[rental.item_id];
      const searchBase = [
        rental.id,
        item?.title,
        rental.renter_email,
        rental.owner_email,
        STATUS_LABELS[rental.status] || rental.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBase.includes(query);
    });
  }, [rentals, searchQuery, selectedFilter, items, userEmail]);

  const renderCard = ({ item: rental }: { item: RentalRequest }) => {
    const itemInfo = items[rental.item_id];
    const title = itemInfo?.title || rental.item_id?.replace(/[-_]/g, ' ') || 'Product';
    const imageUrl = itemInfo?.images?.[0];
    const isRenter = rental.renter_email === userEmail;

    const rentalCost = rental.total_amount ?? 0;
    const platformFee = typeof rental.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
    const securityDeposit = typeof rental.security_deposit === 'number' ? rental.security_deposit : 0;
    const totalPaid = typeof rental.total_paid === 'number' ? rental.total_paid : rentalCost + platformFee + securityDeposit;

    const accent = STATUS_COLORS[rental.status] ?? '#64748B';
    const isDownloading = downloadingId === rental.id;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: rental.id })}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <MaterialCommunityIcons name="package-variant-closed" size={28} color="#E2E8F0" />
            </View>
          )}

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: `${accent}15` }]}>
                <Text style={[styles.statusPillText, { color: accent }]}>
                  {STATUS_LABELS[rental.status] || rental.status}
                </Text>
              </View>
            </View>

            {/* Role badge */}
            <View style={[styles.roleBadge, { backgroundColor: isRenter ? '#EFF6FF' : '#F0FDF4' }]}>
              <Text style={[styles.roleBadgeText, { color: isRenter ? '#1D4ED8' : '#15803D' }]}>
                {isRenter ? 'You rented' : 'You rented out'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-month-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{formatDateRange(rental.start_date, rental.end_date)}</Text>
            </View>

            <View style={styles.priceRow}>
              <MaterialCommunityIcons name="currency-usd" size={14} color="#64748B" />
              <Text style={styles.amountText}>${totalPaid.toFixed(2)}</Text>
            </View>

            <Text style={styles.breakdownText} numberOfLines={1}>
              Rental ${rentalCost.toFixed(2)} • Fee ${platformFee.toFixed(2)} • Deposit ${securityDeposit.toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleDownloadReceipt(rental.id)}
          disabled={isDownloading}
          style={[styles.receiptButton, isDownloading && { opacity: 0.6 }]}
        >
          {isDownloading ? (
            <>
              <ActivityIndicator size="small" color="#111827" />
              <Text style={styles.receiptButtonText}>Downloading...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="download" size={18} color="#111827" />
              <Text style={styles.receiptButtonText}>Receipt</Text>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const selectedFilterLabel = FILTERS.find((filter) => filter.key === selectedFilter)?.label ?? 'All Rentals';

  return (
    <View style={styles.container}>
      <FlatList
        data={isLoading ? [] : filteredRentals}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              load(true);
            }}
          />
        }
        ListHeaderComponent={
          <>
            <GlobalHeader />

            <View style={styles.heroSection}>
              <Text style={styles.pageTitle}>Rental History</Text>
              <Text style={styles.pageSubtitle}>
                View all your completed rentals and download receipts
              </Text>

              <TextInput
                mode="outlined"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search rentals..."
                style={styles.searchInput}
                outlineStyle={styles.searchOutline}
                left={<TextInput.Icon icon="magnify" color="#94A3B8" />}
                theme={{ colors: { primary: '#CBD5E1', outline: '#E2E8F0' } }}
              />

              <Menu
                visible={isFilterMenuVisible}
                onDismiss={() => setIsFilterMenuVisible(false)}
                anchorPosition="bottom"
                contentStyle={styles.menuContent}
                anchor={
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsFilterMenuVisible(true)}
                    style={styles.filterButton}
                  >
                    <Text style={styles.filterButtonText}>{selectedFilterLabel}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#111827" />
                  </TouchableOpacity>
                }
              >
                {FILTERS.map((filter) => (
                  <Menu.Item
                    key={filter.key}
                    onPress={() => {
                      setSelectedFilter(filter.key);
                      setIsFilterMenuVisible(false);
                    }}
                    title={filter.label}
                  />
                ))}
              </Menu>
            </View>

            {isLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="file-search-outline" size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No rentals found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or switch the rental filter.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <View style={styles.footerWrap}>
            <Footer />
          </View>
        }
      />
      <AppBottomNavBar activeKey="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 0,
  },
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: typography.label,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 18,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  searchOutline: {
    borderRadius: 14,
    borderWidth: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  filterButtonText: {
    fontSize: typography.label,
    color: '#111827',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  loadingWrap: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 14,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  productTitle: {
    flex: 1,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: typography.small,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: typography.small,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: typography.caption,
    color: '#64748B',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  breakdownText: {
    fontSize: typography.small,
    lineHeight: 18,
    color: '#94A3B8',
  },
  receiptButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  receiptButtonText: {
    fontSize: typography.label,
    fontWeight: '700',
    color: '#111827',
  },
  emptyCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  emptyTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: typography.label,
    lineHeight: 22,
    textAlign: 'center',
    color: '#64748B',
  },
  footerWrap: {
    marginTop: 20,
  },
});
