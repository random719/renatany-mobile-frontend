import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useUIStore } from '../../store/uiStore';
import { colors } from '../../theme';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(width * 0.8, 320);

export const SidebarMenu = () => {
    const { isSidebarVisible: isVisible, closeSidebar: onClose } = useUIStore();
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [isMounted, setIsMounted] = React.useState(isVisible);

    useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 250,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setIsMounted(false);
            });
        }
    }, [isVisible, slideAnim, fadeAnim]);

    if (!isMounted) {
        return null;
    }

    const renderNavItem = (icon: any, label: string, isActive = false) => (
        <TouchableOpacity style={[styles.navItem, isActive && styles.navItemActive]}>
            <MaterialCommunityIcons
                name={icon}
                size={22}
                color={isActive ? '#FFFFFF' : colors.textPrimary}
            />
            <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.overlayContainer}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.header}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoIcon}>
                            <MaterialCommunityIcons name="home-outline" size={24} color="#FFFFFF" />
                        </View>
                        <Text style={styles.logoText}>Rentany</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialCommunityIcons name="close" size={20} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.tagline}>Rent anything, from anyone.</Text>
                <View style={styles.divider} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.sectionTitle}>NAVIGATE</Text>
                    {renderNavItem('home-outline', 'Browse All', true)}
                    {renderNavItem('heart-outline', 'Favorites')}
                    {renderNavItem('bookmark-outline', 'Saved Searches')}
                    {renderNavItem('clock-outline', 'Rental History')}
                    {renderNavItem('plus', 'List Item')}
                    {renderNavItem('square-edit-outline', 'Bulk Edit Items')}
                    {renderNavItem('account-outline', 'My Profile')}
                    {renderNavItem('chat-outline', 'My Conversations')}
                    {renderNavItem('alert-outline', 'Disputes')}

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>CATEGORIES</Text>
                    {renderNavItem('cellphone', 'Electronics')}
                    {renderNavItem('cog-outline', 'Tools')}
                    {renderNavItem('account-outline', 'Fashion')}
                    {renderNavItem('check-decagram-outline', 'Sports')}
                    {renderNavItem('swap-horizontal', 'Vehicles')}
                    {renderNavItem('home-outline', 'Home')}
                    {renderNavItem('book-open-outline', 'Books')}
                    {renderNavItem('music-note-outline', 'Music')}

                    <View style={styles.bottomSpacer} />
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sidebar: {
        width: SIDEBAR_WIDTH,
        height: '100%',
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        left: 0,
        top: 0,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 8,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#111827',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagline: {
        fontSize: 14,
        color: '#6B7280',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4B5563',
        paddingHorizontal: 16,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
        gap: 16,
    },
    navItemActive: {
        backgroundColor: colors.accentBlue,
    },
    navItemText: {
        fontSize: 15,
        color: colors.textPrimary,
        fontWeight: '500',
    },
    navItemTextActive: {
        color: '#FFFFFF',
    },
    bottomSpacer: {
        height: 24,
    },
});
