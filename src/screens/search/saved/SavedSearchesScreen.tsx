import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { toast } from '../../../store/toastStore';
import { GlobalHeader } from '../../../components/common/GlobalHeader';
import { Footer } from '../../../components/home/Footer';
import { useI18n } from '../../../i18n';
import { useListingStore } from '../../../store/listingStore';
import { SavedSearch } from '../../../types/listing';

export const SavedSearchesScreen = () => {
    const navigation = useNavigation();
    const { language, t } = useI18n();
    const {
        savedSearches,
        isSavedSearchesLoading,
        fetchSavedSearches,
        updateSavedSearch,
        deleteSavedSearch,
        setActiveFilter,
    } = useListingStore();

    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            fetchSavedSearches();
        }, [fetchSavedSearches])
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSavedSearches();
        setRefreshing(false);
    }, [fetchSavedSearches]);

    const handleApplySearch = (search: SavedSearch) => {
        const filter: Record<string, any> = {};
        if (search.filters?.search_query) filter.query = search.filters.search_query;
        if (search.filters?.location) filter.location = search.filters.location;
        if (search.filters?.category && search.filters.category !== 'all') filter.category = search.filters.category;
        if (search.filters?.min_price) filter.minPrice = search.filters.min_price;
        if (search.filters?.max_price) filter.maxPrice = search.filters.max_price;

        setActiveFilter(filter);
        useListingStore.setState({ activeFilter: filter });
        useListingStore.getState().fetchListings();
        navigation.getParent()?.navigate('HomeTab');
    };

    const handleToggleNotifications = async (search: SavedSearch) => {
        setUpdatingId(search.id);
        try {
            await updateSavedSearch(search.id, {
                notify_new_items: !search.notify_new_items,
            });
        } catch {
            toast.error(t('savedSearches.updateNotificationsFailed'));
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = (search: SavedSearch) => {
        Alert.alert(
            t('savedSearches.deleteTitle'),
            t('savedSearches.deletePrompt', { name: search.name }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(search.id);
                        try {
                            await deleteSavedSearch(search.id);
                        } catch {
                            toast.error(t('savedSearches.deleteFailed'));
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderSearchCard = (search: SavedSearch) => {
        const isUpdating = updatingId === search.id;
        const isDeleting = deletingId === search.id;
        const filters = search.filters;

        return (
            <View key={search.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                        <View style={styles.cardIconWrap}>
                            <MaterialCommunityIcons name="bookmark" size={18} color="#CA8A04" />
                        </View>
                        <View style={styles.cardTitleBlock}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{search.name}</Text>
                            <Text style={styles.cardMeta}>{t('savedSearches.savedOn', { date: formatDate(search.created_at) })}</Text>
                        </View>
                    </View>
                    {search.notify_new_items ? (
                        <View style={styles.notifBadgeOn}>
                            <MaterialCommunityIcons name="bell" size={12} color="#166534" />
                            <Text style={styles.notifBadgeOnText}>{t('common.on')}</Text>
                        </View>
                    ) : (
                        <View style={styles.notifBadgeOff}>
                            <MaterialCommunityIcons name="bell-off" size={12} color="#6B7280" />
                            <Text style={styles.notifBadgeOffText}>{t('common.off')}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.criteriaHeader}>
                    <MaterialCommunityIcons name="tune-variant" size={14} color="#64748B" />
                    <Text style={styles.criteriaHeaderText}>{t('savedSearches.searchCriteria')}</Text>
                </View>
                <View style={styles.filterBadges}>
                    {filters?.search_query ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('savedSearches.search', { value: filters.search_query })}</Text>
                        </View>
                    ) : null}
                    {filters?.location ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('savedSearches.location', { value: filters.location })}</Text>
                        </View>
                    ) : null}
                    {filters?.category && filters.category !== 'all' ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{t('savedSearches.category', { value: filters.category })}</Text>
                        </View>
                    ) : null}
                    {(filters?.min_price || filters?.max_price) ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                {t('savedSearches.price', { min: filters.min_price || '0', max: filters.max_price || '∞' })}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.applyBtn} onPress={() => handleApplySearch(search)}>
                        <MaterialCommunityIcons name="magnify" size={16} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>{t('common.apply')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.outlineBtn}
                        onPress={() => handleToggleNotifications(search)}
                        disabled={isUpdating}
                    >
                        {isUpdating ? (
                            <ActivityIndicator size={14} color="#6B7280" />
                        ) : (
                            <MaterialCommunityIcons
                                name={search.notify_new_items ? 'bell-off' : 'bell'}
                                size={16}
                                color="#374151"
                            />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.outlineBtn, styles.deleteBtn]}
                        onPress={() => handleDelete(search)}
                        disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator size={14} color="#DC2626" />
                            ) : (
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#DC2626" />
                            )}
                        </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                <View style={styles.headerSection}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={20} color="#475569" />
                        <Text style={styles.backBtnText}>{t('common.backToBrowse')}</Text>
                    </TouchableOpacity>

                    <View style={styles.headerCard}>
                        <View style={styles.titleRow}>
                            <View style={styles.headerIconWrap}>
                                <MaterialCommunityIcons name="bookmark" size={24} color="#2563EB" />
                            </View>
                            <View style={styles.headerTextBlock}>
                                <Text style={styles.title}>{t('savedSearches.title')}</Text>
                                <Text style={styles.countText}>
                                    {isSavedSearchesLoading ? t('common.loading') : t(savedSearches.length === 1 ? 'savedSearches.count' : 'savedSearches.count_plural', { count: savedSearches.length })}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.headerHintBox}>
                            <MaterialCommunityIcons name="bell-ring-outline" size={16} color="#1D4ED8" />
                            <Text style={styles.headerHintText}>
                                {t('savedSearches.hint')}
                            </Text>
                        </View>
                    </View>
                </View>

                {isSavedSearchesLoading && savedSearches.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.loadingText}>{t('savedSearches.loading')}</Text>
                    </View>
                ) : savedSearches.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="bookmark-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                        <Text style={styles.emptyTitle}>{t('savedSearches.emptyTitle')}</Text>
                        <Text style={styles.emptySubtitle}>
                            {t('savedSearches.emptySubtitle')}
                        </Text>
                        <TouchableOpacity
                            style={styles.startSearchBtn}
                            onPress={() => navigation.getParent()?.navigate('HomeTab')}
                        >
                            <Text style={styles.startSearchBtnText}>{t('savedSearches.startSearching')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.searchList}>
                        {savedSearches.map(renderSearchCard)}
                    </View>
                )}

                <View style={styles.footerSpacer} />
                <Footer />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 0,
    },
    headerSection: {
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 8,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 18,
        alignSelf: 'flex-start',
    },
    backBtnText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '500',
    },
    headerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 18,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
        elevation: 3,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    headerIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextBlock: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    countText: {
        color: '#64748B',
        fontSize: 15,
        marginTop: 4,
    },
    headerHintBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#EFF6FF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    headerHintText: {
        flex: 1,
        color: '#1D4ED8',
        fontSize: 14,
        lineHeight: 20,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 48,
        gap: 12,
    },
    loadingText: {
        color: '#6B7280',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 56,
        paddingHorizontal: 24,
        marginHorizontal: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    emptyIcon: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 32,
    },
    startSearchBtn: {
        backgroundColor: '#111827',
        borderRadius: 8,
        paddingHorizontal: 28,
        paddingVertical: 14,
    },
    startSearchBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    searchList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    footerSpacer: {
        height: 28,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#FDE047',
        padding: 18,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    cardIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FEF9C3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleBlock: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
        flex: 1,
    },
    cardMeta: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 4,
    },
    notifBadgeOn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#DCFCE7',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    notifBadgeOnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
    },
    notifBadgeOff: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    notifBadgeOffText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
    },
    criteriaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    criteriaHeaderText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    filterBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F8FAFC',
    },
    badgeText: {
        fontSize: 13,
        color: '#374151',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 12,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    applyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#111827',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 11,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 2,
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtn: {
        borderColor: '#FECACA',
    },
});
