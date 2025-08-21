import { umsRequest, UmsError } from './client';

// Types
export interface Document {
  id: number;
  title: string;
  url?: string;
  snippet: string;
  match_score: number;
  capture_id: string;
  project_id: string;
}

export interface Entity {
  id: number;
  type: string;
  name: string;
  normalized: string;
  confidence: number;
  project: string;
}

export interface Edge {
  id: number;
  source_id: number;
  target_id: number;
  type: string;
  confidence: number;
  context?: string;
}

export interface ExtractRequest {
  text: string;
  project?: string;
  persist?: boolean;
}

export interface ExtractResponse {
  entities: Entity[];
  edges: Edge[];
  metadata?: {
    mode: string;
    processing_ms: number;
  };
}

export type ExtractionMode = 'rule' | 'llm' | 'hybrid';

// API functions
export async function getDocuments(
  query: string,
  limit = 10,
  signal?: AbortSignal
): Promise<Document[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  return umsRequest<Document[]>(`/api/graph/documents?${params}`, {
    method: 'GET',
    signal,
  });
}

export async function getEntities(
  query: string,
  limit = 10,
  signal?: AbortSignal
): Promise<Entity[]> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  return umsRequest<Entity[]>(`/api/graph/entities?${params}`, {
    method: 'GET',
    signal,
  });
}

export async function postExtract(
  text: string,
  mode: ExtractionMode = 'rule',
  options: Partial<ExtractRequest> = {},
  signal?: AbortSignal
): Promise<ExtractResponse> {
  const params = new URLSearchParams({ mode });

  return umsRequest<ExtractResponse>(`/api/graph/extract?${params}`, {
    method: 'POST',
    body: JSON.stringify({
      text,
      ...options,
    }),
    signal,
  });
}

// Re-export error class
export { UmsError };