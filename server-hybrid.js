require("dotenv").config(); // 🛡️ Inicialización del entorno seguro
const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = 5001;

// 🚀 POOL DINÁMICO AUTOMÁTICO: Filtra y carga todas las llaves GOOGLE_API_KEY_ del .env
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
  currentKeyIndex = (currentKeyIndex + 1) % googleApiKeys.length;
  console.log(
    `🔄 [API Pool] Alerta de Cuota. Rotando automáticamente a la API Key índice: ${currentKeyIndex}`,
  );
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Motor Híbrido Multillave Inmortal de Kamux en línea",
    active_key_index: currentKeyIndex,
    total_keys_loaded: googleApiKeys.length,
    keys_configured: googleApiKeys.length > 0,
  });
});

// 🔍 1. ENDPOINT DE BÚSQUEDA NATIVO (Portadas HD oficiales con salto de cuota inmediato y garantizado)
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res
      .status(400)
      .json({ error: "Falta el parámetro de búsqueda (q)" });
  }

  console.log(
    `🎵 [Kamux Search] Buscando de forma nativa en YouTube para: "${q}"`,
  );

  // Bucle síncrono controlado sobre el pool de llaves
  for (let pases = 0; pases < googleApiKeys.length; pases++) {
    try {
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
        `✅ [Kamux Search] Resultados HD obtenidos con éxito. Enviando ${tracks.length} canciones.`,
      );
      return res.json(tracks); // Corta la ejecución y responde al cliente de NestJS con éxito
    } catch (error) {
      const isQuotaError =
        error.statusCode === 403 ||
        (error.errors && error.errors[0]?.domain === "usageLimits");

      if (isQuotaError) {
        console.warn(
          `⚠️ [Pool Búsqueda] API Key índice ${currentKeyIndex} sin cuota.`,
        );
        rotateYouTubeKey();
        console.log(
          `🔄 [Reintento Inmediato] Evaluando con siguiente llave índice: ${currentKeyIndex}`,
        );
        continue; // 🛡️ SEGURO: Salta al siguiente pase del bucle 'for' usando el nuevo índice en caliente
      } else {
        console.error(
          "🚨 Error de conexión o comunicación con YouTube API en búsqueda:",
          error.message,
        );
        return res
          .status(500)
          .json({
            error: "Error interno al conectar con el catálogo multimedia",
          });
      }
    }
  }

  // Si el flujo del código sale del bucle for, significa que recorrió todas las llaves y todas fallaron
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
      `📻 [Kamux Intel] Pidiendo a Last.fm canciones similares a: ${artist} - ${track}`,
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

    console.log(`✅ [Kamux Radio] Mix contextual devuelto desde Last.fm.`);
    return res.json(recommendations);
  } catch (error) {
    console.error(
      "🚨 Error crítico en el motor híbrido de la radio:",
      error.message,
    );
    return res
      .status(500)
      .json({ error: "No se pudo procesar la radio musical" });
  }
});

// 🎯 3. RESOLVER DE ENLACES BAJO DEMANDA (Portadas HD oficiales en background con continue garantizado)
app.get("/resolve-id", async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res
      .status(400)
      .json({ error: "Faltan artist o track para resolver el enlace" });
  }

  for (let pases = 0; pases < googleApiKeys.length; pases++) {
    try {
      console.log(
        `🔍 [Pool Google] Resolviendo ID para: ${artist} - ${track} (Key Index: ${currentKeyIndex})`,
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
        return res.json({ youtube_id: "", thumbnail: "" });
      }

      return res.json({
        youtube_id: firstResult.id.videoId,
        thumbnail:
          firstResult.snippet.thumbnails?.high?.url ||
          firstResult.snippet.thumbnails?.default?.url ||
          "",
      });
    } catch (ytError) {
      const isQuotaError =
        ytError.statusCode === 403 ||
        (ytError.errors && ytError.errors[0]?.domain === "usageLimits");

      if (isQuotaError) {
        console.warn(
          `⚠️ [Pool Resolver] API Key índice ${currentKeyIndex} reportó cuota agotada.`,
        );
        rotateYouTubeKey();
        console.log(
          `🔄 [Reintento Inmediato] Evaluando con siguiente llave índice: ${currentKeyIndex}`,
        );
        continue; // 🛡️ SEGURO: Salta al siguiente pase del bucle 'for' usando el nuevo índice en caliente
      } else {
        console.error(
          `🚨 Error grave de comunicación con YouTube API:`,
          ytError.message,
        );
        return res
          .status(500)
          .json({
            error: "Error interactuando con el proveedor de video externo",
          });
      }
    }
  }

  return res
    .status(403)
    .json({
      error:
        "Todas las API Keys del pool masivo se encuentran agotadas por hoy.",
    });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Motor Multillave Inmortal de Producción corriendo en el puerto ${PORT}`,
  );
});
