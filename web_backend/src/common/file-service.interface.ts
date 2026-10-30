export interface FileService {
  uploadFile(file: any, skipFileEntity?: boolean): Promise<string>;
  getFile(name: string): Promise<string>;
  getFileBuffer(name: string): Promise<Buffer | null>;
  getStoredFileName(name: string): Promise<string>;
  deleteFile(name: string): Promise<void>;
  getSignedUrlForDownload(fileKey: string): Promise<string>;
}
