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
  getFraudReports,
  updateFraudReportStatus,
  FraudReport,
} from "../../services/adminService";
import { colors, typography } from "../../theme";

export const AdminFraudReportsScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<FraudReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFraudReports();
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
    action: "investigating" | "resolved"
  ) => {
    const actionLabel = action === "investigating" ? "start investigation" : "resolve";

    Alert.alert(
      action === "investigating" ? "Investigate Alert" : "Resolve Alert",
      `Are you sure you want to ${actionLabel} on this fraud alert?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "investigating" ? "Investigate" : "Resolve",
          style: action === "resolved" ? "default" : "destructive",
          onPress: async () => {
            setProcessingId(reportId);
            try {
              const note = notes[reportId] || "";
              await updateFraudReportStatus(reportId, action, note);
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#DC2626";
      case "high": return "#EA580C";
      case "medium": return "#D97706";
      default: return "#64748B";
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const renderReport = ({ item }: { item: FraudReport }) => {
    const isProcessing = processingId === item.id;
    const severityColor = getSeverityColor(item.severity);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor + '15', borderColor: severityColor }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>{item.severity.toUpperCase()}</Text>
          </View>
          <Text style={styles.reportType}>{item.type}</Text>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Details:</Text>
            <Text style={styles.infoValue}>{item.details}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Detected:</Text>
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
            style={[styles.actionBtn, styles.investigateBtn]}
            onPress={() => handleAction(item.id, "investigating")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Investigate</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.resolveBtn]}
            onPress={() => handleAction(item.id, "resolved")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Resolve</Text>
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
              <MaterialCommunityIcons name="shield-alert-outline" size={24} color="#A855F7" />
              <Text style={styles.headerTitle}>Fraud Alerts</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reports.length} Alerts</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shield-check-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>Secure</Text>
              <Text style={styles.emptySubtitle}>No fraud alerts detected at this time.</Text>
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
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: "#7C3AED",
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  reportType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  cardInfo: {
    gap: 10,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    gap: 8,
  },
  infoLabel: {
    fontSize: typography.body,
    fontWeight: "600",
    color: "#64748B",
    width: 70,
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
  investigateBtn: {
    backgroundColor: "#2563EB",
  },
  resolveBtn: {
    backgroundColor: "#16A34A",
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
