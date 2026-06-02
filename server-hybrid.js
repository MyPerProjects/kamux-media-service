require("dotenv").config(); // 🛡️ Carga el pool seguro desde el .env
const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = 5001;

// 🚀 POOL DINÁMICO AUTOMÁTICO: Filtra y carga todas las llaves del .env
const googleApiKeys = Object.keys(process.env)
  .filter((key) => key.startsWith("GOOGLE_API_KEY_"))
  .map((key) => process.env[key]);

let currentKeyIndex = 0;
const LASTFM_API_KEY = "be2e3cdcfd556decfa03abe4fd3d0bd9";

function getYouTubeClient() {
  const activeKey = googleApiKeys[currentKeyIndex];
  return google.youtube({ version: "v3", auth: activeKey });
}

function rotateYouTubeKey() {
  if (googleApiKeys.length === 0) return;
  const oldIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % googleApiKeys.length;
  console.log(
    `🔄 [POOL ROTACIÓN] Llave índice ${oldIndex} marcada inutilizable. Saltando automáticamente al índice: ${currentKeyIndex}`,
  );
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Motor Híbrido Multillave de Kamux en línea",
    active_key_index: currentKeyIndex,
    total_keys_loaded: googleApiKeys.length,
    keys_configured: googleApiKeys.length > 0,
  });
});

// 🔍 1. ENDPOINT DE BÚSQUEDA NATIVO (Portadas HD con Rotación Agresiva a prueba de balas)
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res
      .status(400)
      .json({ error: "Falta el parámetro de búsqueda (q)" });
  }

  console.log(
    `🔍 [Petición Buscar] Iniciando rastreo nativo en YouTube para: "${q}"`,
  );

  // El bucle for recorrerá secuencialmente el pool buscando una llave viva
  for (let pases = 0; pases < googleApiKeys.length; pases++) {
    try {
      console.log(
        `📡 [Search Intento ${pases + 1}] Evaluando con API Key Índice: ${currentKeyIndex}`,
      );
      const youtube = getYouTubeClient();

      const response = await youtube.search.list({
        part: "snippet",
        q: q,
        type: "video",
        maxResults: 15,
      });

      const tracks = response.data.items.map((item) => ({
        youtube_id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        duration_seconds: 180,
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.default?.url ||
          "",
      }));

      console.log(
        `✅ [Search Éxito] Petición resuelta impecable por la Key Índice: ${currentKeyIndex}. Enviando ${tracks.length} tracks.`,
      );
      return res.json(tracks); // Éxito absoluto, rompe la petición y responde a NestJS
    } catch (error) {
      console.warn(
        `⚠️ [Search Advertencia] La API Key Índice ${currentKeyIndex} falló. Detalle: ${error.message}`,
      );
      rotateYouTubeKey();
      console.log(
        `🔄 [Search Reintento Síncrono] Forzando pase inmediato a la siguiente llave...`,
      );
      continue; // 🛡️ INMORTAL: Salta al siguiente pase del bucle 'for' usando el nuevo índice en caliente
    }
  }

  console.error(
    "🚨 [Search Colapso] Se recorrieron las 10 llaves del pool y todas rechazaron la conexión.",
  );
  return res
    .status(403)
    .json({
      error:
        "Todas las API Keys del pool se encuentran totalmente agotadas por hoy.",
    });
});

// 📻 2. ENDPOINT DE RECOMENDACIONES CONTEXTUAL (Last.fm Directo)
app.get("/related", async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res
      .status(400)
      .json({ error: "Faltan los parámetros obligatorios: artist y track" });
  }

  try {
    console.log(
      `📻 [Radio Intel] Solicitando mix contextual a Last.fm para: ${artist} - ${track}`,
    );
    const lastFmUrl = `http://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${LASTFM_API_KEY}&format=json&limit=10`;

    const response = await fetch(lastFmUrl);
    const data = await response.json();

    if (!data.similartracks || !data.similartracks.track) {
      return res.json([]);
    }

    const recommendations = data.similartracks.track.map((item) => ({
      youtube_id: "",
      title: item.name,
      artist: item.artist.name,
      duration_seconds: item.duration || 180,
      thumbnail: "",
    }));

    console.log(
      `✅ [Radio Éxito] Cola infinita generada de forma limpia. Enviando ${recommendations.length} tracks.`,
    );
    return res.json(recommendations);
  } catch (error) {
    console.error(
      "🚨 [Radio Error] Falla crítica en la API de Last.fm:",
      error.message,
    );
    return res
      .status(500)
      .json({ error: "No se pudo procesar la radio musical" });
  }
});

// 🎯 3. RESOLVER DE ENLACES BAJO DEMANDA (Portadas HD en background con rotación agresiva libre de candados)
app.get("/resolve-id", async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res
      .status(400)
      .json({ error: "Faltan artist o track para resolver el enlace" });
  }

  console.log(
    `🔍 [Petición Resolver] Iniciando emparejamiento asíncrono para: ${artist} - ${track}`,
  );

  for (let pases = 0; pases < googleApiKeys.length; pases++) {
    try {
      console.log(
        `📡 [Resolver Intento ${pases + 1}] Evaluando con API Key Índice: ${currentKeyIndex}`,
      );
      const youtube = getYouTubeClient();
      const searchQuery = `${artist} - ${track}`;

      const ytResponse = await youtube.search.list({
        part: "snippet",
        q: searchQuery,
        type: "video",
        maxResults: 1,
      });

      const firstResult = ytResponse.data.items?.[0];
      if (!firstResult) {
        console.log(
          `⚠️ [Resolver Vacío] YouTube no encontró ningún video que coincida para el track.`,
        );
        return res.json({ youtube_id: "", thumbnail: "" });
      }

      console.log(
        `✅ [Resolver Éxito] ID obtenido con éxito por la Key Índice: ${currentKeyIndex}.`,
      );
      return res.json({
        youtube_id: firstResult.id.videoId,
        thumbnail:
          firstResult.snippet.thumbnails?.high?.url ||
          firstResult.snippet.thumbnails?.default?.url ||
          "",
      });
    } catch (ytError) {
      console.warn(
        `⚠️ [Resolver Advertencia] La API Key Índice ${currentKeyIndex} falló. Detalle: ${ytError.message}`,
      );
      rotateYouTubeKey();
      console.log(
        `🔄 [Resolver Reintento Síncrono] Forzando pase inmediato a la siguiente llave...`,
      );
      continue; // 🛡️ INMORTAL: Salta al siguiente pase del bucle 'for' usando el nuevo índice en caliente
    }
  }

  console.error(
    "🚨 [Resolver Colapso] Se recorrieron las 10 llaves del pool y ninguna pudo resolver el ID.",
  );
  return res
    .status(403)
    .json({
      error:
        "Todas las API Keys del pool masivo se encuentran agotadas por hoy.",
    });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Motor Multillave Inmortal Premium [Puerto ${PORT}] desplegado con telemetría de control.`,
  );
});
