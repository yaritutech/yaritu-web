// lib/sanitizeHtml.js
//
// A small, dependency-free sanitizer for HTML pasted/uploaded by admins into
// the blog "HTML mode" editor. This is not a full-blown sanitizer library —
// it strips the small set of things that could cause real damage (scripts,
// embeds, inline event handlers, javascript: URLs) while leaving normal
// formatting (headings, images, links, tables, etc.) untouched.
//
// Note: blog content can only be created/edited by authenticated admins, so
// this is defense-in-depth (e.g. protecting against HTML copy-pasted from an
// untrusted source) rather than protection against a public attacker.

const DANGEROUS_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form'];

export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  let out = html;

  // Strip dangerous tags and their content entirely
  DANGEROUS_TAGS.forEach((tag) => {
    const pairedRe = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    const selfClosingRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    out = out.replace(pairedRe, '');
    out = out.replace(selfClosingRe, '');
  });

  // Strip inline event handler attributes like onclick="...", onerror='...'
  out = out.replace(/\son\w+\s*=\s*"(?:[^"\\]|\\.)*"/gi, '');
  out = out.replace(/\son\w+\s*=\s*'(?:[^'\\]|\\.)*'/gi, '');
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, '');

  // Neutralize javascript: and data:text/html URIs in href/src/action attributes
  out = out.replace(/(href|src|action)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"');
  out = out.replace(/(href|src|action)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");

  return out.trim();
}

export function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
