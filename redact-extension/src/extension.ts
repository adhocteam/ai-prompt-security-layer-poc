import * as vscode from 'vscode';

const BASE_PROMPT = 'You are a helpful assistant that redacts PII and secrets from text.';

export function activate(context: vscode.ExtensionContext) {
  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    const messages = [
      vscode.LanguageModelChatMessage.User(BASE_PROMPT),
      vscode.LanguageModelChatMessage.User("Redact PII and secrets from the following: " + request.prompt)
    ];

    const chatResponse = await request.model.sendRequest(messages, {}, token);

    for await (const fragment of chatResponse.text) {
      stream.markdown(fragment);
    }
  };

  const participant = vscode.chat.createChatParticipant('redact-extension.redact', handler);
  participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'public', 'icon.png');
}