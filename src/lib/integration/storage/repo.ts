/**
 * Integration Repository
 * 
 * CRUD operations and encrypted secret store facade
 */

import crypto from 'crypto';
import {
  Integration,
  Credential,
  Mapping,
  Job,
  TestResult,
  IntegrationAudit,
  SecurityEvent,
  IntegrationQuery,
  CredentialQuery,
  JobQuery,
  CreateIntegrationDTO,
  UpdateIntegrationDTO,
  CreateCredentialDTO,
  UpdateCredentialDTO,
  CreateJobDTO,
  UpdateJobDTO,
  QueryResult,
  OperationResult,
} from './models';

// Encryption configuration
interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
  saltLength: number;
}

const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyLength: 32,
  ivLength: 16,
  tagLength: 16,
  saltLength: 32,
};

// Storage interface for dependency injection
export interface StorageAdapter {
  // Generic CRUD operations
  create<T>(table: string, data: T): Promise<T & { id: string }>;
  findById<T>(table: string, id: string): Promise<T | null>;
  findMany<T>(table: string, query: Record<string, any>): Promise<T[]>;
  update<T>(table: string, id: string, data: Partial<T>): Promise<T | null>;
  delete(table: string, id: string): Promise<boolean>;
  count(table: string, query: Record<string, any>): Promise<number>;
  
  // Transaction support
  transaction<T>(callback: (tx: StorageAdapter) => Promise<T>): Promise<T>;
}

/**
 * Encrypted secret store for sensitive credential data
 */
