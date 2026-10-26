import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
/** The signed nonce refers to the immutable room/inviter binding held in Postgres. */
export class InvitationSigner {
  constructor(private key: string) {
    if (key.length < 32) throw new Error("Invalid invitation configuration");
  }
  private signature(nonce: string) {
    return createHmac("sha256", this.key)
      .update(`wordpairs.invite.v1.${nonce}`)
      .digest();
  }
  mint() {
    const nonce = randomBytes(32).toString("base64url");
    return `${nonce}.${this.signature(nonce).toString("base64url")}`;
  }
  verify(token: string) {
    if (!/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/.test(token)) return false;
    const [nonce, signature] = token.split(".");
    const bytes = Buffer.from(signature, "base64url");
    return (
      bytes.length === 32 &&
      bytes.toString("base64url") === signature &&
      timingSafeEqual(this.signature(nonce), bytes)
    );
  }
}
