/**
 * Medical Cases Service - localStorage-based shared storage
 * 
 * ROOT CAUSE EXPLAINED:
 * =====================
 * The doctor couldn't see images because:
 * 1. Images were stored in patient-specific localStorage keys (hv_vault_PAT-xxx)
 * 2. Each localStorage key is ISOLATED per browser origin/window
 * 3. Doctor used DIFFERENT localStorage keys than patient (hv_vault_DOC-xxx)
 * 4. Images were stored as File objects (not JSON-serializable) instead of Base64
 * 5. No shared central location for cases accessible to both roles
 * 
 * SOLUTION:
 * =========
 * Use a single shared key "medicalCases" in localStorage:
 * - Same key for ALL users (Patient, Doctor, Pharmacy)
 * - Same browser/device can access the same data
 * - Images stored as Base64 strings (JSON-serializable)
 * - Each case has caseId, patientId, imageBase64, doctorReply, timestamp
 * - Doctor updates same object when replying
 */

export interface MedicalImage {
  imageId: string;
  filename: string;
  base64Data: string; // NOT File object - MUST be Base64 string
  uploadedAt: number;
  type: 'IMAGE' | 'VIDEO_FRAMES';
}

export interface DoctorReply {
  replyId: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  content: string;
  type: 'PRESCRIPTION' | 'DOCTOR_NOTE';
  medication?: string;
  timestamp: number;
}

export interface MedicalCase {
  caseId: string; // Unique case identifier
  patientId: string; // Patient who uploaded
  patientName: string;
  patientAge: number;
  patientPhone: string;
  patientDistrict: string;
  patientState: string;
  
  // SYMPTOM TEXT (optional - for text-only submissions)
  symptomText?: string;
  
  // IMAGE DATA
  images: MedicalImage[];
  
  // DOCTOR REPLIES (array to support multiple doctor inputs)
  replies: DoctorReply[];
  
  // STATUS
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
  
  // TIMESTAMPS
  createdAt: number;
  updatedAt: number;
}

// Storage Keys
const MEDICAL_CASES_KEY = 'medicalCases';
const ALL_CASES_STORAGE_KEY = 'allMedicalCases'; // Backup key

/**
 * LOCALSTORAGE LIMITATION RULES:
 * =============================
 * ✅ WHAT WORKS:
 * - Same browser window/tab: Instant data sharing
 * - Same device/browser: All windows/tabs see the same data
 * - String serialization: JSON, Base64, text
 * - Size: ~5-10MB per origin
 * 
 * ❌ WHAT DOESN'T WORK:
 * - Different devices: No sync (each has separate localStorage)
 * - Different browsers: No sync (Chrome/Firefox have separate storage)
 * - Private/Incognito mode: Separate isolated storage
 * - File objects: Must convert to Base64
 * - Blob objects: Must convert to Base64
 * - Cross-origin: Cannot access other domain's storage
 */

