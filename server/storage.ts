import { 
  users, 
  type User, 
  type InsertUser, 
  articles, 
  type Article, 
  type InsertArticle,
  analysisResults,
  type AnalysisResult,
  type InsertAnalysisResult,
  type Criteria,
  type FactCheck
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";

// Storage interface for the application
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Article operations
  getArticle(id: number): Promise<Article | undefined>;
  getArticleByUrl(url: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  
  // Analysis results operations
  getAnalysisResult(id: number): Promise<AnalysisResult | undefined>;
  getAnalysisResultByArticleId(articleId: number): Promise<AnalysisResult | undefined>;
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getLatestAnalysisResult(): Promise<AnalysisResult | undefined>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Article operations
  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.url, url));
    return article || undefined;
  }
  
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values(insertArticle)
      .returning();
    return article;
  }
  
  // Analysis results operations
  async getAnalysisResult(id: number): Promise<AnalysisResult | undefined> {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.id, id));
    return result || undefined;
  }
  
  async getAnalysisResultByArticleId(articleId: number): Promise<AnalysisResult | undefined> {
    const [result] = await db.select().from(analysisResults).where(eq(analysisResults.articleId, articleId));
    return result || undefined;
  }
  
  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const [result] = await db
      .insert(analysisResults)
      .values(insertResult)
      .returning();
    return result;
  }
  
  async getLatestAnalysisResult(): Promise<AnalysisResult | undefined> {
    const [result] = await db
      .select()
      .from(analysisResults)
      .orderBy(desc(analysisResults.analyzedAt))
      .limit(1);
    return result || undefined;
  }
}

// In-memory storage implementation (keeping this for reference)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private articles: Map<number, Article>;
  private analysisResults: Map<number, AnalysisResult>;
  private userIdCounter: number;
  private articleIdCounter: number;
  private analysisResultIdCounter: number;

  constructor() {
    this.users = new Map();
    this.articles = new Map();
    this.analysisResults = new Map();
    this.userIdCounter = 1;
    this.articleIdCounter = 1;
    this.analysisResultIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Article operations
  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return Array.from(this.articles.values()).find(
      (article) => article.url === url
    );
  }
  
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.articleIdCounter++;
    const now = new Date();
    
    const article: Article = { 
      ...insertArticle, 
      id, 
      analyzedAt: now 
    };
    
    this.articles.set(id, article);
    return article;
  }
  
  // Analysis results operations
  async getAnalysisResult(id: number): Promise<AnalysisResult | undefined> {
    return this.analysisResults.get(id);
  }
  
  async getAnalysisResultByArticleId(articleId: number): Promise<AnalysisResult | undefined> {
    return Array.from(this.analysisResults.values()).find(
      (result) => result.articleId === articleId
    );
  }
  
  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const id = this.analysisResultIdCounter++;
    const now = new Date();
    
    const result: AnalysisResult = {
      ...insertResult,
      id,
      analyzedAt: now
    };
    
    this.analysisResults.set(id, result);
    return result;
  }
  
  async getLatestAnalysisResult(): Promise<AnalysisResult | undefined> {
    if (this.analysisResults.size === 0) {
      return undefined;
    }
    
    // Get all results and sort by analyzedAt (most recent first)
    const results = Array.from(this.analysisResults.values()).sort(
      (a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime()
    );
    
    return results[0];
  }
}

// Create and export a storage instance using the database
export const storage = new DatabaseStorage();
