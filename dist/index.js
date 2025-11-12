var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import dotenv2 from "dotenv";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analysisRequestSchema: () => analysisRequestSchema,
  analysisResponseSchema: () => analysisResponseSchema,
  analysisResults: () => analysisResults,
  analysisResultsRelations: () => analysisResultsRelations,
  articles: () => articles,
  articlesRelations: () => articlesRelations,
  criteriaSchema: () => criteriaSchema,
  factCheckSchema: () => factCheckSchema,
  insertAnalysisResultSchema: () => insertAnalysisResultSchema,
  insertArticleSchema: () => insertArticleSchema,
  insertUserSchema: () => insertUserSchema,
  recommendationSchema: () => recommendationSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull()
});
var analysisResults = pgTable("analysis_results", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull(),
  credibilityScore: integer("credibility_score").notNull(),
  // 0-100
  classification: text("classification").notNull(),
  // 'reliable', 'potentially_misleading', 'likely_false'
  confidence: integer("confidence").notNull(),
  // 0-100
  criteria: jsonb("criteria").notNull(),
  // Structured analysis criteria
  factChecks: jsonb("fact_checks").notNull(),
  // Fact checks performed
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  articles: many(articles)
}));
var articlesRelations = relations(articles, ({ one, many }) => ({
  analysisResult: many(analysisResults)
}));
var analysisResultsRelations = relations(analysisResults, ({ one }) => ({
  article: one(articles, {
    fields: [analysisResults.articleId],
    references: [articles.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertArticleSchema = createInsertSchema(articles).pick({
  url: true,
  title: true,
  content: true,
  source: true
});
var insertAnalysisResultSchema = createInsertSchema(analysisResults).pick({
  articleId: true,
  credibilityScore: true,
  classification: true,
  confidence: true,
  criteria: true,
  factChecks: true
});
var analysisRequestSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1),
  source: z.string().optional()
});
var criteriaSchema = z.object({
  name: z.string(),
  rating: z.enum(["high", "medium", "low"]),
  description: z.string(),
  status: z.enum(["good", "warning", "bad"])
});
var factCheckSchema = z.object({
  claim: z.string(),
  verdict: z.enum(["verified", "misleading", "false"]),
  explanation: z.string()
});
var recommendationSchema = z.string();
var analysisResponseSchema = z.object({
  id: z.number().optional(),
  articleId: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
  source: z.string().optional(),
  credibilityScore: z.number(),
  classification: z.enum(["reliable", "potentially_misleading", "likely_false"]),
  confidence: z.number(),
  criteria: z.array(criteriaSchema),
  factChecks: z.array(factCheckSchema),
  recommendations: z.array(recommendationSchema),
  analyzedAt: z.string().optional()
});

// server/storage.ts
import { eq, desc } from "drizzle-orm";

// server/db.ts
import dotenv from "dotenv";
import pkg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
dotenv.config();
var { Pool } = pkg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Article operations
  async getArticle(id) {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || void 0;
  }
  async getArticleByUrl(url) {
    const [article] = await db.select().from(articles).where(eq(articles.url, url));
    return article || void 0;
  }
  async createArticle(insertArticle) {
    const [article] = await db.insert(articles).values(insertArticle).returning();
    return article;
  }
  // Analysis results operations
  async getAnalysisResult(id) {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.id, id));
    return result || void 0;
  }
  async getAnalysisResultByArticleId(articleId) {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.articleId, articleId));
    return result || void 0;
  }
  async createAnalysisResult(insertResult) {
    const [result] = await db.insert(analysisResults).values(insertResult).returning();
    return result;
  }
  async getLatestAnalysisResult() {
    const [result] = await db.select().from(analysisResults).orderBy(desc(analysisResults.analyzedAt)).limit(1);
    return result || void 0;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z as z2 } from "zod";

