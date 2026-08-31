// agent-honeypot-detector — logica pura de deteccao de honeypots para agentes de IA
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

// ─── Parser HTML minimo ───────────────────────────────────────────────────────

function parse(html) {
  const tokens = [];
  let i = 0;
  const len = html.length;

  while (i < len) {
    if (html[i] === '<') {
      // Comentario HTML
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        const commentEnd = end === -1 ? len : end;
        tokens.push({ type: 'comment', text: html.slice(i + 4, commentEnd), raw: html.slice(i, commentEnd + 3) });
        i = commentEnd + 3;
        continue;
      }

      // Closing tag
      if (html[i + 1] === '/') {
        const m = html.slice(i).match(/^<\/([a-zA-Z][a-zA-Z0-9]*)\s*>/);
        if (m) {
          tokens.push({ type: 'close', tag: m[1].toLowerCase(), raw: m[0] });
          i += m[0].length;
          continue;
        }
      }

      // Self-closing ou opening tag
      const m = html.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9]*)([\s\S]*?)(\/?)>/);
      if (m) {
        const tag = m[1].toLowerCase();
        const attrStr = m[2];
        const selfClose = m[3] === '/';
        const attrs = parseAttrs(attrStr);
        tokens.push({ type: 'open', tag, attrs, selfClose, raw: m[0] });
        i += m[0].length;
        continue;
      }

      // Treat malformed < as text
      tokens.push({ type: 'text', text: '<' });
      i++;
    } else {
      // Texto ate o proximo <
      const next = html.indexOf('<', i);
      const end = next === -1 ? len : next;
      const text = html.slice(i, end);
      if (text) tokens.push({ type: 'text', text });
      i = end;
    }
  }
  return tokens;
}

function parseAttrs(str) {
  const attrs = {};
  let i = 0;
  while (i < str.length) {
    // pular espaco
    while (i < str.length && /\s/.test(str[i])) i++;
    if (i >= str.length) break;

    // nome do atributo
    let name = '';
    while (i < str.length && /[a-zA-Z0-9_:.-]/.test(str[i])) {
      name += str[i++];
    }
    if (!name) { i++; continue; }

    // pular =
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str[i] !== '=') { attrs[name] = ''; continue; }
    i++; // pular =

    // valor
    while (i < str.length && /\s/.test(str[i])) i++;
    let value = '';
    if (str[i] === '"' || str[i] === "'") {
      const q = str[i++];
      while (i < str.length && str[i] !== q) value += str[i++];
      i++; // pular quote
    } else {
      while (i < str.length && !/[\s>]/.test(str[i])) value += str[i++];
    }
    attrs[name.toLowerCase()] = value;
  }
  return attrs;
}

// ─── Coleta de dados do HTML ──────────────────────────────────────────────────

function collectData(html) {
  const tokens = parse(html);
  const elements = [];
  const comments = [];
  const metaTags = [];
  const jsonLdBlocks = [];
  let allText = '';
  let visibleText = '';
  let insideHidden = false;

  const stack = [];
  const hiddenStack = [];

  function getStyle(attrs) {
    const style = attrs.style || '';
    const parsed = {};
    for (const decl of style.split(';')) {
      const colon = decl.indexOf(':');
      if (colon === -1) continue;
      const prop = decl.slice(0, colon).trim().toLowerCase();
      const val = decl.slice(colon + 1).trim().toLowerCase();
      if (prop) parsed[prop] = val;
    }
    return parsed;
  }

  function isHiddenByStyle(attrs) {
    const s = getStyle(attrs);
    if (s.display === 'none') return true;
    if (s.visibility === 'hidden') return true;
    if (s.opacity === '0' || s.opacity === '0.0') return true;
    if (s['font-size'] === '0' || s['font-size'] === '0px' || s['font-size'] === '0em') return true;
    if (s['font-size'] === '0.0' || s['font-size'] === '0pt' || s['font-size'] === '0%') return true;
    if (s.left && /^-/.test(s.left) && /px|em|rem|pt/.test(s.left)) return true;
    if (s.top && /^-/.test(s.top) && /px|em|rem|pt/.test(s.top)) return true;
    if (s.position === 'absolute' || s.position === 'fixed') {
      if (s.left && /^-/.test(s.left)) return true;
      if (s.top && /^-/.test(s.top)) return true;
      if (s.right && /^-/.test(s.right)) return true;
      if (s.bottom && /^-/.test(s.bottom)) return true;
    }
    return false;
  }

  for (const tok of tokens) {
    if (tok.type === 'comment') {
      comments.push(tok.text);
      continue;
    }

    if (tok.type === 'open') {
      stack.push(tok);

      const hiddenByStyle = isHiddenByStyle(tok.attrs);
      const hiddenByAttr = tok.attrs.hidden !== undefined ||
        (tok.attrs['aria-hidden'] === 'true');
      hiddenStack.push(insideHidden || hiddenByStyle || hiddenByAttr);

      if (tok.attrs.style && tok.attrs.style.toLowerCase().includes('color')) {
        // check background match later
      }

      if (tok.tag === 'meta') {
        metaTags.push(tok.attrs);
      }
      if (tok.tag === 'script' && (tok.attrs.type === 'application/ld+json' || tok.attrs.type === 'application/json')) {
        jsonLdBlocks.push({ attrs: tok.attrs });
      }
    }

    if (tok.type === 'close') {
      if (stack.length > 0) stack.pop();
      if (hiddenStack.length > 0) hiddenStack.pop();
      insideHidden = hiddenStack.length > 0 ? hiddenStack[hiddenStack.length - 1] : false;
    }

    if (tok.type === 'text') {
      const text = tok.text;
      allText += text;
      if (!insideHidden) {
        visibleText += text;
      }
    }

    if (hiddenStack.length > 0) {
      insideHidden = hiddenStack[hiddenStack.length - 1];
    }
  }

  return { tokens, elements, comments, metaTags, jsonLdBlocks, allText, visibleText, html };
}

