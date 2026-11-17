import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTask,
} from 'firebase/storage';
import {auth, storage} from '../lib/firebase';
import type {MaterialType} from '../types/database';

export interface UploadedMediaResult {
  url: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
}

export interface UploadProgressInfo {
  percent: number;
  bytesTransferred: number;
  totalBytes: number;
}

export const IMAGE_ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const VIDEO_ALLOWED_TYPES = new Set(['video/mp4', 'video/webm']);
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export const AUDIO_ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/mp4',
  'audio/webm',
]);
export const AUDIO_MAX_BYTES = 30 * 1024 * 1024; // 30 MB

export const PDF_ALLOWED_TYPES = new Set(['application/pdf']);
export const PDF_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return cleaned.slice(-80) || `fail_${Date.now()}`;
}

export function translateStorageError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as {code?: unknown}).code)
      : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (code === 'storage/canceled') {
    return 'Muat naik fail telah dibatalkan.';
  }
  if (code === 'storage/unauthorized') {
    return 'Akses Firebase Storage tidak dibenarkan. Pastikan anda log masuk sebagai Pentadbir yang sah dan peraturan Firebase Storage membenarkan muat naik.';
  }
  if (code === 'storage/quota-exceeded') {
    return 'Kuota storan Firebase Storage telah penuh.';
  }
  if (code === 'storage/retry-limit-exceeded') {
    return 'Sambungan rangkaian terganggu semasa memuat naik. Sila cuba lagi.';
  }
  return msg || 'Gagal memuat naik fail ke Firebase Storage.';
}

export function validateImageFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const validExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  if (!IMAGE_ALLOWED_TYPES.has(file.type) && !validExt) {
    return 'Format gambar tidak disokong. Sila pilih fail JPG, PNG, WEBP atau GIF.';
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return 'Saiz gambar melebihi had maksimum 10 MB. Sila kecilkan saiz gambar dan cuba lagi.';
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const validExt = ['mp4', 'webm'].includes(ext);
  if (!VIDEO_ALLOWED_TYPES.has(file.type) && !validExt) {
    return 'Format fail video tidak disokong. Sila muat naik fail MP4 atau WEBM sahaja.';
  }
  if (file.size > VIDEO_MAX_BYTES) {
    return 'Saiz fail video melebihi had maksimum 100 MB. Sila mampatkan video sebelum memuat naik.';
  }
  return null;
}

export function validateAudioFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const validExt = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm'].includes(ext);
  if (!AUDIO_ALLOWED_TYPES.has(file.type) && !validExt) {
    return 'Format fail audio tidak disokong. Sila pilih fail MP3, WAV, OGG, AAC atau M4A.';
  }
  if (file.size > AUDIO_MAX_BYTES) {
    return 'Saiz fail audio melebihi had maksimum 30 MB. Sila kecilkan fail audio dan cuba lagi.';
  }
  return null;
}

export function validateMaterialFile(
  file: File,
  materialType: Exclude<MaterialType, 'youtube'>
): string | null {
  if (materialType === 'image') return validateImageFile(file);
  if (materialType === 'video') return validateVideoFile(file);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (materialType === 'pdf') {
    if (!PDF_ALLOWED_TYPES.has(file.type) && ext !== 'pdf') {
      return 'Format fail tidak disokong. Sila pilih dokumen PDF sahaja.';
    }
    if (file.size > PDF_MAX_BYTES) {
      return 'Saiz dokumen PDF melebihi had maksimum 25 MB.';
    }
    return null;
  }
  if (materialType === 'audio') {
    const validExt = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm'].includes(ext);
    if (!AUDIO_ALLOWED_TYPES.has(file.type) && !validExt) {
      return 'Format audio tidak disokong. Sila pilih MP3, WAV, OGG atau M4A.';
    }
    if (file.size > AUDIO_MAX_BYTES) {
      return 'Saiz fail audio melebihi had maksimum 30 MB.';
    }
    return null;
  }
  return null;
}

