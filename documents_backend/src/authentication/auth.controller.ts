import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { Public } from "../util/constants";
import { LocalAuthGuard } from "./local-auth.gard";
import { RegisterDTO, VerifyRegistrationDTO } from "../user/user.dto";
import { formatResponse } from "../util/helper-util";
import { PermissionService } from "../permissions/permission.service";
import {
  ActivateRequestDto,
  AuthSessionResponseDto,
  authTextResponseSchema,
  CatalogErrorResponseDto,
  EmailQueryDto,
  LoginRequestDto,
  ResetCodeQueryDto,
  ResetPasswordRequestDto,
  UnauthorizedResponseDto,
} from "./auth.dto";

@ApiTags("Authentication")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
  ) {}

  private readonly logger = new Logger(AuthController.name);

  @UseGuards(LocalAuthGuard)
  @Public()
  @Post("login")
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary:
      "Sign in with email and password. Application UI only; omitted from the public API.",
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ description: "Signed-in session.", type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({
    description: "Email or password is wrong.",
    type: UnauthorizedResponseDto,
  })
  async login(
    @Request() req,
    @Response() res,
    @Body() body: LoginRequestDto,
  ) {
    return formatResponse(
      this.logger,
      this.authService.login(req.user, body.locale),
      res,
      `trying to login by user ${req.user.email}`,
    );
  }

  @Post("renew")
  @ApiOperation({
    summary: "Issue a fresh access token for the signed-in user.",
  })
  @ApiOkResponse({ description: "New session.", type: AuthSessionResponseDto })
  @ApiUnauthorizedResponse({
    description: "Missing or invalid bearer token.",
    type: UnauthorizedResponseDto,
  })
  async renew(@Request() req, @Response() res) {
    return formatResponse(
      this.logger,
      this.authService.renewToken(req.user),
      res,
      `renewing token for user ${req.user.email}`,
    );
  }

  @Public()
  @Post("register")
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary:
      "Register an organization owner. Application UI only; omitted from the public API.",
  })
  @ApiBody({ type: RegisterDTO })
  @ApiBadRequestResponse({
    description: "Registration is not accepted. Body is CatalogErrorResponseDto (AUTH_002).",
    type: CatalogErrorResponseDto,
  })
  async registerV2(@Body() user: RegisterDTO, @Response() res) {
    return formatResponse(
      this.logger,
      this.authService.register(user),
      res,
      `new user registering with their email`,
    );
  }

  @Public()
  @Post("register/verify")
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: "Confirm a registration code. Application UI only.",
  })
  @ApiBody({ type: VerifyRegistrationDTO })
  @ApiOkResponse({ schema: authTextResponseSchema })
  @ApiBadRequestResponse({
    description: "Unknown account, already verified, or bad code (AUTH_003 or AUTH_002 or AUTH_004).",
    type: CatalogErrorResponseDto,
  })
  async verifyRegistration(
    @Body() payload: VerifyRegistrationDTO,
    @Response() res,
  ) {
    return formatResponse(
      this.logger,
      this.authService.verifyRegistration(payload),
      res,
      `verifying registration for ${payload.email}`,
    );
  }

  @Public()
  @Get("register/code")
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: "Email a new registration code. Application UI only.",
  })
  @ApiOkResponse({ schema: authTextResponseSchema })
  @ApiBadRequestResponse({
    description: "Missing email, unknown account, or already verified (AUTH_002 or AUTH_004).",
    type: CatalogErrorResponseDto,
  })
  async resendRegistrationCode(
    @Query() params: EmailQueryDto,
    @Response() res,
  ) {
    return formatResponse(
      this.logger,
      this.authService.resendRegistrationCode(params.email),
      res,
      `resending registration code for ${params.email}`,
    );
  }

  @Get("code")
  @ApiOperation({ summary: "Email a password reset code." })
  @ApiOkResponse({
    description: "`done`, or `needs registration` when the account was invited.",
    schema: authTextResponseSchema,
  })
  @ApiBadRequestResponse({
    description: "No active user for that email (AUTH_002).",
    type: CatalogErrorResponseDto,
  })
  @Public()
  async createReset(
    @Request() req,
    @Response() res,
    @Query() params: EmailQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.authService.createCodeForReset(params.email),
      res,
      `creating reset request for user ${params.email}`,
    );
  }

  @Get("activation")
  @ApiOperation({ summary: "Email an activation link for an inactive user." })
  @ApiOkResponse({ schema: authTextResponseSchema })
  @ApiBadRequestResponse({
    description: "No inactive user for that email (AUTH_002).",
    type: CatalogErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Missing or invalid bearer token.",
    type: UnauthorizedResponseDto,
  })
  async createActivation(
    @Request() req,
    @Response() res,
    @Query() params: EmailQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.authService.createCodeForActivation(params.email, req.user),
      res,
      `creating activation request for user ${params.email}`,
    );
  }

  @Post("password/reset")
  @ApiOperation({ summary: "Set a new password using a reset code." })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiOkResponse({ schema: authTextResponseSchema })
  @ApiBadRequestResponse({
    description: "Code is missing, wrong, or expired (AUTH_003).",
    type: CatalogErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "No user for that email (USER_001).",
    type: CatalogErrorResponseDto,
  })
  @Public()
  async resetPassword(
    @Request() req,
    @Response() res,
    @Body() paylod: ResetPasswordRequestDto,
    @Query() query: ResetCodeQueryDto,
  ) {
    return formatResponse(
      this.logger,
      this.authService.resetPassword(paylod, query.code),
      res,
      `resetting password for user ${paylod.email}`,
    );
  }
  @Post("activate")
  @ApiOperation({ summary: "Activate an invited user and set their password." })
  @ApiBody({ type: ActivateRequestDto })
  @ApiOkResponse({ description: "User activated. Response body is empty." })
  @ApiBadRequestResponse({
    description: "Activation code is missing, wrong, or expired (AUTH_003).",
    type: CatalogErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "No user for that email (USER_001).",
    type: CatalogErrorResponseDto,
  })
  @Public()
  async activate(
    @Request() req,
    @Response() res,
    @Body() paylod: ActivateRequestDto,
  ) {
    return formatResponse(
      this.logger,
      this.authService.activate(paylod),
      res,
      `activating user ${paylod.email}`,
    );
  }
}
