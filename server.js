const express = require("express");
const { spawn } = require("child_process");
const { Innertube } = require("youtubei.js");

const app = express();
const PORT = 5000;

let youtube = null;

async function initYouTube() {
  try {
    youtube = await Innertube.create({ client_type: "YTMUSIC" });
    console.log("🔒 [Media Service] Catálogo de YouTube Music inicializado.");
  } catch (error) {
    console.error("🚨 Error en catálogo de búsquedas:", error.message);
  }
}

initYouTube();

// Endpoint 1: Búsqueda de Catálogo Musical Puro
app.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ error: "Falta el parámetro query" });

  try {
    if (!youtube) await initYouTube();
    const searchResults = await youtube.music.search(query, { type: "song" });

    if (
      !searchResults.songs ||
      !searchResults.songs.contents ||
      searchResults.songs.contents.length === 0
    ) {
      return res.json([]);
    }

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

// Endpoint 3: Extraer la Cola de Recomendaciones con la función nativa correcta de youtubei.js
app.get("/related/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!youtube) await initYouTube();
    console.log(
      `🌐 [YTMUSIC Algoritmo] Solicitando secuencia de reproducción para semilla: ${id}`,
    );

    // 🚀 SOLUCIÓN DEFINITIVA: Usamos getInfo() en la raíz global, que extrae la información extendida y la lista "Watch Next" de música
    const info = await youtube.getInfo(id);

    if (!info) {
      console.warn(`⚠️ [YTMUSIC Related] El objeto de información vino vacío.`);
      return res.json([]);
    }

    // Extraemos la lista de videos/canciones sugeridas a continuación
    // La librería almacena los tracks recomendados en watch_next_feed o mediante el panel de reproducción continua
    const watchNextList =
      info.watch_next_feed ||
      (info.playlist_panel ? info.playlist_panel.contents : null);

    if (!watchNextList || !watchNextList.contents) {
      console.warn(
        `⚠️ [YTMUSIC Related] No se detectó feed de reproducción automática continua para el ID ${id}.`,
      );
      return res.json([]);
    }

    const relatedTracks = watchNextList.contents;
    console.log(
      `📊 [YTMUSIC Related] Contenidos encontrados: ${relatedTracks.length} elementos. Iniciando mapeo...`,
    );

    const tracks = relatedTracks
      .filter((item) => item && (item.id || item.video_id) && item.title)
      .slice(0, 30)
      .map((item) => {
        const trackId = item.id || item.video_id;
        const artistName =
          item.artists && item.artists.length > 0
            ? item.artists[0].name
            : item.author || "Artista Desconocido";

        return {
          youtube_id: trackId,
          title: item.title?.toString() || "Título Desconocido",
          artist: artistName
            .toString()
            .replace(/\s*-\s*Topic$/i, "")
            .trim(),
          duration_seconds: item.duration?.seconds || item.duration || 180,
          thumbnail:
            item.thumbnails && item.thumbnails.length > 0
              ? item.thumbnails[item.thumbnails.length - 1].url
              : "",
        };
      });

    console.log(
      `🎉 [YTMUSIC Related] Mapeo completado con éxito. Devolviendo ${tracks.length} tracks.`,
    );
    res.json(tracks);
  } catch (error) {
    console.error(
      `🚨 [YTMUSIC Related Error] Falló el procesamiento para ${id}.`,
    );
    console.error(`Detalle del error:`, error);
    res
      .status(500)
      .json({
        error: "No se pudo generar la lista de canciones recomendadas",
        details: error.message,
      });
  }
});

// Endpoint 2: Extracción Binaria Nativa Tunelizada por Cloudflare WARP SOCKS5 (Puerto 40000)
app.get("/stream-url/:id", (req, res) => {
  const { id } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${id}`;

  console.log(
    `🌐 [yt-dlp Core] Extrayendo streaming permanente para: ${id} vía SOCKS5:40000`,
  );

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
