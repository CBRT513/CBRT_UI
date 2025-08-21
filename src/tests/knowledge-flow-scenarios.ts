/**
 * Real-world knowledge capture scenarios for D5 validation
 */

export const KNOWLEDGE_SCENARIOS = {
  // Scenario 1: Coil Scan Log Processing
  coilScan: {
    name: 'Coil Scan Log',
    input: `
      Coil Scan Report - 2025-08-20
      Location: Cincinnati Barge & Rail Terminal, Warehouse A
      Operator: John Smith (Badge #4521)
      
      Scanned Items:
      - Coil ID: CL-2025-0892, Steel Grade: A36, Weight: 12,500 lbs
        Supplier: ArcelorMittal USA
        Destination: Ford Motor Company - Louisville Assembly Plant
        Carrier: CSX Transportation
        Release Number: REL-2025-3421
      
      - Coil ID: CL-2025-0893, Steel Grade: 304SS, Weight: 8,200 lbs
        Supplier: Nucor Corporation  
        Destination: General Electric - Cincinnati Works
        Carrier: Norfolk Southern Railway
        Release Number: REL-2025-3422
      
      Quality Issues:
      - CL-2025-0893: Minor surface oxidation detected, approved for shipment with note
      
      Storage Location: Bay 12, Row C, Position 3-4
      Temperature: 72°F, Humidity: 45%
      Next Action: Stage for loading on Barge B-201 at 14:00
    `,
    expectedEntities: [
      { type: 'location', name: 'Cincinnati Barge & Rail Terminal' },
      { type: 'person', name: 'John Smith' },
      { type: 'product', name: 'CL-2025-0892' },
      { type: 'product', name: 'CL-2025-0893' },
      { type: 'org', name: 'ArcelorMittal USA' },
      { type: 'org', name: 'Ford Motor Company' },
      { type: 'org', name: 'CSX Transportation' },
      { type: 'org', name: 'Nucor Corporation' },
      { type: 'org', name: 'General Electric' },
      { type: 'org', name: 'Norfolk Southern Railway' },
      { type: 'vehicle', name: 'Barge B-201' },
    ],
    expectedRelationships: [
      { source: 'CL-2025-0892', relation: 'supplied_by', target: 'ArcelorMittal USA' },
      { source: 'CL-2025-0892', relation: 'shipped_to', target: 'Ford Motor Company' },
      { source: 'CL-2025-0892', relation: 'carried_by', target: 'CSX Transportation' },
      { source: 'CL-2025-0893', relation: 'supplied_by', target: 'Nucor Corporation' },
      { source: 'CL-2025-0893', relation: 'shipped_to', target: 'General Electric' },
      { source: 'CL-2025-0893', relation: 'has_issue', target: 'surface oxidation' },
    ],
  },

  // Scenario 2: Bill of Lading Details
  bolDetails: {
    name: 'Bill of Lading',
    input: `
      BILL OF LADING
      BOL Number: BOL-2025-08-20-001
      Date: August 20, 2025
      
      SHIPPER:
      Cincinnati Barge & Rail Terminal
      1234 River Road
      Cincinnati, OH 45204
      Contact: Sarah Johnson (513) 555-0100
      
      CONSIGNEE:
      Tesla Gigafactory Texas
      13101 Tesla Road
      Austin, TX 78725
      Contact: Michael Chen (512) 555-0200
      
      CARRIER:
      Union Pacific Railroad
      Equipment: UPFE 123456 (Flatcar)
      Driver: Robert Williams (CDL# OH-789456)
      
      COMMODITY DETAILS:
      1. Aluminum Coils - Grade 5052-H32
         Quantity: 15 units
         Weight: 75,000 lbs
         Value: $225,000
         Lot Numbers: AL-2025-1001 through AL-2025-1015
      
      2. Steel Plates - Grade A572-50
         Quantity: 8 units  
         Weight: 32,000 lbs
         Value: $64,000
         Lot Numbers: SP-2025-2001 through SP-2025-2008
      
      SPECIAL INSTRUCTIONS:
      - Tarp required for weather protection
      - Max speed 55 mph due to load weight
      - Delivery window: August 22-23, 2025
      - POD required from receiving supervisor
      
      Hazmat: No
      Insurance: Carrier liability $250,000
      Terms: Prepaid
      
      Authorized by: James Mitchell, Warehouse Manager
      Signature: [Digital Signature]
      Timestamp: 2025-08-20 09:45:00 EST
    `,
    expectedEntities: [
      { type: 'document', name: 'BOL-2025-08-20-001' },
      { type: 'org', name: 'Cincinnati Barge & Rail Terminal' },
      { type: 'org', name: 'Tesla Gigafactory Texas' },
      { type: 'person', name: 'Sarah Johnson' },
      { type: 'person', name: 'Michael Chen' },
      { type: 'org', name: 'Union Pacific Railroad' },
      { type: 'person', name: 'Robert Williams' },
      { type: 'product', name: 'Aluminum Coils' },
      { type: 'product', name: 'Steel Plates' },
      { type: 'person', name: 'James Mitchell' },
    ],
    expectedRelationships: [
      { source: 'BOL-2025-08-20-001', relation: 'shipper', target: 'Cincinnati Barge & Rail Terminal' },
      { source: 'BOL-2025-08-20-001', relation: 'consignee', target: 'Tesla Gigafactory Texas' },
      { source: 'BOL-2025-08-20-001', relation: 'carrier', target: 'Union Pacific Railroad' },
      { source: 'Aluminum Coils', relation: 'shipped_in', target: 'BOL-2025-08-20-001' },
      { source: 'Steel Plates', relation: 'shipped_in', target: 'BOL-2025-08-20-001' },
      { source: 'James Mitchell', relation: 'authorized', target: 'BOL-2025-08-20-001' },
    ],
  },

  // Scenario 3: Legislative/Regulatory Tracking
  legislativeTracking: {
    name: 'Legislative Tracking',
    input: `
      REGULATORY UPDATE MEMO
      Date: August 20, 2025
      From: Compliance Department
      To: All Terminal Operations
      
      Subject: New Transportation Safety Regulations
      
      The Federal Railroad Administration (FRA) has issued new guidelines under
      49 CFR Part 174 regarding the transportation of hazardous materials by rail.
      These regulations, effective September 1, 2025, were sponsored by 
      Senator Jane Martinez (D-OH) and Representative Tom Wilson (R-KY).
      
      KEY CHANGES:
      
      1. Enhanced Inspection Requirements
         - All hazmat shipments must undergo dual verification
         - Inspector: Lisa Chang, FRA Certified Inspector #FRA-2025-0145
         - Frequency: Every shipment (previously random sampling)
      
      2. Documentation Updates
         - New form FRA-F-6180.166 required for all Class 3 materials
         - Electronic submission mandatory via FRA Portal
         - Contact: David Park, FRA Compliance Officer (202) 555-0300
      
      3. Carrier Obligations
         - CSX Transportation, Norfolk Southern, and Union Pacific must update
           their safety protocols by August 30, 2025
         - Training certification required for all operators handling hazmat
         - Trainer: SafeRail Training Institute (Certification #STI-2025)
      
      AFFECTED COMMODITIES:
      - Petroleum products (UN1203)
      - Industrial solvents (UN1993)  
      - Compressed gases (UN1072)
      
      CBRT IMPLEMENTATION PLAN:
      - Project Manager: Amanda Foster
      - Timeline: August 21-30, 2025
      - Budget: $45,000 allocated from compliance fund
      - System Updates: WMS version 3.2.1 deployment required
      
      For questions, contact:
      Rachel Green, Compliance Director
      rgreen@cbrt.com | (513) 555-0150
      
      References:
      - Federal Register Vol. 90, No. 158
      - House Bill H.R. 3842
      - Senate Bill S. 2156
    `,
    expectedEntities: [
      { type: 'org', name: 'Federal Railroad Administration' },
      { type: 'regulation', name: '49 CFR Part 174' },
      { type: 'person', name: 'Jane Martinez' },
      { type: 'person', name: 'Tom Wilson' },
      { type: 'person', name: 'Lisa Chang' },
      { type: 'document', name: 'FRA-F-6180.166' },
      { type: 'person', name: 'David Park' },
      { type: 'org', name: 'CSX Transportation' },
      { type: 'org', name: 'Norfolk Southern' },
      { type: 'org', name: 'Union Pacific' },
      { type: 'org', name: 'SafeRail Training Institute' },
      { type: 'person', name: 'Amanda Foster' },
      { type: 'person', name: 'Rachel Green' },
      { type: 'document', name: 'H.R. 3842' },
      { type: 'document', name: 'S. 2156' },
    ],
    expectedRelationships: [
      { source: '49 CFR Part 174', relation: 'issued_by', target: 'Federal Railroad Administration' },
      { source: '49 CFR Part 174', relation: 'sponsored_by', target: 'Jane Martinez' },
      { source: '49 CFR Part 174', relation: 'sponsored_by', target: 'Tom Wilson' },
      { source: 'Lisa Chang', relation: 'certifier_for', target: 'hazmat inspections' },
      { source: 'CSX Transportation', relation: 'must_comply_with', target: '49 CFR Part 174' },
      { source: 'Amanda Foster', relation: 'manages', target: 'compliance implementation' },
    ],
  },

  // Scenario 4: Complex Multi-Entity Workflow
  complexWorkflow: {
    name: 'Complex Warehouse Workflow',
    input: `
      INCIDENT REPORT & RESOLUTION WORKFLOW
      Report ID: INC-2025-0842
      Date: August 20, 2025, 11:30 AM
      
      INCIDENT SUMMARY:
      During routine staging operations at Cincinnati Barge & Rail Terminal,
      operator Marcus Thompson (Employee ID: CBRT-1245) discovered damage to
      shipment SHP-2025-7891 containing automotive parts from Honda of America
      Manufacturing destined for their Marysville Assembly Plant.
      
      DISCOVERY DETAILS:
      - Location: Warehouse C, Staging Area 3
      - Equipment involved: Forklift FL-45 (Operator: Jennifer Liu, ID: CBRT-1389)
      - Witness: Supervisor Kevin O'Brien (ID: CBRT-0567)
      
      DAMAGED ITEMS:
      - Part Number: HON-2025-ENG-4521 (Engine Control Modules)
      - Quantity affected: 12 units of 50 total
      - Estimated value: $18,000
      - Insurance claim: #INS-2025-3421 filed with Hartford Insurance Group
      
      INVESTIGATION:
      Lead Investigator: Patricia Williams, Safety Manager
      Root Cause: Improper stacking during previous shift by Team Alpha
      Team Alpha Lead: Christopher Martinez (ID: CBRT-0892)
      
      CORRECTIVE ACTIONS:
      1. Immediate retraining scheduled with Ohio Safety Council
         Trainer: Robert Chen (Cert #OSC-2025-456)
         Date: August 22, 2025
      
      2. Process update by Six Sigma Black Belt consultant
         Consultant: Diana Foster, Lean Solutions Inc.
         Implementation: September 1, 2025
      
      3. Equipment inspection by certified technician
         Technician: Steven Park, Crown Equipment Corporation
         Service Order: SVC-2025-8901
      
      STAKEHOLDER NOTIFICATIONS:
      - Customer: Honda of America - Contact: Takeshi Yamamoto (419) 555-0200
      - Carrier: Yellow Freight - Contact: Michelle Roberts (800) 555-0300
      - QA Department: Lead - Sandra Kim (ID: CBRT-0234)
      - Finance: CFO - William Anderson (ID: CBRT-0001)
      
      RESOLUTION:
      - Undamaged units shipped on schedule via BOL-2025-08-20-003
      - Damaged units quarantined for inspection by Honda QC team
      - Replacement order placed: PO-2025-9876
      - Expected resolution date: August 25, 2025
      
      Report filed by: Marcus Thompson
      Approved by: Plant Manager Richard Davis (ID: CBRT-0002)
      CC: Legal Department - Attorney Janet Wu
    `,
    expectedEntities: [
      { type: 'document', name: 'INC-2025-0842' },
      { type: 'org', name: 'Cincinnati Barge & Rail Terminal' },
      { type: 'person', name: 'Marcus Thompson' },
      { type: 'shipment', name: 'SHP-2025-7891' },
      { type: 'org', name: 'Honda of America Manufacturing' },
      { type: 'location', name: 'Marysville Assembly Plant' },
      { type: 'person', name: 'Jennifer Liu' },
      { type: 'equipment', name: 'Forklift FL-45' },
      { type: 'person', name: 'Kevin O\'Brien' },
      { type: 'product', name: 'HON-2025-ENG-4521' },
      { type: 'org', name: 'Hartford Insurance Group' },
      { type: 'person', name: 'Patricia Williams' },
      { type: 'person', name: 'Christopher Martinez' },
      { type: 'org', name: 'Ohio Safety Council' },
      { type: 'person', name: 'Robert Chen' },
      { type: 'person', name: 'Diana Foster' },
      { type: 'org', name: 'Lean Solutions Inc' },
      { type: 'person', name: 'Steven Park' },
      { type: 'org', name: 'Crown Equipment Corporation' },
      { type: 'person', name: 'Takeshi Yamamoto' },
      { type: 'org', name: 'Yellow Freight' },
      { type: 'person', name: 'Michelle Roberts' },
      { type: 'person', name: 'Sandra Kim' },
      { type: 'person', name: 'William Anderson' },
      { type: 'person', name: 'Richard Davis' },
      { type: 'person', name: 'Janet Wu' },
    ],
    expectedRelationships: [
      { source: 'Marcus Thompson', relation: 'discovered', target: 'damage incident' },
      { source: 'Jennifer Liu', relation: 'operated', target: 'Forklift FL-45' },
      { source: 'SHP-2025-7891', relation: 'from', target: 'Honda of America Manufacturing' },
      { source: 'SHP-2025-7891', relation: 'to', target: 'Marysville Assembly Plant' },
      { source: 'Patricia Williams', relation: 'investigated', target: 'INC-2025-0842' },
      { source: 'Christopher Martinez', relation: 'leads', target: 'Team Alpha' },
      { source: 'Robert Chen', relation: 'will_train', target: 'Team Alpha' },
      { source: 'Diana Foster', relation: 'consults_for', target: 'Cincinnati Barge & Rail Terminal' },
      { source: 'Richard Davis', relation: 'approved', target: 'INC-2025-0842' },
    ],
  },
};

export type KnowledgeScenario = typeof KNOWLEDGE_SCENARIOS[keyof typeof KNOWLEDGE_SCENARIOS];