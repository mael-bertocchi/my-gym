# Claude Code Project Guidelines

## Documentation Style

Always use the specific JSDoc/Doxygen hybrid style:

- Use `/** ... */` blocks for constants, interfaces, types, and functions.
- Every block must include `@constant`, `@interface`, `@type`, `@class`, `@method` or `@function`.
- Include a `@description` tag for all items.
- For interfaces/objects, use inline comments for properties: `/*!< Comment text */`

Example:
```typescript
/**
 * @interface User
 * @description Represents a system user
 */
export interface User {
    id: string; /*!< Unique identifier */
}
```

## Coding Standards
- **Types**: Use `interface` for data structures. Use the following wrapper types for nullability:
  - `Maybe<T>` (T | null)
  - `Perhaps<T>` (T | undefined)
- **Type Safety**: Strictly avoid `as` (Type Assertions). Use type guards or `unknown` casting only as a last resort.
- **Logic**: Avoid `===` whenever an equivalent `!==` form exists — write conditionals negative-first (lead the `if` with the `!==` branch, swapping the `if`/`else` bodies; flip ternaries the same way). Keep `===` only when inverting is impossible or would force an awkward double negative (e.g. guards with no `else`, `&&`/`||` chains, boolean assignments, `.filter`/`.find` callbacks).
- **Control Flow**: Never put an `if`/`else` on a single line — always brace the body on its own indented line, even for one statement.
  - *Bad:* `if (x) return;` or `if (x) { return; }`
  - *Good:*
    ```typescript
    if (x) {
        return;
    }
    ```
  - *Exception:* inline handlers inside a single-line JSX attribute stay inline (the HTML/JSX rule wins).
- **Functions**: Explicit return types required (e.g., `: void`, `: Promise<void>`).
- **HTML/JSX**: Every tag (including attributes) must be written on a single line.
  - *Example:* `<button type="button" className="btn" onClick={fn} disabled={val}>`

## Tool & Efficiency Rules

- **Conciseness**: No conversational filler ("Sure," "I've updated..."). No summaries of changes.
- **Context**: Only read external files if strictly necessary for type safety (to avoid `as` assertions).
- **Subagents**: Use fresh subagents per task for better focus.
