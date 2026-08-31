// rag-expiration-engine — logica pura de TTL e validade temporal
// Gerado por: opencode/mimo-v2.5-free em 2026-08-30. Sem dependencias externas.

const CONTENT_POLICY = {
  preco: { defaultTTL: "30d", description: "precisam de atualizacao frecuente" },
  versao: { defaultTTL: "6m", description: "versoes mudam com releases" },
  "versao de software": { defaultTTL: "6m", description: "versoes mudam com releases" },
  definicao: { defaultTTL: null, description: "nao vencem (conceito estavel)" },
  "definicao conceitual": { defaultTTL: null, description: "nao vencem (conceito estavel)" },
  conceito: { defaultTTL: null, description: "nao vencem (conceito estavel)" },
  tutorial: { defaultTTL: "1y", description: "mudam devagar" },
  "nota de release": { defaultTTL: "6m", description: "sao substituidas por versoes novas" },
  changelog: { defaultTTL: "6m", description: "sao substituidos por versoes novas" },
  contato: { defaultTTL: "1y", description: "mudam devagar" },
  politica: { defaultTTL: "1y", description: "mudam devagar" },
  default: { defaultTTL: "6m", description: "politica geral" },
};

/**
 * Parseia uma string de TTL em milissegundos.
 * Formatos aceitos: "30d", "6m", "1y", "90d", "2y", etc.
 * Tambem aceita datas ISO absolutas (ex: "2026-12-31").
 * @param {string} ttl
 * @param {Date} [referenceDate] - data de referencia para TTL relativo
 * @returns {number|null} milissegundos ou null se for data absoluta futura
 */
export function parseTTL(ttl, referenceDate) {
  if (ttl === null || ttl === undefined) return null;

  // Se for formato relativo (Xn)
  const match = String(ttl).match(/^(\d+)([dmy])$/i);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const now = referenceDate || new Date();
    const ms = now.getTime();
    switch (unit) {
      case "d": return value * 24 * 60 * 60 * 1000;
      case "m": return value * 30 * 24 * 60 * 60 * 1000;
      case "y": return value * 365 * 24 * 60 * 60 * 1000;
    }
  }

  // Se for data ISO absoluta
  const parsed = new Date(ttl);
  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return null;
}

/**
 * Decide se um documento esta valido em relacao a uma data de referencia.
 * Funcao pura: nao le o relogio internamente.
 * @param {string|null} expiresAt - data ISO de expiracao ou null (sem validade)
 * @param {Date} referenceDate - data de referencia (obrigatoria)
 * @returns {{ valid: boolean, status: string, daysLeft: number|null }}
 */
export function checkValidity(expiresAt, referenceDate) {
  if (expiresAt === null || expiresAt === undefined) {
    return { valid: true, status: "no_expiry", daysLeft: null };
  }

  const expDate = new Date(expiresAt);
  if (isNaN(expDate.getTime())) {
    return { valid: true, status: "no_expiry", daysLeft: null };
  }

  const diffMs = expDate.getTime() - referenceDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { valid: false, status: "expired", daysLeft: diffDays };
  }
  if (diffDays === 0) {
    return { valid: false, status: "expires_today", daysLeft: 0 };
  }
  return { valid: true, status: "valid", daysLeft: diffDays };
}

/**
 * Retorna a politica padrao para um tipo de conteudo.
 * @param {string} contentType
 * @returns {{ defaultTTL: string|null, description: string }}
 */
export function getContentPolicy(contentType) {
  const key = (contentType || "").toLowerCase().trim();
  return CONTENT_POLICY[key] || CONTENT_POLICY.default;
}

/**
 * Calcula a data de expiracao a partir de um TTL e uma data de referencia.
 * @param {string} ttl
 * @param {Date} referenceDate
 * @returns {string|null} ISO string da data de expiracao
 */
export function computeExpiration(ttl, referenceDate) {
  if (ttl === null || ttl === undefined) return null;
  const ms = parseTTL(ttl, referenceDate);
  if (ms === null) return null;
  // Se for TTL relativo, soma
  const match = String(ttl).match(/^(\d+)([dmy])$/i);
  if (match) {
    return new Date(referenceDate.getTime() + ms).toISOString();
  }
  // Se for data absoluta
  return new Date(ms).toISOString();
}

export { CONTENT_POLICY };
