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
  getDisputes,
  updateDisputeStatus,
  Dispute,
} from "../../services/adminService";
import { colors, typography } from "../../theme";

export const AdminDisputesScreen = () => {
  const navigation = useNavigation();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDisputes();
      setDisputes(data);
    } catch (e) {
      setDisputes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (
    disputeId: string,
    action: "resolved" | "dismissed"
  ) => {
    const actionLabel = action === "resolved" ? "resolve" : "dismiss";

    Alert.alert(
      `${action === "resolved" ? "Resolve" : "Dismiss"} Dispute`,
      `Are you sure you want to ${actionLabel} this dispute?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "resolved" ? "Resolve" : "Dismiss",
          style: action === "dismissed" ? "destructive" : "default",
          onPress: async () => {
            setProcessingId(disputeId);
            try {
              const note = notes[disputeId] || "";
              await updateDisputeStatus(disputeId, action, note);
              setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
              setNotes((prev) => {
                const updated = { ...prev };
                delete updated[disputeId];
                return updated;
              });
            } catch (e) {
              Alert.alert(
                "Error",
                `Failed to ${actionLabel} dispute. Please try again.`
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

  const renderDispute = ({ item }: { item: Dispute }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="tag-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Rental ID:</Text>
            <Text style={styles.infoValue}>{item.rental_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reporter:</Text>
            <Text style={styles.infoValue}>{item.reporter_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{item.reason}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        <TextInput
          style={styles.noteInput}
          placeholder="Resolution note..."
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
          <TouchableOpacity
            style={[styles.actionBtn, styles.dismissBtn]}
            onPress={() => handleAction(item.id, "dismissed")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="close-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Dismiss</Text>
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
        data={disputes}
        keyExtractor={(item) => item.id}
        renderItem={renderDispute}
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
              <MaterialCommunityIcons name="alert-outline" size={24} color="#DC2626" />
              <Text style={styles.headerTitle}>Active Disputes</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{disputes.length} Open</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="check-circle-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>No Disputes</Text>
              <Text style={styles.emptySubtitle}>All clear! No open disputes at this time.</Text>
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
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: "#DC2626",
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
  resolveBtn: {
    backgroundColor: "#16A34A",
  },
  dismissBtn: {
    backgroundColor: "#64748B",
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