// ─── Regra 1: Instrucao direcionada a agente em texto invisivel ───────────────

function rule1_hiddenInstructions(data) {
  const findings = [];
  const tokens = data.tokens;
  const stack = [];
  let hiddenByStyle = false;

  for (const tok of tokens) {
    if (tok.type === 'open') {
      stack.push(tok);
      const s = getStyleObj(tok.attrs.style || '');

      hiddenByStyle = false;
      if (s.display === 'none') hiddenByStyle = true;
      if (s.visibility === 'hidden') hiddenByStyle = true;
      if (s.opacity === '0' || s.opacity === '0.0') hiddenByStyle = true;
      if (/font-size:\s*(0|0\.0|0px|0em|0rem|0pt|0%)/.test(tok.attrs.style || '')) hiddenByStyle = true;
      if (s.position === 'absolute' || s.position === 'fixed') {
        if (/^-\d/.test(s.left || '')) hiddenByStyle = true;
        if (/^-\d/.test(s.top || '')) hiddenByStyle = true;
        if (/^-\d/.test(s.right || '')) hiddenByStyle = true;
        if (/^-\d/.test(s.bottom || '')) hiddenByStyle = true;
      }
      if (tok.attrs.hidden !== undefined || tok.attrs['aria-hidden'] === 'true') {
        hiddenByStyle = true;
      }
      // verbatim class matches (no CSS parsing)
      if ((tok.attrs.class || '').match(/visually-hidden|sr-only|offscreen|screenreader|clip-path|hide/)) {
        hiddenByStyle = true;
      }
      // em tt sem styles mas que estao na head
      if (tok.tag === 'head' || tok.tag === 'script' || tok.tag === 'style') {
        hiddenByStyle = true;
      }
      continue;
    }

    if (tok.type === 'close') {
      if (stack.length) stack.pop();
      if (stack.length === 0) hiddenByStyle = false;
      continue;
    }

    if (tok.type === 'text' && hiddenByStyle) {
      const text = tok.text.trim();
      if (text.length < 3) continue;
      if (looksLikeInstruction(text)) {
        findings.push({ text: text.slice(0, 200), snippet: tok.text.slice(0, 200) });
      }
    }
  }

  let score = 0;
  if (findings.length >= 3) score = 100;
  else if (findings.length === 2) score = 70;
  else if (findings.length === 1) score = 45;
  else score = 0;

  return { name: 'hidden_instructions', score, findings, description: 'Instrucao direcionada a agente em texto invisivel (display:none, visibility:hidden, opacity:0, font-size:0, offscreen)' };
}

function getStyleObj(styleStr) {
  const obj = {};
  for (const decl of styleStr.split(';')) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim().toLowerCase();
    if (prop) obj[prop] = val;
  }
  return obj;
}

// ─── Regra 2: Comentario HTML falando com o agente ────────────────────────────

