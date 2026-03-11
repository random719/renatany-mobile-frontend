import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Menu, Text, TextInput, Surface } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { colors } from '../../theme';
import { CreateListingFormData } from '../../types/listing';
import { useListingStore } from '../../store/listingStore';
import { useAuthStore } from '../../store/authStore';
import { uploadFile } from '../../services/listingService';
import { geocodeLocation } from '../../utils/geocodeLocation';

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'tools', label: 'Tools' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'sports', label: 'Sports' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'home', label: 'Home' },
    { value: 'books', label: 'Books' },
    { value: 'music', label: 'Music' },
    { value: 'photography', label: 'Photography' },
    { value: 'other', label: 'Other' },
];

const CONDITIONS = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
];

const INITIAL_FORM_DATA: CreateListingFormData = {
    title: '',
    description: '',
    category: '',
    daily_rate: '',
    pricing_tiers: [],
    deposit: '',
    condition: 'good',
    location: '',
    street_address: '',
    postcode: '',
    country: '',
    show_on_map: true,
    min_rental_days: '1',
    max_rental_days: '30',
    notice_period_hours: '24',
    instant_booking: false,
    same_day_pickup: false,
    delivery_options: ['pickup'],
    delivery_fee: '',
    delivery_radius: '',
};

export const CreateListingScreen = () => {
    const navigation = useNavigation();
    const { createItem, isSubmitting } = useListingStore();
    const { user } = useAuthStore();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CreateListingFormData>(INITIAL_FORM_DATA);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
    const [newTier, setNewTier] = useState({ days: '', price: '' });
    const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
    const [conditionMenuVisible, setConditionMenuVisible] = useState(false);

    const handleInputChange = useCallback((field: keyof CreateListingFormData, value: string | boolean | string[]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleDeliveryOptionToggle = useCallback((option: string) => {
        setFormData(prev => {
            const current = prev.delivery_options;
            if (current.includes(option)) {
                const next = current.filter(o => o !== option);
                return { ...prev, delivery_options: next.length > 0 ? next : ['pickup'] };
            }
            return { ...prev, delivery_options: [...current, option] };
        });
    }, []);

    const addPricingTier = useCallback(() => {
        if (!newTier.days || !newTier.price) {
            Alert.alert('Missing Info', 'Please enter both days and price for the tier.');
            return;
        }
        const days = parseInt(newTier.days);
        const price = parseFloat(newTier.price);
        if (isNaN(days) || isNaN(price) || days <= 0 || price <= 0) {
            Alert.alert('Invalid Values', 'Days and price must be positive numbers.');
            return;
        }
        if (formData.pricing_tiers.some(t => t.days === days)) {
            Alert.alert('Duplicate', 'A pricing tier for this duration already exists.');
            return;
        }
        setFormData(prev => ({
            ...prev,
            pricing_tiers: [...prev.pricing_tiers, { days, price }].sort((a, b) => a.days - b.days),
        }));
        setNewTier({ days: '', price: '' });
    }, [newTier, formData.pricing_tiers]);

    const removePricingTier = useCallback((index: number) => {
        setFormData(prev => ({
            ...prev,
            pricing_tiers: prev.pricing_tiers.filter((_, i) => i !== index),
        }));
    }, []);

    const pickImages = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access to upload images.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 10 - uploadedImages.length,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsUploading(true);
        try {
            const urls: string[] = [];
            for (const asset of result.assets) {
                const url = await uploadFile(asset.uri, 'image');
                urls.push(url);
            }
            setUploadedImages(prev => [...prev, ...urls].slice(0, 10));
        } catch (error) {
            console.error('Image upload failed:', error);
            Alert.alert('Upload Failed', 'Failed to upload images. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [uploadedImages.length]);

    const pickVideos = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant photo library access to upload videos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            quality: 0.7,
            videoMaxDuration: 30,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsUploading(true);
        try {
            const url = await uploadFile(result.assets[0].uri, 'video');
            setUploadedVideos(prev => [...prev, url]);
        } catch (error) {
            console.error('Video upload failed:', error);
            Alert.alert('Upload Failed', 'Failed to upload video. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, []);

    const removeImage = useCallback((index: number) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const removeVideo = useCallback((index: number) => {
        setUploadedVideos(prev => prev.filter((_, i) => i !== index));
    }, []);

    const isStepValid = useCallback((s: number): boolean => {
        switch (s) {
            case 1:
                return !!(formData.title && formData.description && formData.category && formData.location);
            case 2:
                return uploadedImages.length > 0;
            case 3:
                return !!formData.daily_rate;
            default:
                return false;
        }
    }, [formData, uploadedImages.length]);

    const handleContinue = useCallback(() => {
        if (!isStepValid(step)) {
            const messages: Record<number, string> = {
                1: 'Please fill in title, description, category, and location.',
                2: 'Please upload at least one photo.',
                3: 'Please set a daily rate.',
            };
            Alert.alert('Incomplete', messages[step] || 'Please complete all required fields.');
            return;
        }
        setStep(prev => prev + 1);
    }, [step, isStepValid]);

    const handleSubmit = useCallback(async () => {
        if (!isStepValid(3)) {
            Alert.alert('Incomplete', 'Please set a daily rate.');
            return;
        }

        try {
            // Geocode location if show_on_map is enabled
            let coordinates: { lat: number | null; lng: number | null } = { lat: null, lng: null };
            if (formData.show_on_map && formData.location) {
                setIsGeocodingLocation(true);
                try {
                    let fullAddress = formData.location;
                    if (formData.street_address) fullAddress = formData.street_address + ', ' + fullAddress;
                    if (formData.postcode) fullAddress += ', ' + formData.postcode;
                    if (formData.country) fullAddress += ', ' + formData.country;

                    const geoResult = await geocodeLocation({ location: fullAddress });
                    if (geoResult.success && geoResult.data?.lat && geoResult.data?.lng) {
                        coordinates = { lat: geoResult.data.lat, lng: geoResult.data.lng };
                    }
                } catch (geoError) {
                    console.error('Geocoding failed:', geoError);
                } finally {
                    setIsGeocodingLocation(false);
                }
            }

            const payload = {
                ...formData,
                daily_rate: parseFloat(formData.daily_rate),
                pricing_tiers: formData.pricing_tiers.length > 0 ? formData.pricing_tiers : undefined,
                deposit: parseFloat(formData.deposit) || 0,
                min_rental_days: parseInt(formData.min_rental_days),
                max_rental_days: parseInt(formData.max_rental_days),
                notice_period_hours: parseInt(formData.notice_period_hours),
                delivery_fee: parseFloat(formData.delivery_fee) || 0,
                delivery_radius: parseFloat(formData.delivery_radius) || null,
                lat: coordinates.lat,
                lng: coordinates.lng,
                images: uploadedImages,
                videos: uploadedVideos,
                availability: true,
            };

            await createItem(payload);
            Alert.alert('Success', 'Your item has been listed!', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (error) {
            console.error('Error creating item:', error);
            Alert.alert('Error', 'Failed to create listing. Please try again.');
        }
    }, [formData, uploadedImages, uploadedVideos, createItem, navigation, isStepValid]);

    const categoryLabel = CATEGORIES.find(c => c.value === formData.category)?.label || '';
    const conditionLabel = CONDITIONS.find(c => c.value === formData.condition)?.label || 'Good';
    const dailyRate = parseFloat(formData.daily_rate) || 0;
    const depositAmount = parseFloat(formData.deposit) || 0;

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
                    {user && !user.paymentSetup?.bankConnected && (
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
                    )}

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
                                            value={formData.title}
                                            onChangeText={(text) => handleInputChange('title', text)}
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
                                            value={formData.description}
                                            onChangeText={(text) => handleInputChange('description', text)}
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
                                        <Menu
                                            visible={categoryMenuVisible}
                                            onDismiss={() => setCategoryMenuVisible(false)}
                                            anchor={
                                                <TouchableOpacity style={styles.dropdownContainer} onPress={() => setCategoryMenuVisible(true)}>
                                                    <Text style={formData.category ? styles.dropdownTextValue : styles.dropdownText}>
                                                        {categoryLabel || 'Choose a category'}
                                                    </Text>
                                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                                </TouchableOpacity>
                                            }
                                        >
                                            {CATEGORIES.map(cat => (
                                                <Menu.Item
                                                    key={cat.value}
                                                    onPress={() => {
                                                        handleInputChange('category', cat.value);
                                                        setCategoryMenuVisible(false);
                                                    }}
                                                    title={cat.label}
                                                />
                                            ))}
                                        </Menu>
                                    </View>

                                    {/* Condition */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Condition</Text>
                                        <Menu
                                            visible={conditionMenuVisible}
                                            onDismiss={() => setConditionMenuVisible(false)}
                                            anchor={
                                                <TouchableOpacity style={styles.dropdownContainer} onPress={() => setConditionMenuVisible(true)}>
                                                    <Text style={styles.dropdownTextValue}>{conditionLabel}</Text>
                                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#64748B" />
                                                </TouchableOpacity>
                                            }
                                        >
                                            {CONDITIONS.map(cond => (
                                                <Menu.Item
                                                    key={cond.value}
                                                    onPress={() => {
                                                        handleInputChange('condition', cond.value);
                                                        setConditionMenuVisible(false);
                                                    }}
                                                    title={cond.label}
                                                />
                                            ))}
                                        </Menu>
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
                                            value={formData.location}
                                            onChangeText={(text) => handleInputChange('location', text)}
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
                                            value={formData.street_address}
                                            onChangeText={(text) => handleInputChange('street_address', text)}
                                            outlineColor="#E2E8F0"
                                            activeOutlineColor="#CBD5E1"
                                            style={[styles.input, { marginBottom: 12 }]}
                                            contentStyle={styles.inputText}
                                        />

                                        <View style={styles.rowInputs}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="Postal/ZIP code"
                                                value={formData.postcode}
                                                onChangeText={(text) => handleInputChange('postcode', text)}
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={[styles.input, styles.flex1, { marginRight: 12 }]}
                                                contentStyle={styles.inputText}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                placeholder="Country (optional)"
                                                value={formData.country}
                                                onChangeText={(text) => handleInputChange('country', text)}
                                                outlineColor="#E2E8F0"
                                                activeOutlineColor="#CBD5E1"
                                                style={[styles.input, styles.flex1]}
                                                contentStyle={styles.inputText}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.checkboxContainer}>
                                        <Checkbox.Android
                                            status={formData.show_on_map ? 'checked' : 'unchecked'}
                                            onPress={() => handleInputChange('show_on_map', !formData.show_on_map)}
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
                                        <Text style={styles.label}>Photos ({uploadedImages.length}/10)</Text>
                                        <TouchableOpacity style={styles.uploadAreaImages} onPress={pickImages} disabled={isUploading}>
                                            {isUploading ? (
                                                <ActivityIndicator size="large" color="#94A3B8" />
                                            ) : (
                                                <MaterialCommunityIcons name="image-outline" size={48} color="#94A3B8" />
                                            )}
                                            <Text style={styles.uploadTitle}>Upload Photos</Text>
                                            <Text style={styles.uploadSubtext}>Add up to 10 photos of your item</Text>
                                            <Text style={styles.uploadHint}>Images will be automatically compressed for{"\n"}faster upload</Text>
                                        </TouchableOpacity>
                                        {uploadedImages.length > 0 && (
                                            <View style={styles.mediaPreviewRow}>
                                                {uploadedImages.map((uri, idx) => (
                                                    <View key={idx} style={styles.mediaThumb}>
                                                        <Image source={{ uri }} style={styles.mediaThumbImage} />
                                                        <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => removeImage(idx)}>
                                                            <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Videos (Optional) ({uploadedVideos.length})</Text>
                                        <TouchableOpacity style={styles.uploadAreaVideos} onPress={pickVideos} disabled={isUploading}>
                                            {isUploading ? (
                                                <ActivityIndicator size="large" color="#A855F7" />
                                            ) : (
                                                <MaterialCommunityIcons name="video-outline" size={48} color="#A855F7" />
                                            )}
                                            <Text style={styles.uploadTitle}>Upload Short Videos</Text>
                                            <Text style={styles.uploadSubtext}>Add videos to showcase your item (max 30{"\n"}seconds each)</Text>
                                            <Text style={styles.uploadHintVideo}>Keep videos under 10MB for best results</Text>
                                        </TouchableOpacity>
                                        {uploadedVideos.length > 0 && (
                                            <View style={styles.mediaPreviewRow}>
                                                {uploadedVideos.map((uri, idx) => (
                                                    <View key={idx} style={styles.mediaThumb}>
                                                        <View style={[styles.mediaThumbImage, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                                                            <MaterialCommunityIcons name="video" size={24} color="#A855F7" />
                                                        </View>
                                                        <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => removeVideo(idx)}>
                                                            <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
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
                                                value={formData.daily_rate}
                                                onChangeText={(text) => handleInputChange('daily_rate', text)}
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
                                                value={formData.deposit}
                                                onChangeText={(text) => handleInputChange('deposit', text)}
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

                                        {formData.pricing_tiers.length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                                {formData.pricing_tiers.map((tier, idx) => (
                                                    <View key={idx} style={styles.tierItemRow}>
                                                        <Text style={styles.tierItemText}>
                                                            {tier.days} {tier.days === 1 ? 'day' : 'days'}: ${tier.price.toFixed(2)}
                                                        </Text>
                                                        <TouchableOpacity onPress={() => removePricingTier(idx)}>
                                                            <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        <View style={styles.tierRow}>
                                            <View style={[styles.numberInputContainer, { flex: 1, marginRight: 12 }]}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="Days (e.g., 7)"
                                                    value={newTier.days}
                                                    onChangeText={(text) => setNewTier(prev => ({ ...prev, days: text }))}
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
                                            <View style={[styles.numberInputContainer, { flex: 1 }]}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="Price (e.g., 150)"
                                                    value={newTier.price}
                                                    onChangeText={(text) => setNewTier(prev => ({ ...prev, price: text }))}
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

                                        <Button
                                            mode="outlined"
                                            icon="plus"
                                            style={styles.addTierBtn}
                                            labelStyle={styles.addTierBtnLabel}
                                            onPress={addPricingTier}
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
                                                    value={formData.min_rental_days}
                                                    onChangeText={(text) => handleInputChange('min_rental_days', text)}
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
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
                                                    value={formData.max_rental_days}
                                                    onChangeText={(text) => handleInputChange('max_rental_days', text)}
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
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
                                                    value={formData.notice_period_hours}
                                                    onChangeText={(text) => handleInputChange('notice_period_hours', text)}
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
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
                                                    status={formData.instant_booking ? 'checked' : 'unchecked'}
                                                    onPress={() => handleInputChange('instant_booking', !formData.instant_booking)}
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
                                                    status={formData.same_day_pickup ? 'checked' : 'unchecked'}
                                                    onPress={() => handleInputChange('same_day_pickup', !formData.same_day_pickup)}
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
                                            onPress={() => handleDeliveryOptionToggle('pickup')}
                                            activeOpacity={0.7}
                                        >
                                            <Checkbox.Android
                                                status={formData.delivery_options.includes('pickup') ? 'checked' : 'unchecked'}
                                                onPress={() => handleDeliveryOptionToggle('pickup')}
                                                color="#A855F7"
                                                uncheckedColor="#CBD5E1"
                                            />
                                            <Text style={styles.deliveryOptionLabel}>Pickup at location</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.checkboxRowRaw}
                                            onPress={() => handleDeliveryOptionToggle('delivery')}
                                            activeOpacity={0.7}
                                        >
                                            <Checkbox.Android
                                                status={formData.delivery_options.includes('delivery') ? 'checked' : 'unchecked'}
                                                onPress={() => handleDeliveryOptionToggle('delivery')}
                                                color="#A855F7"
                                                uncheckedColor="#CBD5E1"
                                            />
                                            <Text style={styles.deliveryOptionLabel}>Delivery to renter</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {formData.delivery_options.includes('delivery') && (
                                        <View style={styles.rowInputs}>
                                            <View style={[styles.inputGroup, styles.flex1, { marginRight: 12 }]}>
                                                <Text style={styles.smallLabel}>Delivery Fee ($)</Text>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="0.00"
                                                    value={formData.delivery_fee}
                                                    onChangeText={(text) => handleInputChange('delivery_fee', text)}
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.input}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                            <View style={[styles.inputGroup, styles.flex1]}>
                                                <Text style={styles.smallLabel}>Max Distance (miles)</Text>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="10"
                                                    value={formData.delivery_radius}
                                                    onChangeText={(text) => handleInputChange('delivery_radius', text)}
                                                    outlineColor="#E2E8F0"
                                                    activeOutlineColor="#CBD5E1"
                                                    style={styles.input}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    )}

                                    {/* Pricing Summary */}
                                    <View style={styles.pricingSummaryCard}>
                                        <Text style={styles.pricingSummaryTitle}>Pricing Summary</Text>

                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Base daily rate:</Text>
                                            <Text style={styles.summaryValue}>${dailyRate.toFixed(2)}/day</Text>
                                        </View>

                                        {formData.pricing_tiers.length > 0 && formData.pricing_tiers.map((tier, idx) => (
                                            <View key={idx} style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>{tier.days} days:</Text>
                                                <Text style={styles.summaryValue}>${tier.price.toFixed(2)}</Text>
                                            </View>
                                        ))}

                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Security deposit:</Text>
                                            <Text style={styles.summaryValue}>${depositAmount.toFixed(2)}</Text>
                                        </View>

                                        {formData.delivery_options.includes('delivery') && parseFloat(formData.delivery_fee) > 0 && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Delivery fee:</Text>
                                                <Text style={styles.summaryValue}>${(parseFloat(formData.delivery_fee) || 0).toFixed(2)}</Text>
                                            </View>
                                        )}

                                        <View style={styles.summaryDivider} />

                                        {formData.pricing_tiers.length === 0 && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Weekly estimate (base rate):</Text>
                                                <Text style={styles.summaryValueBold}>${(dailyRate * 7).toFixed(2)}</Text>
                                            </View>
                                        )}
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
                                disabled={isSubmitting || isGeocodingLocation || isUploading}
                                loading={isSubmitting || isGeocodingLocation}
                                onPress={() => {
                                    if (step < 3) handleContinue();
                                    else handleSubmit();
                                }}
                                style={[styles.continueBtn, step === 3 && { backgroundColor: '#71DCA3' }]}
                                labelStyle={styles.continueBtnLabel}
                            >
                                {isGeocodingLocation ? 'Getting location...' : isSubmitting ? 'Publishing...' : step === 3 ? 'List Item' : 'Continue'}
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
    mediaPreviewRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    mediaThumb: {
        position: 'relative',
    },
    mediaThumbImage: {
        width: 72,
        height: 72,
        borderRadius: 8,
    },
    mediaRemoveBtn: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#FFFFFF',
        borderRadius: 11,
    },
    tierItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    tierItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
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
