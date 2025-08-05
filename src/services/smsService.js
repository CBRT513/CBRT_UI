// File: /Users/cerion/CBRT_UI/src/services/smsService.js
// SMS Service with comprehensive logging and error handling

import { storage } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '../utils/logger';

export class SMSService {
  static async uploadPDFToFirebase(pdfBlob, releaseNumber) {
    return logger.wrapAsync(async (pdfBlob, releaseNumber) => {
      logger.info('Starting PDF upload to Firebase Storage', {
        releaseNumber,
        blobSize: pdfBlob.size,
        blobType: pdfBlob.type
      });

      // Create a reference to the PDF file in Firebase Storage
      const timestamp = Date.now();
      const fileName = `pick-tickets/Pick-Ticket-${releaseNumber}-${timestamp}.pdf`;
      const storageRef = ref(storage, fileName);

      logger.debug('Firebase Storage reference created', { fileName });

      // Upload the PDF blob
      const snapshot = await uploadBytes(storageRef, pdfBlob, {
        contentType: 'application/pdf',
        customMetadata: {
          releaseNumber: releaseNumber,
          uploadedAt: new Date().toISOString(),
        }
      });

      logger.debug('PDF uploaded to Firebase Storage', {
        fileName,
        size: snapshot.metadata.size,
        fullPath: snapshot.metadata.fullPath
      });

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      logger.info('PDF upload complete, download URL generated', {
        releaseNumber,
        downloadURL,
        size: snapshot.metadata.size
      });
      
      return downloadURL;
    }, 'SMSService.uploadPDFToFirebase')(pdfBlob, releaseNumber);
  }

  static async sendNewReleaseNotification(
    releaseData,
    supplierData,
    customerData,
    warehouseStaff,
    pickTicketBlob
  ) {
    return logger.wrapAsync(async () => {
      logger.info('Starting SMS notification process', {
        releaseNumber: releaseData?.ReleaseNumber,
        supplier: supplierData?.SupplierName,
        customer: customerData?.CustomerName,
        staffCount: warehouseStaff?.length,
        hasPDF: !!pickTicketBlob
      });

      // Prepare recipient phone numbers
      const recipients = warehouseStaff
        .filter((staff) => staff.receivesNewRelease && staff.phone)
        .map((staff) => staff.phone);

      logger.debug('Recipients filtered', {
        totalStaff: warehouseStaff.length,
        eligibleRecipients: recipients.length,
        recipients: recipients
      });

      if (recipients.length === 0) {
        logger.warn('No warehouse staff configured to receive SMS notifications');
        return { success: false, message: "No recipients configured" };
      }

      // Prepare message content
      const hasAttachment = pickTicketBlob !== null;
      const message = `New Release #${releaseData.ReleaseNumber} for ${
        customerData?.CustomerName || "Unknown Customer"
      } ready for staging.${hasAttachment ? ' Pick ticket attached.' : ''}`;

      logger.debug('SMS message prepared', { message, hasAttachment });

      // Get Twilio credentials from environment
      const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
      const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
      const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        logger.error('Missing Twilio credentials in environment variables', null, {
          hasAccountSid: !!accountSid,
          hasAuthToken: !!authToken,
          hasFromNumber: !!fromNumber
        });
        return { success: false, message: 'Missing Twilio configuration' };
      }

      logger.debug('Twilio credentials verified');

      // Upload PDF to Firebase Storage and get public URL if provided
      let mediaUrl = null;
      if (pickTicketBlob) {
        try {
          logger.info('Uploading PDF for SMS attachment');
          mediaUrl = await this.uploadPDFToFirebase(pickTicketBlob, releaseData.ReleaseNumber);
          logger.info('PDF upload successful for SMS attachment', { mediaUrl });
        } catch (uploadError) {
          logger.error('Failed to upload PDF for SMS attachment', uploadError, {
            releaseNumber: releaseData.ReleaseNumber,
            blobSize: pickTicketBlob.size
          });
          // Continue without attachment rather than failing completely
          logger.warn('Continuing SMS send without PDF attachment');
        }
      }

      // Send SMS to each recipient
      const results = [];
      logger.info('Starting SMS send to recipients', { recipientCount: recipients.length });

      for (let i = 0; i < recipients.length; i++) {
        const phoneNumber = recipients[i];
        logger.debug(`Sending SMS ${i + 1}/${recipients.length}`, { phoneNumber });

        try {
          const formData = new URLSearchParams({
            To: phoneNumber,
            From: fromNumber,
            Body: message,
          });

          // Add media URL if we have a PDF attachment
          if (mediaUrl) {
            formData.append('MediaUrl', mediaUrl);
            logger.debug('Added media URL to SMS', { mediaUrl });
          }

          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData,
            }
          );

          if (response.ok) {
            const result = await response.json();
            results.push({ 
              success: true, 
              to: phoneNumber, 
              sid: result.sid,
              hasAttachment: !!mediaUrl
            });
            logger.info(`SMS sent successfully`, {
              phoneNumber,
              sid: result.sid,
              hasAttachment: !!mediaUrl
            });
          } else {
            const error = await response.json();
            results.push({ success: false, to: phoneNumber, error: error.message });
            logger.error(`Failed to send SMS`, null, {
              phoneNumber,
              statusCode: response.status,
              error: error.message
            });
          }
        } catch (smsError) {
          results.push({ success: false, to: phoneNumber, error: smsError.message });
          logger.error(`Error sending SMS`, smsError, { phoneNumber });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const attachmentStatus = mediaUrl ? 'with pick ticket ' : '';
      
      const finalResult = {
        success: successCount > 0,
        message: `SMS ${attachmentStatus}sent to ${successCount} of ${recipients.length} warehouse staff members`,
        recipients: results,
        mediaUrl: mediaUrl,
      };

      logger.info('SMS notification process completed', {
        successCount,
        totalRecipients: recipients.length,
        hasAttachment: !!mediaUrl,
        finalResult: finalResult.success
      });
      
      return finalResult;
    }, 'SMSService.sendNewReleaseNotification')();
  }

  // Backend service implementation (for reference)
  static getBackendImplementation() {
    return `
    // Backend service implementation (Node.js/Express)
    const twilio = require('twilio');
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    app.post('/api/send-sms', async (req, res) => {
      const { recipients, message, mediaUrl } = req.body;
      
      try {
        const promises = recipients.map(async (phoneNumber) => {
          const messageOptions = {
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          };
          
          // Add media URL if provided (should be publicly accessible URL)
          if (mediaUrl) {
            messageOptions.mediaUrl = [mediaUrl];
          }
          
          return await client.messages.create(messageOptions);
        });
        
        const results = await Promise.all(promises);
        res.json({ success: true, results });
        
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
    `;
  }
}