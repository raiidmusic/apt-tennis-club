import { receiveHeyFormEvent } from "../../../../lib/member-survey";

export const runtime = "nodejs";

export function POST(request: Request) {
  return receiveHeyFormEvent(request);
}
