
export type BranchSlug = 'sisli-mecidiyekoy' | 'maslak';

export interface BranchFaq {
    q: string;
    a: string;
}

export interface Branch {
    slug: BranchSlug;
    montagePointId: string;
    shortName: string;
    title: string;
    district: string;
    neighborhood: string;
    mapQuery: string;
    intro: string[];
    location: string[];
    faqs: BranchFaq[];
}

export const BRANCHES: Branch[] = [
    {
        slug: 'sisli-mecidiyekoy',
        montagePointId: '6a92b65797206e35c879e0f5',
        shortName: 'Şişli Mecidiyeköy',
        title: 'Şişli Mecidiyeköy Lastik ve Jant Servisi',
        district: 'Şişli',
        neighborhood: 'Gülbahar',
        mapQuery: 'Art Lastik Gülbahar Mahallesi Galataderesi Caddesi Şişli İstanbul',
        intro: [
            'LastikJantAVM Şişli Mecidiyeköy şubesi, Gülbahar Mahallesi Galataderesi Caddesi üzerinde Art Lastik adıyla hizmet veriyor. Şehrin tam ortasında olduğumuz için lastiğiniz yolda patladığında, rot ayarınız bozulduğunda ya da mevsim geçişinde lastik değiştirmek istediğinizde uzun yol gitmeden bize uğrayabilirsiniz.',
            'Şubede binek, SUV, hafif ticari ve premium araçlar için lastik montajı, balans ve rot ayarı, mantar yama ile lastik tamiri, jant presi ve kaynağı, sibop değişimi, far ayarı ve sezonluk lastik depolama yapıyoruz. Sitemizden aldığınız lastikleri teslimat adresi olarak bu şubeyi seçip burada taktırabilirsiniz.'
        ],
        location: [
            'Şube Mecidiyeköy merkezine yakın, Gülbahar Mahallesi sınırları içinde Galataderesi Caddesi üzerindedir. Şişli, Mecidiyeköy, Kağıthane, Beşiktaş ve Okmeydanı yönünden gelenler için kısa bir sürüş mesafesindedir.',
            'Gelmeden önce telefonla arayarak yoğunluğu sorabilir, mevsim geçişi dönemlerinde randevu alarak beklemeden işleminizi yaptırabilirsiniz.'
        ],
        faqs: [
            {
                q: 'Şişli şubesinde mantar yama yapılıyor mu?',
                a: 'Evet. Çivi, vida gibi batmalarda lastiği jantından söküp içeriden mantar yama uyguluyor, ardından balans ayarını yapıyoruz. Fiyat jant çapına göre değişir; güncel fiyatları bu sayfadaki tabloda görebilirsiniz.'
            },
            {
                q: 'Sitemizden aldığım lastiği Şişli şubesinde taktırabilir miyim?',
                a: 'Evet. Sipariş sırasında montaj noktası olarak Şişli Mecidiyeköy şubesini seçerseniz lastikleriniz şubeye gönderilir ve montajı burada yapılır.'
            },
            {
                q: 'Şişli şubesi pazar günü açık mı?',
                a: 'Şube pazar günleri kapalıdır. Hafta içi ve cumartesi çalışma saatlerini bu sayfadaki tabloda bulabilirsiniz.'
            }
        ]
    },
    {
        slug: 'maslak',
        montagePointId: '6a980fb8da3d3f2645da5a9e',
        shortName: 'Maslak',
        title: 'Maslak 1453 Lastik ve Jant Servisi',
        district: 'Sarıyer',
        neighborhood: 'Maslak',
        mapQuery: 'Art Lastik Maslak 1453 Sitesi Taşyoncası Sokak Sarıyer İstanbul',
        intro: [
            'LastikJantAVM Maslak şubesi, Maslak 1453 Sitesi’nin alt katında, G5 otopark girişinde Art Lastik adıyla çalışıyor. Plazaların ve iş merkezlerinin yoğun olduğu bölgede çalışanlar için öğle arasında ya da iş çıkışında uğranabilecek yakın bir servis noktasıdır.',
            'Maslak şubesinde lastik montajı ve değişimi, balans ve rot ayarı, lastik tamiri, jant pres ve kaynak işleri, nitrojen dolumu, far ayarı ve lastik oteli hizmetleri veriliyor. Şube site otoparkının alt katında yer aldığı için aracınızı cadde üzerinde park yeri aramadan doğrudan servise getirebilirsiniz.'
        ],
        location: [
            'Şubeye Maslak 1453 Sitesi’nin G5 otopark girişinden, Taşyoncası Sokak tarafından ulaşılır. Maslak, Ayazağa, Seyrantepe, İstinye ve Levent çevresinden gelenler için yakın bir noktadır.',
            'Otopark girişinde LastikJantAVM / Art Lastik yönlendirmelerini takip edebilir, bulamazsanız şubeyi arayarak tarif alabilirsiniz.'
        ],
        faqs: [
            {
                q: 'Maslak şubesine nereden giriliyor?',
                a: 'Şube Maslak 1453 Sitesi’nin alt katındadır; G5 otopark girişini kullanmanız gerekir. Giriş Taşyoncası Sokak tarafındadır.'
            },
            {
                q: 'Sitemizden aldığım lastiği Maslak şubesinde taktırabilir miyim?',
                a: 'Evet. Sipariş adımında montaj noktası olarak Maslak şubesini seçmeniz yeterli; lastikleriniz şubeye ulaştığında montaj için gelebilirsiniz.'
            },
            {
                q: 'Maslak şubesinde lastik oteli var mı?',
                a: 'Evet. Mevsim dışındaki lastiklerinizi en fazla 6 aylık dönemler halinde saklıyoruz. Ücret jant çapına göre belirlenir.'
            }
        ]
    }
];

export function getBranch(slug: string): Branch | undefined {
    return BRANCHES.find(b => b.slug === slug);
}
