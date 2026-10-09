/**
 * A department response in two parts: what was done, and the outcome for
 * the submitter.
 *
 * Provides utilities to compose and split response body text with standard headings.
 */

export const ACTION_TAKEN_HEADING = 'Action taken:';
export const RESOLUTION_SUMMARY_HEADING = 'Resolution summary:';

export interface ResponseParts {
  action_taken: string;
  resolution_summary: string;
}

export interface LegacyResponseParts {
  actionTaken: string;
  resolutionSummary: string;
}

export function composeResponseBody({
  actionTaken,
  resolutionSummary,
  action_taken,
  resolution_summary,
}: {
  actionTaken?: string;
  resolutionSummary?: string;
  action_taken?: string;
  resolution_summary?: string;
}): string {
  const action = (actionTaken ?? action_taken ?? '').trim();
  const summary = (resolutionSummary ?? resolution_summary ?? '').trim();
  if (!action) return summary;
  return `${ACTION_TAKEN_HEADING}\n${action}\n\n${RESOLUTION_SUMMARY_HEADING}\n${summary}`;
}

export function splitResponseBody(body: string | null | undefined): LegacyResponseParts {
  if (!body) {
    return { actionTaken: '', resolutionSummary: '' };
  }
  const actionMatch = body.match(/^[ \t]*action\s+taken:[ \t]*\r?$/im) || body.match(/action\s+taken:/i);
  const summaryMatch = body.match(/^[ \t]*resolution\s+summary:[ \t]*\r?$/im) || body.match(/resolution\s+summary:/i);

  if (!actionMatch || !summaryMatch || (actionMatch.index ?? 0) >= (summaryMatch.index ?? 0)) {
    return {
      actionTaken: '',
      resolutionSummary: body.trim(),
    };
  }

  const actionStart = (actionMatch.index ?? 0) + actionMatch[0].length;
  const summaryStart = summaryMatch.index ?? 0;
  const summaryEnd = summaryStart + summaryMatch[0].length;

  const actionPart = body.slice(actionStart, summaryStart).trim();
  const summaryPart = body.slice(summaryEnd).trim();

  return {
    actionTaken: actionPart,
    resolutionSummary: summaryPart,
  };
}

export function splitResponseParts(body: string | null | undefined): ResponseParts {
  const { actionTaken, resolutionSummary } = splitResponseBody(body);
  return {
    action_taken: actionTaken,
    resolution_summary: resolutionSummary,
  };
}
