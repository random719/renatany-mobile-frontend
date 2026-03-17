import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
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
  getPendingRequests,
  RentalRequest,
  updateRentalRequestStatus,
} from "../../services/adminService";
import { api } from "../../services/api";
import { toast } from "../../store/toastStore";
import { colors, typography } from "../../theme";
import { RootStackParamList } from "../../types/navigation";

type Nav = StackNavigationProp<RootStackParamList>;

export const AdminModerationScreen = () => {
  const navigation = useNavigation<Nav>();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [items, setItems] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPendingRequests();
      setRequests(data);

      // Fetch only items referenced by pending requests (like frontend-v1)
      if (data.length > 0) {
        const itemIds = [...new Set(data.map((r) => r.item_id).filter(Boolean))];
        if (itemIds.length > 0) {
          try {
            const idsParam = itemIds.join(",");
            const res = await api.get("/items", {
              params: { ids: idsParam },
            });
            const fetchedItems = res.data?.data || res.data || [];
            const itemsMap: Record<string, string> = {};
            (Array.isArray(fetchedItems) ? fetchedItems : []).forEach(
              (item: any) => {
                itemsMap[item.id] = item.title;
              }
            );
            setItems(itemsMap);
          } catch (e) {
            console.error("Error fetching items for requests:", e);
          }
        }
      }
    } catch (e) {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (
    requestId: string,
    action: "approved" | "rejected"
  ) => {
    const actionLabel = action === "approved" ? "approve" : "reject";

    Alert.alert(
      `${action === "approved" ? "Approve" : "Reject"} Request`,
      `Are you sure you want to ${actionLabel} this rental request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action === "approved" ? "Approve" : "Reject",
          style: action === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setProcessingId(requestId);
            try {
              const note = notes[requestId] || "";
              await updateRentalRequestStatus(requestId, action, note);
              setRequests((prev) => prev.filter((r) => r.id !== requestId));
              setNotes((prev) => {
                const updated = { ...prev };
                delete updated[requestId];
                return updated;
              });
            } catch (e) {
              toast.error(`Failed to ${actionLabel} request. Please try again.`);
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

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const renderRequest = ({ item }: { item: RentalRequest }) => {
    const isProcessing = processingId === item.id;

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestInfo}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="account-outline"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Submitted by:</Text>
            <Text style={styles.infoValue}>{item.renter_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="account-arrow-right-outline"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Owner:</Text>
            <Text style={styles.infoValue}>{item.owner_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Item:</Text>
            <Text style={styles.infoValue}>
              {items[item.item_id] || "Loading..."}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="calendar-range-outline"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Dates:</Text>
            <Text style={styles.infoValue}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="currency-usd"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Amount:</Text>
            <Text style={[styles.infoValue, { fontWeight: "700" }]}>
              ${item.total_amount?.toFixed(2) ?? "0.00"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Submitted:</Text>
            <Text style={styles.infoValue}>
              {formatDateTime(item.created_date)}
            </Text>
          </View>
          {item.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Message:</Text>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        </View>

        <Text style={styles.noteLabel}>
          Optional Note (will be added to request):
        </Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note for this request..."
          placeholderTextColor="#9CA3AF"
          value={notes[item.id] || ""}
          onChangeText={(text) =>
            setNotes((prev) => ({ ...prev, [item.id]: text }))
          }
          editable={!isProcessing}
          multiline
        />

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleAction(item.id, "approved")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.actionBtnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleAction(item.id, "rejected")}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="close-circle-outline"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.actionBtnText}>Reject</Text>
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
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <MaterialCommunityIcons
                  name="arrow-left"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={24}
                  color="#2563EB"
                />
                <Text style={styles.headerTitle}>
                  Pending Rental Requests
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={loadData}
                disabled={isLoading}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color={colors.textPrimary}
                  style={
                    isLoading
                      ? { transform: [{ rotate: "45deg" }] }
                      : {}
                  }
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Review and approve or reject rental requests
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {requests.length} Pending Request
                {requests.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginTop: 48 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={64}
                color="#16A34A"
              />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>
                No pending rental requests at this time.
              </Text>
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
    marginBottom: 8,
    gap: 12,
  },
  backBtn: {
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refreshBtn: {
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
  headerSubtitle: {
    fontSize: typography.body,
    color: "#64748B",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  badgeText: {
    fontSize: typography.body,
    fontWeight: "600",
    color: "#2563EB",
  },
  requestCard: {
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
  requestInfo: {
    gap: 10,
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
  messageBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  messageLabel: {
    fontSize: typography.small,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  messageText: {
    fontSize: typography.body,
    color: "#334155",
  },
  noteLabel: {
    fontSize: typography.small,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: typography.body,
    color: "#0F172A",
    minHeight: 70,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginBottom: 16,
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
  approveBtn: {
    backgroundColor: "#16A34A",
  },
  rejectBtn: {
    backgroundColor: "#DC2626",
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
