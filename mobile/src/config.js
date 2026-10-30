// URL base de la API (backend Node.js + Express).
//
//  - Celular físico con Expo Go + backend en tu PC: usa la IP local de tu PC,
//    por ejemplo 'http://192.168.1.50:3000' (celular y PC en la misma red WiFi).
//  - Emulador de Android: 'http://10.0.2.2:3000'
//  - Backend desplegado (Render, Railway...): 'https://tu-api.onrender.com'
//
// También puedes definirla con la variable EXPO_PUBLIC_API_URL (archivo .env).
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://app-camiones.onrender.com';
