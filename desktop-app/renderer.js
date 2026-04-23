const urlInput = document.getElementById('url-input');
const downloadBtn = document.getElementById('download-btn');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');
const progressWrap = document.getElementById('progress-bar-wrap');
const progressBar = document.getElementById('progress-bar');
const statusMsg = document.getElementById('status-msg');

function setStatus(msg, type = '') {
  statusMsg.textContent = msg;
  statusMsg.className = type;
}

function setProgress(percent) {
  if (percent == null) {
    progressWrap.classList.add('hidden');
    progressBar.style.width = '0%';
  } else {
    progressWrap.classList.remove('hidden');
    progressBar.style.width = `${percent}%`;
  }
}

function setLoading(loading) {
  downloadBtn.disabled = loading;
}

// Recibir actualizaciones de estado desde el proceso principal
window.electronAPI.onStatusUpdate((data) => {
  switch (data.phase) {
    case 'info':
      setStatus(data.message, '');
      btnIcon.textContent = '⏳';
      btnText.textContent = 'Un momento...';
      setProgress(null);
      break;

    case 'downloading':
      setStatus(data.message, '');
      btnIcon.textContent = '📥';
      btnText.textContent = 'Descargando...';
      if (data.percent != null) setProgress(data.percent);
      break;

    case 'converting':
      setStatus(data.message, '');
      btnIcon.textContent = '🔄';
      btnText.textContent = 'Convirtiendo...';
      setProgress(null);
      break;
  }
});

// Limpiar URL al pegar (elimina espacios accidentales)
urlInput.addEventListener('paste', () => {
  setTimeout(() => {
    urlInput.value = urlInput.value.trim();
  }, 0);
});

// Iniciar descarga con Enter
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startDownload();
});

downloadBtn.addEventListener('click', startDownload);

async function startDownload() {
  const url = urlInput.value.trim();

  if (!url) {
    setStatus('Pega primero el enlace de YouTube en el cuadro de arriba.', 'error');
    urlInput.focus();
    return;
  }

  setLoading(true);
  setStatus('', '');
  setProgress(null);

  const result = await window.electronAPI.downloadAudio(url);

  if (result.success) {
    setStatus(`✓ ¡Listo! "${result.title}" guardado en la carpeta Descargas`, 'success');
    urlInput.value = '';
  } else {
    setStatus(`✗ ${result.error}`, 'error');
  }

  btnIcon.textContent = '⬇';
  btnText.textContent = 'Descargar MP3';
  setProgress(null);
  setLoading(false);
}
