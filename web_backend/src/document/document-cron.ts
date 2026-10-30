import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { DocumentService } from './document.service';

@Injectable()
export class DocumentCronService {
  private readonly logger = new Logger(DocumentCronService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly documentService: DocumentService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createNewVersionOfDocuments() {
    this.logger.log('Starting document new version creation cron job at midnight');

    try {
      const affected = await this.documentService.createNewVersionOfDocuments();
      this.logger.log(`Created ${affected} new version(s) of document(s).`);
    } catch (error) {
      this.logger.error('Error in document new version creation cron job', error?.stack || error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireDocumentsPastDueDate() {
    this.logger.log('Starting document expiry check cron job at midnight');

    try {
      const affected = await this.documentService.expireDocumentsPastDueDate();
      this.logger.log(`Expired ${affected} document(s).`);
    } catch (error) {
      this.logger.error('Error in document expiry cron job', error?.stack || error);
    }
  }
}