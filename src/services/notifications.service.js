import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

class NotificationsService {
  constructor() {
    this.isDryRun = import.meta.env.VITE_NOTIFS_DRY_RUN === 'true' || import.meta.env.VITE_NOTIFS_DRY_RUN === true;
  }

  /**
   * Show toast notification in UI
   */
  showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md animate-slide-in ${
      type === 'success' ? 'bg-green-600 text-white' :
      type === 'error' ? 'bg-red-600 text-white' :
      type === 'warning' ? 'bg-yellow-600 text-white' :
      'bg-blue-600 text-white'
    }`;
    toast.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <p class="text-sm font-medium">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  /**
   * Notify all verifiers that a release has been staged
   */
  async notifyVerifiersStaged(release) {
    try {
      // Get all staff with isVerifier = true
      const staffRef = collection(db, 'staff');
      const q = query(staffRef, where('isVerifier', '==', true));
      const snapshot = await getDocs(q);
      
      const verifiers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (this.isDryRun) {
        const message = `📱 SMS to ${verifiers.length} verifiers: Release ${release.number || release.id} staged at ${release.stagingLocation}`;
        this.showToast(message, 'info');
        console.info('[NOTIFICATION DRY-RUN] SMS to verifiers:', {
          verifierCount: verifiers.length,
          verifiers: verifiers.map(v => v.name || v.email || v.id),
          release: {
            id: release.id,
            number: release.number,
            stagingLocation: release.stagingLocation,
            customerName: release.customerName
          }
        });
      } else {
        // TODO: Implement actual SMS via Twilio
        console.log('SMS notification would be sent to verifiers');
      }
      
      return verifiers.length;
    } catch (error) {
      console.error('Failed to notify verifiers:', error);
      return 0;
    }
  }

  /**
   * Notify office that a release has been rejected
   */
  async notifyOfficeRejected(release, reason) {
    try {
      const emailPayload = {
        to: 'office@cbrt.com',
        subject: `Release ${release.number || release.id} Rejected`,
        body: `
          Release ${release.number || release.id} has been rejected during verification.
          
          Customer: ${release.customerName}
          Staging Location: ${release.stagingLocation}
          Staged By: ${release.stagedBy}
          Rejected By: ${release.rejectedBy}
          Reason: ${reason}
          
          The release has been returned to "Entered" status and can be re-staged.
        `
      };
      
      if (this.isDryRun) {
        const message = `📧 Email to office: Release ${release.number || release.id} rejected - ${reason}`;
        this.showToast(message, 'warning');
        console.info('[NOTIFICATION DRY-RUN] Email to office:', emailPayload);
      } else {
        // TODO: Implement actual email via SendGrid
        console.log('Email notification would be sent to office');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to notify office:', error);
      return false;
    }
  }

  /**
   * Notify customer that release has been loaded
   */
  async notifyCustomerLoaded(release, truckNumber) {
    try {
      const notificationPayload = {
        customerId: release.customerId,
        customerName: release.customerName,
        releaseNumber: release.number || release.id,
        truckNumber: truckNumber,
        loadedAt: new Date().toISOString(),
        message: `Release ${release.number} has been loaded onto truck ${truckNumber}`
      };
      
      if (this.isDryRun) {
        const message = `📧 Customer notification: Release ${release.number || release.id} loaded on truck ${truckNumber}`;
        this.showToast(message, 'success');
        console.info('[NOTIFICATION DRY-RUN] Customer notification:', notificationPayload);
      } else {
        // TODO: Implement actual customer notification
        console.log('Customer notification would be sent');
      }
      
      return true;
    } catch (error) {
      console.error('Failed to notify customer:', error);
      return false;
    }
  }
}

// Add CSS for toast animation if not already present
if (!document.querySelector('#toast-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-styles';
  style.textContent = `
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);
}

export const notificationsService = new NotificationsService();