function rule2_agentComments(data) {
  const findings = [];
  for (const comment of data.comments) {
    const lower = comment.toLowerCase();
    if (looksLikeAgentDirective(comment)) {
      findings.push({ text: comment.trim().slice(0, 200) });
    }
  }

  let score = 0;
  if (findings.length >= 3) score = 100;
  else if (findings.length === 2) score = 65;
  else if (findings.length === 1) score = 40;
  else score = 0;

  return { name: 'agent_comments', score, findings, description: 'Texto dentro de comentario HTML falando com o agente de IA' };
}

// ─── Regra 3: Divergencia visivel vs total ────────────────────────────────────

function rule3_divergence(data) {
  const totalLen = data.allText.replace(/\s+/g, '').length;
  const visibleLen = data.visibleText.replace(/\s+/g, '').length;

  if (totalLen === 0) return { name: 'divergence', score: 0, findings: [], description: 'Divergencia entre texto visivel e total', visibleLen, totalLen, ratio: 0 };

  const ratio = visibleLen / totalLen;
  const hiddenPct = Math.round((1 - ratio) * 100);

  const findings = [];
  if (hiddenPct > 5) {
    findings.push({ hiddenPercent: hiddenPct, totalChars: totalLen, visibleChars: visibleLen });
  }

  let score = 0;
  if (hiddenPct >= 50) score = 100;
  else if (hiddenPct >= 30) score = 75;
  else if (hiddenPct >= 15) score = 50;
  else if (hiddenPct >= 5) score = 25;
  else score = 0;

  return { name: 'divergence', score, findings, description: 'Divergencia entre o que o humano ve e o que o parser le', visibleLen, totalLen, hiddenPct };
}

// ─── Regra 4: Atributos suspeitos ─────────────────────────────────────────────

function rule4_suspiciousAttrs(data) {
  const findings = [];
  const suspectAttrs = ['aria-label', 'alt', 'title', 'data-tooltip', 'data-tip'];

  for (const tok of data.tokens) {
    if (tok.type !== 'open') continue;
    for (const attr of suspectAttrs) {
      const val = tok.attrs[attr];
      if (!val) continue;
      if (looksLikeInstruction(val)) {
        findings.push({ attribute: attr, value: val.slice(0, 200), tag: tok.tag });
      }
    }
  }

  let score = 0;
  if (findings.length >= 3) score = 100;
  else if (findings.length === 2) score = 65;
  else if (findings.length === 1) score = 40;
  else score = 0;

  return { name: 'suspicious_attrs', score, findings, description: 'Atributo suspeito (aria-label, alt, title) carregando ordem em vez de descricao' };
}

// ─── Regra 5: Meta/JSON-LD com instrucao imperativa ──────────────────────────

function rule5_metaImperatives(data) {
  const findings = [];

  for (const meta of data.metaTags) {
    for (const key of ['content', 'name', 'property', 'http-equiv']) {
      const val = meta[key];
      if (val && looksLikeInstruction(val)) {
        findings.push({ source: 'meta', key, value: val.slice(0, 200) });
      }
    }
  }

  // JSON-LD: extrair texto do HTML ate achar fechamento
  const ldPattern = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldPattern.exec(data.html)) !== null) {
    const content = m[1];
    if (looksLikeInstruction(content)) {
      findings.push({ source: 'json-ld', value: content.slice(0, 200) });
    }
  }

  let score = 0;
  if (findings.length >= 2) score = 100;
  else if (findings.length === 1) score = 55;
  else score = 0;

  return { name: 'meta_imperatives', score, findings, description: 'Meta tag ou JSON-LD contendo instrucao imperativa' };
}

// ─── Regra 6: Caractere de largura zero ou BiDi override ─────────────────────

function rule6_zeroWidth(data) {
  const findings = [];
  const text = data.html;

  // zero-width chars
  const zwChars = /[\u200B\u200C\u200D\uFEFF]/g;
  let m;
  while ((m = zwChars.exec(text)) !== null) {
    const ctx = text.slice(Math.max(0, m.index - 30), m.index + 31);
    findings.push({ char: `U+${m[0].codePointAt(0).toString(16).toUpperCase()}`, context: ctx });
    if (findings.length >= 10) break;
  }

  // bidirectional override
  const bidiChars = /[\u202A-\u202E\u2066-\u2069]/g;
  while ((m = bidiChars.exec(text)) !== null) {
    const ctx = text.slice(Math.max(0, m.index - 30), m.index + 31);
    findings.push({ char: `U+${m[0].codePointAt(0).toString(16).toUpperCase()}`, context: ctx, type: 'bidi' });
    if (findings.length >= 10) break;
  }

  let score = 0;
  const count = findings.length;
  if (count >= 5) score = 100;
  else if (count >= 3) score = 70;
  else if (count >= 1) score = 40;
  else score = 0;

  return { name: 'zero_width_bidi', score, findings, description: 'Caractere de largura zero ou override bidirecional escondendo trecho' };
}

