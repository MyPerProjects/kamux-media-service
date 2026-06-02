const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = 5001; // Puerto alternativo para nuestro laboratorio seguro

// POOL OFICIAL DE API KEYS DE GOOGLE (30,000 puntos diarios iniciales)
const googleApiKeys = [
  "AIzaSyCQsXEEQwfjsDTSdhJiV7qPpWs3RbnAFQ4", // Key 1
  "AIzaSyA2VrCdvlLabsJmEM31_JWnOkp0KMKga6w", // Key 2
  "AIzaSyBHfME2wEQnTNcLDHdoR69NZeRngYhhEfs"  // Key 3
];
let currentKeyIndex = 0;

// CREDENCIALES OFICIALES DE LAST.FM (Inteligencia Musical)
const LASTFM_API_KEY = "be2e3cdcfd556decfa03abe4fd3d0bd9";

// Función inteligente para obtener un cliente de YouTube activo con la llave actual
function getYouTubeClient() {
  const activeKey = googleApiKeys[currentKeyIndex];
  return google.youtube({ version: "v3", auth: activeKey });
}

// Función para rotar de llave automáticamente si Google nos devuelve Error 403 (Quota Exceeded)
function rotateYouTubeKey() {
  currentKeyIndex = (currentKeyIndex + 1) % googleApiKeys.length;
  console.log(`🔄 [API Pool] Alerta de Cuota. Rotando automáticamente a la API Key índice: ${currentKeyIndex}`);
}

// Endpoint de prueba básico para verificar que el servidor híbrido responda
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Laboratorio Híbrido de Kamux en línea", active_key_index: currentKeyIndex });
});

// 🔍 1. ENDPOINT DE BÚSQUEDA OFICIAL (Metadata de Canales y Rotación Automática)
app.get("/search", async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Falta el parámetro de búsqueda (q)" });
  }

  for (let pases = 0; pases < googleApiKeys.length; pases++) {
    try {
      console.log(`🔍 [Kamux API] Buscando: "${q}" usando la API Key índice: ${currentKeyIndex}`);
      const youtube = getYouTubeClient();
      
      const response = await youtube.search.list({
        part: "snippet",
        q: q,
        type: "video",
        maxResults: 15
      });

      const tracks = response.data.items.map(item => ({
        youtube_id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle, 
        thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || ""
      }));

      return res.json(tracks);

    } catch (error) {
      const isQuotaError = error.statusCode === 403 || (error.errors && error.errors[0]?.domain === "usageLimits");
      
      if (isQuotaError) {
        console.warn(`⚠️ [Kamux API] La API Key ${currentKeyIndex} se quedó sin cuota.`);
        rotateYouTubeKey();
        console.log(`🔄 [Kamux API] Reintentando búsqueda con la nueva llave...`);
      } else {
        console.error("🚨 Error grave en la API de YouTube:", error.message);
        return res.status(500).json({ error: "Error interno al conectar con la base de datos de música" });
      }
    }
  }

  res.status(403).json({ error: "Todas las API Keys del pool han agotado su cuota diaria." });
});

// 📻 2. ENDPOINT DE RECOMENDACIONES AVANZADO (Last.fm + Inyección de ID y Miniatura HD de YouTube)
app.get("/related", async (req, res) => {
  const { artist, track } = req.query;

  if (!artist || !track) {
    return res.status(400).json({ error: "Faltan los parámetros obligatorios: artist y track" });
  }

  try {
    console.log(`📻 [Kamux Intel] Pidiendo a Last.fm canciones similares a: ${artist} - ${track}`);

    const baseUrl = "http://ws.audioscrobbler.com/2.0/";
    const params = `?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`;
    const lastFmUrl = baseUrl + params;

    const response = await fetch(lastFmUrl);
    const data = await response.json();

    if (!data.similartracks || !data.similartracks.track) {
      return res.json([]);
    }

    const rawRecommendations = data.similartracks.track.map(item => ({
      title: item.name,
      artist: item.artist.name,
      duration_seconds: item.duration || 180,
      thumbnail: item.image?.[2]?.["#text"] || ""
    }));

    console.log(`🔍 [Kamux I2V] Buscando los IDs y Miniaturas HD de YouTube para las 10 canciones...`);

    // Lanza las 10 búsquedas en YouTube en paralelo a toda velocidad usando tu pool
    const fullTracksWithIds = await Promise.all(
      rawRecommendations.map(async (song) => {
        try {
          const youtube = getYouTubeClient();
          const searchQuery = `${song.artist} - ${song.title}`;

          const ytResponse = await youtube.search.list({
            part: "snippet",
            q: searchQuery,
            type: "video",
            maxResults: 1
          });

          const firstResult = ytResponse.data.items?.[0];

          return {
            ...song,
            youtube_id: firstResult ? firstResult.id.videoId : "",
            // 🎯 OPTIMIZACIÓN: Extrae la carátula real de YouTube y pisa la estrella gris de Last.fm
            thumbnail: firstResult?.snippet?.thumbnails?.high?.url || 
                       firstResult?.snippet?.thumbnails?.default?.url || 
                       song.thumbnail
          };
        } catch (ytError) {
          console.error(`⚠️ Error buscando ID/Thumbnail para ${song.artist} - ${song.title}:`, ytError.message);
          return { ...song, youtube_id: "", thumbnail: song.thumbnail };
        }
      })
    );

    // Filtramos las canciones que por algún motivo raro no consiguieron ID de video
    const cleanTracks = fullTracksWithIds.filter(track => track.youtube_id !== "");

    console.log(`✅ [Kamux Core] Cola de radio procesada exitosamente con miniaturas reales.`);
    return res.json(cleanTracks);

  } catch (error) {
    console.error("🚨 Error crítico en el motor híbrido de la radio:", error.message);
    return res.status(500).json({ error: "No se pudo procesar la radio musical" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Laboratorio seguro [Kamux Hybrid Core] corriendo en el puerto ${PORT}`);
});
