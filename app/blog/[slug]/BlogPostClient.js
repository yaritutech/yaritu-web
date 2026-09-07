"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from './post.module.css';
import BlogPostModal from '../../../components/BlogPostModal';

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

export default function BlogPostClient({ initialPost }) {
    const { data: session } = useSession();
    const isAdmin = !!(session && (session.user?.isAdmin || session.user?.role === 'admin'));
    const router = useRouter();

    const [post, setPost] = useState(initialPost);
    const [isEditing, setIsEditing] = useState(false);

    const handleSaved = (updated) => {
        if (updated) setPost(updated);
        // If the slug changed while editing, move to the new URL
        if (updated?.slug && updated.slug !== initialPost.slug) {
            router.replace(`/blog/${updated.slug}`);
        } else {
            router.refresh();
        }
    };

    const handleDeleted = () => {
        router.push('/blog');
    };

    const paragraphs = post.contentType === 'html'
        ? []
        : (post.content || '')
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);

    return (
        <>
            <article className={styles.postSection}>
                <div className="container">
                    <div className={styles.breadcrumb}>
                        <Link href="/blog">&larr; Back to Blog</Link>
                    </div>

                    {!post.published && <span className={styles.draftBadge}>Draft &mdash; only visible to admins</span>}

                    {post.category && <span className={styles.category}>{post.category}</span>}
                    <h1 className={styles.title}>{post.title}</h1>

                    <div className={styles.meta}>
                        <span>By {post.author}</span>
                        <span className={styles.metaDot}>&middot;</span>
                        <span>{formatDate(post.createdAt)}</span>
                    </div>

                    {isAdmin && (
                        <div className={styles.adminBar}>
                            <button onClick={() => setIsEditing(true)} className={styles.editButton}>Edit Post</button>
                        </div>
                    )}

                    {post.coverImage && (
                        <div className={styles.coverImageWrap}>
                            <img src={post.coverImage} alt={post.title} className={styles.coverImage} />
                        </div>
                    )}

                    {post.contentType === 'html' ? (
                        <div className={styles.htmlContent} dangerouslySetInnerHTML={{ __html: post.content || '' }} />
                    ) : (
                        <div className={styles.content}>
                            {paragraphs.map((para, idx) => (
                                <p key={idx}>{para}</p>
                            ))}
                        </div>
                    )}

                    {post.tags && post.tags.length > 0 && (
                        <div className={styles.tags}>
                            {post.tags.map((tag) => (
                                <span key={tag} className={styles.tag}>#{tag}</span>
                            ))}
                        </div>
                    )}

                    <div className={styles.footerNav}>
                        <Link href="/blog" className={styles.backLink}>&larr; Back to all posts</Link>
                    </div>
                </div>
            </article>

            {isEditing && (
                <BlogPostModal
                    item={post}
                    onClose={() => setIsEditing(false)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}
        </>
    );
}
