import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { Button, Checkbox, Text, TextInput, Surface } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { colors } from '../../theme';

export const BulkEditItemsScreen = () => {
    const navigation = useNavigation();
    
    // Mock Data State
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    
    // Bulk Changes State
    const [availabilityStatus, setAvailabilityStatus] = useState('No change');
    const [instantBooking, setInstantBooking] = useState('No change');
    const [sameDayPickup, setSameDayPickup] = useState('No change');

    const toggleSelection = (id: string) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(itemId => itemId !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    const isAllSelected = selectedItems.length === 1; // Example: only 1 mock item

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItems([]);
        } else {
            setSelectedItems(['1']);
        }
    };

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
                            <Text style={styles.selectedCountText}>{selectedItems.length} / 1 selected</Text>
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
                                    onPress={() => {}}
                                >
                                    Delete Selected ({selectedItems.length})
                                </Button>
                                <Button 
                                    mode="outlined" 
                                    style={styles.selectAllBtn}
                                    labelStyle={styles.selectAllBtnLabel}
                                    onPress={toggleSelectAll}
                                >
                                    Select All
                                </Button>
                            </View>
                        </View>

                        {/* List of Items */}
                        <View style={styles.itemListContainer}>
                            <TouchableOpacity 
                                style={[styles.itemRow, selectedItems.includes('1') && styles.itemRowSelected]}
                                onPress={() => toggleSelection('1')}
                                activeOpacity={0.8}
                            >
                                <Checkbox.Android
                                    status={selectedItems.includes('1') ? 'checked' : 'unchecked'}
                                    onPress={() => toggleSelection('1')}
                                    color="#0F172A"
                                    uncheckedColor="#CBD5E1"
                                />
                                <View style={styles.itemImagePlaceholder}>
                                    <MaterialCommunityIcons name="camera-outline" size={24} color="#64748B" />
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>product</Text>
                                    <View style={styles.itemTags}>
                                        <View style={styles.priceTag}>
                                            <Text style={styles.priceText}>$25/day</Text>
                                        </View>
                                        <View style={styles.statusTag}>
                                            <Text style={styles.statusText}>Available</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
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
                                <View style={styles.dropdownContainer}>
                                    <Text style={styles.dropdownTextValue}>{availabilityStatus}</Text>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                </View>
                            </View>

                            <View style={styles.rowInputs}>
                                <View style={[styles.inputGroup, styles.flex1, { marginRight: 12 }]}>
                                    <Text style={styles.label}>Min Days</Text>
                                    <View style={styles.numberInputContainer}>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="No change"
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={styles.numberInput}
                                            contentStyle={styles.inputTextPlaceholder}
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
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={styles.numberInput}
                                            contentStyle={styles.inputTextPlaceholder}
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
                                        outlineColor="#E2E8F0"
                                        activeOutlineColor="#CBD5E1"
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
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
                                        outlineColor="#E2E8F0"
                                        activeOutlineColor="#CBD5E1"
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
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
                                        outlineColor="#E2E8F0"
                                        activeOutlineColor="#CBD5E1"
                                        style={styles.numberInput}
                                        contentStyle={styles.inputTextPlaceholder}
                                    />
                                    <View style={styles.stepperIcons}>
                                        <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.preferencesContainer}>
                                <View style={styles.preferenceRow}>
                                    <Text style={styles.preferenceLabel}>Instant Booking</Text>
                                    <View style={styles.smallDropdownContainer}>
                                        <Text style={styles.dropdownTextValueSmall}>{instantBooking}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
                                    </View>
                                </View>

                                <View style={styles.preferenceRow}>
                                    <Text style={styles.preferenceLabel}>Same-Day Pickup</Text>
                                    <View style={styles.smallDropdownContainer}>
                                        <Text style={styles.dropdownTextValueSmall}>{sameDayPickup}</Text>
                                        <MaterialCommunityIcons name="chevron-down" size={18} color="#64748B" />
                                    </View>
                                </View>
                            </View>

                            <Button
                                mode="contained"
                                icon="content-save-outline"
                                style={styles.applyBtn}
                                labelStyle={styles.applyBtnLabel}
                                onPress={() => console.log('Apply Bulk Changes')}
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
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 16,
        height: 48,
        backgroundColor: '#FFFFFF',
    },
    dropdownTextValue: {
        color: '#64748B',
        fontSize: 15,
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
        fontSize: 15,
        height: 48,
        paddingRight: 40,
    },
    inputTextPlaceholder: {
        color: '#94A3B8',
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
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
        width: 140,
        backgroundColor: '#FFFFFF',
    },
    dropdownTextValueSmall: {
        color: '#64748B',
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
});
