const express = require("express");
const { spawn } = require("child_process");
const { Innertube } = require("youtubei.js");

const app = express();
const PORT = 5000;

let youtube = null;

async function initYouTube() {
  try {
    youtube = await Innertube.create({ client_type: "WEB" });
    console.log(
      "🔒 [Media Service] Catálogo Multimedia de Kamux Inicializado.",
    );
  } catch (error) {
    console.error("🚨 Error en inicialización del catálogo:", error.message);
  }
}

initYouTube();

// Endpoint 1: Búsqueda de Catálogo Musical
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Falta el parámetro query" });

  try {
    if (!youtube) await initYouTube();

    const searchResults = await youtube.search(`${query} song`, {
      type: "video",
    });

    if (!searchResults.videos || searchResults.videos.length === 0) {
      return res.json([]);
    }

    const tracks = searchResults.videos.slice(0, 30).map((item) => ({
      youtube_id: item.id,
      title: item.title?.text || item.title?.toString() || "Título Desconocido",
      artist: (
        item.author?.name ||
        item.author?.toString() ||
        "Artista Desconocido"
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
    console.error("🚨 Error en búsqueda:", error.message);
    res.status(500).json({ error: "Error al procesar la búsqueda" });
  }
});

// Endpoint 3: Extraer la Radio Automática Real de Google (Blindado)
app.get("/related/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ error: "ID inválido o undefined" });

  try {
    if (!youtube) await initYouTube();
    console.log(
      `🌐 [Kamux Algoritmo] Extrayendo Radio Automática para el track semilla: ${id}`,
    );

    const info = await youtube.getInfo(id);

    // Verificación de la existencia del feed
    if (!info || !info.watch_next_feed) {
      console.warn(
        `⚠️ [Kamux Related] No se generó watch_next_feed para el ID: ${id}`,
      );
      return res.json([]);
    }

    const relatedContents = info.watch_next_feed;
    console.log(
      `📊 [Kamux Related] Raw Feed recuperado con éxito. Procesando ${relatedContents.length} elementos...`,
    );

    const tracks = [];

    for (const item of relatedContents) {
      if (!item) continue;

      // 1. Extracción ultra-defensiva del ID del Video
      // youtubei.js suele usar id, video_id, o encapsularlo en un objeto interno
      const trackId =
        item.id ||
        item.video_id ||
        (item.key && item.key === "id" ? item.value : null);

      // Si el ID sigue sin aparecer, imprimimos un único elemento para inspeccionar su estructura real en la consola sin saturar el log
      if (!trackId) {
        if (tracks.length === 0) {
          console.log(
            "🔍 [Debug Kamux] Estructura de un item filtrado:",
            JSON.stringify(item).substring(0, 400),
          );
        }
        continue;
      }

      // 2. Extracción adaptativa del Título y Artista
      // Convertimos a string de manera segura controlando los objetos intermedios de la librería
      let rawTitle = "";
      if (item.title) {
        rawTitle =
          typeof item.title === "string"
            ? item.title
            : item.title.text || item.title.toString();
      }

      let rawArtist = "Artista Desconocido";
      if (item.author) {
        rawArtist =
          typeof item.author === "string"
            ? item.author
            : item.author.name || item.author.toString();
      } else if (item.short_byline_text) {
        rawArtist =
          item.short_byline_text.text || item.short_byline_text.toString();
      }

      // Evitamos strings basura de la conversión implícita de objetos
      if (rawTitle === "[object Object]") rawTitle = "Canción Sugerida";
      if (rawArtist === "[object Object]") rawArtist = "Artista Sugerido";

      tracks.push({
        youtube_id: trackId,
        title: rawTitle || "Canción Sugerida",
        artist: rawArtist.replace(/\s*-\s*Topic$/i, "").trim(),
        duration_seconds: item.duration?.seconds || item.duration || 180,
        thumbnail:
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "",
      });
    }

    // Filtramos duplicados por ID
    const uniqueTracks = tracks
      .filter(
        (track, index, self) =>
          index === self.findIndex((t) => t.youtube_id === track.youtube_id),
      )
      .slice(0, 30);

    console.log(
      `🎉 [Kamux Related] Mapeo completado. Devolviendo ${uniqueTracks.length} canciones.`,
    );
    res.json(uniqueTracks);
  } catch (error) {
    console.error(
      `🚨 [Kamux Related Error] Falló la extracción para ${id}:`,
      error.message,
    );
    res.status(500).json({ error: "Error al generar la radio automática" });
  }
});

// Endpoint 2: Extracción Binaria Nativa Tunelizada por Cloudflare WARP SOCKS5
app.get("/stream-url/:id", (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ error: "ID inválido o undefined" });

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  console.log(`🌐 [yt-dlp Core] Extrayendo streaming permanente para: ${id}`);

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
  ytDlpProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  ytDlpProcess.on("close", (code) => {
    if (code === 0 && output.trim()) {
      res.json({ url: output.trim() });
    } else {
      res.status(500).json({ error: "No se pudo extraer la URL" });
    }
  });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Kamux Media Service en modo Local-Core corriendo en el puerto ${PORT}`,
  );
});
