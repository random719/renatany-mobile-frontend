import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { GlobalHeader } from './GlobalHeader';
import { Footer } from '../home/Footer';
import { AppBottomNavBar } from './AppBottomNavBar';
import { colors } from '../../theme';

interface ScreenLayoutProps {
    children: React.ReactNode;
    /** Show the footer at the bottom (default: true) */
    showFooter?: boolean;
    /** Pull-to-refresh handler */
    onRefresh?: () => void;
    /** Whether refresh is active */
    refreshing?: boolean;
    /** Enable KeyboardAvoidingView (default: false) */
    keyboardAvoiding?: boolean;
    /** Extra bottom padding (default: 0) */
    extraBottomPadding?: number;
    /** Scroll content container style overrides */
    contentContainerStyle?: object;
    /** Show the shared bottom navigation */
    showBottomNav?: boolean;
    /** Active bottom nav item */
    bottomNavActiveKey?: 'home' | 'search' | 'list' | 'favorites' | 'profile' | 'none';
}

export const ScreenLayout = ({
    children,
    showFooter = true,
    onRefresh,
    refreshing = false,
    keyboardAvoiding = false,
    extraBottomPadding = 0,
    contentContainerStyle,
    showBottomNav = false,
    bottomNavActiveKey = 'none',
}: ScreenLayoutProps) => {
    const scrollContent = (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
                styles.scrollContent,
                extraBottomPadding ? { paddingBottom: extraBottomPadding } : null,
                contentContainerStyle
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                ) : undefined
            }
        >
            {children}
            {showFooter && <Footer />}
        </ScrollView>
    );

    return (
        <View style={styles.container}>
            <GlobalHeader />
            {keyboardAvoiding ? (
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {scrollContent}
                </KeyboardAvoidingView>
            ) : (
                scrollContent
            )}
            {showBottomNav && <AppBottomNavBar activeKey={bottomNavActiveKey} />}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    flex: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
    },
});
