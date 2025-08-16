// MVP SMS Testing Suite
// Complete verification and testing for SMS with pick ticket delivery

async function runMVPTest() {
  console.log('🚀 CBRT MVP SMS Test Suite');
  console.log('=' .repeat(50));
  
  const results = {
    twilioConfig: false,
    warehouseUsers: false,
    smsReady: false,
    pickTicketGeneration: false,
    recommendations: []
  };
  
  try {
    // 1. Check Twilio Configuration
    console.log('\n1️⃣ VERIFYING TWILIO CONFIGURATION...');
    const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
    
    if (accountSid && authToken && fromNumber) {
      console.log('✅ Twilio credentials found');
      console.log(`   From Number: ${fromNumber}`);
      
      // Test Twilio connection
      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
          {
            method: 'GET',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
            }
          }
        );
        
        if (response.ok) {
          const account = await response.json();
          console.log('✅ Twilio connection verified');
          console.log(`   Account: ${account.friendly_name}`);
          console.log(`   Status: ${account.status}`);
          results.twilioConfig = true;
        } else {
          console.log('❌ Twilio authentication failed');
          results.recommendations.push('Check Twilio credentials in .env file');
        }
      } catch (error) {
        console.log('❌ Could not connect to Twilio:', error.message);
        results.recommendations.push('Verify Twilio account is active');
      }
    } else {
      console.log('❌ Missing Twilio credentials');
      results.recommendations.push('Add VITE_TWILIO_ACCOUNT_SID, VITE_TWILIO_AUTH_TOKEN, and VITE_TWILIO_PHONE_NUMBER to .env');
    }
    
    // 2. Check Warehouse Users
    console.log('\n2️⃣ CHECKING WAREHOUSE USERS...');
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');
    
    const warehouseQuery = query(
      collection(db, 'users'),
      where('role', '==', 'Warehouse')
    );
    
    const warehouseSnapshot = await getDocs(warehouseQuery);
    const warehouseStaff = [];
    
    warehouseSnapshot.docs.forEach(doc => {
      const data = doc.data();
      warehouseStaff.push({
        id: doc.id,
        name: data.name || data.email,
        phone: data.phone,
        receiveNewRelease: data.receiveNewRelease,
        isActive: data.isActive !== false
      });
    });
    
    console.log(`Found ${warehouseStaff.length} warehouse users`);
    
    const smsEligible = warehouseStaff.filter(u => 
      u.receiveNewRelease && u.phone && u.isActive
    );
    
    if (smsEligible.length > 0) {
      console.log(`✅ ${smsEligible.length} users configured for SMS:`);
      smsEligible.forEach(user => {
        console.log(`   • ${user.name} (${user.phone})`);
      });
      results.warehouseUsers = true;
      results.smsReady = true;
    } else {
      console.log('⚠️ No warehouse users configured for SMS');
      if (warehouseStaff.length > 0) {
        console.log('   Found users but they need configuration:');
        warehouseStaff.forEach(user => {
          const issues = [];
          if (!user.phone) issues.push('missing phone');
          if (!user.receiveNewRelease) issues.push('SMS disabled');
          if (!user.isActive) issues.push('inactive');
          if (issues.length > 0) {
            console.log(`   • ${user.name}: ${issues.join(', ')}`);
          }
        });
        results.recommendations.push('Configure warehouse users with phone numbers and enable receiveNewRelease');
      } else {
        results.recommendations.push('Create warehouse users first');
      }
    }
    
    // 3. Test Pick Ticket Generation
    console.log('\n3️⃣ TESTING PICK TICKET GENERATION...');
    try {
      const { PickTicketService } = await import('../services/pickTicketService');
      
      // Create test data
      const testRelease = {
        releaseNumber: 'TEST-001',
        pickupDate: new Date().toISOString(),
        supplierId: 'test-supplier',
        customerId: 'test-customer'
      };
      
      const testSupplier = {
        supplierName: 'Test Supplier Inc.'
      };
      
      const testCustomer = {
        customerName: 'Test Customer Corp.',
        address: '123 Test St',
        city: 'Cincinnati',
        state: 'OH',
        zipCode: '45202'
      };
      
      const testLineItems = [{
        Barcode: 'TEST123456',
        itemCode: 'ITEM-001',
        itemName: 'Test Product',
        sizeName: 'Large',
        lotNumber: 'LOT-2024-01',
        quantity: 5
      }];
      
      // Generate test pick ticket
      const doc = PickTicketService.generatePickTicket(
        testRelease,
        testSupplier,
        testCustomer,
        testLineItems
      );
      
      if (doc) {
        console.log('✅ Pick ticket generation working');
        const blob = PickTicketService.getPDFBlob(doc);
        console.log(`   PDF size: ${blob.size} bytes`);
        results.pickTicketGeneration = true;
      }
    } catch (error) {
      console.log('❌ Pick ticket generation failed:', error.message);
      results.recommendations.push('Check jsPDF installation: npm install jspdf jspdf-autotable');
    }
    
    // 4. Test SMS Service
    console.log('\n4️⃣ CHECKING SMS SERVICE...');
    try {
      const { SMSService } = await import('../services/smsService');
      console.log('✅ SMS Service available');
      
      // Check if Firebase Storage is configured
      const { storage } = await import('../firebase/config');
      if (storage) {
        console.log('✅ Firebase Storage configured for PDF uploads');
      } else {
        console.log('⚠️ Firebase Storage not configured');
        results.recommendations.push('Configure Firebase Storage for PDF attachments');
      }
    } catch (error) {
      console.log('⚠️ SMS Service check failed:', error.message);
    }
    
    // 5. Summary and Recommendations
    console.log('\n' + '=' .repeat(50));
    console.log('📊 MVP READINESS SUMMARY\n');
    
    const readyItems = [];
    const notReadyItems = [];
    
    if (results.twilioConfig) readyItems.push('✅ Twilio configured');
    else notReadyItems.push('❌ Twilio configuration');
    
    if (results.warehouseUsers) readyItems.push('✅ Warehouse users ready');
    else notReadyItems.push('❌ Warehouse users need setup');
    
    if (results.pickTicketGeneration) readyItems.push('✅ Pick ticket generation');
    else notReadyItems.push('❌ Pick ticket generation');
    
    if (results.smsReady) readyItems.push('✅ SMS recipients configured');
    else notReadyItems.push('❌ No SMS recipients');
    
    console.log('Ready:');
    readyItems.forEach(item => console.log(`  ${item}`));
    
    if (notReadyItems.length > 0) {
      console.log('\nNeeds Attention:');
      notReadyItems.forEach(item => console.log(`  ${item}`));
    }
    
    const mvpReady = results.twilioConfig && results.warehouseUsers && 
                     results.pickTicketGeneration && results.smsReady;
    
    console.log('\n' + '=' .repeat(50));
    if (mvpReady) {
      console.log('🎉 SYSTEM IS MVP READY!');
      console.log('\nYou can now:');
      console.log('1. Create a new release');
      console.log('2. SMS with pick ticket will be sent to warehouse users');
      console.log('3. Track the release through staging and verification');
      
      if (smsEligible.length > 0) {
        console.log('\nSMS will be sent to:');
        smsEligible.forEach(user => {
          console.log(`  • ${user.name} at ${user.phone}`);
        });
      }
    } else {
      console.log('⚠️ SYSTEM NEEDS CONFIGURATION');
      
      if (results.recommendations.length > 0) {
        console.log('\nAction Items:');
        results.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. ${rec}`);
        });
      }
      
      console.log('\nQuick fixes available:');
      console.log('• Run: createTestWarehouseUser("John Doe", "5551234567")');
      console.log('• Run: enableSMSForWarehouseUser("userId", "5551234567")');
    }
    
    return {
      mvpReady,
      results,
      smsEligible
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      mvpReady: false,
      error: error.message
    };
  }
}

// Quick function to send test release notification
async function sendTestReleaseNotification(phoneNumber) {
  console.log('\n📱 Sending Test Release Notification...');
  
  // Format phone number
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
  
  const message = `CBRT Alert: New Release TEST-001 ready for staging.\n\nSupplier: Test Supplier\nCustomer: Test Customer\nItems: 5\n\nPick ticket attached.`;
  
  try {
    const formData = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: message
    });
    
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
      console.log('✅ Test notification sent!');
      console.log(`   Message SID: ${result.sid}`);
      console.log(`   To: ${formattedPhone}`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Failed to send:', error.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// Export functions
window.runMVPTest = runMVPTest;
window.sendTestReleaseNotification = sendTestReleaseNotification;

// Also export the helper functions from other files
window.enableSMSForWarehouseUser = async (userId, phoneNumber) => {
  const { doc, updateDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  await updateDoc(doc(db, 'users', userId), {
    receiveNewRelease: true,
    phone: formattedPhone,
    role: 'Warehouse'
  });
  
  console.log(`✅ Updated user ${userId} for SMS notifications`);
  console.log(`   Phone: ${formattedPhone}`);
};

window.createTestWarehouseUser = async (name, phoneNumber) => {
  const { collection, addDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  const userData = {
    name: name,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@warehouse.local`,
    phone: formattedPhone,
    role: 'Warehouse',
    receiveNewRelease: true,
    createdAt: new Date(),
    isActive: true
  };
  
  const docRef = await addDoc(collection(db, 'users'), userData);
  
  console.log(`✅ Created warehouse user:`);
  console.log(`   ID: ${docRef.id}`);
  console.log(`   Name: ${name}`);
  console.log(`   Phone: ${formattedPhone}`);
  
  return docRef.id;
};

console.log('🎯 MVP SMS Test Suite Loaded!');
console.log('');
console.log('Commands:');
console.log('  runMVPTest() - Complete system check for SMS readiness');
console.log('  sendTestReleaseNotification("5551234567") - Send test SMS');
console.log('  createTestWarehouseUser("Name", "Phone") - Create test user');
console.log('  enableSMSForWarehouseUser("userId", "Phone") - Enable SMS for user');