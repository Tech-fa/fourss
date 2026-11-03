import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ImplementationDocumentStatus,
  ImplementationStatus,
  RequiredDocumentKind,
} from "./standards.enums";
import { STANDARD_KEYS } from "./standards.config";

export class CreateImplementationDto {
  @ApiProperty({ enum: STANDARD_KEYS, example: "iso-9001-2015" })
  @IsString()
  @IsNotEmpty()
  @IsIn(STANDARD_KEYS)
  standardKey: string;
}

export class UpdateImplementationDocumentDto {
  @ApiPropertyOptional({ enum: ImplementationDocumentStatus })
  @IsOptional()
  @IsEnum(ImplementationDocumentStatus)
  status?: ImplementationDocumentStatus;

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description: "Document to link. Send null to clear the link.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Type(() => String)
  linkedDocumentId?: string | null;
}

export class ImplementationIdParamDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  id: number;
}

export class ImplementationDocumentParamDto extends ImplementationIdParamDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  documentId: number;
}

export class RequiredDocumentResponseDto {
  @ApiProperty()
  key: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  clause: string;

  @ApiProperty({ enum: RequiredDocumentKind })
  kind: RequiredDocumentKind;

  @ApiProperty()
  description: string;
}

export class StandardImplementationSummaryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: ImplementationStatus })
  status: ImplementationStatus;

  @ApiProperty()
  completedCount: number;

  @ApiProperty()
  totalCount: number;
}

export class StandardListItemResponseDto {
  @ApiProperty({ enum: STANDARD_KEYS })
  key: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  shortName: string;

  @ApiProperty()
  year: number;

  @ApiProperty()
  family: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [RequiredDocumentResponseDto] })
  requiredDocuments: RequiredDocumentResponseDto[];

  @ApiProperty({
    type: StandardImplementationSummaryResponseDto,
    nullable: true,
  })
  implementation: StandardImplementationSummaryResponseDto | null;
}

export class LinkedDocumentSummaryResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  documentCode: string;
}

export class ImplementationCreatedByResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;
}

export class ImplementationDocumentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  documentKey: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  clause: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: RequiredDocumentKind })
  kind: RequiredDocumentKind;

  @ApiProperty({ enum: ImplementationDocumentStatus })
  status: ImplementationDocumentStatus;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: LinkedDocumentSummaryResponseDto, nullable: true })
  linkedDocument: LinkedDocumentSummaryResponseDto | null;

  @ApiProperty({ description: "Unix epoch milliseconds." })
  updatedAt: number;
}

export class ImplementationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: STANDARD_KEYS })
  standardKey: string;

  @ApiProperty()
  standardName: string;

  @ApiProperty({ enum: ImplementationStatus })
  status: ImplementationStatus;

  @ApiProperty({ description: "Unix epoch milliseconds." })
  createdAt: number;

  @ApiProperty({ description: "Unix epoch milliseconds." })
  updatedAt: number;

  @ApiProperty({ type: ImplementationCreatedByResponseDto, nullable: true })
  createdBy: ImplementationCreatedByResponseDto | null;

  @ApiProperty()
  completedCount: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty({ type: [ImplementationDocumentResponseDto] })
  documents: ImplementationDocumentResponseDto[];
}

export class CreateImplementationShareDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(320)
  email: string;
}

export class OpenShareCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  code: string;
}
