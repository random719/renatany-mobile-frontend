import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { api } from '../../services/api';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';
import { toast } from '../../store/toastStore';

type Route = RouteProp<RootStackParamList, 'ManageAvailability'>;

interface BlockedRange {
  id: string;
  blocked_start_date: string;
  blocked_end_date: string;
  reason: string;
}

const REASONS = [
  { value: 'personal_use', label: 'Personal Use' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
];

export const ManageAvailabilityScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { itemId, itemTitle } = route.params;

  const [blockedRanges, setBlockedRanges] = useState<BlockedRange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [blockReason, setBlockReason] = useState('personal_use');
  const [isBlocking, setIsBlocking] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const loadAvailability = useCallback(async () => {
    try {
      const res = await api.get(`/item-availability?item_id=${itemId}`);
      setBlockedRanges(res.data?.data || []);
    } catch {
      setBlockedRanges([]);
    }
  }, [itemId]);

  useEffect(() => {
    setIsLoading(true);
    loadAvailability().finally(() => setIsLoading(false));
  }, [loadAvailability]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAvailability();
    setRefreshing(false);
  }, [loadAvailability]);

  // Build set of all blocked date strings
  const blockedDateSet = useMemo(() => {
    const set = new Set<string>();
    blockedRanges.forEach((range) => {
      const start = new Date(range.blocked_start_date);
      const end = new Date(range.blocked_end_date);
      const cur = new Date(start);
      while (cur <= end) {
        set.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [blockedRanges]);

  // Calendar marked dates
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    // Blocked dates (red)
    blockedDateSet.forEach((ds) => {
      marks[ds] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: { backgroundColor: '#EF4444', borderRadius: 6 },
          text: { color: '#FFFFFF' },
        },
      };
    });

    // Selected dates (dark blue)
    selectedDates.forEach((ds) => {
      marks[ds] = {
        selected: true,
        customStyles: {
          container: { backgroundColor: colors.primary, borderRadius: 6 },
          text: { color: '#FFFFFF' },
        },
      };
    });

    return marks;
  }, [blockedDateSet, selectedDates]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d.toISOString().split('T')[0];
  }, [monthOffset]);

  const handleDayPress = useCallback(
    (day: { dateString: string }) => {
      const ds = day.dateString;
      // Don't allow selecting blocked dates
      if (blockedDateSet.has(ds)) return;
      // Don't allow past dates
      const today = new Date().toISOString().split('T')[0];
      if (ds < today) return;

      setSelectedDates((prev) =>
        prev.includes(ds) ? prev.filter((d) => d !== ds) : [...prev, ds].sort()
      );
    },
    [blockedDateSet]
  );

  const handleBlockDates = useCallback(async () => {
    if (selectedDates.length === 0) return;
    setIsBlocking(true);
    try {
      const results = await Promise.allSettled(
        selectedDates.map((ds) => {
          const start = new Date(ds);
          start.setHours(0, 0, 0, 0);
          const end = new Date(ds);
          end.setHours(23, 59, 59, 999);
          return api.post('/item-availability', {
            item_id: itemId,
            blocked_start_date: start.toISOString(),
            blocked_end_date: end.toISOString(),
            reason: blockReason,
          });
        })
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        toast.error(`Failed to block ${failures.length} date(s).`);
      } else {
        toast.success(`Blocked ${selectedDates.length} date${selectedDates.length !== 1 ? 's' : ''}.`);
      }
      setSelectedDates([]);
      await loadAvailability();
    } catch {
      toast.error('Failed to block dates.');
    } finally {
      setIsBlocking(false);
    }
  }, [selectedDates, blockReason, itemId, loadAvailability]);

  const handleUnblock = useCallback(
    async (id: string) => {
      try {
        await api.delete(`/item-availability/${id}`);
        await loadAvailability();
      } catch {
        toast.error('Failed to unblock date.');
      }
    },
    [loadAvailability]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.mainContainer}>
        <GlobalHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Manage Availability</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{itemTitle}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information-outline" size={18} color="#3B82F6" />
          <Text style={styles.infoText}>
            Tap dates on the calendar to select them, then block them for personal use or maintenance. Red dates are already blocked.
          </Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={currentMonth}
            onDayPress={handleDayPress}
            markingType="custom"
            markedDates={markedDates}
            onPressArrowLeft={(subtractMonth: () => void) => {
              subtractMonth();
              setMonthOffset((p) => p - 1);
            }}
            onPressArrowRight={(addMonth: () => void) => {
              addMonth();
              setMonthOffset((p) => p + 1);
            }}
            minDate={new Date().toISOString().split('T')[0]}
            theme={{
              todayTextColor: colors.primary,
              arrowColor: colors.primary,
              textDayFontFamily: typography.fontFamily,
              textMonthFontFamily: typography.fontFamily,
              textDayHeaderFontFamily: typography.fontFamily,
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 12,
            }}
          />
        </View>

        {/* Block Reason Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Block Reason</Text>
          <View style={styles.reasonRow}>
            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonChip, blockReason === r.value && styles.reasonChipActive]}
                onPress={() => setBlockReason(r.value)}
              >
                <Text style={[styles.reasonChipText, blockReason === r.value && styles.reasonChipTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Block Button */}
        <View style={styles.section}>
          <Button
            mode="contained"
            onPress={handleBlockDates}
            disabled={selectedDates.length === 0 || isBlocking}
            loading={isBlocking}
            style={styles.blockButton}
            labelStyle={styles.blockButtonLabel}
          >
            {isBlocking
              ? 'Blocking...'
              : `Block ${selectedDates.length} Date${selectedDates.length !== 1 ? 's' : ''}`}
          </Button>
        </View>

        {/* Blocked Periods List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Blocked Periods</Text>
          {blockedRanges.filter((r) => r.reason !== 'rented').length === 0 ? (
            <Text style={styles.emptyText}>No manually blocked dates.</Text>
          ) : (
            blockedRanges
              .filter((r) => r.reason !== 'rented')
              .map((range) => (
                <View key={range.id} style={styles.blockedItem}>
                  <View style={styles.blockedItemInfo}>
                    <Text style={styles.blockedItemDate}>
                      {formatDate(range.blocked_start_date)} – {formatDate(range.blocked_end_date)}
                    </Text>
                    <Text style={styles.blockedItemReason}>
                      {range.reason.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.unblockButton}
                    onPress={() =>
                      Alert.alert('Unblock Date', 'Remove this blocked period?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Unblock', style: 'destructive', onPress: () => handleUnblock(range.id) },
                      ])
                    }
                  >
                    <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>

        {/* Rented Periods (read-only) */}
        {blockedRanges.filter((r) => r.reason === 'rented').length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rented Periods</Text>
            {blockedRanges
              .filter((r) => r.reason === 'rented')
              .map((range) => (
                <View key={range.id} style={styles.rentedItem}>
                  <MaterialCommunityIcons name="handshake-outline" size={18} color="#10B981" />
                  <Text style={styles.rentedItemDate}>
                    {formatDate(range.blocked_start_date)} – {formatDate(range.blocked_end_date)}
                  </Text>
                </View>
              ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.fontFamily,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
    fontFamily: typography.fontFamily,
  },
  calendarContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
    marginBottom: 10,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: 13,
    color: '#475569',
    fontFamily: typography.fontFamily,
  },
  reasonChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blockButton: {
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  blockButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.fontFamily,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: typography.fontFamily,
  },
  blockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  blockedItemInfo: {
    flex: 1,
  },
  blockedItemDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: typography.fontFamily,
  },
  blockedItemReason: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: typography.fontFamily,
    marginTop: 2,
  },
  unblockButton: {
    padding: 4,
  },
  rentedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 8,
  },
  rentedItemDate: {
    fontSize: 14,
    color: '#065F46',
    fontFamily: typography.fontFamily,
  },
});
