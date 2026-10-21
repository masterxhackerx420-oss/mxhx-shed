export type Fail = { ok: false; error: string };

export type GithubSnap = {
  ok: true;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  license: string | null;
  defaultBranch: string;
  pushedAt: string | null;
  htmlUrl: string;
  mark: string;
  latestRelease: null | {
    tag: string;
    name: string;
    publishedAt: string | null;
    body: string;
  };
  tags: string[];
  commits: { sha: string; message: string; date: string | null; author: string; url: string }[];
};

export type NpmSnap = {
  ok: true;
  name: string;
  description: string | null;
  latest: string;
  license: string | null;
  homepage: string | null;
  publishedAt: string | null;
  mark: string;
  recent: { version: string; time: string }[];
};

export type CompareSnap = {
  ok: true;
  status: string;
  ahead: number;
  behind: number;
  total: number;
  commits: { sha: string; message: string; date: string | null }[];
  files: { name: string; status: string; additions: number; deletions: number }[];
};

export type ScrapeSnap = {
  ok: true;
  url: string;
  status: number;
  contentType: string;
  title: string;
  description: string;
  headings: { level: number; text: string }[];
  links: { href: string; text: string }[];
  emails: string[];
  tels: string[];
  kinds: string[];
  matches: string[];
  bytes: number;
};

export type DnsRow = {
  resolver: string;
  status: string;
  answers: { data: string; ttl: number }[];
  error?: string;
};

export type DnsSnap = {
  ok: true;
  queried: string;
  type: string;
  note: string;
  rows: DnsRow[];
};

export type GithubResult = GithubSnap | Fail;
export type NpmResult = NpmSnap | Fail;
export type CompareResult = CompareSnap | Fail;
export type ScrapeResult = ScrapeSnap | Fail;
export type DnsResult = DnsSnap | Fail;

export type RdapSnap = {
  ok: true;
  name: string;
  statuses: string[];
  registrar: string;
  events: { action: string; date: string }[];
  nameservers: string[];
};

export type HeadSnap = {
  ok: true;
  url: string;
  status: number;
  hops: number;
  headers: { name: string; value: string }[];
  cookies: string[];
  notes: string[];
};

export type CertRow = {
  name: string;
  names: string[];
  issuer: string;
  notBefore: string;
  notAfter: string;
};

export type CertSnap = {
  ok: true;
  query: string;
  rows: CertRow[];
  extra: number;
};

export type RouteSnap = {
  ok: true;
  query: string;
  address: string;
  prefix: string;
  asn: string;
  holder: string;
  announced: boolean;
};

export type RobotsSnap = {
  ok: true;
  host: string;
  robotsStatus: number;
  robots: string;
  securityStatus: number;
  security: string;
};

export type RdapResult = RdapSnap | Fail;
export type HeadResult = HeadSnap | Fail;
export type CertResult = CertSnap | Fail;
export type RouteResult = RouteSnap | Fail;
export type RobotsResult = RobotsSnap | Fail;
