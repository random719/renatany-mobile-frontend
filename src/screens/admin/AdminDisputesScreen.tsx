import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { GlobalHeader } from "../../components/common/GlobalHeader";
import {
  getDisputes,
  updateDispute,
  Dispute,
} from "../../services/adminService";
import { api } from "../../services/api";
import { colors, typography } from "../../theme";
import { RootStackParamList } from "../../types/navigation";

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  open: { bg: "#FEE2E2", text: "#DC2626", icon: "alert-circle-outline", label: "Open" },
  under_review: { bg: "#FEF3C7", text: "#D97706", icon: "clock-outline", label: "Under Review" },
  resolved: { bg: "#ECFDF5", text: "#10B981", icon: "check-circle-outline", label: "Resolved" },
  closed: { bg: "#F3F4F6", text: "#6B7280", icon: "close-circle-outline", label: "Closed" },
};

const TABS = [
  { key: "open", label: "Open" },
  { key: "under_review", label: "Under Review" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
] as const;

interface RentalInfo {
  id: string;
  item_id: string;
  renter_email: string;
  owner_email: string;
  total_amount: number;
  start_date: string;
  end_date: string;
}

interface ItemInfo {
  id: string;
  title: string;
  category?: string;
}

export const AdminDisputesScreen = () => {
  const navigation = useNavigation<Nav>();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [rentals, setRentals] = useState<Record<string, RentalInfo>>({});
  const [items, setItems] = useState<Record<string, ItemInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("open");

  const [conditionReports, setConditionReports] = useState<Record<string, any[]>>({});

  // Detail modal
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [decision, setDecision] = useState("");
  const [resolution, setResolution] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDisputes();
      setDisputes(data);

      if (data.length > 0) {
        // Fetch rental requests by IDs
        const rentalIds = [...new Set(data.map((d) => d.rental_request_id).filter(Boolean))];
        if (rentalIds.length > 0) {
          try {
            const res = await api.get("/rental-requests", { params: { ids: rentalIds.join(",") } });
            const fetched = res.data?.data || res.data || [];
            const map: Record<string, RentalInfo> = {};
            const itemIds = new Set<string>();
            (Array.isArray(fetched) ? fetched : []).forEach((r: any) => {
              map[r.id] = r;
              if (r.item_id) itemIds.add(r.item_id);
            });
            setRentals(map);

            // Fetch items
            if (itemIds.size > 0) {
              const itemsRes = await api.get("/items", { params: { ids: Array.from(itemIds).join(",") } });
              const itemsFetched = itemsRes.data?.data || itemsRes.data || [];
              const itemsMap: Record<string, ItemInfo> = {};
              (Array.isArray(itemsFetched) ? itemsFetched : []).forEach((i: any) => {
                itemsMap[i.id] = { id: i.id, title: i.title, category: i.category };
              });
              setItems(itemsMap);
            }
          } catch (e) {
            console.error("Error fetching rental/item data:", e);
          }

          // Fetch condition reports for dispute rental requests (like frontend-v1)
          try {
            const idsParam = rentalIds.join(",");
            const crRes = await api.get("/condition-reports", { params: { rental_request_ids: idsParam } });
            const crData = crRes.data?.data || crRes.data || [];
            const crMap: Record<string, any[]> = {};
            (Array.isArray(crData) ? crData : []).forEach((cr: any) => {
              if (!crMap[cr.rental_request_id]) crMap[cr.rental_request_id] = [];
              crMap[cr.rental_request_id].push(cr);
            });
            setConditionReports(crMap);
          } catch {
            // Condition reports may not exist
          }
        }
      }
    } catch (e) {
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDisputes = disputes.filter((d) => d.status === activeTab);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const handleChangeStatus = async (disputeId: string, newStatus: string) => {
    try {
      await updateDispute(disputeId, { status: newStatus });
      await loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to update status.";
      Alert.alert("Error", msg);
    }
  };

  const openDetail = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setDecision("");
    setResolution(dispute.resolution || "");
    setAdminNotes(dispute.admin_notes || "");
  };

  const handleQuickDecision = (d: string) => {
    setDecision(d);
    switch (d) {
      case "favor_renter":
        setResolution("After reviewing the evidence, we've decided in favor of the renter. The full amount will be refunded.");
        break;
      case "favor_owner":
        setResolution("After reviewing the evidence, we've decided in favor of the owner. The rental amount will be released.");
        break;
      case "split":
        setResolution("After reviewing the evidence, we've decided on a split resolution.");
        break;
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute) return;
    if (!decision) {
      Alert.alert("Required", "Please select a decision (Favor Renter, Favor Owner, or Split).");
      return;
    }
    if (!resolution.trim()) {
      Alert.alert("Required", "Please provide a resolution message.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateDispute(selectedDispute.id, {
        status: "resolved",
        decision,
        resolution: resolution.trim(),
        admin_notes: adminNotes.trim() || undefined,
        resolved_date: new Date().toISOString(),
      });

      // Send notifications to both parties
      try {
        const rental = rentals[selectedDispute.rental_request_id];
        const item = rental ? items[rental.item_id] : null;
        const itemTitle = item?.title || "your rental";

        await api.post("/notifications", {
          user_email: selectedDispute.filed_by_email,
          type: "dispute",
          title: "Your Dispute Has Been Resolved",
          message: `The dispute regarding "${itemTitle}" has been resolved. Decision: ${decision.replace(/_/g, " ")}. ${resolution}`,
          related_id: selectedDispute.id,
        });
        await api.post("/notifications", {
          user_email: selectedDispute.against_email,
          type: "dispute",
          title: "A Dispute Has Been Resolved",
          message: `The dispute regarding "${itemTitle}" has been resolved. Decision: ${decision.replace(/_/g, " ")}. ${resolution}`,
          related_id: selectedDispute.id,
        });
      } catch {
        // Notifications are best-effort
      }

      Alert.alert("Success", "Dispute resolved successfully! Both parties have been notified.");
      setSelectedDispute(null);
      await loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Failed to resolve dispute. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderDispute = ({ item: dispute }: { item: Dispute }) => {
    const rental = rentals[dispute.rental_request_id];
    const item = rental ? items[rental.item_id] : null;
    const sc = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item?.title || "Item not found"}
              </Text>
            </View>
            <View style={styles.cardMeta}>
              <MaterialCommunityIcons name="calendar" size={14} color="#94A3B8" />
              <Text style={styles.cardMetaText}>Filed {formatDate(dispute.created_date)}</Text>
              {rental && (
                <>
                  <MaterialCommunityIcons name="currency-usd" size={14} color="#94A3B8" style={{ marginLeft: 12 }} />
                  <Text style={styles.cardMetaText}>${rental.total_amount?.toFixed(2)}</Text>
                </>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <MaterialCommunityIcons name={sc.icon as any} size={14} color={sc.text} />
            <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-arrow-right" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Filed by:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{dispute.filed_by_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-alert" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Against:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{dispute.against_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tag-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{dispute.reason}</Text>
          </View>
          {dispute.description && (
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText} numberOfLines={3}>{dispute.description}</Text>
            </View>
          )}
        </View>

        {/* Evidence thumbnails */}
        {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceRow}>
            {dispute.evidence_urls.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.evidenceThumb} />
            ))}
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          {dispute.status === "open" && (
            <TouchableOpacity
              style={styles.statusChangeBtn}
              onPress={() => handleChangeStatus(dispute.id, "under_review")}
            >
              <MaterialCommunityIcons name="eye-outline" size={16} color="#D97706" />
              <Text style={[styles.statusChangeBtnText, { color: "#D97706" }]}>Start Review</Text>
            </TouchableOpacity>
          )}
          {(dispute.status === "open" || dispute.status === "under_review") && (
            <TouchableOpacity style={styles.resolveActionBtn} onPress={() => openDetail(dispute)}>
              <MaterialCommunityIcons name="gavel" size={16} color="#FFFFFF" />
              <Text style={styles.resolveActionBtnText}>Review & Resolve</Text>
            </TouchableOpacity>
          )}
          {dispute.status === "resolved" && dispute.decision && (
            <View style={styles.resolutionSummary}>
              <MaterialCommunityIcons name="check-decagram" size={16} color="#10B981" />
              <Text style={styles.resolutionSummaryText}>
                Decision: {dispute.decision.replace(/_/g, " ")}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <FlatList
        data={filteredDisputes}
        keyExtractor={(item) => item.id}
        renderItem={renderDispute}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons name="alert-outline" size={24} color="#DC2626" />
                <Text style={styles.headerTitle}>Disputes</Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={loadData} disabled={isLoading}>
                <MaterialCommunityIcons name="refresh" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={styles.tabBar}>
                {TABS.map((tab) => {
                  const count = disputes.filter((d) => d.status === tab.key).length;
                  const isActive = activeTab === tab.key;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setActiveTab(tab.key)}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                        {tab.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>No Disputes</Text>
              <Text style={styles.emptySubtitle}>
                No {activeTab === "resolved" ? "resolved" : activeTab.replace("_", " ")} disputes at this time.
              </Text>
            </View>
          )
        }
      />

      {/* Detail / Resolve Modal */}
      <Modal
        visible={!!selectedDispute}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDispute(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedDispute(null)} />
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Review & Resolve Dispute</Text>

              {selectedDispute && (
                <>
                  {/* Dispute info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Dispute Details</Text>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Reason:</Text>
                      <Text style={styles.modalInfoValue}>{selectedDispute.reason}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Filed by:</Text>
                      <Text style={styles.modalInfoValue}>{selectedDispute.filed_by_email}</Text>
                    </View>
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>Against:</Text>
                      <Text style={styles.modalInfoValue}>{selectedDispute.against_email}</Text>
                    </View>
                    {selectedDispute.description && (
                      <View style={styles.modalDescBox}>
                        <Text style={styles.modalDescText}>{selectedDispute.description}</Text>
                      </View>
                    )}
                  </View>

                  {/* Evidence */}
                  {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Evidence ({selectedDispute.evidence_urls.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedDispute.evidence_urls.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.modalEvidence} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Condition Reports */}
                  {conditionReports[selectedDispute.rental_request_id] && conditionReports[selectedDispute.rental_request_id].length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>
                        Condition Reports ({conditionReports[selectedDispute.rental_request_id].length})
                      </Text>
                      {conditionReports[selectedDispute.rental_request_id].map((cr: any, i: number) => (
                        <View key={i} style={styles.conditionReportCard}>
                          <View style={styles.conditionReportHeader}>
                            <MaterialCommunityIcons
                              name={cr.report_type === "pickup" ? "clipboard-arrow-right-outline" : "clipboard-arrow-left-outline"}
                              size={18}
                              color={cr.report_type === "pickup" ? "#2563EB" : "#7C3AED"}
                            />
                            <Text style={styles.conditionReportType}>
                              {cr.report_type === "pickup" ? "Pickup Report" : "Return Report"}
                            </Text>
                            <Text style={styles.conditionReportDate}>
                              {new Date(cr.created_date || cr.created_at).toLocaleDateString()}
                            </Text>
                          </View>
                          {cr.notes && <Text style={styles.conditionReportNotes}>{cr.notes}</Text>}
                          {cr.damages_reported && cr.damages_reported.length > 0 && (
                            <View style={styles.conditionDamages}>
                              {cr.damages_reported.map((d: any, di: number) => (
                                <View key={di} style={styles.conditionDamageRow}>
                                  <View style={[styles.conditionDamageDot, {
                                    backgroundColor: d.severity === "severe" ? "#DC2626" : d.severity === "moderate" ? "#F59E0B" : "#6B7280"
                                  }]} />
                                  <Text style={styles.conditionDamageText}>{d.description}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {cr.condition_photos && cr.condition_photos.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                              {cr.condition_photos.map((url: string, pi: number) => (
                                <Image key={pi} source={{ uri: url }} style={styles.conditionPhoto} />
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Rental info */}
                  {rentals[selectedDispute.rental_request_id] && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Rental Information</Text>
                      {(() => {
                        const r = rentals[selectedDispute.rental_request_id];
                        const it = items[r.item_id];
                        return (
                          <>
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Item:</Text>
                              <Text style={styles.modalInfoValue}>{it?.title || "Unknown"}</Text>
                            </View>
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Amount:</Text>
                              <Text style={[styles.modalInfoValue, { fontWeight: "700" }]}>${r.total_amount?.toFixed(2)}</Text>
                            </View>
                            <View style={styles.modalInfoRow}>
                              <Text style={styles.modalInfoLabel}>Dates:</Text>
                              <Text style={styles.modalInfoValue}>{formatDate(r.start_date)} - {formatDate(r.end_date)}</Text>
                            </View>
                          </>
                        );
                      })()}
                    </View>
                  )}

                  {/* Quick Decision */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Decision</Text>
                    <View style={styles.decisionRow}>
                      {[
                        { key: "favor_renter", label: "Favor Renter", icon: "account-check", color: "#2563EB" },
                        { key: "favor_owner", label: "Favor Owner", icon: "account-star", color: "#7C3AED" },
                        { key: "split", label: "Split", icon: "scale-balance", color: "#D97706" },
                      ].map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.decisionBtn,
                            decision === opt.key && { backgroundColor: opt.color, borderColor: opt.color },
                          ]}
                          onPress={() => handleQuickDecision(opt.key)}
                        >
                          <MaterialCommunityIcons
                            name={opt.icon as any}
                            size={18}
                            color={decision === opt.key ? "#FFFFFF" : opt.color}
                          />
                          <Text
                            style={[
                              styles.decisionBtnText,
                              decision === opt.key ? { color: "#FFFFFF" } : { color: opt.color },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Resolution */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Resolution Message</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Explain the resolution..."
                      placeholderTextColor="#9CA3AF"
                      value={resolution}
                      onChangeText={setResolution}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Admin Notes */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Admin Notes (internal)</Text>
                    <TextInput
                      style={[styles.modalTextInput, { minHeight: 60 }]}
                      placeholder="Internal notes..."
                      placeholderTextColor="#9CA3AF"
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Submit */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setSelectedDispute(null)}
                      disabled={isUpdating}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitResolveBtn, isUpdating && { opacity: 0.5 }]}
                      onPress={handleResolve}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="check-circle" size={18} color="#FFFFFF" />
                          <Text style={styles.submitResolveBtnText}>Resolve Dispute</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  listContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 12 },
  backBtn: { padding: 10, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  refreshBtn: { padding: 10, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  headerTitleContainer: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: typography.title, fontWeight: "700", color: "#0F172A" },
  // Tabs
  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#E2E8F0" },
  tab: { paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },
  // Card
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", flex: 1 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: "#94A3B8" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  cardBody: { gap: 8, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: typography.body, fontWeight: "600", color: "#64748B" },
  infoValue: { fontSize: typography.body, color: "#0F172A", flex: 1 },
  descriptionBox: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, marginTop: 4 },
  descriptionText: { fontSize: 13, color: "#475569", lineHeight: 19 },
  evidenceRow: { marginBottom: 14 },
  evidenceThumb: { width: 72, height: 72, borderRadius: 8, marginRight: 8, backgroundColor: "#F3F4F6" },
  cardActions: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
  statusChangeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  statusChangeBtnText: { fontSize: 13, fontWeight: "600" },
  resolveActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary },
  resolveActionBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  resolutionSummary: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  resolutionSummaryText: { fontSize: 13, fontWeight: "600", color: "#10B981" },
  // Empty
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyTitle: { fontSize: typography.title, fontWeight: "700", color: "#0F172A" },
  emptySubtitle: { fontSize: typography.body, color: "#64748B", textAlign: "center" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%", paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: "bold", color: "#0F172A", marginBottom: 20 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 10 },
  modalInfoRow: { flexDirection: "row", marginBottom: 6 },
  modalInfoLabel: { fontSize: 14, fontWeight: "600", color: "#64748B", width: 80 },
  modalInfoValue: { fontSize: 14, color: "#0F172A", flex: 1 },
  modalDescBox: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, marginTop: 6 },
  modalDescText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  modalEvidence: { width: 100, height: 100, borderRadius: 10, marginRight: 10, backgroundColor: "#F3F4F6" },
  // Condition reports
  conditionReportCard: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 14, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10 },
  conditionReportHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  conditionReportType: { fontSize: 14, fontWeight: "700", color: "#0F172A", flex: 1 },
  conditionReportDate: { fontSize: 11, color: "#94A3B8" },
  conditionReportNotes: { fontSize: 13, color: "#475569", lineHeight: 18, marginBottom: 6 },
  conditionDamages: { gap: 4, marginTop: 4 },
  conditionDamageRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  conditionDamageDot: { width: 8, height: 8, borderRadius: 4 },
  conditionDamageText: { fontSize: 12, color: "#64748B", flex: 1 },
  conditionPhoto: { width: 64, height: 64, borderRadius: 8, marginRight: 6, backgroundColor: "#E2E8F0" },
  decisionRow: { flexDirection: "row", gap: 8 },
  decisionBtn: { flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB" },
  decisionBtnText: { fontSize: 11, fontWeight: "700" },
  modalTextInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 14, fontSize: 14, color: "#0F172A", minHeight: 90 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  submitResolveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: 10, backgroundColor: "#16A34A" },
  submitResolveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
