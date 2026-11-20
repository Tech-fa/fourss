import { Injectable } from "@nestjs/common";
import { assertFileSize, bytesFromProgram, contentTypeFor } from "./file-bytes";
import { extractStoredFileText, StoredFileText } from "./file-text";
import { LocalFileService } from "./local-file.service";

export type SavedConnectionFile = {
  fileId: string;
  name: string;
  size: number;
  contentType: string;
  url: string;
};

@Injectable()
export class ConnectionFileService {
  constructor(private readonly files: LocalFileService) {}

  async save(bytes: unknown, name: string, contentType?: string): Promise<SavedConnectionFile> {
    const cleanName = String(name || "").trim();
    if (!cleanName) throw new Error("Give the file a name.");
    const buffer = bytesFromProgram(bytes);
    assertFileSize(buffer);
    return this.files.saveBytes(cleanName, buffer, contentTypeFor(cleanName, contentType));
  }

  async extract(fileId: string): Promise<StoredFileText> {
    const id = String(fileId || "").trim();
    if (!id) throw new Error("Give the file id.");
    const stored = await this.files.readStored(id);
    if (!stored) throw new Error("That file was not found.");
    return extractStoredFileText(stored.buffer, stored.name, stored.contentType);
  }
}
