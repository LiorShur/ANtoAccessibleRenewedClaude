/**
 * Storage Service - Centralized Firebase Storage management for photos
 * 
 * All photos are uploaded to Firebase Storage instead of being stored
 * directly in Firestore documents (which have a 1MB limit).
 * 
 * Storage Structure:
 * - routes/{userId}/{routeId}/photo_{index}.jpg
 * - trail_guides/{guideId}/photo_{index}.jpg
 * - users/{userId}/profile/avatar.jpg
 */

import { storage } from '../../firebase-setup.js';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";

class StorageService {
  constructor() {
    this.isInitialized = false;
    this.compressionSettings = {
      maxWidth: 800,
      quality: 0.6,
      format: 'image/jpeg'
    };
  }

  /**
   * Initialize the storage service
   */
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('📦 StorageService initialized');
  }

  /**
   * Compress an image using canvas
   * @param {string} base64Data - Base64 encoded image data
   * @param {number} maxWidth - Maximum width in pixels
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<string>} Compressed base64 image
   */
  async compressImage(base64Data, maxWidth = null, quality = null) {
    maxWidth = maxWidth || this.compressionSettings.maxWidth;
    quality = quality || this.compressionSettings.quality;

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const compressed = canvas.toDataURL(this.compressionSettings.format, quality);
          resolve(compressed);
        } catch (error) {
          reject(new Error('Image compression failed: ' + error.message));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = base64Data;
    });
  }

  /**
   * Convert base64 string to Blob for upload
   * @param {string} base64 - Base64 encoded data
   * @returns {Blob} Binary blob
   */
  base64ToBlob(base64) {
    try {
      const parts = base64.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (error) {
      throw new Error('Failed to convert base64 to blob: ' + error.message);
    }
  }

  /**
   * Check if a string is a Storage URL (not base64)
   * @param {string} content - Photo content
   * @returns {boolean}
   */
  isStorageURL(content) {
    if (!content || typeof content !== 'string') return false;
    return content.startsWith('https://') || content.startsWith('http://');
  }

  /**
   * Upload a single photo to Firebase Storage
   * @param {string} base64Data - Base64 encoded photo
   * @param {string} storagePath - Path in Storage (e.g., 'routes/userId/routeId/photo_0.jpg')
   * @param {boolean} compress - Whether to compress before upload
   * @returns {Promise<{url: string, ref: string, size: number}>}
   */
  async uploadPhoto(base64Data, storagePath, compress = true) {
    try {
      // Skip if already a URL
      if (this.isStorageURL(base64Data)) {
        console.log('📸 Photo already uploaded, skipping:', storagePath);
        return { url: base64Data, ref: storagePath, size: 0, skipped: true };
      }

      // Compress if needed
      let dataToUpload = base64Data;
      if (compress) {
        console.log('🔄 Compressing photo...');
        dataToUpload = await this.compressImage(base64Data);
      }

      // Convert to blob
      const blob = this.base64ToBlob(dataToUpload);
      console.log(`📤 Uploading photo (${Math.round(blob.size/1024)} KB) to: ${storagePath}`);

      // Upload to Storage
      const photoRef = ref(storage, storagePath);
      await uploadBytes(photoRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(photoRef);
      
      console.log('✅ Photo uploaded successfully');
      
      return {
        url: downloadURL,
        ref: storagePath,
        size: blob.size
      };
    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      throw error;
    }
  }

  /**
   * Upload all photos in route data to Storage and replace base64 with URLs
   * @param {Array} routeData - Route data array with photo entries
   * @param {string} userId - User ID
   * @param {string} routeId - Route ID (use timestamp if new route)
   * @param {function} onProgress - Progress callback (photoIndex, totalPhotos)
   * @returns {Promise<Array>} Updated route data with photo URLs
   */
  async uploadRoutePhotos(routeData, userId, routeId = null, onProgress = null) {
    // Generate route ID if not provided
    const finalRouteId = routeId || `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Find all photos that need uploading (base64, not URLs)
    const photos = routeData.filter(p => 
      p.type === 'photo' && 
      p.content && 
      !this.isStorageURL(p.content)
    );

    if (photos.length === 0) {
      console.log('📸 No photos to upload (all already URLs or no photos)');
      return { routeData, routeId: finalRouteId, photosUploaded: 0 };
    }

    console.log(`📸 Uploading ${photos.length} photos to Storage...`);
    
    // Create a copy of route data to modify
    const processedRouteData = [...routeData];
    let uploadedCount = 0;
    let totalSize = 0;

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        // Report progress
        if (onProgress) {
          onProgress(i + 1, photos.length);
        }

        // Generate storage path
        const storagePath = `routes/${userId}/${finalRouteId}/photo_${i}.jpg`;
        
        // Upload photo
        const result = await this.uploadPhoto(photo.content, storagePath, true);
        
        // Find and update the photo in route data
        const photoIndex = processedRouteData.findIndex(p => 
          p.type === 'photo' && p.timestamp === photo.timestamp
        );
        
        if (photoIndex !== -1) {
          processedRouteData[photoIndex] = {
            ...processedRouteData[photoIndex],
            content: result.url,
            storageRef: result.ref,
            isStorageURL: true,
            originalSize: photo.content.length,
            compressedSize: result.size
          };
        }
        
        uploadedCount++;
        totalSize += result.size;
        
      } catch (error) {
        console.warn(`⚠️ Failed to upload photo ${i + 1}:`, error.message);
        // Keep original base64 if upload fails
      }
    }

    console.log(`✅ Uploaded ${uploadedCount}/${photos.length} photos (${Math.round(totalSize/1024)} KB total)`);
    
    return {
      routeData: processedRouteData,
      routeId: finalRouteId,
      photosUploaded: uploadedCount,
      totalSize
    };
  }

  /**
   * Calculate total size of route data
   * @param {Array} routeData - Route data array
   * @returns {{totalSize: number, photoSize: number, needsStorage: boolean}}
   */
  calculateRouteSize(routeData) {
    let photoSize = 0;
    let photosNeedingUpload = 0;
    
    routeData.forEach(p => {
      if (p.type === 'photo' && p.content && !this.isStorageURL(p.content)) {
        photoSize += p.content.length;
        photosNeedingUpload++;
      }
    });
    
    const totalSize = JSON.stringify(routeData).length;
    
    return {
      totalSize,
      photoSize,
      photosNeedingUpload,
      // Use Storage if total > 700KB or more than 2 photos need uploading
      needsStorage: totalSize > 700000 || photosNeedingUpload > 2
    };
  }

  /**
   * Delete all photos for a route from Storage
   * @param {string} userId - User ID
   * @param {string} routeId - Route ID
   */
  async deleteRoutePhotos(userId, routeId) {
    try {
      const folderRef = ref(storage, `routes/${userId}/${routeId}`);
      const listResult = await listAll(folderRef);
      
      const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      console.log(`🗑️ Deleted ${listResult.items.length} photos for route ${routeId}`);
    } catch (error) {
      console.warn('⚠️ Failed to delete route photos:', error.message);
    }
  }

  /**
   * Prepare route data for Firestore by ensuring all photos are uploaded
   * @param {Array} routeData - Original route data
   * @param {string} userId - User ID
   * @param {function} onProgress - Progress callback
   * @returns {Promise<{routeData: Array, routeId: string}>}
   */
  async prepareRouteForSave(routeData, userId, onProgress = null) {
    const sizeInfo = this.calculateRouteSize(routeData);
    
    console.log(`📊 Route size: ${Math.round(sizeInfo.totalSize/1024)} KB, Photos needing upload: ${sizeInfo.photosNeedingUpload}`);
    
    if (sizeInfo.needsStorage) {
      console.log('📸 Route needs Storage upload for photos...');
      return await this.uploadRoutePhotos(routeData, userId, null, onProgress);
    }
    
    // If small enough, still compress inline photos for efficiency
    if (sizeInfo.photosNeedingUpload > 0) {
      console.log('🔄 Compressing inline photos...');
      const processedData = await this.compressInlinePhotos(routeData);
      return { routeData: processedData, routeId: null, photosUploaded: 0 };
    }
    
    return { routeData, routeId: null, photosUploaded: 0 };
  }

  /**
   * Compress photos but keep them inline (for small routes)
   * @param {Array} routeData - Route data
   * @returns {Promise<Array>} Route data with compressed photos
   */
  async compressInlinePhotos(routeData) {
    const processedData = [...routeData];
    
    for (let i = 0; i < processedData.length; i++) {
      const point = processedData[i];
      
      if (point.type === 'photo' && point.content && !this.isStorageURL(point.content)) {
        try {
          const compressed = await this.compressImage(point.content);
          processedData[i] = {
            ...point,
            content: compressed,
            wasCompressed: true
          };
        } catch (error) {
          console.warn(`⚠️ Failed to compress photo ${i}:`, error.message);
        }
      }
    }
    
    return processedData;
  }
}

// Export singleton instance
export const storageService = new StorageService();
