import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  ScrollView,
} from "react-native";
import { ActivityIndicator, Text, Portal, Modal, Button } from "react-native-paper";
import { GlobalHeader } from "../../components/common/GlobalHeader";
import {
  getListingReports,
  updateListingReportStatus,
  ListingReport,
} from "../../services/adminService";
import { getListings } from "../../services/listingService";
import { toast } from "../../store/toastStore";
import { colors, typography } from "../../theme";

const reasonLabels: Record<string, string> = {
  fraud: 'Fraudulent Listing',
  stolen_item: 'Suspected Stolen Item',
  prohibited_item: 'Prohibited Item',
  misleading: 'Misleading Description/Photos',
  price_gouging: 'Price Gouging',
  spam: 'Spam or Duplicate',
  other: 'Other',
};

const reasonRiskLevel: Record<string, 'low' | 'medium' | 'high'> = {
  fraud: 'high',
  stolen_item: 'high',
  prohibited_item: 'high',
  misleading: 'medium',
  price_gouging: 'medium',
  spam: 'low',
  other: 'medium',
};

const actionLabels: Record<string, string> = {
  none: 'No action',
  warning_sent: 'Warning Sent',
  listing_removed: 'Listing Removed',
  user_suspended: 'User Suspended',
  user_banned: 'User Banned',
};

