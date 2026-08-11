export type AthleteImportInput = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  status?: unknown;
};

export type PreparedAthlete = {
  name: string;
  email: string;
  phone: string;
};

export type RejectedAthlete = {
  row: number;
  reason: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function headerKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseAthleteCsv(source: string): AthleteImportInput[] {
  const rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  const headers = rows.shift()?.map(headerKey) || [];
  const indexes = {
    name: headers.findIndex((value) => ["NOME", "NAME"].includes(value)),
    email: headers.findIndex((value) => ["EMAIL", "E-MAIL"].includes(value)),
    phone: headers.findIndex((value) => ["TELEFONE", "WHATSAPP", "PHONE"].includes(value)),
    status: headers.findIndex((value) => ["RANQUEADO", "STATUS", "SITUACAO"].includes(value)),
  };
  if (indexes.name < 0 || indexes.email < 0) throw new Error("O CSV precisa das colunas NOME e EMAIL.");

  return rows.map((values) => ({
    name: values[indexes.name] || "",
    email: values[indexes.email] || "",
    phone: indexes.phone >= 0 ? values[indexes.phone] || "" : "",
    status: indexes.status >= 0 ? values[indexes.status] || "" : "ATIVO",
  }));
}

export function prepareAthleteImport(input: AthleteImportInput[]) {
  const athletes: PreparedAthlete[] = [];
  const rejected: RejectedAthlete[] = [];
  const seenEmails = new Set<string>();

  input.forEach((item, index) => {
    const row = index + 2;
    const status = headerKey(text(item.status) || "ATIVO");
    if (status !== "ATIVO") return;

    const name = text(item.name).replace(/\s+/g, " ");
    const email = text(item.email).toLowerCase();
    const phone = text(item.phone).replace(/\D/g, "");
    if (name.length < 2 || name.length > 160) {
      rejected.push({ row, reason: "Nome inválido" });
    } else if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
      rejected.push({ row, reason: "E-mail inválido" });
    } else if (phone && (phone.length < 10 || phone.length > 13)) {
      rejected.push({ row, reason: "Telefone inválido" });
    } else if (seenEmails.has(email)) {
      rejected.push({ row, reason: "E-mail duplicado no arquivo" });
    } else {
      seenEmails.add(email);
      athletes.push({ name, email, phone });
    }
  });

  return { athletes, rejected };
}

