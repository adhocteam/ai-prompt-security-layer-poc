// src/redactor.ts
const REDACT = '[REDACTED]';

interface Rule {
  marker: string;
  mode: 'whitespace' | 'char' | 'set';
  stopChar?: string;
  stopSet?: Set<string>;
  maxLen?: number;
}

function isWsOrCtl(c: string): boolean {
  return c.charCodeAt(0) <= 32;
}

function applyRule(s: string, r: Rule): string {
  let i = 0;
  let result = s;

  while (true) {
    const pos = result.indexOf(r.marker, i);
    if (pos === -1) break;

    const start = pos + r.marker.length;
    let j = start;

    const limitReached = (jj: number) => r.maxLen !== undefined && jj - start >= r.maxLen;

    if (r.mode === 'char') {
      const stop = r.stopChar!;
      while (j < result.length && result[j] !== stop) {
        j++;
        if (limitReached(j)) break;
      }
    } else if (r.mode === 'set') {
      const stopSet = r.stopSet!;
      while (j < result.length && !stopSet.has(result[j])) {
        j++;
        if (limitReached(j)) break;
      }
    } else {
      while (j < result.length && !isWsOrCtl(result[j])) {
        j++;
        if (limitReached(j)) break;
      }
    }

    result = result.substring(0, start) + REDACT + result.substring(j);
    i = start + REDACT.length;
  }

  return result;
}

function maybeContainsAny(s: string, needles: string[]): boolean {
  return needles.some(needle => s.includes(needle));
}

function prefilterFromRules(rules: Rule[]): string[] {
  return rules.map(r => r.marker);
}

function redactTextWithRules(input: string, rules: Rule[]): string {
  if (rules.length === 0) return input;

  const prefilter = prefilterFromRules(rules);
  const lines = input.split('\n');
  const redactedLines = lines.map(line => {
    if (maybeContainsAny(line, prefilter)) {
      return rules.reduce((acc, r) => applyRule(acc, r), line);
    }
    return line;
  });

  return redactedLines.join('\n');
}

function ruleFromJson(it: any): Rule {
  const r: Rule = {
    marker: it.marker || '',
    mode: it.mode || 'whitespace',
    maxLen: it.max_len || 0,
  };

  if (r.mode === 'char') {
    r.stopChar = it.stop_char;
  } else if (r.mode === 'set') {
    r.stopSet = new Set(it.stop_set.split(''));
  }

  return r;
}

function rulesFromJsonString(rulesJson: string): Rule[] {
  if (!rulesJson) return [];
  try {
    const j = JSON.parse(rulesJson);
    return j.rules ? j.rules.map(ruleFromJson) : [];
  } catch (e) {
    console.error('Failed to parse rules JSON:', e);
    return [];
  }
}

export function redact(input: string, rulesJson: string): string {
  const rules = rulesFromJsonString(rulesJson);
  return redactTextWithRules(input, rules);
}
