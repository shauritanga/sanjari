import { EyeIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, type KeyboardTypeOptions } from 'react-native';
import { AppIcon } from './AppIcon';
import { useAppTheme } from '../theme/useAppTheme';

interface AppTextInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function AppTextInput(props: AppTextInputProps) {
  const { colors, radius, spacing, typography } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const isPassword = props.secureTextEntry ?? false;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{props.label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          secureTextEntry={isPassword && !visible}
          placeholder={props.placeholder}
          multiline={props.multiline}
          maxLength={props.maxLength}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
          style={[
            styles.input,
            {
              borderRadius: radius.md,
              borderColor: props.error ? colors.error : colors.border,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.md,
              paddingRight: isPassword ? 44 : spacing.md,
              fontSize: typography.body.fontSize,
              minHeight: props.multiline ? 110 : 52,
              textAlignVertical: props.multiline ? 'top' : 'center',
              paddingTop: props.multiline ? spacing.sm : 0
            }
          ]}
          placeholderTextColor={colors.textSecondary}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            onPress={() => setVisible((current) => !current)}
            style={styles.toggle}
            hitSlop={8}
          >
            <AppIcon icon={visible ? ViewOffIcon : EyeIcon} color={colors.textSecondary} size={20} />
          </Pressable>
        ) : null}
      </View>
      {props.maxLength ? (
        <Text style={[styles.counter, { color: colors.textSecondary }]}>
          {props.value.length}/{props.maxLength}
        </Text>
      ) : null}
      {props.error ? <Text style={[styles.error, { color: colors.error }]}>{props.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '600' },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: { borderWidth: 1 },
  toggle: { position: 'absolute', right: 12, height: 44, width: 32, alignItems: 'center', justifyContent: 'center' },
  counter: { fontSize: 12, textAlign: 'right' },
  error: { fontSize: 13 }
});
