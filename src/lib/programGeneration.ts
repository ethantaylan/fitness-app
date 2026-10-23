import type { GenerationState } from "./generationContext";
import type { Program, UserProfile } from "./types";

interface DraftStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface PendingProgram {
  version: 1;
  userId: string;
  programId: string;
  program: Program;
}

interface GenerationOptions {
  userId: string | null;
  storage: DraftStorage | null;
  generate: (profile: UserProfile, requestId?: string, signal?: AbortSignal) => Promise<Program>;
  durableGeneration?: boolean;
  persist: (program: Program, programId: string) => Promise<void>;
  onReady: () => void;
}

export class ProgramRequestError extends Error {
  readonly terminal: boolean;
  constructor(message: string, terminal = false) {
    super(message);
    this.terminal = terminal;
  }
}

interface RemoteDraft {
  userId: string;
  requestId: string;
  profile: UserProfile;
}

function remoteKey(userId: string) {
  return `Vincere_generation_job_${userId}`;
}

function readRemote(storage: DraftStorage | null, userId: string | null): RemoteDraft | null {
  if (!storage || !userId) return null;
  try {
    const value = JSON.parse(storage.getItem(remoteKey(userId)) ?? "null") as RemoteDraft | null;
    return value?.userId === userId &&
      /^[0-9a-f-]{36}$/i.test(value.requestId) &&
      value.profile &&
      typeof value.profile === "object"
      ? value
      : null;
  } catch {
    return null;
  }
}

function draftKey(userId: string) {
  return `Vincere_pending_program_${userId}`;
}

export function clearPendingProgram(storage: DraftStorage | null, userId: string) {
  try {
    storage?.removeItem(draftKey(userId));
    storage?.removeItem(remoteKey(userId));
  } catch {
    // Storage can be unavailable in private browsing or when the device is full.
  }
}

function readDraft(storage: DraftStorage | null, userId: string | null): PendingProgram | null {
  if (!storage || !userId) return null;
  try {
    const raw = storage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<PendingProgram> | null;
    if (
      draft?.version !== 1 ||
      draft.userId !== userId ||
      typeof draft.programId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.programId) ||
      !draft.program?.program_overview ||
      !Array.isArray(draft.program.weeks)
    ) {
      return null;
    }
    return draft as PendingProgram;
  } catch {
    return null;
  }
}

/** Keeps a received result until its idempotent save succeeds, including across reloads. */
export class ProgramGeneration {
  private readonly options: GenerationOptions;
  private readonly listeners = new Set<() => void>();
  private pending: PendingProgram | null;
  private profile: UserProfile | null = null;
  private busy = false;
  private active = true;
  private durable = false;
  private remote: RemoteDraft | null = null;
  private controller: AbortController | null = null;
  private state: GenerationState;

  constructor(options: GenerationOptions) {
    this.options = options;
    this.pending = readDraft(options.storage, options.userId);
    this.remote = options.durableGeneration ? readRemote(options.storage, options.userId) : null;
    this.profile = this.remote?.profile ?? null;
    this.durable = this.pending !== null;
    this.state = this.pending
      ? {
          phase: "error",
          hasPendingProgram: true,
          message:
            "Ton programme est conservé sur cet appareil. Reprends son enregistrement sans le régénérer.",
        }
      : this.remote
        ? { phase: "running" }
        : { phase: "idle" };
  }

  getState = (): GenerationState => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  activate() {
    this.active = true;
    if (this.remote && !this.pending) void this.run();
  }

  dispose() {
    this.active = false;
    this.controller?.abort();
  }

  private update(state: GenerationState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  private cacheDraft() {
    if (!this.pending || !this.options.storage) return false;
    try {
      this.options.storage.setItem(draftKey(this.pending.userId), JSON.stringify(this.pending));
      return true;
    } catch {
      return false;
    }
  }

  start = (profile: UserProfile) => {
    if (!this.active || this.busy || this.pending || this.remote) return;
    this.profile = profile;
    void this.run();
  };

  retry = () => {
    void this.run();
  };

  dismiss = () => {
    // A received, paid result must never be discarded by dismissing an error.
    if (this.busy || this.pending || this.remote) return;
    this.profile = null;
    this.update({ phase: "idle" });
  };

  private async run() {
    if (!this.active || this.busy || (!this.profile && !this.pending)) return;
    if (!this.options.userId) {
      this.update({
        phase: "error",
        hasPendingProgram: false,
        message: "Connecte-toi pour créer ton programme.",
      });
      return;
    }
    this.busy = true;
    this.controller = new AbortController();
    try {
      if (!this.pending && this.profile) {
        this.update({ phase: "running" });
        if (this.options.durableGeneration && !this.remote) {
          this.remote = {
            userId: this.options.userId,
            requestId: crypto.randomUUID(),
            profile: this.profile,
          };
          try {
            this.options.storage?.setItem(
              remoteKey(this.options.userId),
              JSON.stringify(this.remote),
            );
          } catch {
            /* Server work continues even if local storage is unavailable. */
          }
        }
        const result = await this.options.generate(
          this.profile,
          this.remote?.requestId,
          this.controller.signal,
        );
        if (!this.active) return;
        this.pending = {
          version: 1,
          userId: this.options.userId,
          programId: result.program_id ?? this.remote?.requestId ?? crypto.randomUUID(),
          program: {
            ...result,
            user_profile: result.user_profile ?? this.profile,
            generated_at: new Date().toISOString(),
          },
        };
      }
      if (!this.pending || !this.active) return;
      // Write before the first network save, so a lost response can be retried with the same ID.
      this.durable = this.cacheDraft();
      this.update({ phase: "saving" });
      await this.options.persist(this.pending.program, this.pending.programId);
      if (!this.active) return;
      clearPendingProgram(this.options.storage, this.options.userId);
      this.pending = null;
      this.remote = null;
      this.profile = null;
      this.update({ phase: "idle" });
      this.options.onReady();
    } catch (error) {
      if (!this.active) return;
      if (error instanceof ProgramRequestError && error.terminal && !this.pending) {
        this.remote = null;
        try {
          this.options.storage?.removeItem(remoteKey(this.options.userId));
        } catch {
          /* best effort */
        }
      }
      this.update({
        phase: "error",
        hasPendingProgram: this.pending !== null,
        ...(this.remote ? { hasRemoteJob: true } : {}),
        message: this.pending
          ? this.durable
            ? "Ton programme est créé et conservé sur cet appareil. Réessaie son enregistrement sans le régénérer."
            : "Ton programme est créé, mais son enregistrement a échoué. Garde cette page ouverte et réessaie pour ne pas le perdre."
          : this.remote
            ? "Le suivi a été interrompu. Reprends-le pour retrouver la création côté serveur, sans en lancer une autre."
            : error instanceof Error
              ? error.message
              : "La génération n'a pas abouti. Réessaie.",
      });
    } finally {
      this.busy = false;
    }
  }
}
