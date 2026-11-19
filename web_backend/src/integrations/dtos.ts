import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  Allow,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateIntegrationDto {
  @ApiProperty({ description: "Name shown on the connections list." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

export class ConfigFieldDto {
  @ApiProperty({ description: "Config key. The program reads it with ctx.config.get." })
  @IsString()
  key: string;

  @ApiProperty({ description: "Label shown beside the field." })
  @IsString()
  label: string;

  @ApiProperty({ description: "Where the user finds this value. The page shows this sentence under the field." })
  @IsString()
  description: string;

  @ApiProperty()
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: "When true, the saved value is never returned to the agent." })
  @IsBoolean()
  secret: boolean;
}

export class StepLinkDto {
  @ApiProperty({ description: "Link text the user clicks." })
  @IsString()
  label: string;

  @ApiProperty({ description: "Third-party page where the user does this step." })
  @IsString()
  url: string;
}

export class StepCopyDto {
  @ApiProperty({
    enum: ["webhookUrl", "oauthRedirectUrl", "configKey"],
    description: "webhookUrl and oauthRedirectUrl are filled by the server. configKey copies a saved non-secret value.",
  })
  @IsIn(["webhookUrl", "oauthRedirectUrl", "configKey"])
  kind: "webhookUrl" | "oauthRedirectUrl" | "configKey";

  @ApiPropertyOptional({ description: "Required when kind is configKey." })
  @IsOptional()
  @IsString()
  key?: string;
}

export class SetupStepDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ description: "What the user does on this step, including where a value comes from." })
  @IsString()
  instruction: string;

  @ApiPropertyOptional({ type: StepLinkDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepLinkDto)
  link?: StepLinkDto;

  @ApiProperty({ type: [String], description: "Input keys collected on this step." })
  @IsArray()
  @IsString({ each: true })
  fields: string[];

  @ApiPropertyOptional({ type: StepCopyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StepCopyDto)
  copy?: StepCopyDto;

  @ApiProperty({
    enum: ["manual", "fields_saved"],
    description: "fields_saved finishes when the required fields are saved. manual waits for the user to mark it done.",
  })
  @IsIn(["manual", "fields_saved"])
  doneWhen: "manual" | "fields_saved";
}

export class CapabilitiesDto {
  @ApiProperty({ type: [String], description: "https origins the program may call with ctx.http." })
  @IsArray()
  @IsString({ each: true })
  outboundHosts: string[];

  @ApiProperty({ description: "Maximum outbound calls per minute for this connection." })
  @IsInt()
  @Min(1)
  maxPerMinute: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inboundPath?: string;

  @ApiPropertyOptional({ description: "Runs the exported onTick hook. Prefer schedule() in the program." })
  @IsOptional()
  @IsInt()
  @Min(30)
  tickEverySeconds?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  queueEvents?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  task?: boolean;
}

export class ProposeIntegrationDto {
  @ApiPropertyOptional({ type: [ConfigFieldDto], description: "Questions the user answers on the connection page." })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigFieldDto)
  inputs?: ConfigFieldDto[];

  @ApiPropertyOptional({ type: [SetupStepDto], description: "Ordered steps the user follows. A step collects its fields." })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetupStepDto)
  steps?: SetupStepDto[];

  @ApiPropertyOptional({ description: "Server program. Call route, schedule, and subscribe at the top level." })
  @IsOptional()
  @IsString()
  @MaxLength(65536)
  source?: string;

  @ApiPropertyOptional({ description: "HTML the user sees on the connection page." })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  html?: string;

  @ApiPropertyOptional({ description: "Page script. Use integration.api, integration.open, and integration.setStatus." })
  @IsOptional()
  @IsString()
  @MaxLength(200000)
  js?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CapabilitiesDto)
  capabilities?: CapabilitiesDto;
}

export class SaveValuesDto {
  @ApiProperty({
    type: "object",
    additionalProperties: { type: "string" },
    description: "Keys from the open step. Leave a saved secret blank to keep it. The agent does not send secret values.",
  })
  @IsObject()
  values: Record<string, string>;

  @ApiPropertyOptional({ description: "Step whose fields are being saved." })
  @IsOptional()
  @IsString()
  stepId?: string;
}

export class TryHookDto {
  @ApiProperty({ enum: ["onHttp", "onTick", "onMessage", "onStart", "onCall"] })
  @IsIn(["onHttp", "onTick", "onMessage", "onStart", "onCall"])
  hook: "onHttp" | "onTick" | "onMessage" | "onStart" | "onCall";

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  payload?: unknown;
}

export class SetStatusDto {
  @ApiProperty({ description: "Status text shown for this connection." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  status: string;
}

export class CallRouteDto {
  @ApiProperty({ description: "Path registered with route() in the server program, such as /webhook." })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({ enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] })
  @IsOptional()
  @IsIn(["GET", "POST", "PUT", "PATCH", "DELETE"])
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  body?: unknown;
}

export class RestoreRevisionDto {
  @ApiProperty({ format: "uuid", description: "An accepted revision to make current again." })
  @IsString()
  @IsNotEmpty()
  revisionId: string;
}
