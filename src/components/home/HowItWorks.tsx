import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useI18n } from '../../i18n';
import { typography } from '../../theme';

interface Step {
    id: number;
    title: string;
    description: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconBg: string;
}

export const HowItWorks = () => {
    const { t } = useI18n();
    const steps: Step[] = [
        {
            id: 1,
            title: t('home.howItWorks.step1Title'),
            description: t('home.howItWorks.step1Description'),
            icon: 'magnify',
            iconBg: '#3B82F6',
        },
        {
            id: 2,
            title: t('home.howItWorks.step2Title'),
            description: t('home.howItWorks.step2Description'),
            icon: 'chat-outline',
            iconBg: '#A855F7',
        },
        {
            id: 3,
            title: t('home.howItWorks.step3Title'),
            description: t('home.howItWorks.step3Description'),
            icon: 'credit-card-outline',
            iconBg: '#22C55E',
        },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>
                    {t('home.howItWorks.title')}
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    {t('home.howItWorks.subtitle')}
                </Text>
            </View>

            {/* Steps List */}
            <View style={styles.stepsContainer}>
                {steps.map((step) => (
                    <View key={step.id} style={styles.stepCardWrapper}>
                        {/* Number Badge (floating) */}
                        <View style={styles.numberBadge}>
                            <Text style={styles.numberText}>{step.id}</Text>
                        </View>

                        {/* Main Card */}
                        <View style={styles.stepCard}>
                            <View style={[styles.iconContainer, { backgroundColor: step.iconBg }]}>
                                <MaterialCommunityIcons name={step.icon} size={28} color="#FFFFFF" />
                            </View>
                            <Text variant="titleMedium" style={styles.stepTitle}>
                                {step.title}
                            </Text>
                            <Text variant="bodyMedium" style={styles.stepDescription}>
                                {step.description}
                            </Text>
                        </View>
                    </View>
                ))}
                {/* Step 4 custom to match the screenshot text */}
                <View style={styles.stepCardWrapper}>
                    <View style={styles.numberBadge}>
                        <Text style={styles.numberText}>4</Text>
                    </View>
                    <View style={styles.stepCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F97316' }]}>
                            <MaterialCommunityIcons name="package-variant-closed" size={28} color="#FFFFFF" />
                        </View>
                        <Text variant="titleMedium" style={styles.stepTitle}>
                            {t('home.howItWorks.step4Title')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.stepDescription}>
                            {t('home.howItWorks.step4Description')}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 32,
        backgroundColor: '#FAFAFA', // Slight off-white to match Search & Filter section
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    title: {
        color: '#111827',
        fontWeight: '700',
        fontSize: typography.headline,
        marginBottom: 8,
    },
    subtitle: {
        color: '#6B7280',
        textAlign: 'center',
        fontSize: typography.label,
        lineHeight: 22,
    },
    stepsContainer: {
        gap: 16,
        paddingLeft: 12, // Leave room for the left-hanging number badges
    },
    stepCardWrapper: {
        position: 'relative',
        marginBottom: 8,
    },
    numberBadge: {
        position: 'absolute',
        left: -12,
        top: -12,
        backgroundColor: '#111827', // Dark slate
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: 2,
        borderColor: '#FFFFFF', // Creates the cutout effect
    },
    numberText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: typography.caption,
    },
    stepCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6', // Very subtle border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    stepTitle: {
        color: '#111827',
        fontWeight: '700',
        fontSize: typography.sectionTitle,
        marginBottom: 8,
    },
    stepDescription: {
        color: '#6B7280',
        fontSize: typography.body,
        lineHeight: 22,
    },
});
