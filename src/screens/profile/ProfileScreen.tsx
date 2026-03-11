import { useClerk, useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Surface, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { useAuthStore } from '../../store/authStore';
import { useListingStore } from '../../store/listingStore';

export const ProfileScreen = () => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const { logout } = useAuthStore();
    const navigation = useNavigation<any>();
    const { userItems, fetchUserItems, isLoading } = useListingStore();

    useEffect(() => {
        if (user?.id) {
            fetchUserItems(user.id);
        }
    }, [user?.id, fetchUserItems]);

    const stats = useMemo(() => {
        const totalItems = userItems.length;
        const availableItems = userItems.filter((item) => item.isActive).length;
        const avgRating = userItems.length > 0
            ? userItems.reduce((sum, item) => sum + item.rating, 0) / userItems.length
            : 0;
        const totalReviews = userItems.reduce((sum, item) => sum + item.totalReviews, 0);
        return { totalItems, availableItems, avgRating, totalReviews };
    }, [userItems]);

    const handleAddPayment = () => {
        Alert.alert('Add Payment Method', 'Stripe SetupIntent integration will be available when the API is connected.');
    };

    const handleConnectBank = () => {
        Alert.alert('Connect Bank Account', 'Stripe Connect onboarding will be available when the API is connected.');
    };

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch (e) {
            console.log('Clerk sign out failed:', e);
        } finally {
            logout();
        }
    };

    const derivedHandle = user?.username || (user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress.split('@')[0] : 'guest');

    return (
        <View style={styles.mainContainer}>
            <GlobalHeader />
            <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentWrapper}>
                    
                    {/* User Profile Card */}
                    <Surface style={styles.profileCard} elevation={0}>
                        <View style={styles.profileHeaderBg} />
                        
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatarWrapper}>
                                {user?.imageUrl ? (
                                    <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <MaterialCommunityIcons name="account" size={48} color="#FFFFFF" />
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.userInfoContainer}>
                            <Text style={styles.handleText}>@{derivedHandle}</Text>
                            
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statNumber}>{stats.totalItems}</Text>
                                    <Text style={styles.statLabel}>Items</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.availableItems}</Text>
                                    <Text style={styles.statLabel}>Available</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <View style={styles.ratingRow}>
                                        <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.avgRating.toFixed(1)}</Text>
                                        <MaterialCommunityIcons name="star" size={16} color="#F59E0B" style={styles.starIcon} />
                                    </View>
                                    <Text style={styles.statLabel}>({stats.totalReviews} reviews)</Text>
                                </View>
                            </View>

                            <Button 
                                mode="contained" 
                                style={styles.listNewBtn}
                                labelStyle={styles.listNewBtnLabel}
                                onPress={() => navigation.navigate('Main', { screen: 'ListItemTab' })}
                            >
                                List New Item
                            </Button>

                            <Button 
                                mode="outlined" 
                                icon="logout"
                                style={styles.signOutBtn}
                                labelStyle={styles.signOutBtnLabel}
                                onPress={handleSignOut}
                            >
                                Sign Out
                            </Button>
                        </View>
                    </Surface>

                    {/* Payment Setup Card */}
                    <Surface style={styles.card} elevation={0}>
                        <Text style={styles.cardTitle}>Payment setup</Text>
                        
                        <View style={styles.badgeRow}>
                            <View style={styles.badgeError}>
                                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                                <Text style={styles.badgeErrorText}>Card not connected</Text>
                            </View>
                        </View>
                        
                        <View style={styles.badgeRow}>
                            <View style={styles.badgeError}>
                                <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                                <Text style={styles.badgeErrorText}>Bank not connected</Text>
                            </View>
                        </View>

                        <Button
                            mode="contained"
                            icon="credit-card-outline"
                            style={styles.addPaymentBtn}
                            labelStyle={styles.addPaymentBtnLabel}
                            onPress={handleAddPayment}
                        >
                            Add payment method
                        </Button>
                        <Text style={styles.helperText}>Stripe SetupIntent (card) - Required to rent items</Text>

                        <Button
                            mode="contained"
                            icon="bank-outline"
                            style={styles.connectBankBtn}
                            labelStyle={styles.connectBankBtnLabel}
                            onPress={handleConnectBank}
                        >
                            Connect bank account
                        </Button>
                        <Text style={styles.helperText}>Stripe Connect onboarding - Required to receive payouts</Text>
                    </Surface>

                    {/* Quick Links Grid */}
                    <Surface style={[styles.card, styles.gridCard]} elevation={0}>
                        <View style={styles.gridRow}>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'BulkEditItems' })}>
                                <MaterialCommunityIcons name="package-variant-closed" size={24} color="#0F172A" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'RentalHistoryTab' })}>
                                <MaterialCommunityIcons name="chart-line-variant" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'FavoritesTab' })}>
                                <MaterialCommunityIcons name="star-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.gridRow}>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'RentalHistoryTab' })}>
                                <MaterialCommunityIcons name="calendar-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'DisputesTab' })}>
                                <MaterialCommunityIcons name="alert-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('Main', { screen: 'ConversationsTab' })}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.gridRowBottom}>
                            <TouchableOpacity style={styles.gridItem} onPress={() => Alert.alert('Settings', 'Settings screen coming soon.')}>
                                <MaterialCommunityIcons name="cog-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                            <View style={styles.gridItemEmpty} />
                            <View style={styles.gridItemEmpty} />
                        </View>
                    </Surface>

                    {/* Mock Item Listing */}
                    <Surface style={styles.itemCard} elevation={0}>
                        <View style={styles.itemImagePlaceholder}>
                            <View style={styles.tagOverlay}>
                                <Text style={styles.tagOverlayText}>sports</Text>
                            </View>
                            <View style={styles.heartOverlay}>
                                <MaterialCommunityIcons name="heart-outline" size={20} color="#94A3B8" />
                            </View>
                            
                            {/* Inner mock lines matching the dark picture */}
                            <View style={styles.mockInnerContent}>
                                <Text style={styles.mockInnerTitle}>Project Name</Text>
                                <Text style={styles.mockInnerSub}>IFL Green v1.0.0</Text>
                                <Text style={styles.mockInnerMeta}>This is your public display name.</Text>

                                <Text style={[styles.mockInnerTitle, {marginTop: 12}]}>Deployment Link</Text>
                                <View style={styles.mockInnerInput} />
                                <Text style={styles.mockInnerMeta}>You can manage verified email addresses in your email settings.</Text>
                            </View>
                        </View>
                        
                        <View style={styles.itemCardContent}>
                            <Text style={styles.itemCardTitle}>product</Text>
                            <View style={styles.itemCardLocation}>
                                <MaterialCommunityIcons name="map-marker-outline" size={14} color="#64748B" />
                                <Text style={styles.itemCardLocationText}>india</Text>
                            </View>
                            <View style={styles.itemCardPriceRow}>
                                <Text style={styles.itemCardPrice}>$25</Text>
                                <Text style={styles.itemCardPriceUnit}>/day</Text>
                            </View>
                            
                            <Button
                                mode="contained"
                                icon="eye-outline"
                                style={styles.viewBtn}
                                labelStyle={styles.viewBtnLabel}
                                onPress={() => {
                                    if (userItems.length > 0) {
                                        navigation.navigate('Main', { screen: 'HomeTab', params: { screen: 'ListingDetail', params: { listingId: userItems[0].id } } });
                                    }
                                }}
                            >
                                View
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
        backgroundColor: '#F1F5F9', // slightly darker background to match screenshot contrast
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
        paddingTop: 24,
        paddingBottom: 48,
    },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
    },
    profileHeaderBg: {
        backgroundColor: '#1E293B', // dark slate block at the top
        height: 100,
        width: '100%',
    },
    avatarContainer: {
        alignItems: 'center',
        marginTop: -52, // pull avatar up into the dark header
    },
    avatarWrapper: {
        width: 104,
        height: 104,
        borderRadius: 52,
        backgroundColor: '#FFFFFF',
        padding: 4, // creates the white ring effect
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarImage: {
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#6366F1', // indigo gradient-like color
        alignItems: 'center',
        justifyContent: 'center',
    },
    userInfoContainer: {
        padding: 24,
        paddingTop: 16,
        alignItems: 'center',
    },
    handleText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    statBox: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#64748B',
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    starIcon: {
        marginLeft: 4,
        marginBottom: 4,
    },
    listNewBtn: {
        backgroundColor: '#1E293B',
        width: '100%',
        borderRadius: 12,
        marginBottom: 12,
        paddingVertical: 4,
    },
    listNewBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    signOutBtn: {
        borderColor: '#E2E8F0',
        width: '100%',
        borderRadius: 12,
        flexDirection: 'row',
        paddingVertical: 4,
    },
    signOutBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0F172A',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 24,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 20,
    },
    badgeRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    badgeError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    badgeErrorText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#DC2626',
        marginLeft: 6,
    },
    addPaymentBtn: {
        backgroundColor: '#2563EB', // Blue matching screenshot
        marginTop: 12,
        borderRadius: 8,
        paddingVertical: 4,
    },
    addPaymentBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    connectBankBtn: {
        backgroundColor: '#16A34A', // Green matching screenshot
        marginTop: 20,
        borderRadius: 8,
        paddingVertical: 4,
    },
    connectBankBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    helperText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
    },
    gridCard: {
        paddingVertical: 20,
        paddingHorizontal: 0,
    },
    gridRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    gridRowBottom: {
        flexDirection: 'row',
    },
    gridItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    gridItemEmpty: {
        flex: 1,
    },
    itemCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 200, // Matching the proportion of the screenshot relative to the container
    },
    itemImagePlaceholder: {
        height: 200,
        backgroundColor: '#111827',
        padding: 16,
        position: 'relative',
    },
    tagOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        zIndex: 1,
    },
    tagOverlayText: {
        color: '#16A34A',
        fontWeight: '700',
        fontSize: 12,
    },
    heartOverlay: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFFFFF',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    mockInnerContent: {
        marginTop: 40,
    },
    mockInnerTitle: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    mockInnerSub: {
        color: '#94A3B8',
        fontSize: 10,
        marginBottom: 4,
    },
    mockInnerMeta: {
        color: '#64748B',
        fontSize: 8,
    },
    mockInnerInput: {
        height: 24,
        backgroundColor: '#1E293B',
        borderRadius: 4,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#334155',
    },
    itemCardContent: {
        padding: 16,
    },
    itemCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4,
    },
    itemCardLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemCardLocationText: {
        fontSize: 13,
        color: '#64748B',
        marginLeft: 4,
    },
    itemCardPriceRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
    },
    itemCardPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    itemCardPriceUnit: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 4,
        marginLeft: 2,
    },
    viewBtn: {
        backgroundColor: '#1E293B',
        borderRadius: 8,
        paddingVertical: 0,
    },
    viewBtnLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});
