"use client";

import type { CommentRecord } from "@/lib/site-data";
import { CommentDeleteControl } from "@/components/CommentDeleteControl";
import { getUserDictionary, type UserLocale } from "@/lib/i18n";

export function CommentThread({
  comments,
  locale,
  title,
}: {
  comments: CommentRecord[];
  locale: UserLocale;
  title: string;
}) {
  const copy = getUserDictionary(locale);

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
                <strong>{comment.isAdmin ? copy.common.admin : comment.nickname ?? copy.common.anonymous}</strong>
                {comment.isAdmin ? <span className="admin-badge">ADMIN</span> : null}
              </div>
              <div className="reply-head-side">
                <span className="comment-date">{comment.createdAt}</span>
                {comment.isAdmin ? null : <CommentDeleteControl locale={locale} commentId={comment.id} />}
              </div>
            </div>
            <p className="reply-body">{comment.text || copy.common.noOpinion}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
