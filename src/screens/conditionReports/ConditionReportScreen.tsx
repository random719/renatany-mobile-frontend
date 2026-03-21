import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { useI18n } from '../../i18n';
import {
  getConditionReports,
  createConditionReport,
} from '../../services/conditionReportService';
import { uploadFile } from '../../services/listingService';
import { getRentalRequestById } from '../../services/rentalService';
import { toast } from '../../store/toastStore';
import { colors } from '../../theme';
import { ConditionReport, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { getConditionReportRules } from '../../utils/conditionReportRules';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ConditionReport'>;

const SEVERITY_OPTIONS = [
  { value: 'minor' as const, color: '#F59E0B', icon: 'alert-circle-outline' },
  { value: 'moderate' as const, color: '#F97316', icon: 'alert' },
  { value: 'severe' as const, color: '#EF4444', icon: 'alert-octagon' },
];

const REPORT_THEME = {
  pickup: {
    tint: '#EFF6FF',
    border: '#BFDBFE',
    icon: '#2563EB',
    text: '#1D4ED8',
  },
  return: {
    tint: '#F5F3FF',
    border: '#DDD6FE',
    icon: '#7C3AED',
    text: '#6D28D9',
  },
} as const;

export const ConditionReportScreen = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const route = useRoute<Route>();
  const { rentalRequestId, reportType } = route.params;
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const normalizedUserEmail = userEmail?.toLowerCase();

  const [existingReports, setExistingReports] = useState<ConditionReport[]>([]);
  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [damages, setDamages] = useState<
    { severity: 'minor' | 'moderate' | 'severe'; description: string; photo_url?: string }[]
  >([]);
  const [showAddDamage, setShowAddDamage] = useState(false);
  const [newDamageSeverity, setNewDamageSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');
  const [newDamageDescription, setNewDamageDescription] = useState('');
  const [signature, setSignature] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const [reports, rentalRequest] = await Promise.all([
        getConditionReports({ rental_request_id: rentalRequestId }),
        getRentalRequestById(rentalRequestId),
      ]);
      setExistingReports(reports);
      setRental(rentalRequest);
    } catch (error) {
      console.error('Error loading condition reports:', error);
    }
  }, [rentalRequestId]);

  useEffect(() => {
    setIsLoading(true);
    loadReports().finally(() => setIsLoading(false));
  }, [loadReports]);

  const existingReport = existingReports.find(
    (r) => r.report_type === reportType && r.reported_by_email?.toLowerCase() === normalizedUserEmail,
  );
  const hasExistingReport = !!existingReport;
  const rules = rental ? getConditionReportRules(rental, existingReports, userEmail) : null;
  const canCreateReport = reportType === 'pickup'
    ? rules?.canCreatePickupReport
    : rules?.canCreateReturnReport;
  const blockedMessage = reportType === 'pickup'
    ? rules?.pickupStatusMessage
    : rules?.returnStatusMessage;
  const reportTheme = REPORT_THEME[reportType];
  const reportTitle = reportType === 'pickup'
    ? t('conditionReport.pickupTitle')
    : t('conditionReport.returnTitle');
  const reportSubtitle = reportType === 'pickup'
    ? t('conditionReport.pickupSubtitle')
    : t('conditionReport.returnSubtitle');
  const reportTimestamp = existingReport
    ? new Date(existingReport.created_date).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : null;

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsUploading(true);
      setUploadError(null);
      setUploadStatus(t('conditionReport.uploading'));
      try {
        const uploadedUrls = await Promise.all(
          result.assets.map((asset) => uploadFile(asset as any, 'image'))
        );
        setPhotos((prev) => [...prev, ...uploadedUrls]);
        setUploadStatus(null);
      } catch (error: any) {
        setUploadStatus(null);
        setUploadError(error?.message || t('conditionReport.uploadPhotosFailed'));
        toast.error(error?.message || t('conditionReport.uploadPhotosFailed'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning(t('conditionReport.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsUploading(true);
      setUploadError(null);
      setUploadStatus(t('conditionReport.uploading'));
      try {
        const asset = result.assets[0];
        const url = await uploadFile(asset as any, 'image');
        setPhotos((prev) => [...prev, url]);
        setUploadStatus(null);
      } catch (error: any) {
        setUploadStatus(null);
        setUploadError(error?.message || t('conditionReport.uploadPhotoFailed'));
        toast.error(error?.message || t('conditionReport.uploadPhotoFailed'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const addDamage = () => {
    if (!newDamageDescription.trim()) {
      toast.warning(t('conditionReport.describeDamage'));
      return;
    }
    setDamages((prev) => [
      ...prev,
      { severity: newDamageSeverity, description: newDamageDescription.trim() },
    ]);
    setNewDamageDescription('');
    setNewDamageSeverity('minor');
    setShowAddDamage(false);
  };

  const removeDamage = (index: number) => {
    setDamages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!userEmail) return;

    if (photos.length === 0) {
      toast.warning(t('conditionReport.addPhotoRequired'));
      return;
    }

    if (!signature.trim()) {
      toast.warning(t('conditionReport.signatureRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await createConditionReport({
        rental_request_id: rentalRequestId,
        report_type: reportType,
        reported_by_email: userEmail,
        condition_photos: photos,
        notes: notes.trim() || undefined,
        damages_reported: damages.length > 0 ? damages : undefined,
        signature: signature.trim(),
      });

      toast.success(t('conditionReport.reportSubmitted', { type: reportType }), () => navigation.goBack());
    } catch (error: any) {
      const msg = error?.response?.data?.error || t('conditionReport.submitFailed');
      toast.error(msg);
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

  if (!rental) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav={false}>
          <View style={styles.contentWrapper}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{reportTitle}</Text>
            <Text style={styles.subtitle}>{t('conditionReport.backLoadFailed')}</Text>
          </View>
        </ScreenLayout>
      </View>
    );
  }

  // Show existing report if already submitted
  if (hasExistingReport) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav bottomNavActiveKey="none">
          <View style={styles.contentWrapper}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            <View style={[styles.reportShell, { backgroundColor: reportTheme.tint, borderColor: reportTheme.border }]}>
              <View style={styles.reportTopRow}>
                <View style={styles.reportHeadingRow}>
                  <MaterialCommunityIcons name="camera-outline" size={18} color={reportTheme.icon} />
                  <Text style={styles.reportHeadingText}>{reportTitle}</Text>
                </View>
                {reportTimestamp ? <Text style={styles.reportTimestamp}>{reportTimestamp}</Text> : null}
              </View>

              <View style={styles.submittedBadge}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
                <Text style={styles.submittedText}>{t('conditionReport.submitted')}</Text>
              </View>

              {existingReport.notes ? (
                <Text style={styles.reportNotes}>{existingReport.notes}</Text>
              ) : null}

              {existingReport.damages_reported.length > 0 && (
                <View style={styles.displaySection}>
                  <View style={styles.displaySectionHeader}>
                    <MaterialCommunityIcons name="alert-outline" size={16} color="#EA580C" />
                    <Text style={styles.displaySectionTitle}>{t('conditionReport.damagesReported')}</Text>
                  </View>
                  {existingReport.damages_reported.map((d, i) => {
                    const damageTone = SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color || '#999999';
                    return (
                      <View key={i} style={styles.displayDamageCard}>
                        <View style={styles.displayDamageHeader}>
                          <Text style={styles.displayDamageDesc}>{d.description}</Text>
                          <View style={[styles.displaySeverityPill, { backgroundColor: `${damageTone}20`, borderColor: `${damageTone}40` }]}>
                            <Text style={[styles.displaySeverityText, { color: damageTone }]}>
                              {t(`conditionReport.severity.${d.severity}`)}
                            </Text>
                          </View>
                        </View>
                        {d.photo_url ? (
                          <Image source={{ uri: d.photo_url }} style={styles.displayDamagePhoto} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}

              {existingReport.condition_photos.length > 0 && (
                <View style={styles.displaySection}>
                  <Text style={styles.displaySectionTitle}>{t('conditionReport.photos')}</Text>
                  <View style={styles.photoGrid}>
                    {existingReport.condition_photos.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.displayPhoto} />
                    ))}
                  </View>
                </View>
              )}

              {existingReport.signature ? (
                <View style={styles.displaySection}>
                  <Text style={styles.displaySectionTitle}>{t('conditionReport.signatureLabel')}</Text>
                  <View style={styles.displayValueBox}>
                    <Text style={styles.displayValueText}>{existingReport.signature}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.reportFooter}>
                <Text style={styles.reportFooterText}>
                  {t('conditionReport.submittedOn', { date: new Date(existingReport.created_date).toLocaleDateString() })}
                </Text>
                <Text style={styles.reportFooterText}>{existingReport.reported_by_email}</Text>
              </View>
            </View>
          </View>
        </ScreenLayout>
      </View>
    );
  }

  if (!canCreateReport) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav={false}>
          <View style={styles.contentWrapper}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
              <Text style={styles.backText}>{t('common.back')}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{reportTitle}</Text>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information-outline" size={22} color="#2563EB" />
              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>{t('conditionReport.notAvailableYet')}</Text>
                <Text style={styles.infoCardText}>
                  {blockedMessage || t('conditionReport.unavailableMessage')}
                </Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>{t('conditionReport.rentalStatus')}</Text>
              <Text style={styles.metaValue}>{rental.status}</Text>
              <Text style={styles.metaLabel}>{t('conditionReport.pickupReports')}</Text>
              <Text style={styles.metaValue}>{rules?.pickupReports.length || 0}/2</Text>
              <Text style={styles.metaLabel}>{t('conditionReport.returnReports')}</Text>
              <Text style={styles.metaValue}>{rules?.returnReports.length || 0}/2</Text>
            </View>
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
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <View style={[styles.formShell, { backgroundColor: reportTheme.tint, borderColor: reportTheme.border }]}>
            <View style={styles.reportHeadingRow}>
              <MaterialCommunityIcons name="camera-outline" size={20} color={reportTheme.icon} />
              <Text style={styles.formHeadingText}>{reportTitle}</Text>
            </View>
            <Text style={styles.subtitle}>{reportSubtitle}</Text>

            <View style={styles.inlineInfoCard}>
              <MaterialCommunityIcons name="information-outline" size={18} color={reportTheme.icon} />
              <Text style={[styles.inlineInfoText, { color: reportTheme.text }]}>{reportSubtitle}</Text>
            </View>

            {uploadError ? (
              <View style={styles.errorCard}>
                <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#B91C1C" />
                <View style={styles.errorCardBody}>
                  <Text style={styles.errorCardTitle}>{t('conditionReport.uploadErrorTitle')}</Text>
                  <Text style={styles.errorCardText}>{uploadError}</Text>
                </View>
              </View>
            ) : null}

            {uploadStatus ? (
              <View style={styles.infoCard}>
                <MaterialCommunityIcons name="loading" size={22} color="#2563EB" />
                <View style={styles.infoCardBody}>
                  <Text style={styles.infoCardTitle}>{t('conditionReport.uploading')}</Text>
                  <Text style={styles.infoCardText}>{uploadStatus}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>
                {t('conditionReport.photos')} <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.sectionHint}>{t('conditionReport.requiredPhotosHint')}</Text>

              <View style={styles.photoActionRow}>
                <TouchableOpacity style={[styles.photoActionButton, isUploading && styles.addPhotoBtnDisabled]} onPress={takePhoto} disabled={isUploading}>
                  <MaterialCommunityIcons name="camera-outline" size={18} color="#0F172A" />
                  <Text style={styles.photoActionText}>{t('conditionReport.camera')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.photoActionButton, isUploading && styles.addPhotoBtnDisabled]} onPress={pickImages} disabled={isUploading}>
                  <MaterialCommunityIcons name="image-outline" size={18} color="#0F172A" />
                  <Text style={styles.photoActionText}>{t('conditionReport.gallery')}</Text>
                </TouchableOpacity>
              </View>

              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((url, i) => (
                    <View key={i} style={styles.photoGridItem}>
                      <Image source={{ uri: url }} style={styles.displayPhoto} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                        <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {isUploading ? (
                    <View style={[styles.photoGridItem, styles.uploadingTile]}>
                      <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                  ) : null}
                </View>
              )}

              {!photos.length && isUploading ? (
                <View style={styles.singleUploadState}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.singleUploadText}>{t('conditionReport.uploading')}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>{t('conditionReport.notes')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('conditionReport.notesPlaceholder')}
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('conditionReport.damages')}</Text>
                <TouchableOpacity style={styles.secondaryDamageBtn} onPress={() => setShowAddDamage(true)}>
                  <Text style={styles.secondaryDamageBtnText}>{t('conditionReport.addDamage')}</Text>
                </TouchableOpacity>
              </View>

              {damages.length === 0 ? (
                <Text style={styles.noDamagesText}>{t('conditionReport.noDamages')}</Text>
              ) : (
                damages.map((d, i) => (
                  <View key={i} style={styles.displayDamageCard}>
                    <View style={styles.displayDamageHeader}>
                      <Text style={styles.displayDamageDesc}>{d.description}</Text>
                      <View
                        style={[
                          styles.displaySeverityPill,
                          {
                            backgroundColor: `${SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color || '#999999'}20`,
                            borderColor: `${SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color || '#999999'}40`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.displaySeverityText,
                            { color: SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color || '#999999' },
                          ]}
                        >
                          {t(`conditionReport.severity.${d.severity}`)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.inlineRemoveBtn} onPress={() => removeDamage(i)}>
                      <Text style={styles.inlineRemoveText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>
                {t('conditionReport.signatureLabel')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.signatureRow}>
                <TextInput
                  style={styles.signatureInput}
                  placeholder={t('conditionReport.signaturePlaceholder')}
                  placeholderTextColor="#9CA3AF"
                  value={signature}
                  onChangeText={setSignature}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <MaterialCommunityIcons name="draw" size={18} color="#94A3B8" />
              </View>
              <Text style={styles.sectionHint}>{t('conditionReport.signatureHint')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (isSubmitting || photos.length === 0 || !signature.trim()) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || photos.length === 0 || !signature.trim()}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>{t('conditionReport.submit')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>

      {/* Add Damage Modal */}
      <Modal visible={showAddDamage} transparent animationType="slide" onRequestClose={() => setShowAddDamage(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddDamage(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('conditionReport.reportDamage')}</Text>

            <Text style={styles.modalLabel}>{t('conditionReport.severityLabel')}</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.severityOption,
                    newDamageSeverity === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '15' },
                  ]}
                  onPress={() => setNewDamageSeverity(opt.value)}
                >
                  <MaterialCommunityIcons name={opt.icon as any} size={18} color={newDamageSeverity === opt.value ? opt.color : '#9CA3AF'} />
                  <Text style={[styles.severityOptionText, newDamageSeverity === opt.value && { color: opt.color, fontWeight: '600' }]}>
                    {t(`conditionReport.severity.${opt.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>{t('conditionReport.description')}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t('conditionReport.damagePlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={newDamageDescription}
              onChangeText={setNewDamageDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddDamage(false); setNewDamageDescription(''); }}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newDamageDescription.trim() && { opacity: 0.5 }]}
                onPress={addDamage}
                disabled={!newDamageDescription.trim()}
              >
                <Text style={styles.modalConfirmText}>{t('conditionReport.addDamage')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    maxWidth: 768,
    width: '100%',
    alignSelf: 'center',
  },
  loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 6 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 10, marginBottom: 20 },
  reportShell: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 18,
  },
  formShell: {
    borderWidth: 2,
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  reportHeadingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  formHeadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },
  reportTimestamp: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 18,
  },
  submittedText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  reportNotes: { fontSize: 14, color: '#334155', lineHeight: 21, marginBottom: 18 },
  displaySection: { marginTop: 18 },
  displaySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  displaySectionTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 10 },
  displayDamageCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  displayDamageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  displayDamageDesc: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  displaySeverityPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  displaySeverityText: { fontSize: 12, fontWeight: '700' },
  displayDamagePhoto: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 14,
    marginTop: 10,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
  },
  displayPhoto: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  displayValueBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  displayValueText: { fontSize: 15, color: '#0F172A', fontWeight: '500' },
  reportFooter: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    gap: 4,
  },
  reportFooterText: { fontSize: 12, color: '#64748B' },
  inlineInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFFFFB3',
    borderWidth: 1,
    borderColor: '#D6E4FF',
    borderRadius: 16,
    padding: 14,
  },
  inlineInfoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sectionHint: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  required: { color: '#EF4444' },
  photoActionRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  photoActionButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  photoActionText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  addPhotoBtnDisabled: { opacity: 0.5 },
  uploadingTile: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  singleUploadState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  singleUploadText: { fontSize: 13, color: '#475569' },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 104,
  },
  secondaryDamageBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  secondaryDamageBtnText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  noDamagesText: { fontSize: 14, color: '#64748B', fontStyle: 'italic', paddingVertical: 4 },
  inlineRemoveBtn: { marginTop: 10, alignSelf: 'flex-start' },
  inlineRemoveText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  signatureInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  infoCardBody: { flex: 1 },
  infoCardTitle: { fontSize: 15, fontWeight: '700', color: '#1E3A8A', marginBottom: 4 },
  infoCardText: { fontSize: 14, color: '#1D4ED8', lineHeight: 20 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  errorCardBody: { flex: 1 },
  errorCardTitle: { fontSize: 15, fontWeight: '700', color: '#991B1B', marginBottom: 4 },
  errorCardText: { fontSize: 14, color: '#B91C1C', lineHeight: 20 },
  metaCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  metaLabel: { fontSize: 12, color: '#6B7280', textTransform: 'uppercase' },
  metaValue: { fontSize: 15, color: '#0F172A', fontWeight: '600', marginBottom: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  severityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  severityOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB' },
  severityOptionText: { fontSize: 13, color: '#6B7280' },
  modalInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 80, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
