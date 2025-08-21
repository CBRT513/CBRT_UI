import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const seedTestReleases = async () => {
  const releasesRef = collection(db, 'releases');
  
  const testReleases = [
    {
      ReleaseNumber: 'REL-001',
      customerName: 'ABC Manufacturing',
      shipToName: 'Warehouse A',
      status: 'Entered',
      statusChangedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      ReleaseNumber: 'REL-002',
      customerName: 'XYZ Corp',
      shipToName: 'Dock B',
      status: 'Entered',
      statusChangedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      ReleaseNumber: 'REL-003',
      customerName: 'Global Logistics',
      stagingLocation: 'Zone C-3',
      status: 'Staged',
      statusChangedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      stagedBy: 'John Smith',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      ReleaseNumber: 'REL-004',
      customerName: 'Tech Solutions',
      stagingLocation: 'Zone A-1',
      status: 'Staged',
      statusChangedAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      stagedBy: 'Jane Doe',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      ReleaseNumber: 'REL-005',
      customerName: 'Supply Chain Inc',
      shipToName: 'Distribution Center',
      status: 'Loaded',
      statusChangedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      loadedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      attachments: {
        releaseDocUrl: 'https://example.com/release-doc.pdf'
      }
    },
    {
      ReleaseNumber: 'REL-006',
      customerName: 'Retail Partners',
      shipToName: 'Store #123',
      status: 'Loaded',
      statusChangedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      loadedAt: new Date(Date.now() - 30 * 60 * 1000),
      carrierMode: 'CustomerArranged',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ];
  
  console.log('Seeding test releases...');
  
  for (const release of testReleases) {
    try {
      await addDoc(releasesRef, release);
      console.log(`✓ Added ${release.ReleaseNumber}`);
    } catch (error) {
      console.error(`✗ Failed to add ${release.ReleaseNumber}:`, error);
    }
  }
  
  console.log('Seeding complete!');
};

// Execute when module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestReleases().then(() => process.exit(0));
}

export default seedTestReleases;