import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Checkbox, Text } from "react-native-paper";
import { GlobalHeader } from "../../components/common/GlobalHeader";
import {
  getSecurityItems,
  getSecuritySettings,
  SecurityItem,
  updateSecurityItemOverride,
  updateSecuritySettings,
} from "../../services/adminService";
import { colors, typography } from "../../theme";

const CATEGORIES = [
  { name: 'Electronics', value: 'electronics' },
  { name: 'Tools', value: 'tools' },
  { name: 'Fashion', value: 'fashion' },
  { name: 'Sports', value: 'sports' },
  { name: 'Vehicles', value: 'vehicles' },
  { name: 'Home', value: 'home' },
  { name: 'Books', value: 'books' },
  { name: 'Music', value: 'music' },
  { name: 'Photography', value: 'photography' },
  { name: 'Other', value: 'other' },
];

export const AdminSecurityScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'kyc' | 'overrides'>('kyc');
  const [thresholdInput, setThresholdInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [items, setItems] = useState<SecurityItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [searchingItems, setSearchingItems] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const settings = await getSecuritySettings();
    setThresholdInput(String(settings.kyc_amount_threshold));
    setSelectedCategories(settings.kyc_high_risk_categories || []);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      await loadSettings();
    } catch {
      Alert.alert('Error', 'Failed to load security settings.');
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSettings();
      if (activeTab === 'overrides') {
        const data = await getSecurityItems({ search: itemSearch.trim() || undefined, limit: 50, offset: 0 });
        setItems(data);
      }
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, itemSearch, loadSettings]);

  const toggleCategory = (value: string) => {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((category) => category !== value) : [...prev, value]
    );
  };

  const handleSaveSettings = async () => {
    const threshold = parseInt(thresholdInput, 10);
    if (Number.isNaN(threshold) || threshold < 0) {
      Alert.alert('Invalid Threshold', 'Please enter a valid threshold number greater than or equal to 0.');
      return;
    }

    setSavingSettings(true);
    try {
      const updated = await updateSecuritySettings({
        kyc_amount_threshold: threshold,
        kyc_high_risk_categories: selectedCategories,
      });
      setThresholdInput(String(updated.kyc_amount_threshold));
      setSelectedCategories(updated.kyc_high_risk_categories || []);
      Alert.alert('Saved', 'Security settings saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save security settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSearchItems = async () => {
    setSearchingItems(true);
    try {
      const data = await getSecurityItems({
        search: itemSearch.trim() || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(data);
      if (data.length === 0) {
        Alert.alert('No Items Found', 'Try a different search term.');
      }
    } catch {
      Alert.alert('Error', 'Failed to load items.');
      setItems([]);
    } finally {
      setSearchingItems(false);
    }
  };

  const handleToggleHighRisk = async (item: SecurityItem) => {
    setTogglingId(item.id);
    try {
      const updated = await updateSecurityItemOverride(item.id, !item.high_risk_override);
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? updated : entry)));
    } catch {
      Alert.alert('Error', 'Failed to update item override.');
    } finally {
      setTogglingId(null);
    }
  };

  const renderOverrideItem = ({ item }: { item: SecurityItem }) => (
    <View style={styles.overrideCard}>
      <View style={styles.overrideHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overrideTitle}>{item.title}</Text>
          <Text style={styles.overrideMeta}>
            {item.category} {item.daily_rate != null ? `• $${item.daily_rate}` : ''}
          </Text>
        </View>
        {togglingId === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Checkbox
            status={item.high_risk_override ? 'checked' : 'unchecked'}
            onPress={() => handleToggleHighRisk(item)}
          />
        )}
      </View>
      <Text style={styles.overrideHint}>
        {item.high_risk_override ? 'Marked as high-risk override' : 'Not marked as high-risk override'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <MaterialCommunityIcons name="shield-check-outline" size={24} color="#475569" />
            <Text style={styles.headerTitle}>Security & Risk</Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>Configure KYC rules and high-risk item overrides.</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'kyc' && styles.tabBtnActive]}
            onPress={() => setActiveTab('kyc')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'kyc' && styles.tabBtnTextActive]}>KYC & Rules</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overrides' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overrides')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'overrides' && styles.tabBtnTextActive]}>
              Item Overrides ({items.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'kyc' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>KYC & High-Risk Rules</Text>
            <Text style={styles.sectionSubtitle}>
              Configure when identity verification is required and which categories are treated as high-risk.
            </Text>

            <Text style={styles.fieldLabel}>KYC amount threshold</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={thresholdInput}
              onChangeText={setThresholdInput}
              placeholder="e.g. 500"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helperText}>
              Rentals above this value may require identity verification.
            </Text>

            <Text style={styles.fieldLabel}>High-risk categories</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((category) => {
                const selected = selectedCategories.includes(category.value);
                return (
                  <TouchableOpacity
                    key={category.value}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => toggleCategory(category.value)}
                  >
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, savingSettings && styles.disabledBtn]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>High-Risk Item Overrides</Text>
            <Text style={styles.sectionSubtitle}>
              Search items and mark them as high-risk. This overrides the category-based rule.
            </Text>

            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                value={itemSearch}
                onChangeText={setItemSearch}
                placeholder="Search by item title..."
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                style={[styles.searchBtn, searchingItems && styles.disabledBtn]}
                onPress={handleSearchItems}
                disabled={searchingItems}
              >
                {searchingItems ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="magnify" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            {items.length > 0 ? (
              <FlatList
                data={items}
                keyExtractor={(item) => item.id}
                renderItem={renderOverrideItem}
                scrollEnabled={false}
                contentContainerStyle={styles.overrideList}
              />
            ) : (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-circle-outline" size={56} color="#22C55E" />
                <Text style={styles.emptyTitle}>No items to show</Text>
                <Text style={styles.emptySubtitle}>
                  Search by item title to find and manage high-risk overrides.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: '700',
    color: '#0F172A',
  },
  adminBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 10,
    marginBottom: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 18,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryChipSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  searchBtn: {
    width: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overrideList: {
    gap: 12,
  },
  overrideCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  overrideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  overrideTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  overrideMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  overrideHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
