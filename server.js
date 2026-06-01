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

// Endpoint 3: Extraer la Radio Automática Real de Google (Optimizado y Purificado)
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

    if (!info || !info.watch_next_feed) {
      console.warn(
        `⚠️ [Kamux Related] No se generó watch_next_feed para el ID: ${id}`,
      );
      return res.json([]);
    }

    const relatedContents = info.watch_next_feed;
    console.log(
      `📊 [Kamux Related] Raw Feed de ${relatedContents.length} elementos recuperado con éxito.`,
    );

    const tracks = [];
    const trashKeywords =
      /(story of|documental|documentary|review|entrevista|interview|reaccion|reaction|full album|tutorial|how to|biografia|biography)/i;
    const viewsRegex =
      /(vistas|views|reproducciones|hace|ago|\d+\s*(minutos|horas|días|meses|años))/i;

    for (const item of relatedContents) {
      if (!item) continue;

      let trackId = item.id || item.video_id;
      let rawTitle = "";
      let rawArtist = "";
      let thumbUrl = "";
      let duration = 180;

      // PROCESAMIENTO ADAPTATIVO REVELADO POR EL LOG DE AUDITORÍA
      if (item.type === "LockupView" || (!trackId && item.content_image)) {
        const images =
          item.content_image?.image || item.content_image?.thumbnails;
        if (images && images.length > 0) {
          thumbUrl = images[images.length - 1].url || "";
          const idMatch = thumbUrl.match(/\/vi\/([^\/]+)\//);
          if (idMatch && idMatch[1]) {
            trackId = idMatch[1].split("?")[0];
          }
        }

        if (item.metadata) {
          rawTitle =
            item.metadata.title?.text || item.metadata.title?.toString() || "";

          // 🚀 SOLUCIÓN DEFINITIVA DE METADATOS: Resolvemos la doble envoltura detectada en el log
          const innerMetadata = item.metadata.metadata;
          const targetLines = innerMetadata?.lines || item.metadata.lines;

          if (targetLines && targetLines.length > 0) {
            for (const line of targetLines) {
              if (!line) continue;
              let textContent =
                line.text ||
                (line.runs && line.runs.map((r) => r.text).join("")) ||
                line.toString();

              if (
                textContent &&
                textContent !== "[object Object]" &&
                !viewsRegex.test(textContent)
              ) {
                rawArtist = textContent.trim();
                break;
              }
            }
          }

          // Fallback en la raíz del item por si viene como canal Topic directo
          if (!rawArtist || rawArtist === "[object Object]") {
            rawArtist = item.author?.name || item.author?.toString() || "";
          }
        }
      } else {
        // Fallback clásico para componentes estándar
        rawTitle = item.title?.text || item.title?.toString() || "";
        rawArtist = item.author?.name || item.author?.toString() || "";
        thumbUrl =
          item.thumbnails && item.thumbnails.length > 0
            ? item.thumbnails[item.thumbnails.length - 1].url
            : "";
      }

      // Validaciones de sanidad
      if (!trackId || !rawTitle || rawTitle === "[object Object]") continue;

      duration = item.duration?.seconds || item.duration || 180;

      // Salvaguarda final: Si todo falla, heredamos el autor principal del track semilla
      if (
        !rawArtist ||
        rawArtist === "[object Object]" ||
        rawArtist === "Artista Desconocido"
      ) {
        rawArtist = info.basic_info?.author || "Artista Colectivo";
      }

      // Filtro estricto anti-basura y límite de duración (12 minutos)
      if (trashKeywords.test(rawTitle) || duration > 720) {
        console.log(
          `🗑️ [Kamux Filtro] Excluyendo video no-musical: "${rawTitle}"`,
        );
        continue;
      }

      tracks.push({
        youtube_id: trackId,
        title: rawTitle,
        artist: rawArtist.replace(/\s*-\s*Topic$/i, "").trim(),
        duration_seconds: duration,
        thumbnail: thumbUrl,
      });
    }

    // Purgamos duplicados exactos en la cola por ID
    const uniqueTracks = tracks
      .filter(
        (track, index, self) =>
          index === self.findIndex((t) => t.youtube_id === track.youtube_id),
      )
      .slice(0, 30);

    console.log(
      `🎉 [Kamux Related] Mapeo completado con éxito. Devolviendo ${uniqueTracks.length} canciones purificadas.`,
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

// Endpoint 2: Extracción Binaria Nativa (Estable con Formato Universal "bestaudio")
app.get("/stream-url/:id", (req, res) => {
  const { id } = req.params;
  if (!id || id === "undefined")
    return res.status(400).json({ error: "ID inválido o undefined" });

  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  console.log(`🌐 [yt-dlp Core] Extrayendo streaming permanente para: ${id}`);

  const ytDlpProcess = spawn("yt-dlp", [
    "-f",
    "bestaudio",
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
      res.json({ url: output.trim() });
    } else {
      console.error(
        `🚨 [yt-dlp Core Error] Falló el proceso hijo. Código de salida ${code}. Buffer:`,
        errorOutput,
      );
      res.status(500).json({ error: "No se pudo extraer la URL" });
    }
  });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Kamux Media Service en modo Local-Core corriendo en el puerto ${PORT}`,
  );
});
