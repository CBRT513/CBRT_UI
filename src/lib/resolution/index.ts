/**
 * Enhanced Conflict Resolution with AI Assistance
 */

import { ConcurrencyService, EditSession, ConflictInfo } from '../concurrency';
import { notificationService, NotificationType } from '../notifications';

export interface ResolutionStrategy {
  id: string;
  name: string;
  description: string;
  type: 'automatic' | 'semi_automatic' | 'manual';
  confidence: number;
  applicability: (conflict: ConflictInfo) => boolean;
  resolve: (conflict: ConflictInfo) => Promise<ResolutionResult>;
}

export interface ResolutionResult {
  success: boolean;
  mergedValue?: any;
  explanation?: string;
  confidence?: number;
  requiresReview?: boolean;
}

export interface AIAnalysis {
  conflictType: ConflictType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedStrategies: ResolutionStrategy[];
  semanticDifference: number; // 0-1 scale
  businessImpact: string;
  recommendation: string;
}

export enum ConflictType {
  SIMPLE_VALUE = 'simple_value',
  ARRAY_MODIFICATION = 'array_modification',
  NESTED_OBJECT = 'nested_object',
  SEMANTIC_DIFFERENCE = 'semantic_difference',
  BUSINESS_RULE = 'business_rule',
  CONCURRENT_DELETE = 'concurrent_delete',
}

export interface ResolutionHistory {
  id: string;
  conflictId: string;
  timestamp: Date;
  strategy: string;
  result: ResolutionResult;
  userId?: string;
  feedback?: ResolutionFeedback;
}

export interface ResolutionFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  wasHelpful: boolean;
  preferredStrategy?: string;
  comment?: string;
}

/**
 * AI-powered conflict resolution service
 */
export class AIResolutionService {
  private strategies: Map<string, ResolutionStrategy> = new Map();
  private history: ResolutionHistory[] = [];
  private concurrencyService: ConcurrencyService;
  private learningCache: Map<string, ResolutionStrategy> = new Map();

  constructor() {
    this.concurrencyService = new ConcurrencyService();
    this.initializeStrategies();
  }

