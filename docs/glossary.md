# Glossary

New to agents and MCP? This page explains the key terms used throughout MCPBlueprint in plain language - no prior background required.

---

## Core Concepts

### Agent
A small, focused program that performs a specific task automatically. Think of it like a specialized worker: one agent might fetch data from an API, another might monitor security. Agents can work alone or together.

### MCP (Model Context Protocol)
A standard way for AI models to connect to external tools and data sources. Instead of building custom integrations for every service, MCP provides a shared protocol - like a universal adapter - so AI systems can talk to databases, APIs, files, and other resources through a consistent interface.

### MCP Server
A program that exposes tools, data, or services to an AI model using the MCP protocol. For example, an MCP server might give an AI model the ability to read files, query a database, or call an API. The server handles the connection details so the AI model doesn't have to.

### Blueprint
In this project, a blueprint is a reusable pattern or template for building agents. MCPBlueprint provides the structure and patterns - you fill in the specifics for your platform.

---

## Security and Safety

### Guardrail
A safety mechanism that watches what agents are doing and enforces rules. It can either alert you when something looks wrong (alert mode) or actively block the action (intervene mode). Think of it as a security guard for your agents.

### Risk Scanner
A tool that analyzes your codebase before deployment to find potential security or configuration problems. It looks for things like exposed credentials, overly broad permissions, and missing authentication. Its findings become the rules your guardrail enforces.

### Risk Profile
The output of the risk scanner - a structured report listing every potential issue found in your code, organized by category and severity. This file drives your guardrail's rule set.

### PII (Personally Identifiable Information)
Any data that could identify a specific person - names, email addresses, phone numbers, social security numbers, etc. The risk scanner flags PII exposure because leaking it creates legal and privacy risks.

---

## Agent Communication

### Correlation ID
A unique identifier that follows a request as it moves between multiple agents. If Agent A calls Agent B, which calls Agent C, they all share the same correlation ID. This makes it possible to trace a single request across your entire system when debugging.

### Agent Registry
A central directory that keeps track of all your agents - where they live, what they do, and whether they're currently active. Agents look each other up in the registry instead of using hardcoded addresses.

### Agent Bus
The communication system agents use to talk to each other. Every message sent between agents is wrapped in a standard format (called a message envelope) that includes who sent it, who it's for, and the correlation ID.

### Message Envelope
The standard wrapper around every message agents send to each other. It includes metadata like the sender, the target, a timestamp, and the correlation ID - similar to how a postal envelope has a return address and destination.

### Fire-and-Forget
A communication pattern where a message is sent without waiting for a response. In MCPBlueprint, agents report to the guardrail this way so security logging never slows down the agent's actual work.

### Webhook
A way for one service to automatically notify another when something happens. Instead of constantly asking "did anything change?", a webhook says "I'll call you when something changes."

---

## Authentication

### Bearer Token
A password-like string that proves a request is authorized. When one service calls another, it includes this token in the request header. If the token is valid, the request is allowed through.

### OAuth
A standard protocol that lets users grant limited access to their accounts on one service to another service, without sharing their password. For example, letting an agent access a user's data with their permission.

---

## Infrastructure

### Serverless
A way of running code in the cloud where you don't manage any servers yourself. You upload your code, and the cloud provider (in this case Vercel) runs it on demand. You only pay for the time your code is actually executing.

### API (Application Programming Interface)
A way for two programs to talk to each other. When one program needs data or functionality from another, it makes an API call - a structured request that follows agreed-upon rules - and gets a structured response back.

---

## Project-Specific Terms

### Onboarding Flow
The 11-question setup process that asks about your platform and automatically generates configuration files based on your answers. It replaces manual configuration with guided setup.

### Soft-Disable
Turning off an agent through a configuration flag rather than deleting its code. The agent stays in the codebase but stops running. Turning it back on is just flipping the flag.
