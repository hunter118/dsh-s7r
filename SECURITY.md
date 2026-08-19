# Security policy

## Supported versions

Security fixes are provided for the latest tagged S7R release. Compatibility is currently pinned to the DSH release listed in `COMPATIBILITY.md`.

## Reporting a vulnerability

Please use GitHub's private **Report a vulnerability** form:

https://github.com/hunter118/dsh-s7r/security/advisories/new

Do not open a public issue for credential exposure, path traversal, unsafe file writes, RPC authorization, terminal ownership, or HTML/script injection. Include the affected S7R and DSH versions, impact, and minimal reproduction steps, but do not include a real API key or private conversation data.

You should receive an acknowledgement within seven days. A fix and disclosure timeline will be coordinated through the private advisory.

## Security boundaries

S7R relies on DSH for Agent authority, credential storage, filesystem resolution, terminal ownership, and loopback transport. The browser cannot read a stored `DEEPSEEK_API_KEY`; S7R filesystem calls are contained under the selected Workspace root; completed Markdown never injects raw HTML.
