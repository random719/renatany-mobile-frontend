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
import { colors, typography } from "../../theme";

export const AdminListingReportsScreen = () => {
  const navigation = useNavigation();
  const [reports, setReports] = useState<ListingReport[]>([]);
  const [items, setItems] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ListingReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("none");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
    } catch (e) {
      setReports([]);
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
      Alert.alert("Success", `Report marked as ${newStatus}`);
    } catch (e) {
      Alert.alert("Error", "Failed to update report status");
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

  const renderReport = ({ item }: { item: ListingReport }) => {
    const statusColor = getStatusColor(item.status);

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
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#64748B" />
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{item.reason}</Text>
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
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#DC2626" />
              <Text style={styles.headerTitle}>Listing Reports</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{reports.filter(r => r.status === 'pending').length} New</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shield-check-outline" size={64} color="#16A34A" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>No pending listing reports to review.</Text>
            </View>
          )
        }
      />

      <Portal>
        <Modal
          visible={!!selectedReport}
          onDismiss={() => setSelectedReport(null)}
          contentContainerStyle={styles.modalContainer}
        >
          {selectedReport && (
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>Review Report</Text>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Item</Text>
                <Text style={styles.modalValue}>{items[selectedReport.item_id] || "Unknown Item"}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Reason</Text>
                <Text style={[styles.modalValue, { color: '#DC2626', fontWeight: '700' }]}>{selectedReport.reason.toUpperCase()}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={styles.modalDescription}>{selectedReport.description}</Text>
              </View>

              {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Evidence ({selectedReport.evidence_urls.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evidenceRow}>
                    {selectedReport.evidence_urls.map((url, idx) => (
                      <Image key={idx} source={{ uri: url }} style={styles.evidenceImage} />
                    ))}
                  </ScrollView>
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
                mode="text" 
                onPress={() => setSelectedReport(null)} 
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
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
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
