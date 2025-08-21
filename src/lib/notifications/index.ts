/**
 * Notification System - Email, webhook, and real-time notifications
 */

export interface Notification {
  id: string;
  type: NotificationType;
  recipients: string[];
  subject: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'batched';
  sentAt?: Date;
  metadata?: Record<string, any>;
  batchId?: string;
}

export enum NotificationType {
  WORKFLOW = 'workflow',
  APPROVAL_REQUEST = 'approval_request',
  CONFLICT_DETECTED = 'conflict_detected',
  SYSTEM_ALERT = 'system_alert',
  MENTION = 'mention',
  DEADLINE = 'deadline',
  ESCALATION = 'escalation',
}

export enum NotificationChannel {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  REALTIME = 'realtime',
  SMS = 'sms',
  SLACK = 'slack',
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    email: ChannelPreference;
    webhook: ChannelPreference;
    realtime: ChannelPreference;
    sms: ChannelPreference;
    slack: ChannelPreference;
  };
  digest: DigestPreference;
  muted: MuteRule[];
  filters: NotificationFilter[];
}

export interface ChannelPreference {
  enabled: boolean;
  address?: string; // email, phone, webhook URL, etc.
  types: NotificationType[];
  priority?: 'high' | 'urgent'; // Only send if priority meets threshold
}

export interface DigestPreference {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  time?: string; // HH:MM for daily, day + HH:MM for weekly
  types: NotificationType[];
}

export interface MuteRule {
  type?: NotificationType;
  source?: string;
  until?: Date;
  reason?: string;
}

export interface NotificationFilter {
  field: string;
  operator: 'equals' | 'contains' | 'matches';
  value: any;
  action: 'allow' | 'block';
}

export interface NotificationBatch {
  id: string;
  userId: string;
  notifications: Notification[];
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed';
}

export interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

/**
 * Notification service for multi-channel delivery
 */
