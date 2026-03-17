import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUser } from '@clerk/expo';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { api } from '../../services/api';
import {
  getConditionReports,
  createConditionReport,
} from '../../services/conditionReportService';
import { getRentalRequestById } from '../../services/rentalService';
import { toast } from '../../store/toastStore';
import { colors } from '../../theme';
import { ConditionReport, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { getConditionReportRules } from '../../utils/conditionReportRules';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ConditionReport'>;

const SEVERITY_OPTIONS = [
  { value: 'minor' as const, label: 'Minor', color: '#F59E0B', icon: 'alert-circle-outline' },
  { value: 'moderate' as const, label: 'Moderate', color: '#F97316', icon: 'alert' },
  { value: 'severe' as const, label: 'Severe', color: '#EF4444', icon: 'alert-octagon' },
];

export const ConditionReportScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { rentalRequestId, reportType } = route.params;
  const { user: clerkUser } = useUser();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

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
  const [isUploading, setIsUploading] = useState(false);

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

  const existingReport = existingReports.find((r) => r.report_type === reportType);
  const hasExistingReport = !!existingReport;
  const rules = rental ? getConditionReportRules(rental, existingReports, userEmail) : null;
  const canCreateReport = reportType === 'pickup'
    ? rules?.canCreatePickupReport
    : rules?.canCreateReturnReport;
  const blockedMessage = reportType === 'pickup'
    ? rules?.pickupStatusMessage
    : rules?.returnStatusMessage;

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const uploadedUrls: string[] = [];
        for (const asset of result.assets) {
          const formData = new FormData();
          formData.append('file', {
            uri: asset.uri,
            name: asset.fileName || 'photo.jpg',
            type: asset.mimeType || 'image/jpeg',
          } as any);
          const res = await api.post('/file/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const url = res.data?.file_url || res.data?.data?.file_url;
          if (url) uploadedUrls.push(url);
        }
        setPhotos((prev) => [...prev, ...uploadedUrls]);
      } catch (error) {
        toast.error('Could not upload photos. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast.warning('Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        } as any);
        const res = await api.post('/file/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data?.file_url || res.data?.data?.file_url;
        if (url) setPhotos((prev) => [...prev, url]);
      } catch (error) {
        toast.error('Could not upload photo. Please try again.');
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
      toast.warning('Please describe the damage.');
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
      toast.warning('Please add at least one photo documenting the item condition.');
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
      });

      toast.success(`Your ${reportType} condition report has been submitted successfully.`, () => navigation.goBack());
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Failed to submit report. Please try again.';
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
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Condition Report</Text>
            <Text style={styles.subtitle}>We could not load this rental right now.</Text>
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
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {reportType === 'pickup' ? 'Pickup' : 'Return'} Condition Report
            </Text>
            <View style={styles.submittedBadge}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#10B981" />
              <Text style={styles.submittedText}>Report Already Submitted</Text>
            </View>

            {existingReport.condition_photos.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {existingReport.condition_photos.map((url, i) => (
                    <Image key={i} source={{ uri: url }} style={styles.existingPhoto} />
                  ))}
                </ScrollView>
              </View>
            )}

            {existingReport.notes && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text style={styles.notesText}>{existingReport.notes}</Text>
              </View>
            )}

            {existingReport.damages_reported.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Damages Reported</Text>
                {existingReport.damages_reported.map((d, i) => (
                  <View key={i} style={styles.damageItem}>
                    <View style={[styles.severityDot, { backgroundColor: SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color || '#999' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.damageSeverity}>{d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}</Text>
                      <Text style={styles.damageDesc}>{d.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.dateText}>
              Submitted: {new Date(existingReport.created_date).toLocaleDateString()}
            </Text>
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
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {reportType === 'pickup' ? 'Pickup' : 'Return'} Condition Report
            </Text>
            <View style={styles.infoCard}>
              <MaterialCommunityIcons name="information-outline" size={22} color="#2563EB" />
              <View style={styles.infoCardBody}>
                <Text style={styles.infoCardTitle}>Not available yet</Text>
                <Text style={styles.infoCardText}>
                  {blockedMessage || 'This report is not available right now.'}
                </Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Rental status</Text>
              <Text style={styles.metaValue}>{rental.status}</Text>
              <Text style={styles.metaLabel}>Pickup reports</Text>
              <Text style={styles.metaValue}>{rules?.pickupReports.length || 0}/2</Text>
              <Text style={styles.metaLabel}>Return reports</Text>
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
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {reportType === 'pickup' ? 'Pickup' : 'Return'} Condition Report
          </Text>
          <Text style={styles.subtitle}>
            {reportType === 'pickup'
              ? 'Document the item condition at pickup to protect both parties.'
              : 'Document the item condition at return for comparison with the pickup report.'}
          </Text>

          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Photos <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.sectionHint}>Take clear photos of the item from multiple angles</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              {photos.map((url, i) => (
                <View key={i} style={styles.photoContainer}>
                  <Image source={{ uri: url }} style={styles.photo} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(i)}>
                    <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {isUploading && (
                <View style={[styles.photoContainer, styles.uploadingPlaceholder]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImages}>
                <MaterialCommunityIcons name="image-plus" size={28} color="#6B7280" />
                <Text style={styles.addPhotoText}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                <MaterialCommunityIcons name="camera" size={28} color="#6B7280" />
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the overall condition of the item..."
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Damages Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Damages</Text>
              <TouchableOpacity style={styles.addDamageBtn} onPress={() => setShowAddDamage(true)}>
                <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                <Text style={styles.addDamageBtnText}>Add Damage</Text>
              </TouchableOpacity>
            </View>

            {damages.length === 0 ? (
              <Text style={styles.noDamagesText}>No damages reported — item is in good condition</Text>
            ) : (
              damages.map((d, i) => (
                <View key={i} style={styles.damageCard}>
                  <View style={styles.damageCardHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color + '20' }]}>
                      <MaterialCommunityIcons
                        name={SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.icon as any || 'alert'}
                        size={14}
                        color={SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color}
                      />
                      <Text style={[styles.severityText, { color: SEVERITY_OPTIONS.find((s) => s.value === d.severity)?.color }]}>
                        {d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => removeDamage(i)}>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.damageCardDesc}>{d.description}</Text>
                </View>
              ))
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (isSubmitting || photos.length === 0) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || photos.length === 0}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScreenLayout>

      {/* Add Damage Modal */}
      <Modal visible={showAddDamage} transparent animationType="slide" onRequestClose={() => setShowAddDamage(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddDamage(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Report Damage</Text>

            <Text style={styles.modalLabel}>Severity</Text>
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
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Describe the damage..."
              placeholderTextColor="#9CA3AF"
              value={newDamageDescription}
              onChangeText={setNewDamageDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddDamage(false); setNewDamageDescription(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, !newDamageDescription.trim() && { opacity: 0.5 }]}
                onPress={addDamage}
                disabled={!newDamageDescription.trim()}
              >
                <Text style={styles.modalConfirmText}>Add Damage</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, maxWidth: 768, width: '100%', alignSelf: 'center' },
  loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 6 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  sectionHint: { fontSize: 13, color: '#9CA3AF' },
  required: { color: '#EF4444' },
  photoContainer: { width: 100, height: 100, borderRadius: 10, marginRight: 10, position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 10 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FFFFFF', borderRadius: 12 },
  uploadingPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtn: { width: 100, height: 100, borderRadius: 10, borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  addPhotoText: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  textInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, fontSize: 14, color: '#0F172A', minHeight: 100 },
  addDamageBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addDamageBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  noDamagesText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic', paddingVertical: 12 },
  damageCard: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  damageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  severityText: { fontSize: 12, fontWeight: '600' },
  damageCardDesc: { fontSize: 14, color: '#374151', lineHeight: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // Existing report styles
  submittedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 24 },
  submittedText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
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
  existingPhoto: { width: 120, height: 120, borderRadius: 10, marginRight: 10 },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20, backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10 },
  damageItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  damageSeverity: { fontSize: 13, fontWeight: '600', color: '#374151' },
  damageDesc: { fontSize: 14, color: '#6B7280' },
  dateText: { fontSize: 13, color: '#9CA3AF', marginTop: 16 },
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
