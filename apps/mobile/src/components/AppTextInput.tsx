import { Text, TextInput, View, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface AppTextInputProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  error?: string;
}

export function AppTextInput(props: AppTextInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        multiline={props.multiline}
        style={[styles.input, props.multiline ? styles.multiline : undefined, props.error ? styles.inputError : undefined]}
        placeholderTextColor={theme.colors.secondaryText}
      />
      {props.error ? <Text style={styles.error}>{props.error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.xs },
  label: { color: theme.colors.charcoal, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.softRose,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.charcoal,
    backgroundColor: '#FFFFFF'
  },
  multiline: { minHeight: 112, textAlignVertical: 'top', paddingTop: theme.spacing.md },
  inputError: { borderColor: theme.colors.error },
  error: { color: theme.colors.error }
});
