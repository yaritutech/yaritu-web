"use client";
import React, { useState, useEffect } from 'react';
import uploadFileWithPresign from '../utils/uploadFileWithPresign';

function slugify(text) {
    return (text || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function BlogPostModal({ item = null, onClose, onSaved, onDeleted }) {
    const [title, setTitle] = useState(item?.title || '');
    const [slug, setSlug] = useState(item?.slug || '');
    const [slugTouched, setSlugTouched] = useState(!!item?.slug);
    const [excerpt, setExcerpt] = useState(item?.excerpt || '');
    const [content, setContent] = useState(item?.content || '');
    const [contentType, setContentType] = useState(item?.contentType === 'html' ? 'html' : 'text');
    const [author, setAuthor] = useState(item?.author || 'YARITU Team');
    const [category, setCategory] = useState(item?.category || '');
    const [tags, setTags] = useState((item?.tags || []).join(', '));
    const [published, setPublished] = useState(item?.published !== undefined ? item.published : true);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewImage, setPreviewImage] = useState(item?.coverImage || '');
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        setTitle(item?.title || '');
        setSlug(item?.slug || '');
        setSlugTouched(!!item?.slug);
        setExcerpt(item?.excerpt || '');
        setContent(item?.content || '');
        setContentType(item?.contentType === 'html' ? 'html' : 'text');
        setAuthor(item?.author || 'YARITU Team');
        setCategory(item?.category || '');
        setTags((item?.tags || []).join(', '));
        setPublished(item?.published !== undefined ? item.published : true);
        setSelectedFile(null);
        setPreviewImage(item?.coverImage || '');
    }, [item]);

    // Auto-generate the slug from the title until the person edits the slug themselves
    const handleTitleChange = (val) => {
        setTitle(val);
        if (!slugTouched) setSlug(slugify(val));
    };

    const handleSlugChange = (val) => {
        setSlugTouched(true);
        setSlug(val);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewImage(URL.createObjectURL(file));
            setSelectedFile(file);
        }
    };

    // Option 2: Upload an .html file — read it client-side and drop its markup
    // straight into the content box (Option 1 is simply pasting HTML into that
    // same box by hand). Either way the post is saved with contentType: 'html'.
    const handleHtmlFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!/\.(html?|HTML?)$/.test(file.name)) {
            alert('Please choose a .html or .htm file.');
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
            const raw = String(evt.target?.result || '');
            // If a full document was uploaded, pull out just the <body> markup
            // so we don't try to render <html>/<head> wrappers inline.
            const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const extracted = bodyMatch ? bodyMatch[1] : raw;
            setContent(extracted.trim());
            setContentType('html');
        };
        reader.onerror = () => alert('Could not read that file.');
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Error: Title is required.');
            return;
        }
        if (!content.trim()) {
            alert('Error: Content is required.');
            return;
        }

        setLoading(true);
        try {
            let coverImageToSend = item?.coverImage || '';
            if (selectedFile) {
                setUploadProgress(0);
                const resp = await uploadFileWithPresign(selectedFile, 'YARITU/blog', (pct) => setUploadProgress(pct));
                coverImageToSend = resp?.publicUrl || resp?.url || coverImageToSend;
                setPreviewImage(coverImageToSend);
            }

            const payload = {
                title,
                slug,
                excerpt,
                content,
                contentType,
                coverImage: coverImageToSend,
                author,
                category,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                published,
            };

            let res;
            if (item && (item._id || item.id)) {
                res = await fetch(`/api/blog/${item._id || item.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch('/api/blog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            const json = await res.json().catch(() => null);

            if (res.ok && json && (json.success || json.data)) {
                onSaved && onSaved(json.data || json);
                onClose && onClose();
            } else {
                const errorMessage = json?.message || json?.error || `Failed to save post (HTTP ${res.status}).`;
                alert(errorMessage);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save post: ' + (err?.message || 'A network error occurred.'));
        } finally {
            setLoading(false);
            setUploadProgress(0);
        }
    };

    const handleDelete = async () => {
        if (!item || !(item._id || item.id)) return;
        if (!confirm('Are you sure you want to delete this blog post? This cannot be undone.')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/blog/${item._id || item.id}`, { method: 'DELETE' });
            if (res.ok) {
                onDeleted && onDeleted(item);
                onClose && onClose();
            } else {
                const json = await res.json().catch(() => null);
                alert(json?.message || 'Failed to delete post');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="modal-backdrop" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3 className="modal-title">{item ? 'Edit Blog Post' : 'Add New Blog Post'}</h3>
                    <div className="modal-body">
                        <div className="form-fields">
                            <div className="form-group">
                                <label htmlFor="blog-title">Title</label>
                                <input id="blog-title" placeholder="Enter post title" value={title} onChange={(e) => handleTitleChange(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="blog-slug">URL Slug</label>
                                <input id="blog-slug" placeholder="post-url-slug" value={slug} onChange={(e) => handleSlugChange(e.target.value)} />
                                <span className="hint">yaritu.com/blog/{slug || 'your-post-slug'}</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="blog-excerpt">Short Excerpt</label>
                                <textarea id="blog-excerpt" placeholder="A short summary shown on the blog listing page" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} />
                            </div>

                            <div className="form-group">
                                <label>Content Format</label>
                                <div className="format-toggle">
                                    <label className="format-option">
                                        <input
                                            type="radio"
                                            name="contentType"
                                            checked={contentType === 'text'}
                                            onChange={() => setContentType('text')}
                                        />
                                        <span>Plain Text</span>
                                    </label>
                                    <label className="format-option">
                                        <input
                                            type="radio"
                                            name="contentType"
                                            checked={contentType === 'html'}
                                            onChange={() => setContentType('html')}
                                        />
                                        <span>HTML</span>
                                    </label>
                                    {contentType === 'html' && (
                                        <label className="html-upload-btn">
                                            Upload .html File
                                            <input type="file" accept=".html,.htm,text/html" onChange={handleHtmlFileUpload} />
                                        </label>
                                    )}
                                </div>
                                {contentType === 'html' && (
                                    <span className="hint">Paste HTML directly into the box below, or use "Upload .html File" to import one. It will be rendered as real HTML on the post page.</span>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="blog-content">Content</label>
                                <textarea id="blog-content" placeholder={contentType === 'html' ? 'Paste your HTML markup here, or upload a .html file above.' : 'Write the full blog post here. Leave a blank line between paragraphs.'} value={content} onChange={(e) => setContent(e.target.value)} rows={12} style={contentType === 'html' ? { fontFamily: 'Consolas, Menlo, monospace', fontSize: 13 } : undefined} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="blog-author">Author</label>
                                    <input id="blog-author" placeholder="Author name" value={author} onChange={(e) => setAuthor(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="blog-category">Category</label>
                                    <input id="blog-category" placeholder="e.g. Styling Tips" value={category} onChange={(e) => setCategory(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="blog-tags">Tags (comma separated)</label>
                                <input id="blog-tags" placeholder="wedding, lehenga, trends" value={tags} onChange={(e) => setTags(e.target.value)} />
                            </div>

                            <div className="form-group checkbox-group">
                                <label htmlFor="blog-published" className="checkbox-label">
                                    <input id="blog-published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                                    <span>Published (visible on the site)</span>
                                </label>
                                {!published && <span className="hint">Unpublished posts are saved as drafts and hidden from visitors.</span>}
                            </div>
                        </div>

                        <div className="sidebar">
                            <div className="avatar-upload">
                                <label htmlFor="cover-input">
                                    <div className="avatar-preview">
                                        {previewImage ?
                                            <img src={previewImage} alt="Cover" /> :
                                            <div className="avatar-placeholder">
                                                <span>No Cover Image</span>
                                            </div>
                                        }
                                    </div>
                                    <span className="upload-button">{uploadProgress > 0 && uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Choose Cover Image'}</span>
                                </label>
                                <input id="cover-input" type="file" accept="image/*" onChange={handleFileChange} />
                            </div>

                            <div className="action-buttons">
                                <button onClick={onClose} disabled={loading} className="btn-cancel">Cancel</button>
                                <button onClick={handleSave} disabled={loading} className="btn-save">{loading ? 'Saving...' : 'Save'}</button>
                            </div>
                            {item && (
                                <div className="delete-button-container">
                                    <button onClick={handleDelete} disabled={loading} className="btn-delete">Delete Post</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 60;
                    padding: 24px;
                    overflow-y: auto;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .modal-content {
                    background: #ffffff;
                    padding: 24px;
                    border-radius: 12px;
                    width: 860px;
                    max-width: 95%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                }
                .modal-title {
                    margin: 0 0 20px 0;
                    text-align: center;
                    font-size: 24px;
                    font-weight: 600;
                    color: #333;
                }
                .modal-body {
                    display: flex;
                    gap: 24px;
                }
                .form-fields {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    min-width: 0;
                }
                .form-row {
                    display: flex;
                    gap: 16px;
                }
                .form-row .form-group {
                    flex: 1;
                }
                .form-group label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    margin-bottom: 8px;
                    color: #444;
                }
                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ccc;
                    border-radius: 8px;
                    font-size: 15px;
                    font-family: inherit;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .form-group input:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #0070f3;
                    box-shadow: 0 0 0 2px rgba(0, 112, 243, 0.2);
                }
                .form-group textarea {
                    resize: vertical;
                }
                .hint {
                    display: block;
                    margin-top: 6px;
                    font-size: 12px;
                    color: #888;
                }
                .format-toggle {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    flex-wrap: wrap;
                }
                .format-option {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    color: #444;
                    margin-bottom: 0 !important;
                }
                .format-option input {
                    width: auto;
                }
                .html-upload-btn {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 12px;
                    border: 1px solid #0070f3;
                    color: #0070f3;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    background: rgba(0, 112, 243, 0.06);
                }
                .html-upload-btn:hover {
                    background: rgba(0, 112, 243, 0.12);
                }
                .html-upload-btn input[type="file"] {
                    display: none;
                }
                .checkbox-group {
                    background: #f8f4f0;
                    padding: 12px;
                    border-radius: 8px;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    margin-bottom: 0 !important;
                }
                .checkbox-label input {
                    width: auto;
                }

                .sidebar {
                    width: 220px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: column;
                }

                .avatar-upload {
                    text-align: center;
                }
                .avatar-upload label {
                    cursor: pointer;
                }
                .avatar-preview {
                    width: 100%;
                    height: 150px;
                    border-radius: 8px;
                    background: #f0f0f0;
                    margin: 0 auto 12px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    border: 2px dashed #ccc;
                }
                .avatar-preview img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .avatar-placeholder {
                    color: #888;
                    font-size: 13px;
                    padding: 0 12px;
                    text-align: center;
                }
                .avatar-upload input[type="file"] {
                    display: none;
                }
                .upload-button {
                    font-size: 14px;
                    color: #0070f3;
                    font-weight: 500;
                }

                .action-buttons {
                    display: flex;
                    gap: 8px;
                    margin-top: auto;
                    padding-top: 20px;
                }

                .action-buttons button {
                    flex: 1;
                    padding: 10px;
                    font-size: 15px;
                    font-weight: 500;
                    border-radius: 8px;
                    border: 1px solid #ccc;
                    cursor: pointer;
                    transition: background-color 0.2s, color 0.2s;
                }
                .btn-cancel {
                    background-color: #fff;
                    color: #555;
                }
                .btn-cancel:hover {
                    background-color: #f5f5f5;
                }
                .btn-save {
                    background-color: #111;
                    color: #fff;
                    border-color: #111;
                }
                .btn-save:hover {
                    background-color: #333;
                }
                .action-buttons button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .delete-button-container {
                    margin-top: 10px;
                    border-top: 1px solid #eee;
                    padding-top: 10px;
                }

                .btn-delete {
                    width: 100%;
                    padding: 10px;
                    font-size: 15px;
                    border-radius: 8px;
                    border: none;
                    cursor: pointer;
                    background-color: transparent;
                    color: #b91c1c;
                    font-weight: 500;
                    transition: background-color 0.2s;
                }
                .btn-delete:hover {
                    background-color: #fee2e2;
                }

                @media (max-width: 640px) {
                    .modal-body {
                        flex-direction: column-reverse;
                    }
                    .form-row {
                        flex-direction: column;
                    }
                    .sidebar {
                        width: 100%;
                    }
                    .action-buttons {
                        margin-top: 16px;
                    }
                }
            `}</style>
        </>
    );
}
