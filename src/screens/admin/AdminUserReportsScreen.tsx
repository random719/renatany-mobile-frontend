import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
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
  getUserReports,
  updateUserReport,
  UserReport,
} from "../../services/adminService";
import { api } from "../../services/api";
import { colors, typography } from "../../theme";
import { RootStackParamList } from "../../types/navigation";

type Nav = StackNavigationProp<RootStackParamList>;

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEE2E2", text: "#DC2626", label: "PENDING" },
  under_review: { bg: "#FEF3C7", text: "#D97706", label: "UNDER REVIEW" },
  resolved: { bg: "#ECFDF5", text: "#10B981", label: "RESOLVED" },
  dismissed: { bg: "#F3F4F6", text: "#6B7280", label: "DISMISSED" },
};

const REASON_LABELS: Record<string, string> = {
  harassment: "Harassment or Bullying",
  spam: "Spam or Scam",
  fraud: "Fraudulent Activity",
  inappropriate_content: "Inappropriate Content",
  other: "Other",
};

const ACTION_OPTIONS = [
  { key: "none", label: "No Action", icon: "minus-circle-outline", color: "#6B7280" },
  { key: "warning_sent", label: "Send Warning", icon: "alert-outline", color: "#D97706" },
  { key: "user_suspended", label: "Suspend User (7 days)", icon: "clock-outline", color: "#EA580C" },
  { key: "user_banned", label: "Ban User Permanently", icon: "cancel", color: "#DC2626" },
];

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under Review" },
  { key: "resolved", label: "Resolved" },
  { key: "dismissed", label: "Dismissed" },
] as const;

interface UserProfile {
  email: string;
  full_name?: string;
  username?: string;
  profile_picture?: string;
}

