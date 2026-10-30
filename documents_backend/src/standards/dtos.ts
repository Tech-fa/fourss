import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from "class-validator";
import { ImplementationDocumentStatus } from "./standards.enums";
import { STANDARD_KEYS } from "./standards.config";

export class CreateImplementationDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(STANDARD_KEYS)
  standardKey: string;
}

export class UpdateImplementationDocumentDto {
  @IsOptional()
  @IsEnum(ImplementationDocumentStatus)
  status?: ImplementationDocumentStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Type(() => String)
  linkedDocumentId?: string | null;
}
