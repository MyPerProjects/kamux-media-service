require("dotenv").config(); // 🛡️ Inicialización obligatoria del lector del archivo .env
const express = require("express");
const { google } = require("googleapis");

const app = express();
const PORT = 5001;

// POOL PROTEGIDO: Carga las 3 nuevas API Keys sin exponerlas en texto plano
const googleApiKeys = [
  process.env.GOOGLE_API_KEY_1,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
];
let currentKeyIndex = 0;

const LASTFM_API_KEY = "be2e3cdcfd556decfa03abe4fd3d0bd9";

function getYouTubeClient() {
  const activeKey = googleApiKeys[currentKeyIndex];
  return google.youtube({ version: "v3", auth: activeKey });
}

function rotateYouTubeKey() {
  currentKeyIndex = (currentKeyIndex + 1) % googleApiKeys.length;
  console.log(
    `🔄 [API Pool] Alerta de Cuota. Rotando automáticamente a la API Key índice: ${currentKeyIndex}`,
  );
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Laboratorio Híbrido de Kamux en línea",
    active_key_index: currentKeyIndex,
    keys_configured: googleApiKeys.every((k) => !!k),
  });
});

// 🔍 1. ENDPOINT DE BÚSQUEDA INVERTIDO (Metadata Pura de Estudio - Gasto de Cuota Google = 0)
app.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res
      .status(400)
      .json({ error: "Falta el parámetro de búsqueda (q)" });
  }

  try {
    console.log(
      `🎵 [Kamux Search] Buscando canciones oficiales para: "${q}" en la base de datos de Last.fm`,
    );
    const lastFmSearchUrl = `http://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(q)}&api_key=${LASTFM_API_KEY}&format=json&limit=15`;

    const response = await fetch(lastFmSearchUrl);
    const data = await response.json();

    if (
      !data.results ||
      !data.results.trackmatches ||
      !data.results.trackmatches.track
    ) {
      return res.json([]);
    }

    // Los resultados viajan limpios de inmediato. El ID de YouTube se resolverá bajo demanda (Lazy Loading)
    const tracks = data.results.trackmatches.track.map((item) => ({
      youtube_id: "",
      title: item.name,
      artist: item.artist,
      duration_seconds: 180,
      thumbnail: item.image?.[2]?.["#text"] || "",
    }));

    console.log(
      `✅ [Kamux Search] Catálogo premium generado con éxito. Enviando ${tracks.length} canciones.`,
    );
    return res.json(tracks);
  } catch (error) {
    console.error(
      "🚨 Error crítico en el motor de búsqueda invertido:",
      error.message,
    );
    return res
      .status(500)
      .json({ error: "No se pudo procesar la búsqueda en este momento" });
  }
});

// 📻 2. ENDPOINT DE RECOMENDACIONES CONTEXTUAL (Mix Oficial sin consultas previas a YouTube)
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
      thumbnail: item.image?.[2]?.["#text"] || "",
    }));

    console.log(
      `✅ [Kamux Core] Cola de radio extendida generada exitosamente desde Last.fm.`,
    );
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

// 🎯 3. RESOLVER DE ENLACES BAJO DEMANDA (Con reintento de rotación síncrona real en el bucle)
app.get("/resolve-id", async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    return res
      .status(400)
      .json({ error: "Faltan artist o track para resolver el enlace" });
  }

  // El bucle garantiza recorrer el pool de llaves de forma ordenada si hay caídas de cuota
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
          `⚠️ [Pool Google] La API Key índice ${currentKeyIndex} reportó cuota agotada.`,
        );
        rotateYouTubeKey();
        console.log(
          `🔄 Reintentando resolución de forma inmediata con el nuevo índice: ${currentKeyIndex}`,
        );
        // Al no poner un return aquí, el bucle for avanza al siguiente pase y reejecuta el bloque try con la nueva llave
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
        "Todas las API Keys del pool seguro se encuentran agotadas por el día de hoy.",
    });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Laboratorio seguro [Kamux Hybrid Core] corriendo de manera ininterrumpida en el puerto ${PORT}`,
  );
});