  /**
   * Initialize built-in resolution strategies
   */
  private initializeStrategies(): void {
    // Strategy: Latest timestamp wins
    this.registerStrategy({
      id: 'latest_wins',
      name: 'Latest Timestamp Wins',
      description: 'Accept the most recent change',
      type: 'automatic',
      confidence: 0.7,
      applicability: (conflict) => conflict.type === 'update',
      resolve: async (conflict) => ({
        success: true,
        mergedValue: conflict.theirChange.value,
        explanation: 'Accepted the most recent change based on timestamp',
        confidence: 0.7,
      }),
    });

    // Strategy: Merge arrays
    this.registerStrategy({
      id: 'merge_arrays',
      name: 'Merge Arrays',
      description: 'Combine array elements from both changes',
      type: 'automatic',
      confidence: 0.8,
      applicability: (conflict) => 
        Array.isArray(conflict.ourChange.value) && 
        Array.isArray(conflict.theirChange.value),
      resolve: async (conflict) => {
        const merged = this.mergeArrays(
          conflict.baseValue as any[],
          conflict.ourChange.value as any[],
          conflict.theirChange.value as any[]
        );
        return {
          success: true,
          mergedValue: merged,
          explanation: 'Merged array elements from both changes',
          confidence: 0.8,
        };
      },
    });

    // Strategy: Merge objects
    this.registerStrategy({
      id: 'merge_objects',
      name: 'Merge Objects',
      description: 'Merge non-conflicting object properties',
      type: 'automatic',
      confidence: 0.75,
      applicability: (conflict) => 
        typeof conflict.ourChange.value === 'object' &&
        typeof conflict.theirChange.value === 'object' &&
        !Array.isArray(conflict.ourChange.value),
      resolve: async (conflict) => {
        const merged = this.mergeObjects(
          conflict.baseValue as Record<string, any>,
          conflict.ourChange.value as Record<string, any>,
          conflict.theirChange.value as Record<string, any>
        );
        return {
          success: merged.success,
          mergedValue: merged.value,
          explanation: merged.conflicts.length === 0 
            ? 'Merged all object properties without conflicts'
            : `Merged with ${merged.conflicts.length} unresolved conflicts`,
          confidence: merged.conflicts.length === 0 ? 0.9 : 0.5,
          requiresReview: merged.conflicts.length > 0,
        };
      },
    });

    // Strategy: Numeric addition
    this.registerStrategy({
      id: 'numeric_addition',
      name: 'Numeric Addition',
      description: 'Add numeric changes together',
      type: 'automatic',
      confidence: 0.85,
      applicability: (conflict) => 
        typeof conflict.ourChange.value === 'number' &&
        typeof conflict.theirChange.value === 'number' &&
        typeof conflict.baseValue === 'number',
      resolve: async (conflict) => {
        const ourDelta = (conflict.ourChange.value as number) - (conflict.baseValue as number);
        const theirDelta = (conflict.theirChange.value as number) - (conflict.baseValue as number);
        const merged = (conflict.baseValue as number) + ourDelta + theirDelta;
        return {
          success: true,
          mergedValue: merged,
          explanation: `Added both numeric changes: base(${conflict.baseValue}) + delta1(${ourDelta}) + delta2(${theirDelta}) = ${merged}`,
          confidence: 0.85,
        };
      },
    });

    // Strategy: AI semantic merge
    this.registerStrategy({
      id: 'ai_semantic',
      name: 'AI Semantic Merge',
      description: 'Use AI to understand and merge semantic changes',
      type: 'semi_automatic',
      confidence: 0.6,
      applicability: (conflict) => 
        typeof conflict.ourChange.value === 'string' &&
        typeof conflict.theirChange.value === 'string',
      resolve: async (conflict) => {
        const analysis = await this.analyzeSemanticDifference(
          conflict.baseValue as string,
          conflict.ourChange.value as string,
          conflict.theirChange.value as string
        );
        return {
          success: analysis.canMerge,
          mergedValue: analysis.mergedText,
          explanation: analysis.explanation,
          confidence: analysis.confidence,
          requiresReview: true,
        };
      },
    });
  }

