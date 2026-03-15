import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { GlobalHeader } from '../../../components/common/GlobalHeader';
import { Footer } from '../../../components/home/Footer';
import { useListingStore } from '../../../store/listingStore';
import { SavedSearch } from '../../../types/listing';

export const SavedSearchesScreen = () => {
    const navigation = useNavigation();
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
            Alert.alert('Error', 'Failed to update notifications.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = (search: SavedSearch) => {
        Alert.alert(
            'Delete Saved Search',
            `Are you sure you want to delete "${search.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(search.id);
                        try {
                            await deleteSavedSearch(search.id);
                        } catch {
                            Alert.alert('Error', 'Failed to delete saved search.');
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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderSearchCard = (search: SavedSearch) => {
        const isUpdating = updatingId === search.id;
        const isDeleting = deletingId === search.id;
        const filters = search.filters;

        return (
            <View key={search.id} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                        <MaterialCommunityIcons name="bookmark" size={20} color="#CA8A04" />
                        <Text style={styles.cardTitle} numberOfLines={1}>{search.name}</Text>
                    </View>
                    {search.notify_new_items ? (
                        <View style={styles.notifBadgeOn}>
                            <MaterialCommunityIcons name="bell" size={12} color="#166534" />
                            <Text style={styles.notifBadgeOnText}>On</Text>
                        </View>
                    ) : (
                        <View style={styles.notifBadgeOff}>
                            <MaterialCommunityIcons name="bell-off" size={12} color="#6B7280" />
                            <Text style={styles.notifBadgeOffText}>Off</Text>
                        </View>
                    )}
                </View>

                <View style={styles.filterBadges}>
                    {filters?.search_query ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Search: {filters.search_query}</Text>
                        </View>
                    ) : null}
                    {filters?.location ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Location: {filters.location}</Text>
                        </View>
                    ) : null}
                    {filters?.category && filters.category !== 'all' ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>Category: {filters.category}</Text>
                        </View>
                    ) : null}
                    {(filters?.min_price || filters?.max_price) ? (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                                Price: ${filters.min_price || '0'} - ${filters.max_price || '∞'}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.applyBtn} onPress={() => handleApplySearch(search)}>
                        <MaterialCommunityIcons name="magnify" size={16} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>Apply</Text>
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

                    <Text style={styles.dateText}>
                        {formatDate(search.created_at)}
                    </Text>
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
                        <Text style={styles.backBtnText}>Back to Browse</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="bookmark" size={32} color="#2563EB" />
                        <Text style={styles.title}>Saved Searches</Text>
                    </View>

                    <Text style={styles.countText}>
                        {isSavedSearchesLoading ? 'Loading...' : `${savedSearches.length} saved search${savedSearches.length !== 1 ? 'es' : ''}`}
                    </Text>
                </View>

                {isSavedSearchesLoading && savedSearches.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.loadingText}>Loading saved searches...</Text>
                    </View>
                ) : savedSearches.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="bookmark-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                        <Text style={styles.emptyTitle}>No saved searches yet.</Text>
                        <Text style={styles.emptySubtitle}>
                            Save your search criteria to get notified{"\n"}when new items match!
                        </Text>
                        <TouchableOpacity
                            style={styles.startSearchBtn}
                            onPress={() => navigation.getParent()?.navigate('HomeTab')}
                        >
                            <Text style={styles.startSearchBtnText}>Start Searching</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.searchList}>
                        {savedSearches.map(renderSearchCard)}
                    </View>
                )}

                <Footer />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 8,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 28,
    },
    backBtnText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '500',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    countText: {
        color: '#64748B',
        fontSize: 16,
        marginBottom: 24,
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
        borderRadius: 12,
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
        fontSize: 20,
        fontWeight: '500',
        color: '#64748B',
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
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FDE047',
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#111827',
        flex: 1,
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
    filterBadges: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    badge: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
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
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    outlineBtn: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtn: {
        borderColor: '#FECACA',
    },
    dateText: {
        marginLeft: 'auto',
        fontSize: 13,
        color: '#9CA3AF',
    },
});
