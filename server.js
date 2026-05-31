const express = require('express');
const { spawn } = require('child_process');
const { Innertube } = require('youtubei.js');

const app = express();
const PORT = 5000;

let youtube = null;

// Inicializamos youtubei.js únicamente para resolver las búsquedas de catálogo (que responden en 0.40s)
async function initYouTube() {
  try {
    youtube = await Innertube.create({ client_type: 'WEB' });
    console.log('🔒 [Media Service] Catálogo de búsquedas inicializado.');
  } catch (error) {
    console.error('🚨 Error en catálogo de búsquedas:', error.message);
  }
}

initYouTube();

// Endpoint 1: Búsqueda de Catálogo
app.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Falta el parámetro query' });

  try {
    if (!youtube) await initYouTube();
    const searchResults = await youtube.search(query, { type: 'video' });
    
    if (!searchResults.videos || searchResults.videos.length === 0) {
      return res.json([]);
    }

    const tracks = searchResults.videos.slice(0, 10).map((item) => ({
      youtube_id: item.id,
      title: item.title?.text || 'Título Desconocido',
      artist: (item.author?.name || 'Artista Desconocido').replace(/\s*-\s*Topic$/i, '').trim(),
      duration_seconds: item.duration?.seconds || 180,
      thumbnail: item.thumbnails && item.thumbnails.length > 0 ? item.thumbnails[item.thumbnails.length - 1].url : '',
    }));

    res.json(tracks);
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la búsqueda en YouTube' });
  }
});

// Endpoint 2: Extracción Binaria Nativa Tunelizada por Cloudflare WARP SOCKS5 (Puerto 40000)
app.get('/stream-url/:id', (req, res) => {
  const { id } = req.params;
  const videoUrl = `https://www.youtube.com/watch?v=${id}`;
  
  console.log(`🌐 [yt-dlp Core] Extrayendo streaming permanente para: ${id} vía SOCKS5:40000`);

  // Ejecutamos yt-dlp pasándole la instrucción nativa de red '--proxy' amarrada a Cloudflare WARP
  const ytDlpProcess = spawn('yt-dlp', [
    '-f', '251',
    '-g',
    '--proxy', 'socks5://127.0.0.1:40000', // 🚀 Inyección definitiva: Fuerza a yt-dlp a viajar encubierto por Cloudflare
    '--no-playlist',
    '--no-check-certificates',
    '--no-warnings',
    '--legacy-server-connect',
    videoUrl
  ]);

  let output = '';
  let errorOutput = '';

  ytDlpProcess.stdout.on('data', (data) => {
    output += data.toString();
  });

  ytDlpProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });

  ytDlpProcess.on('close', (code) => {
    if (code === 0 && output.trim()) {
      const freshUrl = output.trim();
      console.log(`🎉 [yt-dlp Core] URL directa de Google extraída con éxito.`);
      res.json({ url: freshUrl });
    } else {
      console.error(`🚨 [yt-dlp Core Error] Falló la extracción binaria. Detalle del buffer:`, errorOutput);
      res.status(500).json({ error: 'No se pudo extraer la URL directa a través del túnel' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Kamux Media Service en modo Local-Core corriendo en el puerto ${PORT}`);
});
