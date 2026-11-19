import {
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ImmediateActionStatus } from './immediate-action.entity';

export class UpdateImmediateActionStatusDto {
  @ApiProperty({ enum: ImmediateActionStatus })
  @IsEnum(ImmediateActionStatus)
  @IsNotEmpty()
  status: ImmediateActionStatus;
}

export class CreateImmediateActionCommentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text: string;
}
