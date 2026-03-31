import * as vscode from 'vscode';

function applyRedactionRules(text: string): string {
  const config = vscode.workspace.getConfiguration('securityLayer');
  const rules = config.get<{ pattern: string; flags?: string; replacement?: string }[]>('redactionRules', []);

  for (const rule of rules) {
    const regex = new RegExp(rule.pattern, rule.flags ?? 'g');
    text = text.replace(regex, rule.replacement ?? '[REDACTED]');
  }

  return text;
}

export function activate(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    let fullPrompt = request.prompt;

    for (const ref of request.references) {
      if (ref.value instanceof vscode.Uri) {
        const fileContent = await vscode.workspace.fs.readFile(ref.value);
        const text = Buffer.from(fileContent).toString('utf8');
        fullPrompt += `\n\nFile: ${ref.value.fsPath}\n\`\`\`\n${text}\n\`\`\``;
      }
    }

    fullPrompt = applyRedactionRules(fullPrompt);

    const redactMessages = [
      vscode.LanguageModelChatMessage.User(
        'Redact all PII and secrets from the following text. Return ONLY the redacted text, nothing else: ' + fullPrompt
      )
    ];

    const redactResponse = await request.model.sendRequest(redactMessages, {}, token);

    let redactedPrompt = '';
    for await (const fragment of redactResponse.text) {
      redactedPrompt += fragment;
    }

    stream.markdown(`**Redacted prompt:** ${redactedPrompt}\n\n---\n\n`);

    const copilotMessages = [
      vscode.LanguageModelChatMessage.User('You are a helpful coding assistant.'),
      vscode.LanguageModelChatMessage.User(redactedPrompt)
    ];

    const copilotResponse = await request.model.sendRequest(copilotMessages, {}, token);

    for await (const fragment of copilotResponse.text) {
      stream.markdown(fragment);
    }
  };

  const participant = vscode.chat.createChatParticipant('redact-extension.redact', handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'icon.png');
}