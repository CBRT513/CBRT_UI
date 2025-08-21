/**
 * Integration Storage Models
 * 
 * Strongly typed models for integration layer data persistence
 */

export interface Integration {
  id: string;
  name: string;
  description?: string;
  connectorType: string;
  connectorVersion: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'error' | 'pending';
  config: IntegrationConfig;
  credentials: string[]; // Array of credential IDs
  lastTestResult?: TestResult;
  metrics?: IntegrationMetrics;
  tags?: string[];
}

export interface IntegrationConfig {
  baseUrl?: string;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  customSettings?: Record<string, any>;
  validation?: {
    required: string[];
    optional: string[];
  };
}

export interface Credential {
  id: string;
  name: string;
  type: 'oauth2' | 'oidc' | 'api_key' | 'basic' | 'custom';
  integrationId: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'revoked' | 'pending';
  encryptedData: string; // Encrypted credential data
  metadata: CredentialMetadata;
  rotationPolicy?: RotationPolicy;
  lastUsed?: Date;
  usageCount: number;
}

export interface CredentialMetadata {
  scopes?: string[];
  permissions?: string[];
  refreshable: boolean;
  autoRotate: boolean;
  environment: 'development' | 'staging' | 'production';
  tags?: string[];
  description?: string;
}

export interface RotationPolicy {
  enabled: boolean;
  intervalDays: number;
  warningDays: number;
  autoRotate: boolean;
  notifyBefore: number; // Days before expiration to notify
  backupCredentials: number; // Number of backup credentials to maintain
}

export interface Mapping {
  id: string;
  name: string;
  description?: string;
  sourceIntegrationId: string;
  targetIntegrationId: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'error';
  mappingRules: MappingRule[];
  transformations: Transformation[];
  lastExecuted?: Date;
  executionCount: number;
  errorCount: number;
}

export interface MappingRule {
  id: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
    pattern?: string;
    min?: number;
    max?: number;
  };
}

export interface Transformation {
  id: string;
  name: string;
  type: 'format' | 'calculate' | 'lookup' | 'validate' | 'custom';
  function: string; // JavaScript function or reference
  parameters?: Record<string, any>;
  description?: string;
}

export interface Job {
  id: string;
  name: string;
  type: 'sync' | 'import' | 'export' | 'transform' | 'validate';
  integrationId: string;
  mappingId?: string;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  config: JobConfig;
  result?: JobResult;
  logs: JobLog[];
  retryCount: number;
  maxRetries: number;
}

export interface JobConfig {
  source?: {
    integrationId: string;
    query?: Record<string, any>;
    filters?: Record<string, any>;
  };
  target?: {
    integrationId: string;
    operation: 'create' | 'update' | 'delete' | 'upsert';
    batchSize?: number;
  };
  schedule?: {
    type: 'immediate' | 'scheduled' | 'recurring';
    cronExpression?: string;
    timezone?: string;
  };
  notifications?: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: string[];
    recipients: string[];
  };
  validation?: {
    skipInvalid: boolean;
    maxErrors: number;
    validateSchema: boolean;
  };
}

export interface JobResult {
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsSkipped: number;
  recordsFailed: number;
  executionTimeMs: number;
  errors: JobError[];
  warnings: JobWarning[];
  summary: Record<string, any>;
}

export interface JobLog {
  id: string;
  jobId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  correlationId?: string;
}

export interface JobError {
  code: string;
  message: string;
  field?: string;
  record?: Record<string, any>;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface JobWarning {
  code: string;
  message: string;
  field?: string;
  record?: Record<string, any>;
  timestamp: Date;
}

export interface TestResult {
  id: string;
  integrationId: string;
  testType: 'connection' | 'authentication' | 'functionality' | 'performance';
  status: 'passed' | 'failed' | 'warning';
  timestamp: Date;
  duration: number;
  results: TestResultDetail[];
  summary: string;
  metadata?: Record<string, any>;
}

export interface TestResultDetail {
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  message?: string;
  duration: number;
  expectedValue?: any;
  actualValue?: any;
}

export interface IntegrationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastResponseTime: number;
  uptime: number;
  errorRate: number;
  throughput: number;
  lastUpdated: Date;
  dailyStats?: DailyStats[];
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  requests: number;
  successes: number;
  failures: number;
  avgResponseTime: number;
  errors: { [code: string]: number };
}

// Audit and security models
export interface IntegrationAudit {
  id: string;
  integrationId: string;
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  sensitive: boolean; // Whether this contains sensitive data
}

export interface SecurityEvent {
  id: string;
  integrationId?: string;
  credentialId?: string;
  type: 'auth_failure' | 'suspicious_activity' | 'policy_violation' | 'data_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Query and filter interfaces
export interface IntegrationQuery {
  workspaceId?: string;
  status?: Integration['status'] | Integration['status'][];
  connectorType?: string | string[];
  createdBy?: string;
  tags?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: keyof Integration;
  sortOrder?: 'asc' | 'desc';
}

export interface CredentialQuery {
  workspaceId?: string;
  integrationId?: string;
  type?: Credential['type'] | Credential['type'][];
  status?: Credential['status'] | Credential['status'][];
  expiringBefore?: Date;
  environment?: CredentialMetadata['environment'];
  autoRotate?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: keyof Credential;
  sortOrder?: 'asc' | 'desc';
}

export interface JobQuery {
  workspaceId?: string;
  integrationId?: string;
  type?: Job['type'] | Job['type'][];
  status?: Job['status'] | Job['status'][];
  priority?: Job['priority'] | Job['priority'][];
  createdBy?: string;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  limit?: number;
  offset?: number;
  sortBy?: keyof Job;
  sortOrder?: 'asc' | 'desc';
}

// Create/Update DTOs
export interface CreateIntegrationDTO {
  name: string;
  description?: string;
  connectorType: string;
  connectorVersion: string;
  workspaceId: string;
  config: IntegrationConfig;
  tags?: string[];
}

export interface UpdateIntegrationDTO {
  name?: string;
  description?: string;
  status?: Integration['status'];
  config?: Partial<IntegrationConfig>;
  tags?: string[];
}

export interface CreateCredentialDTO {
  name: string;
  type: Credential['type'];
  integrationId: string;
  workspaceId: string;
  credentialData: Record<string, any>; // Will be encrypted
  metadata: CredentialMetadata;
  rotationPolicy?: RotationPolicy;
}

export interface UpdateCredentialDTO {
  name?: string;
  status?: Credential['status'];
  credentialData?: Record<string, any>; // Will be encrypted
  metadata?: Partial<CredentialMetadata>;
  rotationPolicy?: RotationPolicy;
}

export interface CreateJobDTO {
  name: string;
  type: Job['type'];
  integrationId: string;
  mappingId?: string;
  workspaceId: string;
  scheduledAt?: Date;
  priority?: Job['priority'];
  config: JobConfig;
  maxRetries?: number;
}

export interface UpdateJobDTO {
  name?: string;
  scheduledAt?: Date;
  priority?: Job['priority'];
  status?: Job['status'];
  config?: Partial<JobConfig>;
  maxRetries?: number;
}

// Result types
export interface QueryResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface OperationResult {
  success: boolean;
  id?: string;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

// Export all types
export type * from './models';