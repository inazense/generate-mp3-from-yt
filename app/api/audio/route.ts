import ytdl from '@distube/ytdl-core';

export const maxDuration = 60;

function cookieHeaders(): Record<string, string> {
  const cookies = process.env.YOUTUBE_COOKIES;
  return cookies ? { cookie: cookies } : {};
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'URL requerida' }, { status: 400 });
  }

  if (!ytdl.validateURL(url)) {
    return Response.json(
      { error: 'La URL no es válida. Asegúrate de que es un enlace de YouTube.' },
      { status: 400 }
    );
  }

  try {
    const reqOpts = { requestOptions: { headers: cookieHeaders() } };
    const info = await ytdl.getInfo(url, reqOpts);
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    const audioStream = ytdl.downloadFromInfo(info, { format, ...reqOpts });

    const webStream = new ReadableStream({
      start(controller) {
        audioStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        audioStream.on('end', () => {
          controller.close();
        });
        audioStream.on('error', (err: Error) => {
          controller.error(err);
        });
      },
      cancel() {
        audioStream.destroy();
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': format.mimeType?.split(';')[0] ?? 'audio/webm',
      'Cache-Control': 'no-store',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    };

    if (format.contentLength) {
      headers['Content-Length'] = format.contentLength;
    }

    return new Response(webStream, { headers });
  } catch (err) {
    console.error('Error downloading audio:', err);
    const is429 = (err as { statusCode?: number }).statusCode === 429;
    const message = is429
      ? 'YouTube está bloqueando la descarga. Configura la variable YOUTUBE_COOKIES con tu sesión.'
      : 'No se pudo obtener el audio. Comprueba que el vídeo existe y no está restringido.';
    return Response.json({ error: message }, { status: 500 });
  }
}