// server/services/nlpService.ts
import natural from "natural";
var tokenizer = new natural.WordTokenizer();
var sentimentAnalyzer = new natural.SentimentAnalyzer("English", natural.PorterStemmer, "afinn");
async function analyzeSentiment(text2) {
  try {
    const tokens = tokenizer.tokenize(text2);
    const sentiment = tokens.length > 0 ? sentimentAnalyzer.getSentiment(tokens) : 0;
    const emotionalWords = countEmotionalWords(text2);
    const totalWords = tokens.length;
    const emotionalRatio = totalWords > 0 ? emotionalWords / totalWords : 0;
    const biasScore = detectBias(text2);
    return {
      overallSentiment: normalizeScore(sentiment, -1, 1),
      // -1 (negative) to 1 (positive)
      overallEmotionalTone: emotionalRatio > 0.2 ? emotionalRatio : 0.2,
      // Baseline minimum
      biasIndicators: biasScore,
      sensationalismScore: detectSensationalism(text2)
    };
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
    return {
      overallSentiment: 0,
      overallEmotionalTone: 0.5,
      biasIndicators: 0.5,
      sensationalismScore: 0.5
    };
  }
}
async function analyzeEntities(text2) {
  try {
    const entities = {
      people: extractPeople(text2),
      organizations: extractOrganizations(text2),
      locations: extractLocations(text2),
      dates: extractDates(text2)
    };
    const sourcesCited = extractSources(text2);
    const claims = extractClaims(text2);
    return {
      namedEntities: entities,
      sourcesCited,
      claims,
      entityConsistency: calculateEntityConsistency(entities)
    };
  } catch (error) {
    console.error("Error in entity analysis:", error);
    return {
      namedEntities: { people: [], organizations: [], locations: [], dates: [] },
      sourcesCited: [],
      claims: [],
      entityConsistency: 0.5
    };
  }
}
function calculateReadabilityScore(text2) {
  try {
    const sentences = text2.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const words = text2.split(/\s+/).filter((w) => w.trim().length > 0);
    const wordCount = words.length;
    const syllableCount = countSyllables(text2);
    if (sentenceCount === 0 || wordCount === 0) {
      return 50;
    }
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = syllableCount / wordCount;
    const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
    const readabilityScore = Math.max(0, Math.min(100, 100 - grade * 5));
    return Math.round(readabilityScore);
  } catch (error) {
    console.error("Error calculating readability:", error);
    return 50;
  }
}
function extractKeywords(text2) {
  try {
    const tokens = tokenizer.tokenize(text2.toLowerCase());
    const stopwords = ["the", "a", "an", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "is", "are", "was", "were"];
    const filteredTokens = tokens.filter(
      (token) => !stopwords.includes(token) && token.length > 2
    );
    const wordCounts = {};
    filteredTokens.forEach((token) => {
      wordCounts[token] = (wordCounts[token] || 0) + 1;
    });
    const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({
      word,
      relevance: count / filteredTokens.length
    }));
    return sortedWords;
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}
function countEmotionalWords(text2) {
  const emotionalTerms = [
    "shocking",
    "amazing",
    "terrible",
    "wonderful",
    "awful",
    "incredible",
    "devastating",
    "outrageous",
    "horrific",
    "fantastic",
    "tragedy",
    "miracle",
    "disaster",
    "catastrophe",
    "breakthrough",
    "bombshell",
    "crisis",
    "epic",
    "terrifying",
    "stunning",
    "jaw-dropping",
    "mind-blowing",
    "explosive"
  ];
  const lowerText = text2.toLowerCase();
  return emotionalTerms.reduce((count, term) => {
    const regex = new RegExp("\\b" + term + "\\b", "g");
    const matches = lowerText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
}
function detectBias(text2) {
  const biasTerms = [
    "obviously",
    "clearly",
    "undoubtedly",
    "certainly",
    "absolutely",
    "everyone knows",
    "as everyone can see",
    "without question",
    "of course",
    "naturally",
    "surely",
    "always",
    "never",
    "completely",
    "totally",
    "definitely",
    "guaranteed"
  ];
  const lowerText = text2.toLowerCase();
  const biasCount = biasTerms.reduce((count, term) => {
    const regex = new RegExp("\\b" + term + "\\b", "g");
    const matches = lowerText.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  const wordCount = text2.split(/\s+/).length;
  return Math.min(1, biasCount / (wordCount * 0.02));
}
function detectSensationalism(text2) {
  const exclamationCount = (text2.match(/!/g) || []).length;
  const allCapsRegex = /\b[A-Z]{4,}\b/g;
  const allCapsCount = (text2.match(allCapsRegex) || []).length;
  const clickbaitPhrases = [
    "you won't believe",
    "shocking",
    "mind-blowing",
    "stunning",
    "jaw-dropping",
    "unbelievable",
    "amazing",
    "incredible",
    "will change your life",
    "what happens next",
    "secret",
    "this is why"
  ];
  const lowerText = text2.toLowerCase();
  const clickbaitCount = clickbaitPhrases.reduce((count, phrase) => {
    return count + (lowerText.includes(phrase) ? 1 : 0);
  }, 0);
  const wordCount = text2.split(/\s+/).length;
  const normalizedExclamation = Math.min(1, exclamationCount / (wordCount * 0.05));
  const normalizedAllCaps = Math.min(1, allCapsCount / (wordCount * 0.03));
  const normalizedClickbait = Math.min(1, clickbaitCount / 5);
  return (normalizedExclamation + normalizedAllCaps + normalizedClickbait) / 3;
}
function countSyllables(text2) {
  const words = text2.toLowerCase().split(/\s+/);
  return words.reduce((total, word) => {
    const vowelGroups = word.replace(/[^aeiouy]+/g, " ").trim().split(" ");
    let count = vowelGroups.length;
    if (word.length > 2 && word.endsWith("e") && !/[aeiouy]/.test(word.charAt(word.length - 2))) {
      count--;
    }
    return total + Math.max(1, count);
  }, 0);
}
function extractPeople(text2) {
  const commonTitles = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "President", "Senator"];
  const peopleRegex = new RegExp(`(${commonTitles.join("|")})\\s[A-Z][a-z]+(?:\\s[A-Z][a-z]+)?`, "g");
  const matches = text2.match(peopleRegex) || [];
  return Array.from(new Set(matches));
}
function extractOrganizations(text2) {
  const commonOrgs = [
    "Government",
    "University",
    "Corporation",
    "Company",
    "Association",
    "Institute",
    "Committee",
    "Foundation",
    "Organization",
    "Department"
  ];
  const orgsRegex = new RegExp(`[A-Z][a-z]+(?:\\s(?:[A-Z][a-z]+|of|the|and))*\\s(${commonOrgs.join("|")})`, "g");
  const matches = text2.match(orgsRegex) || [];
  return Array.from(new Set(matches));
}
function extractLocations(text2) {
  const locations = [];
  const countries = ["United States", "China", "Russia", "Canada", "Brazil", "Australia", "India", "Japan"];
  countries.forEach((country) => {
    if (text2.includes(country)) locations.push(country);
  });
  const inLocationRegex = /in\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g;
  let match;
  while ((match = inLocationRegex.exec(text2)) !== null) {
    if (match[1] && !countries.includes(match[1])) {
      locations.push(match[1]);
    }
  }
  return Array.from(new Set(locations));
}
function extractDates(text2) {
  const datePatterns = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
    // MM/DD/YYYY
    /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
    // MM-DD-YYYY
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{1,2}(?:st|nd|rd|th)?,?\s\d{4}\b/g
    // Month Day, Year
  ];
  const allDates = [];
  datePatterns.forEach((pattern) => {
    const matches = text2.match(pattern) || [];
    allDates.push(...matches);
  });
  return Array.from(new Set(allDates));
}
function extractSources(text2) {
  const sourcePatterns = [
    /according to ([^,.;:]+)/gi,
    /cited by ([^,.;:]+)/gi,
    /reported by ([^,.;:]+)/gi,
    /says ([^,.;:]+)/gi,
    /([^,.;:]+) reported/gi
  ];
  const sources = [];
  sourcePatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text2)) !== null) {
      if (match[1]) sources.push(match[1].trim());
    }
  });
  return Array.from(new Set(sources));
}
function extractClaims(text2) {
  const sentences = text2.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  const claims = sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return lower.includes(" is ") || lower.includes(" are ") || lower.includes(" was ") || lower.includes(" were ") || lower.includes(" will ") || lower.includes(" should ") || lower.includes(" must ") || lower.includes(" found that ") || lower.includes(" shows that ") || lower.includes(" proves ");
  }).map((sentence) => ({
    text: sentence,
    verifiability: Math.random()
    // In real app, would assess verifiability
  })).slice(0, 5);
  return claims;
}
function calculateEntityConsistency(entities) {
  const allEntities = [
    ...entities.people,
    ...entities.organizations,
    ...entities.locations
  ];
  const distinctCount = new Set(allEntities).size;
  const totalCount = allEntities.length;
  if (totalCount === 0) return 0.5;
  return Math.min(1, distinctCount / 10);
}
function normalizeScore(score, min, max) {
  return (score - min) / (max - min);
}

