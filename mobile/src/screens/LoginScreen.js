import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Field } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { colors, spacing } from '../theme';

const DEMO = {
  inspector: { email: 'inspector1@inspeccamion.cl', password: 'inspector123' },
  supervisor: { email: 'supervisor@inspeccamion.cl', password: 'supervisor123' },
};

export default function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async () => {
    if (loading) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const fillDemo = (rol) => {
    setEmail(DEMO[rol].email);
    setPassword(DEMO[rol].password);
    setError(null);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="car-outline" size={34} color={colors.amber} />
          </View>
          <Text style={styles.title}>InspecCamión</Text>
          <Text style={styles.subtitle}>Ingresa con tu cuenta asignada</Text>
        </View>

        <Field
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          placeholder="inspector@empresa.cl"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <View>
          <Field
            ref={passwordRef}
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPass}
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
            inputStyle={{ paddingRight: 46 }}
          />
          <Pressable onPress={() => setShowPass((v) => !v)} style={styles.eye} hitSlop={10}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button title="Ingresar" onPress={onSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

        <Text style={styles.help}>¿Olvidaste tu contraseña? Contacta a tu supervisor.</Text>

        {__DEV__ ? (
          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Usuarios de prueba (solo en desarrollo)</Text>
            <View style={{ flexDirection: 'row' }}>
              <Chip label="Inspector" onPress={() => fillDemo('inspector')} />
              <Chip label="Supervisor" onPress={() => fillDemo('supervisor')} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 36 },
  logo: { width: 68, height: 68, borderRadius: 20, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 13.5, color: colors.muted, marginTop: 4 },
  eye: { position: 'absolute', right: 14, top: 36 },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, marginBottom: spacing.sm },
  errorText: { flex: 1, marginLeft: 8, color: colors.danger, fontSize: 13.5, fontWeight: '600' },
  help: { textAlign: 'center', fontSize: 12.5, color: colors.muted, marginTop: 18 },
  demo: { marginTop: 32, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  demoTitle: { fontSize: 12, color: colors.muted, marginBottom: 10 },
});
