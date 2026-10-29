/**
 * src/pres/CatalogPicker.tsx — a search box with a list of results to pick from (U5 BR4.1,
 * BR4.2, BR6.1; NFR9.14; frontend-components "CatalogPicker").
 *
 * Shared by the order screens' customer picker and per-line variant picker. It knows nothing
 * of customers or products: the screen passes
 *   - `search(q)`: the matches for the typed text, or null when the search failed (the screen
 *     loads them through a prop from the router, so this component never reaches the API
 *     client, U2 F-01);
 *   - `renderItem` and `itemKey`, and `onPick`, called with the chosen item.
 * Typing searches after 300 ms (the same pause as SearchBox) once at least `minChars`
 * characters are typed; an answer that arrives after a newer search is dropped, so the list
 * always shows the latest text's matches. A native input with `role="combobox"` controls a
 * `role="listbox"`: ArrowDown / ArrowUp move the active option, Enter picks it, Escape closes
 * the list (NFR9.14). Every option and the input carry a `data-testid`. Copy comes in through
 * props, already in the person's language, with Bangla digits where the screen wants them.
 */
import * as React from "react";

export const PICKER_DEBOUNCE_MS = 300;

export interface CatalogPickerProps<T> {
  readonly label: string;
  readonly placeholder: string;
  readonly search: (q: string) => Promise<ReadonlyArray<T> | null>;
  readonly renderItem: (item: T) => React.ReactNode;
  readonly itemKey: (item: T) => string;
  readonly onPick: (item: T) => void;
  /** Shown when a search found nothing. */
  readonly emptyText: string;
  /** Shown when a search failed. */
  readonly failedText: string;
  readonly testId: string;
  readonly minChars?: number;
}

type Found<T> =
  | { readonly phase: "idle" }
  | { readonly phase: "done"; readonly items: ReadonlyArray<T> }
  | { readonly phase: "failed" };

export const CatalogPicker = <T,>({
  label,
  placeholder,
  search,
  renderItem,
  itemKey,
  onPick,
  emptyText,
  failedText,
  testId,
  minChars = 1,
}: CatalogPickerProps<T>): React.ReactElement => {
  const [text, setText] = React.useState("");
  const [found, setFound] = React.useState<Found<T>>({ phase: "idle" });
  const [active, setActive] = React.useState(0);
  const latest = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = `${testId}-list`;

  React.useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const run = async (q: string): Promise<void> => {
    const ticket = ++latest.current;
    const items = await search(q);
    if (ticket !== latest.current) return; // a newer search has been started
    setActive(0);
    setFound(items === null ? { phase: "failed" } : { phase: "done", items });
  };

  const onType = (next: string): void => {
    setText(next);
    if (timer.current !== null) clearTimeout(timer.current);
    if (next.trim().length < minChars) {
      latest.current += 1;
      setFound({ phase: "idle" });
      return;
    }
    timer.current = setTimeout(() => void run(next.trim()), PICKER_DEBOUNCE_MS);
  };

  const pick = (item: T): void => {
    onPick(item);
    latest.current += 1;
    setText("");
    setFound({ phase: "idle" });
  };

  const items = found.phase === "done" ? found.items : [];
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown" && items.length > 0) {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp" && items.length > 0) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      // Enter inside a form must never submit the order: it picks, or does nothing.
      e.preventDefault();
      const chosen = items[active];
      if (chosen !== undefined) pick(chosen);
    } else if (e.key === "Escape") {
      latest.current += 1;
      setFound({ phase: "idle" });
    }
  };

  const open = found.phase !== "idle";
  return (
    <div className="picker" data-testid={testId}>
      <label htmlFor={`${testId}-input`}>{label}</label>
      <input
        id={`${testId}-input`}
        data-testid={`${testId}-input`}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        {...(open && items[active] !== undefined
          ? { "aria-activedescendant": `${listId}-${itemKey(items[active] as T)}` }
          : {})}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKey}
      />
      {found.phase === "failed" ? (
        <p role="alert" className="picker__note" data-testid={`${testId}-failed`}>
          {failedText}
        </p>
      ) : null}
      {found.phase === "done" && items.length === 0 ? (
        <p className="picker__note" data-testid={`${testId}-empty`}>
          {emptyText}
        </p>
      ) : null}
      <ul id={listId} role="listbox" aria-label={label} className="picker__list" hidden={!open}>
        {items.map((item, i) => (
          <li
            key={itemKey(item)}
            id={`${listId}-${itemKey(item)}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? "picker__option picker__option--active" : "picker__option"}
            data-testid={`${testId}-option`}
            data-key={itemKey(item)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pick(item)}
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </div>
  );
};
