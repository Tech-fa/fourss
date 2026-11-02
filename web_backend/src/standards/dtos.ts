import { Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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
