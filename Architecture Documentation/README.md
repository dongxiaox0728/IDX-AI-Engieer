# OpenClaw MLS Assistant Architecture Flow

Create a polished, presentation-ready architecture workflow diagram for the OpenClaw deliverable.

The diagram should show how a user query flows through the system:

```text
User -> WhatsApp Channel -> OpenClaw Runtime -> Orchestrator / Skill Selector -> Selected Skill -> Tool Execution -> External Data Source -> Memory Update -> Response back to User
```

## Caption

User queries are routed from WhatsApp through OpenClaw skills and tools to retrieve MLS/property data, update memory, and return a contextual response to the user.

## Required Layers

Group related components into clearly labeled visual layers:

- Communication Layer
- OpenClaw Runtime Layer
- Skills & Tools Layer
- Data Layer
- Response/Memory Layer

## Required Components

Include the following components in the workflow:

- User
  - Starts the property-related query or follow-up request.
- WhatsApp Channel
  - Receives user messages and sends responses back to the user.
- OpenClaw Runtime
  - Hosts the assistant workflow and coordinates runtime execution.
- Orchestrator / Skill Selector
  - Routes each request to the correct skill based on user intent.
- Selected Skill
  - Represents modular capability units such as property search, listing lookup, market stats, or buyer guidance.
- Tool Execution
  - Runs executable functions that query APIs, databases, or other external services.
- External Data Source
  - Includes systems such as an MLS Database, Property API, or market data service.
- Memory Update
  - Stores session context and long-term user/property context.
- Response back to User
  - Returns the final answer through WhatsApp.

## Visual Requirements

Generate the diagram as a standalone HTML file that can be opened directly in a browser and screenshot or exported for documentation.

The HTML file should use clean CSS with SVG or Mermaid and should look more polished than a basic flowchart:

- Modern colors
- Rounded boxes
- Clear directional arrows
- Readable typography
- Soft page background
- Subtle shadows
- Balanced spacing
- Strong hierarchy
- Clear section labels

## Deliverable

Create a standalone HTML diagram file for documentation use.

Recommended filename:

```text
openclaw-mls-assistant-architecture-flow.html
```

The page must include the title:

```text
OpenClaw MLS Assistant Architecture Flow
```
