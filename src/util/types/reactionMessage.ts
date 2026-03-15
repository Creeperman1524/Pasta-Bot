export type ReactionRole = [roleID: string, emoji: string];

export type ReactionMessage = ReactionRole[];

export type ReactionMessages = Record<string, ReactionMessage>;