export class NotificationService {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private batches: Map<string, NotificationBatch> = new Map();
  private realtimeSubscribers: Map<string, Set<(notification: Notification) => void>> = new Map();
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private digestTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start digest processor
    this.startDigestProcessor();
  }

  /**
   * Send a notification
   */
  async send(params: {
    type: NotificationType | string;
    recipients: string[];
    subject: string;
    body: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    channels?: NotificationChannel[];
    metadata?: Record<string, any>;
  }): Promise<Notification> {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type as NotificationType,
      recipients: params.recipients,
      subject: params.subject,
      body: params.body,
      priority: params.priority || 'normal',
      channels: params.channels || [NotificationChannel.EMAIL, NotificationChannel.REALTIME],
      status: 'pending',
      metadata: params.metadata,
    };

    this.notifications.set(notification.id, notification);

    // Process for each recipient
    for (const recipientId of params.recipients) {
      await this.processForRecipient(notification, recipientId);
    }

    return notification;
  }

  /**
   * Process notification for a specific recipient
   */
  private async processForRecipient(
    notification: Notification,
    recipientId: string
  ): Promise<void> {
    const prefs = this.preferences.get(recipientId);

    // Check if muted
    if (this.isMuted(notification, prefs)) {
      return;
    }

    // Apply filters
    if (!this.passesFilters(notification, prefs)) {
      return;
    }

    // Check if should be batched
    if (this.shouldBatch(notification, prefs)) {
      await this.addToBatch(notification, recipientId);
      return;
    }

    // Send through configured channels
    const channels = this.getActiveChannels(notification, prefs);
    
    const deliveryPromises = channels.map(channel => 
      this.deliverThroughChannel(notification, recipientId, channel)
    );

    try {
      await Promise.all(deliveryPromises);
      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      notification.status = 'failed';
      console.error('Notification delivery failed:', error);
    }
  }

  /**
   * Deliver notification through specific channel
   */
  private async deliverThroughChannel(
    notification: Notification,
    recipientId: string,
    channel: NotificationChannel
  ): Promise<void> {
    const startTime = Date.now();

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.sendEmail(notification, recipientId);
          break;
        
        case NotificationChannel.WEBHOOK:
          await this.sendWebhook(notification, recipientId);
          break;
        
        case NotificationChannel.REALTIME:
          await this.sendRealtime(notification, recipientId);
          break;
        
        case NotificationChannel.SMS:
          await this.sendSMS(notification, recipientId);
          break;
        
        case NotificationChannel.SLACK:
          await this.sendSlack(notification, recipientId);
          break;
      }

      const latency = Date.now() - startTime;
      if (latency > 100) {
        console.warn(`Slow notification delivery: ${channel} took ${latency}ms`);
      }
    } catch (error) {
      console.error(`Failed to deliver through ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: Notification, recipientId: string): Promise<void> {
    // In real implementation, integrate with email service
    console.log(`[EMAIL] To: ${recipientId}`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Body: ${notification.body}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(notification: Notification, recipientId: string): Promise<void> {
    const config = this.webhookConfigs.get(recipientId);
    if (!config) {
      console.warn(`No webhook config for ${recipientId}`);
      return;
    }

    const payload = {
      id: notification.id,
      type: notification.type,
      subject: notification.subject,
      body: notification.body,
      priority: notification.priority,
      metadata: notification.metadata,
      timestamp: new Date().toISOString(),
    };

    // In real implementation, make HTTP request
    console.log(`[WEBHOOK] ${config.method} ${config.url}`);
    console.log('Payload:', payload);
    
    // Simulate webhook call
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  /**
   * Send real-time notification
   */
  private async sendRealtime(notification: Notification, recipientId: string): Promise<void> {
    const subscribers = this.realtimeSubscribers.get(recipientId);
    
    if (subscribers && subscribers.size > 0) {
      subscribers.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Realtime notification callback error:', error);
        }
      });
    }
    
    // Also store for later retrieval
    const userNotifications = this.getUserNotifications(recipientId);
    userNotifications.push(notification);
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: Notification, recipientId: string): Promise<void> {
    // In real implementation, integrate with SMS service
    console.log(`[SMS] To: ${recipientId}`);
    console.log(`Message: ${notification.subject}`);
    
    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send Slack notification
   */
  private async sendSlack(notification: Notification, recipientId: string): Promise<void> {
    // In real implementation, integrate with Slack API
    console.log(`[SLACK] To: ${recipientId}`);
    console.log(`Message: ${notification.subject}`);
    
    // Simulate Slack sending
    await new Promise(resolve => setTimeout(resolve, 30));
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToRealtime(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    if (!this.realtimeSubscribers.has(userId)) {
      this.realtimeSubscribers.set(userId, new Set());
    }

    const subscribers = this.realtimeSubscribers.get(userId)!;
    subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.realtimeSubscribers.delete(userId);
      }
    };
  }

  /**
   * Set user preferences
   */
  setPreferences(userId: string, preferences: NotificationPreferences): void {
    this.preferences.set(userId, preferences);
  }

  /**
   * Add notification to batch
   */
  private async addToBatch(notification: Notification, userId: string): Promise<void> {
    const prefs = this.preferences.get(userId);
    if (!prefs?.digest.enabled) return;

    const batchId = `batch_${userId}_${this.getDigestKey(prefs.digest)}`;
    
    let batch = this.batches.get(batchId);
    if (!batch) {
      batch = {
        id: batchId,
        userId,
        notifications: [],
        scheduledFor: this.getNextDigestTime(prefs.digest),
        status: 'pending',
      };
      this.batches.set(batchId, batch);
    }

    batch.notifications.push(notification);
    notification.status = 'batched';
    notification.batchId = batchId;
  }

  /**
   * Process digest batches
   */
  private startDigestProcessor(): void {
    // Run every minute to check for due batches
    this.digestTimer = setInterval(() => {
      this.processDigestBatches();
    }, 60000);
  }

  /**
   * Process pending digest batches
   */
  private async processDigestBatches(): Promise<void> {
    const now = new Date();
    
    for (const batch of this.batches.values()) {
      if (batch.status === 'pending' && batch.scheduledFor <= now) {
        await this.sendDigest(batch);
      }
    }
  }

  /**
   * Send digest batch
   */
  private async sendDigest(batch: NotificationBatch): Promise<void> {
    if (batch.notifications.length === 0) return;

    const subject = `Digest: ${batch.notifications.length} notifications`;
    const body = batch.notifications
      .map(n => `• ${n.subject}\n  ${n.body}`)
      .join('\n\n');

    await this.send({
      type: NotificationType.SYSTEM_ALERT,
      recipients: [batch.userId],
      subject,
      body,
      priority: 'normal',
      channels: [NotificationChannel.EMAIL],
      metadata: {
        batchId: batch.id,
        count: batch.notifications.length,
      },
    });

    batch.status = 'sent';
    this.batches.delete(batch.id);
  }

  /**
   * Check if notification is muted
   */
  private isMuted(notification: Notification, prefs?: NotificationPreferences): boolean {
    if (!prefs?.muted) return false;

    return prefs.muted.some(rule => {
      if (rule.until && rule.until < new Date()) return false;
      if (rule.type && rule.type !== notification.type) return false;
      return true;
    });
  }

  /**
   * Check if notification passes filters
   */
  private passesFilters(notification: Notification, prefs?: NotificationPreferences): boolean {
    if (!prefs?.filters || prefs.filters.length === 0) return true;

    for (const filter of prefs.filters) {
      const value = notification.metadata?.[filter.field];
      let matches = false;

      switch (filter.operator) {
        case 'equals':
          matches = value === filter.value;
          break;
        case 'contains':
          matches = String(value).includes(String(filter.value));
          break;
        case 'matches':
          matches = new RegExp(filter.value).test(String(value));
          break;
      }

      if (filter.action === 'block' && matches) return false;
      if (filter.action === 'allow' && !matches) return false;
    }

    return true;
  }

  /**
   * Check if notification should be batched
   */
  private shouldBatch(notification: Notification, prefs?: NotificationPreferences): boolean {
    if (!prefs?.digest.enabled) return false;
    if (notification.priority === 'urgent') return false;
    return prefs.digest.types.includes(notification.type);
  }

  /**
   * Get active channels for notification
   */
  private getActiveChannels(
    notification: Notification,
    prefs?: NotificationPreferences
  ): NotificationChannel[] {
    if (!prefs) return notification.channels;

    const activeChannels: NotificationChannel[] = [];

    for (const channel of notification.channels) {
      const channelPref = prefs.channels[channel];
      if (!channelPref?.enabled) continue;

      // Check priority threshold
      if (channelPref.priority) {
        const priorityLevels = ['low', 'normal', 'high', 'urgent'];
        const notifPriority = priorityLevels.indexOf(notification.priority);
        const thresholdPriority = priorityLevels.indexOf(channelPref.priority);
        
        if (notifPriority < thresholdPriority) continue;
      }

      // Check notification type
      if (channelPref.types.length > 0 && !channelPref.types.includes(notification.type)) {
        continue;
      }

      activeChannels.push(channel);
    }

    return activeChannels;
  }

  /**
   * Get digest key for batching
   */
  private getDigestKey(digest: DigestPreference): string {
    const now = new Date();
    
    switch (digest.frequency) {
      case 'hourly':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'daily':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'weekly':
        const week = Math.floor(now.getDate() / 7);
        return `${now.getFullYear()}-${now.getMonth()}-W${week}`;
      default:
        return 'default';
    }
  }

  /**
   * Get next digest time
   */
  private getNextDigestTime(digest: DigestPreference): Date {
    const now = new Date();
    
    switch (digest.frequency) {
      case 'hourly':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0);
      case 'weekly':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 0, 0);
      default:
        return now;
    }
  }

  /**
   * Get user's notifications
   */
  private getUserNotifications(userId: string): Notification[] {
    // In real implementation, store in database
    return Array.from(this.notifications.values())
      .filter(n => n.recipients.includes(userId));
  }

  /**
   * Get notification metrics
   */
  getMetrics(): {
    totalSent: number;
    totalFailed: number;
    totalBatched: number;
    averageLatency: number;
    channelBreakdown: Record<string, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    
    const sent = notifications.filter(n => n.status === 'sent');
    const failed = notifications.filter(n => n.status === 'failed');
    const batched = notifications.filter(n => n.status === 'batched');

    const channelBreakdown: Record<string, number> = {};
    for (const notif of sent) {
      for (const channel of notif.channels) {
        channelBreakdown[channel] = (channelBreakdown[channel] || 0) + 1;
      }
    }

    return {
      totalSent: sent.length,
      totalFailed: failed.length,
      totalBatched: batched.length,
      averageLatency: 50, // Simulated
      channelBreakdown,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.digestTimer) {
      clearInterval(this.digestTimer);
      this.digestTimer = null;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();