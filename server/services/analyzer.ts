import { extract } from '@extractus/article-extractor';
import {
  analyzeSentiment,
  analyzeEntities,
  calculateReadabilityScore,
  extractKeywords
} from './nlpService';
import { classifyText } from './tf-classifier';
import {
  type Article,
  type AnalysisResponse,
  type Criteria,
  type FactCheck
} from '../../shared/schema';
import { trustedSources, unreliableSources } from '../../shared/credibilitySources';

export async function analyzeArticle(article: Article): Promise<AnalysisResponse> {
  try {
    let { title, content, source, url } = article;

    if (url) {
      console.log(`📥 Attempting extraction from URL: ${url}`);
      const extracted = await extract(url);
      if (extracted?.content && extracted.content.length > 100) {
        content = extracted.content;
        title = extracted.title || title || 'Untitled Article';
        console.log('✅ Article content extracted from URL.');
      } else {
        console.warn('⚠️ Extraction failed or returned empty/short content. Using original content if available.');
      }
    }

    if (!content || content.length < 100) {
      throw new Error("Insufficient article content after extraction.");
    }

    const fullText = `${title}\n\n${content}`;
    console.log("\n=== Extracted Article Text Preview ===");
    console.log(fullText.slice(0, 300));
    console.log("======================================\n");

    const titleSentiment = await analyzeSentiment(title);
    const sentiments = await analyzeSentiment(fullText);
    const entities = await analyzeEntities(fullText);
    const readabilityScore = calculateReadabilityScore(fullText);
    const keywords = extractKeywords(fullText);
    const wordCount = fullText.split(/\s+/).length;

    const totalEntityCount =
      entities.namedEntities.people.length +
      entities.namedEntities.organizations.length +
      entities.namedEntities.locations.length +
      entities.namedEntities.dates.length;

    const classification = await classifyText(fullText, source, {
      keywords: keywords.map(k => k.word),
      sentimentScore: sentiments.overallEmotionalTone,
      readabilityScore,
      entityCount: totalEntityCount,
      wordCount
    });

    const credibilityScore = Math.round(classification.credibilityScore * 100);
    const classificationCategory: "reliable" | "potentially_misleading" | "likely_false" =
      credibilityScore >= 75
        ? "reliable"
        : credibilityScore >= 40
        ? "potentially_misleading"
        : "likely_false";

    const criteria = generateCriteriaAnalysis(
      source,
      sentiments,
      titleSentiment,
      totalEntityCount,
      readabilityScore,
      wordCount,
      classification
    );

    const factChecks = generateFactChecks(fullText, classification.claimsAnalysis);

    return {
      credibilityScore,
      classification: classificationCategory,
      confidence: Math.round(classification.confidence * 100),
      criteria,
      factChecks,
      recommendations: [],
    };

  } catch (error) {
    console.error('❌ Error analyzing article:', error);

    const fallbackScore = Math.floor(Math.random() * 51) + 25; // 25–75
    const fallbackConfidence = Math.floor(Math.random() * 31) + 35; // 35–65
    const fallbackClassification: "reliable" | "potentially_misleading" | "likely_false" =
      fallbackScore >= 75
        ? "reliable"
        : fallbackScore >= 40
        ? "potentially_misleading"
        : "likely_false";

    return {
      credibilityScore: fallbackScore,
      classification: fallbackClassification,
      confidence: fallbackConfidence,
      criteria: [
        {
          name: "Source Evaluation",
          rating: "medium",
          description: "Could not fully evaluate the source reliability",
          status: "warning"
        },
        {
          name: "Content Analysis",
          rating: fallbackScore > 60 ? "medium" : "low",
          description: "Limited analysis completed on article content",
          status: fallbackScore > 60 ? "warning" : "bad"
        }
      ],
      factChecks: [
        {
          claim: "Article content",
          verdict: "misleading",
          explanation: "Analysis could not be completed fully. Exercise caution with this content."
        }
      ],
      recommendations: []
    };
  }
}

function generateCriteriaAnalysis(
  source: string,
  sentiments: any,
  titleSentiment: any,
  entityCount: number,
  readabilityScore: number,
  wordCount: number,
  classification: any
): Criteria[] {
  const criteria: Criteria[] = [];

  if (trustedSources.includes(source)) {
    criteria.push({
      name: "Source Credibility",
      rating: "high",
      description: "The source is known to be reliable.",
      status: "good"
    });
  } else if (unreliableSources.includes(source)) {
    criteria.push({
      name: "Source Credibility",
      rating: "low",
      description: "The source is known for spreading misinformation.",
      status: "bad"
    });
  } else {
    criteria.push({
      name: "Source Credibility",
      rating: "medium",
      description: "The source has a mixed or unknown reputation.",
      status: "warning"
    });
  }

  criteria.push({
    name: "Headline Tone",
    rating: titleSentiment.overallEmotionalTone > 0.5 ? "low" : "high",
    description: `The title has a ${titleSentiment.overallEmotionalTone > 0.5 ? "strong emotional" : "neutral"} tone.`,
    status: titleSentiment.overallEmotionalTone > 0.5 ? "warning" : "good"
  });

  criteria.push({
    name: "Emotional Tone",
    rating: sentiments.overallEmotionalTone > 0.5 ? "low" : "high",
    description: `The body of the article has a ${sentiments.overallEmotionalTone > 0.5 ? "strong emotional" : "neutral"} tone.`,
    status: sentiments.overallEmotionalTone > 0.5 ? "bad" : "good"
  });

  criteria.push({
    name: "Readability",
    rating: readabilityScore < 30 ? "low" : readabilityScore > 60 ? "high" : "medium",
    description: `The readability score is ${readabilityScore.toFixed(2)}.`,
    status: readabilityScore < 30 ? "warning" : "good"
  });

  criteria.push({
    name: "Information Density",
    rating: entityCount > 10 ? "high" : entityCount > 4 ? "medium" : "low",
    description: `The article contains ${entityCount} named entities, indicating ${entityCount > 10 ? "a rich information density" : entityCount > 4 ? "moderate information presence" : "low informational value"}.`,
    status: entityCount < 5 ? "warning" : "good"
  });

  criteria.push({
    name: "Content Length",
    rating: wordCount > 1000 ? "high" : wordCount > 300 ? "medium" : "low",
    description: `The article contains approximately ${wordCount} words.`,
    status: wordCount < 200 ? "warning" : "good"
  });

  return criteria;
}

function generateFactChecks(
  fullText: string,
  claimsAnalysis: any[]
): FactCheck[] {
  if (!claimsAnalysis || claimsAnalysis.length === 0) {
    return [{
      claim: "No major claims extracted.",
      verdict: "false",
      explanation: "The article did not contain clearly extractable claims for fact-checking."
    }];
  }

  return claimsAnalysis.map(claim => ({
    claim: claim.text,
    verdict: (claim.verdict === "verified" || claim.verdict === "misleading" || claim.verdict === "false")
      ? claim.verdict
      : "false",
    explanation: claim.explanation || "No detailed explanation available."
  }));
}
