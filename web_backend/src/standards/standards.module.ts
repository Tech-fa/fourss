import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CommonModule } from "../common/common.module";
import { DocumentContributor } from "../document/document-contributor.entity";
import { DocumentChecklist } from "../document/document-checklist.entity";
import { DocumentChecklistQuestion } from "../document/document-checklist-question.entity";
import { DocumentVersion } from "../document/document-version.entity";
import { Document } from "../document/document.entity";
import { StandardImplementationDocument } from "./standard-implementation-document.entity";
import { StandardImplementationShare } from "./standard-implementation-share.entity";
import { StandardImplementation } from "./standard-implementation.entity";
import { StandardShareController } from "./standard-share.controller";
import { StandardShareService } from "./standard-share.service";
import { StandardsController } from "./standards.controller";
import { StandardsService } from "./standards.service";

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      StandardImplementation,
      StandardImplementationDocument,
      StandardImplementationShare,
      Document,
      DocumentVersion,
      DocumentContributor,
      DocumentChecklist,
      DocumentChecklistQuestion,
    ]),
  ],
  controllers: [StandardsController, StandardShareController],
  providers: [StandardsService, StandardShareService],
  exports: [StandardsService],
})
export class StandardsModule {}
