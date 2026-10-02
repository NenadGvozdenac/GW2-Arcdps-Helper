export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Where replies go (e.g. the user who sent feedback); default: the sender. */
  replyTo?: string;
}
