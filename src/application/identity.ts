import type { Actor, Profile } from "../domain/model";
import { failure, type Result, success } from "../domain/result";
import { executeCommand } from "./command";
import type {
  Clock,
  Command,
  IdentityVerifier,
  IdSource,
  RandomSource,
  TransactionStore,
} from "./ports";

export const PROFILE_ICONS = [
  "owl",
  "fox",
  "frog",
  "cat",
  "whale",
  "bee",
] as const;
export type OwnProfile = Omit<Profile, "providerSubject">;
export function ownProfile(profile: Profile): OwnProfile {
  const { providerSubject: _private, ...view } = profile;
  return view;
}
export type LoginChallenge = {
  state: string;
  nonce: string;
  pkceVerifier: string;
};
export interface OidcProvider extends IdentityVerifier {
  authorization(challenge: LoginChallenge): Promise<Result<string>>;
}
export interface SecretSource {
  token(): string;
  hash(value: string): string;
}
export interface IdentityRepository {
  guest(
    credentialHash: string,
    draft: Profile,
    sessionHash: string,
    now: number,
  ): Promise<Result<Profile>>;
  member(
    identity: { issuer: string; subject: string },
    draft: Profile,
    sessionHash: string,
    now: number,
  ): Promise<Result<Profile>>;
  session(
    sessionHash: string,
    now: number,
  ): Promise<Result<{ profile: Profile; actor: Actor }>>;
  revoke(sessionHash: string): Promise<Result<undefined>>;
  saveChallenge(
    keyHash: string,
    challenge: LoginChallenge,
    dueAt: number,
  ): Promise<Result<undefined>>;
  takeChallenge(keyHash: string, now: number): Promise<Result<LoginChallenge>>;
}

export class IdentityService {
  constructor(
    private repository: IdentityRepository,
    private secrets: SecretSource,
    private ids: IdSource,
    private random: RandomSource,
    private clock: Clock,
    private oidc: OidcProvider | null,
  ) {}
  private alias(kind: Profile["kind"]): string {
    const words = [
      "Cedar",
      "Oak",
      "Maple",
      "Willow",
      "Pine",
      "Elm",
      "Birch",
      "Aspen",
    ];
    return `${kind === "guest" ? "Guest" : "Player"} ${words[this.random.integer(0, words.length - 1)]} ${this.secrets.token().slice(0, 6)}`;
  }
  private profile(
    kind: Profile["kind"],
    subject: string | null = null,
  ): Profile {
    return {
      id: this.ids.next(),
      version: 0,
      kind,
      providerSubject: subject,
      alias: this.alias(kind),
      icon: "owl",
      publicLeaderboard: kind === "member",
      wins: 0,
      points: 0,
      earliestWinAt: null,
    };
  }
  async guest(credential: unknown): Promise<
    Result<{
      profile: OwnProfile;
      sessionToken: string;
      guestCredential: string;
    }>
  > {
    if (
      credential !== null &&
      credential !== undefined &&
      (typeof credential !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(credential))
    )
      return failure("VALIDATION_ERROR");
    const guestCredential =
      typeof credential === "string" ? credential : this.secrets.token();
    const sessionToken = this.secrets.token();
    const result = await this.repository.guest(
      this.secrets.hash(guestCredential),
      this.profile("guest"),
      this.secrets.hash(sessionToken),
      this.clock.now(),
    );
    return result.ok
      ? success({
          profile: ownProfile(result.value),
          sessionToken,
          guestCredential,
        })
      : result;
  }
  async session(token: string | null) {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      return failure("NOT_AUTHENTICATED");
    const resolved = await this.repository.session(
      this.secrets.hash(token),
      this.clock.now(),
    );
    return resolved.ok
      ? success({
          profile: ownProfile(resolved.value.profile),
          actor: resolved.value.actor,
        })
      : resolved;
  }
  async logout(token: string | null) {
    return token && /^[A-Za-z0-9_-]{43}$/.test(token)
      ? this.repository.revoke(this.secrets.hash(token))
      : success(undefined);
  }
  async beginLogin() {
    if (!this.oidc) return failure("TEMPORARY_UNAVAILABLE");
    const browserToken = this.secrets.token();
    const challenge = {
      state: this.secrets.token(),
      nonce: this.secrets.token(),
      pkceVerifier: this.secrets.token(),
    };
    const authorization = await this.oidc.authorization(challenge);
    if (!authorization.ok) return authorization;
    const saved = await this.repository.saveChallenge(
      this.secrets.hash(browserToken),
      challenge,
      this.clock.now() + 600000,
    );
    return saved.ok
      ? success({ url: authorization.value, browserToken })
      : saved;
  }
  async completeLogin(
    browserToken: string | null,
    code: string | null,
    state: string | null,
  ) {
    if (
      !this.oidc ||
      !browserToken ||
      !/^[A-Za-z0-9_-]{43}$/.test(browserToken)
    )
      return failure("NOT_AUTHENTICATED");
    // Consume before validation: failed or replayed callbacks cannot reuse the browser challenge.
    const stored = await this.repository.takeChallenge(
      this.secrets.hash(browserToken),
      this.clock.now(),
    );
    if (
      !stored.ok ||
      !code ||
      code.length > 4096 ||
      !state ||
      state.length > 256
    )
      return failure("NOT_AUTHENTICATED");
    const verified = await this.oidc.verify({
      code,
      state,
      expectedState: stored.value.state,
      nonce: stored.value.nonce,
      pkceVerifier: stored.value.pkceVerifier,
    });
    if (!verified.ok) return verified;
    const sessionToken = this.secrets.token();
    const result = await this.repository.member(
      verified.value,
      this.profile("member", verified.value.subject),
      this.secrets.hash(sessionToken),
      this.clock.now(),
    );
    return result.ok
      ? success({ profile: ownProfile(result.value), sessionToken })
      : result;
  }
  async preferences(
    command: Command,
    actor: Actor,
    input: {
      icon?: unknown;
      publicLeaderboard?: unknown;
      regenerateAlias?: unknown;
    },
    store: TransactionStore<Profile>,
  ) {
    if (
      command.actorId !== actor.profileId ||
      command.aggregateId !== actor.profileId
    )
      return failure("NOT_AUTHORIZED");
    if (
      (input.icon !== undefined &&
        !PROFILE_ICONS.includes(
          input.icon as (typeof PROFILE_ICONS)[number],
        )) ||
      (input.publicLeaderboard !== undefined &&
        typeof input.publicLeaderboard !== "boolean") ||
      (input.regenerateAlias !== undefined &&
        typeof input.regenerateAlias !== "boolean")
    )
      return failure("VALIDATION_ERROR");
    return executeCommand(
      command,
      {
        store,
        clock: this.clock,
        quota: { check: async () => success(undefined) },
      },
      (state, now) => {
        const profile = {
          ...state,
          version: state.version + 1,
          ...(input.icon === undefined ? {} : { icon: input.icon as string }),
          ...(input.publicLeaderboard === undefined
            ? {}
            : { publicLeaderboard: input.publicLeaderboard as boolean }),
          ...(input.regenerateAlias === true
            ? { alias: this.alias(state.kind) }
            : {}),
        };
        return success({
          state: profile,
          result: ownProfile(profile),
          events: [
            {
              id: this.ids.next(),
              aggregateType: "profile",
              aggregateId: state.id,
              version: profile.version,
              schemaVersion: 1,
              type: "ProfileUpdated",
              audience: [actor.profileId],
              payload: { profileId: state.id, changedAt: now },
            },
          ],
          deadlines: [],
          audits: [],
        });
      },
    );
  }
}
