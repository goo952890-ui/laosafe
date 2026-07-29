"use client";

import type { CommentRecord } from "@/lib/site-data";
import { CommentDeleteControl } from "@/components/CommentDeleteControl";

export function CommentThread({
  comments,
  title,
}: {
  comments: CommentRecord[];
  title: string;
}) {
  return (
    <section className="panel-block" aria-labelledby="comment-thread-title">
      <h2 className="panel-title" id="comment-thread-title">
        {title}
      </h2>
      <div className="comment-thread">
        {comments.map((comment) => (
          <article className={`reply-card ${comment.isAdmin ? "reply-card--admin" : ""}`} key={comment.id}>
            <div className="reply-head">
              <div className="reply-head-main">
                <strong>{comment.isAdmin ? "관리자" : comment.nickname ?? "익명"}</strong>
                {comment.isAdmin ? <span className="admin-badge">ADMIN</span> : null}
              </div>
              <div className="reply-head-side">
                <span className="comment-date">{comment.createdAt}</span>
                {comment.isAdmin ? null : <CommentDeleteControl commentId={comment.id} />}
              </div>
            </div>
            <p className="reply-body">{comment.text || "(의견 없음)"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
