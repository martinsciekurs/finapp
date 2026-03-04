/**
 * Standard return type for all server actions.
 *
 * Convention: server actions never throw to the client — they return
 * `{ success: false, error }` instead.
 */
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
