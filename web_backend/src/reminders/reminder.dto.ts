import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum ReminderDirectionDto {
  BEFORE = 'before',
  AFTER = 'after',
}

export class SaveReminderRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sourceKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  anchorKey: string;

  @ApiProperty({ minimum: 0, maximum: 365 })
  @IsInt()
  @Min(0)
  @Max(365)
  offsetDays: number;

  @ApiProperty({ enum: ReminderDirectionDto })
  @IsEnum(ReminderDirectionDto)
  direction: ReminderDirectionDto;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipientKeys: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  statusKeys: string[];

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
