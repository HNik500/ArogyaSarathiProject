/**
 * Image Conversion Utility
 *
 * Converts File/Blob objects to Base64 strings for localStorage
 * This file provides helpers used by PatientImageUpload and DoctorDashboard.
 */

/** Convert File object to Base64 data URL */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Create image thumbnail (shrink large images)
 * Useful to save localStorage space
 */
export const createImageThumbnail = (
  base64DataUrl: string,
  maxWidth: number = 640,
  maxHeight: number = 480
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnail);
    };

    img.onerror = (error) => {
      console.error('❌ Failed to create thumbnail:', error);
      reject(error);
    };

    img.src = base64DataUrl;
  });
};

/**
 * Download Base64 image (for debugging/export)
 */
export const downloadBase64Image = (
  base64String: string,
  filename: string
): void => {
  const dataUrl = base64String.startsWith('data:')
    ? base64String
    : `data:image/jpeg;base64,${base64String}`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`✅ Downloaded: ${filename}`);
};

/**
 * Display Base64 image in <img> tag
 */
export const getImageUrl = (base64String: string): string => {
  if (base64String.startsWith('data:')) {
    return base64String;
  }
  return `data:image/jpeg;base64,${base64String}`;
};

/**
 * IMPORTANT: localStorage Size Calculation
 * ========================================
 * Base64 encoding increases size by ~33%
 * Original size: 1MB
 * As Base64: ~1.33MB
 * As JSON: ~1.5MB (with quotes, keys, etc)
 * localStorage limit: ~5-10MB
 * ✅ Safe: Up to 3-4 medium-quality images (1MB each)
 * ⚠️  Risky: More than 5 large images
 * ❌ Will fail: Trying to store 100MB of images
 *
 * SOLUTION:
 * =========
 * 1. Compress images: Use createImageThumbnail()
 * 2. Limit uploads: Check size with validateFileSize()
 * 3. Delete old: Remove cases after doctor replies
 * 4. Use backend: For production, send to server after initial save
 */

/**
 * Check available localStorage space
 */
export const getAvailableStorageSpace = (): {
  usedMB: number;
  remainingMB: number;
  percentUsed: number;
} => {
  let test = '_localStorage_test_';
  try {
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);

    // Rough estimate: typical localStorage is 5-10MB
    const totalMB = 10; // Conservative estimate
    const used = JSON.stringify(localStorage).length / (1024 * 1024);
    const remaining = totalMB - used;

    return {
      usedMB: Number(used.toFixed(2)),
      remainingMB: Number(remaining.toFixed(2)),
      percentUsed: Number(((used / totalMB) * 100).toFixed(1)),
    };
  } catch (e) {
    console.error('⚠️  localStorage quota check failed:', e);
    return { usedMB: 0, remainingMB: 0, percentUsed: 0 };
  }
};

/**
 * COMPLETE EXAMPLE - Convert file from input and save:
 * =====================================================
 * const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = event.target.files?.[0];
 *   if (!file) return;
 *
 *   // ✅ Step 1: Validate file size
 *   if (!validateFileSize(file, 5)) {
 *     alert('File too large. Max 5MB');
 *     return;
 *   }
 *
 *   // ✅ Step 2: Convert File to Base64
 *   const base64 = await fileToBase64(file);
 *
 *   // ✅ Step 3: Create thumbnail to save space
 *   const thumbnail = await createImageThumbnail(base64);
 *
 *   // ✅ Step 4: Create medical case with Base64 image
 *   const medicalCase = createMedicalCase({
 *     patientId,
 *     patientName,
 *     patientAge,
 *     patientPhone,
 *     patientDistrict,
 *     patientState,
 *     thumbnail, // Use thumbnail instead of full image
 *     file.name
 *   });
 *
 *   console.log('✅ Case created:', medicalCase.caseId);
 * };
 */

/**
 * TROUBLESHOOTING:
 * ================
 *
 * ❌ "localStorage quota exceeded" or "QuotaExceededError"
 * → Your total stored data (all keys) exceeded 5-10MB
 * → Solution: Delete old cases, compress images, use thumbnails
 *
 * ❌ Image shows as broken in <img>
 * → Base64 string is corrupted or not a data URL
 * → Solution: Use getImageUrl() to ensure proper format
 *
 * ❌ Doctor can't see patient's images
 * → Images stored in patient-specific keys instead of medicalCases
 * → Solution: Use medicalCasesService, not custom localStorage keys
 *
 * ❌ Images not showing after refresh
 * → Images were stored as File objects (not serializable)
 * → Solution: Always use Base64 strings, not raw File objects
 */
