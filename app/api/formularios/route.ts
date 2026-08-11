import { requireAdmin } from "../../../lib/auth";
import { supabaseAdmin, SupabaseRequestError } from "../../../lib/supabase-server";

type FormRow = { id: string; slug: string; name: string; description: string | null };
type VersionRow = {
  id: string; form_id: string; version_number: number; status: "draft" | "published" | "archived";
  published_at: string | null; created_at: string;
};
type QuestionRow = {
  id: string; form_version_id: string; question_key: string; position: number; title: string;
  helper: string | null; question_type: string; required: boolean; options: unknown; condition: unknown;
};
type SubmissionRow = { id: string; form_version_id: string };

export async function GET(request: Request) {
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });

  try {
    const [forms, versions, questions, submissions] = await Promise.all([
      supabaseAdmin<FormRow[]>("forms", { query: { select: "id,slug,name,description", order: "created_at.asc" } }),
      supabaseAdmin<VersionRow[]>("form_versions", { query: { select: "id,form_id,version_number,status,published_at,created_at", order: "version_number.desc" } }),
      supabaseAdmin<QuestionRow[]>("form_questions", { query: { select: "id,form_version_id,question_key,position,title,helper,question_type,required,options,condition", order: "position.asc" } }),
      supabaseAdmin<SubmissionRow[]>("form_submissions", { query: { select: "id,form_version_id", limit: "10000" } }),
    ]);

    return Response.json({
      forms: forms.map((form) => {
        const formVersions = versions.filter((version) => version.form_id === form.id);
        const publishedVersion = formVersions.find((version) => version.status === "published") || null;
        return {
          id: form.id,
          slug: form.slug,
          name: form.name,
          description: form.description,
          versions: formVersions.map((version) => ({
            id: version.id,
            number: version.version_number,
            status: version.status,
            publishedAt: version.published_at,
          })),
          publishedVersion: publishedVersion ? {
            id: publishedVersion.id,
            number: publishedVersion.version_number,
            status: publishedVersion.status,
            publishedAt: publishedVersion.published_at,
            submissionCount: submissions.filter((submission) => submission.form_version_id === publishedVersion.id).length,
            questions: questions
              .filter((question) => question.form_version_id === publishedVersion.id)
              .map((question) => ({
                id: question.id,
                key: question.question_key,
                position: question.position,
                title: question.title,
                helper: question.helper,
                type: question.question_type,
                required: question.required,
                options: question.options,
                condition: question.condition,
              })),
          } : null,
        };
      }),
    });
  } catch (error) {
    const schemaMissing = error instanceof SupabaseRequestError && [404, 400].includes(error.status);
    return Response.json(
      { error: schemaMissing ? "A migration de formulários ainda não foi aplicada no Supabase." : "Não foi possível carregar os formulários." },
      { status: schemaMissing ? 503 : 500 },
    );
  }
}