export const AdminUserReportsScreen = () => {
  const navigation = useNavigation<Nav>();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("pending");

  // Detail modal
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("none");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserReports();
      setReports(data);

      // Fetch user profiles for all involved emails (like frontend-v1)
      const emails = new Set<string>();
      data.forEach((r) => {
        emails.add(r.reporter_email);
        emails.add(r.reported_email);
      });
      const map: Record<string, UserProfile> = {};
      for (const email of emails) {
        try {
          const res = await api.get("/users/by-email", { params: { email } });
          const user = res.data?.data || res.data;
          if (user) map[email] = user;
        } catch {
          // User might not exist
        }
      }
      setUsersMap(map);
    } catch (e) {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredReports = reports.filter((r) => r.status === activeTab);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return iso;
    }
  };

  const openDetail = (report: UserReport) => {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || "");
    setActionTaken(report.action_taken || "none");
  };

  const handleStatusUpdate = async (status: string) => {
    if (!selectedReport) return;
    setIsUpdating(true);
    try {
      await updateUserReport(selectedReport.id, {
        status,
        admin_notes: adminNotes.trim() || undefined,
        action_taken: actionTaken,
      });

      // Send notifications with @username like frontend-v1
      try {
        const reportedUser = usersMap[selectedReport.reported_email];
        const reportedName = reportedUser?.username ? `@${reportedUser.username}` : selectedReport.reported_email;

        if (status === "dismissed") {
          await api.post("/notifications", {
            user_email: selectedReport.reported_email,
            type: "system",
            title: "Report Dismissed",
            message: "A report filed against you has been reviewed and dismissed. No action was taken on your account.",
            related_id: selectedReport.id,
          });
          await api.post("/notifications", {
            user_email: selectedReport.reporter_email,
            type: "system",
            title: "Report Update: Dismissed",
            message: `Your report concerning ${reportedName} has been reviewed and dismissed. No action was taken. Thank you for your vigilance.`,
            related_id: selectedReport.id,
          });
        } else if (status === "under_review") {
          await api.post("/notifications", {
            user_email: selectedReport.reporter_email,
            type: "system",
            title: "Report Update: Under Review",
            message: `Your report concerning ${reportedName} is now under review. We will notify you once a final decision has been made.`,
            related_id: selectedReport.id,
          });
        }
      } catch {
        // Notifications best-effort
      }

      Alert.alert("Success", `Report ${status === "dismissed" ? "dismissed" : status === "under_review" ? "marked as under review" : "updated"} successfully.`);
      setSelectedReport(null);
      await loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to update report.";
      Alert.alert("Error", msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTakeAction = async () => {
    if (!selectedReport || actionTaken === "none") {
      Alert.alert("Required", "Please select an action to take.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateUserReport(selectedReport.id, {
        status: "resolved",
        admin_notes: adminNotes.trim() || undefined,
        action_taken: actionTaken,
      });

      Alert.alert("Success", `Action taken: ${actionTaken.replace(/_/g, " ")}. Parties have been notified.`);
      setSelectedReport(null);
      await loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Failed to take action.";
      Alert.alert("Error", msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderReport = ({ item: report }: { item: UserReport }) => {
    const sc = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.cardTitleRow}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.cardTitle}>{REASON_LABELS[report.reason] || report.reason}</Text>
            </View>
            <Text style={styles.cardMeta}>Reported {formatDate(report.created_date || report.created_at)}</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
            </View>
            <TouchableOpacity style={styles.reviewBtn} onPress={() => openDetail(report)}>
              <MaterialCommunityIcons name="eye-outline" size={16} color="#475569" />
              <Text style={styles.reviewBtnText}>Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Users */}
        <View style={styles.usersRow}>
          <View style={styles.userBox}>
            <Text style={styles.userBoxLabel}>Reported By:</Text>
            <View style={styles.userInfo}>
              {usersMap[report.reporter_email]?.profile_picture ? (
                <Image source={{ uri: usersMap[report.reporter_email].profile_picture }} style={styles.userAvatarImg} />
              ) : (
                <View style={styles.userAvatar}>
                  <MaterialCommunityIcons name="account" size={16} color="#64748B" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {usersMap[report.reporter_email]?.full_name || "User"}
                </Text>
                {usersMap[report.reporter_email]?.username ? (
                  <TouchableOpacity onPress={() => (navigation as any).navigate("PublicProfile", { userEmail: report.reporter_email })}>
                    <Text style={styles.userHandle}>@{usersMap[report.reporter_email].username}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.userEmailSmall} numberOfLines={1}>{report.reporter_email}</Text>
                )}
              </View>
            </View>
          </View>
          <View style={styles.userBox}>
            <Text style={styles.userBoxLabel}>Reported User:</Text>
            <View style={styles.userInfo}>
              {usersMap[report.reported_email]?.profile_picture ? (
                <Image source={{ uri: usersMap[report.reported_email].profile_picture }} style={styles.userAvatarImg} />
              ) : (
                <View style={[styles.userAvatar, { backgroundColor: "#FEE2E2" }]}>
                  <MaterialCommunityIcons name="account-alert" size={16} color="#DC2626" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>
                  {usersMap[report.reported_email]?.full_name || "User"}
                </Text>
                {usersMap[report.reported_email]?.username ? (
                  <TouchableOpacity onPress={() => (navigation as any).navigate("PublicProfile", { userEmail: report.reported_email })}>
                    <Text style={styles.userHandle}>@{usersMap[report.reported_email].username}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.userEmailSmall} numberOfLines={1}>{report.reported_email}</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {report.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText} numberOfLines={3}>{report.description}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
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
                <Text style={styles.headerTitle}>User Reports</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reports.length} Total</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Review and take action on reported users</Text>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              <View style={styles.tabBar}>
                {TABS.map((tab) => {
                  const count = reports.filter((r) => r.status === tab.key).length;
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
              <Text style={styles.emptyTitle}>
                No {activeTab.replace("_", " ")} reports
              </Text>
            </View>
          )
        }
      />

      {/* Detail / Action Modal */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelectedReport(null)} />
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHandle} />
              <View style={styles.modalTitleRow}>
                <MaterialCommunityIcons name="alert-circle" size={22} color="#DC2626" />
                <Text style={styles.modalTitle}>Review User Report</Text>
              </View>

              {selectedReport && (
                <>
                  {/* Report Details */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalDetailGrid}>
                      <View style={styles.modalDetailItem}>
                        <Text style={styles.modalDetailLabel}>Reason</Text>
                        <Text style={styles.modalDetailValue}>{REASON_LABELS[selectedReport.reason] || selectedReport.reason}</Text>
                      </View>
                      <View style={styles.modalDetailItem}>
                        <Text style={styles.modalDetailLabel}>Reported</Text>
                        <Text style={styles.modalDetailValue}>{formatDate(selectedReport.created_date || selectedReport.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.modalDetailLabel}>Reporter</Text>
                      <Text style={styles.modalDetailValue}>{selectedReport.reporter_email}</Text>
                    </View>
                    <View style={styles.modalDetailItem}>
                      <Text style={styles.modalDetailLabel}>Reported User</Text>
                      <Text style={styles.modalDetailValue}>{selectedReport.reported_email}</Text>
                    </View>
                    {selectedReport.description && (
                      <View style={styles.modalDescBox}>
                        <Text style={styles.modalDescLabel}>Description</Text>
                        <Text style={styles.modalDescText}>{selectedReport.description}</Text>
                      </View>
                    )}
                  </View>

                  {/* Evidence */}
                  {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Evidence ({selectedReport.evidence_urls.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {selectedReport.evidence_urls.map((url, i) => (
                          <Image key={i} source={{ uri: url }} style={styles.modalEvidence} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Admin Action */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Admin Action</Text>

                    <Text style={styles.fieldLabel}>Action to Take</Text>
                    <View style={styles.actionOptionsGrid}>
                      {ACTION_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.actionOption,
                            actionTaken === opt.key && { borderColor: opt.color, backgroundColor: opt.color + "15" },
                          ]}
                          onPress={() => setActionTaken(opt.key)}
                        >
                          <MaterialCommunityIcons
                            name={opt.icon as any}
                            size={18}
                            color={actionTaken === opt.key ? opt.color : "#9CA3AF"}
                          />
                          <Text style={[styles.actionOptionText, actionTaken === opt.key && { color: opt.color, fontWeight: "700" }]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Admin Notes</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Add notes about your investigation and decision..."
                      placeholderTextColor="#9CA3AF"
                      value={adminNotes}
                      onChangeText={setAdminNotes}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Footer Actions */}
                  <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedReport(null)} disabled={isUpdating}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.underReviewBtn}
                      onPress={() => handleStatusUpdate("under_review")}
                      disabled={isUpdating}
                    >
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#D97706" />
                      <Text style={styles.underReviewBtnText}>Under Review</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => handleStatusUpdate("dismissed")}
                      disabled={isUpdating}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color="#6B7280" />
                      <Text style={styles.dismissBtnText}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.takeActionBtn, (isUpdating || actionTaken === "none") && { opacity: 0.5 }]}
                    onPress={handleTakeAction}
                    disabled={isUpdating || actionTaken === "none"}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="shield-account" size={18} color="#FFFFFF" />
                        <Text style={styles.takeActionBtnText}>Take Action</Text>
                      </>
                    )}
                  </TouchableOpacity>
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 12 },
  backBtn: { padding: 10, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  headerTitleContainer: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: typography.title, fontWeight: "700", color: "#0F172A" },
  badge: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: typography.body, fontWeight: "600", color: "#475569" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 16 },
  // Tabs
  tabScroll: { marginBottom: 16 },
  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 4, borderWidth: 1, borderColor: "#E2E8F0" },
  tab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  tabTextActive: { color: "#FFFFFF" },
  // Card
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  cardMeta: { fontSize: 12, color: "#94A3B8" },
  cardHeaderRight: { alignItems: "flex-end", gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "800" },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  reviewBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  // Users row
  usersRow: { flexDirection: "row", gap: 10, marginBottom: 14, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12 },
  userBox: { flex: 1 },
  userBoxLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", marginBottom: 6 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
  userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  userAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  userName: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  userHandle: { fontSize: 11, color: "#6B7280", textDecorationLine: "underline" },
  userEmailSmall: { fontSize: 11, color: "#6B7280" },
  userEmail: { fontSize: 12, fontWeight: "600", color: "#0F172A", flex: 1 },
  // Description
  descriptionBox: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 12 },
  descriptionLabel: { fontSize: 12, fontWeight: "700", color: "#991B1B", marginBottom: 4 },
  descriptionText: { fontSize: 13, color: "#7F1D1D", lineHeight: 19 },
  // Empty
  emptyState: { alignItems: "center", paddingTop: 64, gap: 12 },
  emptyTitle: { fontSize: typography.title, fontWeight: "700", color: "#0F172A" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "88%", paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#0F172A" },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 10 },
  modalDetailGrid: { flexDirection: "row", gap: 16, marginBottom: 10 },
  modalDetailItem: { flex: 1, marginBottom: 8 },
  modalDetailLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 2 },
  modalDetailValue: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  modalDescBox: { backgroundColor: "#F8FAFC", borderRadius: 8, padding: 12, marginTop: 4 },
  modalDescLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600", marginBottom: 4 },
  modalDescText: { fontSize: 14, color: "#475569", lineHeight: 20 },
  modalEvidence: { width: 100, height: 100, borderRadius: 10, marginRight: 10, backgroundColor: "#F3F4F6" },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
  actionOptionsGrid: { gap: 8 },
  actionOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: "#E5E7EB" },
  actionOptionText: { fontSize: 14, color: "#6B7280" },
  modalTextInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 14, fontSize: 14, color: "#0F172A", minHeight: 80 },
  modalFooter: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center" },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  underReviewBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  underReviewBtnText: { fontSize: 12, fontWeight: "700", color: "#D97706" },
  dismissBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB", backgroundColor: "#F9FAFB" },
  dismissBtnText: { fontSize: 12, fontWeight: "700", color: "#6B7280" },
  takeActionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 10, backgroundColor: "#DC2626" },
  takeActionBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
