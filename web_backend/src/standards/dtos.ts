import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
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

export class CreateImplementationDocumentDto {
  @ApiProperty({
    description:
      "Clause number or control number to track. Free text, for example 7.5 or A.5.1.",
    maxLength: 128,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  clause: string;

  @ApiPropertyOptional({
    description: "Optional label. Defaults to the clause or control number.",
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ enum: RequiredDocumentKind })
  @IsOptional()
  @IsEnum(RequiredDocumentKind)
  kind?: RequiredDocumentKind;
}

export class UpdateImplementationDocumentDto {
  @ApiPropertyOptional({ enum: ImplementationDocumentStatus })
  @IsOptional()
  @IsEnum(ImplementationDocumentStatus)
  status?: ImplementationDocumentStatus;

  @ApiPropertyOptional({
    description: "Clause or control number. Only applied to a row you added.",
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clause?: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    format: "uuid",
    nullable: true,
    description:
      "Replaces every link with this one document. Send null to clear links. Prefer linkedDocumentIds when linking more than one document.",
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Type(() => String)
  linkedDocumentId?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      "Documents to link to this clause or control. Replaces the current links. Send an empty array to clear them. The agent can set every link in one call.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  linkedDocumentIds?: string[];
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

  @ApiProperty({
    description: "Clause number or control number.",
  })
  clause: string;

  @ApiProperty({
    description: "True when this row was added to track an extra clause or control.",
  })
  custom: boolean;

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

  @ApiProperty({ type: [LinkedDocumentSummaryResponseDto] })
  linkedDocuments: LinkedDocumentSummaryResponseDto[];

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
