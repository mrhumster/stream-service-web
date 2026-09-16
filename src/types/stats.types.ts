export type ReactionKind = "like" | "dislike" | "none";

export interface StreamStats {
  views: number;
  likes: number;
  dislikes: number;
  my_reaction?: ReactionKind;
}

export interface SetReactionInput {
  kind: ReactionKind;
}