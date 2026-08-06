import { Font } from '@react-pdf/renderer';

/**
 * Shrift registratsiyasi — YAGONA joy. `Font.register` global holatga yozadi,
 * shuning uchun uni bir necha modulda takrorlash mumkin emas: oxirgi chaqiruv
 * oldingisini bekor qiladi va shrift steki kutilmaganda o'zgaradi.
 *
 * Zaxira shrift: Roboto'da glifi bo'lmagan belgi @react-pdf tomonidan jimgina
 * tashlab yuborilmasligi uchun keng Unicode qamrovli NotoSans ishlatiladi.
 * `fontFamily: PDF_FONT_STACK` — har bir belgi uchun glifi bor birinchi shrift
 * tanlanadi.
 */
Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Roboto-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 },
  ],
});

Font.register({
  family: 'NotoSans',
  fonts: [{ src: '/fonts/NotoSans-Regular.ttf', fontWeight: 400 }],
});

export const PDF_FONT_STACK = ['Roboto', 'NotoSans'];
