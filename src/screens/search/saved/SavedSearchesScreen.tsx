import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../../components/common/GlobalHeader';
import { Footer } from '../../../components/home/Footer';

export const SavedSearchesScreen = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.mainContainer}>
            <GlobalHeader />
            <ScrollView 
                style={styles.scrollContainer} 
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.contentWrapper}>
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <MaterialCommunityIcons name="arrow-left" size={20} color="#475569" />
                        <Text style={styles.backBtnText}>Back to Browse</Text>
                    </TouchableOpacity>

                    <View style={styles.titleRow}>
                        <MaterialCommunityIcons name="bookmark" size={32} color="#2563EB" />
                        <Text style={styles.title}>Saved Searches</Text>
                    </View>

                    <Text style={styles.countText}>0 saved searches</Text>

                    <View style={styles.emptyCard}>
                        <MaterialCommunityIcons name="bookmark-outline" size={72} color="#CBD5E1" style={styles.emptyIcon} />
                        <Text style={styles.emptyTitle}>No saved searches yet.</Text>
                        <Text style={styles.emptySubtitle}>
                            Save your search criteria to get notified{"\n"}when new items match!
                        </Text>
                        <Button
                            mode="contained"
                            style={styles.searchBtn}
                            contentStyle={styles.searchBtnContent}
                            labelStyle={styles.searchBtnLabel}
                            buttonColor="#111827"
                            textColor="#FFFFFF"
                            onPress={() => navigation.navigate('HomeTab' as never)}
                        >
                            Start Searching
                        </Button>
                    </View>
                </View>
                <Footer />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
    },
    contentWrapper: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 48,
        maxWidth: 768,
        width: '100%',
        alignSelf: 'center',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 28,
    },
    backBtnText: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '500',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    countText: {
        color: '#64748B',
        fontSize: 16,
        marginBottom: 32,
        fontWeight: 'regular',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 56,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    emptyIcon: {
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#64748B',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        color: '#94A3B8',
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 32,
    },
    searchBtn: {
        borderRadius: 8,
    },
    searchBtnContent: {
        height: 48,
        paddingHorizontal: 28,
    },
    searchBtnLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0,
    },
});
