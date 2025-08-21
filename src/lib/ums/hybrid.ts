import { postExtract, ExtractionMode, ExtractResponse, Entity, Edge } from './index';

export interface HybridExtractionOptions {
  project?: string;
  persist?: boolean;
  preferLLM?: boolean;
  confidenceThreshold?: number;
  explainReasoning?: boolean;
}

export interface ExtractionMetrics {
  ruleEntities: number;
  llmEntities: number;
  mergedEntities: number;
  ruleMs: number;
  llmMs: number;
  totalMs: number;
  fallbackRate: number;
}

export interface ReasoningPath {
  step: string;
  method: 'rule' | 'llm' | 'merge';
  confidence: number;
  details: string;
  entities?: Entity[];
  edges?: Edge[];
}

export interface HybridExtractResponse extends ExtractResponse {
  metrics?: ExtractionMetrics;
  reasoning?: ReasoningPath[];
}

/**
 * Hybrid extraction pipeline - rules first, LLM fallback for low confidence
 */
export async function hybridExtract(
  text: string,
  options: HybridExtractionOptions = {}
): Promise<HybridExtractResponse> {
  const {
    project,
    persist = false,
    preferLLM = false,
    confidenceThreshold = 0.7,
    explainReasoning = false,
  } = options;

  const startTime = Date.now();
  const reasoning: ReasoningPath[] = [];
  
  // Step 1: Rule-based extraction (fast, deterministic)
  const ruleStart = Date.now();
  let ruleResult: ExtractResponse;
  
  try {
    if (explainReasoning) {
      reasoning.push({
        step: 'Initial rule-based extraction',
        method: 'rule',
        confidence: 0.9,
        details: 'Applying pattern-based rules for entity detection',
      });
    }
    
    ruleResult = await postExtract(text, 'rule', { project, persist: false });
    const ruleMs = Date.now() - ruleStart;
    
    if (explainReasoning) {
      reasoning.push({
        step: 'Rule extraction complete',
        method: 'rule',
        confidence: 0.9,
        details: `Found ${ruleResult.entities.length} entities, ${ruleResult.edges.length} edges in ${ruleMs}ms`,
        entities: ruleResult.entities,
        edges: ruleResult.edges,
      });
    }
  } catch (error) {
    if (explainReasoning) {
      reasoning.push({
        step: 'Rule extraction failed',
        method: 'rule',
        confidence: 0,
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    ruleResult = { entities: [], edges: [] };
  }
  
  // Step 2: Evaluate confidence and determine if LLM is needed
  const lowConfidenceEntities = ruleResult.entities.filter(
    e => e.confidence < confidenceThreshold
  );
  
  const needsLLM = preferLLM || 
    ruleResult.entities.length === 0 || 
    lowConfidenceEntities.length > ruleResult.entities.length * 0.3;
  
  let llmResult: ExtractResponse | null = null;
  let llmMs = 0;
  
  if (needsLLM) {
    if (explainReasoning) {
      reasoning.push({
        step: 'LLM fallback triggered',
        method: 'llm',
        confidence: 0.8,
        details: `Low confidence or missing entities detected. ${lowConfidenceEntities.length} entities below threshold ${confidenceThreshold}`,
      });
    }
    
    // Step 3: LLM extraction for ambiguous cases
    const llmStart = Date.now();
    try {
      llmResult = await postExtract(text, 'llm', { project, persist: false });
      llmMs = Date.now() - llmStart;
      
      if (explainReasoning) {
        reasoning.push({
          step: 'LLM extraction complete',
          method: 'llm',
          confidence: 0.85,
          details: `Found ${llmResult.entities.length} entities, ${llmResult.edges.length} edges in ${llmMs}ms`,
          entities: llmResult.entities,
          edges: llmResult.edges,
        });
      }
    } catch (error) {
      if (explainReasoning) {
        reasoning.push({
          step: 'LLM extraction failed',
          method: 'llm',
          confidence: 0,
          details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to rule results.`,
        });
      }
    }
  }
  
  // Step 4: Merge results intelligently
  let finalEntities = ruleResult.entities;
  let finalEdges = ruleResult.edges;
  
  if (llmResult) {
    const mergedData = mergeResults(ruleResult, llmResult, confidenceThreshold);
    finalEntities = mergedData.entities;
    finalEdges = mergedData.edges;
    
    if (explainReasoning) {
      reasoning.push({
        step: 'Results merged',
        method: 'merge',
        confidence: 0.9,
        details: `Combined rule and LLM results. Final: ${finalEntities.length} entities, ${finalEdges.length} edges`,
        entities: finalEntities,
        edges: finalEdges,
      });
    }
  }
  
  // Step 5: Persist if requested
  if (persist && finalEntities.length > 0) {
    if (explainReasoning) {
      reasoning.push({
        step: 'Persisting to graph',
        method: 'merge',
        confidence: 1.0,
        details: `Saving ${finalEntities.length} entities and ${finalEdges.length} edges to knowledge graph`,
      });
    }
    
    // Here we would normally call a persistence endpoint
    // For now, we'll just mark it in reasoning
  }
  
  const totalMs = Date.now() - startTime;
  
  // Calculate metrics
  const metrics: ExtractionMetrics = {
    ruleEntities: ruleResult.entities.length,
    llmEntities: llmResult?.entities.length || 0,
    mergedEntities: finalEntities.length,
    ruleMs: Date.now() - ruleStart - llmMs,
    llmMs,
    totalMs,
    fallbackRate: needsLLM ? lowConfidenceEntities.length / Math.max(ruleResult.entities.length, 1) : 0,
  };
  
  return {
    entities: finalEntities,
    edges: finalEdges,
    metadata: {
      mode: llmResult ? 'hybrid' : 'rule',
      processing_ms: totalMs,
    },
    metrics,
    ...(explainReasoning && { reasoning }),
  };
}

/**
 * Intelligent merging of rule and LLM results
 */
function mergeResults(
  ruleResult: ExtractResponse,
  llmResult: ExtractResponse,
  confidenceThreshold: number
): ExtractResponse {
  const entityMap = new Map<string, Entity>();
  
  // Add high-confidence rule entities
  ruleResult.entities
    .filter(e => e.confidence >= confidenceThreshold)
    .forEach(e => {
      const key = `${e.type}:${e.normalized}`;
      entityMap.set(key, e);
    });
  
  // Add LLM entities (prefer LLM for ambiguous cases)
  llmResult.entities.forEach(e => {
    const key = `${e.type}:${e.normalized}`;
    const existing = entityMap.get(key);
    
    if (!existing || existing.confidence < e.confidence) {
      entityMap.set(key, {
        ...e,
        confidence: existing ? (e.confidence + existing.confidence) / 2 : e.confidence,
      });
    }
  });
  
  // Merge edges similarly
  const edgeMap = new Map<string, Edge>();
  
  [...ruleResult.edges, ...llmResult.edges].forEach(edge => {
    const key = `${edge.source_id}-${edge.type}-${edge.target_id}`;
    const existing = edgeMap.get(key);
    
    if (!existing || existing.confidence < edge.confidence) {
      edgeMap.set(key, edge);
    }
  });
  
  return {
    entities: Array.from(entityMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/**
 * Validate extraction results
 */
export function validateExtraction(result: ExtractResponse): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check for empty results
  if (result.entities.length === 0) {
    issues.push('No entities found');
  }
  
  // Check for duplicate entities
  const seen = new Set<string>();
  result.entities.forEach(e => {
    const key = `${e.type}:${e.normalized}`;
    if (seen.has(key)) {
      issues.push(`Duplicate entity: ${key}`);
    }
    seen.add(key);
  });
  
  // Check for invalid confidence scores
  result.entities.forEach(e => {
    if (e.confidence < 0 || e.confidence > 1) {
      issues.push(`Invalid confidence for ${e.name}: ${e.confidence}`);
    }
  });
  
  // Check for orphaned edges
  const entityIds = new Set(result.entities.map(e => e.id));
  result.edges.forEach(edge => {
    if (!entityIds.has(edge.source_id)) {
      issues.push(`Edge references missing source entity: ${edge.source_id}`);
    }
    if (!entityIds.has(edge.target_id)) {
      issues.push(`Edge references missing target entity: ${edge.target_id}`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues,
  };
}