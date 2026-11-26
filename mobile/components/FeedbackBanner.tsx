import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info, CheckCircle, AlertTriangle, X } from 'lucide-react-native';
import { Colors, Radii, Spacing, Typography } from '../constants/theme';

export type BannerType = 'info' | 'success' | 'warning' | 'error';

interface FeedbackBannerProps {
  type?: BannerType;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function FeedbackBanner({
  type = 'info',
  message,
  actionText,
  onAction,
  onDismiss,
}: FeedbackBannerProps) {
  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'rgba(46, 196, 182, 0.15)',
          border: 'rgba(46, 196, 182, 0.4)',
          text: Colors.teal,
          icon: <CheckCircle size={18} color={Colors.teal} />,
        };
      case 'warning':
        return {
          bg: 'rgba(244, 196, 48, 0.15)',
          border: 'rgba(244, 196, 48, 0.4)',
          text: Colors.ruler,
          icon: <AlertTriangle size={18} color={Colors.ruler} />,
        };
      case 'error':
        return {
          bg: 'rgba(230, 57, 70, 0.15)',
          border: 'rgba(230, 57, 70, 0.4)',
          text: Colors.cut,
          icon: <AlertTriangle size={18} color={Colors.cut} />,
        };
      default:
        return {
          bg: 'rgba(59, 120, 240, 0.15)',
          border: 'rgba(59, 120, 240, 0.4)',
          text: Colors.fold,
          icon: <Info size={18} color={Colors.fold} />,
        };
    }
  };

  const current = getColors();

  return (
    <View style={[styles.container, { backgroundColor: current.bg, borderColor: current.border }]}>
      <View style={styles.leftRow}>
        {current.icon}
        <Text style={[styles.messageText, { color: current.text }]}>{message}</Text>
      </View>

      <View style={styles.rightRow}>
        {actionText && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: current.text }]}>{actionText}</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <X size={16} color={current.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginVertical: Spacing.xs,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  messageText: {
    ...Typography.body,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 2,
  },
});
