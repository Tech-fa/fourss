import { BadRequestException, Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { createReadStream } from "fs";
import type { Response } from "express";
import { hasPermission } from "../authentication/permission.decorator";
import { integrationsPermission } from "../permissions/permissions";
import { Public } from "../util/constants";
import { ConnectionFileService } from "./connection-file.service";
import { LocalFileService } from "./local-file.service";

class FileTextResponseDto {
  @ApiProperty()
  text: string;

  @ApiProperty({ enum: ["extracted", "ocr"], description: "ocr means the text was read from a picture and a person should check it." })
  source: "extracted" | "ocr";

  @ApiPropertyOptional({ description: "OCR confidence from 0 to 100, when source is ocr." })
  confidence?: number;

  @ApiPropertyOptional({ description: "Page count, when the file is a pdf." })
  pages?: number;
}

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(
    private readonly localFileService: LocalFileService,
    private readonly connectionFiles: ConnectionFileService,
  ) {}

  @Get(":id/text")
  @ApiOperation({
    summary: "Read the text of a stored file.",
    description: "fileId comes from ctx.save. source is extracted for text, csv, json, docx, and pdf. source is ocr for a png or jpeg.",
  })
  @ApiOkResponse({ type: FileTextResponseDto })
  @hasPermission({ subject: integrationsPermission.subject, actions: ["read"] })
  async text(@Param("id") id: string) {
    try {
      return await this.connectionFiles.extract(decodeURIComponent(id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "That file could not be read.";
      if (message === "That file was not found.") throw new NotFoundException({ message });
      throw new BadRequestException({ message });
    }
  }

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
