import { promises as dns } from "node:dns";

export type EmailDnsReport = {
  domain: string;
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
  records: { spf: string[]; dkim: string[]; dmarc: string[] };
};

async function txt(name: string): Promise<string[]> {
  try {
    const chunks = await dns.resolveTxt(name);
    return chunks.map((parts) => parts.join(""));
  } catch {
    return [];
  }
}

export async function checkEmailDns(domain: string, dkimSelector = "resend"): Promise<EmailDnsReport> {
  const host = domain.replace(/^@/, "").trim().toLowerCase();
  const [spfRaw, dkimRaw, dmarcRaw] = await Promise.all([
    txt(host),
    txt(`${dkimSelector}._domainkey.${host}`),
    txt(`_dmarc.${host}`),
  ]);
  return {
    domain: host,
    spf: spfRaw.some((r) => /v=spf1/i.test(r)),
    dkim: dkimRaw.some((r) => /v=DKIM1/i.test(r) || r.length > 20),
    dmarc: dmarcRaw.some((r) => /v=DMARC1/i.test(r)),
    records: { spf: spfRaw, dkim: dkimRaw, dmarc: dmarcRaw },
  };
}
