import createModule from "./redactor.mjs";

window.addEventListener("error", (e) => console.error("window error:", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => console.error("promise rejection:", e.reason));

const { onload } = lemonade;

function App() {
  this.mod = null;
  this.status = "Loading WASM…";

  this.rules = [
    { type: "bearer_header", header: "Authorization", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    { type: "header", header: "X-Api-Key", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    { type: "query_param", header: "", key: "api_key", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
    { type: "json_field", header: "", key: "token", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
  ];

  this.mix = (a, b, t) => Math.round(a + (b - a) * t);

  this.paintRuleBoxes = () => {
    setTimeout(() => {
      const root = document.querySelector("#ruleList");
      if (!root) return;
      const els = root.querySelectorAll(".rule");
      for (let i = 0; i < els.length; i++) {
        const bg = (this.rules[i] && this.rules[i]._bg) ? this.rules[i]._bg : "#fff";
        els[i].style.backgroundColor = bg;
      }
    }, 0);
  };

  this.updateRuleShades = () => {
    const n = this.rules.length;

    const start = { r: 224, g: 224, b: 224 }; // #e0e0e0
    const end = { r: 255, g: 255, b: 255 };

    for (let i = 0; i < n; i++) {
      const t = n <= 1 ? 0 : i / (n - 1);
      const r = this.mix(start.r, end.r, t);
      const g = this.mix(start.g, end.g, t);
      const b = this.mix(start.b, end.b, t);
      this.rules[i]._bg = `rgb(${r}, ${g}, ${b})`;
    }

    this.paintRuleBoxes();
  };

  this.updateRuleShades();

  // ---- demo input ----
  this.input = `2026-02-11 10:01:12.123  INFO 12345 --- [nio-8080-exec-1] c.example.Api : GET /v1/data?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj&access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
Authorization: Bearer abcdef123456
Authorization: Basic dXNlcjpwYXNz
Cookie: session=SID_abc123; refresh_token=r1_234; other=ok
Set-Cookie: id_token=IDTOK_123; Path=/; HttpOnly
X-Api-Key: SUPERSECRET
api_key=SUPERSECRET&x=1
DATABASE_URL=postgres://user:pass@db.example.com:5432/app
{"token":"tok_12345","client_secret":"shh","other":"ok"}
spring.datasource.password=supersecretpw
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`;
  this.output = "";

  this.showAdvanced = false;
  this.rulesJson = "";

  // ---- preset sets (building blocks) ----
  const PRESET_SETS = {
    http_tokens: [
      // Authorization (bearer + basic variants)
      { type: "bearer_header", header: "Authorization", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "Authorization: Basic ", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // common API key headers
      { type: "header", header: "X-Api-Key", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "header", header: "X-API-Key", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "header", header: "Api-Key", key: "", marker: "", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // cookies (simple: redact each cookie line after prefix)
      // NOTE: this will redact the *rest of the line* until whitespace; typical Cookie: has spaces, so it will only redact the first chunk.
      // Better: treat cookie values via custom markers for common cookie keys below (in oauth set), but we include these as a baseline.
      { type: "custom", header: "", key: "", marker: "Cookie: ", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "Set-Cookie: ", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    ],

    oauth_oidc: [
      // query params
      { type: "query_param", header: "", key: "code", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "state", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "access_token", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "refresh_token", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "id_token", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "token", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },

      // JSON fields
      { type: "json_field", header: "", key: "token", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "access_token", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "refresh_token", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "id_token", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "client_secret", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },

      // cookie-style tokens commonly named like these (works for Cookie: a=b; c=d)
      { type: "custom", header: "", key: "", marker: "session=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "access_token=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "refresh_token=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "id_token=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
    ],

    database_secrets: [
      // common query params
      { type: "query_param", header: "", key: "password", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "passwd", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },
      { type: "query_param", header: "", key: "pwd", marker: "", mode: "set", stop_char: "", stop_set: "& \t\r\n", max_len: 0 },

      // JSON fields
      { type: "json_field", header: "", key: "password", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },

      // key=value config lines
      { type: "custom", header: "", key: "", marker: "DATABASE_URL=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "DB_PASSWORD=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "DB_USERNAME=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // connection-string-ish pieces (often semicolon-delimited)
      { type: "custom", header: "", key: "", marker: "Password=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "Pwd=", mode: "set", stop_char: "", stop_set: "; \t\r\n", max_len: 0 },
    ],

    cloud_creds: [
      // AWS env-style
      { type: "custom", header: "", key: "", marker: "AWS_ACCESS_KEY_ID=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "AWS_SECRET_ACCESS_KEY=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "AWS_SESSION_TOKEN=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // Azure-ish env-style
      { type: "custom", header: "", key: "", marker: "AZURE_CLIENT_SECRET=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "AZURE_CLIENT_CERTIFICATE_PASSWORD=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // GCP env-style
      { type: "custom", header: "", key: "", marker: "GOOGLE_APPLICATION_CREDENTIALS=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // common JSON fields
      { type: "json_field", header: "", key: "aws_access_key_id", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "aws_secret_access_key", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
      { type: "json_field", header: "", key: "azure_client_secret", marker: "", mode: "char", stop_char: "\"", stop_set: "", max_len: 0 },
    ],

    framework_addons_spring: [
      { type: "custom", header: "", key: "", marker: "spring.datasource.password=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "spring.redis.password=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "spring.mail.password=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },

      // spring-style "..." can show up in YAML too; we at least cover the equals form here.
      { type: "custom", header: "", key: "", marker: "management.endpoint.env.keys-to-sanitize=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    ],

    framework_addons_django: [
      { type: "custom", header: "", key: "", marker: "SECRET_KEY=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "DJANGO_SECRET_KEY=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    ],

    framework_addons_rails: [
      { type: "custom", header: "", key: "", marker: "secret_key_base=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "RAILS_MASTER_KEY=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    ],

    framework_addons_laravel: [
      { type: "custom", header: "", key: "", marker: "APP_KEY=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
      { type: "custom", header: "", key: "", marker: "JWT_SECRET=", mode: "whitespace", stop_char: "", stop_set: "", max_len: 0 },
    ],
  };

  // groupings you can click like "HTTP tokens", etc.
  const PRESET_GROUPS = {
    http_tokens: ["http_tokens"],
    oauth_oidc: ["oauth_oidc"],
    database_secrets: ["database_secrets"],
    cloud_creds: ["cloud_creds"],
    spring_addons: ["framework_addons_spring"],
    django_addons: ["framework_addons_django"],
    rails_addons: ["framework_addons_rails"],
    laravel_addons: ["framework_addons_laravel"],

    // convenience "combo" (optional): Spring-ish app baseline
    spring_app_bundle: ["http_tokens", "oauth_oidc", "database_secrets", "cloud_creds", "framework_addons_spring"],
  };

  this.ruleKey = (r) => {
    const type = (r.type || "").trim();
    const header = (r.header || "").trim();
    const key = (r.key || "").trim();
    const marker = (r.marker || "").trim();
    const mode = (r.mode || "").trim();
    const stop_char = (r.stop_char || "").trim();
    const stop_set = (r.stop_set || "").trim();
    const max_len = String(Number(r.max_len) || 0);
    return [type, header, key, marker, mode, stop_char, stop_set, max_len].join("|");
  };

  this.dedupeRules = () => {
    const seen = new Set();
    const out = [];
    for (const r of this.rules) {
      const k = this.ruleKey(r);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    this.rules = out;
    this.updateRuleShades();
  };

  // apply a "set" or a "group"
  this.applyPreset = (presetId) => {
    const sets = PRESET_GROUPS[presetId] || [presetId];

    let added = 0;
    for (const setId of sets) {
      const toAdd = PRESET_SETS[setId] || [];
      for (const r of toAdd) {
        this.rules.push({ ...r });
        added++;
      }
    }

    if (!added) return;

    this.dedupeRules();
    this.refresh("rules");
    this.markDirty();
    this.setStatus(`Preset applied: ${presetId}`);
  };

  this.setStatus = (s) => {
    this.status = s;
    this.refresh("status");
  };

  this.compileRules = () => {
    const compiled = [];

    for (const r of this.rules) {
      const max_len = Number(r.max_len) || 0;

      if (r.type === "bearer_header") {
        const header = (r.header || "Authorization").trim();
        compiled.push({ marker: `${header}: Bearer `, mode: "whitespace", max_len });
        continue;
      }

      if (r.type === "header") {
        const header = (r.header || "").trim();
        if (!header) continue;
        compiled.push({ marker: `${header}: `, mode: "whitespace", max_len });
        continue;
      }

      if (r.type === "query_param") {
        const key = (r.key || "").trim();
        if (!key) continue;
        compiled.push({ marker: `${key}=`, mode: "set", stop_set: "& \t\r\n", max_len });
        continue;
      }

      if (r.type === "json_field") {
        const key = (r.key || "").trim();
        if (!key) continue;
        compiled.push({ marker: `"${key}":"`, mode: "char", stop_char: "\"", max_len });
        continue;
      }

      if (r.type === "custom") {
        const marker = (r.marker || "");
        if (!marker) continue;

        const mode = r.mode || "whitespace";
        const obj = { marker, mode, max_len };

        if (mode === "char") obj.stop_char = (r.stop_char || "").slice(0, 1) || "\"";
        if (mode === "set") obj.stop_set = r.stop_set || "& \t\r\n";

        compiled.push(obj);
      }
    }

    return compiled;
  };

  this.getRulesJson = () => JSON.stringify({ rules: this.compileRules() }, null, 2);

  this.syncRulesJson = () => {
    this.rulesJson = this.getRulesJson();
    this.refresh("rulesJson");
  };

  this.markDirty = () => {
    this.output = "";
    this.refresh("output");
    this.setStatus("Edited (click Run)");
    this.syncRulesJson();
  };

  this.run = () => {
    if (!this.mod) {
      this.setStatus("WASM not loaded");
      return;
    }

    try {
      const rulesJson = this.getRulesJson();
      this.output = this.mod.redact(this.input, rulesJson);
      this.refresh("output");
      this.setStatus("Ready");
      this.syncRulesJson();
    } catch (e) {
      this.output = "";
      this.refresh("output");
      this.setStatus(e?.message ? `Error: ${e.message}` : "Error");
      this.syncRulesJson();
    }
  };

  this.addRule = () => {
    this.rules.push({
      type: "query_param",
      header: "",
      key: "",
      marker: "",
      mode: "set",
      stop_char: "",
      stop_set: "& \t\r\n",
      max_len: 0,
    });
    this.updateRuleShades();
    this.refresh("rules");
    this.markDirty();
  };

  this.removeRule = (e, item) => {
    const idx = this.rules.indexOf(item);
    if (idx >= 0) this.rules.splice(idx, 1);
    this.updateRuleShades();
    this.refresh("rules");
    this.markDirty();
  };

  this.onTypeChange = (e, item) => {
    item.type = e.target.value;

    if (item.type === "json_field") {
      item.mode = "char";
      item.stop_char = "\"";
      item.stop_set = "";
    } else if (item.type === "query_param") {
      item.mode = "set";
      item.stop_set = "& \t\r\n";
      item.stop_char = "";
    } else {
      item.mode = "whitespace";
      item.stop_char = "";
      item.stop_set = "";
    }

    this.refresh("rules");
    this.markDirty();
  };

  this.toggleAdvanced = () => {
    this.showAdvanced = !this.showAdvanced;
    this.refresh("showAdvanced");
    this.syncRulesJson();
  };

  this.copyRulesJson = async () => {
    try {
      await navigator.clipboard.writeText(this.getRulesJson());
      this.setStatus("Rules JSON copied");
      setTimeout(() => this.setStatus("OK"), 700);
    } catch {
      this.setStatus("Copy failed");
    }
  };

  onload(async () => {
    try {
      this.mod = await createModule();
      this.setStatus("OK");
      this.syncRulesJson();
      this.run();
      this.paintRuleBoxes();
    } catch (e) {
      console.error(e);
      this.setStatus(e?.message ? `Failed to load WASM: ${e.message}` : "Failed to load WASM");
    }
  });

  return (render) => render`
    <div class="wrap">
      <div class="pane left">
        <div class="row" style="justify-content:space-between;">
          <div>
            <div style="font-weight:700;">Rules</div>
            <div class="muted">${this.status}</div>
          </div>
          <div class="row">
            <button class="btn" onclick="${this.addRule}">Add</button>
            <button class="btn" onclick="${this.run}">Run</button>
          </div>
        </div>

        <div style="margin-top:10px;">
          <div class="muted" style="margin-bottom:6px;">Presets</div>
          <div class="row" style="flex-wrap:no-wrap;">
            <button class="btn" onclick="${() => this.applyPreset("http_tokens")}">HTTP tokens</button>
            <button class="btn" onclick="${() => this.applyPreset("oauth_oidc")}">OAuth / OIDC</button>
            <button class="btn" onclick="${() => this.applyPreset("database_secrets")}">Database secrets</button>
            <button class="btn" onclick="${() => this.applyPreset("cloud_creds")}">Cloud creds</button>
          </div>

          <div class="row" style="flex-wrap:no-wrap;margin-top:8px;">
            <button class="btn" onclick="${() => this.applyPreset("spring_addons")}">Spring add-ons</button>
            <button class="btn" onclick="${() => this.applyPreset("django_addons")}">Django add-ons</button>
            <button class="btn" onclick="${() => this.applyPreset("rails_addons")}">Rails add-ons</button>
            <button class="btn" onclick="${() => this.applyPreset("laravel_addons")}">Laravel add-ons</button>
          </div>

          <div class="row" style="flex-wrap:-no-wrap;margin-top:8px;">
            <button class="btn" onclick="${() => this.applyPreset("spring_app_bundle")}">Spring app bundle</button>
          </div>
        </div>

        <div id="ruleList">
          <div :loop="${this.rules}">
            <div class="rule">
              <div class="row" style="justify-content:space-between;">
                <div class="muted">Rule</div>
                <button class="btn" onclick="${this.removeRule}">Remove</button>
              </div>

              <div style="margin-top:8px;">
                <div class="muted">Type</div>
                <select :bind="self.type" onchange="${this.onTypeChange}">
                  <option value="bearer_header">Bearer header</option>
                  <option value="header">Header value</option>
                  <option value="query_param">Query param</option>
                  <option value="json_field">JSON field</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div style="margin-top:8px;">
                <div class="muted">header (used by Bearer header / Header value)</div>
                <input :bind="self.header" placeholder="Authorization or X-Api-Key" oninput="${this.markDirty}" />
              </div>

              <div style="margin-top:8px;">
                <div class="muted">key (used by Query param / JSON field)</div>
                <input :bind="self.key" placeholder="api_key or token" oninput="${this.markDirty}" />
              </div>

              <div style="margin-top:8px;">
                <div class="muted">marker (Custom only)</div>
                <input :bind="self.marker" placeholder='e.g. "secret":"' oninput="${this.markDirty}" />
              </div>

              <div class="grid2" style="margin-top:8px;">
                <div>
                  <div class="muted">mode (Custom)</div>
                  <select :bind="self.mode" onchange="${this.markDirty}">
                    <option value="whitespace">whitespace</option>
                    <option value="char">char</option>
                    <option value="set">set</option>
                  </select>
                </div>
                <div>
                  <div class="muted">max_len (0=none)</div>
                  <input :bind="self.max_len" oninput="${this.markDirty}" />
                </div>
              </div>

              <div class="grid2" style="margin-top:8px;">
                <div>
                  <div class="muted">stop_char (Custom + mode=char)</div>
                  <input :bind="self.stop_char" oninput="${this.markDirty}" placeholder='"' />
                </div>
                <div>
                  <div class="muted">stop_set (Custom + mode=set)</div>
                  <input :bind="self.stop_set" oninput="${this.markDirty}" placeholder="& \t\r\n" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="row" style="margin-top:12px;">
          <button class="btn" onclick="${this.toggleAdvanced}">${this.showAdvanced ? "Hide JSON" : "Show JSON"}</button>
          <button class="btn" onclick="${this.copyRulesJson}">Copy JSON</button>
        </div>

        <div style="margin-top:10px;display:${this.showAdvanced ? "block" : "none"};">
          <div class="muted">Generated rules JSON</div>
          <textarea :bind="self.rulesJson" readonly style="margin-top:6px;height:240px;" class="mono"></textarea>
        </div>
      </div>

      <div class="pane right">
        <div class="row" style="justify-content:space-between;">
          <div style="font-weight:700;">Input → Output</div>
          <button class="btn" onclick="${this.run}">Run</button>
        </div>

        <div style="display:flex;gap:10px;flex:1;">
          <div style="flex:1;display:flex;flex-direction:column;">
            <div class="muted">Input</div>
            <textarea :bind="self.input" oninput="${this.markDirty}" style="flex:1;"></textarea>
          </div>

          <div style="flex:1;display:flex;flex-direction:column;">
            <div class="muted">Output</div>
            <textarea :bind="self.output" readonly style="flex:1;"></textarea>
          </div>
        </div>
      </div>
    </div>
  `;
}

lemonade.render(App, document.querySelector("#app"));
