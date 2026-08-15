import { requireAdmin } from "../../../../lib/auth";
import { AthleteImportInput, prepareAthleteImport } from "../../../../lib/member-import";
import { requireTrustedOrigin } from "../../../../lib/request-security";
import { runtimeEnv, sha256, supabaseAdmin } from "../../../../lib/supabase-server";

type ExistingMember = {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  cpf_hash: string | null;
  auth_user_id: string | null;
};

export async function POST(request: Request) {
  const blocked = requireTrustedOrigin(request);
  if (blocked) return blocked;
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin) return Response.json({ error: "Acesso restrito à gestão." }, { status: 401 });

  try {
    const payload = await request.json() as { athletes?: AthleteImportInput[]; commit?: boolean };
    if (!Array.isArray(payload.athletes) || payload.athletes.length === 0 || payload.athletes.length > 500) {
      return Response.json({ error: "Envie de 1 a 500 atletas por arquivo." }, { status: 400 });
    }

    const prepared = prepareAthleteImport(payload.athletes);
    const existing = await supabaseAdmin<ExistingMember[]>("members", {
      query: { select: "id,name,email,whatsapp,cpf_hash,auth_user_id", limit: "1000" },
    });
    const existingByEmail = new Map(existing.map((member) => [member.email.toLowerCase(), member]));
    const newAthletes = prepared.athletes.filter((athlete) => !existingByEmail.has(athlete.email));
    const pendingExisting = prepared.athletes
      .map((athlete) => existingByEmail.get(athlete.email))
      .filter((member): member is ExistingMember => Boolean(member && (!member.cpf_hash || !member.auth_user_id)));
    const alreadyRegistered = prepared.athletes.length - newAthletes.length - pendingExisting.length;
    const summary = {
      activeRows: prepared.athletes.length,
      newMembers: newAthletes.length,
      pendingExisting: pendingExisting.length,
      alreadyRegistered,
      rejected: prepared.rejected.length,
    };

    if (!payload.commit) return Response.json({ summary, rejected: prepared.rejected });
    if (prepared.rejected.length) {
      return Response.json({ error: "Corrija as linhas rejeitadas antes de importar.", summary, rejected: prepared.rejected }, { status: 400 });
    }

    const inserted = newAthletes.map((athlete) => ({
      id: crypto.randomUUID(),
      name: athlete.name,
      email: athlete.email,
      whatsapp: athlete.phone,
      cpf_hash: null,
      cpf_last4: null,
      participation_status: "awaiting_payment",
    }));
    if (inserted.length) {
      await supabaseAdmin("members", {
        method: "POST",
        query: { on_conflict: "email" },
        prefer: "resolution=ignore-duplicates,return=minimal",
        body: inserted,
      });
    }

    const targetEmails = new Set([...newAthletes, ...pendingExisting].map((member) => member.email.toLowerCase()));
    const refreshedMembers = targetEmails.size
      ? await supabaseAdmin<ExistingMember[]>("members", {
        query: { select: "id,name,email,whatsapp,cpf_hash,auth_user_id", limit: "1000" },
      })
      : [];
    const targets = refreshedMembers
      .filter((member) => targetEmails.has(member.email.toLowerCase()) && (!member.cpf_hash || !member.auth_user_id))
      .map((member) => ({ id: member.id, name: member.name, email: member.email, whatsapp: member.whatsapp }));
    if (targets.length) {
      await supabaseAdmin("invites", {
        method: "PATCH",
        query: { member_id: `in.(${targets.map((member) => member.id).join(",")})`, used_at: "is.null", revoked_at: "is.null" },
        body: { revoked_at: new Date().toISOString() },
      });
    }

    const origin = (runtimeEnv().APT_PUBLIC_URL || new URL(request.url).origin).replace(/\/$/, "");
    const invitationRows = await Promise.all(targets.map(async (member) => {
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll("-", "");
      return {
        member,
        invite: {
          id: crypto.randomUUID(),
          member_id: member.id,
          token_hash: await sha256(token),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        url: `${origin}/cadastro?convite=${token}`,
      };
    }));
    if (invitationRows.length) {
      await supabaseAdmin("invites", {
        method: "POST",
        prefer: "return=minimal",
        body: invitationRows.map((row) => row.invite),
      });
    }

    await supabaseAdmin("audit_logs", {
      method: "POST",
      body: {
        actor: admin.email,
        action: "members.imported_for_recadastro",
        entity_type: "member_batch",
        entity_id: crypto.randomUUID(),
        metadata: { imported: inserted.length, reinvited: pendingExisting.length, already_registered: alreadyRegistered },
      },
    });

    return Response.json({
      summary,
      invitations: invitationRows.map((row) => ({ ...row.member, url: row.url })),
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Não foi possível importar os atletas." }, { status: 500 });
  }
}
