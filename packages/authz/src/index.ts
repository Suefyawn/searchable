/**
 * @jet/authz: one policy matrix and one `can()` (ADR-47). Who may do what to which resource lives here as data,
 * not scattered through route handlers. Actors are the site's roles; `anonymous` is a visitor without a session.
 * A condition narrows a grant: `own` means the actor owns the thing (their post, their business through an
 * approved claim, their order). The matrix is exhaustive: anything not granted is denied.
 */
export type Actor = "anonymous" | "user" | "business_owner" | "editor" | "admin";
export type Resource =
  | "article"
  | "business"
  | "professional"
  | "post"
  | "comment"
  | "review"
  | "claim"
  | "order"
  | "profile"
  | "newsletter"
  | "data"
  | "front"
  | "media"
  | "inbox"
  | "report"
  | "jobs"
  | "settings"
  | "user"
  | "api_key"
  | "search";
export type Operation = "read" | "create" | "update" | "publish" | "moderate" | "delete" | "respond" | "buy";
export type Condition = "own";
export type Context = { own?: boolean };

const RANK: Record<Actor, number> = { anonymous: 0, user: 1, business_owner: 2, editor: 3, admin: 4 };

/** A grant: the least actor that may do it, plus an optional condition that lower actors must meet. */
type Grant = { atLeast: Actor; unless?: Actor; when?: Condition };

/**
 * `atLeast` grants the operation to that actor and everyone above. `when: "own"` with `unless` means actors
 * below `unless` need the condition (they may act on their own things), while `unless` and above may act on any.
 */
export const MATRIX: Record<Resource, Partial<Record<Operation, Grant>>> = {
  article: { read: { atLeast: "anonymous" }, create: { atLeast: "editor" }, update: { atLeast: "editor" }, publish: { atLeast: "editor" }, delete: { atLeast: "editor" } },
  business: {
    read: { atLeast: "anonymous" },
    create: { atLeast: "anonymous" }, // a public submission lands in the queue as pending
    update: { atLeast: "user", when: "own", unless: "editor" },
    moderate: { atLeast: "editor" },
    delete: { atLeast: "editor" },
  },
  professional: { read: { atLeast: "anonymous" }, create: { atLeast: "user" }, update: { atLeast: "user", when: "own", unless: "editor" }, moderate: { atLeast: "editor" } },
  post: { read: { atLeast: "anonymous" }, create: { atLeast: "user" }, update: { atLeast: "user", when: "own", unless: "editor" }, delete: { atLeast: "user", when: "own", unless: "editor" }, moderate: { atLeast: "editor" } },
  comment: { read: { atLeast: "anonymous" }, create: { atLeast: "user" }, delete: { atLeast: "user", when: "own", unless: "editor" }, moderate: { atLeast: "editor" } },
  review: { read: { atLeast: "anonymous" }, create: { atLeast: "anonymous" }, respond: { atLeast: "user", when: "own", unless: "editor" }, moderate: { atLeast: "editor" } },
  claim: { create: { atLeast: "user" }, moderate: { atLeast: "editor" } },
  order: { read: { atLeast: "user", when: "own", unless: "admin" }, buy: { atLeast: "user" }, update: { atLeast: "admin" } },
  profile: { read: { atLeast: "anonymous" }, update: { atLeast: "user", when: "own", unless: "admin" } },
  newsletter: { create: { atLeast: "anonymous" }, update: { atLeast: "editor" }, publish: { atLeast: "editor" }, read: { atLeast: "editor" } },
  data: { read: { atLeast: "anonymous" }, update: { atLeast: "editor" }, delete: { atLeast: "editor" } },
  front: { read: { atLeast: "editor" }, update: { atLeast: "editor" } },
  media: { create: { atLeast: "user", when: "own", unless: "editor" }, read: { atLeast: "editor" } },
  inbox: { read: { atLeast: "editor" }, update: { atLeast: "editor" }, respond: { atLeast: "editor" } },
  report: { create: { atLeast: "anonymous" }, read: { atLeast: "editor" }, moderate: { atLeast: "editor" } },
  jobs: { update: { atLeast: "editor" } },
  settings: { read: { atLeast: "admin" }, update: { atLeast: "admin" } },
  user: { read: { atLeast: "admin" }, create: { atLeast: "admin" }, update: { atLeast: "admin" }, delete: { atLeast: "admin" } },
  api_key: { read: { atLeast: "admin" }, create: { atLeast: "admin" }, delete: { atLeast: "admin" } },
  search: { read: { atLeast: "anonymous" } },
};

/** The one question: may `actor` perform `op` on `resource`, given what we know about ownership? */
export function can(actor: Actor | null | undefined, op: Operation, resource: Resource, ctx: Context = {}): boolean {
  const who: Actor = actor ?? "anonymous";
  const grant = MATRIX[resource]?.[op];
  if (!grant) return false;
  if (RANK[who] < RANK[grant.atLeast]) return false;
  if (grant.when === "own" && grant.unless && RANK[who] < RANK[grant.unless]) return ctx.own === true;
  return true;
}

export const ACTORS = Object.keys(RANK) as Actor[];
export const RESOURCES = Object.keys(MATRIX) as Resource[];
export const OPERATIONS: Operation[] = ["read", "create", "update", "publish", "moderate", "delete", "respond", "buy"];

/** True when `actor` ranks at least `role` (the site's old hasRole, expressed on the same axis). */
export function atLeast(actor: Actor | null | undefined, role: Actor): boolean {
  return RANK[actor ?? "anonymous"] >= RANK[role];
}
