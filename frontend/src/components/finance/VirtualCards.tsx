import React from 'react';
import { Icon } from '@iconify/react';

interface VirtualCard {
    id: number;
    name: string;
    description: string;
    perTask: number;
    total: number;
}

interface VirtualCardsProps {
    cards: VirtualCard[];
    formatCurrency: (amount: number) => string;
}

const VirtualCards = React.memo(({ cards, formatCurrency }: VirtualCardsProps) => {
    if (!cards || cards.length === 0) return null;

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <Icon icon="lucide:credit-card" className="w-5 h-5 text-indigo-500" />
                Virtual jamg'arma kartalari
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {cards.map((card) => {
                    const cardStyles = [
                        "from-slate-900 via-gray-800 to-slate-800 border-gray-700 shadow-gray-900/40",
                        "from-blue-700 via-indigo-800 to-blue-900 border-blue-600 shadow-blue-900/40",
                        "from-emerald-600 via-teal-700 to-emerald-800 border-emerald-500 shadow-emerald-900/40",
                        "from-amber-600 via-orange-600 to-red-700 border-orange-500 shadow-orange-900/40"
                    ];
                    const styleClass = cardStyles[(card.id - 1) % cardStyles.length];

                    return (
                        <div key={card.id} className={`relative overflow-hidden rounded-[1.25rem] bg-gradient-to-br ${styleClass} p-6 shadow-xl border border-white/50 text-white transform hover:-translate-y-1.5 transition-all duration-300 group`}>
                            {/* Decorative elements */}
                            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-white/5 rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-500"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                            <div className="relative z-10">
                                {/* Card chip & Wi-Fi icon */}
                                <div className="flex justify-between items-center mb-6">
                                    <Icon icon="lucide:nfc" className="w-6 h-6 text-white/80 drop-shadow-md" />
                                    <Icon icon="lucide:gem" className="w-6 h-6 text-white/50" />
                                </div>

                                <div className="space-y-1.5 mb-8">
                                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{card.name}</h3>
                                    <p className="text-3xl font-mono font-medium tracking-tight drop-shadow-lg">
                                        {formatCurrency(card.total)}
                                    </p>
                                </div>

                                <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                    <div>
                                        <p className="text-[9px] uppercase text-white/50 tracking-widest mb-0.5">Har bir ishdan</p>
                                        <p className="text-sm font-semibold tracking-wide">{formatCurrency(card.perTask)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] uppercase text-white/50 tracking-widest mb-0.5">Vazifasi</p>
                                        <p className="text-xs font-medium max-w-[130px] truncate" title={card.description}>{card.description}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default VirtualCards;
