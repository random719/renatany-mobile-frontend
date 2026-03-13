import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { createDispute, getDisputeById } from '../../services/disputeService';
import { useAuthStore } from '../../store/authStore';
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
  const { user } = useAuthStore();
  const isNew = disputeId === 'new';

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);

  // Create form state
  const [rentalRequestId, setRentalRequestId] = useState('');
  const [againstEmail, setAgainstEmail] = useState('');
  const [reason, setReason] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!rentalRequestId.trim() || !againstEmail.trim() || !reason || !description.trim()) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    if (!user?.email) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createDispute({
        rental_request_id: rentalRequestId.trim(),
        filed_by_email: user.email,
        against_email: againstEmail.trim(),
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Rental Request ID *</Text>
              <TextInput
                value={rentalRequestId}
                onChangeText={setRentalRequestId}
                mode="outlined"
                placeholder="Enter the rental request ID"
                style={styles.input}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Against (email) *</Text>
              <TextInput
                value={againstEmail}
                onChangeText={setAgainstEmail}
                mode="outlined"
                placeholder="owner@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />
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

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Description *</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder="Describe the issue in detail..."
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            </View>

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
});
