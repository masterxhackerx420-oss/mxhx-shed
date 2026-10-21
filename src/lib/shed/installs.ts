export type Kit = {
  id: "linux" | "apple" | "windows";
  label: string;
  note: string;
  commands: string;
};

export type ToolInstall = {
  blurb: string;
  kits: Kit[];
};

const linux = (note: string, commands: string): Kit => ({ id: "linux", label: "Linux", note, commands });
const apple = (note: string, commands: string): Kit => ({ id: "apple", label: "Apple", note, commands });
const windows = (note: string, commands: string): Kit => ({ id: "windows", label: "Windows", note, commands });

export const SHED_INSTALL: ToolInstall = {
  blurb: "Clone the public repo and run the shed on your own machine. Node.js 22. The benches talk to public registries from that machine.",
  kits: [
    linux(
      "Debian, Ubuntu, and other apt systems. Install Node 22 if node -v is older.",
      `sudo apt update
sudo apt install -y git curl ca-certificates
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev`,
    ),
    apple(
      "macOS with Homebrew. The shed opens on port 8080.",
      `brew install node git
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev`,
    ),
    windows(
      "Windows Terminal, PowerShell. Restart the terminal after winget so node and git are on PATH.",
      `winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev`,
    ),
  ],
};

export const TOOL_INSTALL: Record<string, ToolInstall> = {
  versions: {
    blurb: "The same public repo read, from a shell. GitHub CLI, or curl against the public API.",
    kits: [
      linux("GitHub CLI from apt.", "sudo apt install -y gh\ngh repo view tanstack/router"),
      apple("GitHub CLI from Homebrew.", "brew install gh\ngh repo view tanstack/router"),
      windows("GitHub CLI from winget.", "winget install -e --id GitHub.cli\ngh repo view tanstack/router"),
    ],
  },
  scrape: {
    blurb: "One public page, saved to the terminal. No login, no private host.",
    kits: [
      linux("curl is the whole install.", "sudo apt install -y curl\ncurl -fsSL https://example.com | head"),
      apple("curl is already on macOS.", "curl -fsSL https://example.com | head"),
      windows("curl.exe ships with Windows 10 and 11.", "curl.exe -fsSL https://example.com"),
    ],
  },
  dns: {
    blurb: "Ask a resolver from the shell. dig on Linux and Apple. nslookup is already on Windows.",
    kits: [
      linux("dnsutils on Debian and Ubuntu. bind-utils on Fedora.", "sudo apt install -y dnsutils\ndig example.com A +short"),
      apple("dig is already on macOS.", "dig example.com A +short"),
      windows("nslookup is already on Windows.", "nslookup example.com"),
    ],
  },
  phone: {
    blurb: "Numbering plans stay in the browser. There is no single phone CLI to install.",
    kits: [
      linux("Nothing to install.", "# Use the Phone bench in the shed."),
      apple("Nothing to install.", "# Use the Phone bench in the shed."),
      windows("Nothing to install.", "# Use the Phone bench in the shed."),
    ],
  },
  steno: {
    blurb: "Briefs, drills, and hidden ink stay in this browser.",
    kits: [
      linux("Nothing to install.", "# Use the Steno bench in the shed."),
      apple("Nothing to install.", "# Use the Steno bench in the shed."),
      windows("Nothing to install.", "# Use the Steno bench in the shed."),
    ],
  },
  rdap: {
    blurb: "Registration data for a domain. whois where the OS has it, and RDAP over curl everywhere.",
    kits: [
      linux("whois package, plus curl.", "sudo apt install -y whois curl\nwhois example.com\ncurl -fsSL https://rdap.org/domain/example.com"),
      apple("whois and curl are already on macOS.", "whois example.com\ncurl -fsSL https://rdap.org/domain/example.com"),
      windows("No built-in whois. curl.exe can read RDAP.", "curl.exe -fsSL https://rdap.org/domain/example.com"),
    ],
  },
  head: {
    blurb: "Response headers only. The -I flag asks for the head, not the page.",
    kits: [
      linux("curl.", "sudo apt install -y curl\ncurl -sI https://example.com"),
      apple("curl is already on macOS.", "curl -sI https://example.com"),
      windows("curl.exe is already on Windows.", "curl.exe -sI https://example.com"),
    ],
  },
  cert: {
    blurb: "The live certificate on port 443, and the public certificate index.",
    kits: [
      linux("openssl is usually already installed.", "openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates"),
      apple("LibreSSL or openssl is already on macOS.", "openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates"),
      windows("OpenSSL Light from winget, then the same command in PowerShell.", "winget install -e --id ShiningLight.OpenSSL.Light\nopenssl s_client -connect example.com:443 -servername example.com"),
    ],
  },
  route: {
    blurb: "Prefix and ASN from the public RIPE Stat service. whois reads the same story on Linux and Apple.",
    kits: [
      linux("whois and curl.", "sudo apt install -y whois curl\nwhois 1.1.1.1\ncurl -fsSL 'https://stat.ripe.net/data/prefix-overview/data.json?resource=1.1.1.1'"),
      apple("whois and curl are already on macOS.", "whois 1.1.1.1\ncurl -fsSL 'https://stat.ripe.net/data/prefix-overview/data.json?resource=1.1.1.1'"),
      windows("curl.exe against the public prefix service.", "curl.exe -fsSL \"https://stat.ripe.net/data/prefix-overview/data.json?resource=1.1.1.1\""),
    ],
  },
  robots: {
    blurb: "The two public notes a site leaves for crawlers and for security reports.",
    kits: [
      linux("curl.", "sudo apt install -y curl\ncurl -fsSL https://example.com/robots.txt\ncurl -fsSL https://example.com/.well-known/security.txt"),
      apple("curl is already on macOS.", "curl -fsSL https://example.com/robots.txt\ncurl -fsSL https://example.com/.well-known/security.txt"),
      windows("curl.exe is already on Windows.", "curl.exe -fsSL https://example.com/robots.txt\ncurl.exe -fsSL https://example.com/.well-known/security.txt"),
    ],
  },
};
