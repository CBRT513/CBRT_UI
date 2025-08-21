// Offline queue system for spotty connectivity scenarios
import { logger } from './logger';

class OfflineQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;
    this.isProcessing = false;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start processing if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  // Load queue from localStorage
  loadQueue() {
    try {
      const saved = localStorage.getItem('cbrt_offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      logger.error('Failed to load offline queue', error);
      return [];
    }
  }

  // Save queue to localStorage
  saveQueue() {
    try {
      localStorage.setItem('cbrt_offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Failed to save offline queue', error);
    }
  }

  // Add operation to queue
  enqueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      operation,
      retries: 0,
      maxRetries: 3
    };

    this.queue.push(queueItem);
    this.saveQueue();

    logger.info('Operation queued for offline processing', {
      queueId: queueItem.id,
      operation: operation.type,
      queueLength: this.queue.length
    });

    // If online, try to process immediately
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return queueItem.id;
  }

  // Remove operation from queue
  dequeue(queueId) {
    this.queue = this.queue.filter(item => item.id !== queueId);
    this.saveQueue();
  }

  // Handle online event
  handleOnline() {
    this.isOnline = true;
    logger.info('Connection restored, processing offline queue', {
      queueLength: this.queue.length
    });
    this.processQueue();
  }

  // Handle offline event
  handleOffline() {
    this.isOnline = false;
    logger.warn('Connection lost, operations will be queued');
  }

  // Process all items in queue
  async processQueue() {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info('Processing offline queue', { queueLength: this.queue.length });

    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      try {
        await this.processQueueItem(item);
        this.dequeue(item.id);
        
        logger.info('Queue item processed successfully', {
          queueId: item.id,
          operation: item.operation.type
        });
      } catch (error) {
        item.retries++;
        
        if (item.retries >= item.maxRetries) {
          logger.error('Queue item failed after max retries', error, {
            queueId: item.id,
            operation: item.operation.type,
            retries: item.retries
          });
          
          // Remove failed item or move to dead letter queue
          this.dequeue(item.id);
        } else {
          logger.warn('Queue item failed, will retry', {
            queueId: item.id,
            operation: item.operation.type,
            retries: item.retries,
            maxRetries: item.maxRetries
          });
        }
        
        this.saveQueue();
      }
    }

    this.isProcessing = false;
  }

  // Process individual queue item
  async processQueueItem(item) {
    const { operation } = item;

    switch (operation.type) {
      case 'updateReleaseStatus':
        return await this.processReleaseStatusUpdate(operation);
      
      case 'createRelease':
        return await this.processCreateRelease(operation);
        
      case 'updateBarcodeStatus':
        return await this.processBarcodeStatusUpdate(operation);
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Process release status update
  async processReleaseStatusUpdate(operation) {
    const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');

    const { releaseId, status, userId } = operation.data;

    await updateDoc(doc(db, 'releases', releaseId), {
      status,
      updatedAt: serverTimestamp(),
      [`${status.toLowerCase()}At`]: serverTimestamp(),
      [`${status.toLowerCase()}By`]: userId
    });
  }

  // Process release creation
  async processCreateRelease(operation) {
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');

    const releaseData = {
      ...operation.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'releases'), releaseData);
    return docRef.id;
  }

  // Process barcode status update
  async processBarcodeStatusUpdate(operation) {
    const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');

    const { barcodeId, status, userId } = operation.data;

    await updateDoc(doc(db, 'barcodes', barcodeId), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
  }

  // Get queue status
  getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      items: this.queue.map(item => ({
        id: item.id,
        type: item.operation.type,
        timestamp: item.timestamp,
        retries: item.retries
      }))
    };
  }

  // Clear queue (for testing/debugging)
  clearQueue() {
    this.queue = [];
    this.saveQueue();
    logger.info('Offline queue cleared');
  }
}

// Singleton instance
const offlineQueue = new OfflineQueue();

// Helper functions for common operations
export const queueReleaseStatusUpdate = (releaseId, status, userId) => {
  return offlineQueue.enqueue({
    type: 'updateReleaseStatus',
    data: { releaseId, status, userId }
  });
};

export const queueCreateRelease = (releaseData) => {
  return offlineQueue.enqueue({
    type: 'createRelease',
    data: releaseData
  });
};

export const queueBarcodeStatusUpdate = (barcodeId, status, userId) => {
  return offlineQueue.enqueue({
    type: 'updateBarcodeStatus',
    data: { barcodeId, status, userId }
  });
};

// React hook for queue status
export const useOfflineQueue = () => {
  const [queueStatus, setQueueStatus] = React.useState(offlineQueue.getQueueStatus());

  React.useEffect(() => {
    const updateStatus = () => {
      setQueueStatus(offlineQueue.getQueueStatus());
    };

    // Update status every second
    const interval = setInterval(updateStatus, 1000);

    // Update on queue changes
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return queueStatus;
};

// Connection status indicator component
export const ConnectionStatus = () => {
  const queueStatus = useOfflineQueue();

  if (queueStatus.isOnline && queueStatus.queueLength === 0) {
    return null; // Don't show anything when online and queue is empty
  }

  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-2 rounded-lg text-sm font-medium ${
      queueStatus.isOnline
        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        : 'bg-red-100 text-red-800 border border-red-200'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          queueStatus.isOnline ? 'bg-yellow-400' : 'bg-red-400'
        }`}></div>
        <span>
          {queueStatus.isOnline ? (
            queueStatus.queueLength > 0 ? (
              `Syncing ${queueStatus.queueLength} items...`
            ) : (
              'Online'
            )
          ) : (
            `Offline (${queueStatus.queueLength} queued)`
          )}
        </span>
      </div>
    </div>
  );
};

export default offlineQueue;