import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs/promises";
import * as path from "path";
import { File } from "./file.entity";
import { FileService } from "./file-service.interface";

@Injectable()
export class LocalFileService implements FileService {
  private readonly logger = new Logger(LocalFileService.name);
  private readonly root: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(File) private readonly fileRepository: Repository<File>,
  ) {
    const configured = this.configService.get<string>("FILE_STORAGE_DIR");
    this.root = path.resolve(process.cwd(), configured || "storage");
  }

  async getSignedUrlForDownload(key: string): Promise<string> {
    const stored = await this.resolveStoredKey(key);
    const port = this.configService.get<string>("PORT") || "3004";
    const base =
      this.configService.get<string>("API_PUBLIC_URL") ||
      `http://localhost:${port}`;
    return `${base.replace(/\/$/, "")}/files/${encodeURIComponent(stored)}`;
  }

  async getFileBuffer(name: string): Promise<Buffer | null> {
    try {
      const stored = await this.resolveStoredKey(name);
      return await fs.readFile(this.resolvePath(stored));
    } catch (error) {
      this.logger.error("error getting file buffer", error);
      return null;
    }
  }

  async getStoredFileName(name: string): Promise<string> {
    const fileEntity = await this.fileRepository.findOne({
      where: { fileUrl: name },
    });
    return fileEntity?.fileName || name;
  }

  async getFile(name: string): Promise<string> {
    try {
      const stored = await this.resolveStoredKey(name);
      return await fs.readFile(this.resolvePath(stored), "utf8");
    } catch (error) {
      this.logger.error("error getting file", error);
      return "";
    }
  }

  async uploadFile(file: any, skipFileEntity: boolean = false) {
    const rand = uuidv4();
    const cleanFileName = String(file.originalname || "file").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const fileName = `${rand}_${cleanFileName}`;
    const destination = this.resolvePath(fileName);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, file.buffer);
    if (skipFileEntity) {
      return fileName;
    }
    try {
      await this.fileRepository.save({
        fileUrl: fileName,
        fileName: file.originalname,
      });
    } catch (error) {
      this.logger.error("Failed to create File entity after upload", error);
    }
    return fileName;
  }

  async deleteFile(name: string): Promise<void> {
    const stored = await this.resolveStoredKey(name);
    try {
      await fs.unlink(this.resolvePath(stored));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async openReadStream(key: string) {
    const stored = await this.resolveStoredKey(key);
    const filePath = this.resolvePath(stored);
    const stat = await fs.stat(filePath);
    const fileEntity = await this.fileRepository.findOne({
      where: { fileUrl: stored },
    });
    return {
      filePath,
      size: stat.size,
      downloadName: fileEntity?.fileName || path.basename(stored),
    };
  }

  private async resolveStoredKey(key: string): Promise<string> {
    const fileEntity = await this.fileRepository.findOne({
      where: { fileUrl: key },
    });
    return fileEntity?.fileUrl ?? key;
  }

  private resolvePath(key: string): string {
    const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalized || normalized.split("/").includes("..")) {
      throw new Error("Invalid file key");
    }
    const full = path.resolve(this.root, normalized);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("Invalid file key");
    }
    return full;
  }
}
