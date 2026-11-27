// `src/lib/api.ts` ning server dasturidagi o'rinbosari: PDF komponentlari undan faqat
// `resolveUploadUrl` uchun bazaviy manzilni so'raydi. Serverda rasm (logotip) data: URI
// bo'lib keladi, shuning uchun manzil bo'sh. Yig'ishda vite alias bilan almashtiriladi.

const apiClient = { defaults: { baseURL: '' } };

export default apiClient;
