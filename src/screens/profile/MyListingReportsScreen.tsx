import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { useI18n } from '../../i18n';
import * as listingService from '../../services/listingService';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';

export const MyListingReportsScreen = () => {
  const navigation = useNavigation<any>();
  const { language, t } = useI18n();
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';
  const [reports, setReports] = useState<listingService.UserListingReport[]>([]);
  const [itemTitles, setItemTitles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await listingService.getMyListingReports();
      setReports(data);

      const ids = [...new Set(data.map((report) => report.item_id).filter(Boolean))];
      const titles = await Promise.all(
        ids.map(async (itemId) => {
          try {
            const result = await listingService.getListingById(itemId);
            return [itemId, result?.listing?.title || itemId] as const;
          } catch {
            return [itemId, itemId] as const;
          }
        })
      );
      setItemTitles(Object.fromEntries(titles));
    } catch {
      setReports([]);
      setItemTitles({});
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleRefresh = useCallback(() => {
    loadReports(true);
  }, [loadReports]);

  const handleOpenEvidence = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch {
      toast.error(t('listingReports.openEvidenceFailed'));
    }
  }, [t]);

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{t('listingReports.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('listingReports.subtitle')}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>{t('listingReports.loading')}</Text>
          </View>
        ) : reports.length === 0 ? (
          <Surface style={styles.emptyCard} elevation={0}>
            <MaterialCommunityIcons name="shield-star-outline" size={46} color="#94A3B8" />
            <Text style={styles.emptyTitle}>{t('listingReports.emptyTitle')}</Text>
            <Text style={styles.emptySubtitle}>{t('listingReports.emptySubtitle')}</Text>
          </Surface>
        ) : (
          <View style={styles.listWrap}>
            {reports.map((report) => {
              const statusTone =
                {
                  pending: { bg: '#FEF3C7', text: '#92400E' },
                  investigating: { bg: '#DBEAFE', text: '#1D4ED8' },
                  resolved: { bg: '#DCFCE7', text: '#166534' },
                  dismissed: { bg: '#F1F5F9', text: '#475569' },
                }[report.status] || { bg: '#FEF3C7', text: '#92400E' };
              const statusLabel =
                t(`listingReports.status.${report.status}`) === `listingReports.status.${report.status}`
                  ? report.status
                  : t(`listingReports.status.${report.status}`);
              const reasonLabel =
                t(`listingReports.reasons.${report.reason}`) === `listingReports.reasons.${report.reason}`
                  ? report.reason
                  : t(`listingReports.reasons.${report.reason}`);
              return (
                <Surface key={report.id} style={styles.reportCard} elevation={0}>
                  <View style={styles.reportTopRow}>
                    <View style={styles.reportTitleWrap}>
                      <Text style={styles.reportTitle}>{itemTitles[report.item_id] || t('listingReports.listingFallback')}</Text>
                      <Text style={styles.reportDate}>
                        {t('listingReports.reportedOn', { date: new Date(report.created_date || report.created_at).toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) })}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusTone.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusTone.text }]}>{statusLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.reasonRow}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#8B5CF6" />
                    <Text style={styles.reasonText}>{reasonLabel}</Text>
                  </View>

                  <Text style={styles.descriptionText}>{report.description}</Text>

                  {report.evidence_urls?.length ? (
                    <View style={styles.sectionBlock}>
                      <Text style={styles.sectionLabel}>
                        {t('listingReports.evidenceLabel', { count: report.evidence_urls.length })}
                      </Text>
                      <View style={styles.metaChip}>
                        <MaterialCommunityIcons name="paperclip" size={15} color="#475569" />
                        <Text style={styles.metaChipText}>
                          {t(report.evidence_urls.length === 1 ? 'listingReports.evidenceCount' : 'listingReports.evidenceCount_plural', {
                            count: report.evidence_urls.length,
                          })}
                        </Text>
                      </View>
                      <View style={styles.evidenceGrid}>
                        {report.evidence_urls.map((url, idx) => (
                          <TouchableOpacity
                            key={`${report.id}-evidence-${idx}`}
                            style={styles.evidenceGridItem}
                            onPress={() => handleOpenEvidence(url)}
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: url }} style={styles.evidenceGridImage} />
                            <View style={styles.evidenceOverlay}>
                              <MaterialCommunityIcons name="open-in-new" size={16} color="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {report.admin_notes ? (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesLabel}>{t('listingReports.adminNote')}</Text>
                      <Text style={styles.notesText}>{report.admin_notes}</Text>
                    </View>
                  ) : null}
                </Surface>
              );
            })}
          </View>
        )}
        <Footer />
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  headerTitle: {
    fontSize: typography.pageTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  loaderWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: typography.body,
    color: colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: typography.sectionTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listWrap: {
    gap: 14,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reportTitleWrap: {
    flex: 1,
    gap: 4,
  },
  reportTitle: {
    fontSize: typography.sectionTitle,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reportDate: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reasonText: {
    fontSize: typography.body,
    fontWeight: '700',
    color: '#334155',
  },
  descriptionText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: typography.caption,
    color: '#475569',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaChipText: {
    fontSize: typography.caption,
    color: '#475569',
    fontWeight: '600',
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  evidenceGridItem: {
    width: 104,
    height: 104,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  evidenceGridImage: {
    width: '100%',
    height: '100%',
  },
  evidenceOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notesLabel: {
    fontSize: typography.caption,
    color: '#475569',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: typography.body,
    color: '#334155',
    lineHeight: 21,
  },
});
