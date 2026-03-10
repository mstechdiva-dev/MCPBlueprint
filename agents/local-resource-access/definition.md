# Local Resource Access Agent

## What It Does

The Local Resource Access agent enables agents to securely access files, databases, or on-device resources without those resources being exposed externally. Security and access control are the primary concerns of this pattern.

## When to Use It

- Agents need to read or write local files as part of their workflow
- Sensitive resources should never leave the local environment
- You need tightly controlled access to on-device data

## When Not to Use It

- Resources are already available via an external API (use Direct API Wrapper instead)
- Local access introduces compliance or security risk that outweighs the benefit

## How It Works

```
Agent requests local resource → Access control check → Resource returned within defined scope → Agent uses resource
```

## Configuration

Key fields:
- `allowed_paths` - file paths or directories the agent is permitted to access
- `access_mode` - read, write, or read-write
- `excluded_paths` - paths explicitly blocked even if within an allowed directory
- `require_audit_log` - whether every access is logged

## Common Use Cases

- Reading configuration files that contain sensitive values that should never be transmitted to an external service
- Writing processed output to a local audit log that must remain on-device
- Accessing a local SQLite or embedded database without exposing connection strings externally
- Reading reference data files (lookup tables, rule sets) that inform agent decisions but don't leave the environment

## Guardrail Considerations

- Highest security sensitivity of all agent types
- Alert immediately on any access attempt outside `allowed_paths`
- Block write access unless explicitly configured
- Log every access event regardless of `require_audit_log` setting - don't rely on config for security logging
- Flag any attempt to access credentials, key files, or system configuration
