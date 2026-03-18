import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useI18n } from '../../i18n';
import { typography } from '../../theme';

export const Footer = () => {
    const { t } = useI18n();

    return (
        <View style={styles.container}>
            {/* Brand Section */}
            <View style={styles.section}>
                <Text variant="headlineSmall" style={styles.brandTitle}>
                    Rentany
                </Text>
                <Text variant="bodyMedium" style={styles.description}>
                    {t('footer.description')}
                </Text>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t('footer.legal')}
                </Text>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>{t('footer.privacyPolicy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>{t('footer.termsAndConditions')}</Text>
                </TouchableOpacity>
            </View>

            {/* Contact Us Section */}
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t('footer.contactUs')}
                </Text>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="email-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>support@rentany.com</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>legal@rentany.com</Text>
                </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Copyright */}
            <Text style={styles.copyrightText}>
                {t('footer.copyright', { year: 2026 })}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#0F172A', // Deep Navy / Slate-900
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    brandTitle: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: typography.headline,
        marginBottom: 12,
    },
    description: {
        color: '#9CA3AF', // Cool gray
        fontSize: typography.label,
        lineHeight: 24,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: typography.sectionTitle,
        marginBottom: 16,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    linkText: {
        color: '#D1D5DB', // Slightly brighter gray for links
        fontSize: typography.label,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155', // Slate-700
        marginVertical: 16,
    },
    copyrightText: {
        color: '#64748B', // Slate-500
        textAlign: 'center',
        fontSize: typography.caption,
        marginTop: 16,
    },
});
