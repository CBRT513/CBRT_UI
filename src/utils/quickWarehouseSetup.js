// Quick Warehouse User Setup for SMS Testing
// Run these functions in browser console to quickly configure users

async function enableSMSForWarehouseUser(userId, phoneNumber) {
  const { doc, updateDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  
  // Ensure phone is in E.164 format
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    // Assume US number if no country code
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  await updateDoc(doc(db, 'users', userId), {
    receiveNewRelease: true,
    phone: formattedPhone,
    role: 'Warehouse'
  });
  
  console.log(`✅ Updated user ${userId}:`);
  console.log(`   Phone: ${formattedPhone}`);
  console.log(`   Will receive SMS: Yes`);
}

async function createTestWarehouseUser(name, phoneNumber, email) {
  const { collection, addDoc } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  
  // Ensure phone is in E.164 format
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  const userData = {
    name: name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@warehouse.local`,
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
  console.log(`   Will receive SMS: Yes`);
  
  return docRef.id;
}

async function listWarehouseUsers() {
  const { collection, getDocs, query, where } = await import('firebase/firestore');
  const { db } = await import('../firebase/config');
  
  console.log('📋 Current Warehouse Users:\n');
  
  const q = query(collection(db, 'users'), where('role', '==', 'Warehouse'));
  const snapshot = await getDocs(q);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const smsReady = data.receiveNewRelease && data.phone ? '✅' : '❌';
    
    console.log(`${smsReady} ${data.name || data.email}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Phone: ${data.phone || 'Not set'}`);
    console.log(`   Receives SMS: ${data.receiveNewRelease ? 'Yes' : 'No'}`);
    console.log('');
  });
  
  console.log('To enable SMS for a user, run:');
  console.log('enableSMSForWarehouseUser("USER_ID", "PHONE_NUMBER")');
}

// Quick test SMS function
async function sendTestSMS(phoneNumber, message = "Test SMS from CBRT System") {
  // Ensure phone is in E.164 format
  let formattedPhone = phoneNumber;
  if (!phoneNumber.startsWith('+')) {
    formattedPhone = '+1' + phoneNumber.replace(/\D/g, '');
  }
  
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Missing Twilio credentials in .env');
    return;
  }
  
  console.log(`📱 Sending test SMS to ${formattedPhone}...`);
  
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
      console.log('✅ Test SMS sent successfully!');
      console.log(`   Message SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
    } else {
      const error = await response.json();
      console.error('❌ Failed to send test SMS:', error.message);
      
      if (error.code === 20003) {
        console.log('💡 Tip: Check that your Twilio credentials are correct');
      } else if (error.code === 21211) {
        console.log('💡 Tip: The phone number format may be invalid');
      }
    }
  } catch (error) {
    console.error('❌ Error sending SMS:', error);
  }
}

// Export functions to window
window.enableSMSForWarehouseUser = enableSMSForWarehouseUser;
window.createTestWarehouseUser = createTestWarehouseUser;
window.listWarehouseUsers = listWarehouseUsers;
window.sendTestSMS = sendTestSMS;

console.log('🚀 SMS Setup Functions Loaded!');
console.log('');
console.log('Available commands:');
console.log('  listWarehouseUsers() - Show all warehouse users');
console.log('  enableSMSForWarehouseUser(userId, phone) - Enable SMS for a user');
console.log('  createTestWarehouseUser(name, phone) - Create test user');
console.log('  sendTestSMS(phone, message) - Send a test SMS');
console.log('');
console.log('Example: enableSMSForWarehouseUser("abc123", "5551234567")');