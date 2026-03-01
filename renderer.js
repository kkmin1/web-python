const scriptSelect = document.getElementById('scriptSelect');
const scriptPath = document.getElementById('scriptPath');
const inputPath = document.getElementById('inputPath');
const outputPath = document.getElementById('outputPath');
const outputMode = document.getElementById('outputMode');
const extraArgs = document.getElementById('extraArgs');
const runBtn = document.getElementById('runBtn');
const pickScriptBtn = document.getElementById('pickScriptBtn');
const pickInputBtn = document.getElementById('pickInputBtn');
const pickOutputBtn = document.getElementById('pickOutputBtn');
const log = document.getElementById('log');
const statusEl = document.getElementById('status');

function setStatus(text, ok) {
  statusEl.textContent = text;
  statusEl.className = `status ${ok ? 'ok' : 'err'}`;
}

function setLog(text) {
  log.value = text || '';
  log.scrollTop = log.scrollHeight;
}

function toWindowsPath(pathText) {
  return (pathText || '').trim();
}

async function loadScripts() {
  const scripts = await window.launcherApi.listScripts();
  scriptSelect.innerHTML = '';

  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '-- 선택 --';
  scriptSelect.appendChild(empty);

  for (const item of scripts) {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    scriptSelect.appendChild(opt);
  }
}

scriptSelect.addEventListener('change', () => {
  if (scriptSelect.value) {
    scriptPath.value = scriptSelect.value;
  }
});

pickScriptBtn.addEventListener('click', async () => {
  const chosen = await window.launcherApi.pickFile('script');
  if (chosen) {
    scriptPath.value = chosen;
  }
});

pickInputBtn.addEventListener('click', async () => {
  const chosen = await window.launcherApi.pickFile('input');
  if (chosen) {
    inputPath.value = chosen;
  }
});

pickOutputBtn.addEventListener('click', async () => {
  const chosen = await window.launcherApi.pickOutputFile(outputPath.value);
  if (chosen) {
    outputPath.value = chosen;
  }
});

runBtn.addEventListener('click', async () => {
  const payload = {
    scriptPath: toWindowsPath(scriptPath.value),
    inputPath: toWindowsPath(inputPath.value),
    outputPath: toWindowsPath(outputPath.value),
    outputMode: outputMode.value,
    extraArgs: extraArgs.value || '',
  };

  setStatus('실행 중...', true);
  setLog('');
  runBtn.disabled = true;

  try {
    const result = await window.launcherApi.runPython(payload);
    setStatus(result.ok ? '성공' : `실패 (exit code ${result.code})`, result.ok);
    setLog(result.output || '(출력 없음)');
  } catch (err) {
    setStatus('실패 (예외)', false);
    setLog(String(err));
  } finally {
    runBtn.disabled = false;
  }
});

loadScripts().catch((err) => {
  setStatus('스크립트 목록 로딩 실패', false);
  setLog(String(err));
});
