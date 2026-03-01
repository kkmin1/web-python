const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const BASE_DIR = __dirname;
const RUNTIME_DIR = app.isPackaged ? path.join(process.resourcesPath, 'runtime') : BASE_DIR;

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const packagedIndexPath = path.join(__dirname, 'index.html');
  const runtimeIndexPath = path.join(RUNTIME_DIR, 'index.html');
  const indexPath = fs.existsSync(packagedIndexPath) ? packagedIndexPath : runtimeIndexPath;
  win.loadFile(indexPath);
}

function splitArgs(text) {
  if (!text || !text.trim()) {
    return [];
  }

  const out = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^\s]+)/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    out.push(match[1] || match[2] || match[3]);
  }
  return out;
}

function resolveScriptPath(scriptPath) {
  if (!scriptPath) {
    return '';
  }
  return path.isAbsolute(scriptPath) ? scriptPath : path.resolve(RUNTIME_DIR, scriptPath);
}

function inferOutputMode(scriptPath) {
  const resolved = resolveScriptPath(scriptPath);
  if (!resolved || !fs.existsSync(resolved)) {
    return 'positional';
  }

  try {
    const content = fs.readFileSync(resolved, 'utf8');
    const supportsDashOutput =
      /--output\b/.test(content) ||
      /add_argument\(\s*['"]-o['"]/.test(content) ||
      /add_argument\([^)]*['"]-o['"][^)]*['"]--output['"]/.test(content);
    return supportsDashOutput ? 'dash_o' : 'positional';
  } catch {
    return 'positional';
  }
}

function walkPyFiles(rootDir) {
  const result = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.toLowerCase().endsWith('.py')) {
        result.push(path.relative(rootDir, fullPath));
      }
    }
  }

  walk(rootDir);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}

ipcMain.handle('list-scripts', async () => {
  return walkPyFiles(RUNTIME_DIR);
});

ipcMain.handle('pick-file', async (_event, mode) => {
  const filters = mode === 'script'
    ? [{ name: 'Python', extensions: ['py'] }]
    : [{ name: 'All Files', extensions: ['*'] }];

  const result = await dialog.showOpenDialog({
    title: mode === 'script' ? '파이썬 스크립트 선택' : '입력 파일 선택',
    properties: ['openFile'],
    filters,
    defaultPath: RUNTIME_DIR,
  });

  if (result.canceled || result.filePaths.length === 0) {
    return '';
  }

  return result.filePaths[0];
});

ipcMain.handle('pick-output-file', async (_event, suggestedPath) => {
  const rawPath = String(suggestedPath || '').trim();
  let defaultPath = RUNTIME_DIR;

  if (rawPath) {
    const resolved = path.isAbsolute(rawPath) ? rawPath : path.resolve(RUNTIME_DIR, rawPath);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        defaultPath = path.join(resolved, 'output.html');
      } else {
        defaultPath = resolved;
      }
    } catch {
      defaultPath = resolved;
    }
  }

  const result = await dialog.showSaveDialog({
    title: '출력 파일 저장 위치 선택',
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'HTML', extensions: ['html', 'htm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    buttonLabel: '저장 경로 선택',
    properties: ['showOverwriteConfirmation'],
  });

  if (result.canceled || !result.filePath) {
    return '';
  }

  return result.filePath;
});

ipcMain.handle('run-python', async (_event, payload) => {
  const scriptPath = payload.scriptPath || '';
  const inputPath = payload.inputPath || '';
  const outputPath = payload.outputPath || '';
  const outputMode = payload.outputMode || 'none';
  const extraArgs = payload.extraArgs || '';

  if (!scriptPath || !inputPath) {
    return { ok: false, code: -1, output: '스크립트와 입력 파일을 먼저 선택하세요.' };
  }

  const effectiveOutputMode =
    outputPath && outputMode === 'none' ? inferOutputMode(scriptPath) : outputMode;

  const scriptArgs = [scriptPath, inputPath];
  if (outputPath && effectiveOutputMode === 'positional') {
    scriptArgs.push(outputPath);
  } else if (outputPath && effectiveOutputMode === 'dash_o') {
    scriptArgs.push('-o', outputPath);
  }
  scriptArgs.push(...splitArgs(extraArgs));

  // Force UTF-8 I/O on Windows so Korean logs are not decoded as cp949.
  const pythonArgs = ['-X', 'utf8', ...scriptArgs];

  const commandLine = ['python', ...pythonArgs].map((v) => (v.includes(' ') ? `"${v}"` : v)).join(' ');

  return new Promise((resolve) => {
    const child = spawn('python', pythonArgs, {
      cwd: RUNTIME_DIR,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONUTF8: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let text = `[cmd] ${commandLine}\n\n`;

    child.stdout.on('data', (buf) => {
      text += buf.toString('utf8');
    });

    child.stderr.on('data', (buf) => {
      text += buf.toString('utf8');
    });

    child.on('error', (err) => {
      resolve({ ok: false, code: -1, output: `${text}\n[error] ${err.message}` });
    });

    child.on('close', (code) => {
      resolve({ ok: code === 0, code, output: text.trim() || '(출력 없음)' });
    });
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
