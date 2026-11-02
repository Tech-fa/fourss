import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { hasPermission } from "../authentication/permission.decorator";
import { PermissionEnum, standardsPermission } from "../permissions/permissions";
import { Public } from "../util/constants";
import { formatResponse } from "../util/helper-util";
import { CreateImplementationShareDto, OpenShareCodeDto } from "./dtos";
import { StandardShareService } from "./standard-share.service";

@ApiTags("Standards")
@Controller("standards")
export class StandardShareController {
  private readonly logger = new Logger(StandardShareController.name);

  constructor(private readonly shareService: StandardShareService) {}

  @Post("implementations/:id/shares")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Email a read-only link to an implementation list." })
  @hasPermission({
    subject: standardsPermission.subject,
    actions: [PermissionEnum.UPDATE],
  })
  async createShare(
    @Param("id") id: string,
    @Body() dto: CreateImplementationShareDto,
    @Req() req,
    @Res() res: Response,
  ) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.createShare(Number(id), dto.email, req.user.id),
      res,
      "Standard implementation share created",
    );
  }

  @Post("shares/open")
  @Public()
  @ApiOperation({ summary: "Open a read-only implementation list from a share code." })
  async openList(@Body() dto: OpenShareCodeDto, @Res() res: Response) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.openList(dto.code),
      res,
      "Open shared standard list",
    );
  }

  @Post("shares/documents/open")
  @Public()
  @ApiOperation({ summary: "Open one shared document from its share code." })
  async openDocument(@Body() dto: OpenShareCodeDto, @Res() res: Response) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.openDocument(dto.code),
      res,
      "Open shared standard document",
    );
  }

  @Get("shares/sessions/:sessionId/material/:index")
  @Public()
  @ApiOperation({ summary: "Read one encrypted half of a shared document chunk." })
  async material(
    @Param("sessionId") sessionId: string,
    @Param("index") index: string,
    @Res() res: Response,
  ) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.readPart(sessionId, index, "material"),
      res,
      "Read shared document part",
    );
  }

  @Get("shares/sessions/:sessionId/cover/:index")
  @Public()
  @ApiOperation({ summary: "Read the other encrypted half of a shared document chunk." })
  async cover(
    @Param("sessionId") sessionId: string,
    @Param("index") index: string,
    @Res() res: Response,
  ) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.readPart(sessionId, index, "cover"),
      res,
      "Read shared document cover",
    );
  }

  @Get("shares/sessions/:sessionId/keys/:index")
  @Public()
  @ApiOperation({
    summary: "Release chunk keys after both halves have been fetched.",
  })
  async keys(
    @Param("sessionId") sessionId: string,
    @Param("index") index: string,
    @Res() res: Response,
  ) {
    this.noStore(res);
    return formatResponse(
      this.logger,
      this.shareService.readKeys(sessionId, index),
      res,
      "Read shared document keys",
    );
  }

  private noStore(res: Response) {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Content-Disposition", "inline");
  }
}
