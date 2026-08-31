// skill-poison-detector — regras de detecção de poison em skills
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependências externas.

/**
 * Cada regra é um objeto { id, severity, test }.
 * - id: identificador único da família
 * - severity: "alta" | "média" | "baixa"
 * - test: fn(linha: string) => { match: boolean, snippet?: string }
 *
 * A enumeração de regras fica AQUI como DADO, não espalhada pelo código.
 */

function makeRegex(pattern, flags) {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

const RULES = [
  {
    id: "INJECAO-REGRAS",
    severity: "alta",
    test(line) {
      const patterns = [
        /ignore\s+(all\s+)?previous\s+instructions/i,
        /ignore\s+(all\s+)?prior\s+instructions/i,
        /disregard\s+(all\s+)?previous/i,
        /disregard\s+(all\s+)?prior/i,
        /forget\s+(all\s+)?previous/i,
        /override\s+all\s+previous/i,
        /sobrescreva?\s+regras\s+anteriores/i,
        /ignore\s+as\s+regras/i,
        /ignore\s+all\s+rules/i,
        /não\s+obedeça\s+a/i,
        /nao\s+obedeca\s+a/i,
        /you\s+are\s+now\s+a/i,
        /você\s+agora\s+é/i,
        /voce\s+agora\s+eh/i,
        /act\s+as\s+if\s+no\s+rules/i,
        /override\s+safety/i,
        /bypass\s+safety/i,
        /skip\s+safety/i,
      ];
      for (const p of patterns) {
        const m = line.match(p);
        if (m) return { match: true, snippet: m[0] };
      }
      return { match: false };
    },
  },
  {
    id: "LEITURA-SEGREDO",
    severity: "alta",
    test(line) {
      const patterns = [
        /read\s+.*\.env\b/i,
        /read\s+.*\.env\b/i,
        /ler\s+.*\.env\b/i,
        /read\s+.*id_rsa/i,
        /read\s+.*private[_-]?key/i,
        /read\s+.*\.pem\b/i,
        /read\s+.*credentials/i,
        /read\s+.*token/i,
        /read\s+.*api[_-]?key/i,
        /read\s+.*secret/i,
        /ler\s+.*chave\s+privada/i,
        /ler\s+.*credencial/i,
        /ler\s+.*token/i,
        /cat\s+.*\.env\b/i,
        /cat\s+.*id_rsa/i,
        /cat\s+.*\.pem\b/i,
        /printenv/i,
        /env\s*\|\s*grep/i,
        /dotenv.*read/i,
        /load.*env\b.*secret/i,
        /leia\s+.*chave/i,
        /access\s+.*\.ssh/i,
        /readfile.*\.ssh/i,
        /ler.*arquivo.*segredo/i,
      ];
      for (const p of patterns) {
        const m = line.match(p);
        if (m) return { match: true, snippet: m[0] };
      }
      return { match: false };
    },
  },
  {
    id: "COMANDO-DESTRUTIVO",
    severity: "alta",
    test(line) {
      const patterns = [
        /\brm\s+-rf\b/i,
        /\brm\s+(-r\s+)?-[a-z]*f/i,
        /\bRemove-Item\s+-Recurse\b/i,
        /\bRemove-Item\s+.*-Force\b/i,
        /\bformat\s+[a-z]:\\/i,
        /\bmkfs\b/i,
        /\bdd\s+if=/i,
        /\bgit\s+reset\s+--hard\b/i,
        /\bgit\s+clean\s+-[a-z]*f\b/i,
        /\bgit\s+push\s+--force\b/i,
        /\bgit\s+push\s+-f\b/i,
        /\bdrop\s+table\b/i,
        /\bdelete\s+from\b/i,
        /\btruncate\s+table\b/i,
        /\bdrop\s+database\b/i,
        /\bpor\s+\.\s*\bi/i,
        /\bpor\s+\.\s*\*/i,
        /\bdelete\s+\*\s+from/i,
        /\brmdir\s+\/s\b/i,
        /\brmdir\s+\/q\b/i,
        /\bFormat-Volume\b/i,
        /\bclear[- ]disk/i,
        /\bwipe\b/i,
        /\bshred\b/i,
        /\bsudo\s+rm\b/i,
      ];
      for (const p of patterns) {
        const m = line.match(p);
        if (m) return { match: true, snippet: m[0] };
      }
      return { match: false };
    },
  },
  {
    id: "EXFILTRACAO",
    severity: "alta",
    test(line) {
      const patterns = [
        /\bfetch\s*\(/i,
        /\bhttp\.request\b/i,
        /\bhttps\.request\b/i,
        /\baxios\b/i,
        /\bcurl\b.*\s+-[A-Z]*d\b/i,
        /\bcurl\b.*\s+--data/i,
        /\bcurl\b.*\s+-X\s+POST/i,
        /\bwget\b.*\s+--post/i,
        /\bwebhook\b/i,
        /\bhttps?:\/\/[^\s]*webhook/i,
        /\bhttps?:\/\/[^\s]*exfil/i,
        /\bupload\b.*\bhttp/i,
        /\bsend\s+to\s+server/i,
        /\benviar\s+para\s+servidor/i,
        /\bhttp\.get\s*\(\s*['"]/i,
        /\bfetch\s*\(\s*['"]/i,
        /\brequests?\.\s*(?:post|get)\s*\(\s*['"]/i,
        /\bXMLHttpRequest\b/i,
        /\bnew\s+WebSocket\b/i,
        /\bsend\s+data\s+to\b/i,
        /\benvie\s+dados\s+para\b/i,
      ];
      for (const p of patterns) {
        const m = line.match(p);
        if (m) return { match: true, snippet: m[0] };
      }
      return { match: false };
    },
  },
  {
    id: "TEXTO-ESCONDIDO",
    severity: "alta",
    test(line) {
      const zwChars = /[\u200B\u200C\u200D\uFEFF]/;
      const bidiOverride = /[\u202A-\u202E]/;
      const htmlComment = /<!--[\s\S]*?-->/i;
      const whiteTextHtml = /color\s*:\s*#fff(?:fff)?|color\s*:\s*white|color\s*:\s*transparent/i;
      const hiddenDisplay = /display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0(?:\.0+)?/i;

      if (zwChars.test(line)) {
        return { match: true, snippet: "caractere de largura zero detectado" };
      }
      if (bidiOverride.test(line)) {
        return { match: true, snippet: "override bidirecional detectado" };
      }
      const htmlMatch = line.match(htmlComment);
      if (htmlMatch) {
        const comment = htmlMatch[0];
        const hasInstruction = /ignore|override|bypass|sobrescreva|ignore.*rules|ignore.*instructions/i;
        if (hasInstruction.test(comment)) {
          return { match: true, snippet: `comentário HTML com instrução: ${comment.slice(0, 80)}` };
        }
      }
      if (whiteTextHtml.test(line) && hiddenDisplay.test(line)) {
        return { match: true, snippet: "texto potencialmente oculto (cor + display:none)" };
      }
      return { match: false };
    },
  },
  {
    id: "BASE64-SUSPEITO",
    severity: "média",
    test(line) {
      const b64Pattern = /(?:base64\s*[,:]\s*|(?:data|src)\s*=\s*["']?data:[^"']*;base64,)([A-Za-z0-9+/=]{100,})/i;
      const m = line.match(b64Pattern);
      if (m) {
        return { match: true, snippet: `bloco base64 de ${m[1].length} caracteres` };
      }
      return { match: false };
    },
  },
  {
    id: "LINK-NAO-CONFIAVEL",
    severity: "média",
    test(line) {
      const urlPattern = /https?:\/\/[^\s"'<>)}\]]+/gi;
      const suspicious = [
        /\.tk\b/i, /\.ml\b/i, /\.ga\b/i, /\.cf\b/i, /\.gq\b/i,
        /bit\.ly/i, /tinyurl\.com/i, /goo\.gl/i, /t\.co/i,
        /is\.gd/i, /v\.gd/i, /shorte\.st/i,
        /\.ngrok\.io/i, /\.localtunnel\b/i,
        /trycloudflare\.com/i,
      ];
      const m = line.match(urlPattern);
      if (m) {
        for (const url of m) {
          for (const s of suspicious) {
            if (s.test(url)) {
              return { match: true, snippet: url.slice(0, 80) };
            }
          }
        }
      }
      return { match: false };
    },
  },
];

export { RULES };
