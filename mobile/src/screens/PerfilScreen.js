import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { API_URL } from '../config';
import { colors, spacing } from '../theme';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const esSupervisor = user.rol === 'supervisor';

  const confirmarSalida = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={34} color={colors.amber} />
        </View>
        <Text style={styles.name}>{user.nombre}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Badge
          label={esSupervisor ? 'SUPERVISOR' : 'INSPECTOR'}
          fg={esSupervisor ? colors.info : colors.success}
          bg={esSupervisor ? colors.infoBg : colors.successBg}
          style={{ marginTop: 10 }}
        />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Qué puedes hacer</Text>
        <Text style={styles.cardText}>
          {esSupervisor
            ? 'Agendar inspecciones asignando un inspector, revisar el historial completo con sus notas y evidencias, y cancelar inspecciones pendientes.'
            : 'Realizar las inspecciones que te asignen, adjuntar evidencia fotográfica de las fallas y consultar tu historial.'}
        </Text>
      </Card>

      <Text style={styles.server}>Servidor: {API_URL}</Text>

      <Button title="Cerrar sesión" variant="danger" icon="log-out-outline" onPress={confirmarSalida} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  name: { fontSize: 20, fontWeight: '800', color: colors.ink },
  email: { fontSize: 13.5, color: colors.muted, marginTop: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textSoft, marginBottom: 6 },
  cardText: { fontSize: 13.5, color: colors.textSoft, lineHeight: 20 },
  server: { fontSize: 11.5, color: colors.muted, textAlign: 'center', marginTop: spacing.md },
});
