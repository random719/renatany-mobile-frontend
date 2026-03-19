import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
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
import { useI18n } from "../../i18n";
import {
  getSecurityItems,
  getSecuritySettings,
  SecurityItem,
  updateSecurityItemOverride,
  updateSecuritySettings,
} from "../../services/adminService";
import { toast } from "../../store/toastStore";
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
  const { t } = useI18n();
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
      toast.error(t('adminSecurity.loadSettingsFailed'));
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
      toast.warning(t('adminSecurity.invalidThreshold'));
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
      toast.success(t('adminSecurity.settingsSaved'));
    } catch {
      toast.error(t('adminSecurity.settingsSaveFailed'));
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
        toast.info(t('adminSecurity.noItemsFound'));
      }
    } catch {
      toast.error(t('adminSecurity.loadItemsFailed'));
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
      toast.error(t('adminSecurity.updateOverrideFailed'));
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
        {item.high_risk_override ? t('adminSecurity.markedHighRisk') : t('adminSecurity.notMarkedHighRisk')}
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
            <Text style={styles.headerTitle}>{t('adminSecurity.title')}</Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>{t('nav.admin')}</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>{t('adminSecurity.subtitle')}</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'kyc' && styles.tabBtnActive]}
            onPress={() => setActiveTab('kyc')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'kyc' && styles.tabBtnTextActive]}>{t('adminSecurity.kycRules')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'overrides' && styles.tabBtnActive]}
            onPress={() => setActiveTab('overrides')}
          >
            <Text style={[styles.tabBtnText, activeTab === 'overrides' && styles.tabBtnTextActive]}>
              {t('adminSecurity.itemOverrides', { count: items.length })}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'kyc' ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('adminSecurity.kycHighRiskRules')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('adminSecurity.kycHighRiskRulesSubtitle')}
            </Text>

            <Text style={styles.fieldLabel}>{t('adminSecurity.kycAmountThreshold')}</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={thresholdInput}
              onChangeText={setThresholdInput}
              placeholder={t('adminSecurity.thresholdPlaceholder')}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helperText}>
              {t('adminSecurity.thresholdHint')}
            </Text>

            <Text style={styles.fieldLabel}>{t('adminSecurity.highRiskCategories')}</Text>
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
                      {t(`home.category.${category.value}`)}
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
                <Text style={styles.primaryBtnText}>{t('adminSecurity.saveSettings')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('adminSecurity.highRiskItemOverrides')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('adminSecurity.highRiskItemOverridesSubtitle')}
            </Text>

            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, styles.searchInput]}
                value={itemSearch}
                onChangeText={setItemSearch}
                placeholder={t('adminSecurity.searchPlaceholder')}
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
                <Text style={styles.emptyTitle}>{t('adminSecurity.noItemsTitle')}</Text>
                <Text style={styles.emptySubtitle}>
                  {t('adminSecurity.noItemsSubtitle')}
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
