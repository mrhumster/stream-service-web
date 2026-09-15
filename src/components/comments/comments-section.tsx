import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useListCommentsQuery,
  useListRepliesQuery,
  useLazyListRepliesQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useLazyListCommentsQuery,
} from "@/services/comments";
import type { Comment, CommentListResponse } from "@/types/comment.types";
import MarkdownBody from "./markdown-body";
import { formatDate } from "@/lib/stream-format";
import { getErrorMessage } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/hooks";
import { ChevronDown, ChevronRight, Loader2, MessageSquare } from "lucide-react";

const PAGE = 30;

function shortId(id: string): string {
  return `#${id.slice(0, 8)}`;
}

const actionBtn =
  "cursor-pointer inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-[10px] h-8 px-3 font-bold disabled:opacity-50";

const ghostBtn =
  "cursor-pointer inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50";

const textAreaCls =
  "w-full rounded-none border-4 border-foreground/20 bg-background p-2 text-xs leading-relaxed outline-none focus:border-primary resize-y min-h-20";

export function CommentsSection({ streamId }: { streamId: string }) {
  const { isAuth } = useAuth();
  const authUser = useAppSelector((state) => state.auth.authUser);
  const canComment =
    isAuth && !!authUser && (authUser.role === "admin" || authUser.email_verified);

  const { data: firstPage, isFetching } = useListCommentsQuery({
    streamId,
    limit: PAGE,
  });
  const [extraPages, setExtraPages] = useState<CommentListResponse[]>([]);
  const resetPages = useCallback(() => setExtraPages([]), []);
  const [loadMoreTrigger, { isFetching: isLoadingMore }] =
    useLazyListCommentsQuery();
  const loadingMoreRef = useRef(false);

  const comments = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
    for (const page of [firstPage, ...extraPages]) {
      if (!page?.comments) continue;
      for (const c of page.comments) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          out.push(c);
        }
      }
    }
    return out;
  }, [firstPage, extraPages]);

  const lastPage = extraPages.length
    ? extraPages[extraPages.length - 1]
    : firstPage;
  const hasMore = !!lastPage?.next_cursor;

  const loadMoreComments = useCallback(async () => {
    if (loadingMoreRef.current || !lastPage?.next_cursor) return;
    loadingMoreRef.current = true;
    try {
      const res = await loadMoreTrigger({
        streamId,
        cursor: lastPage.next_cursor,
        limit: PAGE,
      }).unwrap();
      if (res.comments.length) setExtraPages((p) => [...p, res]);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [streamId, lastPage, loadMoreTrigger]);

  const [draft, setDraft] = useState("");
  const [createComment, { isLoading: isCreating }] =
    useCreateCommentMutation();

  const handleCreate = async (input: { body: string; parent_id?: string }) => {
    const body = input.body.trim();
    if (!body) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await createComment({ streamId, input: { body, parent_id: input.parent_id } }).unwrap();
      setDraft("");
      resetPages();
      toast.success("Comment posted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] mt-10">
      <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 flex-row items-center gap-2">
        <MessageSquare className="size-4" />
        <CardTitle className="text-sm uppercase tracking-tight">
          Comments
        </CardTitle>
        {!isFetching && (
          <span className="text-[10px] uppercase text-muted-foreground">
            {comments.length}
          </span>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-4">
        {!isAuth ? (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Please sign in to leave a comment.
          </p>
        ) : !canComment ? (
          <div className="border-2 border-foreground/20 p-3 text-xs uppercase tracking-wider text-muted-foreground">
            Your email is not verified.{" "}
            <Link
              to="/verify"
              className="underline underline-offset-2 text-foreground"
            >
              Verify your email
            </Link>{" "}
            to leave a comment.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate({ body: draft });
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className={textAreaCls}
              placeholder="Write a comment... (markdown allowed)"
              maxLength={4000}
            />
            <div className="self-end">
              <button
                type="submit"
                disabled={isCreating || !draft.trim()}
                className={actionBtn}
              >
                {isCreating && <Loader2 className="size-4 animate-spin" />}
                Comment
              </button>
            </div>
          </form>
        )}

        {isFetching && comments.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs uppercase tracking-wider text-muted-foreground py-4">
            No comments yet. Be the first!
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                streamId={streamId}
                canComment={canComment}
              />
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="flex items-center justify-center">
            <button
              disabled={isLoadingMore}
              onClick={() => void loadMoreComments()}
              className={ghostBtn}
            >
              {isLoadingMore ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ChevronDown className="size-4" />
              )}
              Load more
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment,
  streamId,
  canComment,
}: {
  comment: Comment;
  streamId: string;
  canComment: boolean;
}) {
  const authUser = useAppSelector((state) => state.auth.authUser);
  const isAuthor = !!authUser && authUser.id === comment.user_id;
  const isAdmin = authUser?.role === "admin";

  const [showReplies, setShowReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.body);

  const [createComment, { isLoading: isCreatingReply }] =
    useCreateCommentMutation();
  const [updateComment, { isLoading: isUpdating }] =
    useUpdateCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] =
    useDeleteCommentMutation();

  const handleReply = async () => {
    const body = replyDraft.trim();
    if (!body) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await createComment({
        streamId,
        input: { body, parent_id: comment.id },
      }).unwrap();
      setReplyDraft("");
      setReplying(false);
      setShowReplies(true);
      toast.success("Reply posted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleEdit = async () => {
    const body = editDraft.trim();
    if (!body) {
      toast.error("Comment cannot be empty");
      return;
    }
    try {
      await updateComment({ id: comment.id, body }).unwrap();
      setEditing(false);
      toast.success("Comment updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment(comment.id).unwrap();
      toast.success("Comment deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <li className="flex flex-col gap-2">
      <div className="border-2 border-foreground/10 p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="font-bold text-foreground">
            {shortId(comment.user_id)}
          </span>
          <span>{formatDate(comment.created_at)}</span>
          {comment.edited_at && <span>(edited)</span>}
          {isAuthor && <span className="text-primary">(you)</span>}
        </div>

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className={textAreaCls}
              maxLength={4000}
            />
            <div className="flex items-center gap-1 self-end">
              <button
                className={ghostBtn}
                onClick={() => {
                  setEditing(false);
                  setEditDraft(comment.body);
                }}
              >
                Cancel
              </button>
              <button disabled={isUpdating} onClick={() => void handleEdit()} className={actionBtn}>
                {isUpdating && <Loader2 className="size-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        ) : (
          <MarkdownBody text={comment.body} />
        )}

        <div className="flex flex-wrap items-center gap-3 mt-2">
          {canComment && !editing && (
            <button
              className={ghostBtn}
              disabled={isCreatingReply}
              onClick={() => {
                setReplying((v) => !v);
              }}
            >
              <ChevronRight className={`size-3 transition-transform ${replying ? "rotate-90" : ""}`} />
              Reply
            </button>
          )}
          {(isAuthor || isAdmin) && !editing && (
            <>
              {isAuthor && (
                <button className={ghostBtn} onClick={() => setEditing(true)}>
                  Edit
                </button>
              )}
              <button
                className={ghostBtn}
                disabled={isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? <Loader2 className="size-3 animate-spin" /> : null}
                Delete
              </button>
            </>
          )}
        </div>

        {replying && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleReply();
            }}
            className="flex flex-col gap-2 mt-3"
          >
            <textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              className={`${textAreaCls} min-h-16`}
              placeholder="Write a reply..."
              maxLength={4000}
              autoFocus
            />
            <div className="self-end">
              <button
                type="submit"
                disabled={isCreatingReply || !replyDraft.trim()}
                className={actionBtn}
              >
                {isCreatingReply && <Loader2 className="size-4 animate-spin" />}
                Reply
              </button>
            </div>
          </form>
        )}
      </div>

      {(comment.reply_count ?? 0) > 0 && (
        <button
          className={ghostBtn}
          onClick={() => setShowReplies((v) => !v)}
        >
          {showReplies ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
          {showReplies
            ? "Hide replies"
            : `View replies (${comment.reply_count})`}
        </button>
      )}

      {showReplies && (
        <div className="pl-6 border-l-2 border-foreground/10 flex flex-col gap-3 mt-1">
          <ReplyList parentId={comment.id} />
        </div>
      )}
    </li>
  );
}

function ReplyList({ parentId }: { parentId: string }) {
  const { data: firstPage, isFetching } = useListRepliesQuery({
    parentId,
    limit: PAGE,
  });
  const [extraPages, setExtraPages] = useState<CommentListResponse[]>([]);
  const [loadMoreTrigger, { isFetching: isLoadingMore }] =
    useLazyListRepliesQuery();

  const replies = useMemo(() => {
    const seen = new Set<string>();
    const out: Comment[] = [];
    for (const page of [firstPage, ...extraPages]) {
      if (!page?.comments) continue;
      for (const c of page.comments) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          out.push(c);
        }
      }
    }
    return out;
  }, [firstPage, extraPages]);

  const lastPage = extraPages.length
    ? extraPages[extraPages.length - 1]
    : firstPage;
  const hasMore = !!lastPage?.next_cursor;

  if (isFetching && replies.length === 0) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {replies.map((reply) => (
        <ReplyItem key={reply.id} reply={reply} />
      ))}
      {hasMore && (
        <li>
          <button
            className={ghostBtn}
            disabled={isLoadingMore}
            onClick={async () => {
              if (!lastPage?.next_cursor || isLoadingMore) return;
              const res = await loadMoreTrigger({
                parentId,
                cursor: lastPage.next_cursor,
                limit: PAGE,
              }).unwrap();
              if (res.comments.length) setExtraPages((p) => [...p, res]);
            }}
          >
            {isLoadingMore ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            Load more replies
          </button>
        </li>
      )}
    </ul>
  );
}

function ReplyItem({ reply }: { reply: Comment }) {
  const authUser = useAppSelector((state) => state.auth.authUser);
  const isAuthor = !!authUser && authUser.id === reply.user_id;
  const isAdmin = authUser?.role === "admin";

  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(reply.body);
  const [updateComment, { isLoading: isUpdating }] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();

  return (
    <li className="border-2 border-foreground/10 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="font-bold text-foreground">
          {shortId(reply.user_id)}
        </span>
        <span>{formatDate(reply.created_at)}</span>
        {reply.edited_at && <span>(edited)</span>}
        {isAuthor && <span className="text-primary">(you)</span>}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            className={`${textAreaCls} min-h-16`}
            maxLength={4000}
          />
          <div className="flex items-center gap-1 self-end">
            <button
              className={ghostBtn}
              onClick={() => {
                setEditing(false);
                setEditDraft(reply.body);
              }}
            >
              Cancel
            </button>
            <button
              disabled={isUpdating}
              onClick={async () => {
                const body = editDraft.trim();
                if (!body) {
                  toast.error("Comment cannot be empty");
                  return;
                }
                try {
                  await updateComment({ id: reply.id, body }).unwrap();
                  setEditing(false);
                  toast.success("Comment updated");
                } catch (err) {
                  toast.error(getErrorMessage(err));
                }
              }}
              className={actionBtn}
            >
              {isUpdating && <Loader2 className="size-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      ) : (
        <MarkdownBody text={reply.body} />
      )}

      {(isAuthor || isAdmin) && !editing && (
        <div className="flex items-center gap-3 mt-2">
          {isAuthor && (
            <button className={ghostBtn} onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
          <button
            className={ghostBtn}
            disabled={isDeleting}
            onClick={async () => {
              if (!window.confirm("Delete this comment?")) return;
              try {
                await deleteComment(reply.id).unwrap();
                toast.success("Comment deleted");
              } catch (err) {
                toast.error(getErrorMessage(err));
              }
            }}
          >
            {isDeleting && <Loader2 className="size-3 animate-spin" />}
            Delete
          </button>
        </div>
      )}
    </li>
  );
}