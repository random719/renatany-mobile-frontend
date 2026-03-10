import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Checkbox, Text, TextInput, Surface } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { colors } from '../../theme';

export const CreateListingScreen = () => {
    const navigation = useNavigation();
    const [step, setStep] = useState(1);
    const [showOnMap, setShowOnMap] = useState(true);
    
    // Step 3 State
    const [instantBooking, setInstantBooking] = useState(false);
    const [sameDayPickup, setSameDayPickup] = useState(false);
    const [pickupLocation, setPickupLocation] = useState(true);
    const [deliveryToRenter, setDeliveryToRenter] = useState(false);

    return (
        <View style={styles.mainContainer}>
            <GlobalHeader />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentWrapper}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.pageTitle}>List Your Item</Text>
                        <Text style={styles.pageSubtitle}>
                            Share your items with the community and start earning
                        </Text>
                    </View>

                    {/* Stepper */}
                    <View style={styles.stepperContainer}>
                        <View style={[styles.stepCircle, step >= 1 ? styles.stepActive : styles.stepInactive]}>
                            {step > 1 ? (
                                <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />
                            ) : (
                                <MaterialCommunityIcons name="plus" size={24} color={step >= 1 ? "#FFFFFF" : "#94A3B8"} />
                            )}
                        </View>
                        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                        <View style={[styles.stepCircle, step >= 2 ? styles.stepActive : styles.stepInactive]}>
                            {step > 2 ? (
                                <MaterialCommunityIcons name="check" size={24} color="#FFFFFF" />
                            ) : (
                                <MaterialCommunityIcons name="upload-outline" size={20} color={step >= 2 ? "#FFFFFF" : "#94A3B8"} />
                            )}
                        </View>
                        <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
                        <View style={[styles.stepCircle, step >= 3 ? styles.stepActive : styles.stepInactive]}>
                            <MaterialCommunityIcons name="currency-usd" size={20} color={step >= 3 ? "#FFFFFF" : "#94A3B8"} />
                        </View>
                    </View>

                    {/* Warning Banner */}
                    <View style={styles.warningBanner}>
                        <MaterialCommunityIcons name="alert-outline" size={20} color="#B45309" style={styles.warningIcon} />
                        <View style={styles.warningTextContainer}>
                            <Text style={styles.warningTitle}>Connect your bank account to receive payouts</Text>
                            <Text style={styles.warningText}>
                                You can list items, but you won't be able to receive payments until you connect your bank account.{' '}
                                <Text style={styles.warningLink}>Connect now</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Form Card */}
                    <Surface style={styles.formCard} elevation={0}>
                        {step === 1 && (
                            <>
                                <Text style={styles.sectionTitle}>Tell us about your item</Text>
                                
                                <View style={styles.formSection}>
                                    {/* Item Title */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Item Title</Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="e.g., Canon EOS R5 Camera"
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={styles.input}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    {/* Description */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Describe your item in detail..."
                                            multiline
                                            numberOfLines={4}
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={[styles.input, styles.textArea]}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    {/* Category */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Category</Text>
                                        <View style={styles.dropdownContainer}>
                                            <Text style={styles.dropdownText}>Choose a category</Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                        </View>
                                    </View>

                                    {/* Condition */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Condition</Text>
                                        <View style={styles.dropdownContainer}>
                                            <Text style={styles.dropdownTextValue}>Good</Text>
                                            <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                        </View>
                                    </View>

                                    {/* Location */}
                                    <View style={styles.inputGroup}>
                                        <View style={styles.labelRow}>
                                            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#334155" />
                                            <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>Location (City/Neighborhood)</Text>
                                        </View>
                                        <TextInput
                                            mode="outlined"
                                            placeholder="e.g., Downtown Brooklyn, New York"
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={styles.input}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Detailed Address */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Detailed Address (Optional & Private)</Text>
                                        <Text style={styles.subtext}>
                                            This information is private and will only be shared with confirmed renters
                                        </Text>
                                        
                                        <TextInput
                                            mode="outlined"
                                            placeholder="Street address (optional)"
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={[styles.input, { marginBottom: 12 }]}
                                            contentStyle={styles.inputText}
                                        />
                                        
                                        <View style={styles.rowInputs}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="Postal/ZIP code (opt"
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={[styles.input, styles.flex1, { marginRight: 12 }]}
                                                contentStyle={styles.inputText}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                placeholder="Country (optional)"
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={[styles.input, styles.flex1]}
                                                contentStyle={styles.inputText}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.checkboxContainer}>
                                        <Checkbox.Android
                                            status={showOnMap ? 'checked' : 'unchecked'}
                                            onPress={() => setShowOnMap(!showOnMap)}
                                            color="#A855F7"
                                        />
                                        <Text style={styles.checkboxLabel}>Show this item on the interactive map</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={styles.sectionTitle}>Add photos and videos</Text>
                                
                                <View style={styles.formSection}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Photos</Text>
                                        <TouchableOpacity style={styles.uploadAreaImages}>
                                            <MaterialCommunityIcons name="image-outline" size={48} color="#94A3B8" />
                                            <Text style={styles.uploadTitle}>Upload Photos</Text>
                                            <Text style={styles.uploadSubtext}>Add up to 10 photos of your item</Text>
                                            <Text style={styles.uploadHint}>Images will be automatically compressed for{"\n"}faster upload</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Videos (Optional)</Text>
                                        <TouchableOpacity style={styles.uploadAreaVideos}>
                                            <MaterialCommunityIcons name="video-outline" size={48} color="#A855F7" />
                                            <Text style={styles.uploadTitle}>Upload Short Videos</Text>
                                            <Text style={styles.uploadSubtext}>Add videos to showcase your item (max 30{"\n"}seconds each)</Text>
                                            <Text style={styles.uploadHintVideo}>Keep videos under 10MB for best results</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <Text style={styles.sectionTitle}>Set pricing and booking rules</Text>
                                
                                <View style={styles.formSection}>
                                    
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Daily Rate ($)</Text>
                                        <View style={styles.numberInputContainer}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="25.00"
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={styles.numberInput}
                                                contentStyle={styles.inputText}
                                                keyboardType="numeric"
                                            />
                                            <View style={styles.stepperIcons}>
                                                <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                            </View>
                                        </View>
                                        <Text style={styles.helperText}>Default price per day</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Security Deposit ($)</Text>
                                        <View style={styles.numberInputContainer}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="50.00"
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={styles.numberInput}
                                                contentStyle={styles.inputText}
                                                keyboardType="numeric"
                                            />
                                            <View style={styles.stepperIcons}>
                                                <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                            </View>
                                        </View>
                                    </View>

                                    {/* Tiered Pricing Block */}
                                    <View style={styles.tieredPricingBlock}>
                                        <Text style={styles.label}>Tiered Pricing (Optional)</Text>
                                        <Text style={styles.subtext}>
                                            Offer discounts for longer rentals (e.g., 7 days for{"\n"}$150)
                                        </Text>

                                        <View style={styles.tierRow}>
                                            <View style={[styles.numberInputContainer, { flex: 1, marginRight: 12 }]}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="Days (e.g., 7)"
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInput}
                                                    contentStyle={styles.inputText}
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                            <View style={[styles.numberInputContainer, { flex: 1 }]}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="Price (e.g., 150)"
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInput}
                                                    contentStyle={styles.inputText}
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                        </View>

                                        <Button
                                            mode="outlined"
                                            icon="plus"
                                            style={styles.addTierBtn}
                                            labelStyle={styles.addTierBtnLabel}
                                            onPress={() => {}}
                                        >
                                            Add Pricing Tier
                                        </Button>
                                    </View>

                                    {/* Booking Rules Block */}
                                    <View style={styles.bookingRulesBlock}>
                                        <View style={styles.labelRow}>
                                            <MaterialCommunityIcons name="calendar-outline" size={18} color="#0F172A" />
                                            <Text style={styles.bookingRulesTitle}>Booking Rules</Text>
                                        </View>
                                        <Text style={[styles.subtext, { marginBottom: 24 }]}>
                                            Set your rental requirements and preferences
                                        </Text>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.smallLabel}>Minimum Days</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="1"
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.smallLabel}>Maximum Days</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="30"
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.smallLabel}>Notice Period (hours)</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="24"
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                            <Text style={styles.helperText}>Hours before pickup</Text>
                                        </View>

                                        <View style={styles.preferencesCard}>
                                            <View style={styles.preferenceRow}>
                                                <View style={styles.preferenceText}>
                                                    <Text style={styles.preferenceTitle}>Instant Booking</Text>
                                                    <Text style={styles.preferenceDesc}>Allow renters to book without your{"\n"}approval</Text>
                                                </View>
                                                <Checkbox.Android
                                                    status={instantBooking ? 'checked' : 'unchecked'}
                                                    onPress={() => setInstantBooking(!instantBooking)}
                                                    color="#A855F7"
                                                    uncheckedColor="#CBD5E1"
                                                />
                                            </View>
                                            
                                            <View style={styles.preferenceDivider} />

                                            <View style={styles.preferenceRow}>
                                                <View style={styles.preferenceText}>
                                                    <Text style={styles.preferenceTitle}>Same-Day Pickup</Text>
                                                    <Text style={styles.preferenceDesc}>Allow pickup on the same day as booking</Text>
                                                </View>
                                                <Checkbox.Android
                                                    status={sameDayPickup ? 'checked' : 'unchecked'}
                                                    onPress={() => setSameDayPickup(!sameDayPickup)}
                                                    color="#A855F7"
                                                    uncheckedColor="#CBD5E1"
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    {/* Delivery Options */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Delivery Options</Text>
                                        
                                        <TouchableOpacity 
                                            style={styles.checkboxRowRaw} 
                                            onPress={() => setPickupLocation(!pickupLocation)}
                                            activeOpacity={0.7}
                                        >
                                            <Checkbox.Android
                                                status={pickupLocation ? 'checked' : 'unchecked'}
                                                onPress={() => setPickupLocation(!pickupLocation)}
                                                color="#A855F7"
                                                uncheckedColor="#CBD5E1"
                                            />
                                            <Text style={styles.deliveryOptionLabel}>Pickup at location</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={styles.checkboxRowRaw} 
                                            onPress={() => setDeliveryToRenter(!deliveryToRenter)}
                                            activeOpacity={0.7}
                                        >
                                            <Checkbox.Android
                                                status={deliveryToRenter ? 'checked' : 'unchecked'}
                                                onPress={() => setDeliveryToRenter(!deliveryToRenter)}
                                                color="#A855F7"
                                                uncheckedColor="#CBD5E1"
                                            />
                                            <Text style={styles.deliveryOptionLabel}>Delivery to renter</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Pricing Summary */}
                                    <View style={styles.pricingSummaryCard}>
                                        <Text style={styles.pricingSummaryTitle}>Pricing Summary</Text>
                                        
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Base daily rate:</Text>
                                            <Text style={styles.summaryValue}>$0.00/day</Text>
                                        </View>
                                        
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Security deposit:</Text>
                                            <Text style={styles.summaryValue}>$0.00</Text>
                                        </View>
                                        
                                        <View style={styles.summaryDivider} />
                                        
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Weekly estimate (base rate):</Text>
                                            <Text style={styles.summaryValueBold}>$0.00</Text>
                                        </View>
                                    </View>

                                </View>
                            </>
                        )}


                        <View style={styles.actionButtonsContainer}>
                            {step > 1 ? (
                                <Button
                                    mode="outlined"
                                    onPress={() => setStep(step - 1)}
                                    style={styles.previousBtn}
                                    labelStyle={styles.previousBtnLabel}
                                >
                                    Previous
                                </Button>
                            ) : (
                                <View style={styles.spacer} />
                            )}
                            <Button
                                mode="contained"
                                onPress={() => {
                                    if (step < 3) setStep(step + 1);
                                    else navigation.goBack(); // Example completion action
                                }}
                                style={[styles.continueBtn, step === 3 && { backgroundColor: '#71DCA3' }]}
                                labelStyle={styles.continueBtnLabel}
                            >
                                {step === 3 ? 'List Item' : 'Continue'}
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
    headerContainer: {
        marginBottom: 32,
    },
    pageTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 8,
    },
    pageSubtitle: {
        fontSize: 16,
        color: '#475569',
        marginBottom: 0,
        lineHeight: 24,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    stepCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepActive: {
        backgroundColor: '#0F172A',
    },
    stepInactive: {
        backgroundColor: '#E2E8F0',
    },
    stepLine: {
        height: 2,
        backgroundColor: '#E2E8F0',
        width: 60,
        marginHorizontal: 12,
    },
    stepLineActive: {
        backgroundColor: '#0F172A',
    },
    warningBanner: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FDE68A',
        alignItems: 'flex-start',
    },
    warningIcon: {
        marginTop: 2,
        marginRight: 12,
    },
    warningTextContainer: {
        flex: 1,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#92400E',
        marginBottom: 4,
    },
    warningText: {
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20,
    },
    warningLink: {
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    formSection: {
        padding: 24,
        paddingBottom: 0,
    },
    inputGroup: {
        marginBottom: 32,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    smallLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 10,
    },
    subtext: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 12,
        lineHeight: 18,
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 8,
    },
    input: {
        backgroundColor: '#FFFFFF',
        fontSize: 15,
    },
    inputText: {
        color: '#334155',
    },
    textArea: {
        height: 120,
    },
    numberInputContainer: {
        position: 'relative',
        justifyContent: 'center',
    },
    numberInput: {
        backgroundColor: '#FFFFFF',
        fontSize: 15,
        height: 52,
        paddingRight: 40,
    },
    numberInputSmall: {
        backgroundColor: '#FFFFFF',
        fontSize: 15,
        height: 48,
        paddingRight: 40,
    },
    stepperIcons: {
        position: 'absolute',
        right: 12,
        top: 14,
        width: 24,
        height: 24,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
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
    dropdownText: {
        color: '#94A3B8',
        fontSize: 15,
    },
    dropdownTextValue: {
        color: '#334155',
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 24,
    },
    rowInputs: {
        flexDirection: 'row',
    },
    flex1: {
        flex: 1,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    checkboxLabel: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
        marginLeft: 8,
    },
    uploadAreaImages: {
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    uploadAreaVideos: {
        borderWidth: 2,
        borderColor: '#F3E8FF',
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    uploadTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    uploadSubtext: {
        fontSize: 15,
        color: '#64748B',
        marginBottom: 6,
        textAlign: 'center',
    },
    uploadHint: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 18,
    },
    uploadHintVideo: {
        fontSize: 13,
        color: '#A855F7',
        textAlign: 'center',
    },
    tieredPricingBlock: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#E0F2FE',
    },
    tierRow: {
        flexDirection: 'row',
        marginBottom: 16,
        marginTop: 12,
    },
    addTierBtn: {
        borderColor: '#3B82F6',
        borderRadius: 24,
        marginTop: 8,
    },
    addTierBtnLabel: {
        color: '#2563EB',
        fontWeight: '600',
    },
    bookingRulesBlock: {
        backgroundColor: '#FAF5FF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#F3E8FF',
    },
    bookingRulesTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginLeft: 8,
    },
    preferencesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    preferenceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    preferenceText: {
        flex: 1,
        marginRight: 16,
    },
    preferenceTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    preferenceDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    preferenceDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 16,
    },
    checkboxRowRaw: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -8, // Adjust visual alignment for checkbox internal padding
        marginBottom: 8,
    },
    deliveryOptionLabel: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
    },
    pricingSummaryCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
    },
    pricingSummaryTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 15,
        color: '#475569',
    },
    summaryValue: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '500',
    },
    summaryValueBold: {
        fontSize: 15,
        color: '#0F172A',
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 12,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        marginTop: 16,
    },
    spacer: {
        flex: 1,
    },
    previousBtn: {
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    previousBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    continueBtn: {
        backgroundColor: '#818CF8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    continueBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
