import { Text, TextInput, View, StyleSheet, type KeyboardTypeOptions } from 'react-native';
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
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
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
            fontSize: typography.body.fontSize,
            minHeight: props.multiline ? 110 : 52,
            textAlignVertical: props.multiline ? 'top' : 'center',
            paddingTop: props.multiline ? spacing.sm : 0
          }
        ]}
        placeholderTextColor={colors.textSecondary}
      />
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
  input: { borderWidth: 1 },
  counter: { fontSize: 12, textAlign: 'right' },
  error: { fontSize: 13 }
});
