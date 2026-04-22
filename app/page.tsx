'use client';

import { useState, useRef, useCallback } from 'react';

type Step = 'idle' | 'loading-ffmpeg' | 'downloading' | 'converting' | 'done' | 'error';

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  'loading-ffmpeg': 'Preparando el convertidor... (solo la primera vez)',
  downloading: 'Descargando el audio de YouTube...',
  converting: 'Convirtiendo a MP3, espera un momento...',
  done: '¡Listo! Comprueba tu carpeta de descargas.',
  error: '',
};

function LeftArrow() {
  return (
    <svg width="90" height="50" viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="la" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#9ca3af" />
        </marker>
      </defs>
      <path d="M 5 5 C 10 40 60 45 85 45" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#la)" />
    </svg>
  );
}

function RightArrow() {
  return (
    <svg width="90" height="50" viewBox="0 0 90 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="ra" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
          <path d="M 8 0 L 0 4 L 8 8 Z" fill="#9ca3af" />
        </marker>
      </defs>
      <path d="M 85 5 C 80 40 30 45 5 45" stroke="#9ca3af" strokeWidth="2" markerEnd="url(#ra)" />
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const getFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
        'application/wasm'
      ),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const handleDownload = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || isLoading) return;
    setErrorMsg('');

    try {
      setStep('loading-ffmpeg');
      const ffmpeg = await getFFmpeg();

      setStep('downloading');
      const res = await fetch(`/api/audio?url=${encodeURIComponent(trimmedUrl)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al descargar el audio del servidor');
      }
      const buffer = await res.arrayBuffer();

      setStep('converting');
      await ffmpeg.writeFile('input', new Uint8Array(buffer));
      await ffmpeg.exec(['-i', 'input', '-vn', '-q:a', '2', 'output.mp3']);
      const mp3Raw = await ffmpeg.readFile('output.mp3');
      const mp3 = new Uint8Array(mp3Raw as ArrayBuffer);

      const blob = new Blob([mp3], { type: 'audio/mpeg' });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = 'audio.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);

      setStep('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ha ocurrido un error inesperado');
      setStep('error');
    }
  };

  const isLoading = step === 'loading-ffmpeg' || step === 'downloading' || step === 'converting';

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
      {/* Title */}
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Descarga el audio de YouTube
        </h1>
        <p className="text-xl text-gray-500 max-w-lg mx-auto">
          Pega el enlace de cualquier vídeo y descarga el audio en MP3.
          Gratis, sin registros.
        </p>
      </div>

      {/* Form with arrow annotations */}
      <div className="w-full max-w-xl flex flex-col gap-5">
        {/* Input row */}
        <div className="relative">
          {/* Left annotation */}
          <div className="hidden lg:flex flex-col items-end absolute right-full top-1/2 -translate-y-full pr-3 w-48">
            <p className="text-sm italic text-gray-400 text-right leading-snug mb-1">
              Aquí pega el enlace<br />de youtube, papá
            </p>
            <LeftArrow />
          </div>

          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleDownload();
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isLoading}
            className="w-full text-lg border-2 border-gray-300 rounded-xl px-6 py-5 focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 placeholder:text-gray-300"
          />
        </div>

        {/* Button row */}
        <div className="relative">
          <button
            onClick={handleDownload}
            disabled={isLoading || !url.trim()}
            className="w-full text-xl font-semibold bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl px-6 py-6 transition-colors duration-150"
          >
            {isLoading ? 'Procesando...' : 'Descargar MP3'}
          </button>

          {/* Right annotation */}
          <div className="hidden lg:flex flex-col items-start absolute left-full top-1/2 -translate-y-full pl-3 w-48">
            <RightArrow />
            <p className="text-sm italic text-gray-400 text-left leading-snug mt-1">
              Dale aquí para convertir<br />y descargar el audio
            </p>
          </div>
        </div>
      </div>

      {/* Status message */}
      {step !== 'idle' && (
        <p className={`mt-10 text-xl text-center font-medium max-w-md ${
          step === 'done' ? 'text-green-600' :
          step === 'error' ? 'text-red-600' :
          'text-blue-600'
        }`}>
          {step === 'error' ? errorMsg : STEP_LABELS[step]}
        </p>
      )}

      {/* Mobile hints (shown only on small screens) */}
      <div className="lg:hidden mt-8 text-center space-y-1">
        <p className="text-sm italic text-gray-400">
          ↑ Pega arriba el enlace de YouTube
        </p>
        <p className="text-sm italic text-gray-400">
          ↑ Dale al botón para descargar el audio
        </p>
      </div>
    </main>
  );
}
