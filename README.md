# Kamux Media Service 🔒🎵

Microservicio dedicado y desacoplado para la interacción nativa con la infraestructura de YouTube. Encapsula las búsquedas de catálogo y la extracción limpia de streams binarios de audio, evadiendo las restricciones de red corporativas en la nube mediante enmascaramiento residencial.

## 🛠️ Arquitectura y Red
Este servicio actúa como un proxy intermedio. Redirige las peticiones pesadas de extracción multimedia ejecutando de forma nativa el binario de **yt-dlp** a través del proxy local de Cloudflare WARP para asegurar una alta disponibilidad permanente sin depender de cookies manuales que caducan.

* **Flujo:** Kamux Backend (NestJS) ➔ Media Service (Express) ➔ yt-dlp Core + SOCKS5 (Port 40000) ➔ Cloudflare ➔ YouTube

## 🚀 Características
- **Aislamiento de Carga:** NestJS delega la ejecución de subprocesos binarios pesados, manteniendo el backend principal libre de sobrecarga.
- **Inmunidad Antibots:** Consumo enmascarado para evitar bloqueos por direcciones IP de Centros de Datos (Oracle Cloud).
- **Formatos Optimizados:** Extracción directa del contenedor Opus/WebM (itag 251) para tus audífonos de alta fidelidad.

## 🔌 Endpoints Disponibles
El microservicio opera internamente en el puerto `5000` de la instancia.

### 1. Búsqueda de Catálogo
- **Ruta:** `GET /search`
- **Query Params:** `?query=nombre_del_track`
- **Descripción:** Retorna un arreglo estructurado de hasta 10 tracks normalizados desde la librería youtubei.js en modo WEB.

### 2. Extracción de Streaming
- **Ruta:** `GET /stream-url/:youtube_id`
- **Descripción:** Ejecuta el núcleo de `yt-dlp` a través del túnel SOCKS5 y descifra la URL directa firmada por Google (googlevideo.com).

## 🐳 Despliegue en Producción
Operado permanentemente en segundo plano mediante PM2:
* pm2 start server.js --name kamux-media-service