function uploadFileToPath(
  file: File,
  storagePath: string,
  fallbackMime: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadedMediaResult> {
  if (!auth.currentUser) {
    return Promise.reject(
      new Error('Sesi pentadbir tidak aktif. Sila log masuk semula.')
    );
  }

  const storageRef = ref(storage, storagePath);
  const contentType = file.type || fallbackMime;
  const task = uploadBytesResumable(storageRef, file, {
    contentType,
    customMetadata: {
      uploadedBy: auth.currentUser.uid,
    },
  });

  onTaskCreated?.(task);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        const total = snapshot.totalBytes || file.size || 1;
        const percent = Math.min(
          100,
          Math.round((snapshot.bytesTransferred / total) * 100)
        );
        onProgress?.({
          percent,
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: total,
        });
      },
      (error) => {
        reject(new Error(translateStorageError(error)));
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            url,
            storagePath,
            mimeType: contentType,
            sizeBytes: file.size,
            fileName: file.name,
          });
        } catch (err) {
          reject(new Error(translateStorageError(err)));
        }
      }
    );
  });
}

export async function uploadNoteImage(
  file: File,
  topicId: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadedMediaResult> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const safeTopic = topicId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'umum';
  const path = `iknow_media/notes/${safeTopic}/images/${Date.now()}_${sanitizeFilename(file.name)}`;
  return uploadFileToPath(file, path, 'image/jpeg', onProgress, onTaskCreated);
}

export async function uploadNoteVideo(
  file: File,
  topicId: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadedMediaResult> {
  const validationError = validateVideoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const safeTopic = topicId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'umum';
  const ext = file.name.split('.').pop()?.toLowerCase();
  const fallbackMime = ext === 'webm' ? 'video/webm' : 'video/mp4';
  const path = `iknow_media/notes/${safeTopic}/videos/${Date.now()}_${sanitizeFilename(file.name)}`;
  return uploadFileToPath(file, path, fallbackMime, onProgress, onTaskCreated);
}

export async function uploadNoteAudio(
  file: File,
  topicId: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadedMediaResult> {
  const validationError = validateAudioFile(file);
  if (validationError) {
    throw new Error(validationError);
  }
  const safeTopic = topicId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'umum';
  const ext = file.name.split('.').pop()?.toLowerCase();
  const fallbackMime =
    ext === 'wav'
      ? 'audio/wav'
      : ext === 'ogg'
        ? 'audio/ogg'
        : ext === 'm4a'
          ? 'audio/mp4'
          : 'audio/mpeg';
  const path = `iknow_media/notes/${safeTopic}/audio/${Date.now()}_${sanitizeFilename(file.name)}`;
  return uploadFileToPath(file, path, fallbackMime, onProgress, onTaskCreated);
}

export async function uploadMaterialFile(
  file: File,
  materialType: Exclude<MaterialType, 'youtube'>,
  topicId: string,
  onProgress?: (info: UploadProgressInfo) => void,
  onTaskCreated?: (task: UploadTask) => void
): Promise<UploadedMediaResult> {
  const validationError = validateMaterialFile(file, materialType);
  if (validationError) {
    throw new Error(validationError);
  }
  const safeTopic = topicId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'umum';
  const fallbackMime =
    materialType === 'pdf'
      ? 'application/pdf'
      : materialType === 'image'
        ? 'image/jpeg'
        : materialType === 'audio'
          ? 'audio/mpeg'
          : 'video/mp4';
  const path = `iknow_media/materials/${safeTopic}/${materialType}/${Date.now()}_${sanitizeFilename(file.name)}`;
  return uploadFileToPath(file, path, fallbackMime, onProgress, onTaskCreated);
}

export async function deleteStorageFile(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as {code?: unknown}).code)
        : '';
    if (code === 'storage/object-not-found') {
      return;
    }
    console.warn('Gagal memadam fail daripada Firebase Storage:', err);
  }
}
