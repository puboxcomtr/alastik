// "Biz Sizi Arayalım" formu seçenekleri — vitrin ve doğrulama aynı kaynağı kullanır
const CALLBACK_TOPICS = [
    { key: 'lastik', label: 'Lastik' },
    { key: 'jant', label: 'Jant' },
    { key: 'montaj', label: 'Montaj / Servis' },
    { key: 'kurumsal', label: 'Kurumsal / Filo' },
    { key: 'diger', label: 'Diğer' }
];

const CALLBACK_TIME_SLOTS = [
    { key: 'hemen', label: 'En kısa sürede' },
    { key: 'sabah', label: '09:00 - 12:00' },
    { key: 'ogle', label: '12:00 - 15:00' },
    { key: 'aksam', label: '15:00 - 18:00' }
];

const CALLBACK_STATUSES = ['new', 'called', 'closed'];

module.exports = { CALLBACK_TOPICS, CALLBACK_TIME_SLOTS, CALLBACK_STATUSES };
