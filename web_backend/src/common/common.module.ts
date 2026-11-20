import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { File } from './file.entity';
import { FilesController } from './files.controller';
import { ConnectionFileService } from './connection-file.service';
import { LocalFileService } from './local-file.service';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FilesController],
  providers: [LocalFileService, ConnectionFileService, EmailService],
  exports: [LocalFileService, ConnectionFileService, EmailService],
})
export class CommonModule {}
