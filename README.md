# InspecCamión

Sistema de inspección técnica de camiones. Proyecto del Taller de Aplicaciones Móviles (Electivo III), UCM.

- **Backend** (raíz del repositorio): API REST en Node.js + Express con PostgreSQL. Desplegada en https://app-camiones.onrender.com (el plan gratuito puede tardar hasta 1 minuto en despertar; abrir `/health` antes de usar).
- **App móvil** (carpeta `mobile/`): React Native + Expo (Expo Go), React Navigation, JWT con expo-secure-store, expo-image-picker.

## Funcionalidades

- Login con dos roles: Inspector y Supervisor
- Checklist de 16 ítems con niveles de criticidad, nota y resultado automáticos
- Evidencia fotográfica obligatoria en cada falla
- Historial y detalle de inspecciones
- Supervisor: filtros, búsqueda por patente, agendar y cancelar inspecciones

## Ejecutar la app móvil

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go. La dirección de la API está en `mobile/src/config.js`.

## Ejecutar el backend (opcional, ya está desplegado)

```bash
npm install
cp .env.example .env    # completar DATABASE_URL y JWT_SECRET
npm run seed
npm start
```

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Inspector | inspector1@inspeccamion.cl | inspector123 |
| Supervisor | supervisor@inspeccamion.cl | supervisor123 |
