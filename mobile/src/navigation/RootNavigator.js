import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../auth/AuthContext';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import PerfilScreen from '../screens/PerfilScreen';
import DetalleInspeccionScreen from '../screens/DetalleInspeccionScreen';
import HomeInspectorScreen from '../screens/inspector/HomeInspectorScreen';
import ChecklistScreen from '../screens/inspector/ChecklistScreen';
import ResumenScreen from '../screens/inspector/ResumenScreen';
import HistorialScreen from '../screens/inspector/HistorialScreen';
import HomeSupervisorScreen from '../screens/supervisor/HomeSupervisorScreen';
import AgendarScreen from '../screens/supervisor/AgendarScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.ink } };

// Encabezado común a todos los stacks (consistencia visual)
const stackOptions = {
  headerStyle: { backgroundColor: colors.ink },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

// ------------------------------------------------------------ Stacks de cada pestaña
function HoyStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="HomeInspector" component={HomeInspectorScreen} options={{ title: 'Mis inspecciones' }} />
      <Stack.Screen name="Checklist" component={ChecklistScreen} options={{ title: 'Checklist' }} />
      <Stack.Screen name="Resumen" component={ResumenScreen} options={{ title: 'Resumen' }} />
      <Stack.Screen name="Detalle" component={DetalleInspeccionScreen} options={{ title: 'Detalle de inspección' }} />
    </Stack.Navigator>
  );
}

function HistorialStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Historial" component={HistorialScreen} options={{ title: 'Historial' }} />
      <Stack.Screen name="Detalle" component={DetalleInspeccionScreen} options={{ title: 'Detalle de inspección' }} />
    </Stack.Navigator>
  );
}

function InspeccionesStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="HomeSupervisor" component={HomeSupervisorScreen} options={{ title: 'Inspecciones' }} />
      <Stack.Screen name="Detalle" component={DetalleInspeccionScreen} options={{ title: 'Detalle de inspección' }} />
    </Stack.Navigator>
  );
}

function AgendarStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Agendar" component={AgendarScreen} options={{ title: 'Agendar inspección' }} />
    </Stack.Navigator>
  );
}

function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={stackOptions}>
      <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Mi perfil' }} />
    </Stack.Navigator>
  );
}

// ------------------------------------------------------------ Tabs por rol
const tabOptions = (icono) => ({
  headerShown: false,
  tabBarActiveTintColor: colors.ink,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
  tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.border },
  tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? icono : `${icono}-outline`} size={size} color={color} />,
});

function InspectorTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="HoyTab" component={HoyStack} options={{ ...tabOptions('clipboard'), title: 'Hoy' }} />
      <Tab.Screen name="HistorialTab" component={HistorialStack} options={{ ...tabOptions('time'), title: 'Historial' }} />
      <Tab.Screen name="PerfilTab" component={PerfilStack} options={{ ...tabOptions('person-circle'), title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function SupervisorTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="InspeccionesTab" component={InspeccionesStack} options={{ ...tabOptions('list'), title: 'Inspecciones' }} />
      <Tab.Screen name="AgendarTab" component={AgendarStack} options={{ ...tabOptions('calendar'), title: 'Agendar' }} />
      <Tab.Screen name="PerfilTab" component={PerfilStack} options={{ ...tabOptions('person-circle'), title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

// ------------------------------------------------------------ Raíz
export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.amber} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      {!user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      ) : user.rol === 'supervisor' ? (
        <SupervisorTabs />
      ) : (
        <InspectorTabs />
      )}
    </NavigationContainer>
  );
}
