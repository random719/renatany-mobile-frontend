import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import {
  getRentalExtensions,
  createRentalExtension,
  updateRentalExtension,
} from '../../services/rentalExtensionService';
import { toast } from '../../store/toastStore';
import { colors } from '../../theme';
import { RentalExtension } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RentalExtension'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  approved: { bg: '#ECFDF5', text: '#10B981' },
  declined: { bg: '#FEE2E2', text: '#EF4444' },
};

export const RentalExtensionScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rentalRequestId, currentEndDate, dailyRate, ownerEmail, isOwner } = route.params;
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

  const [extensions, setExtensions] = useState<RentalExtension[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [extraDays, setExtraDays] = useState('');
  const [message, setMessage] = useState('');

  const loadExtensions = useCallback(async () => {
    try {
      const data = await getRentalExtensions({ rental_request_id: rentalRequestId });
      setExtensions(data);
    } catch (error) {
      console.error('Error loading extensions:', error);
    }
  }, [rentalRequestId]);

  useEffect(() => {
    setIsLoading(true);
    loadExtensions().finally(() => setIsLoading(false));
  }, [loadExtensions]);

  const pendingExtension = extensions.find((e) => e.status === 'pending');

  const calculateNewEndDate = (): string => {
    const days = parseInt(extraDays) || 0;
    const endDate = new Date(currentEndDate);
    endDate.setDate(endDate.getDate() + days);
    return endDate.toISOString();
  };

  const additionalCost = (parseInt(extraDays) || 0) * dailyRate;

  const handleSubmitRequest = async () => {
    if (!userEmail) return;
    const days = parseInt(extraDays);
    if (!days || days < 1) {
      toast.warning('Please enter at least 1 extra day.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createRentalExtension({
        rental_request_id: rentalRequestId,
        requested_by_email: userEmail,
        new_end_date: calculateNewEndDate(),
        additional_cost: additionalCost,
        message: message.trim() || undefined,
      });

      toast.success('Your extension request has been sent to the owner.', () => { setExtraDays(''); setMessage(''); loadExtensions(); });
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to request extension.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveDecline = async (extensionId: string, status: 'approved' | 'declined') => {
    setIsSubmitting(true);
    try {
      await updateRentalExtension(extensionId, { status });
      toast.success(`Extension ${status}.`);
      loadExtensions();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || `Failed to ${status} extension.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav bottomNavActiveKey="none">
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout showBottomNav={false} keyboardAvoiding>
        <View style={styles.contentWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Rental Extension</Text>
          <Text style={styles.subtitle}>
            Current end date: {new Date(currentEndDate).toLocaleDateString()}
          </Text>

          {/* Existing Extensions */}
          {extensions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extension History</Text>
              {extensions.map((ext) => {
                const sc = STATUS_COLORS[ext.status] || STATUS_COLORS.pending;
                return (
                  <View key={ext.id} style={styles.extensionCard}>
                    <View style={styles.extensionCardHeader}>
                      <Text style={styles.extensionDate}>
                        New end: {new Date(ext.new_end_date).toLocaleDateString()}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.statusText, { color: sc.text }]}>
                          {ext.status.charAt(0).toUpperCase() + ext.status.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.extensionCost}>
                      Additional: ${ext.additional_cost.toFixed(2)}
                    </Text>
                    {ext.message && <Text style={styles.extensionMessage}>{ext.message}</Text>}
                    <Text style={styles.extensionMeta}>
                      Requested by: {ext.requested_by_email} on {new Date(ext.created_at).toLocaleDateString()}
                    </Text>

                    {/* Owner can approve/decline pending extensions */}
                    {isOwner && ext.status === 'pending' && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleApproveDecline(ext.id, 'approved')}
                          disabled={isSubmitting}
                        >
                          <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => handleApproveDecline(ext.id, 'declined')}
                          disabled={isSubmitting}
                        >
                          <MaterialCommunityIcons name="close" size={16} color="#EF4444" />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Request Extension Form (only for renter, no pending extension) */}
          {!isOwner && !pendingExtension && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Extension</Text>

              <Text style={styles.inputLabel}>Extra Days</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 3"
                placeholderTextColor="#9CA3AF"
                value={extraDays}
                onChangeText={setExtraDays}
                keyboardType="number-pad"
              />

              {parseInt(extraDays) > 0 && (
                <View style={styles.costPreview}>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>New end date</Text>
                    <Text style={styles.costValue}>{new Date(calculateNewEndDate()).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>Additional cost ({extraDays} days x ${dailyRate})</Text>
                    <Text style={styles.costValueBold}>${additionalCost.toFixed(2)}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>Message (optional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 80 }]}
                placeholder="Reason for extension..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, (isSubmitting || !extraDays || parseInt(extraDays) < 1) && styles.submitBtnDisabled]}
                onPress={handleSubmitRequest}
                disabled={isSubmitting || !extraDays || parseInt(extraDays) < 1}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="calendar-plus" size={20} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Request Extension</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {!isOwner && pendingExtension && (
            <View style={styles.pendingNote}>
              <MaterialCommunityIcons name="clock-outline" size={20} color="#D97706" />
              <Text style={styles.pendingNoteText}>
                You have a pending extension request. Please wait for the owner to respond.
              </Text>
            </View>
          )}
        </View>
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, maxWidth: 768, width: '100%', alignSelf: 'center' },
  loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 6 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A', marginBottom: 12 },
  extensionCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  extensionCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  extensionDate: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  extensionCost: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 },
  extensionMessage: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 4 },
  extensionMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8 },
  approveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 8 },
  declineBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 14, color: '#0F172A' },
  costPreview: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, marginTop: 12, gap: 6 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between' },
  costLabel: { fontSize: 13, color: '#374151' },
  costValue: { fontSize: 13, color: '#374151' },
  costValueBold: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 20 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pendingNote: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF3C7', padding: 16, borderRadius: 12 },
  pendingNoteText: { flex: 1, fontSize: 14, color: '#92400E', lineHeight: 20 },
});
