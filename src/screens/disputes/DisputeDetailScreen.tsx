import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { createDispute, getDisputeById } from '../../services/disputeService';
import { api } from '../../services/api';
import { colors, typography } from '../../theme';
import { Dispute } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'DisputeDetail'>;

const STATUS_COLOR: Record<Dispute['status'], string> = {
  open: '#F59E0B',
  under_review: '#3B82F6',
  resolved: '#10B981',
  closed: '#6B7280',
};

const REASONS = [
  'Item not as described',
  'Item damaged',
  'No-show',
  'Payment issue',
  'Other',
];

export const DisputeDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { disputeId } = route.params;
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const isNew = disputeId === 'new';

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);

  // Create form state
  const [rentalRequests, setRentalRequests] = useState<any[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, any>>({});
  const [isLoadingRentals, setIsLoadingRentals] = useState(isNew);
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [showRentalPicker, setShowRentalPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<Record<string, number>>({});

  const scrollToField = (field: string) => {
    setTimeout(() => {
      const y = fieldPositions.current[field];
      if (y !== undefined) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
      }
    }, 250);
  };

  // Fetch rental requests for dispute filing
  useEffect(() => {
    if (!isNew || !userEmail) return;
    (async () => {
      try {
        const [renterRes, ownerRes] = await Promise.all([
          api.get('/rental-requests', { params: { renter_email: userEmail } }).catch(() => ({ data: { data: [] } })),
          api.get('/rental-requests', { params: { owner_email: userEmail } }).catch(() => ({ data: { data: [] } })),
        ]);
        const renterReqs = renterRes.data?.data || [];
        const ownerReqs = ownerRes.data?.data || [];
        const all = [...renterReqs, ...ownerReqs];
        const unique = Array.from(new Map(all.map((r: any) => [r.id || r._id, r])).values());
        // Only show paid/completed rentals (eligible for disputes)
        const eligible = unique.filter((r: any) => ['paid', 'completed'].includes(r.status));
        setRentalRequests(eligible);

        // Fetch item titles
        const itemIds = [...new Set(eligible.map((r: any) => r.item_id).filter(Boolean))];
        if (itemIds.length > 0) {
          const itemsRes = await api.get('/items', { params: { ids: itemIds.join(',') } }).catch(() => ({ data: { data: [] } }));
          const fetched = itemsRes.data?.data || [];
          const map: Record<string, any> = {};
          fetched.forEach((item: any) => { map[item.id || item._id] = item; });
          setItemsMap(map);
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingRentals(false);
      }
    })();
  }, [isNew, userEmail]);

  useEffect(() => {
    if (!isNew) {
      (async () => {
        try {
          const data = await getDisputeById(disputeId);
          setDispute(data);
        } catch {
          // ignore
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [disputeId, isNew]);

  const selectedRental = rentalRequests.find((r: any) => (r.id || r._id) === selectedRentalId);
  const againstEmail = selectedRental
    ? (selectedRental.renter_email === userEmail ? selectedRental.owner_email : selectedRental.renter_email)
    : '';

  const getRentalLabel = (r: any) => {
    const id = r.id || r._id;
    const item = itemsMap[r.item_id];
    const itemTitle = item?.title || 'Unknown item';
    const date = new Date(r.created_date || r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${itemTitle} — ${date}`;
  };

  const handleSubmit = async () => {
    if (!selectedRentalId || !reason || !description.trim()) {
      Alert.alert('Missing fields', 'Please select a rental, reason, and provide a description.');
      return;
    }
    if (!userEmail) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createDispute({
        rental_request_id: selectedRentalId,
        filed_by_email: userEmail,
        against_email: againstEmail,
        reason,
        description: description.trim(),
      });
      Alert.alert('Dispute filed', 'Your dispute has been submitted and our team will review it shortly.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to file dispute.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isNew && isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>
            {isNew ? 'File a Dispute' : 'Dispute Details'}
          </Text>
        </View>

        {isNew ? (
          <>
            {/* Rental Request Picker */}
            <View style={styles.card} onLayout={(e) => { fieldPositions.current.rental = e.nativeEvent.layout.y; }}>
              <Text style={styles.sectionLabel}>Select Rental *</Text>
              {isLoadingRentals ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 12 }} />
              ) : rentalRequests.length === 0 ? (
                <View style={styles.emptyRentalsBox}>
                  <MaterialCommunityIcons name="inbox-outline" size={28} color="#94A3B8" />
                  <Text style={styles.emptyRentalsText}>No eligible rentals found. Only paid or completed rentals can be disputed.</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.reasonSelector}
                    onPress={() => setShowRentalPicker(!showRentalPicker)}
                  >
                    <Text style={selectedRentalId ? styles.reasonSelected : styles.reasonPlaceholder} numberOfLines={1}>
                      {selectedRental ? getRentalLabel(selectedRental) : 'Select a rental'}
                    </Text>
                    <MaterialCommunityIcons name={showRentalPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showRentalPicker && (
                    <View style={styles.reasonList}>
                      {rentalRequests.map((r: any) => {
                        const id = r.id || r._id;
                        return (
                          <TouchableOpacity
                            key={id}
                            style={[styles.reasonItem, selectedRentalId === id && styles.reasonItemActive]}
                            onPress={() => { setSelectedRentalId(id); setShowRentalPicker(false); }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.reasonItemText, selectedRentalId === id && styles.reasonItemTextActive]} numberOfLines={1}>
                                {getRentalLabel(r)}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                {r.status} · {r.renter_email === userEmail ? `Owner: ${r.owner_email}` : `Renter: ${r.renter_email}`}
                              </Text>
                            </View>
                            {selectedRentalId === id && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
              {selectedRental && (
                <View style={styles.againstInfoBox}>
                  <Text style={styles.againstInfoLabel}>Dispute against:</Text>
                  <Text style={styles.againstInfoValue}>{againstEmail}</Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Reason *</Text>
              <TouchableOpacity
                style={styles.reasonSelector}
                onPress={() => setShowReasonPicker(!showReasonPicker)}
              >
                <Text style={reason ? styles.reasonSelected : styles.reasonPlaceholder}>
                  {reason || 'Select a reason'}
                </Text>
                <MaterialCommunityIcons
                  name={showReasonPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {showReasonPicker && (
                <View style={styles.reasonList}>
                  {REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.reasonItem, reason === r && styles.reasonItemActive]}
                      onPress={() => { setReason(r); setShowReasonPicker(false); }}
                    >
                      <Text style={[styles.reasonItemText, reason === r && styles.reasonItemTextActive]}>
                        {r}
                      </Text>
                      {reason === r && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card} onLayout={(e) => { fieldPositions.current.description = e.nativeEvent.layout.y; }}>
              <Text style={styles.sectionLabel}>Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder="Describe the issue in detail..."
                multiline
                numberOfLines={4}
                style={styles.input}
                onFocus={() => scrollToField('description')}
              />
            </View>

            <View onLayout={(e) => { fieldPositions.current.submit = e.nativeEvent.layout.y; }} />
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
              icon="flag-outline"
            >
              Submit Dispute
            </Button>
          </>
        ) : dispute ? (
          <>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[dispute.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[dispute.status] }]}>
                    {dispute.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(dispute.created_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Details</Text>
              <InfoRow label="Rental ID" value={dispute.rental_request_id} />
              <InfoRow label="Filed by" value={dispute.filed_by_email} />
              <InfoRow label="Against" value={dispute.against_email} />
              <InfoRow label="Reason" value={dispute.reason} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descText}>{dispute.description}</Text>
            </View>

            {dispute.decision && (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>Resolution</Text>
                <InfoRow label="Decision" value={dispute.decision.replace(/_/g, ' ')} />
                {dispute.resolution && <Text style={styles.descText}>{dispute.resolution}</Text>}
                {dispute.refund_to_renter !== undefined && (
                  <InfoRow label="Refund to renter" value={`$${dispute.refund_to_renter?.toFixed(2)}`} />
                )}
              </View>
            )}

            {dispute.admin_notes && (
              <View style={[styles.card, styles.adminCard]}>
                <Text style={styles.sectionLabel}>Admin Notes</Text>
                <Text style={styles.descText}>{dispute.admin_notes}</Text>
              </View>
            )}

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              contentStyle={styles.submitBtnContent}
            >
              Close
            </Button>
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.notFoundText}>Dispute not found.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 200 },
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
  adminCard: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  sectionLabel: { fontWeight: '700', color: '#0F172A', fontSize: typography.body, marginBottom: 12 },
  input: { marginBottom: 4 },
  reasonSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
  },
  reasonPlaceholder: { color: '#94A3B8', fontSize: typography.body },
  reasonSelected: { color: '#0F172A', fontWeight: '600', fontSize: typography.body },
  reasonList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reasonItemActive: { backgroundColor: '#EFF6FF' },
  reasonItemText: { color: '#475569', fontSize: typography.body },
  reasonItemTextActive: { color: colors.primary, fontWeight: '600' },
  submitBtn: { marginHorizontal: 16, backgroundColor: colors.primary, borderRadius: 12 },
  closeBtn: { marginHorizontal: 16, borderColor: colors.primary, borderRadius: 12 },
  submitBtnContent: { paddingVertical: 6 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { fontWeight: '700', fontSize: typography.small },
  dateText: { color: '#64748B', fontSize: typography.small },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: { color: '#64748B', fontSize: typography.body },
  infoValue: { color: '#0F172A', fontWeight: '600', fontSize: typography.body, flex: 1, textAlign: 'right', marginLeft: 8 },
  descText: { color: '#475569', lineHeight: 22, fontSize: typography.body },
  notFoundText: { color: '#94A3B8', fontSize: typography.body },
  emptyRentalsBox: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  emptyRentalsText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  againstInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  againstInfoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  againstInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
});
