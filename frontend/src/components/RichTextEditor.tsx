import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
// Table extensions - temporarily commented out due to import issues
// import { Table } from '@tiptap/extension-table';
// import { TableRow } from '@tiptap/extension-table-row';
// import { TableCell } from '@tiptap/extension-table-cell';
// import { TableHeader } from '@tiptap/extension-table-header';
import { createLowlight, all } from 'lowlight';
import { useState } from 'react';

const lowlight = createLowlight(all);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  onExportHTML?: (html: string) => void;
  onExportJSON?: (json: any) => void;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  onExportHTML, 
  onExportJSON 
}: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Youtube.configure({
        width: 640,
        height: 480,
        HTMLAttributes: {
          class: 'rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      // Table extensions temporarily disabled
      // Table.configure({
      //   resizable: true,
      //   HTMLAttributes: {
      //     class: 'border-collapse border border-gray-300',
      //   },
      // }),
      // TableRow,
      // TableHeader,
      // TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[600px] px-6 py-4 prose-headings:font-bold prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:font-bold prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100',
        'data-placeholder': 'Maqola kontentini kiriting...',
      },
    },
  });

  if (!editor) {
    return null;
  }

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          const response = await apiClient.post('/upload/image', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          editor.chain().focus().setImage({ src: response.data.fileUrl }).run();
        } catch (error) {
          console.error('Error uploading image:', error);
          const url = window.prompt('Rasm URL manzilini kiriting:');
          if (url) {
            editor.chain().focus().setImage({ src: url }).run();
          }
        }
      } else {
        const url = window.prompt('Rasm URL manzilini kiriting:');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  };

  const addVideo = () => {
    const url = window.prompt('YouTube video URL manzilini kiriting:');
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  const addLink = () => {
    if (linkUrl && linkText) {
      editor.chain().focus().setLink({ href: linkUrl }).insertContent(linkText).run();
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkText('');
    }
  };

  // Table functionality temporarily disabled due to import issues
  // const addTable = () => {
  //   editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  // };

  const addCallout = (type: 'info' | 'warning' | 'success' | 'error') => {
    const colors = {
      info: 'bg-blue-50 border-blue-200 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
    };
    
    const calloutHTML = `
      <div class="border-l-4 ${colors[type]} p-4 my-4 rounded">
        <p class="font-semibold mb-2">${type === 'info' ? 'Ma\'lumot' : type === 'warning' ? 'Ogohlantirish' : type === 'success' ? 'Muvaffaqiyat' : 'Xatolik'}</p>
        <p>Bu yerga matn kiriting...</p>
      </div>
    `;
    editor.chain().focus().insertContent(calloutHTML).run();
  };

  const handleExportHTML = () => {
    if (onExportHTML) {
      onExportHTML(editor.getHTML());
    } else {
      const html = editor.getHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'maqola.html';
      a.click();
    }
  };

  const handleExportJSON = () => {
    if (onExportJSON) {
      onExportJSON(editor.getJSON());
    } else {
      const json = editor.getJSON();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'maqola.json';
      a.click();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-3 flex flex-wrap gap-2 items-center">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm font-bold ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Qalin (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm italic ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Kursiv (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Chiziqli"
          >
            <s>S</s>
          </button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Sarlavha 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Sarlavha 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Sarlavha 3"
          >
            H3
          </button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Ro'yxat"
          >
            •
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Raqamli ro'yxat"
          >
            1.
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('blockquote') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Iqtibos"
          >
            "
          </button>
        </div>

        {/* Code */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm font-mono ${
              editor.isActive('codeBlock') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Kod bloki"
          >
            {'</>'}
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm font-mono ${
              editor.isActive('code') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Inline kod"
          >
            {'</>'}
          </button>
        </div>

        {/* Media */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={addImage}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Rasm qo'shish"
          >
            🖼️
          </button>
          <button
            type="button"
            onClick={addVideo}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Video qo'shish"
          >
            🎥
          </button>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            className={`px-3 py-1.5 rounded hover:bg-gray-200 text-sm ${
              editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'bg-white'
            }`}
            title="Link qo'shish"
          >
            🔗
          </button>
        </div>

        {/* Table - temporarily disabled */}
        {/* <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={addTable}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Jadval qo'shish"
          >
            📊
          </button>
        </div> */}

        {/* Callouts */}
        <div className="flex gap-1 border-r pr-2 mr-2">
          <button
            type="button"
            onClick={() => addCallout('info')}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Ma'lumot"
          >
            ℹ️
          </button>
          <button
            type="button"
            onClick={() => addCallout('warning')}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Ogohlantirish"
          >
            ⚠️
          </button>
          <button
            type="button"
            onClick={() => addCallout('success')}
            className="px-3 py-1.5 bg-white rounded hover:bg-gray-200 text-sm"
            title="Muvaffaqiyat"
          >
            ✅
          </button>
        </div>

        {/* Export */}
        <div className="flex gap-1 ml-auto">
          <button
            type="button"
            onClick={handleExportHTML}
            className="px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm"
            title="HTML sifatida eksport qilish"
          >
            📄 HTML
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm"
            title="JSON sifatida eksport qilish"
          >
            📦 JSON
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div className="border-t bg-white">
        <EditorContent editor={editor} />
        <style>{`
          .ProseMirror {
            outline: none;
          }
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
          .ProseMirror table {
            border-collapse: collapse;
            margin: 1rem 0;
            table-layout: fixed;
            width: 100%;
          }
          .ProseMirror table td,
          .ProseMirror table th {
            min-width: 1em;
            border: 1px solid #ddd;
            padding: 0.5rem;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .ProseMirror table th {
            font-weight: bold;
            text-align: left;
            background-color: #f9fafb;
          }
          .ProseMirror table .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: "";
            left: 0; right: 0; top: 0; bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }
          .ProseMirror blockquote {
            border-left: 4px solid #3b82f6;
            padding-left: 1rem;
            margin: 1rem 0;
            font-style: italic;
            background-color: #eff6ff;
            padding: 0.5rem 1rem;
          }
          .ProseMirror code {
            background-color: #f3f4f6;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-size: 0.875em;
          }
          .ProseMirror pre {
            background: #1f2937;
            color: #f9fafb;
            font-family: 'JetBrainsMono', 'Courier New', monospace;
            padding: 1rem;
            border-radius: 0.5rem;
            overflow-x: auto;
          }
          .ProseMirror pre code {
            background: transparent;
            color: inherit;
            font-size: 0.875rem;
            padding: 0;
          }
        `}</style>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Link qo'shish</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link matni
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Link matni"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={addLink}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

