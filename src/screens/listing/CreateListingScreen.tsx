import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Menu, Text, TextInput, Surface } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { colors, typography } from '../../theme';
import { CreateListingFormData } from '../../types/listing';
import { useListingStore } from '../../store/listingStore';
import { useAuthStore } from '../../store/authStore';
import { uploadFile } from '../../services/listingService';
import { geocodeLocation } from '../../utils/geocodeLocation';
import { RootStackParamList } from '../../types/navigation';
import { toast } from '../../store/toastStore';
import { useI18n } from '../../i18n';

const CATEGORIES = [
    { value: 'electronics', label: 'Electronics', icon: 'laptop' },
    { value: 'tools', label: 'Tools', icon: 'hammer' },
    { value: 'fashion', label: 'Fashion', icon: 'tshirt-crew' },
    { value: 'sports', label: 'Sports', icon: 'soccer' },
    { value: 'vehicles', label: 'Vehicles', icon: 'car' },
    { value: 'home', label: 'Home', icon: 'home' },
    { value: 'books', label: 'Books', icon: 'book' },
    { value: 'music', label: 'Music', icon: 'music' },
    { value: 'photography', label: 'Photography', icon: 'camera' },
    { value: 'other', label: 'Other', icon: 'dots-horizontal' },
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
    const { t } = useI18n();
    const navigation = useNavigation();
    const route = useRoute<RouteProp<RootStackParamList, 'EditItem'>>();
    const itemId = (route.params as any)?.itemId as string | undefined;
    const isEditMode = !!itemId;

    const { createItem, updateItem, isSubmitting, categories, fetchCategories, selectedListing, fetchListingById } = useListingStore();
    const { user } = useAuthStore();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<CreateListingFormData>(INITIAL_FORM_DATA);

    // In edit mode: load existing listing data into form
    useEffect(() => {
        if (!isEditMode || !itemId) return;
        fetchListingById(itemId).then(() => {}).catch(() => {});
    }, [itemId, isEditMode]);

    useEffect(() => {
        if (!isEditMode || !selectedListing || selectedListing.id !== itemId) return;
        const l = selectedListing as any;
        setFormData({
            title: l.title || '',
            description: l.description || '',
            category: l.category || '',
            daily_rate: String(l.pricePerDay || l.daily_rate || ''),
            pricing_tiers: l.pricingTiers || l.pricing_tiers || [],
            deposit: String(l.deposit || ''),
            condition: l.condition || 'good',
            location: typeof l.location === 'object' ? (l.location?.address || l.location?.city || '') : (l.location || ''),
            street_address: l.street_address || '',
            postcode: l.postcode || '',
            country: l.country || '',
            show_on_map: l.show_on_map ?? true,
            min_rental_days: String(l.min_rental_days || '1'),
            max_rental_days: String(l.max_rental_days || '30'),
            notice_period_hours: String(l.notice_period_hours ?? '24'),
            instant_booking: l.instant_booking ?? false,
            same_day_pickup: l.same_day_pickup ?? false,
            delivery_options: l.delivery_options || ['pickup'],
            delivery_fee: String(l.delivery_fee || ''),
            delivery_radius: String(l.delivery_radius || ''),
        });
        if (l.images?.length) setUploadedImages(l.images);
        if (l.videos?.length) setUploadedVideos(l.videos);
    }, [selectedListing?.id, isEditMode, itemId]);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [isUploadingVideos, setIsUploadingVideos] = useState(false);
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
            toast.warning(t('createListing.tierMissingValues'));
            return;
        }
        const days = parseInt(newTier.days);
        const price = parseFloat(newTier.price);
        if (isNaN(days) || isNaN(price) || days <= 0 || price <= 0) {
            toast.error(t('createListing.tierInvalid'));
            return;
        }
        if (formData.pricing_tiers.some(t => t.days === days)) {
            toast.warning(t('createListing.tierExists'));
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
            toast.warning(t('createListing.photoPermission'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 10 - uploadedImages.length,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsUploadingImages(true);
        try {
            const urls: string[] = [];
            for (const asset of result.assets) {
                const url = await uploadFile(asset.uri, 'image');
                urls.push(url);
            }
            setUploadedImages(prev => [...prev, ...urls].slice(0, 10));
        } catch (error) {
            console.error('Image upload failed:', error);
            toast.error(t('createListing.uploadImagesFailed'));
        } finally {
            setIsUploadingImages(false);
        }
    }, [uploadedImages.length]);

    const pickVideos = useCallback(async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            toast.warning(t('createListing.videoPermission'));
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            quality: 0.7,
            videoMaxDuration: 30,
        });
        if (result.canceled || !result.assets?.length) return;

        setIsUploadingVideos(true);
        try {
            const url = await uploadFile(result.assets[0].uri, 'video');
            setUploadedVideos(prev => [...prev, url]);
        } catch (error) {
            console.error('Video upload failed:', error);
            toast.error(t('createListing.uploadVideoFailed'));
        } finally {
            setIsUploadingVideos(false);
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
                1: t('createListing.step1Invalid'),
                2: t('createListing.step2Invalid'),
                3: t('createListing.step3Invalid'),
            };
            toast.warning(messages[step] || t('createListing.completeRequired'));
            return;
        }
        setStep(prev => prev + 1);
    }, [step, isStepValid]);

    const handleSubmit = useCallback(async () => {
        if (!isStepValid(3)) {
            toast.warning(t('createListing.step3Invalid'));
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

            if (isEditMode && itemId) {
                await updateItem(itemId, payload);
                toast.success(t('createListing.updatedSuccess'), () => navigation.goBack());
            } else {
                await createItem(payload);
                toast.success(t('createListing.listedSuccess'), () => navigation.goBack());
            }
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error(t('createListing.saveFailed'));
        }
    }, [formData, uploadedImages, uploadedVideos, createItem, updateItem, navigation, isStepValid, isEditMode, itemId, t]);

    const categoryLabel = categories.find(c => c.name === formData.category)?.name ||
                        (formData.category ? t(`createListing.categories.${formData.category.toLowerCase()}`) : '') ||
                        (formData.category ? t(`createListing.categories.${CATEGORIES.find(c => c.label === formData.category)?.value || ''}`) : '') || '';
    const conditionLabel = formData.condition ? t(`createListing.conditions.${formData.condition}`) : t('createListing.conditions.good');
    React.useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const dailyRate = parseFloat(formData.daily_rate) || 0;
    const depositAmount = parseFloat(formData.deposit) || 0;

    return (
        <View style={styles.mainContainer}>
            <GlobalHeader />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentWrapper}>
                    {/* Header */}
                    <View style={styles.headerContainer}>
                        <Text style={styles.pageTitle}>{t('createListing.title')}</Text>
                        <Text style={styles.pageSubtitle}>
                            {t('createListing.subtitle')}
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
                                <Text style={styles.warningTitle}>{t('createListing.bankWarningTitle')}</Text>
                                <Text style={styles.warningText}>
                                    {t('createListing.bankWarningBody')}{' '}
                                    <Text style={styles.warningLink}>{t('createListing.connectNow')}</Text>
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Form Card */}
                    <Surface style={styles.formCard} elevation={0}>
                        {step === 1 && (
                            <>
                                <Text style={styles.sectionTitle}>{t('createListing.step1Title')}</Text>

                                <View style={styles.formSection}>
                                    {/* Item Title */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.itemTitle')}</Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('createListing.itemTitlePlaceholder')}
                                            value={formData.title}
                                            onChangeText={(text) => handleInputChange('title', text)}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={styles.input}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    {/* Description */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.descriptionLabel')}</Text>
                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('createListing.descriptionPlaceholder')}
                                            value={formData.description}
                                            onChangeText={(text) => handleInputChange('description', text)}
                                            multiline
                                            numberOfLines={4}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={[styles.input, styles.textArea]}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    {/* Category */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.categoryLabel')}</Text>
                                        <Menu
                                            visible={categoryMenuVisible}
                                            onDismiss={() => setCategoryMenuVisible(false)}
                                            contentStyle={styles.menuContent}
                                            anchor={
                                                <TouchableOpacity style={styles.dropdownContainer} onPress={() => setCategoryMenuVisible(true)}>
                                                    <Text style={formData.category ? styles.dropdownTextValue : styles.dropdownText}>
                                                        {categoryLabel || t('createListing.chooseCategory')}
                                                    </Text>
                                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                                                </TouchableOpacity>
                                            }
                                        >
                                            {categories.length > 0 ? categories.map(cat => (
                                                <Menu.Item
                                                    key={cat.id}
                                                    onPress={() => {
                                                        handleInputChange('category', cat.name);
                                                        setCategoryMenuVisible(false);
                                                    }}
                                                    title={t(`createListing.categories.${cat.name.toLowerCase()}`) === `createListing.categories.${cat.name.toLowerCase()}` ? cat.name : t(`createListing.categories.${cat.name.toLowerCase()}`)}
                                                    leadingIcon={formData.category === cat.name ? 'check' : (cat.icon as any)}
                                                    titleStyle={formData.category === cat.name ? styles.menuItemActiveText : undefined}
                                                />
                                            )) : CATEGORIES.map(cat => (
                                                <Menu.Item
                                                    key={cat.value}
                                                    onPress={() => {
                                                        handleInputChange('category', cat.value);
                                                        setCategoryMenuVisible(false);
                                                    }}
                                                    title={t(`createListing.categories.${cat.value}`)}
                                                    leadingIcon={formData.category === cat.value ? 'check' : (cat.icon as any)}
                                                    titleStyle={formData.category === cat.value ? styles.menuItemActiveText : undefined}
                                                />
                                            ))}
                                        </Menu>
                                    </View>

                                    {/* Condition */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.conditionLabel')}</Text>
                                        <Menu
                                            visible={conditionMenuVisible}
                                            onDismiss={() => setConditionMenuVisible(false)}
                                            contentStyle={styles.menuContent}
                                            anchor={
                                                <TouchableOpacity style={styles.dropdownContainer} onPress={() => setConditionMenuVisible(true)}>
                                                    <Text style={styles.dropdownTextValue}>{conditionLabel}</Text>
                                                    <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
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
                                                    title={t(`createListing.conditions.${cond.value}`)}
                                                    leadingIcon={formData.condition === cond.value ? 'check' : undefined}
                                                    titleStyle={formData.condition === cond.value ? styles.menuItemActiveText : undefined}
                                                />
                                            ))}
                                        </Menu>
                                    </View>

                                    {/* Location */}
                                    <View style={styles.inputGroup}>
                                        <View style={styles.labelRow}>
                                            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#334155" />
                                            <Text style={[styles.label, { marginBottom: 0, marginLeft: 6 }]}>{t('createListing.locationLabel')}</Text>
                                        </View>
                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('createListing.locationPlaceholder')}
                                            value={formData.location}
                                            onChangeText={(text) => handleInputChange('location', text)}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={styles.input}
                                            contentStyle={styles.inputText}
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    {/* Detailed Address */}
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.addressLabel')}</Text>
                                        <Text style={styles.subtext}>
                                            {t('createListing.addressHint')}
                                        </Text>

                                        <TextInput
                                            mode="outlined"
                                            placeholder={t('createListing.streetPlaceholder')}
                                            value={formData.street_address}
                                            onChangeText={(text) => handleInputChange('street_address', text)}
                                            outlineColor={colors.border}
                                            activeOutlineColor={colors.accentBlue}
                                            style={[styles.input, { marginBottom: 12 }]}
                                            contentStyle={styles.inputText}
                                        />

                                        <View style={styles.rowInputs}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder={t('createListing.postcodePlaceholder')}
                                                value={formData.postcode}
                                                onChangeText={(text) => handleInputChange('postcode', text)}
                                                outlineColor={colors.border}
                                                activeOutlineColor={colors.accentBlue}
                                                style={[styles.input, styles.flex1, { marginRight: 12 }]}
                                                contentStyle={styles.inputText}
                                            />
                                            <TextInput
                                                mode="outlined"
                                                placeholder={t('createListing.countryPlaceholder')}
                                                value={formData.country}
                                                onChangeText={(text) => handleInputChange('country', text)}
                                                outlineColor={colors.border}
                                                activeOutlineColor={colors.accentBlue}
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
                                        <Text style={styles.checkboxLabel}>{t('createListing.showOnMap')}</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <Text style={styles.sectionTitle}>{t('createListing.step2Title')}</Text>

                                <View style={styles.formSection}>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.photosLabel', { count: uploadedImages.length })}</Text>
                                        <TouchableOpacity style={styles.uploadAreaImages} onPress={pickImages} disabled={isUploadingImages || isUploadingVideos}>
                                            {isUploadingImages ? (
                                                <ActivityIndicator size="large" color="#94A3B8" />
                                            ) : (
                                                <MaterialCommunityIcons name="image-outline" size={48} color="#94A3B8" />
                                            )}
                                            <Text style={styles.uploadTitle}>{t('createListing.uploadPhotos')}</Text>
                                            <Text style={styles.uploadSubtext}>{t('createListing.uploadPhotosHint')}</Text>
                                            <Text style={styles.uploadHint}>{t('createListing.uploadPhotosNote')}</Text>
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
                                        <Text style={styles.label}>{t('createListing.videosLabel', { count: uploadedVideos.length })}</Text>
                                        <TouchableOpacity style={styles.uploadAreaVideos} onPress={pickVideos} disabled={isUploadingImages || isUploadingVideos}>
                                            {isUploadingVideos ? (
                                                <ActivityIndicator size="large" color="#A855F7" />
                                            ) : (
                                                <MaterialCommunityIcons name="video-outline" size={48} color="#A855F7" />
                                            )}
                                            <Text style={styles.uploadTitle}>{t('createListing.uploadVideos')}</Text>
                                            <Text style={styles.uploadSubtext}>{t('createListing.uploadVideosHint')}</Text>
                                            <Text style={styles.uploadHintVideo}>{t('createListing.uploadVideosNote')}</Text>
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
                                <Text style={styles.sectionTitle}>{t('createListing.step3Title')}</Text>

                                <View style={styles.formSection}>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.dailyRate')}</Text>
                                        <View style={styles.numberInputContainer}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="25.00"
                                                value={formData.daily_rate}
                                                onChangeText={(text) => handleInputChange('daily_rate', text)}
                                                outlineColor={colors.border}
                                                activeOutlineColor={colors.accentBlue}
                                                style={styles.numberInput}
                                                contentStyle={styles.inputText}
                                                keyboardType="numeric"
                                            />
                                            <View style={styles.stepperIcons}>
                                                <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                            </View>
                                        </View>
                                        <Text style={styles.helperText}>{t('createListing.dailyRateHint')}</Text>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>{t('createListing.securityDeposit')}</Text>
                                        <View style={styles.numberInputContainer}>
                                            <TextInput
                                                mode="outlined"
                                                placeholder="50.00"
                                                value={formData.deposit}
                                                onChangeText={(text) => handleInputChange('deposit', text)}
                                                outlineColor={colors.border}
                                                activeOutlineColor={colors.accentBlue}
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
                                        <Text style={styles.label}>{t('createListing.tieredPricing')}</Text>
                                        <Text style={styles.subtext}>
                                            {t('createListing.tieredPricingHint')}
                                        </Text>

                                        {formData.pricing_tiers.length > 0 && (
                                            <View style={{ marginBottom: 12 }}>
                                                {formData.pricing_tiers.map((tier, idx) => (
                                                    <View key={idx} style={styles.tierItemRow}>
                                                        <Text style={styles.tierItemText}>
                                                            {tier.days} {tier.days === 1 ? t('createListing.day') : t('createListing.days')}: ${tier.price.toFixed(2)}
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
                                                    placeholder={t('createListing.tierDaysPlaceholder')}
                                                    value={newTier.days}
                                                    onChangeText={(text) => setNewTier(prev => ({ ...prev, days: text }))}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
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
                                                    placeholder={t('createListing.tierPricePlaceholder')}
                                                    value={newTier.price}
                                                    onChangeText={(text) => setNewTier(prev => ({ ...prev, price: text }))}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
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
                                            {t('createListing.addPricingTier')}
                                        </Button>
                                    </View>

                                    {/* Booking Rules Block */}
                                    <View style={styles.bookingRulesBlock}>
                                        <View style={styles.labelRow}>
                                            <MaterialCommunityIcons name="calendar-outline" size={18} color="#0F172A" />
                                            <Text style={styles.bookingRulesTitle}>{t('createListing.bookingRules')}</Text>
                                        </View>
                                        <Text style={[styles.subtext, { marginBottom: 24 }]}>
                                            {t('createListing.bookingRulesHint')}
                                        </Text>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.smallLabel}>{t('createListing.minimumDays')}</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="1"
                                                    value={formData.min_rental_days}
                                                    onChangeText={(text) => handleInputChange('min_rental_days', text)}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
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
                                            <Text style={styles.smallLabel}>{t('createListing.maximumDays')}</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="30"
                                                    value={formData.max_rental_days}
                                                    onChangeText={(text) => handleInputChange('max_rental_days', text)}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
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
                                            <Text style={styles.smallLabel}>{t('createListing.noticePeriod')}</Text>
                                            <View style={styles.numberInputContainer}>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="24"
                                                    value={formData.notice_period_hours}
                                                    onChangeText={(text) => handleInputChange('notice_period_hours', text)}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
                                                    style={styles.numberInputSmall}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
                                                />
                                                <View style={styles.stepperIcons}>
                                                    <MaterialCommunityIcons name="unfold-more-horizontal" size={20} color="#94A3B8" style={{ transform: [{ rotate: '90deg' }] }} />
                                                </View>
                                            </View>
                                            <Text style={styles.helperText}>{t('createListing.noticePeriodHint')}</Text>
                                        </View>

                                        <View style={styles.preferencesCard}>
                                            <View style={styles.preferenceRow}>
                                                <View style={styles.preferenceText}>
                                                    <Text style={styles.preferenceTitle}>{t('createListing.instantBooking')}</Text>
                                                    <Text style={styles.preferenceDesc}>{t('createListing.instantBookingHint')}</Text>
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
                                                    <Text style={styles.preferenceTitle}>{t('createListing.sameDayPickup')}</Text>
                                                    <Text style={styles.preferenceDesc}>{t('createListing.sameDayPickupHint')}</Text>
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
                                        <Text style={styles.label}>{t('createListing.deliveryOptions')}</Text>

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
                                            <Text style={styles.deliveryOptionLabel}>{t('createListing.pickupAtLocation')}</Text>
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
                                            <Text style={styles.deliveryOptionLabel}>{t('createListing.deliveryToRenter')}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {formData.delivery_options.includes('delivery') && (
                                        <View style={styles.rowInputs}>
                                            <View style={[styles.inputGroup, styles.flex1, { marginRight: 12 }]}>
                                                <Text style={styles.smallLabel}>{t('createListing.deliveryFee')}</Text>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="0.00"
                                                    value={formData.delivery_fee}
                                                    onChangeText={(text) => handleInputChange('delivery_fee', text)}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
                                                    style={styles.input}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                            <View style={[styles.inputGroup, styles.flex1]}>
                                                <Text style={styles.smallLabel}>{t('createListing.maxDistance')}</Text>
                                                <TextInput
                                                    mode="outlined"
                                                    placeholder="10"
                                                    value={formData.delivery_radius}
                                                    onChangeText={(text) => handleInputChange('delivery_radius', text)}
                                                    outlineColor={colors.border}
                                                    activeOutlineColor={colors.accentBlue}
                                                    style={styles.input}
                                                    contentStyle={styles.inputText}
                                                    keyboardType="numeric"
                                                />
                                            </View>
                                        </View>
                                    )}

                                    {/* Pricing Summary */}
                                    <View style={styles.pricingSummaryCard}>
                                        <Text style={styles.pricingSummaryTitle}>{t('createListing.pricingSummary')}</Text>

                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>{t('createListing.baseDailyRate')}</Text>
                                            <Text style={styles.summaryValue}>${dailyRate.toFixed(2)}{t('createListing.perDay')}</Text>
                                        </View>

                                        {formData.pricing_tiers.length > 0 && formData.pricing_tiers.map((tier, idx) => (
                                            <View key={idx} style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>
                                                    {tier.days} {tier.days === 1 ? t('createListing.day') : t('createListing.days')}:
                                                </Text>
                                                <Text style={styles.summaryValue}>${tier.price.toFixed(2)}</Text>
                                            </View>
                                        ))}

                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>{t('createListing.securityDepositSummary')}</Text>
                                            <Text style={styles.summaryValue}>${depositAmount.toFixed(2)}</Text>
                                        </View>

                                        {formData.delivery_options.includes('delivery') && parseFloat(formData.delivery_fee) > 0 && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>{t('createListing.deliveryFeeSummary')}</Text>
                                                <Text style={styles.summaryValue}>${(parseFloat(formData.delivery_fee) || 0).toFixed(2)}</Text>
                                            </View>
                                        )}

                                        <View style={styles.summaryDivider} />

                                        {formData.pricing_tiers.length === 0 && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>{t('createListing.weeklyEstimate')}</Text>
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
                                    {t('createListing.previous')}
                                </Button>
                            ) : (
                                <View style={styles.spacer} />
                            )}
                            <Button
                                mode="contained"
                                disabled={isSubmitting || isGeocodingLocation || isUploadingImages || isUploadingVideos}
                                loading={isSubmitting || isGeocodingLocation}
                                onPress={() => {
                                    if (step < 3) handleContinue();
                                    else handleSubmit();
                                }}
                                style={[styles.continueBtn, step === 3 && { backgroundColor: '#71DCA3' }]}
                                labelStyle={styles.continueBtnLabel}
                            >
                                {isGeocodingLocation ? t('createListing.gettingLocation') : isSubmitting ? t('createListing.publishing') : step === 3 ? t('createListing.listItem') : t('createListing.continue')}
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
        borderRadius: 12,
        height: 48,
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
        height: 48,
        paddingRight: 40,
        borderRadius: 12,
    },
    numberInputSmall: {
        backgroundColor: '#FFFFFF',
        fontSize: 15,
        height: 48,
        paddingRight: 40,
        borderRadius: 12,
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
    dropdownText: {
        color: '#4B5563', // Darker gray for better consistency with Home Screen
        fontSize: typography.label,
    },
    dropdownTextValue: {
        color: colors.textPrimary,
        fontSize: typography.label,
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
