import { disableTool } from "eve/tools";

/**
 * No shell, no sandbox files, on purpose.
 *
 * Nothing authored in any agent touches the sandbox, no skill or instruction
 * mentions these tools, and the one measured use of `bash` was a booking turn
 * wandering off to do date arithmetic a tool already does. Meanwhile fare
 * payloads and forwarded emails — untrusted external data — sit in the same
 * context as the shell. A capability nobody needs next to input nobody vets
 * is only ever a liability, and removing the schemas also lightens every
 * single model step.
 */
export default disableTool();
