import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IntegrationSummaryResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: "Text the connection program sets. The list shows this." })
  status: string;

  @ApiProperty()
  updatedAt: number;
}

export class IntegrationFieldResponseDto {
  @ApiProperty({ description: "Key the program reads with ctx.config.get." })
  key: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ description: "Tells the user where to copy this value from." })
  description: string;

  @ApiProperty()
  required: boolean;

  @ApiProperty()
  secret: boolean;

  @ApiProperty({ description: "True when a value is saved. Secret values are not returned." })
  filled: boolean;

  @ApiPropertyOptional({ description: "Omitted when the field is a secret." })
  value?: string;
}

export class IntegrationStepLinkResponseDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  url: string;
}

export class IntegrationStepCopyResponseDto {
  @ApiProperty({ enum: ["webhookUrl", "oauthRedirectUrl", "configKey"] })
  kind: "webhookUrl" | "oauthRedirectUrl" | "configKey";

  @ApiPropertyOptional()
  key?: string;
}

export class IntegrationStepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ description: "The sentence the user follows on this step." })
  instruction: string;

  @ApiPropertyOptional({ type: IntegrationStepLinkResponseDto, nullable: true })
  link: IntegrationStepLinkResponseDto | null;

  @ApiProperty({ type: [String] })
  fields: string[];

  @ApiProperty({ enum: ["manual", "fields_saved"] })
  doneWhen: "manual" | "fields_saved";

  @ApiPropertyOptional({ type: IntegrationStepCopyResponseDto, nullable: true })
  copy: IntegrationStepCopyResponseDto | null;

  @ApiPropertyOptional({ nullable: true, description: "Filled by the server for webhookUrl and oauthRedirectUrl." })
  copyValue: string | null;

  @ApiProperty()
  done: boolean;
}

export class IntegrationCapabilitiesResponseDto {
  @ApiProperty({ type: [String] })
  outboundHosts: string[];

  @ApiProperty()
  maxPerMinute: number;

  @ApiPropertyOptional()
  inboundPath?: string;

  @ApiPropertyOptional()
  tickEverySeconds?: number;

  @ApiPropertyOptional({ type: [String] })
  queueEvents?: string[];

  @ApiPropertyOptional()
  task?: boolean;
}

export class IntegrationFailureResponseDto {
  @ApiPropertyOptional({ format: "uuid" })
  id?: string;

  @ApiPropertyOptional({ format: "uuid" })
  revisionId?: string;

  @ApiProperty()
  hook: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  createdAt: number;
}

export class IntegrationDetailResponseDto {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  revisionId: string | null;

  @ApiPropertyOptional({ format: "uuid", nullable: true })
  acceptedRevisionId: string | null;

  @ApiProperty({ description: "Server program. It calls route, schedule, and subscribe." })
  source: string;

  @ApiProperty({ description: "Page the user sees on this connection." })
  pageHtml: string;

  @ApiProperty({ description: "Script for that page. It uses integration.api, integration.open, and integration.setStatus." })
  pageJs: string;

  @ApiProperty({ description: "Prefix for inbound calls. A route path is appended to it." })
  hookBase: string;

  @ApiProperty({ type: IntegrationCapabilitiesResponseDto })
  capabilities: IntegrationCapabilitiesResponseDto;

  @ApiProperty({ type: [IntegrationFieldResponseDto] })
  inputs: IntegrationFieldResponseDto[];

  @ApiProperty({ type: [IntegrationStepResponseDto] })
  steps: IntegrationStepResponseDto[];

  @ApiProperty({ type: [String], description: "Input keys that are not collected by a step." })
  otherKeys: string[];

  @ApiProperty({ type: [String], description: "Required keys that still have no value." })
  missing: string[];

  @ApiPropertyOptional({ type: IntegrationFailureResponseDto, nullable: true })
  latestFailure: IntegrationFailureResponseDto | null;

  @ApiProperty()
  updatedAt: number;
}

export class IntegrationErrorResponseDto {
  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ type: [String] })
  missing?: string[];
}