export const AdminListingReportsScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [items, setItems] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ListingReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("none");
  const [activeTab, setActiveTab] = useState<'pending' | 'investigating' | 'resolved'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getListingReports();
      setReports(data);

      if (data.length > 0) {
        const fetchedItems = await getListings({ limit: 100 });
        const itemsMap: Record<string, string> = {};
        fetchedItems.forEach(item => {
          itemsMap[item.id] = item.title;
        });
        setItems(itemsMap);
      }
    } catch (e: any) {
      setReports([]);
      const status = e?.response?.status;
      const message = e?.response?.data?.error || e?.message || 'Failed to load listing reports.';
      if (status === 403) {
        setLoadError('Admin access required on the backend for listing reports. This account can open the admin UI, but the API is rejecting the request.');
      } else {
        setLoadError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (reportId: string, newStatus: 'investigating' | 'resolved' | 'dismissed') => {
    setProcessingId(reportId);
    try {
      await updateListingReportStatus(reportId, {
        status: newStatus,
        admin_notes: adminNotes || undefined,
        action_taken: actionTaken !== 'none' ? actionTaken : undefined
      });
      
      setReports(prev => prev.map(r => 
        r.id === reportId 
          ? { ...r, status: newStatus, admin_notes: adminNotes || undefined, action_taken: actionTaken as any }
          : r
      ));
      
      setSelectedReport(null);
      setAdminNotes("");
      setActionTaken("none");
      toast.success(`Report marked as ${newStatus}`);
    } catch (e) {
      toast.error("Failed to update report status");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return "#DC2626";
      case 'investigating': return "#D97706";
      case 'resolved': return "#16A34A";
      default: return "#64748B";
    }
  };

  const getRiskColors = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'high':
        return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C' };
      case 'medium':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309' };
      default:
        return { bg: '#DBEAFE', border: '#BFDBFE', text: '#1D4ED8' };
    }
  };

  const pendingReports = reports.filter((report) => report.status === 'pending');
  const investigatingReports = reports.filter((report) => report.status === 'investigating');
  const resolvedReports = reports.filter((report) => report.status === 'resolved');
  const filteredReports =
    activeTab === 'pending'
      ? pendingReports
      : activeTab === 'investigating'
      ? investigatingReports
      : resolvedReports;

  const closeReview = () => {
    setSelectedReport(null);
    setAdminNotes("");
    setActionTaken("none");
  };

  const handleTakeAction = async () => {
    if (!selectedReport) return;
    if (actionTaken === 'none') {
      toast.warning("Please select an action to take.");
      return;
    }

    setProcessingId(selectedReport.id);
    try {
      await updateListingReportStatus(selectedReport.id, {
        status: 'resolved',
        admin_notes: adminNotes || undefined,
        action_taken: actionTaken,
      });

      setReports((prev) =>
        prev.map((report) =>
          report.id === selectedReport.id
            ? { ...report, status: 'resolved', admin_notes: adminNotes || undefined, action_taken: actionTaken as any }
            : report
        )
      );

      const actionLabel = actionLabels[actionTaken] || actionTaken;
      closeReview();
      toast.success(`${actionLabel} applied and report resolved.`);
    } catch (e) {
      toast.error("Failed to take action on this report.");
    } finally {
      setProcessingId(null);
    }
  };

  const renderReport = ({ item }: { item: ListingReport }) => {
    const statusColor = getStatusColor(item.status);
    const risk = reasonRiskLevel[item.reason] || 'medium';
    const riskColors = getRiskColors(risk);
    const hasEvidence = !!item.evidence_urls?.length;

    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => {
          setSelectedReport(item);
          setAdminNotes(item.admin_notes || "");
          setActionTaken(item.action_taken || "none");
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {items[item.item_id] || "Unknown Item"}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.metaRow}>
            <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
              <Text style={[styles.riskBadgeText, { color: riskColors.text }]}>{risk.toUpperCase()} RISK</Text>
            </View>
            {hasEvidence && (
              <View style={styles.evidenceBadge}>
                <MaterialCommunityIcons name="camera-outline" size={12} color="#B45309" />
                <Text style={styles.evidenceBadgeText}>{item.evidence_urls?.length} Evidence</Text>
              </View>
            )}
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{reasonLabels[item.reason] || item.reason}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reporter:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{item.reporter_email}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.created_date).toLocaleDateString()}
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponentStyle={styles.headerWrap}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#DC2626" />
                <Text style={styles.headerTitle}>Listing Reports</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reports.length} Total</Text>
              </View>
            </View>

            <Text style={styles.headerSubtitle}>Review and take action on flagged listings</Text>

            <View style={styles.tabsRow}>
              {[
                { key: 'pending', label: `Pending (${pendingReports.length})` },
                { key: 'investigating', label: `Investigating (${investigatingReports.length})` },
                { key: 'resolved', label: `Resolved (${resolvedReports.length})` },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                    onPress={() => setActiveTab(tab.key as 'pending' | 'investigating' | 'resolved')}
                  >
                    <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : loadError ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#DC2626" />
              <Text style={styles.emptyTitle}>Couldn&apos;t Load Reports</Text>
              <Text style={styles.emptySubtitle}>{loadError}</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shield-check-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>
                No {activeTab === 'pending' ? 'pending' : activeTab === 'investigating' ? 'investigating' : 'resolved'} listing reports to review.
              </Text>
            </View>
          )
        }
      />

      <Portal>
        <Modal
          visible={!!selectedReport}
          onDismiss={closeReview}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedReport && (
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>Review Report</Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryTitleWrap}>
                    <MaterialCommunityIcons name="alert-outline" size={22} color="#DC2626" />
                    <Text style={styles.summaryTitle}>{items[selectedReport.item_id] || "Unknown Item"}</Text>
                  </View>
                  {(() => {
                    const risk = reasonRiskLevel[selectedReport.reason] || 'medium';
                    const riskColors = getRiskColors(risk);
                    return (
                      <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                        <Text style={[styles.riskBadgeText, { color: riskColors.text }]}>{risk.toUpperCase()} RISK</Text>
                      </View>
                    );
                  })()}
                </View>
                <Text style={styles.summaryMeta}>Reporter: {selectedReport.reporter_email}</Text>
                <Text style={styles.summaryMeta}>Reported: {new Date(selectedReport.created_date).toLocaleString()}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Item</Text>
                <Text style={styles.modalValue}>{items[selectedReport.item_id] || "Unknown Item"}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Reason</Text>
                <Text style={[styles.modalValue, { color: '#DC2626', fontWeight: '700' }]}>
                  {reasonLabels[selectedReport.reason] || selectedReport.reason}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalDescription}>{selectedReport.description}</Text>
              </View>

              {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Evidence ({selectedReport.evidence_urls.length})</Text>
                  <View style={styles.evidenceGrid}>
                    {selectedReport.evidence_urls.map((url, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.evidenceGridItem}
                        onPress={() => Linking.openURL(url).catch(() => {})}
                        activeOpacity={0.7}
                      >
                        <Image source={{ uri: url }} style={styles.evidenceGridImage} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Admin Notes</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Add notes..."
                  value={adminNotes}
                  onChangeText={setAdminNotes}
                  multiline
                />
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Action to Take</Text>
                <View style={styles.actionList}>
                  {[
                    'none',
                    'warning_sent',
                    'listing_removed',
                    'user_suspended',
                    'user_banned',
                  ].map((action) => {
                    const isActive = actionTaken === action;
                    return (
                      <TouchableOpacity
                        key={action}
                        style={[styles.actionChip, isActive && styles.actionChipActive]}
                        onPress={() => setActionTaken(action)}
                      >
                        <Text style={[styles.actionChipText, isActive && styles.actionChipTextActive]}>
                          {actionLabels[action]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button 
                  mode="outlined" 
                  onPress={() => handleUpdateStatus(selectedReport.id, 'investigating')}
                  style={styles.modalBtn}
                  disabled={processingId === selectedReport.id}
                >
                  Investigate
                </Button>
                <Button 
                  mode="contained" 
                  onPress={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                  style={[styles.modalBtn, { backgroundColor: '#16A34A' }]}
                  disabled={processingId === selectedReport.id}
                >
                  Resolve
                </Button>
              </View>

              <Button
                mode="contained"
                onPress={handleTakeAction}
                style={[styles.modalBtn, styles.takeActionBtn]}
                disabled={processingId === selectedReport.id}
              >
                Take Action & Resolve
              </Button>
              
              <Button 
                mode="text" 
                onPress={closeReview} 
                style={{ marginTop: 8 }}
                disabled={processingId === selectedReport.id}
              >
                Close
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerWrap: {
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: "700",
    color: "#0F172A",
  },
  badge: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  riskBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  evidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  evidenceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    width: 60,
  },
  infoValue: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    maxHeight: '85%',
  },
  modalScroll: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  summaryTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryMeta: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  evidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  evidenceGridItem: {
    borderRadius: 10,
    overflow: "hidden",
  },
  evidenceGridImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  evidenceRow: {
    marginTop: 8,
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
  },
  actionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  actionChipActive: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  actionChipTextActive: {
    color: '#FFFFFF',
  },
  takeActionBtn: {
    backgroundColor: '#DC2626',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
});
