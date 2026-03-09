import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { typography } from '../../theme';

interface Testimonial {
    id: string;
    rating: number;
    text: string;
    user: {
        name: string;
        avatar: string;
        location: string;
        rentedItem: string;
    };
}

const TESTIMONIALS: Testimonial[] = [
    {
        id: '1',
        rating: 5,
        text: '"Saved so much money renting a pressure washer for the weekend instead of buying one. The owner was super helpful!"',
        user: {
            name: 'Sarah M.',
            avatar: 'https://i.pravatar.cc/150?img=5',
            location: 'London',
            rentedItem: 'Pressure Washer'
        }
    },
    {
        id: '2',
        rating: 5,
        text: '"I rent out my camera equipment when I\'m not using it. Great extra income and the platform handles everything securely."',
        user: {
            name: 'David K.',
            avatar: 'https://i.pravatar.cc/150?img=11',
            location: 'Manchester',
            rentedItem: 'Sony A7III Camera'
        }
    },
    {
        id: '3',
        rating: 5,
        text: '"Needed a drill just for one afternoon to hang some shelves. Found one two streets away for almost nothing."',
        user: {
            name: 'Emma W.',
            avatar: 'https://i.pravatar.cc/150?img=9',
            location: 'Birmingham',
            rentedItem: 'Power Drill'
        }
    }
];

export const Testimonials = () => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text variant="titleLarge" style={styles.title}>
                    What Our Users Say
                </Text>
                <Text variant="bodyMedium" style={styles.subtitle}>
                    Join thousands of happy renters and owners in your community
                </Text>
            </View>

            <View style={styles.listContainer}>
                {TESTIMONIALS.map((testimonial) => (
                    <View key={testimonial.id} style={styles.card}>
                        {/* Header Row: Stars and Quote Icon */}
                        <View style={styles.cardHeader}>
                            <View style={styles.starsRow}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <MaterialCommunityIcons key={star} name="star" size={24} color="#FBBF24" /> // Gold star
                                ))}
                            </View>
                            <MaterialCommunityIcons name="format-quote-open" size={48} color="#E5E7EB" style={styles.quoteIcon} />
                        </View>

                        {/* Review Text */}
                        <Text variant="bodyLarge" style={styles.reviewText}>
                            {testimonial.text}
                        </Text>

                        {/* User Profile */}
                        <View style={styles.userProfile}>
                            <Image source={{ uri: testimonial.user.avatar }} style={styles.avatar} />
                            <View style={styles.userInfo}>
                                <Text variant="titleMedium" style={styles.userName}>
                                    {testimonial.user.name}
                                </Text>
                                <Text variant="bodySmall" style={styles.userDetails}>
                                    {testimonial.user.location} • {testimonial.user.rentedItem}
                                </Text>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 40,
        backgroundColor: '#FFFFFF', // Keep it clean white
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
        marginBottom: 12,
    },
    subtitle: {
        color: '#6B7280',
        textAlign: 'center',
        fontSize: typography.label,
        lineHeight: 22,
    },
    listContainer: {
        gap: 20,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    starsRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 8,
    },
    quoteIcon: {
        marginTop: -8,
        marginRight: -8,
    },
    reviewText: {
        color: '#4B5563',
        fontSize: typography.tabLabel,
        lineHeight: 26,
        marginBottom: 24,
    },
    userProfile: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E5E7EB',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        color: '#111827',
        fontWeight: '700',
        fontSize: typography.tabLabel,
        marginBottom: 2,
    },
    userDetails: {
        color: '#6B7280',
        fontSize: typography.caption,
    },
});
