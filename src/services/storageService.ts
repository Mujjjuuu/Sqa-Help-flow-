import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const storageService = {
  /**
   * Upload file to Supabase Storage at path:
   * projects/{projectId}/tickets/{ticketId}/{filename}
   * If offline or no Supabase, converts file to a persistent base64 data URL.
   */
  async uploadFile(
    projectId: string,
    ticketId: string,
    file: File
  ): Promise<UploadResult> {
    const supabase = getSupabaseClient();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `projects/${projectId}/tickets/${ticketId}/${Date.now()}_${sanitizedFileName}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.warn('Supabase storage upload error, falling back to local file reader:', error.message);
        } else if (data) {
          const { data: publicUrlData } = supabase.storage
            .from('project-files')
            .getPublicUrl(data.path);

          return {
            fileUrl: publicUrlData.publicUrl,
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size,
          };
        }
      } catch (err) {
        console.warn('Storage upload exception:', err);
      }
    }

    // Local Fallback: convert to base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          fileUrl: reader.result as string,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
        });
      };
      reader.onerror = () => reject(new Error('Failed to read file locally'));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Delete file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && fileUrl.includes('/project-files/')) {
      try {
        const parts = fileUrl.split('/project-files/');
        if (parts[1]) {
          await supabase.storage.from('project-files').remove([parts[1]]);
        }
      } catch (e) {
        console.warn('Failed to delete file from Supabase storage:', e);
      }
    }
  },

  /**
   * Trigger browser download for a file URL
   */
  downloadFile(fileUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};
