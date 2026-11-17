import { adminSurveyResults, memberSurveyAccess } from "../../../lib/member-survey";

export const runtime = "nodejs";

export function GET(request: Request) {
  return new URL(request.url).searchParams.get("admin") === "1" ? adminSurveyResults(request) : memberSurveyAccess(request);
}
