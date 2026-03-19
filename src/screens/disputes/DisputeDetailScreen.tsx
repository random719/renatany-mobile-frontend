import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { useI18n } from '../../i18n';
import { createDispute, getDisputeById } from '../../services/disputeService';
import { api } from '../../services/api';
import { uploadFile } from '../../services/listingService';
import { toast } from '../../store/toastStore';
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

const REASONS = ['item_damaged', 'item_not_returned', 'item_not_as_described', 'payment_issue', 'other'] as const;

export const DisputeDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { disputeId } = route.params;
  const { language, t } = useI18n();
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const isNew = disputeId === 'new';
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

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
  const [evidenceFiles, setEvidenceFiles] = useState<Array<{ name: string; uri: string; uploadedUrl: string }>>([]);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
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
    const itemTitle = item?.title || t('disputeDetail.unknownItem');
    const date = new Date(r.created_date || r.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    return `${itemTitle} — ${date}`;
  };

  const handlePickEvidence = async () => {
    try {
      setIsUploadingEvidence(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uploaded = await Promise.all(
        result.assets.map(async (asset) => {
          const uploadedUrl = await uploadFile(asset.uri, 'image');
          return {
            name: asset.name || `evidence-${Date.now()}.jpg`,
            uri: asset.uri,
            uploadedUrl,
          };
        })
      );
      setEvidenceFiles((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error(t('disputeDetail.addEvidenceFailed'));
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const removeEvidence = (indexToRemove: number) => {
    setEvidenceFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async () => {
    if (!selectedRentalId || !reason || !description.trim()) {
      toast.warning(t('disputeDetail.validation'));
      return;
    }
    if (!userEmail) {
      toast.error(t('disputeDetail.loginRequired'));
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
        evidence_urls: evidenceFiles.map((file) => file.uploadedUrl).filter(Boolean),
      });
      toast.success(t('disputeDetail.submitted'), () => navigation.goBack());
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('disputeDetail.submitFailed');
      toast.error(msg);
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
            {isNew ? t('disputeDetail.fileTitle') : t('disputeDetail.detailsTitle')}
          </Text>
        </View>

        {isNew ? (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <MaterialCommunityIcons name="alert-outline" size={22} color="#C2410C" />
              </View>
              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{t('disputeDetail.heroTitle')}</Text>
                <Text style={styles.heroText}>{t('disputeDetail.heroText')}</Text>
              </View>
            </View>

            {/* Rental Request Picker */}
            <View style={styles.card} onLayout={(e) => { fieldPositions.current.rental = e.nativeEvent.layout.y; }}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>{t('disputeDetail.selectRental')}</Text>
                  <Text style={styles.sectionHint}>{t('disputeDetail.rentalHint')}</Text>
                </View>
                <MaterialCommunityIcons name="calendar-check-outline" size={20} color="#64748B" />
              </View>
              {isLoadingRentals ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 12 }} />
              ) : rentalRequests.length === 0 ? (
                <View style={styles.emptyRentalsBox}>
                  <MaterialCommunityIcons name="inbox-outline" size={28} color="#94A3B8" />
                  <Text style={styles.emptyRentalsText}>{t('disputeDetail.noEligibleRentals')}</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.reasonSelector}
                    onPress={() => setShowRentalPicker(!showRentalPicker)}
                  >
                    <Text style={selectedRentalId ? styles.reasonSelected : styles.reasonPlaceholder} numberOfLines={1}>
                      {selectedRental ? getRentalLabel(selectedRental) : t('disputeDetail.selectRentalPlaceholder')}
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
                                {t(`rentalHistory.status.${r.status}`)} · {r.renter_email === userEmail ? t('disputeDetail.ownerLabel', { email: r.owner_email }) : t('disputeDetail.renterLabel', { email: r.renter_email })}
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
                <View style={styles.selectedRentalCard}>
                  <View style={styles.selectedRentalTop}>
                    <View style={styles.selectedRentalIcon}>
                      <MaterialCommunityIcons name="cube-outline" size={18} color="#1D4ED8" />
                    </View>
                    <View style={styles.selectedRentalContent}>
                      <Text style={styles.selectedRentalTitle}>{itemsMap[selectedRental.item_id]?.title || t('disputeDetail.selectedRental')}</Text>
                      <Text style={styles.selectedRentalMeta}>
                        {t(`rentalHistory.status.${selectedRental.status}`).toUpperCase()} · {new Date(selectedRental.start_date || selectedRental.created_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        {selectedRental.end_date ? ` - ${new Date(selectedRental.end_date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.againstInfoBox}>
                    <Text style={styles.againstInfoLabel}>{t('disputeDetail.disputeAgainst')}</Text>
                    <Text style={styles.againstInfoValue}>{againstEmail}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>{t('disputeDetail.reasonLabel')}</Text>
                  <Text style={styles.sectionHint}>{t('disputeDetail.reasonHint')}</Text>
                </View>
                <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#64748B" />
              </View>
              <TouchableOpacity
                style={styles.reasonSelector}
                onPress={() => setShowReasonPicker(!showReasonPicker)}
              >
                <Text style={reason ? styles.reasonSelected : styles.reasonPlaceholder}>
                  {reason ? t(`disputeDetail.reasons.${reason}`) : t('disputeDetail.reasonPlaceholder')}
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
                        {t(`disputeDetail.reasons.${r}`)}
                      </Text>
                      {reason === r && <MaterialCommunityIcons name="check" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card} onLayout={(e) => { fieldPositions.current.description = e.nativeEvent.layout.y; }}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>{t('disputeDetail.descriptionLabel')}</Text>
                  <Text style={styles.sectionHint}>{t('disputeDetail.descriptionHint')}</Text>
                </View>
                <MaterialCommunityIcons name="text-box-outline" size={20} color="#64748B" />
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                placeholder={t('disputeDetail.descriptionPlaceholder')}
                multiline
                numberOfLines={6}
                style={styles.input}
                onFocus={() => scrollToField('description')}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionLabel}>{t('disputeDetail.additionalEvidence')}</Text>
                  <Text style={styles.sectionHint}>{t('disputeDetail.additionalEvidenceHint')}</Text>
                </View>
                <MaterialCommunityIcons name="image-multiple-outline" size={20} color="#64748B" />
              </View>

              <TouchableOpacity
                style={[styles.uploadButton, isUploadingEvidence && styles.uploadButtonDisabled]}
                onPress={handlePickEvidence}
                disabled={isUploadingEvidence}
              >
                {isUploadingEvidence ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="upload-outline" size={18} color={colors.primary} />
                )}
                <Text style={styles.uploadButtonText}>
                  {isUploadingEvidence ? t('disputeDetail.uploading') : t('disputeDetail.addEvidence')}
                </Text>
              </TouchableOpacity>

              {evidenceFiles.length > 0 ? (
                <View style={styles.evidenceGrid}>
                  {evidenceFiles.map((file, index) => (
                    <View key={`${file.uploadedUrl}-${index}`} style={styles.evidenceCard}>
                      <Image source={{ uri: file.uri }} style={styles.evidenceImage} />
                      <TouchableOpacity style={styles.evidenceRemove} onPress={() => removeEvidence(index)}>
                        <MaterialCommunityIcons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyEvidenceBox}>
                  <MaterialCommunityIcons name="image-off-outline" size={24} color="#94A3B8" />
                  <Text style={styles.emptyEvidenceText}>{t('disputeDetail.noEvidence')}</Text>
                </View>
              )}
            </View>

            <View style={styles.noteCard}>
              <MaterialCommunityIcons name="information-outline" size={18} color="#C2410C" />
              <Text style={styles.noteText}>
                {t('disputeDetail.infoNote')}
              </Text>
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
              {t('disputeDetail.submit')}
            </Button>
          </>
        ) : dispute ? (
          <>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[dispute.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[dispute.status] }]}>
                    {t(`disputes.status.${dispute.status}`).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(dispute.created_date).toLocaleDateString(locale, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('disputeDetail.details')}</Text>
              <InfoRow label={t('disputeDetail.rentalId')} value={dispute.rental_request_id} />
              <InfoRow label={t('disputeDetail.filedBy')} value={dispute.filed_by_email} />
              <InfoRow label={t('disputeDetail.against')} value={dispute.against_email} />
              <InfoRow label={t('disputeDetail.reason')} value={t(`disputeDetail.reasons.${dispute.reason}`)} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('disputeDetail.description')}</Text>
              <Text style={styles.descText}>{dispute.description}</Text>
            </View>

            {dispute.decision && (
              <View style={styles.card}>
              <Text style={styles.sectionLabel}>{t('disputeDetail.resolution')}</Text>
                <InfoRow
                  label={t('disputeDetail.decision')}
                  value={t(`adminDisputes.${dispute.decision === 'favor_renter' ? 'favorRenter' : dispute.decision === 'favor_owner' ? 'favorOwner' : 'split'}`)}
                />
                {dispute.resolution && <Text style={styles.descText}>{dispute.resolution}</Text>}
                {dispute.refund_to_renter !== undefined && (
                  <InfoRow label={t('disputeDetail.refundToRenter')} value={`$${dispute.refund_to_renter?.toFixed(2)}`} />
                )}
              </View>
            )}

            {dispute.admin_notes && (
              <View style={[styles.card, styles.adminCard]}>
                <Text style={styles.sectionLabel}>{t('disputeDetail.adminNotes')}</Text>
                <Text style={styles.descText}>{dispute.admin_notes}</Text>
              </View>
            )}

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.closeBtn}
              contentStyle={styles.submitBtnContent}
            >
              {t('disputeDetail.close')}
            </Button>
          </>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.notFoundText}>{t('disputeDetail.notFound')}</Text>
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
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: { flex: 1, gap: 4 },
  heroTitle: { color: '#9A3412', fontWeight: '800', fontSize: typography.body },
  heroText: { color: '#9A3412', fontSize: typography.small, lineHeight: 18 },
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionHint: { color: '#64748B', fontSize: typography.small, lineHeight: 18 },
  input: { marginBottom: 4, backgroundColor: '#FFFFFF' },
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
  selectedRentalCard: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  selectedRentalTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  selectedRentalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRentalContent: { flex: 1 },
  selectedRentalTitle: { color: '#0F172A', fontWeight: '700', fontSize: typography.body },
  selectedRentalMeta: { color: '#64748B', fontSize: typography.small, marginTop: 2 },
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
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  againstInfoLabel: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  againstInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  uploadButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  uploadButtonDisabled: { opacity: 0.7 },
  uploadButtonText: { color: colors.primary, fontWeight: '700', fontSize: typography.body },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  evidenceCard: {
    width: 92,
    height: 92,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  evidenceImage: { width: '100%', height: '100%' },
  evidenceRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEvidenceBox: {
    marginTop: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  emptyEvidenceText: { color: '#64748B', fontSize: typography.small },
  noteCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noteText: {
    flex: 1,
    color: '#9A3412',
    fontSize: typography.small,
    lineHeight: 18,
  },
});
