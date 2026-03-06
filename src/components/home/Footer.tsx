import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';

export const Footer = () => {
    return (
        <View style={styles.container}>
            {/* Brand Section */}
            <View style={styles.section}>
                <Text variant="headlineSmall" style={styles.brandTitle}>
                    Rentany
                </Text>
                <Text variant="bodyMedium" style={styles.description}>
                    Rent anything, from anyone. Your trusted peer-to-peer rental marketplace.
                </Text>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Legal
                </Text>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="shield-check-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={18} color="#9CA3AF" />
                    <Text style={styles.linkText}>Terms and Conditions</Text>
                </TouchableOpacity>
            </View>

            {/* Contact Us Section */}
            <View style={styles.section}>
                <Text variant="titleMedium" style={styles.sectionTitle}>
                    Contact Us
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
                © 2026 Rentany. All rights reserved.
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
        fontSize: 24,
        marginBottom: 12,
    },
    description: {
        color: '#9CA3AF', // Cool gray
        fontSize: 15,
        lineHeight: 24,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 18,
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
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155', // Slate-700
        marginVertical: 16,
    },
    copyrightText: {
        color: '#64748B', // Slate-500
        textAlign: 'center',
        fontSize: 13,
        marginTop: 16,
    },
});
