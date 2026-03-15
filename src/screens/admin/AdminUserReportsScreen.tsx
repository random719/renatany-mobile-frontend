import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { GlobalHeader } from "../../components/common/GlobalHeader";
import {
  getUserReports,
  updateUserReportStatus,
  UserReport,
} from "../../services/adminService";
import { colors, typography } from "../../theme";

export const AdminUserReportsScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserReports();
      setReports(data);
    } catch (e) {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (
    reportId: string,
    action: "reviewed" | "action_taken"
  ) => {
    const actionLabel = action === "reviewed" ? "mark as reviewed" : "take action";

    Alert.alert(
      action === "reviewed" ? "Review Report" : "Take Action",
      `Are you sure you want to ${actionLabel} on this report?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "reviewed" ? "Reviewed" : "Take Action",
          style: action === "action_taken" ? "destructive" : "default",
          onPress: async () => {
            setProcessingId(reportId);
            try {
              const note = notes[reportId] || "";
              await updateUserReportStatus(reportId, action, note);
              setReports((prev) => prev.filter((r) => r.id !== reportId));
              setNotes((prev) => {
                const updated = { ...prev };
                delete updated[reportId];
                return updated;
              });
            } catch (e) {
              Alert.alert(
                "Error",
                `Failed to ${actionLabel}. Please try again.`
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const renderReport = ({ item }: { item: UserReport }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-alert-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reported User:</Text>
            <Text style={styles.infoValue}>{item.reported_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reporter:</Text>
            <Text style={styles.infoValue}>{item.reporter_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="comment-text-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{item.reason}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(item.created_date || item.created_at)}</Text>
          </View>
        </View>

        <TextInput
          style={styles.noteInput}
          placeholder="Admin note..."
          placeholderTextColor="#9CA3AF"
          value={notes[item.id] || ""}
          onChangeText={(text) =>
            setNotes((prev) => ({ ...prev, [item.id]: text }))
          }
          editable={!isProcessing}
          multiline
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.reviewBtn]}
            onPress={() => handleAction(item.id, "reviewed")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="eye-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Reviewed</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnTaken]}
            onPress={() => handleAction(item.id, "action_taken")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="shield-account-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Take Action</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={24} color="#D97706" />
              <Text style={styles.headerTitle}>User Reports</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reports.length} Pending</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>No pending user reports requiring attention.</Text>
            </View>
          )
        }
      />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
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
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: "#D97706",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInfo: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: typography.body,
    fontWeight: "600",
    color: "#64748B",
  },
  infoValue: {
    fontSize: typography.body,
    color: "#0F172A",
    flex: 1,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: typography.body,
    color: "#0F172A",
    minHeight: 60,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  reviewBtn: {
    backgroundColor: "#4B5563",
  },
  actionBtnTaken: {
    backgroundColor: "#D97706",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: typography.body,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: typography.body,
    color: "#64748B",
  },
});