  /**
   * Register a custom resolution strategy
   */
  registerStrategy(strategy: ResolutionStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  /**
   * Analyze a conflict and suggest resolution strategies
   */
  async analyzeConflict(conflict: ConflictInfo): Promise<AIAnalysis> {
    const conflictType = this.detectConflictType(conflict);
    const severity = this.assessSeverity(conflict, conflictType);
    const applicableStrategies = this.findApplicableStrategies(conflict);
    const semanticDiff = await this.calculateSemanticDifference(conflict);
    
    // Sort strategies by confidence and past success
    const sortedStrategies = this.rankStrategies(applicableStrategies, conflict);

    return {
      conflictType,
      severity,
      suggestedStrategies: sortedStrategies.slice(0, 3),
      semanticDifference: semanticDiff,
      businessImpact: this.assessBusinessImpact(conflict, conflictType),
      recommendation: this.generateRecommendation(sortedStrategies, severity),
    };
  }

  /**
   * Automatically resolve a conflict using AI
   */
  async autoResolve(
    conflict: ConflictInfo,
    preferredStrategy?: string
  ): Promise<ResolutionResult> {
    const analysis = await this.analyzeConflict(conflict);
    
    // Check if conflict is too severe for auto-resolution
    if (analysis.severity === 'critical') {
      return {
        success: false,
        explanation: 'Conflict too severe for automatic resolution',
        requiresReview: true,
      };
    }

    // Use preferred strategy if specified and applicable
    if (preferredStrategy) {
      const strategy = this.strategies.get(preferredStrategy);
      if (strategy && strategy.applicability(conflict)) {
        const result = await strategy.resolve(conflict);
        this.recordResolution(conflict, strategy, result);
        return result;
      }
    }

    // Use highest confidence applicable strategy
    const bestStrategy = analysis.suggestedStrategies[0];
    if (bestStrategy && bestStrategy.confidence > 0.6) {
      const result = await bestStrategy.resolve(conflict);
      this.recordResolution(conflict, bestStrategy, result);
      
      // Notify if review is needed
      if (result.requiresReview) {
        await this.notifyForReview(conflict, result, analysis);
      }
      
      return result;
    }

    return {
      success: false,
      explanation: 'No suitable automatic resolution strategy found',
      requiresReview: true,
    };
  }

  /**
   * Detect the type of conflict
   */
  private detectConflictType(conflict: ConflictInfo): ConflictType {
    const ourValue = conflict.ourChange.value;
    const theirValue = conflict.theirChange.value;

    if (conflict.type === 'delete') {
      return ConflictType.CONCURRENT_DELETE;
    }

    if (Array.isArray(ourValue) || Array.isArray(theirValue)) {
      return ConflictType.ARRAY_MODIFICATION;
    }

    if (typeof ourValue === 'object' && ourValue !== null) {
      return ConflictType.NESTED_OBJECT;
    }

    if (typeof ourValue === 'string' && typeof theirValue === 'string') {
      const similarity = this.calculateStringSimilarity(ourValue, theirValue);
      if (similarity < 0.5) {
        return ConflictType.SEMANTIC_DIFFERENCE;
      }
    }

    // Check for business rule violations
    if (this.violatesBusinessRule(conflict)) {
      return ConflictType.BUSINESS_RULE;
    }

    return ConflictType.SIMPLE_VALUE;
  }

  /**
   * Assess the severity of a conflict
   */
  private assessSeverity(conflict: ConflictInfo, type: ConflictType): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Business rule violations or concurrent deletes
    if (type === ConflictType.BUSINESS_RULE || type === ConflictType.CONCURRENT_DELETE) {
      return 'critical';
    }

    // High: Large semantic differences
    if (type === ConflictType.SEMANTIC_DIFFERENCE) {
      return 'high';
    }

    // Check field criticality
    const criticalFields = ['price', 'quantity', 'status', 'approved', 'total'];
    if (criticalFields.includes(conflict.field)) {
      return 'high';
    }

    // Medium: Complex objects or arrays
    if (type === ConflictType.NESTED_OBJECT || type === ConflictType.ARRAY_MODIFICATION) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Find applicable resolution strategies
   */
  private findApplicableStrategies(conflict: ConflictInfo): ResolutionStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => strategy.applicability(conflict));
  }

  /**
   * Rank strategies based on confidence and historical success
   */
  private rankStrategies(
    strategies: ResolutionStrategy[],
    conflict: ConflictInfo
  ): ResolutionStrategy[] {
    return strategies.sort((a, b) => {
      // Factor in historical success rate
      const aSuccess = this.getHistoricalSuccessRate(a.id, conflict.field);
      const bSuccess = this.getHistoricalSuccessRate(b.id, conflict.field);
      
      const aScore = a.confidence * (1 + aSuccess * 0.5);
      const bScore = b.confidence * (1 + bSuccess * 0.5);
      
      return bScore - aScore;
    });
  }

  /**
   * Get historical success rate for a strategy
   */
  private getHistoricalSuccessRate(strategyId: string, field: string): number {
    const relevantHistory = this.history.filter(h => 
      h.strategy === strategyId &&
      h.feedback?.wasHelpful !== false
    );
    
    if (relevantHistory.length === 0) return 0.5; // Default neutral score
    
    const successful = relevantHistory.filter(h => 
      h.result.success && h.feedback?.wasHelpful !== false
    ).length;
    
    return successful / relevantHistory.length;
  }

  /**
   * Calculate semantic difference between values
   */
  private async calculateSemanticDifference(conflict: ConflictInfo): Promise<number> {
    if (typeof conflict.ourChange.value !== 'string' || 
        typeof conflict.theirChange.value !== 'string') {
      return 1; // Maximum difference for non-string values
    }

    return 1 - this.calculateStringSimilarity(
      conflict.ourChange.value,
      conflict.theirChange.value
    );
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : 1 - distance / maxLen;
  }

  /**
   * Merge arrays using three-way merge
   */
  private mergeArrays(base: any[], ours: any[], theirs: any[]): any[] {
    const result = [...base];
    
    // Find additions in ours
    const ourAdditions = ours.filter(item => 
      !base.some(baseItem => this.deepEqual(item, baseItem))
    );
    
    // Find additions in theirs
    const theirAdditions = theirs.filter(item => 
      !base.some(baseItem => this.deepEqual(item, baseItem))
    );
    
    // Find deletions in ours
    const ourDeletions = base.filter(item => 
      !ours.some(ourItem => this.deepEqual(item, ourItem))
    );
    
    // Find deletions in theirs
    const theirDeletions = base.filter(item => 
      !theirs.some(theirItem => this.deepEqual(item, theirItem))
    );
    
    // Remove items deleted in both
    const toRemove = ourDeletions.filter(item =>
      theirDeletions.some(delItem => this.deepEqual(item, delItem))
    );
    
    // Apply changes
    const merged = result.filter(item => 
      !toRemove.some(remItem => this.deepEqual(item, remItem))
    );
    
    // Add new items from both
    merged.push(...ourAdditions, ...theirAdditions);
    
    return merged;
  }

  /**
   * Merge objects using three-way merge
   */
  private mergeObjects(
    base: Record<string, any>,
    ours: Record<string, any>,
    theirs: Record<string, any>
  ): { success: boolean; value: Record<string, any>; conflicts: string[] } {
    const merged: Record<string, any> = {};
    const conflicts: string[] = [];
    const allKeys = new Set([
      ...Object.keys(base),
      ...Object.keys(ours),
      ...Object.keys(theirs),
    ]);

    for (const key of allKeys) {
      const baseVal = base[key];
      const ourVal = ours[key];
      const theirVal = theirs[key];

      // No conflict cases
      if (this.deepEqual(ourVal, theirVal)) {
        merged[key] = ourVal;
      } else if (this.deepEqual(ourVal, baseVal)) {
        merged[key] = theirVal;
      } else if (this.deepEqual(theirVal, baseVal)) {
        merged[key] = ourVal;
      } else {
        // Conflict - try to merge recursively
        if (typeof ourVal === 'object' && typeof theirVal === 'object' && !Array.isArray(ourVal)) {
          const subMerge = this.mergeObjects(baseVal || {}, ourVal, theirVal);
          merged[key] = subMerge.value;
          conflicts.push(...subMerge.conflicts.map(c => `${key}.${c}`));
        } else {
          // Cannot auto-merge, record conflict
          conflicts.push(key);
          merged[key] = theirVal; // Default to theirs
        }
      }
    }

    return {
      success: conflicts.length === 0,
      value: merged,
      conflicts,
    };
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    return false;
  }

  /**
   * Check if conflict violates business rules
   */
  private violatesBusinessRule(conflict: ConflictInfo): boolean {
    // Example business rules
    const rules = [
      {
        field: 'status',
        rule: (our: any, their: any) => 
          !(our === 'completed' && their === 'pending'),
      },
      {
        field: 'quantity',
        rule: (our: any, their: any) => 
          !(our < 0 || their < 0),
      },
    ];

    const rule = rules.find(r => r.field === conflict.field);
    if (rule) {
      return !rule.rule(conflict.ourChange.value, conflict.theirChange.value);
    }

    return false;
  }

  /**
   * Assess business impact of conflict
   */
  private assessBusinessImpact(conflict: ConflictInfo, type: ConflictType): string {
    if (type === ConflictType.BUSINESS_RULE) {
      return 'High - Violates business rules';
    }

    const impactFields: Record<string, string> = {
      price: 'Financial impact - affects pricing',
      quantity: 'Inventory impact - affects stock levels',
      status: 'Workflow impact - affects process state',
      customer: 'Relationship impact - affects customer data',
    };

    return impactFields[conflict.field] || 'Low - Non-critical field';
  }

  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(
    strategies: ResolutionStrategy[],
    severity: string
  ): string {
    if (severity === 'critical') {
      return 'Manual review required - conflict affects critical business logic';
    }

    if (strategies.length === 0) {
      return 'No automatic resolution available - manual intervention needed';
    }

    const bestStrategy = strategies[0];
    if (bestStrategy.confidence > 0.8) {
      return `Recommend automatic resolution using "${bestStrategy.name}"`;
    } else if (bestStrategy.confidence > 0.6) {
      return `Suggest "${bestStrategy.name}" with manual review`;
    }

    return 'Multiple strategies available - user selection recommended';
  }

  /**
   * Analyze semantic difference for text
   */
  private async analyzeSemanticDifference(
    base: string,
    ours: string,
    theirs: string
  ): Promise<{
    canMerge: boolean;
    mergedText?: string;
    explanation: string;
    confidence: number;
  }> {
    // Simulate AI semantic analysis
    const ourChanges = this.extractChanges(base, ours);
    const theirChanges = this.extractChanges(base, theirs);

    // Check if changes are in different parts
    if (this.changesDoNotOverlap(ourChanges, theirChanges)) {
      // Merge both changes
      let merged = base;
      for (const change of [...ourChanges, ...theirChanges]) {
        merged = this.applyChange(merged, change);
      }

      return {
        canMerge: true,
        mergedText: merged,
        explanation: 'Changes affect different parts of the text',
        confidence: 0.85,
      };
    }

    // Check if changes are semantically compatible
    const compatible = this.areChangesCompatible(ourChanges, theirChanges);
    if (compatible) {
      return {
        canMerge: true,
        mergedText: theirs, // Default to most recent
        explanation: 'Changes are semantically compatible',
        confidence: 0.65,
      };
    }

    return {
      canMerge: false,
      explanation: 'Changes conflict semantically',
      confidence: 0.3,
    };
  }

  /**
   * Extract changes between texts
   */
  private extractChanges(base: string, modified: string): any[] {
    // Simplified change extraction
    const changes: any[] = [];
    const baseWords = base.split(' ');
    const modifiedWords = modified.split(' ');

    for (let i = 0; i < Math.max(baseWords.length, modifiedWords.length); i++) {
      if (baseWords[i] !== modifiedWords[i]) {
        changes.push({
          position: i,
          original: baseWords[i],
          modified: modifiedWords[i],
        });
      }
    }

    return changes;
  }

  /**
   * Check if changes overlap
   */
  private changesDoNotOverlap(changes1: any[], changes2: any[]): boolean {
    const positions1 = new Set(changes1.map(c => c.position));
    const positions2 = new Set(changes2.map(c => c.position));

    for (const pos of positions1) {
      if (positions2.has(pos)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if changes are compatible
   */
  private areChangesCompatible(changes1: any[], changes2: any[]): boolean {
    // Simple compatibility check
    return changes1.length + changes2.length < 5;
  }

  /**
   * Apply a change to text
   */
  private applyChange(text: string, change: any): string {
    const words = text.split(' ');
    if (change.position < words.length) {
      words[change.position] = change.modified || '';
    }
    return words.join(' ');
  }

  /**
   * Record resolution for learning
   */
  private recordResolution(
    conflict: ConflictInfo,
    strategy: ResolutionStrategy,
    result: ResolutionResult
  ): void {
    const entry: ResolutionHistory = {
      id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conflictId: `${conflict.sessionId}_${conflict.field}`,
      timestamp: new Date(),
      strategy: strategy.id,
      result,
    };

    this.history.push(entry);

    // Keep history size manageable
    if (this.history.length > 1000) {
      this.history = this.history.slice(-500);
    }
  }

  /**
   * Notify for manual review
   */
  private async notifyForReview(
    conflict: ConflictInfo,
    result: ResolutionResult,
    analysis: AIAnalysis
  ): Promise<void> {
    await notificationService.send({
      type: NotificationType.CONFLICT_DETECTED,
      recipients: [conflict.userId],
      subject: 'Conflict Resolution Review Required',
      body: `A conflict in field "${conflict.field}" requires review. ${analysis.recommendation}`,
      priority: analysis.severity === 'critical' ? 'urgent' : 'normal',
      metadata: {
        conflictId: `${conflict.sessionId}_${conflict.field}`,
        field: conflict.field,
        severity: analysis.severity,
        suggestedStrategy: analysis.suggestedStrategies[0]?.id,
      },
    });
  }

  /**
   * Provide feedback on resolution
   */
  provideFeedback(
    resolutionId: string,
    feedback: ResolutionFeedback
  ): void {
    const entry = this.history.find(h => h.id === resolutionId);
    if (entry) {
      entry.feedback = feedback;

      // Update strategy confidence based on feedback
      if (feedback.rating >= 4) {
        const strategy = this.strategies.get(entry.strategy);
        if (strategy) {
          strategy.confidence = Math.min(1, strategy.confidence * 1.1);
        }
      } else if (feedback.rating <= 2) {
        const strategy = this.strategies.get(entry.strategy);
        if (strategy) {
          strategy.confidence = Math.max(0.1, strategy.confidence * 0.9);
        }
      }
    }
  }

  /**
   * Get resolution suggestions for UI
   */
  async getSuggestions(conflict: ConflictInfo): Promise<{
    strategies: Array<{
      id: string;
      name: string;
      description: string;
      confidence: number;
      preview?: any;
    }>;
    analysis: AIAnalysis;
  }> {
    const analysis = await this.analyzeConflict(conflict);
    
    const strategies = await Promise.all(
      analysis.suggestedStrategies.map(async (strategy) => {
        let preview: any;
        try {
          const result = await strategy.resolve(conflict);
          preview = result.mergedValue;
        } catch {
          preview = undefined;
        }

        return {
          id: strategy.id,
          name: strategy.name,
          description: strategy.description,
          confidence: strategy.confidence,
          preview,
        };
      })
    );

    return { strategies, analysis };
  }

  /**
   * Get resolution metrics
   */
  getMetrics(): {
    totalResolutions: number;
    successRate: number;
    averageConfidence: number;
    strategyUsage: Record<string, number>;
    feedbackScore: number;
  } {
    const successful = this.history.filter(h => h.result.success).length;
    const totalConfidence = this.history.reduce((sum, h) => 
      sum + (h.result.confidence || 0), 0
    );
    
    const strategyUsage: Record<string, number> = {};
    for (const entry of this.history) {
      strategyUsage[entry.strategy] = (strategyUsage[entry.strategy] || 0) + 1;
    }

    const feedbacks = this.history
      .filter(h => h.feedback)
      .map(h => h.feedback!.rating);
    
    const avgFeedback = feedbacks.length > 0
      ? feedbacks.reduce((a, b) => a + b, 0) / feedbacks.length
      : 0;

    return {
      totalResolutions: this.history.length,
      successRate: this.history.length > 0 ? successful / this.history.length : 0,
      averageConfidence: this.history.length > 0 ? totalConfidence / this.history.length : 0,
      strategyUsage,
      feedbackScore: avgFeedback,
    };
  }
}

// Singleton instance
export const aiResolutionService = new AIResolutionService();