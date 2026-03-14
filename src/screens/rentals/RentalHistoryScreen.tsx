import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Menu, Text, TextInput } from 'react-native-paper';
import { AppBottomNavBar } from '../../components/common/AppBottomNavBar';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { getRentalRequests } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type FilterKey = 'all' | 'completed' | 'active' | 'pending' | 'cancelled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Rentals' },
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

const matchesFilter = (rental: RentalRequest, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'active') return rental.status === 'approved' || rental.status === 'paid';
  return rental.status === filter;
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

const getDisplayTitle = (rental: RentalRequest) => {
  const candidate = (rental as RentalRequest & {
    item_title?: string;
    listing_title?: string;
    title?: string;
    productName?: string;
  }).item_title
    || (rental as any).listing_title
    || (rental as any).title
    || (rental as any).productName;

  if (candidate) return candidate;
  if (rental.item_id) return rental.item_id.replace(/[-_]/g, ' ');
  return 'Product';
};

export const RentalHistoryScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }
    if (!quiet) setIsLoading(true);

    try {
      const [asRenter, asOwner] = await Promise.all([
        getRentalRequests({ renter_email: user.email }),
        getRentalRequests({ owner_email: user.email }),
      ]);
      const merged = [...asRenter, ...asOwner];
      const unique = Array.from(new Map(merged.map((rental) => [rental.id, rental])).values());
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setRentals(unique);
    } catch {
      // Keep the page stable even if the API fails.
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRentals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rentals.filter((rental) => {
      if (!matchesFilter(rental, selectedFilter)) return false;
      if (!query) return true;

      const searchBase = [
        rental.id,
        rental.item_id,
        rental.renter_email,
        rental.owner_email,
        getDisplayTitle(rental),
        STATUS_LABELS[rental.status] || rental.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchBase.includes(query);
    });
  }, [rentals, searchQuery, selectedFilter]);

  const renderCard = ({ item }: { item: RentalRequest }) => {
    const title = getDisplayTitle(item);
    const rentalFee = Math.max(
      0,
      (item.total_amount ?? 0) - (item.platform_fee ?? 0) - (item.security_deposit ?? 0)
    );
    const accent = STATUS_COLORS[item.status] ?? '#64748B';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <View style={styles.thumbnail}>
            <MaterialCommunityIcons name="package-variant-closed" size={28} color="#E2E8F0" />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.productTitle} numberOfLines={1}>
                {title}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: `${accent}15` }]}>
                <Text style={[styles.statusPillText, { color: accent }]}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-month-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{formatDateRange(item.start_date, item.end_date)}</Text>
            </View>

            <View style={styles.priceRow}>
              <MaterialCommunityIcons name="currency-usd" size={14} color="#64748B" />
              <Text style={styles.amountText}>${(item.total_amount ?? 0).toFixed(2)}</Text>
            </View>

            <Text style={styles.breakdownText} numberOfLines={1}>
              Rental ${rentalFee.toFixed(2)} • Fee ${(item.platform_fee ?? 0).toFixed(2)} • Deposit ${(item.security_deposit ?? 0).toFixed(2)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
          style={styles.receiptButton}
        >
          <MaterialCommunityIcons name="download" size={18} color="#111827" />
          <Text style={styles.receiptButtonText}>Receipt</Text>
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
    marginBottom: 8,
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
