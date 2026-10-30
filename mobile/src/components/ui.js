import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, mono, radius, spacing } from '../theme';
import { formatPatente } from '../utils';

// ---------------------------------------------------------------- Button
export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style }) {
  const v = buttonVariants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.85 },
        inactive && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.btnText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.amber, fg: colors.ink, border: colors.amber },
  secondary: { bg: '#E2E6EA', fg: colors.ink, border: '#E2E6EA' },
  outline: { bg: 'transparent', fg: colors.textSoft, border: colors.borderStrong },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBg },
};

// ---------------------------------------------------------------- Field
export const Field = React.forwardRef(function Field({ label, error, style, inputStyle, ...props }, ref) {
  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          styles.input,
          props.multiline && { minHeight: 76, textAlignVertical: 'top' },
          error && { borderColor: colors.danger },
          inputStyle,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

// ---------------------------------------------------------------- Badge / Plate
export function Badge({ label, fg, bg, style }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function Plate({ patente }) {
  return (
    <View style={styles.plate}>
      <Text style={styles.plateText}>{formatPatente(patente)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Card
export function Card({ children, onPress, style }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Chip
export function Chip({ label, selected, onPress, disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, selected && styles.chipSelected, disabled && { opacity: 0.4 }, style]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

// ---------------------------------------------------------------- Estados de pantalla
export function Loading({ text = 'Cargando…' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.ink} />
      <Text style={styles.centerText}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'clipboard-outline', title, text }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={46} color={colors.borderStrong} />
      <Text style={styles.centerTitle}>{title}</Text>
      {text ? <Text style={styles.centerText}>{text}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={46} color={colors.danger} />
      <Text style={styles.centerTitle}>No se pudo cargar</Text>
      <Text style={styles.centerText}>{message}</Text>
      {onRetry ? <Button title="Reintentar" variant="secondary" onPress={onRetry} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, borderWidth: 1.5, paddingVertical: 15, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },

  label: { fontSize: 12.5, fontWeight: '700', color: colors.textSoft, marginBottom: 6, letterSpacing: 0.3 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  fieldError: { color: colors.danger, fontSize: 12.5, marginTop: 5 },

  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  plate: { backgroundColor: colors.ink, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  plateText: { color: '#F7F8FA', fontFamily: mono, fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: spacing.md },

  chip: { borderWidth: 1.5, borderColor: colors.borderStrong, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: '#fff' },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSoft, marginBottom: spacing.sm, marginTop: spacing.sm, letterSpacing: 0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  centerTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  centerText: { fontSize: 13.5, color: colors.muted, marginTop: 6, textAlign: 'center' },
});
