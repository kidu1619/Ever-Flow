export type EventStatus =
  | "Draft"
  | "Planning"
  | "Preparation"
  | "Execution"
  | "Completed"
  | "Closed"
  | "Cancelled";

export const EVENT_STATUSES: EventStatus[] = [
  "Draft",
  "Planning",
  "Preparation",
  "Execution",
  "Completed",
  "Closed",
  "Cancelled",
];

// Valid State Transitions (FR-13)
export const VALID_STATUS_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  Draft: ["Planning", "Cancelled"],
  Planning: ["Preparation", "Draft", "Cancelled"],
  Preparation: ["Execution", "Planning", "Cancelled"],
  Execution: ["Completed", "Preparation", "Cancelled"],
  Completed: ["Closed", "Execution"],
  Closed: ["Completed"], // Can reopen for adjustments if needed
  Cancelled: ["Draft", "Planning"], // Can restore to draft or planning
};

export const STATUS_DESCRIPTIONS: Record<EventStatus, string> = {
  Draft: "Initial event concept and preliminary budget planning.",
  Planning: "Active vendor sourcing, timeline drafting, and stakeholder alignment.",
  Preparation: "Contracts locked, run-sheet finalized, ready for on-site load-in.",
  Execution: "Event is live or currently taking place on site.",
  Completed: "Event successfully concluded; post-event review and reconciliation.",
  Closed: "All work and payments settled; event archived read-only.",
  Cancelled: "Event has been called off or cancelled.",
};

/**
 * Validates whether transitioning from current status to next status is permitted.
 */
export function isValidStatusTransition(
  currentStatus: EventStatus,
  targetStatus: EventStatus
): { valid: boolean; reason?: string } {
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    return {
      valid: false,
      reason: `Illegal state transition: cannot move event directly from '${currentStatus}' to '${targetStatus}'. Allowed transitions from '${currentStatus}' are: ${allowed ? allowed.join(", ") : "none"}.`,
    };
  }

  return { valid: true };
}

/**
 * Returns available next statuses for a given event status
 */
export function getAvailableNextStatuses(currentStatus: EventStatus): EventStatus[] {
  return [...(VALID_STATUS_TRANSITIONS[currentStatus] || [])];
}
