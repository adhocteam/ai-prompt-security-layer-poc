"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redact = redact;
// src/redactor.ts
const REDACT = '[REDACTED]';
function isWsOrCtl(c) {
    return c.charCodeAt(0) <= 32;
}
function applyRule(s, r) {
    let i = 0;
    let result = s;
    while (true) {
        const pos = result.indexOf(r.marker, i);
        if (pos === -1)
            break;
        const start = pos + r.marker.length;
        let j = start;
        const limitReached = (jj) => r.maxLen !== undefined && jj - start >= r.maxLen;
        if (r.mode === 'char') {
            const stop = r.stopChar;
            while (j < result.length && result[j] !== stop) {
                j++;
                if (limitReached(j))
                    break;
            }
        }
        else if (r.mode === 'set') {
            const stopSet = r.stopSet;
            while (j < result.length && !stopSet.has(result[j])) {
                j++;
                if (limitReached(j))
                    break;
            }
        }
        else {
            while (j < result.length && !isWsOrCtl(result[j])) {
                j++;
                if (limitReached(j))
                    break;
            }
        }
        result = result.substring(0, start) + REDACT + result.substring(j);
        i = start + REDACT.length;
    }
    return result;
}
function maybeContainsAny(s, needles) {
    return needles.some(needle => s.includes(needle));
}
function prefilterFromRules(rules) {
    return rules.map(r => r.marker);
}
function redactTextWithRules(input, rules) {
    if (rules.length === 0)
        return input;
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
function ruleFromJson(it) {
    const r = {
        marker: it.marker || '',
        mode: it.mode || 'whitespace',
        maxLen: it.max_len || 0,
    };
    if (r.mode === 'char') {
        r.stopChar = it.stop_char;
    }
    else if (r.mode === 'set') {
        r.stopSet = new Set(it.stop_set.split(''));
    }
    return r;
}
function rulesFromJsonString(rulesJson) {
    if (!rulesJson)
        return [];
    try {
        const j = JSON.parse(rulesJson);
        return j.rules ? j.rules.map(ruleFromJson) : [];
    }
    catch (e) {
        console.error('Failed to parse rules JSON:', e);
        return [];
    }
}
function redact(input, rulesJson) {
    const rules = rulesFromJsonString(rulesJson);
    return redactTextWithRules(input, rules);
}
//# sourceMappingURL=redactor.js.map