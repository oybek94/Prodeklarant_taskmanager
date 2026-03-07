import { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export default function RichTextEditor({
  content,
  onChange,
}: RichTextEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorChange = (content: string) => {
    onChange(content);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-700">

      <Editor
        apiKey="zlrh6c5uci1filu0wsd013tj3aozdq4enn477iqnc7pyqv34"
        onInit={(_evt, editor) => editorRef.current = editor}
        value={content}
        onEditorChange={handleEditorChange}
        init={{
          height: 600,
          menubar: true,
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'emoticons', 'codesample', 'quickbars'
          ],
          toolbar: 'undo redo | blocks | ' +
            'bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | image media table codesample emoticons | fullscreen help',
          content_style: `
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              font-size: 16px; 
              line-height: 1.6;
              padding: 20px;
              color: #334155;
            }
            .dark body {
               background-color: #0f172a;
               color: #f1f5f9;
            }
            h1, h2, h3, h4, h5, h6 { font-weight: 800; color: #0f172a; margin-top: 2rem; margin-bottom: 1rem; }
            .dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6 { color: #f8fafc; }
            code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
            .dark code { background-color: #1e293b; }
            pre { background-color: #1e293b; color: #f8fafc; padding: 15px; border-radius: 12px; }
            img { max-width: 100%; height: auto; border-radius: 15px; }
            table { border-collapse: collapse; width: 100%; border-radius: 10px; overflow: hidden; }
            table th, table td { border: 1px solid #e2e8f0; padding: 12px; }
            .dark table th, .dark table td { border-color: #334155; }
          `,
          skin: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oxide-dark' : 'oxide',
          content_css: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'default',
          quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote quickimage quicktable',
          image_advtab: true,
          image_caption: true,
          branding: false,
          promotion: false,
        }}
      />
    </div>
  );
}