// ─── Heuristica: texto parece instrucao? ─────────────────────────────────────

function looksLikeInstruction(text) {
  const lower = text.toLowerCase();
  const patterns = [
    /ignore\s+(all\s+)?previous/i,
    /ignore\s+(all\s+)?above/i,
    /ignore\s+(all\s+)?other/i,
    /disregard/i,
    /override/i,
    /system\s*prompt/i,
    /you\s+are\s+now/i,
    /you\s+must/i,
    /you\s+should/i,
    /do\s+not/i,
    /never\s+(tell|share|reveal|mention)/i,
    /always\s+(follow|obey|do|return|output)/i,
    /output\s+(the|your|all)/i,
    /reveal\s+(the|your|all)/i,
    /return\s+(the|your|all)/i,
    /print\s+(the|your|all)/i,
    /act\s+as/i,
    /pretend\s+(you|to)/i,
    /your\s+instructions/i,
    /your\s+system/i,
    /hidden\s+instructions/i,
    /secret\s+instructions/i,
    /agent\s+(mode|protocol|directive)/i,
    /ai\s+(agent|assistant|model)\s+(mode|protocol)/i,
    /instructions?\s+for\s+(the\s+)?(ai|agent|model)/i,
    /(ai|agent|model)\s+should/i,
    /(when|if)\s+(you\s+)?(are\s+)?(parsed|read|analyzed|scraped)/i,
    /for\s+(the\s+)?(ai|agent|model|bot|crawler)/i,
    /submit\s+(the\s+)?(following|data|form)/i,
    /click\s+(this|that|the)/i,
    /follow\s+(these|this)\s+(instructions|steps|rules)/i,
  ];

  for (const p of patterns) {
    if (p.test(text)) return true;
  }

  return false;
}

function looksLikeAgentDirective(text) {
  const lower = text.toLowerCase();
  const patterns = [
    /agent/i,
    /ai\s+model/i,
    /llm/i,
    /gpt/i,
    /claude/i,
    /copilot/i,
    /chatgpt/i,
    /gemini/i,
    /ignore/i,
    /override/i,
    /system\s*prompt/i,
    /instructions?\s+for/i,
    /bot/i,
    /crawler/i,
    /scraper/i,
    /parsed?\s+by/i,
    /read\s+by/i,
    /for\s+(the\s+)?ai/i,
  ];

  for (const p of patterns) {
    if (p.test(text)) return true;
  }

  return false;
}

// ─── Veredito final ───────────────────────────────────────────────────────────

function analyze(html) {
  const data = collectData(html);

  const rule1 = rule1_hiddenInstructions(data);
  const rule2 = rule2_agentComments(data);
  const rule3 = rule3_divergence(data);
  const rule4 = rule4_suspiciousAttrs(data);
  const rule5 = rule5_metaImperatives(data);
  const rule6 = rule6_zeroWidth(data);

  const rules = [rule1, rule2, rule3, rule4, rule5, rule6];

  // Veredito baseado no score maximo + numero de sinais ativos
  const maxScore = Math.max(...rules.map(r => r.score));
  const activeCount = rules.filter(r => r.score > 0).length;

  let verdict;
  if (activeCount >= 3 && maxScore >= 60) {
    verdict = 'hostil';
  } else if (maxScore >= 40 || activeCount >= 2) {
    verdict = 'suspeito';
  } else {
    verdict = 'confiavel';
  }

  // Qual trecho causou
  const triggers = [];
  for (const r of rules) {
    if (r.score > 0 && r.findings.length > 0) {
      for (const f of r.findings) {
        triggers.push({
          rule: r.name,
          score: r.score,
          ...f,
        });
      }
    }
  }

  return {
    verdict,
    rules: rules.map(r => ({
      name: r.name,
      score: r.score,
      description: r.description,
      findings: r.findings,
    })),
    triggers,
    meta: {
      totalChars: data.allText.length,
      visibleChars: data.visibleText.length,
      commentCount: data.comments.length,
      metaCount: data.metaTags.length,
    },
  };
}

export {
  parse,
  collectData,
  rule1_hiddenInstructions,
  rule2_agentComments,
  rule3_divergence,
  rule4_suspiciousAttrs,
  rule5_metaImperatives,
  rule6_zeroWidth,
  looksLikeInstruction,
  looksLikeAgentDirective,
  analyze,
};
