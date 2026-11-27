// `src/components/pdf/fonts.ts` ning Node varianti: brauzerda shriftlar `/fonts/*.ttf`
// URL'idan olinadi, serverda esa dastur yonidagi `fonts/` papkasidan.
// Yig'ishda vite alias bilan almashtiriladi (qarang: vite.bot-pdf.config.ts).

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Font } from '@react-pdf/renderer';

const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fonts');
const font = (name: string): string => path.join(fontsDir, name);

Font.register({
  family: 'Roboto',
  fonts: [
    { src: font('Roboto-Regular.ttf'), fontWeight: 400 },
    { src: font('Roboto-Medium.ttf'), fontWeight: 500 },
    { src: font('Roboto-Bold.ttf'), fontWeight: 700 },
  ],
});

Font.register({
  family: 'NotoSans',
  fonts: [{ src: font('NotoSans-Regular.ttf'), fontWeight: 400 }],
});

export const PDF_FONT_STACK = ['Roboto', 'NotoSans'];
