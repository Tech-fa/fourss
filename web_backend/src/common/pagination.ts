import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  perPage: number = 10;
}

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  currentPage: number;
  totalCount: number;
  perPage: number;
}

export class IdReferenceDTO {
  @ApiProperty({ oneOf: [{ type: 'number' }, { type: 'string' }] })
  @IsNotEmpty()
  id: number | string;
}
