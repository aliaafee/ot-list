# OT List MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes OT List data — departments, operating-theatre lists, OT days, procedures, and patients — to AI assistants via a PocketBase backend.

## Requirements

- Node.js 18+
- A running [OT List PocketBase](../pb/) instance
- PocketBase admin credentials

## Setup

```powershell
cd mcp
npm install
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PB_URL` | `http://localhost:8090` | PocketBase base URL |
| `PB_ADMIN_EMAIL` | *(empty)* | PocketBase admin e-mail |
| `PB_ADMIN_PASSWORD` | *(empty)* | PocketBase admin password |

Set them before starting the server:

```powershell
$env:PB_URL          = "http://localhost:8090"
$env:PB_ADMIN_EMAIL  = "admin@example.com"
$env:PB_ADMIN_PASSWORD = "yourpassword"
node server.js
```

Or via a `.env` file (add a loader such as `dotenv` if needed).

## VS Code (GitHub Copilot) Integration

Add the following to your VS Code `settings.json`:

```json
"mcp": {
  "servers": {
    "ot-list": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp/server.js"],
      "env": {
        "PB_URL": "http://localhost:8090",
        "PB_ADMIN_EMAIL": "admin@example.com",
        "PB_ADMIN_PASSWORD": "yourpassword"
      }
    }
  }
}
```

## API Reference

### Resources

| URI | Description |
|---|---|
| `config://pb-url` | Returns the configured PocketBase base URL as plain text |

### Tools

| Tool | Inputs | Description |
|---|---|---|
| `list-departments` | — | List all departments |
| `list-ot-lists` | `departmentId?` | List OT lists, optionally filtered by department |
| `get-ot-day-summary` | `from`, `to`, `otListId?` | Fetch OT days in a date range (YYYY-MM-DD) |
| `get-procedures` | `otDayId` | Get all procedures for an OT day, with expanded patient & list info |
| `search-patients` | `query`, `limit?` | Search patients by name or MRN (max 50 results) |

### Prompts

| Prompt | Inputs | Description |
|---|---|---|
| `daily-theatre-report` | `date` | Ask the AI to compile a daily operating theatre report for a given date |

## Project Structure

```
mcp/
├── server.js      # MCP server entry point
├── package.json
└── README.md
```

## Data Model (summary)

```
departments
  └─ otLists
       └─ otDays  (specific dates)
            └─ procedures  (ordered)
                 └─ patients
```

Full schema lives in [../pb_schema.json](../pb_schema.json).
