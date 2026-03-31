"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
function applyRedactionRules(text) {
    var _a, _b;
    const config = vscode.workspace.getConfiguration('securityLayer');
    const rules = config.get('redactionRules', []);
    for (const rule of rules) {
        const regex = new RegExp(rule.pattern, (_a = rule.flags) !== null && _a !== void 0 ? _a : 'g');
        text = text.replace(regex, (_b = rule.replacement) !== null && _b !== void 0 ? _b : '[REDACTED]');
    }
    return text;
}
function activate(context) {
    const handler = (request, context, stream, token) => __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c, _d, e_2, _e, _f;
        let fullPrompt = request.prompt;
        for (const ref of request.references) {
            if (ref.value instanceof vscode.Uri) {
                const fileContent = yield vscode.workspace.fs.readFile(ref.value);
                const text = Buffer.from(fileContent).toString('utf8');
                fullPrompt += `\n\nFile: ${ref.value.fsPath}\n\`\`\`\n${text}\n\`\`\``;
            }
        }
        fullPrompt = applyRedactionRules(fullPrompt);
        const redactMessages = [
            vscode.LanguageModelChatMessage.User('Redact all PII and secrets from the following text. Return ONLY the redacted text, nothing else: ' + fullPrompt)
        ];
        const redactResponse = yield request.model.sendRequest(redactMessages, {}, token);
        let redactedPrompt = '';
        try {
            for (var _g = true, _h = __asyncValues(redactResponse.text), _j; _j = yield _h.next(), _a = _j.done, !_a; _g = true) {
                _c = _j.value;
                _g = false;
                const fragment = _c;
                redactedPrompt += fragment;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_g && !_a && (_b = _h.return)) yield _b.call(_h);
            }
            finally { if (e_1) throw e_1.error; }
        }
        stream.markdown(`**Redacted prompt:** ${redactedPrompt}\n\n---\n\n`);
        const copilotMessages = [
            vscode.LanguageModelChatMessage.User('You are a helpful coding assistant.'),
            vscode.LanguageModelChatMessage.User(redactedPrompt)
        ];
        const copilotResponse = yield request.model.sendRequest(copilotMessages, {}, token);
        try {
            for (var _k = true, _l = __asyncValues(copilotResponse.text), _m; _m = yield _l.next(), _d = _m.done, !_d; _k = true) {
                _f = _m.value;
                _k = false;
                const fragment = _f;
                stream.markdown(fragment);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (!_k && !_d && (_e = _l.return)) yield _e.call(_l);
            }
            finally { if (e_2) throw e_2.error; }
        }
    });
    const participant = vscode.chat.createChatParticipant('redact-extension.redact', handler);
    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'src', 'icon.png');
}
//# sourceMappingURL=extension.js.map