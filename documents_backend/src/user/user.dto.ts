import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class UserRoleAssignmentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  roleId: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  teamIds?: number[];
}

export class UserDTO {
  @ApiPropertyOptional({ format: "uuid" })
  @IsOptional()
  @IsUUID("4")
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTopManagement?: boolean;

  @ApiPropertyOptional({ type: [UserRoleAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserRoleAssignmentDto)
  roles?: UserRoleAssignmentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  roleId?: number;
}

export class UserSearchQueryDto {
  @ApiPropertyOptional({ description: "Matches first name, last name, or full name." })
  @IsOptional()
  @IsString()
  name?: string;
}

export class UserIdParamDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  @IsNotEmpty()
  id: string;
}

export class UserActionParamDto extends UserIdParamDto {
  @ApiProperty({ enum: ["activate", "inactive"] })
  @IsIn(["activate", "inactive"])
  @IsNotEmpty()
  action: string;
}

export class UpdateLocaleRequestDto {
  @ApiProperty({ example: "en" })
  @IsString()
  @IsNotEmpty()
  locale: string;
}

export class UpdateMyUserRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lname: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class UserIdResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;
}

export class UserSearchResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  isTopManagement?: boolean;

  @ApiPropertyOptional()
  interestedPartyId?: string;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty()
  failedLogins: number;

  @ApiPropertyOptional()
  verifiedAt?: number;
}

export class UserProfileResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiPropertyOptional()
  phone?: string;
}

export class UserCreatedByResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;
}

export class UserDetailResponseDto extends UserSearchResponseDto {
  @ApiPropertyOptional({ type: UserCreatedByResponseDto })
  createdBy?: UserCreatedByResponseDto;
}

export class UpdateUserDTO extends UserDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  active: boolean;
}
export class BaseUserDTO {
  @IsUUID("4")
  id: string;
  @IsString()
  @IsNotEmpty()
  fname: string;
  @IsString()
  @IsNotEmpty()
  lname: string;
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class RegisterDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fname: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lname: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  companyName: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyBackground?: string;
  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  skipEmail: boolean;
}

export class VerifyRegistrationDTO {
  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class CompetencyCertificationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  periodDays?: number | null;
}

const parseJsonIfString = ({ value }: { value: unknown }) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

export class UserCompetencyCertificationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  id?: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  competencyCertificationId: number;

  /** Epoch millis for the certification issue date. */
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  issuedAt: number;
}

export class UserCompetencyCertificationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  competencyCertificationId: number;

  @ApiProperty()
  fileUrl: string;

  @ApiProperty()
  uploadedAt: number;

  @ApiProperty()
  issuedAt: number;

  @ApiPropertyOptional({ type: CompetencyCertificationResponseDto })
  competencyCertification?: CompetencyCertificationResponseDto;
}

export class CreateUserCompetencyDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  competencyId: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  competencyLevelId: number;

  /** Epoch millis for when the user entered this competency level. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  inCompetencySince?: number | null;

  @Transform(parseJsonIfString)
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserCompetencyCertificationDto)
  certifications?: UserCompetencyCertificationDto[];
}

export class UpdateUserCompetencyDto {
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  competencyLevelId: number;

  @Transform(parseJsonIfString)
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserCompetencyCertificationDto)
  certifications?: UserCompetencyCertificationDto[];
}

export class UserCompetencySummaryDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class UserCompetencyLevelResponseDto extends UserCompetencySummaryDto {
  @ApiProperty()
  order: number;

  @ApiPropertyOptional({ nullable: true })
  duration?: number | null;

  @ApiPropertyOptional({ type: [CompetencyCertificationResponseDto] })
  certifications?: CompetencyCertificationResponseDto[];
}

export class UserCompetencyResponseDto {
  @ApiProperty()
  id: number;

  @ApiPropertyOptional({ nullable: true })
  inCompetencySince?: number | null;

  @ApiPropertyOptional({ type: [UserCompetencyCertificationResponseDto] })
  certifications?: UserCompetencyCertificationResponseDto[];

  @ApiProperty({ type: UserCompetencySummaryDto })
  competency: UserCompetencySummaryDto;

  @ApiProperty({ type: UserCompetencyLevelResponseDto })
  competencyLevel: UserCompetencyLevelResponseDto;
}

export class CompetencyUserAssignmentDto {
  id: number;
  inCompetencySince?: number | null;
  certifications?: UserCompetencyCertificationResponseDto[];
  user: {
    id: string;
    fname: string;
    lname: string;
    email: string;
  };
  competencyLevel: {
    id: number;
    name: string;
    description: string;
    order: number;
    duration?: number | null;
    certifications?: CompetencyCertificationResponseDto[];
  };
}
