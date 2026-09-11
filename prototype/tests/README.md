# Prototype verification harnesses

    npm install
    npm test          # smoke + truth + flows + classes + contrast + story coverage
    npm run shots     # real-browser screenshots into ./shots (needs Chrome)
    npm run measure   # computed boxes and padding from a real browser

Eight harnesses, kept separate because **each one is blind to what the others catch**. That is the whole design; collapsing them into one runner would lose the property.

| Harness | Catches | Blind to |
| --- | --- | --- |
| `smoke.js` | Runtime errors across every route × device × language × Role, and every click | Anything that renders without throwing — a wrong figure, a leaked figure, a Latin digit |
| `truth.js` | The three claims a render test cannot make: that every figure is the sum of its rows, that a gated Role reaches no figure on **any** route, and that a Bangla view prints Bangla digits | Layout, async states, and anything about how a screen looks |
| `flows.js` | Multi-step behaviour: that a settlement file's declared total equals the sum of its rows, that a timeline runs forwards, that a parsed item takes its own colour | Anything not scripted as a flow — and every figure it does not itself total |
| `classes.js` | Elements carrying a class no CSS rule reaches, including a **state modifier** joined to no base class | Async states, which never render in a synchronous pass |
| `contrast.js` | Contrast floors computed off `tokens.css`, drift between those tokens and `DESIGN.md`, and any control whose resting boundary resolves through the cascade to a ruled-line token | Colour applied at runtime — it reads the source, so an inline style or a value set in JS is invisible to it |
| `story-coverage.js` | Exact `epics.md` ID/title parity and a rendered, addressable prototype frame with the designed state, three proof points, and primary action for all 76 stories | Visual composition and browser layout |
| `shot.js` | What the others cannot see at all: specificity collisions, overflow, type, and copy that is correct but does not fit | Arithmetic — never read a figure off a screenshot |
| `measure.js` | Real box geometry and computed padding | Meaning |

Two rules learned the hard way, both load-bearing:

**Never dispatch `DOMContentLoaded` yourself.** `app.js` defers boot to that event and jsdom fires its own. Dispatching it means two boots, the click delegation attaches twice, and every toggle silently becomes a no-op — a whole passing run that proves nothing. `boot.js` instead yields until `readyState` leaves `loading`, then asserts the delegation is wired exactly once and aborts if it is not.

**Never read a number off a screenshot.** Bangla digits have been misread three times. Arithmetic is checked in a jsdom boot or not at all — `truth.js` is where it is checked. Contrast is the same kind of claim and gets the same treatment: `contrast.js` computes the ratios rather than trusting an eye, because a caption at 2.9:1 looks *quiet* rather than broken and every other harness passes right through it.

Two rules `truth.js` holds to, for the same reason:

**It restates the specification rather than importing it.** The recognition rule and the profit formula are written out in the test. A test that reads the same map the product reads cannot notice the map changing, so flipping `EARNED` or dropping a component from `profit` has to fail here — and only an independent statement of the answer makes that possible. The same logic applies to direction: the profit identity recomputes from `econ()`'s own fields, so it survives a sign error in a component. Signs are asserted separately.

**Gating is asserted by absence, over every route.** Not by the presence of a lock on the one route someone remembered. The leak this harness was written for lived on a Role-adaptive screen that carried no `money` flag, so no per-screen check could have seen it. It also asserts the inverse — that the Owner still reaches the audit trail and the daily card — because a gate that hides a surface from everyone passes an absence test and fails the product.

Every assertion in `truth.js` has been checked by mutation: each defect it was written for was reintroduced one at a time, and each was caught. Two early versions of it were not — a self-consistent `1 of 1` completeness claim and a flipped `returnLoss` both passed — which is how those two assertions came to exist. **A passing test that cannot fail is worth nothing; mutate it before trusting it.**

Device, language and Role are chrome toggles rather than URL state, so a static `chrome --screenshot` only ever sees phone/Bangla/owner. `shot.js` and `measure.js` therefore drive a real Chrome over the DevTools Protocol (ports 9333 and 9334) and flip the controls the way a person would.
