# Kamux Media Service - Motor Híbrido Multiproyecto 📡📻

Microservicio especializado de alto rendimiento desarrollado sobre Node.js y Express, encargado de la resolución inteligente de metadatos comerciales de estudio, inyección de portadas en alta definición y balanceo de carga dinámico entre múltiples proyectos independientes de la API de YouTube.

---

## 🚀 Arquitectura Inmortal y Balanceo en Caliente

El servicio opera en el puerto `5001` y actúa como el motor de datos multimedia de la plataforma Kamux, implementando una arquitectura de tolerancia a fallos diseñada para maximizar los límites de cuota gratuitos de Google Cloud:

**Flujo:** Kamux Backend (NestJS / Puerto 4000) ➔ Motor Híbrido (Express / Puerto 5001) ➔ Catálogo Last.fm (Metadata de Estudio) ➔ Pool de API Keys (YouTube v3 / Inyección HD)

### 🔄 Algoritmo de Rotación Síncrona Agresiva

El núcleo del servicio lee dinámicamente un pool masivo de llaves distribuidas en múltiples cuentas de desarrollo. Cuando una API Key agota sus 10,000 puntos diarios o es bloqueada, el sistema la marca en caliente como inutilizable en el mismo milisegundo y ejecuta un reintento síncrono saltando al siguiente índice vivo mediante un bucle `for` continuo (`continue;`), garantizando un servicio inmortal libre de caídas (Error 403).

---

## 🏗️ Características Principales

- **Búsqueda Inversa Premium (`/search`):** Realiza la consulta inicial en el catálogo comercial de Last.fm para amarrar metadatos limpios de estudio. En paralelo (`Promise.all`), utiliza el pool de llaves para inyectar los IDs y portadas HD de YouTube en los 15 resultados en tiempo real.
- **Radio Contextual Limpia (`/related`):** Genera colas infinitas de reproducción enviando metadatos estructurados a Last.fm. Al recibir artistas y pistas reales de catálogo, la radio responde con un éxito del 100%, eliminando el bug de colas vacías con 0 tracks.
- **Resolver de Enlaces Bajo Demanda (`/resolve-id`):** Implementa carga controlada (_Lazy Loading_) para resolver de forma asíncrona el ID de transmisión y miniatura HD de las canciones entrantes de la radio justo antes de reproducirse, optimizando drásticamente el consumo de cuota diaria.
- **Monitoreo de Salud Inteligente (`/health`):** Endpoint de telemetría que expone en tiempo real el estado del microservicio, el índice de la llave activa en memoria y la cantidad total de proyectos cargados desde el entorno.

---

## ⚙️ Configuración del Entorno (Variables de Entorno)

El servicio detecta de forma automática y vertical todas las llaves configuradas. Crea tu archivo `.env` en la raíz del microservicio estructurando tus llaves de la siguiente manera:

```env
PORT=5001
LASTFM_API_KEY=be2e3cdcfd556decfa03abe4fd3d0bd9

# POOL MULTIPROYECTO MASIVO (10,000 puntos diarios por cada llave en línea)
GOOGLE_API_KEY_1=AIzaSyAglCSlwVM9M2zwqzNhhtUnz_...
GOOGLE_API_KEY_2=AIzaSyBrPkyZRivFngaSKnRg8wu3nt...
# ... Agrega consecutivamente todas las llaves que requieras escalar
GOOGLE_API_KEY_12=AIzaSyC6_nrlUbiw2iIJRLsP34YOw...
```

---

## 🛠️ Comandos de Desarrollo y Mantenimiento

### Instalar Dependencias Locales

Descarga e instala los módulos base del entorno (Express, Google APIs y Dotenv) ejecutando:

- `npm install`

### Levantar en Entorno de Desarrollo

Para inicializar el motor multimedia localmente con salida de logs directa en tu terminal ejecuta:

- `node server-hybrid.js`

### Despliegue Permanente en Producción (VPS con PM2)

Para inyectar el servicio en el administrador de procesos en segundo plano y monitorear la telemetría de rotación en vivo ejecuta:

- `pm2 start server-hybrid.js --name kamux-hybrid`
- `pm2 logs kamux-hybrid`
- `curl -s http://localhost:5001/health`

---

_Desarrollado como parte del proyecto de arquitectura de sistemas para Kamux Music Platform._
