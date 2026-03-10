# Tool Design Guide

## Why Tool Design Matters

The risk scanner finds what is at risk. The guardrail agent protects against it. But neither of those things helps if your tools are poorly designed to begin with.

How you define a tool - its name, its description, its parameter boundaries - directly determines how reliably it gets used. A well-designed tool gets called correctly the first time. A poorly designed one gets called wrong, returns unexpected results, and creates exactly the kind of unpredictable agent behavior the guardrail is there to catch.

Get the tool design right and you reduce guardrail noise significantly. Get it wrong and you are debugging agent behavior instead of building your platform.

---

## The Three Rules of Good Tool Design

### 1. Name it for what it does, not what it is

Bad: `employee_tool`
Good: `search_employee_directory`

The name is the first signal an agent uses to decide whether to call your tool. Make it a verb-noun pair that describes the action clearly. If someone reading the name cannot immediately understand what the tool does, rename it.

### 2. Write descriptions for the agent, not for yourself

The description is not documentation for developers. It's the instruction the agent reads to decide when and how to call your tool. Write it that way.

Bad description:
```
Returns employee data from the database.
```

Good description:
```
Search the internal employee directory by name, email, or role.
Returns matching employees with department and reporting structure.
Use this when the request involves finding a person, understanding team structure, or identifying who owns a project.
```

The good version tells the agent what the tool returns, what inputs it needs, and explicitly when to use it. That last part - "use this when" - is the most important line you will write.

### 3. Scope parameters tightly

Every parameter your tool accepts is a surface area for unexpected input. Keep parameters to what the tool actually needs, validate everything with a schema, and be explicit about what is optional versus required.

```json
{
  "query": "required - search term, employee name or role",
  "department": "optional - filter results to a specific department",
  "limit": "optional - max results to return, default 25, max 100"
}
```

Do not accept open-ended parameters like `filters: object` or `options: any`. The more flexible the input, the harder it is for the agent to use correctly and the harder it is for the guardrail to monitor.

---

## Parameter Validation

Every tool in MCPBlueprint should validate its parameters before doing anything else. Do not trust that inputs arrive in the shape you expect - validate them explicitly and return a clear error if they do not.

For each parameter define:
- Type (string, number, boolean, enum)
- Whether it is required or optional
- Any constraints (max length, allowed values, format)
- A plain description the agent can read

Example parameter definition:
```json
{
  "status": {
    "type": "enum",
    "values": ["active", "completed", "on_hold"],
    "required": true,
    "description": "Project status to filter by - must be one of: active, completed, on_hold"
  }
}
```

Strict validation at the parameter level means fewer unexpected calls reaching your data layer, which means fewer guardrail alerts, which means less noise to sort through.

---

## Handling Empty Results

Always handle the case where a tool returns nothing. Do not return an empty array and leave the agent to interpret it. Return a clear, specific message.

Bad:
```json
{ "results": [] }
```

Good:
```json
{ "message": "No active projects found in the Engineering department." }
```

The specific message gives the agent something to work with. The empty array gives it nothing - and an agent given nothing tends to retry, which is exactly the loop pattern the scanner flags.

---

## One Tool, One Job

A tool that does multiple things is a tool that gets called for the wrong reason. If you find yourself writing "and" in a tool description, split it into two tools.

Bad: `get_employee_and_projects` - finds an employee and returns their project assignments
Good: `search_employees` - finds employees by name, role, or department
Good: `get_employee_projects` - returns projects assigned to a specific employee ID

Separate tools with clear boundaries are easier to monitor, easier to scope in the guardrail, and easier to debug when something goes wrong.

---

## Authentication at the Tool Level

Every tool that touches internal or sensitive data needs to verify who is calling it before doing anything else. Do not rely on network-level auth alone.

At the tool level, verify:
- Is there a valid session or token attached to this request?
- Does the caller have permission to access this specific data?
- Is the scope of the request within what this caller is allowed to do?

If any of these fail, return a clear auth error immediately. Do not partially process the request and then fail - fail fast, fail clearly.

This is one of the patterns the risk scanner's auth-patterns rule checks for. Tools that skip the per-call auth check show up as findings.

---

## Output Formatting

Return structured, readable output. The agent needs to reason about what your tool returns - make that easy.

- Use consistent field names across all tools
- Return only the fields the caller actually needs - not the full database row
- Format dates, IDs, and status values consistently
- Never return raw database objects with internal fields exposed

What you return from a tool is a potential data exposure surface. The risk scanner's data-exposure rule flags tools that return more fields than declared in their definition. Keep return payloads tight and intentional.

---

## Testing Your Tools

Each agent folder in MCPBlueprint includes a `test.md` checklist. For tool design specifically, add these checks:

- [ ] Tool name clearly describes the action
- [ ] Description includes a "use this when" statement
- [ ] All parameters are typed and validated
- [ ] Empty results return a descriptive message, not an empty array
- [ ] Auth check runs before any data access
- [ ] Return payload contains only declared fields
- [ ] Tool does exactly one thing

If any box is unchecked, fix the tool before activating it. A tool that fails these checks is a guardrail alert waiting to happen.
