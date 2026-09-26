/**
 * Mobil tahrirlash havolasi (/transactions/:id/edit) formani faqat bir marta ochadi.
 * Yopish/saqlashda route o'zgarishi kechikib keladi (startTransition) — shu oraliqda
 * forma qayta ochilib qolmasligi uchun ochilgan id eslab qolinadi.
 */
export function shouldOpenEditFromRoute(args: { isMobile: boolean; editRouteId: number | null; handledId: number | null }): boolean {
  return args.isMobile && args.editRouteId !== null && args.handledId !== args.editRouteId;
}
