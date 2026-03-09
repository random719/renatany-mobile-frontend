import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../../components/common/GlobalHeader';
import { Footer } from '../../../components/home/Footer';
import { colors, typography } from '../../../theme';

export const SavedSearchesScreen = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <GlobalHeader />
            <View style={styles.content}>
                <View style={styles.headerSection}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
                        <Text style={styles.backBtnText}>Back to Browse</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="bookmark" size={32} color={colors.accentBlue} />
                        <Text variant="displaySmall" style={styles.title}>Saved Searches</Text>
                    </View>

                    <Text variant="bodyLarge" style={styles.countText}>0 saved searches</Text>
                </View>

                <View style={styles.emptyCard}>
                    <MaterialCommunityIcons name="bookmark-outline" size={64} color="#CBD5E1" style={styles.emptyIcon} />
                    <Text variant="headlineSmall" style={styles.emptyTitle}>No saved searches yet.</Text>
                    <Text variant="bodyMedium" style={styles.emptySubtitle}>
                        Save your search criteria to get notified when new items match!
                    </Text>
                    <Button
                        mode="contained"
                        style={styles.searchBtn}
                        contentStyle={styles.searchBtnContent}
                        onPress={() => navigation.navigate('HomeTab' as never)}
                    >
                        Start Searching
                    </Button>
                </View>
            </View>
            <Footer />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
    },
    headerSection: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 32,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    backBtnText: {
        color: '#475569',
        fontSize: typography.body,
        fontWeight: '500',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    title: {
        fontWeight: '800',
        color: '#0F172A',
    },
    countText: {
        color: '#64748B',
        fontSize: typography.tabLabel,
    },
    emptyCard: {
        marginHorizontal: 16,
        padding: 32,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
    },
    emptyIcon: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontWeight: '700',
        color: '#334155',
        marginBottom: 12,
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#94A3B8',
        marginBottom: 24,
        lineHeight: 20,
        paddingHorizontal: 12,
    },
    searchBtn: {
        backgroundColor: '#1E293B',
        borderRadius: 8,
        width: '100%',
    },
    searchBtnContent: {
        height: 48,
    },
});
