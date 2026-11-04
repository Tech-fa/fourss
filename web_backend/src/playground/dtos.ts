import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export const ENTITY_TYPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export class CreatePlaygroundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @Type(() => Number)
  @IsInt()
  teamId: number;
}

export class PutSourceDto {
  @IsString()
  @MaxLength(262144)
  source: string;
}

export class SetEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

export class TeamQueryDto {
  @Type(() => Number)
  @IsInt()
  teamId: number;
}

export class RefDto {
  @IsString()
  @Matches(ENTITY_TYPE_PATTERN)
  entityType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityId: string;
}

export class PlaygroundPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  documentId?: string;
}

export class CreateRecordDto {
  @IsString()
  @Matches(ENTITY_TYPE_PATTERN)
  entityType: string;

  @IsObject()
  data: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RefDto)
  refs?: RefDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaygroundPageDto)
  page?: PlaygroundPageDto;
}

export class ListQueryDto {
  @IsString()
  @Matches(ENTITY_TYPE_PATTERN)
  entityType: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cursor?: string;
}

export class ResolveQueryDto {
  @IsString()
  @Matches(ENTITY_TYPE_PATTERN)
  entityType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  entityId: string;
}
