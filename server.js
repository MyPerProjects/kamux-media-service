const express = require("express");
const { spawn } = require("child_process");
const { Innertube } = require("youtubei.js");

const app = express();
const PORT = 5000;

let youtube = null;

// Inicializamos como WEB para garantizar la estabilidad de peticiones asíncronas en la nube
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

// Endpoint 3: Extraer la Radio Automática Real de Google (Canciones Similares de Varios Artistas)
app.get("/related/:id", async (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ error: "ID inválido o undefined" });

  try {
    if (!youtube) await initYouTube();
    console.log(
      `🌐 [Kamux Algoritmo] Extrayendo Radio Automática para el track semilla: ${id}`,
    );

    // Extraemos la información del reproductor extendido
    const info = await youtube.getInfo(id);

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

    // Recorremos el feed de forma defensiva extrayendo los datos sin importar la mutación del nodo
    for (const item of relatedContents) {
      if (!item) continue;

      // Unificamos las variaciones de ID que usa youtubei.js en objetos watch_next
      const trackId =
        item.id || item.video_id || item.endpoint?.payload?.videoId;
      if (!trackId) continue;

      // Extraemos el texto de forma elástica resolviendo objetos complejos de la librería
      const rawTitle = item.title?.text || item.title?.toString() || "";
      const rawArtist =
        item.author?.name ||
        item.author?.toString() ||
        item.short_byline_text?.toString() ||
        "Artista Desconocido";

      // Ignoramos elementos vacíos o que correspondan a listas de reproducción embebidas
      if (!rawTitle || rawTitle === "[object Object]") continue;

      tracks.push({
        youtube_id: trackId,
        title: rawTitle,
        artist: rawArtist.replace(/\s*-\s*Topic$/i, "").trim(),
        duration_seconds: item.duration?.seconds || item.duration || 180,
        thumbnail:
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "",
      });
    }

    // Filtramos duplicados por ID de forma estricta por si Google repite tracks en el feed de reproducción continua
    const uniqueTracks = tracks
      .filter(
        (track, index, self) =>
          index === self.findIndex((t) => t.youtube_id === track.youtube_id),
      )
      .slice(0, 30);

    console.log(
      `🎉 [Kamux Related] Radio mapeada con éxito. Devolviendo ${uniqueTracks.length} canciones del mismo género.`,
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

// Endpoint 2: Extracción Binaria Nativa Tunelizada por Cloudflare WARP SOCKS5 (Puerto 40000)
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
