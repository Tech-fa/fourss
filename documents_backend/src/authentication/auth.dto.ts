import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsInt, IsNotEmpty, IsString } from "class-validator";

export class LoginRequestDto {
  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: "en" })
  @IsString()
  @IsNotEmpty()
  locale: string;
}

export class EmailQueryDto {
  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetCodeQueryDto {
  @ApiProperty({ description: "Code from the reset email." })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ActivateRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ format: "email" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthPermissionDto {
  @ApiProperty()
  subject: string;

  @ApiProperty()
  action: string;
}

export class AuthTeamDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  name: string;
}

export class AuthUserResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  locale: string;

  @ApiProperty()
  fname: string;

  @ApiProperty()
  lname: string;

  @ApiProperty({ format: "email" })
  email: string;

  @ApiProperty()
  isTopManagement: boolean;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty({ type: [AuthPermissionDto] })
  permissions: AuthPermissionDto[];

  @ApiProperty({ type: [AuthTeamDto] })
  teams: AuthTeamDto[];
}

export class AuthSessionResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;
}

export class CatalogErrorResponseDto {
  @ApiProperty({ example: "AUTH_002" })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: "invalid user email" })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: { type: "string" },
  })
  params?: Record<string, string>;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ example: 401 })
  @IsInt()
  statusCode: number;

  @ApiProperty({ example: "Unauthorized" })
  @IsString()
  @IsNotEmpty()
  message: string;
}

/** Success body is a raw string (`done` or `needs registration`), not an object. */
export const authTextResponseSchema = {
  type: "string",
  example: "done",
  enum: ["done", "needs registration"],
};
