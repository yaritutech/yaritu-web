"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './blog.module.css';
import BlogPostModal from '../../components/BlogPostModal';
import SkeletonLoader from '../../components/SkeletonLoader';

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

export default function BlogListClient() {
    const { data: session } = useSession();
    const isAdmin = !!(session && (session.user?.isAdmin || session.user?.role === 'admin'));

    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchPosts = async () => {
        try {
            const url = isAdmin ? '/api/blog?all=1' : '/api/blog';
            const res = await fetch(url, { credentials: 'include' });
            const json = await res.json().catch(() => null);
            if (res.ok && json?.success) {
                setPosts(json.data || []);
            } else {
                setPosts([]);
            }
        } catch (err) {
            console.error('Failed to load blog posts', err);
            setPosts([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const handleSaved = () => fetchPosts();
    const handleDeleted = () => fetchPosts();

    return (
        <>
            <section className={styles.heroSection}>
                <div className="container">
                    <h1 className="page-title">Our <span className="highlight">Blog</span></h1>
                    <p className={styles.heroSubtitle}>Styling tips, wedding trends, and stories from the YARITU team.</p>
                </div>
            </section>

            <section className={styles.blogSection}>
                <div className="container">
                    {isAdmin && (
                        <div className={styles.adminBar}>
                            <button onClick={() => setIsAddOpen(true)} className={styles.addButton}>+ Add New Post</button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className={styles.grid}>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={`skeleton-${i}`} className={styles.card}>
                                    <SkeletonLoader variant="video" style={{ width: '100%', height: 220 }} />
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className={styles.emptyState}>
                            <h3>No blog posts yet</h3>
                            <p>{isAdmin ? 'Click "Add New Post" above to publish your first article.' : 'Check back soon for new stories and inspiration.'}</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {posts.map((post) => (
                                <article key={post._id} className={styles.card}>
                                    {!post.published && <span className={styles.draftBadge}>Draft</span>}
                                    <Link href={`/blog/${post.slug}`} className={styles.cardImageLink}>
                                        <div className={styles.cardImageWrap}>
                                            {post.coverImage ? (
                                                <img src={post.coverImage} alt={post.title} className={styles.cardImage} loading="lazy" />
                                            ) : (
                                                <div className={styles.cardImagePlaceholder} />
                                            )}
                                        </div>
                                    </Link>
                                    <div className={styles.cardBody}>
                                        {post.category && <span className={styles.cardCategory}>{post.category}</span>}
                                        <h2 className={styles.cardTitle}>
                                            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                                        </h2>
                                        {post.excerpt && <p className={styles.cardExcerpt}>{post.excerpt}</p>}
                                        <div className={styles.cardMeta}>
                                            <span>{post.author}</span>
                                            <span className={styles.metaDot}>&middot;</span>
                                            <span>{formatDate(post.createdAt)}</span>
                                        </div>
                                        <div className={styles.cardFooter}>
                                            <Link href={`/blog/${post.slug}`} className={styles.readMore}>Read More &rarr;</Link>
                                            {isAdmin && (
                                                <button onClick={() => setEditing(post)} className={styles.editButton}>Edit</button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {isAddOpen && <BlogPostModal onClose={() => setIsAddOpen(false)} onSaved={handleSaved} />}
            {editing && (
                <BlogPostModal
                    item={editing}
                    onClose={() => setEditing(null)}
                    onSaved={handleSaved}
                    onDeleted={handleDeleted}
                />
            )}
        </>
    );
}
