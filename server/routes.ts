import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { analysisRequestSchema, analysisResponseSchema } from "@shared/schema";
import { analyzeArticle } from "./services/analyzer";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes for fake news detection
  app.post("/api/analyze", async (req, res) => {
    try {
      // Validate request
      const validationResult = analysisRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const articleData = validationResult.data;
      
      // Store the article
      const article = await storage.createArticle({
        url: articleData.url || "",
        title: articleData.title || "Untitled Article",
        content: articleData.content,
        source: articleData.source || new URL(articleData.url || "https://unknown.source").hostname,
      });

      // Analyze the article
      const analysisResult = await analyzeArticle(article);

      // Store analysis result
      const storedResult = await storage.createAnalysisResult({
        articleId: article.id,
        credibilityScore: analysisResult.credibilityScore || 0, // Default if missing
        classification: analysisResult.classification || "N/A", // Default if missing
        confidence: analysisResult.confidence || 0, // Default if missing
        criteria: analysisResult.criteria || [], // Default if missing
        factChecks: analysisResult.factChecks || [], // Default if missing
      });

      // Combine article data with analysis result for response
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
        analyzedAt: storedResult.analyzedAt.toISOString(),
      };

      // Validate response against schema
      const validatedResponse = analysisResponseSchema.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: "Failed to analyze article" });
    }
  });

  // Get the latest analysis result (for extension popup)
  app.get("/api/analyze/latest", async (req, res) => {
    try {
      const latestResult = await storage.getLatestAnalysisResult();
      
      if (!latestResult) {
        return res.status(404).json({ message: "No analysis results found" });
      }
      
      const article = await storage.getArticle(latestResult.articleId);
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      // Combine article data with analysis result
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
        analyzedAt: latestResult.analyzedAt.toISOString(),
      };
      
      // Validate response against schema
      const validatedResponse = analysisResponseSchema.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Error fetching latest analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis results" });
    }
  });

  // Get a specific analysis result by ID
  app.get("/api/analyze/:id", async (req, res) => {
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
      
      // Combine article data with analysis result
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
        analyzedAt: result.analyzedAt.toISOString(),
      };
      
      // Validate response against schema
      const validatedResponse = analysisResponseSchema.parse(response);
      
      res.status(200).json(validatedResponse);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ message: "Failed to fetch analysis result" });
    }
  });

  // Report an issue with an analysis
  app.post("/api/report", async (req, res) => {
    try {
      const reportSchema = z.object({
        analysisId: z.number(),
        details: z.string(),
      });
      
      const validationResult = reportSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid report data", 
          errors: validationResult.error.errors 
        });
      }
      
      const { analysisId, details } = validationResult.data;
      
      // In a real implementation, we would store this report
      // Here we just acknowledge it
      res.status(200).json({ 
        message: "Report received", 
        reportId: Date.now() 
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}

// Helper function to generate recommendations based on classification
function generateRecommendations(classification: string): string[] {
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