// ==========================================
// 1. CREATE NEW CASE WITH IMAGE
// ==========================================
export const createMedicalCase = (
  patientId: string,
  patientName: string,
  patientAge: number,
  patientPhone: string,
  patientDistrict: string,
  patientState: string,
  imageBase64: string, // ⚠️ MUST BE BASE64, NOT FILE
  imageFilename: string
): MedicalCase => {
  const caseId = `CASE-${patientId}-${Date.now()}`;

  const newCase: MedicalCase = {
    caseId,
    patientId,
    patientName,
    patientAge,
    patientPhone,
    patientDistrict,
    patientState,
    images: [
      {
        imageId: `IMG-${Date.now()}`,
        filename: imageFilename,
        base64Data: imageBase64, // ✅ Base64 string, not File
        uploadedAt: Date.now(),
        type: 'IMAGE',
      },
    ],
    replies: [],
    status: 'PENDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Save to localStorage under shared key
  saveCaseToStorage(newCase);
  
  console.log(`✅ Medical case created: ${caseId}`);
  return newCase;
};

// ==========================================
// 1B. CREATE SYMPTOM-ONLY CASE (NO IMAGES)
// ==========================================
export const createSymptomCase = (
  patientId: string,
  patientName: string,
  patientAge: number,
  patientPhone: string,
  patientDistrict: string,
  patientState: string,
  symptomText: string // ✅ Text-only submission
): MedicalCase => {
  const caseId = `CASE-${patientId}-${Date.now()}`;

  const newCase: MedicalCase = {
    caseId,
    patientId,
    patientName,
    patientAge,
    patientPhone,
    patientDistrict,
    patientState,
    symptomText, // ✅ Store symptom text
    images: [], // ✅ Empty images array (optional)
    replies: [],
    status: 'PENDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Save to localStorage under shared key
  saveCaseToStorage(newCase);
  
  console.log(`✅ Symptom case created: ${caseId}`);
  return newCase;
};

// ==========================================
// 2. GET ALL CASES (Doctor sees all)
// ==========================================
export const getAllCases = (): MedicalCase[] => {
  try {
    const stored = localStorage.getItem(MEDICAL_CASES_KEY);
    if (!stored) return [];
    
    const cases = JSON.parse(stored) as MedicalCase[];
    console.log(`📋 Retrieved ${cases.length} cases from localStorage`);
    return cases;
  } catch (error) {
    console.error('❌ Failed to load cases:', error);
    return [];
  }
};

// ==========================================
// 3. GET CASE BY ID (Doctor/Patient views specific case)
// ==========================================
export const getCaseById = (caseId: string): MedicalCase | null => {
  const allCases = getAllCases();
  const found = allCases.find((c) => c.caseId === caseId);
  
  if (found) {
    console.log(`✅ Found case: ${caseId}`);
  } else {
    console.warn(`❌ Case not found: ${caseId}`);
  }
  
  return found || null;
};

// ==========================================
// 4. GET CASES BY PATIENT ID
// ==========================================
export const getCasesByPatient = (patientId: string): MedicalCase[] => {
  const allCases = getAllCases();
  return allCases.filter((c) => c.patientId === patientId);
};

// ==========================================
// 5. DOCTOR ADDS REPLY TO CASE
// ==========================================
export const addDoctorReply = (
  caseId: string,
  doctorId: string,
  doctorName: string,
  specialization: string,
  content: string,
  type: 'PRESCRIPTION' | 'DOCTOR_NOTE',
  medication?: string
): MedicalCase | null => {
  const medicalCase = getCaseById(caseId);
  
  if (!medicalCase) {
    console.error(`❌ Case not found for reply: ${caseId}`);
    return null;
  }

  // Create new reply
  const newReply: DoctorReply = {
    replyId: `REPLY-${Date.now()}`,
    doctorId,
    doctorName,
    specialization,
    content,
    type,
    medication,
    timestamp: Date.now(),
  };

  // Update case with new reply
  medicalCase.replies.push(newReply);
  medicalCase.updatedAt = Date.now();
  medicalCase.status = 'REVIEWED'; // Mark as reviewed by doctor

  // Save updated case back to localStorage
  saveCaseToStorage(medicalCase);

  console.log(`✅ Doctor reply added to case ${caseId}`);
  console.log(`   Reply ID: ${newReply.replyId}`);
  console.log(`   Doctor: ${doctorName} (${specialization})`);

  return medicalCase;
};

// ==========================================
// 6. ADD ANOTHER IMAGE TO CASE
// ==========================================
export const addImageToCase = (
  caseId: string,
  imageBase64: string,
  imageFilename: string
): MedicalCase | null => {
  const medicalCase = getCaseById(caseId);
  
  if (!medicalCase) {
    console.error(`❌ Case not found for adding image: ${caseId}`);
    return null;
  }

  const newImage: MedicalImage = {
    imageId: `IMG-${Date.now()}`,
    filename: imageFilename,
    base64Data: imageBase64,
    uploadedAt: Date.now(),
    type: 'IMAGE',
  };

  medicalCase.images.push(newImage);
  medicalCase.updatedAt = Date.now();

  saveCaseToStorage(medicalCase);

  console.log(`✅ Image added to case ${caseId}`);
  return medicalCase;
};

// ==========================================
// 7. DELETE CASE
// ==========================================
export const deleteCase = (caseId: string): boolean => {
  const allCases = getAllCases();
  const filtered = allCases.filter((c) => c.caseId !== caseId);

  if (filtered.length === allCases.length) {
    console.warn(`❌ Case not found for deletion: ${caseId}`);
    return false;
  }

  localStorage.setItem(MEDICAL_CASES_KEY, JSON.stringify(filtered));
  console.log(`✅ Case deleted: ${caseId}`);
  return true;
};

// ==========================================
// 8. SAVE CASE (Internal Helper)
// ==========================================
const saveCaseToStorage = (medicalCase: MedicalCase): void => {
  const allCases = getAllCases();
  
  // Update existing case or add new one
  const index = allCases.findIndex((c) => c.caseId === medicalCase.caseId);
  if (index >= 0) {
    allCases[index] = medicalCase;
  } else {
    allCases.push(medicalCase);
  }

  // Save to localStorage
  localStorage.setItem(MEDICAL_CASES_KEY, JSON.stringify(allCases));
  
  // Backup to alternate key for safety
  localStorage.setItem(ALL_CASES_STORAGE_KEY, JSON.stringify(allCases));
  
  console.log(`💾 Case saved: ${medicalCase.caseId}`);
};

// ==========================================
// 9. CLEAR ALL CASES (For testing/reset)
// ==========================================
export const clearAllCases = (): void => {
  localStorage.removeItem(MEDICAL_CASES_KEY);
  localStorage.removeItem(ALL_CASES_STORAGE_KEY);
  console.log('🧹 All medical cases cleared from localStorage');
};

// ==========================================
// 10. EXPORT/BACKUP CASES
// ==========================================
export const exportCases = (): string => {
  const allCases = getAllCases();
  return JSON.stringify(allCases, null, 2);
};

// ==========================================
// 11. IMPORT/RESTORE CASES
// ==========================================
export const importCases = (jsonData: string): boolean => {
  try {
    const cases = JSON.parse(jsonData) as MedicalCase[];
    
    // Validate structure
    cases.forEach((c) => {
      if (!c.caseId || !c.patientId) {
        throw new Error('Invalid case structure');
      }
    });

    localStorage.setItem(MEDICAL_CASES_KEY, jsonData);
    localStorage.setItem(ALL_CASES_STORAGE_KEY, jsonData);
    console.log(`✅ Imported ${cases.length} cases`);
    return true;
  } catch (error) {
    console.error('❌ Failed to import cases:', error);
    return false;
  }
};

// ==========================================
// 12. GET STATISTICS
// ==========================================
export const getCaseStatistics = () => {
  const allCases = getAllCases();
  
  const stats = {
    totalCases: allCases.length,
    pendingCases: allCases.filter((c) => c.status === 'PENDING').length,
    reviewedCases: allCases.filter((c) => c.status === 'REVIEWED').length,
    resolvedCases: allCases.filter((c) => c.status === 'RESOLVED').length,
    totalImages: allCases.reduce((sum, c) => sum + c.images.length, 0),
    totalReplies: allCases.reduce((sum, c) => sum + c.replies.length, 0),
    storageUsed: localStorage.getItem(MEDICAL_CASES_KEY)?.length || 0,
  };

  console.log('📊 Case Statistics:', stats);
  return stats;
};

/**
 * STEP-BY-STEP USAGE EXAMPLE:
 * ===========================
 * 
 * PATIENT FLOW:
 * 1. Patient uploads image → Convert File to Base64
 * 2. Call createMedicalCase(patientId, name, age, phone, district, state, base64, filename)
 * 3. Case saved to localStorage with caseId
 * 4. Patient can see their cases with getCasesByPatient(patientId)
 * 
 * DOCTOR FLOW:
 * 1. Doctor logs in
 * 2. Fetch all cases: getAllCases()
 * 3. Click case → getCaseById(caseId)
 * 4. View patient info and all images
 * 5. Type reply → addDoctorReply(caseId, doctorId, name, spec, content, type)
 * 6. Reply saved to same case object
 * 7. Patient refreshes → Sees doctor reply under same case
 * 
 * IMPORTANT NOTES:
 * ================
 * ⚠️  Images MUST be Base64 strings, not File objects
 * ⚠️  Same device/browser only - no cross-device sync
 * ⚠️  localStorage limit ~5-10MB total per origin
 * ⚠️  No encryption - avoid storing sensitive data
 * ✅ Instant updates between tabs
 * ✅ Persists until browser storage cleared
 * ✅ Works offline perfectly
 */
