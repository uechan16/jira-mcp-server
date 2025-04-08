# Jira MCP Server for Cursor

A TypeScript-based MCP server that integrates with Jira, allowing Cursor to interact with Jira tickets.

## Features

- List Jira tickets
- Get ticket details
- Get ticket comments
- Create new tickets
- Add comments to tickets
- Update ticket status
- Full MCP protocol support for Cursor integration

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example` and fill in your Jira credentials:
```
JIRA_HOST=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
PORT=3000
```

To get your Jira API token:
1. Log in to https://id.atlassian.com/manage/api-tokens
2. Click "Create API token"
3. Copy the token and paste it in your `.env` file

## Development

Run the development server:
```bash
npm run dev
```

## Build and Run

Build the project:
```bash
npm run build
```

Start the server:
```bash
npm start
```

## Cursor Integration

To use this MCP server with Cursor, you have two options:

### Option 1: Command-based Integration (Recommended)

1. Build the project:
```bash
npm run build
```

2. Open Cursor's settings:
   - Click on the Cursor menu
   - Select "Settings" (or use the keyboard shortcut)
   - Navigate to the "Extensions" or "Integrations" section

3. Add the MCP configuration:
```json
{
  "mcps": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-cursor/dist/server.js"]
    }
  }
}
```

Replace `/path/to/jira-mcp-cursor` with the absolute path to your project.

### Option 2: HTTP-based Integration (Alternative)

1. Start the MCP server (if not already running):
```bash
npm start
```

2. Open Cursor's settings:
   - Click on the Cursor menu
   - Select "Settings" (or use the keyboard shortcut)
   - Navigate to the "Extensions" or "Integrations" section

3. Add the MCP configuration:
```json
{
  "mcps": {
    "jira": {
      "url": "http://localhost:3000",
      "capabilities": [
        "list_tickets",
        "get_ticket",
        "get_comments",
        "create_ticket",
        "update_status",
        "add_comment"
      ]
    }
  }
}
```

## Using Jira in Cursor

After configuring the MCP server, you can use Jira commands directly in Cursor:

- `/jira list` - List your tickets
- `/jira view TICKET-123` - View ticket details
- `/jira comments TICKET-123` - Get ticket comments
- `/jira create` - Create a new ticket
- `/jira comment TICKET-123` - Add a comment
- `/jira status TICKET-123` - Update ticket status

## MCP Protocol Support

The server implements the Model-Client-Protocol (MCP) required by Cursor:

- Stdio communication for command-based integration
- Tool registration for Jira operations

## API Endpoints

### List Tickets
```
GET /api/tickets
Query params:
  - jql (optional): Jira Query Language string
```

### Get Ticket
```
GET /api/tickets/:id
```

### Get Ticket Comments
```
GET /api/tickets/:id/comments
```

### Create Ticket
```
POST /api/tickets
Body:
{
  "summary": "Ticket summary",
  "description": "Ticket description",
  "projectKey": "PROJECT",
  "issueType": "Task"
}
```

### Add Comment
```
POST /api/tickets/:id/comments
Body:
{
  "body": "Comment text"
}
```

### Update Status
```
POST /api/tickets/:id/status
Body:
{
  "transitionId": "21" // The ID of the transition to perform
}
``` 