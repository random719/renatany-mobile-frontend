import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

interface Step {
    id: number;
    title: string;
    description: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconBg: string;
}

const STEPS: Step[] = [
    {
        id: 1,
        title: 'Find What You Need',
        description: 'Browse thousands of items from your neighbors - tools, electronics, sports gear, and more.',
        icon: 'magnify',
        iconBg: '#3B82F6', // Blue
    },
    {
        id: 2,
        title: 'Connect with Owner',
        description: 'Send a rental request and chat directly with the item owner to arrange details.',
        icon: 'chat-outline',
        iconBg: '#A855F7', // Purple
    },
    {
        id: 3,
        title: 'Pay Securely',
        description: 'Book with confidence using our secure payment system with deposit protection.',
        icon: 'credit-card-outline',
        iconBg: '#22C55E', // Green
    },
];

export const HowItWorks = () => {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text variant="headlineSmall" style={styles.title}>
                    How It Works
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    Rent anything in 4 simple steps. No commitments, no hassle.
                </Text>
            </View>

            {/* Steps List */}
            <View style={styles.stepsContainer}>
                {STEPS.map((step) => (
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
                            Pick Up & Return
                        </Text>
                        <Text variant="bodyMedium" style={styles.stepDescription}>
                            Collect your item, use it, and return it when done. Leave a review!
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
        fontSize: 24,
        marginBottom: 8,
    },
    subtitle: {
        color: '#6B7280',
        textAlign: 'center',
        fontSize: 15,
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
        fontSize: 13,
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
        fontSize: 18,
        marginBottom: 8,
    },
    stepDescription: {
        color: '#6B7280',
        fontSize: 14,
        lineHeight: 22,
    },
});
