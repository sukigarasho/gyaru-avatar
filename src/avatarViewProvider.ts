import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class AvatarViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'gyaruAvatar.view';
  private view?: vscode.WebviewView;
  private currentState = 'idle';

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
    };
    webviewView.webview.html = this.getHtml(webviewView.webview);
    webviewView.webview.postMessage({ type: 'state', state: this.currentState });
  }

  updateState(state: string): void {
    this.currentState = state;
    this.view?.webview.postMessage({ type: 'state', state });
  }

  private getHtml(webview: vscode.Webview): string {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js'));
    const riveJsUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'rive.js'));
    const riveWasmUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'vendor', 'rive.wasm'));

    const rivFilePath = path.join(this.extensionUri.fsPath, 'media', 'avatar.riv');
    const hasRiveFile = fs.existsSync(rivFilePath);
    const riveFileUri = hasRiveFile
      ? webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'avatar.riv'))
      : undefined;
    const placeholderUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'placeholder.png'));

    const nonce = getNonce();
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval'`,
      `img-src ${webview.cspSource}`,
      `connect-src ${webview.cspSource}`
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<link href="${styleUri}" rel="stylesheet" />
</head>
<body data-state="idle">
<div class="avatar-wrap">
  <canvas id="avatar-canvas" ${hasRiveFile ? '' : 'hidden'}></canvas>
  <img id="placeholder-img" class="placeholder-img" src="${placeholderUri}" alt="avatar" ${hasRiveFile ? 'hidden' : ''} />
  <div id="caption" class="caption"></div>
</div>
<script nonce="${nonce}">
  window.__RIVE_WASM_URL__ = "${riveWasmUri}";
  window.__RIVE_FILE_URL__ = ${riveFileUri ? `"${riveFileUri}"` : 'null'};
</script>
<script nonce="${nonce}" src="${riveJsUri}"></script>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
