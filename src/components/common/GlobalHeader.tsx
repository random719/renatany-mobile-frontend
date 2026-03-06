import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../../theme';

interface GlobalHeaderProps {
    onMenuPress?: () => void;
    onNotificationPress?: () => void;
}

export const GlobalHeader = ({ onMenuPress, onNotificationPress }: GlobalHeaderProps) => {
    return (
        <View style={styles.topHeader}>
            <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
                <MaterialCommunityIcons name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.languageSelector}>
                <MaterialCommunityIcons name="earth" size={20} color={colors.textPrimary} />
                <Text style={styles.languageText}>GB English</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={onNotificationPress}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 56,
        paddingBottom: 16,
        // marginTop: 36,
        backgroundColor: '#FFFFFF',
        // height: 100,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    languageText: {
        fontWeight: '600',
        color: '#0F172A',
    },
});
