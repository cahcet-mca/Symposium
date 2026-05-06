// src/utils/imageHelper.js
// Helper functions for handling event images

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Get full image URL for an event image
 * @param {string} imageFilename - The image filename stored in database (e.g., "event1.jpg")
 * @returns {string|null} Full URL to the image or null
 */
export const getEventImageUrl = (imageFilename) => {
  if (!imageFilename) {
    return null;
  }
  
  // If it's already a full URL (starts with http), return as is
  if (imageFilename.startsWith('http://') || imageFilename.startsWith('https://')) {
    return imageFilename;
  }
  
  // If it's a data URL (base64), return as is
  if (imageFilename.startsWith('data:image')) {
    return imageFilename;
  }
  
  // Otherwise, construct URL to backend static endpoint
  // Remove /api suffix if present to get base URL
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}/event-images/${imageFilename}`;
};

/**
 * Get image filename from URL or path
 * @param {string} imagePath - Full URL or path
 * @returns {string} Filename extracted from path
 */
export const getImageFilename = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's a URL, extract filename from end
  if (imagePath.includes('/')) {
    const parts = imagePath.split('/');
    return parts[parts.length - 1];
  }
  
  return imagePath;
};

/**
 * Check if image URL is valid (not broken)
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>} True if image loads successfully
 */
export const checkImageExists = (url) => {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * Preload image to cache
 * @param {string} url - Image URL to preload
 * @returns {Promise<void>}
 */
export const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      reject(new Error('No URL provided'));
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

/**
 * Preload multiple images
 * @param {string[]} urls - Array of image URLs
 * @returns {Promise<PromiseSettledResult[]>}
 */
export const preloadImages = (urls) => {
  const promises = urls.filter(url => url).map(url => preloadImage(url));
  return Promise.allSettled(promises);
};

// Default export
export default {
  getEventImageUrl,
  getImageFilename,
  checkImageExists,
  preloadImage,
  preloadImages
};