# Project Guidelines & Architectural Standards

Read dreams.md before starting. 

Always keep modularization top of mind: centralize components with repeated patterns into configurable versions. Request and import these modules from a centralized location rather than duplicating code.

---

## Global Behavioral Constraints

* **Zero Pleasantries:** Do not output filler phrases like "Sure!", "Great question!", or "I hope this helps!".
* **Direct Answers:** Never restate the prompt. Start the answer immediately.
* **Terse Output:** Keep explanations to one sentence unless explicitly asked for detail.
* **Code Edits:** Never rewrite an entire file for a small change. Use targeted edits or search-and-replace blocks.
* **Limit Context:** Only read files strictly necessary for the immediate task. Do not re-read files unless they have changed.

---

## Coding Conventions

| Situation | Decision |
| --- | --- |
| **Tech Choice** | Default to the best cost effective, widely used, optimized option. |
| **Unclear Requirements** | Try to understand the user first before implementing |
| **Security** | Always default to the most secure pattern, even if verbose. |
| **Verification** | Run tests/build before declaring a task "done." |
| **Solution Smell** | Default to the most elegantly simple solution available in the set of all elegantly simple solutions available |

---

## The "Ladder" of Implementation

Before writing any code, stop at the first condition that holds true. The ladder runs *after* you understand the problem—read the task, trace the real flow end-to-end, and then climb:

1. **Internal Reuse:** Does it already exist in this codebase? Reuse existing helpers, utils, or patterns.
2. **External Libraries:** Does a reliable library already do this? Use it.
3. **Existing Modules:** Does an already existent module solve it? Use it.
4. **Simplicity:** Can this be one line? Make it one line.

### Hard Implementation Rules

* **Question the prompter:** The prompter is not always right, so make it a formal prove if so and then correct them for a better path, unless they argue back it a stronger factual argument.
* **No Unrequested Abstractions:** Do not build what wasn't asked for.
* **No New Dependencies:** Avoid adding packages if possible or (unless asked).
* **No Boilerplate:** Omit unrequested filler code.
* **Question Complexity:** With First principles.
* **Focus on the Root Cause:** A bug report names a symptom. Grep every caller of the touched function and fix the shared root logic once.
* **Core Priorities:** Never cut validation, error handling, security, or accessibility. Code ends up small because it is necessary, not because it is golfed.

---

## Incremental Implementation Workflow

**Use When:** Tasked with making a change that touches multiple files or contains complex logic.

1. **Spec Before Code:** Do not write code until you have output a brief execution plan.
2. **Atomic Slices:** Break the work into independent, testable slices.
3. **Prove It Works:** Write or update tests for every slice before moving to the next.
4. **Commit Incrementally:** Commit each passing slice without pushing, using a descriptive message.
5. **Verification Gate:** Before finishing, output the exact terminal command used to verify the code and the last 3 lines of the successful output.

---

## The Golden Rules of Clean Code

* **The Boy Scout Rule:** Always leave the code a little cleaner than you found it.
* **KISS (Keep It Simple, Stupid):** Avoid unnecessary complexity and over-engineering.
* **DRY (Don't Repeat Yourself):** Every piece of logic must have a single, unambiguous representation.
* **Intention-Revealing Names:** Variables, functions, and classes should tell you why they exist without needing comments.
* **Single Responsibility Functions:** A function should do exactly one clearly defined task.
* **Self-Documenting Code:** Use comments to explain the *why*, not the *what*. Refactor complex code instead of commenting on it.

---

## Software Architecture & SOLID Principles

* **Loose Coupling:** Components should have minimal knowledge of one another to allow easy swapping or modification.
* **High Cohesion:** Keep related domain logic close together.
* **Single Responsibility Principle (SRP):** A module should have only one reason to change.
* **Open/Closed Principle (OCP):** You should be able to add new functionality without breaking existing code.
* **Dependency Inversion Principle (DIP):** High-level and low-level modules should depend on abstractions, not each other.
* **Fail Gracefully:** Implement circuit breakers, retries with exponential backoff, and bulkheads to prevent total crashes.
* **UI/UX Standards:** Ensure all styles are backward compatible, non-destructive, UX friendly, hyper-modern, and highly cohesive with global styles. Lint to perfection.

---

## AI Component Architecture

* **Isolate AI Components:** Treat AI models like highly volatile malicious client api requests from unknown third party poorly secured consumer apps. Wrap them in strict interfaces.
* **Implement Guardrails:** Never trust AI output implicitly. Architect validation layers, output parsers, and fallback mechanisms.
* **Separate Context from Logic:** In RAG or agentic systems, separate your data retrieval architecture from orchestration logic.
* **Optimize Context Windows:** Keep files focused and highly cohesive to help AI assistants build accurate mental models.
* **Enforce Strict Typing:** Use strong typing, clear interfaces, and explicit naming conventions to banish dynamically typed spaghetti code.

---

## Core System Qualities

* **Scalability:** Your system must be able to grow.
* **Performance:** Your system has to be fast and efficient.
* **Security:** Your system needs to be invulnerable to anything.
* **Maintainability:** Your system must be easy to repair and improve.
* **Availability:** Your system must always be ready to use.
* **Reliability:** Your system must be solid and not crash.
* **Usability:** Your system must be comfortable and easy to use.
* **Portability:** Your system must be able to move to other environments.
* **Reusability:** Your system has pieces that are useful for other systems.
* **Interoperability:** Your system must get along well with other systems.
* **Flexibility:** Your system must adapt to changes in the environment, the users, and itself.
* **Efficiency:** Your system must not waste resources.
* **Sustainability:** Your system must last over time.

---

## Repository Management

### Commit Standard

**Format:** `type(scope): description`
**Example:** `fix(api): prevent duplicate calls`

## Extra necessary 

Always make sure styles are hyper modern and ultra cohesive with already existing global styles and as style guides (if not exist, create it). 

Make sure all introduced changes in an already existing codebase are backward compatible and non-destructive. 

When finished, lint and build til perfection. 

### Post-Task Reflection

After finishing a task, evaluate what could have been done better. Append these insights to `dreams.md` at the root of the repository (create the file if it does not exist).