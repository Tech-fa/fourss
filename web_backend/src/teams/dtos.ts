import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TeamMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Type(() => Number)
  roleId: number;
}

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamMemberDto)
  members?: TeamMemberDto[];
}

export interface TeamModuleCountsDto {
  team: {
    id: number;
    name: string;
  };
  counts: {
    documents: number;
    risks: number;
    audits: number;
    trainings: number;
    kpis: number;
    nonConformities: number;
  };
}
