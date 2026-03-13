import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getRentalRequests } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;

type TabKey = 'all' | 'pending' | 'approved' | 'active' | 'completed' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_COLOR: Record<RentalRequest['status'], string> = {
  pending: '#F59E0B',
  approved: '#3B82F6',
  rejected: '#EF4444',
  paid: '#8B5CF6',
  cancelled: '#6B7280',
  completed: '#10B981',
};

const STATUS_ICON: Record<RentalRequest['status'], string> = {
  pending: 'clock-outline',
  approved: 'check-circle-outline',
  rejected: 'close-circle-outline',
  paid: 'credit-card-check-outline',
  cancelled: 'cancel',
  completed: 'check-decagram',
};

const filterByTab = (rentals: RentalRequest[], tab: TabKey): RentalRequest[] => {
  if (tab === 'all') return rentals;
  if (tab === 'active') return rentals.filter((r) => r.status === 'approved' || r.status === 'paid');
  return rentals.filter((r) => r.status === tab);
};

export const RentalHistoryScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const load = useCallback(async (quiet = false) => {
    if (!user?.email) { setIsLoading(false); return; }
    if (!quiet) setIsLoading(true);
    try {
      const [asRenter, asOwner] = await Promise.all([
        getRentalRequests({ renter_email: user.email }),
        getRentalRequests({ owner_email: user.email }),
      ]);
      const all = [...asRenter, ...asOwner];
      const unique = Array.from(new Map(all.map((r) => [r.id, r])).values());
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setRentals(unique);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.email]);

  useEffect(() => { load(); }, [load]);

  const displayed = filterByTab(rentals, activeTab);

  const renderCard = ({ item }: { item: RentalRequest }) => {
    const isRenter = item.renter_email === user?.email;
    const color = STATUS_COLOR[item.status] ?? '#6B7280';
    const icon = STATUS_ICON[item.status] ?? 'circle-outline';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RentalDetail', { rentalId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: color + '18' }]}>
            <MaterialCommunityIcons name={icon as any} size={14} color={color} />
            <Text style={[styles.statusText, { color }]}>{item.status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.amount}>${item.total_amount?.toFixed(2) ?? '—'}</Text>
        </View>

        <View style={styles.cardRow}>
          <MaterialCommunityIcons name="calendar-range" size={14} color={colors.textSecondary} />
          <Text style={styles.cardMeta}>
            {new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' → '}
            {new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <MaterialCommunityIcons name={isRenter ? 'account-arrow-right' : 'account-arrow-left'} size={14} color={colors.textSecondary} />
          <Text style={styles.cardMeta} numberOfLines={1}>
            {isRenter ? `Owner: ${item.owner_email}` : `Renter: ${item.renter_email}`}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.cardId} numberOfLines={1}>ID: {item.id}</Text>
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>View Details</Text>
            <MaterialCommunityIcons name="chevron-right" size={14} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle}>My Rentals</Text>
        <TouchableOpacity onPress={() => load(true)} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status Tabs */}
      <FlatList
        horizontal
        data={TABS}
        keyExtractor={(t) => t.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
        renderItem={({ item: tab }) => {
          const count = filterByTab(rentals, tab.key).length;
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); load(true); }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No rentals found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'all' ? 'You have no rental activity yet.' : `No ${activeTab} rentals.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: { flex: 1, fontWeight: '700', color: '#0F172A' },
  refreshBtn: { padding: 6 },
  tabsContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  tabLabel: { fontSize: typography.small, fontWeight: '600', color: '#64748B' },
  tabLabelActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  tabBadgeTextActive: { color: '#FFFFFF' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  amount: { fontWeight: '700', color: '#0F172A', fontSize: typography.tabLabel },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardMeta: { color: '#64748B', fontSize: typography.small, flex: 1 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardId: { color: '#94A3B8', fontSize: 10, flex: 1 },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailsText: { color: colors.primary, fontSize: typography.small, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontWeight: '700', color: '#475569', fontSize: typography.tabLabel },
  emptySubtitle: { color: '#94A3B8', fontSize: typography.body, textAlign: 'center' },
});
