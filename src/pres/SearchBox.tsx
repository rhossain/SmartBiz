/**
 * src/pres/SearchBox.tsx — a debounced search field (U4 BR5.1, BR5.2, BR6.8; NFR9.13;
 * frontend-components "SearchBox").
 *
 * The person types; `onSearch` is called 300 ms after the last key (BR5.2), so a list is not
 * reloaded on every keystroke. Enter searches at once. "✕" clears the box and searches for
 * everything. The wrapper is `role="search"`; the input has a visible label, and an optional
 * hint under it (the customer list's "type at least 4 digits", BR5.2) is tied to it with
 * `aria-describedby`. Timers use setTimeout only (no clock read).
 */
import * as React from "react";

export const SEARCH_DEBOUNCE_MS = 300;

export interface SearchBoxProps {
  readonly label: string;
  readonly value: string;
  readonly onSearch: (q: string) => void;
  readonly clearLabel: string;
  readonly hint?: string | null;
  readonly testId?: string;
}

export const SearchBox = ({
  label,
  value,
  onSearch,
  clearLabel,
  hint = null,
  testId = "search",
}: SearchBoxProps): React.ReactElement => {
  const [text, setText] = React.useState(value);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setText(value), [value]);
  React.useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const schedule = (next: string): void => {
    setText(next);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(next), SEARCH_DEBOUNCE_MS);
  };

  const now = (next: string): void => {
    if (timer.current !== null) clearTimeout(timer.current);
    setText(next);
    onSearch(next);
  };

  const hintId = `${testId}-hint`;
  return (
    <div role="search" className="search-box" data-testid={testId}>
      <label htmlFor={`${testId}-input`}>{label}</label>
      <div className="search-box__row">
        <input
          id={`${testId}-input`}
          data-testid={`${testId}-input`}
          type="search"
          value={text}
          maxLength={100}
          {...(hint !== null ? { "aria-describedby": hintId } : {})}
          onChange={(e) => schedule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              now(text);
            }
          }}
        />
        {text !== "" ? (
          <button
            type="button"
            data-testid={`${testId}-clear`}
            aria-label={clearLabel}
            onClick={() => now("")}
          >
            ✕
          </button>
        ) : null}
      </div>
      {hint !== null ? (
        <p id={hintId} data-testid={hintId} className="search-box__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
