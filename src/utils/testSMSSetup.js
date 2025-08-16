// Quick SMS Setup Verification Script
// Run this in your browser console to check SMS readiness

async function verifySMSSetup() {
  console.log('🔍 Checking SMS Setup for MVP Test...\n');
  
  // 1. Check Warehouse Staff
  console.log('1️⃣ Checking Warehouse Staff...');
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
      role: data.role
    });
  });
  
  console.log(`Found ${warehouseStaff.length} warehouse staff members:`);
  warehouseStaff.forEach(staff => {
    const status = staff.receiveNewRelease && staff.phone ? '✅' : '❌';
    console.log(`  ${status} ${staff.name}`);
    console.log(`     Phone: ${staff.phone || 'MISSING'}`);
    console.log(`     Receives SMS: ${staff.receiveNewRelease ? 'Yes' : 'No'}`);
  });
  
  const eligibleForSMS = warehouseStaff.filter(s => s.receiveNewRelease && s.phone);
  console.log(`\n✉️ ${eligibleForSMS.length} staff members will receive SMS\n`);
  
  // 2. Check Twilio Config
  console.log('2️⃣ Checking Twilio Configuration...');
  const accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
  const authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
  const fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;
  
  console.log(`  Account SID: ${accountSid ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Auth Token: ${authToken ? '✅ Present' : '❌ Missing'}`);
  console.log(`  From Number: ${fromNumber || 'Missing'}`);
  
  // 3. Test Twilio Connection
  if (accountSid && authToken && fromNumber) {
    console.log('\n3️⃣ Testing Twilio Connection...');
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
        console.log('  ✅ Twilio connection successful!');
        console.log(`  Account Status: ${account.status}`);
        console.log(`  Account Name: ${account.friendly_name}`);
      } else {
        console.log('  ❌ Twilio authentication failed');
        console.log('  Check your credentials in .env file');
      }
    } catch (error) {
      console.log('  ❌ Could not connect to Twilio:', error.message);
    }
  }
  
  // 4. Summary
  console.log('\n📊 SUMMARY:');
  console.log('─────────────────────────────');
  
  const issues = [];
  if (eligibleForSMS.length === 0) {
    issues.push('No warehouse staff configured to receive SMS');
  }
  if (!accountSid || !authToken || !fromNumber) {
    issues.push('Twilio credentials incomplete');
  }
  
  if (issues.length === 0) {
    console.log('✅ SMS system is ready for testing!');
    console.log('\nNext steps:');
    console.log('1. Create a new release');
    console.log('2. SMS will be sent to:');
    eligibleForSMS.forEach(staff => {
      console.log(`   - ${staff.name} (${staff.phone})`);
    });
  } else {
    console.log('⚠️ Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    console.log('\n🔧 Quick fixes:');
    if (eligibleForSMS.length === 0) {
      console.log('  1. Update warehouse users to have:');
      console.log('     - receiveNewRelease: true');
      console.log('     - phone: "+1XXXXXXXXXX" (valid phone number)');
    }
    if (!accountSid || !authToken || !fromNumber) {
      console.log('  2. Update .env file with valid Twilio credentials');
    }
  }
  
  return {
    warehouseStaff,
    eligibleForSMS,
    twilioConfigured: !!(accountSid && authToken && fromNumber)
  };
}

// Export for use
window.verifySMSSetup = verifySMSSetup;
console.log('✨ Run verifySMSSetup() to check SMS configuration');