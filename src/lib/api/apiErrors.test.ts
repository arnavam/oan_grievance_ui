import { describe, expect, it } from 'vitest';
import { ApiErrorCode, classifyError, httpStatusToErrorCode } from './apiErrors';
import { ApiError } from './fetchApi';

describe('apiErrors', () => {
  describe('httpStatusToErrorCode', () => {
    it('maps 401 to ApiErrorCode.Auth', () => {
      expect(httpStatusToErrorCode(401)).toBe(ApiErrorCode.Auth);
    });

    it('maps 403 to ApiErrorCode.Forbidden', () => {
      expect(httpStatusToErrorCode(403)).toBe(ApiErrorCode.Forbidden);
    });

    it('maps 500+ to ApiErrorCode.Connection', () => {
      expect(httpStatusToErrorCode(500)).toBe(ApiErrorCode.Connection);
      expect(httpStatusToErrorCode(502)).toBe(ApiErrorCode.Connection);
      expect(httpStatusToErrorCode(504)).toBe(ApiErrorCode.Connection);
    });

    it('returns null for client-handled statuses', () => {
      expect(httpStatusToErrorCode(200)).toBeNull();
      expect(httpStatusToErrorCode(400)).toBeNull();
      expect(httpStatusToErrorCode(404)).toBeNull();
      expect(httpStatusToErrorCode(422)).toBeNull();
    });
  });

  describe('classifyError', () => {
    it('classifies direct sentinel strings', () => {
      expect(classifyError(ApiErrorCode.Auth)).toBe(ApiErrorCode.Auth);
      expect(classifyError(ApiErrorCode.Forbidden)).toBe(ApiErrorCode.Forbidden);
      expect(classifyError(ApiErrorCode.Connection)).toBe(ApiErrorCode.Connection);
    });

    it('classifies Errors with sentinel messages', () => {
      expect(classifyError(new Error(ApiErrorCode.Auth))).toBe(ApiErrorCode.Auth);
      expect(classifyError(new Error(ApiErrorCode.Forbidden))).toBe(ApiErrorCode.Forbidden);
      expect(classifyError(new Error(ApiErrorCode.Connection))).toBe(ApiErrorCode.Connection);
    });

    it('classifies ApiError with 5xx status as Connection', () => {
      const err = new ApiError('Bad Gateway', null, 502);
      expect(classifyError(err)).toBe(ApiErrorCode.Connection);
    });

    it('classifies network TypeError as Connection', () => {
      expect(classifyError(new TypeError('Failed to fetch'))).toBe(ApiErrorCode.Connection);
      expect(classifyError(new Error('NetworkError when attempting to fetch resource.'))).toBe(
        ApiErrorCode.Connection
      );
    });

    it('returns null for generic errors', () => {
      expect(classifyError(new Error('Invalid password'))).toBeNull();
      expect(classifyError(null)).toBeNull();
      expect(classifyError(undefined)).toBeNull();
    });
  });
});
