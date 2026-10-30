import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { createReadStream } from "fs";
import type { Response } from "express";
import { Public } from "../util/constants";
import { LocalFileService } from "./local-file.service";

@Controller("files")
export class FilesController {
  constructor(private readonly localFileService: LocalFileService) {}

  @Get(":key")
  @Public()
  async download(@Param("key") key: string, @Res() res: Response) {
    try {
      const file = await this.localFileService.openReadStream(
        decodeURIComponent(key),
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(file.downloadName)}"; filename*=UTF-8''${encodeURIComponent(file.downloadName)}`,
      );
      res.setHeader("Content-Length", String(file.size));
      createReadStream(file.filePath).pipe(res);
    } catch {
      throw new NotFoundException("File not found");
    }
  }
}
