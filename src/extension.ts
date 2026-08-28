import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AvatarViewProvider } from './avatarViewProvider';

const STATE_DIR = path.join(os.homedir(), '.claude');
const STATE_FILE = path.join(STATE_DIR, 'avatar-state.json');
const STATE_FILENAME = path.basename(STATE_FILE);

export function activate(context: vscode.ExtensionContext): void {
  const provider = new AvatarViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AvatarViewProvider.viewType, provider)
  );

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const readAndPush = () => {
    fs.readFile(STATE_FILE, 'utf8', (err, data) => {
      if (err) {
        provider.updateState('idle');
        return;
      }
      try {
        const parsed = JSON.parse(data);
        provider.updateState(typeof parsed.state === 'string' ? parsed.state : 'idle');
      } catch {
        provider.updateState('idle');
      }
    });
  };

  readAndPush();

  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
    const watcher = fs.watch(STATE_DIR, (_event, filename) => {
      if (filename === STATE_FILENAME) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(readAndPush, 80);
      }
    });
    context.subscriptions.push({ dispose: () => watcher.close() });
  } catch (e) {
    console.error('avatar-state watch failed', e);
  }
}

export function deactivate(): void {}
