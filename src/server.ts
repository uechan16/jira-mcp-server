import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Version3Client } from 'jira.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both locations
dotenv.config();
try {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
} catch (e) {
  console.error("Error loading .env file:", e);
}

// Initialize Jira client
const jira = new Version3Client({
  host: process.env.JIRA_HOST!,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL!,
      apiToken: process.env.JIRA_API_TOKEN!,
    },
  },
});

// Type definitions
interface JiraTicket {
  summary: string;
  description: string;
  projectKey: string;
  issueType: string;
}

interface JiraComment {
  body: string;
}

interface StatusUpdate {
  transitionId: string;
}

// Validation schemas
const TicketSchema = z.object({
  summary: z.string().describe("The ticket summary"),
  description: z.string().describe("The ticket description"),
  projectKey: z.string().describe("The project key (e.g., PROJECT)"),
  issueType: z.string().describe("The type of issue (e.g., Task, Bug)"),
});

const CommentSchema = z.object({
  body: z.string().describe("The comment text"),
});

const StatusUpdateSchema = z.object({
  transitionId: z.string().describe("The ID of the transition to perform"),
});

// Helper function to validate Jira configuration
function validateJiraConfig(): string | null {
  if (!process.env.JIRA_HOST) return "JIRA_HOST environment variable is not set";
  if (!process.env.JIRA_EMAIL) return "JIRA_EMAIL environment variable is not set";
  if (!process.env.JIRA_API_TOKEN) return "JIRA_API_TOKEN environment variable is not set";
  return null;
}

// Create server instance
const server = new McpServer({
  name: "jira",
  version: "1.0.0"
});

// Register tools
server.tool(
  "list_tickets",
  "List Jira tickets assigned to you",
  {
    jql: z.string().optional().describe("Optional JQL query to filter tickets"),
  },
  async ({ jql }: { jql?: string }) => {
    const configError = validateJiraConfig();
    if (configError) {
      return {
        content: [{ type: "text", text: `Configuration error: ${configError}` }],
      };
    }

    try {
      const query = jql || 'assignee = currentUser() ORDER BY updated DESC';
      const tickets = await jira.issueSearch.searchForIssuesUsingJql({ jql: query });
      
      if (!tickets.issues || tickets.issues.length === 0) {
        return {
          content: [{ type: "text", text: "No tickets found" }],
        };
      }

      const formattedTickets = tickets.issues.map((issue) => {
        const summary = issue.fields?.summary || 'No summary';
        const status = issue.fields?.status?.name || 'Unknown status';
        return `${issue.key}: ${summary} (${status})`;
      }).join('\n');

      return {
        content: [{ type: "text", text: formattedTickets }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to fetch tickets: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "get_ticket",
  "Get details of a specific Jira ticket",
  {
    ticketId: z.string().describe("The Jira ticket ID (e.g., PROJECT-123)"),
  },
  async ({ ticketId }: { ticketId: string }) => {
    const configError = validateJiraConfig();
    if (configError) {
      return {
        content: [{ type: "text", text: `Configuration error: ${configError}` }],
      };
    }

    try {
      const ticket = await jira.issues.getIssue({ issueIdOrKey: ticketId });
      const formattedTicket = [
        `Key: ${ticket.key}`,
        `Summary: ${ticket.fields?.summary || 'No summary'}`,
        `Status: ${ticket.fields?.status?.name || 'Unknown status'}`,
        `Type: ${ticket.fields?.issuetype?.name || 'Unknown type'}`,
        `Description:\n${ticket.fields?.description || 'No description'}`,
      ].join('\n');

      return {
        content: [{ type: "text", text: formattedTicket }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to fetch ticket: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "create_ticket",
  "Create a new Jira ticket",
  {
    ticket: TicketSchema,
  },
  async ({ ticket }: { ticket: JiraTicket }) => {
    const configError = validateJiraConfig();
    if (configError) {
      return {
        content: [{ type: "text", text: `Configuration error: ${configError}` }],
      };
    }

    try {
      const newTicket = await jira.issues.createIssue({
        fields: {
          project: { key: ticket.projectKey },
          summary: ticket.summary,
          description: ticket.description,
          issuetype: { name: ticket.issueType },
        },
      });

      return {
        content: [{ type: "text", text: `Created ticket: ${newTicket.key}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to create ticket: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "add_comment",
  "Add a comment to a Jira ticket",
  {
    ticketId: z.string().describe("The Jira ticket ID"),
    comment: CommentSchema,
  },
  async ({ ticketId, comment }: { ticketId: string; comment: JiraComment }) => {
    const configError = validateJiraConfig();
    if (configError) {
      return {
        content: [{ type: "text", text: `Configuration error: ${configError}` }],
      };
    }

    try {
      await jira.issueComments.addComment({
        issueIdOrKey: ticketId,
        comment: comment.body,
      });

      return {
        content: [{ type: "text", text: `Added comment to ${ticketId}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to add comment: ${(error as Error).message}` }],
      };
    }
  }
);

server.tool(
  "update_status",
  "Update the status of a Jira ticket",
  {
    ticketId: z.string().describe("The Jira ticket ID"),
    status: StatusUpdateSchema,
  },
  async ({ ticketId, status }: { ticketId: string; status: StatusUpdate }) => {
    const configError = validateJiraConfig();
    if (configError) {
      return {
        content: [{ type: "text", text: `Configuration error: ${configError}` }],
      };
    }

    try {
      await jira.issues.doTransition({
        issueIdOrKey: ticketId,
        transition: { id: status.transitionId },
      });

      return {
        content: [{ type: "text", text: `Updated status of ${ticketId}` }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Failed to update status: ${(error as Error).message}` }],
      };
    }
  }
);

// Start the server
async function main() {
  try {
    // Check Jira configuration
    const configError = validateJiraConfig();
    if (configError) {
      console.error(`Jira configuration error: ${configError}`);
      console.error("Please configure the required environment variables.");
      console.error("Starting server in limited mode (tools will return configuration instructions)");
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting Jira MCP server:", error);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.error('Received SIGINT signal, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM signal, shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 