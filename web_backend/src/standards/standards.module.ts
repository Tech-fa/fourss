import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Document } from "../document/document.entity";
import { StandardImplementationDocument } from "./standard-implementation-document.entity";
import { StandardImplementation } from "./standard-implementation.entity";
import { StandardsController } from "./standards.controller";
import { StandardsService } from "./standards.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StandardImplementation,
      StandardImplementationDocument,
      Document,
    ]),
  ],
  controllers: [StandardsController],
  providers: [StandardsService],
  exports: [StandardsService],
})
export class StandardsModule {}
