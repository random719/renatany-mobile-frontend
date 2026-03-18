import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import { useUIStore } from '../../store/uiStore';
import { colors, typography } from '../../theme';
import { RootStackParamList } from '../../types/navigation';

interface GlobalHeaderProps {
    onMenuPress?: () => void;
    onNotificationPress?: () => void;
}

export const GlobalHeader = ({ onMenuPress, onNotificationPress }: GlobalHeaderProps) => {
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { language, setLanguage, t } = useI18n();
    const [menuVisible, setMenuVisible] = useState(false);

    const handleBellPress = onNotificationPress ?? (() => navigation.navigate('Notifications'));
    const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language);

    return (
        <View style={styles.topHeader}>
            <TouchableOpacity
                style={styles.iconButton}
                onPress={onMenuPress || toggleSidebar}
            >
                <MaterialCommunityIcons name="menu" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchorPosition="bottom"
                contentStyle={styles.languageMenu}
                anchor={(
                    <TouchableOpacity style={styles.languageSelector} onPress={() => setMenuVisible(true)}>
                        <MaterialCommunityIcons name="earth" size={20} color={colors.textPrimary} />
                        <Text style={styles.languageText}>
                            {currentLanguage ? `${currentLanguage.code} ${currentLanguage.label}` : t('header.loading')}
                        </Text>
                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                )}
            >
                {LANGUAGE_OPTIONS.map((option) => (
                    <Menu.Item
                        key={option.value}
                        onPress={() => {
                            setLanguage(option.value);
                            setMenuVisible(false);
                        }}
                        title={`${option.code}  ${option.label}`}
                        titleStyle={option.value === language ? styles.languageMenuItemActive : undefined}
                    />
                ))}
            </Menu>
            <TouchableOpacity style={styles.iconButton} onPress={handleBellPress}>
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
        borderWidth: 1,
        borderColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    languageText: {
        fontWeight: '600',
        color: '#0F172A',
    },
    languageMenu: {
        borderRadius: 16,
    },
    languageMenuItemActive: {
        color: colors.primary,
        fontWeight: '700',
    },
});
