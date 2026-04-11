import { supabase } from '../supabase';

export const storageService = {
  /**
   * Upload a file to a specific bucket
   * @param bucket The bucket name (avatars, screenshots, courses, tools)
   * @param path The path within the bucket (e.g., 'user-id/avatar.png')
   * @param file The file object to upload
   */
  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { success: true, url: publicUrl, data };
    } catch (error: any) {
      console.error(`Error uploading to ${bucket}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a file from a bucket
   */
  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting from ${bucket}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Helper to upload user avatar
   */
  async uploadAvatar(userId: string, file: File) {
    const extension = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random().toString(36).substring(7)}.${extension}`;
    return this.uploadFile('avatars', fileName, file);
  },

  /**
   * Helper to upload payment screenshot
   */
  async uploadScreenshot(userId: string, file: File) {
    const extension = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${extension}`;
    return this.uploadFile('screenshots', fileName, file);
  }
};
