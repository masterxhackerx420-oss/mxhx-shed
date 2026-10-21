# MXHX Shed

Beginner to God Mode. Ten benches. Public infrastructure only.

MasterX_HackerX — never underestimate the power.

![Three tool rolls for Linux, Apple, and Windows](public/brand/install.jpg)

## Install locally

Node.js 22. Then open the shed on port 8080.

### Linux

```bash
sudo apt update
sudo apt install -y git curl ca-certificates
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev
```

Install Node.js 22 first if `node -v` is older.

### Apple

macOS with Homebrew.

```bash
brew install node git
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev
```

### Windows

Windows Terminal, PowerShell. Restart the terminal after winget so `node` and `git` are on PATH.

```powershell
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Git.Git
git clone https://github.com/masterxhackerx420-oss/mxhx-shed.git
cd mxhx-shed
npm install
npm run dev
```

## Benches

Fifteen stamps still opens God Mode. The OSINT desks add stamps after that.

| Bench | In the shed | On your machine |
| --- | --- | --- |
| GitHub | Public repo, tags, releases, npm, live watch | `gh repo view owner/name` |
| Scrape | One public page | `curl -fsSL https://example.com` |
| DNS | A, MX, TXT, and the rest | `dig example.com A +short` |
| Phone | Country, line, vanity | Browser only |
| Steno | Briefs, drills, hidden ink | Browser only |
| RDAP | Registrar, dates, nameservers | `whois example.com` |
| Head | Response headers | `curl -sI https://example.com` |
| Cert | Public certificate names | `openssl s_client -connect example.com:443 -servername example.com` |
| Route | Prefix and ASN | `whois 1.1.1.1` |
| Robots | robots.txt and security.txt | `curl -fsSL https://example.com/robots.txt` |

No accounts. No private networks. No people search. Registration records stop at the registrar.

## Artwork

![GitHub](public/brand/versions.jpg)
![Scrape](public/brand/scrape.jpg)
![DNS](public/brand/dns.jpg)
![Phone](public/brand/phone.jpg)
![Steno](public/brand/steno.jpg)
![RDAP](public/brand/rdap.jpg)
![Head](public/brand/head.jpg)
![Cert](public/brand/cert.jpg)
![Route](public/brand/route.jpg)
![Robots](public/brand/robots.jpg)

## README marks

```text
+-------------------------------------+
|                MXHX                 |
|  ###   ###  ##### #   # #   # ####  |
| #       #     #   #   # #   # #   # |
| #  ##   #     #   ##### #   # ####  |
| #   #   #     #   #   # #   # #   # |
|  ###   ###    #   #   #  ###  ####  |
|                                     |
|     live refs, tags, dist-tags      |
+-------------------------------------+
```

```text
+-------------------------------------+
|                MXHX                 |
|  ####  ###  ####   ###  ####  ##### |
| #     #     #   # #   # #   # #     |
|  ###  #     ####  ##### ####  ####  |
|     # #     #  #  #   # #     #     |
| ####   ###  #   # #   # #     ##### |
|                                     |
|      one public page, no login      |
+-------------------------------------+
```

```text
+----------------------------+
|            MXHX            |
|     ####  #   #  ####      |
|     #   # ##  # #          |
|     #   # # # #  ###       |
|     #   # #  ##     #      |
|     ####  #   # ####       |
|                            |
| names, mail, and resolvers |
+----------------------------+
```

```text
+-------------------------------+
|             MXHX              |
| ####  #   #  ###  #   # ##### |
| #   # #   # #   # ##  # #     |
| ####  ##### #   # # # # ####  |
| #     #   # #   # #  ## #     |
| #     #   #  ###  #   # ##### |
|                               |
|  country, line, vanity keys   |
+-------------------------------+
```

```text
+-------------------------------+
|             MXHX              |
|  #### ##### ##### #   #  ###  |
| #       #   #     ##  # #   # |
|  ###    #   ####  # # # #   # |
|     #   #   #     #  ## #   # |
| ####    #   ##### #   #  ###  |
|                               |
|  briefs, drills, hidden ink   |
+-------------------------------+
```

```text
+-------------------------+
|          MXHX           |
| ####  ####   ###  ####  |
| #   # #   # #   # #   # |
| ####  #   # ##### ####  |
| #  #  #   # #   # #     |
| #   # ####  #   # #     |
|                         |
| who registered the name |
+-------------------------+
```

```text
+-------------------------+
|          MXHX           |
| #   # #####  ###  ####  |
| #   # #     #   # #   # |
| ##### ####  ##### #   # |
| #   # #     #   # #   # |
| #   # ##### #   # ####  |
|                         |
| headers on a public url |
+-------------------------+
```

```text
+-------------------------+
|          MXHX           |
|  ###  ##### ####  ##### |
| #     #     #   #   #   |
| #     ####  ####    #   |
| #     #     #  #    #   |
|  ###  ##### #   #   #   |
|                         |
|  names on public certs  |
+-------------------------+
```

```text
+-------------------------------+
|             MXHX              |
| ####   ###  #   # ##### ##### |
| #   # #   # #   #   #   #     |
| ####  #   # #   #   #   ####  |
| #  #  #   # #   #   #   #     |
| #   #  ###   ###    #   ##### |
|                               |
|   address, asn, and prefix    |
+-------------------------------+
```

```text
+-------------------------------------+
|                MXHX                 |
| ####   ###  ####   ###  #####  #### |
| #   # #   # #   # #   #   #   #     |
| ####  #   # ####  #   #   #    ###  |
| #  #  #   # #   # #   #   #       # |
| #   #  ###  ####   ###    #   ####  |
|                                     |
|     robots.txt and security.txt     |
+-------------------------------------+
```

Each bench also copies its own measured fence. Paste that one into GitHub.

