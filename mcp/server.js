import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import PocketBase from "pocketbase";

// ─── Configuration ───────────────────────────────────────────────────────────
const PB_URL = process.env.PB_URL ?? "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL ?? "";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD ?? "";

// ─── PocketBase client ────────────────────────────────────────────────────────
const pb = new PocketBase(PB_URL);

async function ensureAuth() {
    console.log("Checking PocketBase authentication...");
  if (!pb.authStore.isValid) {
    const authData = await pb
                            .collection("users")
                            .authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, {
                                autoRefreshThreshold: 30 * 60,
                            });
    console.log("Authenticated with PocketBase as admin:", authData.record);
  }
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new McpServer({
  name: "ot-list-mcp",
  version: "1.0.0",
});

// ─── Resources ────────────────────────────────────────────────────────────────

/**
 * Static resource: exposes the PocketBase base URL so clients know where
 * the backend lives.
 */
server.resource("config", "config://pb-url", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "text/plain",
      text: PB_URL,
    },
  ],
}));

// ─── Tools ────────────────────────────────────────────────────────────────────

/**
 * List operating-theatre lists (otLists) for a given department.
 */
server.tool(
  "list-ot-lists",
  "List all OT lists, optionally filtered by department ID",
  {
    departmentId: z
      .string()
      .optional()
      .describe("Filter by department ID (leave empty for all)"),
  },
  async ({ departmentId }) => {
    await ensureAuth();

    const filter = departmentId ? `department = "${departmentId}"` : "";
    const records = await pb.collection("otLists").getFullList({
      filter,
      expand: "department",
      sort: "-created",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records, null, 2),
        },
      ],
    };
  }
);

/**
 * Get procedures for a specific OT day.
 */
server.tool(
  "get-procedures",
  "Get all procedures for a given OT day ID",
  {
    otDayId: z.string().describe("The ID of the OT day"),
  },
  async ({ otDayId }) => {
    await ensureAuth();

    const records = await pb.collection("procedures").getFullList({
      filter: `procedureDay = "${otDayId}"`,
      expand: "patient,addedBy,procedureDay.otList",
      sort: "+order",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records, null, 2),
        },
      ],
    };
  }
);

/**
 * Search patients by name or MRN.
 */
server.tool(
  "search-patients",
  "Search patients by name or MRN number",
  {
    query: z.string().min(1).describe("Name or MRN to search for"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Max number of results"),
  },
  async ({ query, limit }) => {
    await ensureAuth();

    const records = await pb.collection("patients").getList(1, limit, {
      filter: `name ~ "${query}" || mrn ~ "${query}"`,
      sort: "+name",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records, null, 2),
        },
      ],
    };
  }
);

/**
 * Get a summary of OT days in a date range.
 */
server.tool(
  "get-ot-day-summary",
  "Get OT days within a date range",
  {
    from: z.string().describe("Start date (YYYY-MM-DD)"),
    to: z.string().describe("End date (YYYY-MM-DD)"),
    otListId: z
      .string()
      .optional()
      .describe("Filter by OT list ID (optional)"),
  },
  async ({ from, to, otListId }) => {
    await ensureAuth();

    const dateFilter = `date >= "${from}" && date <= "${to}"`;
    const filter = otListId
      ? `${dateFilter} && otList = "${otListId}"`
      : dateFilter;

    const records = await pb.collection("otDays").getFullList({
      filter,
      expand: "otList.department",
      sort: "+date",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records, null, 2),
        },
      ],
    };
  }
);

/**
 * List all departments.
 */
server.tool(
  "list-departments",
  "List all departments",
  {},
  async () => {
    await ensureAuth();

    const records = await pb.collection("departments").getFullList({
      sort: "+name",
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(records, null, 2),
        },
      ],
    };
  }
);

// ─── Prompts ──────────────────────────────────────────────────────────────────

/**
 * Pre-built prompt: generate a daily theatre report.
 */
server.prompt(
  "daily-theatre-report",
  "Generate a daily operating theatre report for a specific date",
  {
    date: z.string().describe("Report date (YYYY-MM-DD)"),
  },
  ({ date }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please use the available tools to fetch all OT days for ${date} and produce a concise daily operating theatre report. Include: department, operating room, number of procedures, and patient names where available.`,
        },
      },
    ],
  })
);

// ─── Start server ─────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