export class EncryptedSecretStore {
  private masterKey: Buffer;
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter, masterKey?: string) {
    this.storage = storage;
    this.masterKey = masterKey 
      ? Buffer.from(masterKey, 'hex')
      : this.generateMasterKey();
  }

  /**
   * Generate a new master key
   */
  private generateMasterKey(): Buffer {
    return crypto.randomBytes(ENCRYPTION_CONFIG.keyLength);
  }

  /**
   * Derive encryption key from master key and salt
   */
  private deriveKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      100000, // iterations
      ENCRYPTION_CONFIG.keyLength,
      'sha512'
    );
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: Record<string, any>): string {
    const salt = crypto.randomBytes(ENCRYPTION_CONFIG.saltLength);
    const key = this.deriveKey(salt);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    
    const cipher = crypto.createCipher(ENCRYPTION_CONFIG.algorithm, key);
    cipher.setAAD(salt); // Additional authenticated data
    
    const plaintext = JSON.stringify(data);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine salt + iv + authTag + encrypted data
    return Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): Record<string, any> {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    const salt = buffer.subarray(0, ENCRYPTION_CONFIG.saltLength);
    const iv = buffer.subarray(
      ENCRYPTION_CONFIG.saltLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength
    );
    const authTag = buffer.subarray(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength,
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength
    );
    const encrypted = buffer.subarray(
      ENCRYPTION_CONFIG.saltLength + ENCRYPTION_CONFIG.ivLength + ENCRYPTION_CONFIG.tagLength
    );
    
    const key = this.deriveKey(salt);
    const decipher = crypto.createDecipher(ENCRYPTION_CONFIG.algorithm, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(newMasterKey?: string): Promise<void> {
    const oldKey = this.masterKey;
    this.masterKey = newMasterKey 
      ? Buffer.from(newMasterKey, 'hex')
      : this.generateMasterKey();

    // Re-encrypt all credentials with new key
    const credentials = await this.storage.findMany<Credential>('credentials', {});
    
    for (const credential of credentials) {
      try {
        // Temporarily switch back to old key to decrypt
        this.masterKey = oldKey;
        const decryptedData = this.decrypt(credential.encryptedData);
        
        // Switch to new key and re-encrypt
        this.masterKey = newMasterKey 
          ? Buffer.from(newMasterKey, 'hex')
          : this.generateMasterKey();
        const newEncryptedData = this.encrypt(decryptedData);
        
        await this.storage.update('credentials', credential.id, {
          encryptedData: newEncryptedData,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to rotate key for credential ${credential.id}:`, error);
        throw new Error(`Key rotation failed for credential ${credential.id}`);
      }
    }
  }

  /**
   * Get master key for backup/export (use carefully!)
   */
  getMasterKeyHex(): string {
    return this.masterKey.toString('hex');
  }
}

/**
 * Integration repository with encrypted credential storage
 */
export class IntegrationRepository {
  private storage: StorageAdapter;
  private secretStore: EncryptedSecretStore;

  constructor(storage: StorageAdapter, masterKey?: string) {
    this.storage = storage;
    this.secretStore = new EncryptedSecretStore(storage, masterKey);
  }

  // Integration CRUD operations
  async createIntegration(data: CreateIntegrationDTO, userId: string): Promise<OperationResult> {
    try {
      const integration: Omit<Integration, 'id'> = {
        ...data,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
        credentials: [],
      };

      const result = await this.storage.create('integrations', integration);
      
      await this.auditLog(result.id, userId, 'integration_created', {
        name: data.name,
        connectorType: data.connectorType,
      });

      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getIntegration(id: string): Promise<Integration | null> {
    return this.storage.findById<Integration>('integrations', id);
  }

  async queryIntegrations(query: IntegrationQuery): Promise<QueryResult<Integration>> {
    const filter = this.buildIntegrationFilter(query);
    const total = await this.storage.count('integrations', filter);
    const data = await this.storage.findMany<Integration>('integrations', {
      ...filter,
      limit: query.limit || 50,
      offset: query.offset || 0,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      data,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + data.length < total,
    };
  }

  async updateIntegration(id: string, data: UpdateIntegrationDTO, userId: string): Promise<OperationResult> {
    try {
      const updated = await this.storage.update('integrations', id, {
        ...data,
        updatedAt: new Date(),
      });

      if (!updated) {
        return { success: false, error: 'Integration not found' };
      }

      await this.auditLog(id, userId, 'integration_updated', data);
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteIntegration(id: string, userId: string): Promise<OperationResult> {
    try {
      // Check for active jobs
      const activeJobs = await this.storage.findMany<Job>('jobs', {
        integrationId: id,
        status: ['running', 'pending'],
      });

      if (activeJobs.length > 0) {
        return { 
          success: false, 
          error: 'Cannot delete integration with active jobs',
          warnings: [`${activeJobs.length} active jobs found`],
        };
      }

      // Delete associated credentials
      const credentials = await this.storage.findMany<Credential>('credentials', {
        integrationId: id,
      });

      for (const credential of credentials) {
        await this.deleteCredential(credential.id, userId);
      }

      const deleted = await this.storage.delete('integrations', id);
      if (!deleted) {
        return { success: false, error: 'Integration not found' };
      }

      await this.auditLog(id, userId, 'integration_deleted', {});
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Credential CRUD operations with encryption
  async createCredential(data: CreateCredentialDTO, userId: string): Promise<OperationResult> {
    try {
      const encryptedData = this.secretStore.encrypt(data.credentialData);
      
      const credential: Omit<Credential, 'id'> = {
        name: data.name,
        type: data.type,
        integrationId: data.integrationId,
        workspaceId: data.workspaceId,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        encryptedData,
        metadata: data.metadata,
        rotationPolicy: data.rotationPolicy,
        usageCount: 0,
      };

      const result = await this.storage.create('credentials', credential);
      
      // Update integration to include this credential
      const integration = await this.getIntegration(data.integrationId);
      if (integration) {
        await this.storage.update('integrations', data.integrationId, {
          credentials: [...integration.credentials, result.id],
          updatedAt: new Date(),
        });
      }

      await this.auditLog(data.integrationId, userId, 'credential_created', {
        credentialId: result.id,
        type: data.type,
        name: data.name,
      }, true);

      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getCredential(id: string): Promise<Credential | null> {
    const credential = await this.storage.findById<Credential>('credentials', id);
    if (!credential) return null;

    // Update last used timestamp
    await this.storage.update('credentials', id, {
      lastUsed: new Date(),
      usageCount: credential.usageCount + 1,
    });

    return credential;
  }

  async getCredentialDecrypted(id: string): Promise<(Credential & { credentialData: Record<string, any> }) | null> {
    const credential = await this.getCredential(id);
    if (!credential) return null;

    try {
      const credentialData = this.secretStore.decrypt(credential.encryptedData);
      return { ...credential, credentialData };
    } catch (error) {
      console.error(`Failed to decrypt credential ${id}:`, error);
      return null;
    }
  }

  async queryCredentials(query: CredentialQuery): Promise<QueryResult<Credential>> {
    const filter = this.buildCredentialFilter(query);
    const total = await this.storage.count('credentials', filter);
    const data = await this.storage.findMany<Credential>('credentials', {
      ...filter,
      limit: query.limit || 50,
      offset: query.offset || 0,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      data,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + data.length < total,
    };
  }

  async updateCredential(id: string, data: UpdateCredentialDTO, userId: string): Promise<OperationResult> {
    try {
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      // If credential data is being updated, encrypt it
      if (data.credentialData) {
        updateData.encryptedData = this.secretStore.encrypt(data.credentialData);
        delete updateData.credentialData;
      }

      const updated = await this.storage.update('credentials', id, updateData);
      if (!updated) {
        return { success: false, error: 'Credential not found' };
      }

      await this.auditLog(updated.integrationId, userId, 'credential_updated', {
        credentialId: id,
        changes: Object.keys(data),
      }, true);

      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteCredential(id: string, userId: string): Promise<OperationResult> {
    try {
      const credential = await this.storage.findById<Credential>('credentials', id);
      if (!credential) {
        return { success: false, error: 'Credential not found' };
      }

      const deleted = await this.storage.delete('credentials', id);
      if (!deleted) {
        return { success: false, error: 'Failed to delete credential' };
      }

      // Remove from integration
      const integration = await this.getIntegration(credential.integrationId);
      if (integration) {
        await this.storage.update('integrations', credential.integrationId, {
          credentials: integration.credentials.filter(cid => cid !== id),
          updatedAt: new Date(),
        });
      }

      await this.auditLog(credential.integrationId, userId, 'credential_deleted', {
        credentialId: id,
        type: credential.type,
      }, true);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rotateCredential(id: string, newCredentialData: Record<string, any>, userId: string): Promise<OperationResult> {
    try {
      const credential = await this.getCredential(id);
      if (!credential) {
        return { success: false, error: 'Credential not found' };
      }

      const encryptedData = this.secretStore.encrypt(newCredentialData);
      
      await this.storage.update('credentials', id, {
        encryptedData,
        updatedAt: new Date(),
        status: 'active',
      });

      await this.auditLog(credential.integrationId, userId, 'credential_rotated', {
        credentialId: id,
        type: credential.type,
      }, true);

      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Job CRUD operations
  async createJob(data: CreateJobDTO, userId: string): Promise<OperationResult> {
    try {
      const job: Omit<Job, 'id'> = {
        ...data,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
        priority: data.priority || 'normal',
        logs: [],
        retryCount: 0,
        maxRetries: data.maxRetries || 3,
      };

      const result = await this.storage.create('jobs', job);
      
      await this.auditLog(data.integrationId, userId, 'job_created', {
        jobId: result.id,
        type: data.type,
        name: data.name,
      });

      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getJob(id: string): Promise<Job | null> {
    return this.storage.findById<Job>('jobs', id);
  }

  async queryJobs(query: JobQuery): Promise<QueryResult<Job>> {
    const filter = this.buildJobFilter(query);
    const total = await this.storage.count('jobs', filter);
    const data = await this.storage.findMany<Job>('jobs', {
      ...filter,
      limit: query.limit || 50,
      offset: query.offset || 0,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    });

    return {
      data,
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + data.length < total,
    };
  }

  // Test result storage
  async storeTestResult(result: Omit<TestResult, 'id'>): Promise<string> {
    const stored = await this.storage.create('test_results', {
      ...result,
      timestamp: new Date(),
    });
    return stored.id;
  }

  async getTestResults(integrationId: string, limit: number = 10): Promise<TestResult[]> {
    return this.storage.findMany<TestResult>('test_results', {
      integrationId,
      limit,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  }

  // Helper methods
  private buildIntegrationFilter(query: IntegrationQuery): Record<string, any> {
    const filter: Record<string, any> = {};
    
    if (query.workspaceId) filter.workspaceId = query.workspaceId;
    if (query.status) filter.status = query.status;
    if (query.connectorType) filter.connectorType = query.connectorType;
    if (query.createdBy) filter.createdBy = query.createdBy;
    if (query.tags) filter.tags = { $in: query.tags };
    if (query.createdAfter) filter.createdAt = { $gte: query.createdAfter };
    if (query.createdBefore) {
      filter.createdAt = { ...filter.createdAt, $lte: query.createdBefore };
    }
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    return filter;
  }

  private buildCredentialFilter(query: CredentialQuery): Record<string, any> {
    const filter: Record<string, any> = {};
    
    if (query.workspaceId) filter.workspaceId = query.workspaceId;
    if (query.integrationId) filter.integrationId = query.integrationId;
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.expiringBefore) filter.expiresAt = { $lte: query.expiringBefore };
    if (query.environment) filter['metadata.environment'] = query.environment;
    if (query.autoRotate !== undefined) filter['metadata.autoRotate'] = query.autoRotate;

    return filter;
  }

  private buildJobFilter(query: JobQuery): Record<string, any> {
    const filter: Record<string, any> = {};
    
    if (query.workspaceId) filter.workspaceId = query.workspaceId;
    if (query.integrationId) filter.integrationId = query.integrationId;
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.createdBy) filter.createdBy = query.createdBy;
    if (query.scheduledAfter) filter.scheduledAt = { $gte: query.scheduledAfter };
    if (query.scheduledBefore) {
      filter.scheduledAt = { ...filter.scheduledAt, $lte: query.scheduledBefore };
    }

    return filter;
  }

  private async auditLog(
    integrationId: string,
    userId: string,
    action: string,
    details: Record<string, any>,
    sensitive: boolean = false
  ): Promise<void> {
    const audit: Omit<IntegrationAudit, 'id'> = {
      integrationId,
      userId,
      action,
      timestamp: new Date(),
      details,
      sensitive,
    };

    await this.storage.create('integration_audits', audit);
  }

  // Token rotation API
  async getExpiringCredentials(days: number = 7): Promise<Credential[]> {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    return this.storage.findMany<Credential>('credentials', {
      expiresAt: { $lte: expirationDate },
      status: 'active',
    });
  }

  async rotateEncryptionKey(newMasterKey?: string): Promise<void> {
    await this.secretStore.rotateKey(newMasterKey);
  }

  getMasterKeyForBackup(): string {
    return this.secretStore.getMasterKeyHex();
  }
}

// Export singleton instance
export const integrationRepository = new IntegrationRepository(
  // Storage adapter will be injected based on environment
  {} as StorageAdapter,
  process.env.INTEGRATION_MASTER_KEY
);