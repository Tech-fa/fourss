import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { DocumentService } from './document.service';
export declare class DocumentCronService {
    private readonly documentRepository;
    private readonly documentService;
    private readonly logger;
    constructor(documentRepository: Repository<Document>, documentService: DocumentService);
    createNewVersionOfDocuments(): Promise<void>;
    expireDocumentsPastDueDate(): Promise<void>;
}
