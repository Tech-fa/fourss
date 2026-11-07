import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
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

export class QueryOrderDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)?$/)
  field: string;

  @IsIn(["ASC", "DESC"])
  direction: "ASC" | "DESC";
}

export class QueryFilterDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)?$/)
  field: string;

  @IsIn(["eq", "neq", "in", "gt", "gte", "lt", "lte", "isNull", "isNotNull"])
  op: "eq" | "neq" | "in" | "gt" | "gte" | "lt" | "lte" | "isNull" | "isNotNull";

  @Allow()
  value?: unknown;
}

export class ReadQueryDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  entity: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  select?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QueryFilterDto)
  where?: QueryFilterDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  relations?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => QueryOrderDto)
  orderBy?: QueryOrderDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  offset?: number;
}

export class PutAppFileDto {
  @IsString()
  @MaxLength(262144)
  text: string;
}

export class SqlDto {
  @IsString()
  @MaxLength(10000)
  statement: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  params?: unknown[];
}

export class CallDto {
  @IsOptional()
  @Allow()
  argument?: unknown;
}

export class PlaygroundFetchDto {
  @IsString()
  @MaxLength(2048)
  path: string;

  @IsOptional()
  @IsIn(["GET", "POST", "PUT", "PATCH", "DELETE"])
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  @IsOptional()
  @Allow()
  body?: unknown;
}

export class PlaygroundFileQueryDto {
  @IsString()
  @MaxLength(1100)
  name: string;
}

export class PlaygroundFileDto {
  @IsString()
  @MaxLength(1100)
  name: string;
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

  