// server/services/tf-classifier.ts
async function classifyText(text2, source) {
  try {
    const result = simulateModelPrediction(text2);
    const adjustedScore = adjustScoreBySource(result.credibilityScore, source);
    return {
      credibilityScore: adjustedScore,
      confidence: result.confidence,
      factualScoreNormalized: result.factual,
      evidenceScoreNormalized: result.evidence,
      emotionalScoreNormalized: result.emotional,
      biasScoreNormalized: result.bias,
      claimsAnalysis: analyzeClaims(text2),
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
function simulateModelPrediction(text2) {
  const lowerText = text2.toLowerCase();
  const sensationalistTerms = ["shocking", "bombshell", "mind-blowing", "you won't believe", "breaking"];
  const factualTerms = ["according to", "study shows", "data from", "research indicates"];
  const evidenceTerms = ["study", "research", "scientist", "citation"];
  const emotionalTerms = ["terrible", "amazing", "disaster", "miracle"];
  const biasTerms = ["must", "should", "only", "never"];
  const conspiracyTerms = ["cover-up", "secret", "truth they hide"];
  const antiScienceTerms = ["science is wrong", "experts are lying"];
  const getScore = (terms, multiplier = 0.05) => terms.reduce((score, term) => score + (lowerText.includes(term) ? multiplier : 0), 0);
  const factualScore = getScore(factualTerms, 0.06);
  const evidenceScore = getScore(evidenceTerms, 0.05);
  const sensationalScore = getScore(sensationalistTerms, 0.05);
  const emotionalScore = getScore(emotionalTerms, 0.05);
  const biasScore = getScore(biasTerms, 0.04);
  const conspiracyScore = getScore(conspiracyTerms, 0.06);
  const antiScienceScore = getScore(antiScienceTerms, 0.05);
  const positive = Math.min(1, factualScore + evidenceScore);
  const negative = Math.min(1, sensationalScore + emotionalScore * 0.8 + biasScore * 0.7 + conspiracyScore + antiScienceScore);
  let credibilityScore;
  if (positive > 0.6 && negative < 0.3) {
    credibilityScore = 0.8 + Math.random() * 0.15;
  } else if (negative > 0.6 && positive < 0.3) {
    credibilityScore = 0.1 + Math.random() * 0.2;
  } else if (positive > negative) {
    credibilityScore = 0.6 + Math.random() * 0.2;
  } else {
    credibilityScore = 0.4 + Math.random() * 0.2;
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
function adjustScoreBySource(score, source) {
  if (!source) return score;
  const trustedSources2 = ["thehindu.com", "bbc.com", "ndtv.com", "reuters.com", "theguardian.com"];
  const untrustedSources = ["fakenews.net", "clickbaitcentral.com", "misinfohub.org"];
  const lowerSource = source.toLowerCase();
  if (trustedSources2.some((domain) => lowerSource.includes(domain))) {
    return Math.min(1, score + 0.1);
  } else if (untrustedSources.some((domain) => lowerSource.includes(domain))) {
    return Math.max(0, score - 0.1);
  }
  return score;
}
function determineCategory(score) {
  if (score >= 0.75) return "reliable";
  if (score >= 0.4) return "potentially_misleading";
  return "likely_false";
}
function analyzeClaims(text2) {
  const sentences = text2.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  return sentences.slice(0, 5).map((sentence) => {
    let veracity = 0.5;
    const lower = sentence.toLowerCase();
    if (lower.includes("according to") || lower.includes("data shows")) {
      veracity = 0.8 + Math.random() * 0.15;
    } else if (lower.includes("everyone knows") || lower.includes("they hide")) {
      veracity = 0.1 + Math.random() * 0.15;
    } else {
      veracity = 0.4 + Math.random() * 0.3;
    }
    let verdict;
    let explanation = "";
    if (veracity > 0.7) {
      verdict = "verified";
      explanation = "Confirmed by multiple sources.";
    } else if (veracity > 0.3) {
      verdict = "misleading";
      explanation = "Partially true but lacks context.";
    } else {
      verdict = "false";
      explanation = "Contradicts known facts.";
    }
    return {
      text: sentence,
      veracity,
      verdict,
      explanation
    };
  });
}

// shared/credibilitySources.ts
var trustedSources = [
  "thehindu.com",
  "ndtv.com",
  "hindustantimes.com",
  "bbc.com",
  "reuters.com",
  "apnews.com",
  "nytimes.com"
];
var unreliableSources = [
  "theonion.com",
  "infowars.com",
  "naturalnews.com",
  "conspiracytheory.net",
  "fakenews.com",
  "clickbait.co"
];

// server/services/analyzer.ts
async function analyzeArticle(article) {
  try {
    const { title, content, source } = article;
    const fullText = `${title}

${content}`;
    const sentiments = await analyzeSentiment(fullText);
    const entities = await analyzeEntities(fullText);
    const readabilityScore = calculateReadabilityScore(fullText);
    const keywords = extractKeywords(fullText);
    const classification = await classifyText(fullText, source);
    const credibilityScore = Math.round(classification.credibilityScore * 100);
    let classificationCategory;
    if (credibilityScore >= 75) {
      classificationCategory = "reliable";
    } else if (credibilityScore >= 40) {
      classificationCategory = "potentially_misleading";
    } else {
      classificationCategory = "likely_false";
    }
    const criteria = generateCriteriaAnalysis(
      source,
      sentiments,
      entities,
      readabilityScore,
      classification
    );
    const factChecks = generateFactChecks(
      fullText,
      entities,
      classification.claimsAnalysis
    );
    return {
      credibilityScore,
      classification: classificationCategory,
      confidence: Math.round(classification.confidence * 100),
      criteria,
      factChecks,
      recommendations: []
    };
  } catch (error) {
    console.error("Error analyzing article:", error);
    const defaultScore = Math.floor(40 + Math.random() * 35);
    let classification;
    if (defaultScore >= 75) {
      classification = "reliable";
    } else if (defaultScore >= 40) {
      classification = "potentially_misleading";
    } else {
      classification = "likely_false";
    }
    return {
      credibilityScore: defaultScore,
      classification,
      confidence: 40 + Math.floor(Math.random() * 30),
      criteria: [
        {
          name: "Source Evaluation",
          rating: "medium",
          description: "Could not fully evaluate the source reliability",
          status: "warning"
        },
        {
          name: "Content Analysis",
          rating: defaultScore > 60 ? "medium" : "low",
          description: "Limited analysis completed on article content",
          status: defaultScore > 60 ? "warning" : "bad"
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
function generateCriteriaAnalysis(source, sentiments, entities, readabilityScore, classification) {
  const criteria = [];
  let sourceRating = "medium";
  let sourceStatus = "warning";
  let sourceDescription = "Source has limited verification history";
  if (trustedSources.some((s) => source.includes(s))) {
    sourceRating = "high";
    sourceStatus = "good";
    sourceDescription = "Source has history of factual reporting";
  } else if (unreliableSources.some((s) => source.includes(s))) {
    sourceRating = "low";
    sourceStatus = "bad";
    sourceDescription = "Source has history of publishing misleading content";
  }
  criteria.push({
    name: "Source Credibility",
    rating: sourceRating,
    description: sourceDescription,
    status: sourceStatus
  });
  const factualAccuracyRating = classification.factualScoreNormalized > 0.7 ? "high" : classification.factualScoreNormalized > 0.4 ? "medium" : "low";
  const factualAccuracyStatus = factualAccuracyRating === "high" ? "good" : factualAccuracyRating === "medium" ? "warning" : "bad";
  criteria.push({
    name: "Factual Accuracy",
    rating: factualAccuracyRating,
    description: factualAccuracyRating === "high" ? "Claims are generally factual and verifiable" : factualAccuracyRating === "medium" ? "Some claims may be misleading or lacking context" : "Multiple claims appear to be false or misleading",
    status: factualAccuracyStatus
  });
  const evidenceRating = classification.evidenceScoreNormalized > 0.7 ? "high" : classification.evidenceScoreNormalized > 0.4 ? "medium" : "low";
  const evidenceStatus = evidenceRating === "high" ? "good" : evidenceRating === "medium" ? "warning" : "bad";
  criteria.push({
    name: "Evidence Quality",
    rating: evidenceRating,
    description: evidenceRating === "high" ? "References scientific studies and expert opinions" : evidenceRating === "medium" ? "Some evidence provided but may be selective" : "Little or no evidence to support claims",
    status: evidenceStatus
  });
  const emotionalScore = sentiments.overallEmotionalTone;
  const emotionalRating = emotionalScore < 0.3 ? "low" : emotionalScore < 0.6 ? "medium" : "high";
  const emotionalStatus = emotionalRating === "low" ? "good" : emotionalRating === "medium" ? "warning" : "bad";
  criteria.push({
    name: "Emotional Language",
    rating: emotionalRating,
    description: emotionalRating === "low" ? "Uses neutral language focused on facts" : emotionalRating === "medium" ? "Some emotional language present" : "Uses emotional language that may influence perception",
    status: emotionalStatus
  });
  return criteria;
}
function generateFactChecks(text2, entities, claimsAnalysis) {
  const factChecks = [];
  if (!claimsAnalysis || claimsAnalysis.length === 0) {
    return [
      {
        claim: "Article content",
        verdict: "misleading",
        explanation: "Analysis could not identify specific claims to verify"
      }
    ];
  }
  const claimsToProcess = claimsAnalysis.slice(0, 3);
  for (const claim of claimsToProcess) {
    let verdict;
    if (claim.veracity > 0.7) {
      verdict = "verified";
    } else if (claim.veracity > 0.3) {
      verdict = "misleading";
    } else {
      verdict = "false";
    }
    factChecks.push({
      claim: claim.text,
      verdict,
      explanation: claim.explanation || getDefaultExplanation(verdict)
    });
  }
  return factChecks;
}
function getDefaultExplanation(verdict) {
  switch (verdict) {
    case "verified":
      return "Multiple independent sources confirm this information";
    case "misleading":
      return "This claim contains elements of truth but lacks important context";
    case "false":
      return "This claim contradicts available evidence and reliable sources";
    default:
      return "Verification was inconclusive";
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.post("/api/analyze", async (req, res) => {
    try {
      const validationResult = analysisRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }
      const articleData = validationResult.data;
      const article = await storage.createArticle({
        url: articleData.url || "",
        title: articleData.title || "Untitled Article",
        content: articleData.content,
        source: articleData.source || new URL(articleData.url || "https://unknown.source").hostname
      });
      const analysisResult = await analyzeArticle(article);
      const storedResult = await storage.createAnalysisResult({
        articleId: article.id,
        credibilityScore: analysisResult.credibilityScore,
        classification: analysisResult.classification,
        confidence: analysisResult.confidence,
        criteria: analysisResult.criteria,
        factChecks: analysisResult.factChecks
      });
      const response = {
        id: storedResult.id,
        articleId: article.id,
        url: article.url,
        title: article.title,
        source: article.source,
        credibilityScore: storedResult.credibilityScore,
        classification: storedResult.classification,
        confidence: storedResult.confidence,
        criteria: storedResult.criteria,
        factChecks: storedResult.factChecks,
        recommendations: generateRecommendations(storedResult.classification),
        analyzedAt: storedResult.analyzedAt.toISOString()
      };
      const validatedResponse = analysisResponseSchema.parse(response);
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze article" });
    }
  });
  app2.get("/api/analyze/latest", async (req, res) => {
    try {
      const latestResult = await storage.getLatestAnalysisResult();
      if (!latestResult) {
        return res.status(404).json({ message: "No analysis results found" });
      }
      const article = await storage.getArticle(latestResult.articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      const response = {
        id: latestResult.id,
        articleId: article.id,
        url: article.url,
        title: article.title,
        source: article.source,
        credibilityScore: latestResult.credibilityScore,
        classification: latestResult.classification,
        confidence: latestResult.confidence,
        criteria: latestResult.criteria,
        factChecks: latestResult.factChecks,
        recommendations: generateRecommendations(latestResult.classification),
        analyzedAt: latestResult.analyzedAt.toISOString()
      };
      const validatedResponse = analysisResponseSchema.parse(response);
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Error fetching latest analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis results" });
    }
  });
  app2.get("/api/analyze/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const result = await storage.getAnalysisResult(id);
      if (!result) {
        return res.status(404).json({ message: "Analysis result not found" });
      }
      const article = await storage.getArticle(result.articleId);
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      const response = {
        id: result.id,
        articleId: article.id,
        url: article.url,
        title: article.title,
        source: article.source,
        credibilityScore: result.credibilityScore,
        classification: result.classification,
        confidence: result.confidence,
        criteria: result.criteria,
        factChecks: result.factChecks,
        recommendations: generateRecommendations(result.classification),
        analyzedAt: result.analyzedAt.toISOString()
      };
      const validatedResponse = analysisResponseSchema.parse(response);
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis result" });
    }
  });
  app2.post("/api/report", async (req, res) => {
    try {
      const reportSchema = z2.object({
        analysisId: z2.number(),
        details: z2.string()
      });
      const validationResult = reportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid report data",
          errors: validationResult.error.errors
        });
      }
      const { analysisId, details } = validationResult.data;
      res.status(200).json({
        message: "Report received",
        reportId: Date.now()
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
function generateRecommendations(classification) {
  const commonRecommendations = [
    "Always verify information with multiple credible sources",
    "Check the publication date to ensure content is current",
    "Consider the expertise and authority of the author"
  ];
  if (classification === "reliable") {
    return [
      ...commonRecommendations,
      "Share responsibly, as even reliable sources occasionally make errors"
    ];
  } else if (classification === "potentially_misleading") {
    return [
      "Verify claims with alternative credible sources",
      "Check original research cited in the article",
      "Consider the potential bias of the source",
      "Look for context that might be missing from the article"
    ];
  } else {
    return [
      "Seek information from established fact-checking organizations",
      "Check if other reputable sources are reporting similar information",
      "Be cautious about sharing this content with others",
      "Look for emotional language that may be trying to manipulate readers"
    ];
  }
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ["localhost"]
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
dotenv2.config();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen(port, "127.0.0.1", () => {
    log(`serving on port ${port}`);
  });
})();
