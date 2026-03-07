/**
 * Utility functions for managing read article state in localStorage
 * 
 * Articles are tracked per training course using the key format:
 * `training_{trainingId}_read_stages`
 * 
 * The value is an array of stage IDs (numbers) that have been read.
 */

const STORAGE_KEY_PREFIX = 'training_';
const STORAGE_KEY_SUFFIX = '_read_stages';

/**
 * Get the localStorage key for a specific training course
 * @param trainingId - The ID of the training course
 * @returns The localStorage key string
 */
function getStorageKey(trainingId: number): string {
  return `${STORAGE_KEY_PREFIX}${trainingId}${STORAGE_KEY_SUFFIX}`;
}

/**
 * Mark an article (stage) as read for a specific training course
 * @param trainingId - The ID of the training course
 * @param stageId - The ID of the stage/article to mark as read
 */
export function markArticleAsRead(trainingId: number, stageId: number): void {
  try {
    const key = getStorageKey(trainingId);
    const readStages = getReadArticles(trainingId);
    
    // Only add if not already in the list
    if (!readStages.includes(stageId)) {
      readStages.push(stageId);
      localStorage.setItem(key, JSON.stringify(readStages));
    }
  } catch (error) {
    // Handle localStorage errors gracefully (e.g., quota exceeded, disabled storage)
    console.error('Error marking article as read:', error);
  }
}

/**
 * Check if a specific article (stage) has been read
 * @param trainingId - The ID of the training course
 * @param stageId - The ID of the stage/article to check
 * @returns true if the article has been read, false otherwise
 */
export function isArticleRead(trainingId: number, stageId: number): boolean {
  try {
    const readStages = getReadArticles(trainingId);
    return readStages.includes(stageId);
  } catch (error) {
    console.error('Error checking if article is read:', error);
    return false;
  }
}

/**
 * Get all read article IDs for a specific training course
 * @param trainingId - The ID of the training course
 * @returns Array of stage IDs that have been read
 */
export function getReadArticles(trainingId: number): number[] {
  try {
    const key = getStorageKey(trainingId);
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    
    // Ensure we return an array of numbers
    if (Array.isArray(parsed)) {
      return parsed.map(id => Number(id)).filter(id => !isNaN(id));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting read articles:', error);
    return [];
  }
}

/**
 * Clear all read articles for a specific training course
 * Useful for testing or reset functionality
 * @param trainingId - The ID of the training course
 */
export function clearReadArticles(trainingId: number): void {
  try {
    const key = getStorageKey(trainingId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing read articles:', error);
  }
}

