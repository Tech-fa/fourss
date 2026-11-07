import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { catalogHttpError } from "../common/errors/catalog-http-error";

export const PLAYGROUND_ERROR_MAP = {
  PG_001: { message: "You do not have access to this team" },
  PG_002: { message: "Playground not found" },
  PG_004: { message: "This name is reserved for an existing record kind" },
  PG_005: { message: "The record kind is not valid" },
  PG_006: { message: "The linked record was not found" },
  PG_007: { message: "The playground program is too long" },
  PG_008: { message: "Record data must be a flat object of simple values" },
  PG_009: { message: "A record can have at most 20 links" },
  PG_010: { message: "The playground program has no handle function" },
  PG_011: { message: "The playground program took too long" },
  PG_012: { message: "The playground is busy. Try again." },
  PG_013: { message: "The playground stayed busy too long. Try again." },
  PG_014: { message: "The playground program failed" },
  PG_015: { message: "The playground runtime tried to run a second program" },
  PG_016: { message: "A playground cannot save over an existing record kind" },
  PG_017: { message: "Playground record not found" },
  PG_018: { message: "This playground is turned off" },
  PG_019: { message: "The playground runtime is not installed" },
  PG_020: { message: "That entity is not available" },
  PG_021: { message: "That entity cannot be queried because its rows are not limited to a team" },
  PG_022: { message: "That query is not valid" },
  PG_023: { message: "That statement is not allowed" },
  PG_024: { message: "That function was not found" },
  PG_025: { message: "That file is not available" },
  PG_026: { message: "That result is too large" },
  PG_027: { message: "That endpoint is not on this app" },
  PG_028: { message: "That route was not found" },
  PG_029: { message: "That route is not valid" },
} as const;

export type PlaygroundErrorCode = keyof typeof PLAYGROUND_ERROR_MAP;

export function playgroundHttpError(
  code: PlaygroundErrorCode,
  options?: { message?: string },
) {
  return catalogHttpError(PLAYGROUND_ERROR_MAP, code, options);
}

const STATUS: Record<PlaygroundErrorCode, number> = {
  PG_001: HttpStatus.BAD_REQUEST,
  PG_002: HttpStatus.NOT_FOUND,
  PG_004: HttpStatus.BAD_REQUEST,
  PG_005: HttpStatus.BAD_REQUEST,
  PG_006: HttpStatus.NOT_FOUND,
  PG_007: HttpStatus.BAD_REQUEST,
  PG_008: HttpStatus.BAD_REQUEST,
  PG_009: HttpStatus.BAD_REQUEST,
  PG_010: HttpStatus.BAD_REQUEST,
  PG_011: HttpStatus.BAD_REQUEST,
  PG_012: HttpStatus.TOO_MANY_REQUESTS,
  PG_013: HttpStatus.TOO_MANY_REQUESTS,
  PG_014: HttpStatus.BAD_REQUEST,
  PG_015: HttpStatus.INTERNAL_SERVER_ERROR,
  PG_016: HttpStatus.BAD_REQUEST,
  PG_017: HttpStatus.NOT_FOUND,
  PG_018: HttpStatus.CONFLICT,
  PG_019: HttpStatus.INTERNAL_SERVER_ERROR,
  PG_020: HttpStatus.NOT_FOUND,
  PG_021: HttpStatus.BAD_REQUEST,
  PG_022: HttpStatus.BAD_REQUEST,
  PG_023: HttpStatus.BAD_REQUEST,
  PG_024: HttpStatus.NOT_FOUND,
  PG_025: HttpStatus.NOT_FOUND,
  PG_026: HttpStatus.BAD_REQUEST,
  PG_027: HttpStatus.BAD_REQUEST,
  PG_028: HttpStatus.NOT_FOUND,
  PG_029: HttpStatus.BAD_REQUEST,
};

export function playgroundException(
  code: PlaygroundErrorCode,
  options?: { message?: string },
) {
  const body = playgroundHttpError(code, options);
  const status = STATUS[code];
  if (status === HttpStatus.NOT_FOUND) return new NotFoundException(body);
  if (status === HttpStatus.CONFLICT) return new ConflictException(body);
  if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
    return new InternalServerErrorException(body);
  }
  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return new HttpException(body, status);
  }
  return new BadRequestException(body);
}
