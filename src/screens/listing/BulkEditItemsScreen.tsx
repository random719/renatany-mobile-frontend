import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Menu, Text, TextInput, Surface } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { colors, typography } from '../../theme';
import { BulkEditChanges, Listing } from '../../types/listing';
import { useListingStore } from '../../store/listingStore';
import { useAuthStore } from '../../store/authStore';

const TRISTATE_OPTIONS = [
    { value: null, label: 'No change' },
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
];

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
    const navigation = useNavigation();
    const { user } = useAuthStore();
    const { userItems, isLoading, isSubmitting, fetchUserItems, updateItem, deleteItem } = useListingStore();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [bulkChanges, setBulkChanges] = useState<BulkEditChanges>(INITIAL_BULK_CHANGES);
    const [availabilityMenuVisible, setAvailabilityMenuVisible] = useState(false);
    const [instantBookingMenuVisible, setInstantBookingMenuVisible] = useState(false);
    const [sameDayPickupMenuVisible, setSameDayPickupMenuVisible] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchUserItems(user.id);
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
            Alert.alert('No Selection', 'Please select at least one item to delete.');
            return;
        }
        Alert.alert(
            'Confirm Delete',
            `Delete ${selectedItems.length} item(s)? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            for (const itemId of selectedItems) {
                                await deleteItem(itemId);
                            }
                            Alert.alert('Success', `Deleted ${selectedItems.length} item(s).`);
                            setSelectedItems([]);
                            if (user?.id) fetchUserItems(user.id);
                        } catch (error) {
                            console.error('Bulk delete error:', error);
                            Alert.alert('Error', 'Failed to delete some items. Please try again.');
                        }
                    },
                },
            ]
        );
    }, [selectedItems, deleteItem, fetchUserItems, user?.id]);

    const handleBulkUpdate = useCallback(async () => {
        if (selectedItems.length === 0) {
            Alert.alert('No Selection', 'Please select at least one item to update.');
            return;
        }
        const changesCount = Object.values(bulkChanges).filter(v => v !== null && v !== '').length;
        if (changesCount === 0) {
            Alert.alert('No Changes', 'Please specify at least one change to apply.');
            return;
        }

        Alert.alert(
            'Confirm Update',
            `Apply changes to ${selectedItems.length} item(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Apply',
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

                            Alert.alert('Success', `Updated ${selectedItems.length} item(s).`);
                            setSelectedItems([]);
                            setBulkChanges(INITIAL_BULK_CHANGES);
                            if (user?.id) fetchUserItems(user.id);
                        } catch (error) {
                            console.error('Bulk update error:', error);
                            Alert.alert('Error', 'Failed to update some items. Please try again.');
                        }
                    },
                },
            ]
        );
    }, [selectedItems, bulkChanges, userItems, updateItem, fetchUserItems, user?.id]);

    const getTriStateLabel = (value: boolean | null) =>
        TRISTATE_OPTIONS.find(o => o.value === value)?.label || 'No change';

    return (
        <View style={styles.mainContainer}>
            <GlobalHeader />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentWrapper}>
                    {/* Header Section */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.pageTitle}>Bulk Edit{"\n"}Items</Text>
                            <Text style={styles.pageSubtitle}>
                                Select items and{"\n"}apply changes to{"\n"}multiple at once
                            </Text>
                        </View>

                        <View style={styles.selectedCountBadge}>
                            <Text style={styles.selectedCountText}>{selectedItems.length} / {userItems.length} selected</Text>
                        </View>
                    </View>

                    {/* Your Items Card */}
                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Your Items</Text>
                            <View style={styles.actionButtonsRow}>
                                <Button
                                    mode="contained"
                                    icon="trash-can-outline"
                                    style={styles.deleteBtn}
                                    labelStyle={styles.deleteBtnLabel}
                                    onPress={handleBulkDelete}
                                    disabled={selectedItems.length === 0 || isSubmitting}
                                >
                                    Delete Selected ({selectedItems.length})
                                </Button>
                                <Button
                                    mode="outlined"
                                    style={styles.selectAllBtn}
                                    labelStyle={styles.selectAllBtnLabel}
                                    onPress={toggleSelectAll}
                                >
                                    {selectedItems.length === userItems.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </View>
                        </View>

                        {/* List of Items */}
                        <View style={styles.itemListContainer}>
                            {isLoading ? (
                                <ActivityIndicator size="large" style={{ padding: 24 }} />
                            ) : userItems.length === 0 ? (
                                <Text style={{ padding: 24, color: '#64748B', textAlign: 'center' }}>No items found.</Text>
                            ) : (
                                userItems.map(item => (
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
                                                <View style={styles.statusTag}>
                                                    <Text style={styles.statusText}>
                                                        {item.isActive !== false ? 'Available' : 'Unavailable'}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </Surface>

                    {/* Bulk Changes Form */}
                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.bulkChangesHeader}>
                            <Text style={styles.cardTitle}>Bulk Changes</Text>
                        </View>

                        <View style={styles.bulkFormContainer}>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Availability Status</Text>
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
                                    {TRISTATE_OPTIONS.map((opt, idx) => (
                                        <Menu.Item 
                                            key={idx} 
                                            title={opt.label} 
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
                                    <Text style={styles.label}>Min Days</Text>
                                    <View style={styles.numberInputContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="No change"
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
                                    <Text style={styles.label}>Max Days</Text>
                                    <View style={styles.numberInputContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="No change"
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
                                <Text style={styles.label}>Notice Period (hours)</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder="No change"
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
                                <Text style={styles.label}>Price Multiplier</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder="e.g., 1.2 for 20% increase"
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
                                <Text style={styles.helperText}>1.0 = no change, 1.2 = +20%</Text>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Security Deposit ($)</Text>
                                <View style={styles.numberInputContainer}>
                                    <TextInput
                                        mode="outlined"
                                        placeholder="No change"
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
                                    <Text style={styles.preferenceLabel}>Instant Booking</Text>
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
                                        {TRISTATE_OPTIONS.map((opt, idx) => (
                                            <Menu.Item 
                                                key={idx} 
                                                title={opt.label} 
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
                                    <Text style={styles.preferenceLabel}>Same-Day Pickup</Text>
                                    <Menu
                                        visible={sameDayPickupMenuVisible}
                                        onDismiss={() => setSameDayPickupMenuVisible(false)}
                                        anchor={
                                            <TouchableOpacity style={styles.smallDropdownContainer} onPress={() => setSameDayPickupMenuVisible(true)}>
                                                <Text style={styles.dropdownTextValueSmall}>{getTriStateLabel(bulkChanges.same_day_pickup)}</Text>
                                                <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
                                            </TouchableOpacity>
                                        }
                                    >
                                        {TRISTATE_OPTIONS.map((opt, idx) => (
                                            <Menu.Item key={idx} title={opt.label} onPress={() => {
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
                                Apply to {selectedItems.length} Item(s)
                            </Button>

                        </View>
                    </Surface>

                </View>
                <Footer />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
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
        gap: 8,
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
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 48,
        backgroundColor: '#FFFFFF',
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
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        width: 140,
        backgroundColor: '#FFFFFF',
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
        borderRadius: 12,
        marginTop: 8,
    },
    menuItemActiveText: {
        color: colors.primary,
        fontWeight: '700',
    },
});
