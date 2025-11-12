type ClaimVerdict = "verified" | "misleading" | "false";

interface ClaimAnalysis {
  text: string;
  veracity: number;
  verdict: ClaimVerdict;
  explanation: string;
}

export interface ClassificationOptions {
  keywords?: string[];
  sentimentScore?: number;
  readabilityScore?: number;
  entityCount?: number;
  wordCount?: number;
  biasScore?: number; // ✅ Added
  sensationalismScore?: number; // ✅ Added
  entityConsistencyScore?: number; // ✅ Added
}

export interface ClassificationResult {
  credibilityScore: number;
  confidence: number;
  factualScoreNormalized: number;
  evidenceScoreNormalized: number;
  emotionalScoreNormalized: number;
  biasScoreNormalized: number;
  claimsAnalysis: ClaimAnalysis[];
  category: string;
}

export async function classifyText(
  text: string,
  source?: string,
  options?: ClassificationOptions
): Promise<ClassificationResult> {
  try {
    const result = simulateModelPrediction(text, options);
    const adjustedScore = adjustScoreBySource(result.credibilityScore, source);

    return {
      credibilityScore: adjustedScore,
      confidence: result.confidence,
      factualScoreNormalized: result.factual,
      evidenceScoreNormalized: result.evidence,
      emotionalScoreNormalized: result.emotional,
      biasScoreNormalized: result.bias,
      claimsAnalysis: analyzeClaims(text),
      category: determineCategory(adjustedScore)
    };
  } catch (error) {
    console.error("Error classifying text:", error);
    return {
      credibilityScore: 0.5,
      confidence: 0.6,
      factualScoreNormalized: 0.5,
      evidenceScoreNormalized: 0.5,
      emotionalScoreNormalized: 0.5,
      biasScoreNormalized: 0.5,
      claimsAnalysis: [],
      category: "potentially_misleading"
    };
  }
}

function simulateModelPrediction(
  text: string,
  options?: ClassificationOptions
) {
  const lowerText = text.toLowerCase();

  const sensationalistTerms = ['shocking', 'bombshell', 'mind-blowing', 'you won\'t believe', 'breaking'];
  const factualTerms = ['according to', 'study shows', 'data from', 'research indicates'];
  const evidenceTerms = ['study', 'research', 'scientist', 'citation'];
  const emotionalTerms = ['terrible', 'amazing', 'disaster', 'miracle'];
  const biasTerms = ['must', 'should', 'only', 'never'];
  const conspiracyTerms = ['cover-up', 'secret', 'truth they hide'];
  const antiScienceTerms = ['science is wrong', 'experts are lying'];

  const getScore = (terms: string[], multiplier = 0.05) =>
    terms.reduce((score, term) => score + (lowerText.includes(term) ? multiplier : 0), 0);

  const factualScore = getScore(factualTerms, 0.06);
  const evidenceScore = getScore(evidenceTerms, 0.05);
  const sensationalScore = getScore(sensationalistTerms, 0.05);
  const emotionalScore = getScore(emotionalTerms, 0.05);
  const biasScore = getScore(biasTerms, 0.04);
  const conspiracyScore = getScore(conspiracyTerms, 0.06);
  const antiScienceScore = getScore(antiScienceTerms, 0.05);

  let keywordPenalty = 0;
  if (options?.keywords?.length) {
    const suspiciousKeywords = ['hoax', 'exposed', 'truth', 'agenda', 'lies'];
    keywordPenalty = options.keywords.reduce((sum, kw) =>
      sum + (suspiciousKeywords.includes(kw.toLowerCase()) ? 0.03 : 0), 0);
  }

  const emotionalPenalty = options?.sentimentScore ? options.sentimentScore * 0.1 : 0;
  const readabilityBoost = options?.readabilityScore && options.readabilityScore > 60 ? 0.05 : 0;
  const entityBoost = options?.entityCount ? Math.min(0.1, options.entityCount * 0.01) : 0;
  const lengthBoost = options?.wordCount && options.wordCount > 500 ? 0.05 : 0;

  const positive = Math.min(1, factualScore + evidenceScore + readabilityBoost + entityBoost + lengthBoost);
  const negative = Math.min(1,
    sensationalScore +
    emotionalScore * 0.8 +
    biasScore * 0.7 +
    conspiracyScore +
    antiScienceScore +
    emotionalPenalty +
    keywordPenalty
  );

  let credibilityScore: number;
  const scoreGap = positive - negative;

  if (scoreGap > 0.4) {
    credibilityScore = 0.88;
  } else if (scoreGap > 0.2) {
    credibilityScore = 0.75;
  } else if (scoreGap > 0.05) {
    credibilityScore = 0.65;
  } else if (scoreGap > -0.1) {
    credibilityScore = 0.5;
  } else if (scoreGap > -0.3) {
    credibilityScore = 0.35;
  } else {
    credibilityScore = 0.2;
  }

  const confidence = Math.min(0.95, 0.6 + (positive + negative) * 0.1);

  return {
    credibilityScore,
    confidence,
    factual: Math.min(1, factualScore * 1.5),
    evidence: Math.min(1, evidenceScore * 1.5),
    emotional: Math.min(1, emotionalScore * 1.5),
    bias: Math.min(1, biasScore * 1.5),
    sensational: Math.min(1, sensationalScore * 1.5),
    conspiracy: Math.min(1, conspiracyScore * 1.5)
  };
}

function adjustScoreBySource(score: number, source?: string): number {
  if (!source) return score;

  const trustedSources = ['thehindu.com', 'bbc.com', 'ndtv.com', 'reuters.com', 'theguardian.com'];
  const untrustedSources = ['fakenews.net', 'clickbaitcentral.com', 'misinfohub.org'];

  const lowerSource = source.toLowerCase();

  if (trustedSources.some(domain => lowerSource.includes(domain))) {
    return Math.min(1, score + 0.1);
  } else if (untrustedSources.some(domain => lowerSource.includes(domain))) {
    return Math.max(0, score - 0.1);
  }

  return score;
}

function determineCategory(score: number): string {
  if (score >= 0.75) return "reliable";
  if (score >= 0.4) return "potentially_misleading";
  return "likely_false";
}

function analyzeClaims(text: string): ClaimAnalysis[] {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  return sentences.slice(0, 5).map(sentence => {
    const lower = sentence.toLowerCase();
    let veracity = 0.5;

    if (lower.includes('according to') || lower.includes('data shows')) {
      veracity = 0.85;
    } else if (lower.includes('everyone knows') || lower.includes('they hide')) {
      veracity = 0.2;
    }

    let verdict: ClaimVerdict;
    let explanation = "";

    if (veracity > 0.7) {
      verdict = "verified";
      explanation = "This claim aligns with known facts or data.";
    } else if (veracity > 0.3) {
      verdict = "misleading";
      explanation = "This claim may be true but lacks context or clarity.";
    } else {
      verdict = "false";
      explanation = "This claim contradicts known information or is unsupported.";
    }

    return {
      text: sentence,
      veracity,
      verdict,
      explanation
    };
  });
}

// ✅ Remove or update this if unused
function classifyWithTFModel() {
  console.log("Stub: You can remove this if unnecessary.");
}

export { classifyWithTFModel };
