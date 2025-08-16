// Release Notification Service
// Handles email/SMS notifications and pick ticket generation for the release workflow

import { 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { PickTicketService } from './pickTicketService';
import { SMSService } from './smsService';
import { logger } from '../utils/logger';

class ReleaseNotificationService {
  
  /**
   * Generate pick ticket for a release
   */
  async generatePickTicket(releaseId, revision = 0) {
    try {
      logger.info('Generating pick ticket', { releaseId, revision });
      
      // Get release data
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Release not found');
      }
      
      const releaseData = releaseDoc.data();
      
      // Get supplier data
      const supplierDoc = await getDoc(doc(db, 'suppliers', releaseData.supplierId));
      const supplierData = supplierDoc.exists() ? supplierDoc.data() : {};
      
      // Get customer data
      const customerDoc = await getDoc(doc(db, 'customers', releaseData.customerId));
      const customerData = customerDoc.exists() ? customerDoc.data() : {};
      
      // Get line items with barcode information
      const lineItemsWithBarcodes = await this.getLineItemsWithBarcodes(releaseData);
      
      // Generate pick ticket number
      const pickTicketNumber = revision > 0 
        ? `${releaseData.releaseNumber}-${revision}`
        : releaseData.releaseNumber;
      
      // Update release data with pick ticket number
      const pickTicketData = {
        ...releaseData,
        releaseNumber: pickTicketNumber,
        pickupDate: releaseData.pickupDate
      };
      
      // Generate PDF
      const doc = PickTicketService.generatePickTicket(
        pickTicketData,
        supplierData,
        customerData,
        lineItemsWithBarcodes
      );
      
      // Get PDF blob
      const pdfBlob = PickTicketService.getPDFBlob(doc);
      
      // Upload to Firebase Storage
      const downloadURL = await SMSService.uploadPDFToFirebase(pdfBlob, pickTicketNumber);
      
      logger.info('Pick ticket generated successfully', {
        releaseId,
        pickTicketNumber,
        downloadURL
      });
      
      return {
        pdf: doc,
        blob: pdfBlob,
        downloadURL,
        pickTicketNumber
      };
      
    } catch (error) {
      logger.error('Failed to generate pick ticket', error, { releaseId });
      throw error;
    }
  }
  
  /**
   * Get line items with barcode information
   */
  async getLineItemsWithBarcodes(releaseData) {
    try {
      const lineItems = releaseData.lineItems || [];
      const itemsWithBarcodes = [];
      
      // Get items, sizes, and barcodes collections
      const itemsSnapshot = await getDocs(collection(db, 'items'));
      const sizesSnapshot = await getDocs(collection(db, 'sizes'));
      const barcodesSnapshot = await getDocs(collection(db, 'barcodes'));
      
      const items = {};
      const sizes = {};
      const barcodes = [];
      
      itemsSnapshot.forEach(doc => {
        items[doc.id] = doc.data();
      });
      
      sizesSnapshot.forEach(doc => {
        sizes[doc.id] = doc.data();
      });
      
      barcodesSnapshot.forEach(doc => {
        barcodes.push({ id: doc.id, ...doc.data() });
      });
      
      // Process each line item
      for (const lineItem of lineItems) {
        const itemData = items[lineItem.itemId];
        const sizeData = sizes[lineItem.sizeId];
        
        // Find matching barcode
        const matchingBarcode = barcodes.find(b => 
          b.ItemId === lineItem.itemId && 
          b.SizeId === lineItem.sizeId &&
          b.CustomerId === releaseData.customerId &&
          b.Status === 'Available'
        );
        
        itemsWithBarcodes.push({
          Barcode: matchingBarcode?.Barcode || 'SCAN_REQUIRED',
          itemCode: itemData?.ItemCode || itemData?.itemCode || lineItem.itemCode,
          itemName: itemData?.ItemName || itemData?.itemName || lineItem.itemName,
          sizeName: sizeData?.SizeName || sizeData?.sizeName || lineItem.sizeName,
          Size: sizeData?.SizeName || sizeData?.sizeName,
          lotNumber: lineItem.lotNumber || '',
          Lot: lineItem.lotNumber || '',
          quantity: lineItem.requestedQuantity || lineItem.quantity || 1
        });
      }
      
      return itemsWithBarcodes;
      
    } catch (error) {
      logger.error('Failed to get line items with barcodes', error);
      return [];
    }
  }
  
  /**
   * Send new release notification
   */
  async sendNewReleaseNotification(releaseId, pickTicketData) {
    try {
      logger.info('Sending new release notification', { releaseId });
      
      // Get release data
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Release not found');
      }
      
      const releaseData = releaseDoc.data();
      
      // Get users who should receive notifications
      const usersQuery = query(
        collection(db, 'users'),
        where('receiveNewRelease', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const recipients = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get warehouse staff for SMS
      const warehouseStaff = recipients.filter(u => 
        u.role === 'Warehouse' && u.phone
      );
      
      // Get supplier and customer data
      const supplierDoc = await getDoc(doc(db, 'suppliers', releaseData.supplierId));
      const customerDoc = await getDoc(doc(db, 'customers', releaseData.customerId));
      
      const supplierData = supplierDoc.exists() ? supplierDoc.data() : {};
      const customerData = customerDoc.exists() ? customerDoc.data() : {};
      
      // Send SMS notifications with pick ticket
      if (warehouseStaff.length > 0 && pickTicketData?.blob) {
        const smsResult = await SMSService.sendNewReleaseNotification(
          { ReleaseNumber: releaseData.releaseNumber },
          { SupplierName: supplierData.supplierName || supplierData.SupplierName },
          { CustomerName: customerData.customerName || customerData.CustomerName },
          warehouseStaff.map(staff => ({
            ...staff,
            receivesNewRelease: true
          })),
          pickTicketData.blob
        );
        
        logger.info('SMS notifications sent', {
          success: smsResult.success,
          message: smsResult.message
        });
      }
      
      // Queue email notifications
      const emailRecipients = recipients.filter(u => u.email);
      
      for (const recipient of emailRecipients) {
        await addDoc(collection(db, 'emailQueue'), {
          to: recipient.email,
          subject: `New Release Ready for Staging - ${releaseData.releaseNumber}`,
          template: 'newRelease',
          data: {
            releaseNumber: releaseData.releaseNumber,
            supplierName: supplierData.supplierName || supplierData.SupplierName,
            customerName: customerData.customerName || customerData.CustomerName,
            pickTicketURL: pickTicketData?.downloadURL
          },
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      
      logger.info('Email notifications queued', {
        recipientCount: emailRecipients.length
      });
      
      return {
        success: true,
        smsRecipients: warehouseStaff.length,
        emailRecipients: emailRecipients.length
      };
      
    } catch (error) {
      logger.error('Failed to send new release notification', error, { releaseId });
      // Don't throw - notifications should not block the main workflow
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send staging complete notification
   */
  async sendStagingCompleteNotification(releaseId, stagedByUserId) {
    try {
      logger.info('Sending staging complete notification', { releaseId, stagedByUserId });
      
      // Get release data
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Release not found');
      }
      
      const releaseData = releaseDoc.data();
      
      // Get users who should receive notifications (except the one who staged)
      const usersQuery = query(
        collection(db, 'users'),
        where('receiveNewRelease', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const recipients = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.id !== stagedByUserId);
      
      // Queue email notifications
      for (const recipient of recipients) {
        await addDoc(collection(db, 'emailQueue'), {
          to: recipient.email,
          subject: `Release ${releaseData.releaseNumber} Staged at ${releaseData.stagedLocation} - Verification Required`,
          template: 'stagingComplete',
          data: {
            releaseNumber: releaseData.releaseNumber,
            stagedLocation: releaseData.stagedLocation,
            stagedByName: releaseData.stagedByName,
            stagedAt: releaseData.stagedAt
          },
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      
      logger.info('Staging complete notifications queued', {
        recipientCount: recipients.length
      });
      
      return {
        success: true,
        recipients: recipients.length
      };
      
    } catch (error) {
      logger.error('Failed to send staging complete notification', error, { releaseId });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send verification rejection notification
   */
  async sendVerificationRejectionNotification(releaseId, reason, rejectedBy) {
    try {
      logger.info('Sending verification rejection notification', { 
        releaseId, 
        reason,
        rejectedBy: rejectedBy.name 
      });
      
      // Get release data
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Release not found');
      }
      
      const releaseData = releaseDoc.data();
      
      // Get Office and Admin users
      const usersQuery = query(
        collection(db, 'users'),
        where('role', 'in', ['Office', 'Admin'])
      );
      const usersSnapshot = await getDocs(usersQuery);
      const recipients = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Queue email notifications
      for (const recipient of recipients) {
        await addDoc(collection(db, 'emailQueue'), {
          to: recipient.email,
          subject: `Release ${releaseData.releaseNumber} Verification REJECTED`,
          template: 'verificationRejected',
          data: {
            releaseNumber: releaseData.releaseNumber,
            reason,
            rejectedByName: rejectedBy.name || rejectedBy.email,
            rejectedAt: new Date().toISOString(),
            pickTicketRevision: releaseData.pickTicketRevision
          },
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      
      logger.info('Verification rejection notifications queued', {
        recipientCount: recipients.length
      });
      
      return {
        success: true,
        recipients: recipients.length
      };
      
    } catch (error) {
      logger.error('Failed to send verification rejection notification', error, { releaseId });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Send unable to stage notification
   */
  async sendUnableToStageNotification(releaseId, reason, reportedBy) {
    try {
      logger.info('Sending unable to stage notification', { 
        releaseId, 
        reason,
        reportedBy: reportedBy.name 
      });
      
      // Get release data
      const releaseDoc = await getDoc(doc(db, 'releases', releaseId));
      if (!releaseDoc.exists()) {
        throw new Error('Release not found');
      }
      
      const releaseData = releaseDoc.data();
      
      // Get users who should receive notifications
      const usersQuery = query(
        collection(db, 'users'),
        where('receiveNewRelease', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const recipients = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Queue email notifications
      for (const recipient of recipients) {
        await addDoc(collection(db, 'emailQueue'), {
          to: recipient.email,
          subject: `URGENT: Release ${releaseData.releaseNumber} Unable to Stage`,
          template: 'unableToStage',
          data: {
            releaseNumber: releaseData.releaseNumber,
            reason,
            reportedByName: reportedBy.name || reportedBy.email,
            reportedAt: new Date().toISOString()
          },
          status: 'pending',
          createdAt: serverTimestamp()
        });
      }
      
      logger.info('Unable to stage notifications queued', {
        recipientCount: recipients.length
      });
      
      return {
        success: true,
        recipients: recipients.length
      };
      
    } catch (error) {
      logger.error('Failed to send unable to stage notification', error, { releaseId });
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const releaseNotificationService = new ReleaseNotificationService();

// Export for component use
export default releaseNotificationService;