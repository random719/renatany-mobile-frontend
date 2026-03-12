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
  getPendingRequests,
  RentalRequest,
  updateRentalRequestStatus,
} from "../../services/adminService";
import { getListings } from "../../services/listingService";
import { colors, typography } from "../../theme";

export const AdminModerationScreen = () => {
  const navigation = useNavigation();
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

      if (data.length > 0) {
        const itemIds = [...new Set(data.map(r => r.item_id).filter(Boolean))];
        if (itemIds.length > 0) {
          try {
            // Using getListings with params if supported, or falling back to individual fetches if needed
            // For now, let's try to fetch them or at least prepare the mapping
            const fetchedItems = await getListings({ limit: 100 }); // Simple approach for now
            const itemsMap: Record<string, string> = {};
            fetchedItems.forEach(item => {
              itemsMap[item.id] = item.title;
            });
            setItems(itemsMap);
          } catch (e) {
            console.error("Error fetching items for requests:", e);
          }
        }
      }
    } catch (e) {
      // API not connected yet — show empty state
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
              Alert.alert(
                "Error",
                `Failed to ${actionLabel} request. Please try again.`
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
            <Text style={styles.infoLabel}>Renter:</Text>
            <Text style={styles.infoValue}>{item.renter_email}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={16}
              color="#64748B"
            />
            <Text style={styles.infoLabel}>Item:</Text>
            <Text style={styles.infoValue}>{items[item.item_id] || 'Loading Item...'}</Text>
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
              {formatDate(item.created_date)}
            </Text>
          </View>
          {item.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{item.message}</Text>
            </View>
          )}
        </View>

        <TextInput
          style={styles.noteInput}
          placeholder="Optional note..."
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
              <Text style={styles.headerTitle}>Pending Rental Requests</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {requests.length} Pending
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
                style={isLoading ? { transform: [{ rotate: '45deg' }] } : {}}
              />
            </TouchableOpacity>
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
  badge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: typography.caption,
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
  messageBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  messageText: {
    fontSize: typography.body,
    color: "#334155",
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
