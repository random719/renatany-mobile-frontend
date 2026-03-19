import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { toast } from '../../store/toastStore';
import { ActivityIndicator, Button, Checkbox, Menu, Text, TextInput, Surface } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { colors, typography } from '../../theme';
import { BulkEditChanges } from '../../types/listing';
import { useListingStore } from '../../store/listingStore';
import { useI18n } from '../../i18n';

const INITIAL_BULK_CHANGES: BulkEditChanges = {
    availability: null,
    min_rental_days: '',
    max_rental_days: '',
    notice_period_hours: '',
    instant_booking: null,
    same_day_pickup: null,
    daily_rate_multiplier: '',
    deposit: '',
};

export const BulkEditItemsScreen = () => {
    const { t } = useI18n();
    const navigation = useNavigation();
    const { user } = useUser();
    const { userItems, isLoading, isSubmitting, fetchUserItems, updateItem, deleteItem } = useListingStore();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [bulkChanges, setBulkChanges] = useState<BulkEditChanges>(INITIAL_BULK_CHANGES);
    const [availabilityMenuVisible, setAvailabilityMenuVisible] = useState(false);
    const [instantBookingMenuVisible, setInstantBookingMenuVisible] = useState(false);
    const [sameDayPickupMenuVisible, setSameDayPickupMenuVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchUserItems(user.id);
        }
    }, [user?.id, fetchUserItems]);

    const onRefresh = useCallback(async () => {
        if (!user?.id) return;
        setRefreshing(true);
        try {
            await fetchUserItems(user.id);
        } finally {
            setRefreshing(false);
        }
    }, [user?.id, fetchUserItems]);

    const toggleSelection = useCallback((id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const toggleSelectAll = useCallback(() => {
        if (selectedItems.length === userItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(userItems.map(item => item.id));
        }
    }, [selectedItems.length, userItems]);

    const handleBulkDelete = useCallback(async () => {
        if (selectedItems.length === 0) {
            toast.warning(t('bulkEdit.selectDeleteWarning'));
            return;
        }
        Alert.alert(
            t('bulkEdit.deleteConfirmTitle', { count: selectedItems.length }),
            t('bulkEdit.deleteConfirmBody'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('bulkEdit.deleteConfirmAction', { count: selectedItems.length }),
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            for (const itemId of selectedItems) {
                                await deleteItem(itemId);
                            }
                            toast.success(t('bulkEdit.deleteSuccess', { count: selectedItems.length }));
                            setSelectedItems([]);
                            if (user?.id) fetchUserItems(user.id);
                        } catch (error) {
                            console.error('Bulk delete error:', error);
                            toast.error(t('bulkEdit.deleteFailed'));
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    }, [selectedItems, deleteItem, fetchUserItems, user?.id, t]);

    const handleBulkUpdate = useCallback(async () => {
        if (selectedItems.length === 0) {
            toast.warning(t('bulkEdit.selectUpdateWarning'));
            return;
        }
        const changesCount = Object.values(bulkChanges).filter(v => v !== null && v !== '').length;
        if (changesCount === 0) {
            toast.warning(t('bulkEdit.noChangesWarning'));
            return;
        }

        Alert.alert(
            t('bulkEdit.updateConfirmTitle'),
            t('bulkEdit.updateConfirmBody', { count: selectedItems.length }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.apply'),
                    onPress: async () => {
                        try {
                            const baseUpdates: Record<string, any> = {};
                            if (bulkChanges.availability !== null) baseUpdates.availability = bulkChanges.availability;
                            if (bulkChanges.min_rental_days !== '') baseUpdates.min_rental_days = parseInt(bulkChanges.min_rental_days);
                            if (bulkChanges.max_rental_days !== '') baseUpdates.max_rental_days = parseInt(bulkChanges.max_rental_days);
                            if (bulkChanges.notice_period_hours !== '') baseUpdates.notice_period_hours = parseInt(bulkChanges.notice_period_hours);
                            if (bulkChanges.instant_booking !== null) baseUpdates.instant_booking = bulkChanges.instant_booking;
                            if (bulkChanges.same_day_pickup !== null) baseUpdates.same_day_pickup = bulkChanges.same_day_pickup;
                            if (bulkChanges.deposit !== '') baseUpdates.deposit = parseFloat(bulkChanges.deposit);

                            for (const itemId of selectedItems) {
                                const item = userItems.find(i => i.id === itemId);
                                if (!item) continue;
                                const itemUpdates = { ...baseUpdates };
                                if (bulkChanges.daily_rate_multiplier !== '') {
                                    const multiplier = parseFloat(bulkChanges.daily_rate_multiplier);
                                    const currentRate = item.daily_rate ?? item.pricePerDay;
                                    itemUpdates.daily_rate = currentRate * multiplier;
                                }
                                await updateItem(itemId, itemUpdates);
                            }

                            toast.success(t('bulkEdit.updateSuccess', { count: selectedItems.length }));
                            setSelectedItems([]);
                            setBulkChanges(INITIAL_BULK_CHANGES);
                            if (user?.id) fetchUserItems(user.id);
                        } catch (error) {
                            console.error('Bulk update error:', error);
                            toast.error(t('bulkEdit.updateFailed'));
                        }
                    },
                },
            ]
        );
    }, [selectedItems, bulkChanges, userItems, updateItem, fetchUserItems, user?.id, t]);

    const triStateOptions = [
        { value: null, label: t('bulkEdit.noChange') },
        { value: true, label: t('bulkEdit.yes') },
        { value: false, label: t('bulkEdit.no') },
    ];

    const getTriStateLabel = (value: boolean | null) =>
        triStateOptions.find(o => o.value === value)?.label || t('bulkEdit.noChange');

    return (
        <ScreenLayout onRefresh={onRefresh} refreshing={refreshing} showBottomNav bottomNavActiveKey="none">
                <View style={styles.contentWrapper}>
                    {/* Header Section */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.pageTitle}>{t('bulkEdit.title')}</Text>
                            <Text style={styles.pageSubtitle}>
                                {t('bulkEdit.subtitle')}
                            </Text>
                        </View>

                        <View style={styles.selectedCountBadge}>
                            <Text style={styles.selectedCountText}>{t('bulkEdit.selectedCount', { selected: selectedItems.length, total: userItems.length })}</Text>
                        </View>
                    </View>

                    {/* Your Items Card */}
                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{t('bulkEdit.yourItems')}</Text>
                            <View style={styles.actionButtonsRow}>
                                <Button
                                    mode="contained"
                                    icon={isDeleting ? undefined : "trash-can-outline"}
                                    style={styles.deleteBtn}
                                    labelStyle={styles.deleteBtnLabel}
                                    onPress={handleBulkDelete}
                                    disabled={selectedItems.length === 0 || isSubmitting || isDeleting}
                                    loading={isDeleting}
                                >
                                    {isDeleting ? t('bulkEdit.deleting') : t('bulkEdit.deleteSelected', { count: selectedItems.length })}
                                </Button>
                                <Button
                                    mode="outlined"
                                    style={styles.selectAllBtn}
                                    labelStyle={styles.selectAllBtnLabel}
                                    onPress={toggleSelectAll}
                                >
                                    {selectedItems.length === userItems.length ? t('bulkEdit.deselectAll') : t('bulkEdit.selectAll')}
                                </Button>
                            </View>
                        </View>

                        {/* List of Items */}
                        <View style={styles.itemListContainer}>
                            {isLoading ? (
                                <ActivityIndicator size="large" style={{ padding: 24 }} />
                            ) : userItems.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <MaterialCommunityIcons name="calendar-blank-outline" size={56} color="#CBD5E1" />
                                    <Text style={styles.emptyStateTitle}>{t('bulkEdit.noItemsTitle')}</Text>
                                    <Text style={styles.emptyStateSubtitle}>{t('bulkEdit.noItemsSubtitle')}</Text>
                                </View>
                            ) : (
                                userItems.map(item => {
                                    const isAvailable = item.isActive !== false && (item as any).availability !== false;
                                    return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[styles.itemRow, selectedItems.includes(item.id) && styles.itemRowSelected, { marginBottom: 8 }]}
                                        onPress={() => toggleSelection(item.id)}
                                        activeOpacity={0.8}
                                    >
                                        <Checkbox.Android
                                            status={selectedItems.includes(item.id) ? 'checked' : 'unchecked'}
                                            onPress={() => toggleSelection(item.id)}
                                            color="#0F172A"
                                            uncheckedColor="#CBD5E1"
                                        />
                                        {item.images?.[0] ? (
                                            <Image source={{ uri: item.images[0] }} style={styles.itemImagePlaceholder as any} />
                                        ) : (
                                            <View style={styles.itemImagePlaceholder}>
                                                <MaterialCommunityIcons name="camera-outline" size={24} color="#64748B" />
                                            </View>
                                        )}
                                        <View style={styles.itemDetails}>
                                            <Text style={styles.itemName} numberOfLines={1}>{item.title}</Text>
                                            <View style={styles.itemTags}>
                                                <View style={styles.priceTag}>
                                                    <Text style={styles.priceText}>${item.daily_rate ?? item.pricePerDay}/day</Text>
                                                </View>
                                                <View style={[styles.statusTag, !isAvailable && styles.statusTagUnavailable]}>
                                                    <Text style={[styles.statusText, !isAvailable && styles.statusTextUnavailable]}>
                                                        {isAvailable ? t('bulkEdit.available') : t('bulkEdit.unavailable')}
                                                    </Text>
                                                </View>
                                                {item.category ? (
                                                    <View style={styles.categoryTag}>
                                                        <Text style={styles.categoryText}>{item.category}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                        {selectedItems.includes(item.id) && (
                                            <MaterialCommunityIcons name="check-circle" size={20} color="#7C3AED" style={{ marginLeft: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </Surface>

                    {/* Bulk Changes Form */}
                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.bulkChangesHeader}>
                            <Text style={styles.cardTitle}>{t('bulkEdit.bulkChanges')}</Text>
                        </View>

                        <View style={styles.bulkFormContainer}>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('bulkEdit.availabilityStatus')}</Text>
                                <Menu
                                    visible={availabilityMenuVisible}
                                    onDismiss={() => setAvailabilityMenuVisible(false)}
                                    contentStyle={styles.menuContent}
                                    anchor={
                                        <TouchableOpacity style={styles.dropdownContainer} onPress={() => setAvailabilityMenuVisible(true)}>
                                            <Text style={bulkChanges.availability !== null ? styles.dropdownTextValue : styles.dropdownTextPlaceholder}>
                                                {getTriStateLabel(bulkChanges.availability)}
                                            </Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                        </TouchableOpacity>
                                    }
                                >
                                    {triStateOptions.map((opt, idx) => (
                                        <Menu.Item 
                                            key={idx} 
                                            title={opt.label} 
                                            leadingIcon={bulkChanges.availability === opt.value ? 'check' : undefined}
                                            titleStyle={bulkChanges.availability === opt.value ? styles.menuItemActiveText : undefined}
                                            onPress={() => {
                                                setBulkChanges(prev => ({ ...prev, availability: opt.value }));
                                                setAvailabilityMenuVisible(false);
                                            }} 
                                        />
                                    ))}
                                </Menu>
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={[styles.inputGroup, styles.flex1, { marginRight: 12 }]}>
                                    <Text style={styles.label}>{t('bulkEdit.minDays')}</Text>
                                    <View style={styles.numberInputContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('bulkEdit.noChange')}
                                            value={bulkChanges.min_rental_days}
                                            onChangeText={(text) => setBulkChanges(prev => ({ ...prev, min_rental_days: text }))}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={styles.numberInput}
                                            contentStyle={styles.inputTextPlaceholder}
                                            keyboardType="numeric"
                                        />
                                        <View style={styles.stepperIcons}>
                                            <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                        </View>
                                    </View>
                                </View>

                                <View style={[styles.inputGroup, styles.flex1]}>
                                    <Text style={styles.label}>{t('bulkEdit.maxDays')}</Text>
                                    <View style={styles.numberInputContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('bulkEdit.noChange')}
                                            value={bulkChanges.max_rental_days}
                                            onChangeText={(text) => setBulkChanges(prev => ({ ...prev, max_rental_days: text }))}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={styles.numberInput}
                                            contentStyle={styles.inputTextPlaceholder}
                                            keyboardType="numeric"
                                        />
                                        <View style={styles.stepperIcons}>
                                            <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('bulkEdit.noticePeriod')}</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder={t('bulkEdit.noChange')}
                                        value={bulkChanges.notice_period_hours}
                                        onChangeText={(text) => setBulkChanges(prev => ({ ...prev, notice_period_hours: text }))}
                                        outlineColor={colors.border}
                                        activeOutlineColor={colors.accentBlue}
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.stepperIcons}>
                                        <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('bulkEdit.priceMultiplier')}</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder={t('bulkEdit.priceMultiplierPlaceholder')}
                                        value={bulkChanges.daily_rate_multiplier}
                                        onChangeText={(text) => setBulkChanges(prev => ({ ...prev, daily_rate_multiplier: text }))}
                                        outlineColor={colors.border}
                                        activeOutlineColor={colors.accentBlue}
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.stepperIcons}>
                                        <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                    </View>
                                </View>
                                <Text style={styles.helperText}>{t('bulkEdit.priceMultiplierHint')}</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('bulkEdit.securityDeposit')}</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder={t('bulkEdit.noChange')}
                                        value={bulkChanges.deposit}
                                        onChangeText={(text) => setBulkChanges(prev => ({ ...prev, deposit: text }))}
                                        outlineColor={colors.border}
                                        activeOutlineColor={colors.accentBlue}
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
                                        keyboardType="numeric"
                                    />
                                    <View style={styles.stepperIcons}>
                                        <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.preferencesContainer}>
                                <View style={styles.preferenceRow}>
                                    <Text style={styles.preferenceLabel}>{t('bulkEdit.instantBooking')}</Text>
                                    <Menu
                                        visible={instantBookingMenuVisible}
                                        onDismiss={() => setInstantBookingMenuVisible(false)}
                                        contentStyle={styles.menuContent}
                                        anchor={
                                            <TouchableOpacity style={styles.smallDropdownContainer} onPress={() => setInstantBookingMenuVisible(true)}>
                                                <Text style={bulkChanges.instant_booking !== null ? styles.dropdownTextValueSmall : styles.dropdownTextPlaceholderSmall}>
                                                    {getTriStateLabel(bulkChanges.instant_booking)}
                                                </Text>
                                                <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
                                            </TouchableOpacity>
                                        }
                                    >
                                        {triStateOptions.map((opt, idx) => (
                                            <Menu.Item 
                                                key={idx} 
                                                title={opt.label} 
                                                leadingIcon={bulkChanges.instant_booking === opt.value ? 'check' : undefined}
                                                titleStyle={bulkChanges.instant_booking === opt.value ? styles.menuItemActiveText : undefined}
                                                onPress={() => {
                                                    setBulkChanges(prev => ({ ...prev, instant_booking: opt.value }));
                                                    setInstantBookingMenuVisible(false);
                                                }} 
                                            />
                                        ))}
                                    </Menu>
                                </View>

                                <View style={styles.preferenceRow}>
                                    <Text style={styles.preferenceLabel}>{t('bulkEdit.sameDayPickup')}</Text>
                                    <Menu
                                        visible={sameDayPickupMenuVisible}
                                        onDismiss={() => setSameDayPickupMenuVisible(false)}
                                        contentStyle={styles.menuContent}
                                        anchor={
                                            <TouchableOpacity style={styles.smallDropdownContainer} onPress={() => setSameDayPickupMenuVisible(true)}>
                                                <Text style={styles.dropdownTextValueSmall}>{getTriStateLabel(bulkChanges.same_day_pickup)}</Text>
                                                <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
                                            </TouchableOpacity>
                                        }
                                    >
                                        {triStateOptions.map((opt, idx) => (
                                            <Menu.Item key={idx} title={opt.label} leadingIcon={bulkChanges.same_day_pickup === opt.value ? 'check' : undefined} titleStyle={bulkChanges.same_day_pickup === opt.value ? styles.menuItemActiveText : undefined} onPress={() => {
                                                setBulkChanges(prev => ({ ...prev, same_day_pickup: opt.value }));
                                                setSameDayPickupMenuVisible(false);
                                            }} />
                                        ))}
                                    </Menu>
                                </View>
                            </View>

                            <Button
                                mode="contained"
                                icon="content-save-outline"
                                style={styles.applyBtn}
                                labelStyle={styles.applyBtnLabel}
                                onPress={handleBulkUpdate}
                                disabled={selectedItems.length === 0 || isSubmitting}
                                loading={isSubmitting}
                            >
                                {t('bulkEdit.applyToItems', { count: selectedItems.length })}
                            </Button>

                        </View>
                    </Surface>

                </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    contentWrapper: {
        width: '100%',
        maxWidth: 768,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingTop: 32,
        paddingBottom: 48,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 32,
        position: 'relative',
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 20,
    },
    headerTitleContainer: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0F172A',
        lineHeight: 38,
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 16,
        color: '#64748B',
        lineHeight: 24,
    },
    selectedCountBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignSelf: 'center',
    },
    selectedCountText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 24,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    deleteBtn: {
        backgroundColor: '#F87171',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    deleteBtnLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    selectAllBtn: {
        borderColor: '#E2E8F0',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
    },
    selectAllBtnLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0F172A',
    },
    itemListContainer: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    itemRowSelected: {
        borderColor: '#94A3B8',
        backgroundColor: '#F8FAFC',
    },
    itemImagePlaceholder: {
        width: 60,
        height: 60,
        backgroundColor: '#0F172A',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 12,
    },
    itemDetails: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
    },
    itemTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    priceTag: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    priceText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    statusTag: {
        borderWidth: 1,
        borderColor: '#86EFAC',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#16A34A',
    },
    statusTagUnavailable: {
        borderColor: '#FCA5A5',
    },
    statusTextUnavailable: {
        color: '#DC2626',
    },
    categoryTag: {
        borderWidth: 1,
        borderColor: '#93C5FD',
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2563EB',
        textTransform: 'capitalize',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    bulkChangesHeader: {
        padding: 24,
        paddingBottom: 0,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    bulkFormContainer: {
        padding: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 10,
    },
    dropdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 48,
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 2,
    },
    dropdownTextPlaceholder: {
        color: '#4B5563', // Consistent darker gray placeholder
        fontSize: typography.label,
    },
    dropdownTextValue: {
        color: colors.textPrimary, // Consistent active text color
        fontSize: typography.label,
    },
    rowInputs: {
        flexDirection: 'row',
    },
    flex1: {
        flex: 1,
    },
    numberInputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    numberInput: {
        backgroundColor: '#FFFFFF',
        fontSize: typography.label,
        height: 48,
        paddingRight: 40,
        borderRadius: 12,
    },
    inputTextPlaceholder: {
        color: '#4B5563',
    },
    stepperIcons: {
        position: 'absolute',
        right: 12,
        top: 12,
        width: 24,
        height: 24,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 8,
    },
    preferencesContainer: {
        marginBottom: 24,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    preferenceLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    smallDropdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 48,
        width: 140,
        backgroundColor: '#FFFFFF',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 2,
    },
    dropdownTextPlaceholderSmall: {
        color: '#4B5563',
        fontSize: 14,
    },
    dropdownTextValueSmall: {
        color: colors.textPrimary,
        fontSize: 14,
    },
    applyBtn: {
        backgroundColor: '#C084FC',
        borderRadius: 8,
        paddingVertical: 4,
        marginTop: 8,
    },
    applyBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    menuContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginTop: 8,
        paddingVertical: 4,
    },
    menuItemActiveText: {
        color: colors.primary,
        fontWeight: '700',
    },
});
