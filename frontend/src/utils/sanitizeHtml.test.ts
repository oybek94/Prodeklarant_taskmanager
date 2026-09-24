// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml — XSS payloadlar olib tashlanadi', () => {
  const payloads: Array<[string, string]> = [
    ['<script>', '<p>salom</p><script>alert(1)</script>'],
    ['img onerror', '<img src=x onerror="alert(1)">'],
    ['svg onload', '<svg onload="alert(1)"></svg>'],
    ['javascript: havola', '<a href="javascript:alert(1)">bos</a>'],
    ['on* atribut', '<div onmouseover="alert(1)">x</div>'],
    ['begona iframe', '<iframe src="https://evil.example/phish"></iframe>'],
    ['javascript: iframe', '<iframe src="javascript:alert(1)"></iframe>'],
    ['http (https emas) youtube', '<iframe src="http://www.youtube.com/embed/abc"></iframe>'],
    ['youtube subdomen aldovi', '<iframe src="https://www.youtube.com.evil.example/embed/x"></iframe>'],
    ['iframe srcdoc', '<iframe src="https://www.youtube.com/embed/a" srcdoc="<script>alert(1)</script>"></iframe>'],
    ['style ichida', '<style>body{background:url(javascript:alert(1))}</style>'],
    ['form action', '<form action="https://evil.example"><input name=p></form>'],
  ];

  it.each(payloads)('%s', (_name, html) => {
    const out = sanitizeHtml(html);
    expect(out).not.toMatch(/<script|onerror|onload|onmouseover|javascript:|evil\.example|srcdoc|<style|<form/i);
  });

  it('youtube emas http iframe butunlay o\'chiriladi', () => {
    expect(sanitizeHtml('<iframe src="http://www.youtube.com/embed/abc"></iframe>')).not.toContain('<iframe');
  });
});

describe('sanitizeHtml — TinyMCE kontenti saqlanadi', () => {
  it('formatlash, jadval, rasm, havola saqlanadi', () => {
    const html =
      '<h2>Sarlavha</h2><p><strong>qalin</strong> <em>kursiv</em></p>' +
      '<table><tbody><tr><td>1</td></tr></tbody></table>' +
      '<img src="/api/secure-uploads/a.png" alt="rasm">' +
      '<a href="https://lex.uz">lex</a>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<h2>Sarlavha</h2>');
    expect(out).toContain('<strong>qalin</strong>');
    expect(out).toContain('<td>1</td>');
    expect(out).toContain('src="/api/secure-uploads/a.png"');
    expect(out).toContain('href="https://lex.uz"');
  });

  it('YouTube video iframe saqlanadi', () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315" allowfullscreen="allowfullscreen"></iframe>';
    const out = sanitizeHtml(html);
    expect(out).toContain('<iframe');
    expect(out).toContain('src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
    expect(out).toContain('allowfullscreen');
  });

  it('target=_blank havolaga rel=noopener qo\'shiladi', () => {
    const out = sanitizeHtml('<a href="https://lex.uz" target="_blank">lex</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
