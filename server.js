const express = require("express");
const { spawn } = require("child_process");
const { Innertube } = require("youtubei.js");

const app = express();
const PORT = 5000;

let youtube = null;

// Inicializamos youtubei.js apuntando nativamente al cliente exclusivo de YouTube Music
async function initYouTube() {
  try {
    youtube = await Innertube.create({ client_type: "YTMUSIC" });
    console.log("🔒 [Media Service] Catálogo de YouTube Music inicializado.");
  } catch (error) {
    console.error("🚨 Error en catálogo de búsquedas:", error.message);
  }
}

initYouTube();

// Endpoint 1: Búsqueda de Catálogo Musical Puro utilizando el submódulo nativo de música
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Falta el parámetro query" });

  try {
    if (!youtube) await initYouTube();

    // 🚀 SOLUCIÓN DEFINITIVA: Usamos el buscador nativo del submódulo de música para evitar el error HTTP 400 en la nube
    const searchResults = await youtube.music.search(query, { type: "song" });

    if (
      !searchResults.songs ||
      !searchResults.songs.contents ||
      searchResults.songs.contents.length === 0
    ) {
      return res.json([]);
    }

    // Ampliado a 30 resultados para mayor profundidad de búsqueda
    const tracks = searchResults.songs.contents.slice(0, 30).map((item) => ({
      youtube_id: item.id,
      title: item.title || "Título Desconocido",
      artist: (item.artists && item.artists.length > 0
        ? item.artists[0].name
        : "Artista Desconocido"
      )
        .replace(/\s*-\s*Topic$/i, "")
        .trim(),
      duration_seconds: item.duration?.seconds || 180,
      thumbnail:
        item.thumbnails && item.thumbnails.length > 0
          ? item.thumbnails[item.thumbnails.length - 1].url
          : "",
    }));

    res.json(tracks);
  } catch (error) {
    console.error("🚨 Error en búsqueda YTMUSIC:", error.message);
    res
      .status(500)
      .json({ error: "Error al procesar la búsqueda en YouTube Music" });
  }
});

// Endpoint 3: Extraer la Cola de Recomendaciones Inteligentes (Estilo Algoritmo de Radio)
app.get("/related/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!youtube) await initYouTube();
    console.log(
      `🌐 [YTMUSIC Algoritmo] Extrayendo cola automática para la canción semilla: ${id}`,
    );

    const nextInfo = await youtube.music.getNext(id);

    if (
      !nextInfo ||
      !nextInfo.playlist_panel ||
      !nextInfo.playlist_panel.contents
    ) {
      return res.json([]);
    }

    const relatedTracks = nextInfo.playlist_panel.contents;

    const tracks = relatedTracks
      .filter((item) => item.id && item.title)
      .slice(0, 30)
      .map((item) => ({
        youtube_id: item.id,
        title: item.title || "Título Desconocido",
        artist: (item.artists && item.artists.length > 0
          ? item.artists[0].name
          : "Artista Desconocido"
        )
          .replace(/\s*-\s*Topic$/i, "")
          .trim(),
        duration_seconds: item.duration?.seconds || 180,
        thumbnail:
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "",
      }));

    res.json(tracks);
  } catch (error) {
    console.error(
      `🚨 [YTMUSIC Related Error] Falló el raspado de recomendados para ${id}:`,
      error.message,
    );
    res
      .status(500)
      .json({ error: "No se pudo generar la lista de canciones recomendadas" });
  }
});

// Endpoint 2: Extracción Binaria Nativa Tunelizada por Cloudflare WARP SOCKS5 (Puerto 40000)
app.get("/stream-url/:id", (req, res) => {
  const { id } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  console.log(
    `🌐 [yt-dlp Core] Extrayendo streaming permanente para: ${id} vía SOCKS5:40000`,
  );

  // 🚀 SOLUCIÓN DEFINITIVA: Corregidos los flags de un solo guion a doble guion oficial (--no-playlist, etc.)
  const ytDlpProcess = spawn("yt-dlp", [
    "-f",
    "251",
    "-g",
    "--proxy",
    "socks5://127.0.0.1:40000",
    "--no-playlist",
    "--no-check-certificates",
    "--no-warnings",
    "--legacy-server-connect",
    videoUrl,
  ]);

  let output = "";
  let errorOutput = "";

  ytDlpProcess.stdout.on("data", (data) => {
    output += data.toString();
  });
  ytDlpProcess.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  ytDlpProcess.on("close", (code) => {
    if (code === 0 && output.trim()) {
      const freshUrl = output.trim();
      console.log(`🎉 [yt-dlp Core] URL directa de Google extraída con éxito.`);
      res.json({ url: freshUrl });
    } else {
      console.error(
        `🚨 [yt-dlp Core Error] Falló la extracción binaria. Detalle del buffer:`,
        errorOutput,
      );
      res
        .status(500)
        .json({
          error: "No se pudo extraer la URL directa a través del túnel",
        });
    }
  });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Kamux Media Service en modo Local-Core corriendo en el puerto ${PORT}`,
  );
});
