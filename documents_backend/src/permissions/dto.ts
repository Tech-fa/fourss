import {
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionDTO {
  @IsString()
  subject: string;

  @IsString()
  action: string;

  @IsOptional()
  teamIds: number[];
}

export class PermissionsDTO {
  @IsString()
  subject: string;

  @IsString()
  action: string;
}
export class SetPermissionDTO {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions: PermissionDTO[];
}
export class RoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDTO)
  permissions: PermissionDTO[];

  @IsString()
  @IsOptional()
  description: string;
}

export class AttachRolesToUser {
  @IsArray()
  teamIds: number[];

  @IsNumber()
  @IsNotEmpty()
  roleId: number;
}

export class AttachRolesToUserDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachRolesToUser)
  roles: AttachRolesToUser[];
}

export class DetachRolesFromUserDto {
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds: number[];
}
export const CACHE_PREFIX = 'permissions';
export interface UserRequest {
  id: string;
  username: string;
  teamIds: number[];
}
