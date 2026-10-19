import type { BranchSlug } from './subeler';

export interface ServiceGroup {
    slug: string;
    categorySlug: string | null;
    name: string;
    summary: string;
    text: Record<BranchSlug, string[]>;
}

export const SERVICE_GROUPS: ServiceGroup[] = [
    {
        slug: 'lastik-tamiri-mantar-yama',
        categorySlug: 'lastik-tamir-hizmetleri',
        name: 'Lastik Tamiri ve Mantar Yama',
        summary: 'Mantar yama, içten yama ve fitil ile patlak lastik tamiri; balans ayarı dahil.',
        text: {
            'sisli-mecidiyekoy': [
                'Lastiğinize çivi ya da vida battıysa Galataderesi Caddesi’ndeki Şişli şubemizde lastiği jantından söküp içeriden kontrol ediyoruz. Delik sırt bölgesindeyse mantar yama uyguluyoruz: yama, deliği hem içeriden kapatır hem de gövdeyi doldurur, bu yüzden kalıcı onarım için ilk tercihimizdir.',
                'Daha küçük hasarlarda içten yama, acil durumlarda ise fitil seçeneği var. Tamir sonrası lastik tekrar takılır ve balans ayarı yapılır; fiyatlara balans dahildir. Yanak (lastiğin yan yüzü) hasarlarında güvenlik nedeniyle tamir yapılmaz, size uygun lastik seçeneklerini gösteririz.',
                'Mecidiyeköy, Gülbahar, Esentepe ve Kağıthane civarında lastiği inen sürücüler için en yakın noktalardan biriyiz; hava basıncı düşük lastikle uzun mesafe gitmemenizi öneririz.'
            ],
            maslak: [
                'Maslak şubemizde patlak ya da yavaş hava kaçıran lastikleri söküp iç yüzeyden inceliyoruz. Sırt bölgesindeki çivi ve vida deliklerinde mantar yama kullanıyoruz; bu yöntem deliği içten mühürlediği için dışarıdan takılan fitile göre çok daha güvenlidir.',
                'Kamyon ve otobüs lastikleri (17.5") dahil farklı ebatlar için tamir seçeneklerimiz var. Binek araçlarda tamir fiyatına balans ayarı dahil. Lastiğin yan yüzünde kesik ya da şişlik varsa tamir önermeyiz; aynı gün değişim için stoktaki ebatları kontrol edebiliriz.',
                'Plazada çalışırken lastiğinizin söndüğünü fark ettiyseniz aracı 1453 Sitesi’nin G5 otopark girişinden şubemize getirmeniz yeterli.'
            ]
        }
    },
    {
        slug: 'rot-balans-ayari',
        categorySlug: 'rot-ve-balans-hizmetleri',
        name: 'Rot ve Balans Ayarı',
        summary: 'Jant çapına göre rot ayarı, balans ayarı ve ön takım kontrolü.',
        text: {
            'sisli-mecidiyekoy': [
                'Direksiyon sağa-sola çekiyorsa, lastiklerin iç ya da dış kenarı erken aşınıyorsa veya belli hızlarda direksiyonda titreme hissediyorsanız rot ve balans kontrolü zamanı gelmiş demektir. Şişli şubemizde rot ayarını ve balans ayarını ayrı ayrı ya da birlikte yaptırabilirsiniz.',
                'Fiyatlar jant çapına göre üç gruptadır: 13"-16", 17"-18" ve 19" ve üzeri. 4x4, hafif ticari, RFT (patlasa da giden lastik) ve premium araçlar için ayrı fiyat uygulanır. Ön takım kontrolü ücreti, aynı gün rot ayarı yaptırırsanız rot ayarı fiyatından düşülür.',
                'Şehir içinde çukur, kaldırım ve hız kesicilerle sık karşılaşılan Şişli-Mecidiyeköy trafiğinde rot ayarının yılda en az bir kez kontrol edilmesini öneriyoruz.'
            ],
            maslak: [
                'Maslak şubemizde rot ayarı ile tekerleklerin açıları üretici değerlerine getirilir, balans ayarı ile de jant ve lastiğin ağırlık dengesi sağlanır. İkisi birlikte yapıldığında lastik ömrü uzar, yakıt tüketimi ve direksiyon titremesi azalır.',
                'Yeni lastik taktırdığınızda, mevsim değişiminde ya da ön takımda parça değişimi sonrasında ayar yaptırmanız gerekir. Rot + balans paket fiyatları tek tek yaptırmaya göre daha avantajlıdır; 4x4, SUV, hafif ticari ve RFT lastikli araçlar için premium fiyat uygulanır.',
                'Otoyol ve TEM bağlantısını sık kullanan Maslak sürücülerinde yüksek hızda hissedilen titreme çoğunlukla balans kaynaklıdır; önce balans ayarıyla başlamanızı öneririz.'
            ]
        }
    },
    {
        slug: 'lastik-oteli',
        categorySlug: 'lastik-oteli-hizmetleri',
        name: 'Lastik Oteli (Sezonluk Lastik Saklama)',
        summary: 'Yazlık ya da kışlık lastiklerinizi en fazla 6 aylık dönemler halinde saklıyoruz.',
        text: {
            'sisli-mecidiyekoy': [
                'Apartman dairesinde ya da otoparkta dört lastiğe yer bulmak Şişli’de kolay değil. Lastik otelimizde mevsim dışındaki lastiklerinizi sezon boyunca (en fazla 6 ay) saklıyor, mevsim geçişinde aracınıza geri takıyoruz.',
                'Ücret jant çapına göre belirlenir: 13"-16", 17"-18" ve 19" ve üzeri. Lastikleri teslim alırken diş derinliği ve genel durumunu kontrol ediyoruz; bir sonraki sezonda kullanılamayacak durumdaysa sizi önceden bilgilendiriyoruz.',
                'Yazlık-kışlık değişim ve balans hizmetiyle birlikte aldığınızda lastikleriniz şubede sökülür ve aynı gün depoya alınır.'
            ],
            maslak: [
                'Maslak şubemizde lastik oteli hizmetiyle kışlık veya yazlık lastik setinizi bir sonraki sezona kadar saklıyoruz. Depolama dönemi en fazla 6 aydır; sezon geldiğinde lastikleriniz değişim için şubeye hazırlanır.',
                'Lastikler güneş ışığı, nem ve ısı değişiminden uzakta, üst üste ezilmeyecek şekilde saklandığında hamur yapısı bozulmaz. Evde balkon ya da otoparkta açıkta bekleyen lastikler ise çatlama ve deformasyon riskiyle karşı karşıya kalır.',
                'Fiyat jant çapına göre değişir. Değişim randevunuzu sezon başlamadan önce almanızı öneririz; ilk kar ve ilk sıcak günlerde yoğunluk artıyor.'
            ]
        }
    },
    {
        slug: 'yazlik-kislik-lastik-degisimi',
        categorySlug: 'yazlik-kislik-lastik-degisim-hizmetleri',
        name: 'Yazlık Kışlık Lastik Değişimi',
        summary: 'Mevsimlik lastik değişimi + balans, filo araçları için yerinde değişim, nitrojen.',
        text: {
            'sisli-mecidiyekoy': [
                'Hava sıcaklığı 7°C’nin altına indiğinde kışlık, üzerine çıktığında yazlık lastik kullanmak hem fren mesafesini hem de yol tutuşunu doğrudan etkiler. Şişli şubemizde dört lastiğin sökülmesi, takılması ve balans ayarı tek fiyatla yapılıyor.',
                'Fiyat jant çapına göre üç gruptadır. Şirket filoları için, en az 20 araçlık işlerde ekibimiz lastik değişimini sizin otoparkınızda yapabiliyor. Kamyon ve otobüs lastikleri için de değişim hizmetimiz var.',
                'Kasım ve nisan aylarında yoğunluk artıyor; Mecidiyeköy’de kısa sürede işlem için telefonla randevu almanızı öneririz. İsterseniz sökülen lastikleriniz lastik otelimizde saklanabilir.'
            ],
            maslak: [
                'Maslak şubemizde mevsim geçişlerinde yazlık-kışlık lastik değişimi ve balans ayarını birlikte yapıyoruz. Kışlık lastik yalnızca karda değil, soğuk ve ıslak asfaltta da daha kısa fren mesafesi sağlar; yazlık lastik ise sıcakta daha az aşınır.',
                'Plazalardaki şirket araçları için en az 20 araçlık filolarda yerinde değişim hizmeti veriyoruz: araçlar otoparktan ayrılmadan lastikleri değiştirip balans ayarını yapıyoruz. 4x4 ve premium araçlar için 4 lastiğe nitrojen dolumu da yapılabiliyor.',
                'Değişim sonrası sökülen lastiklerinizi lastik otelinde saklayabilir, bir sonraki sezonda aynı şubeden geri taktırabilirsiniz.'
            ]
        }
    },
    {
        slug: 'lastik-montaji',
        categorySlug: null,
        name: 'Lastik Montajı',
        summary: 'Sitemizden aldığınız lastiklerin şubede montajı; jant çapına göre.',
        text: {
            'sisli-mecidiyekoy': [
                'LastikJantAVM’den lastik alırken teslimat için Şişli Mecidiyeköy şubesini seçebilirsiniz. Lastikleriniz şubeye ulaştığında size haber verilir; gelip montajınızı yaptırırsınız, lastikleri eve taşımanız gerekmez.',
                'Montaj 13"-16", 17"-18" ve 19" ve üzeri jantlar için ayrı ayrı tanımlıdır. Sitemizden alınan lastiklerde şube montaj ücreti fiyata dahildir. Montaj sırasında sibop değişimi ve balans ayarı gerekip gerekmediğini de kontrol ediyoruz.'
            ],
            maslak: [
                'Sipariş adımında montaj noktası olarak Maslak şubesini seçtiğinizde lastikleriniz doğrudan şubeye gönderilir. Kargo takibiyle uğraşmadan, lastikler geldiğinde aracınızla şubeye gelmeniz yeterli.',
                'Maslak şubesinde 13"’ten 19" ve üzerine kadar tüm jant çaplarında montaj yapılıyor; sitemizden alınan lastiklerde montaj ücreti dahildir. Yeni lastikle birlikte rot ayarı yaptırmanız lastiklerin eşit aşınması için önerilir.'
            ]
        }
    },
    {
        slug: 'mobil-yol-yardim',
        categorySlug: 'mobil-yol-yardim-hizmetleri',
        name: 'Mobil Lastik ve Yol Yardımı',
        summary: 'Yerinde lastik değişimi ve yol yardımı; mesafeye göre fiyat.',
        text: {
            'sisli-mecidiyekoy': [
                'Lastiğiniz yolda patladıysa ve yedek lastikle devam edemiyorsanız Şişli şubemizden size ekip gönderebiliyoruz. Yol yardımı fiyatları şubeye olan mesafeye (3 km çevre veya 15 km’ye kadar) ve ekibin motosikletle ya da araçla gelmesine göre değişir; yapılacak işçilik ayrıca ücretlendirilir.',
                'Evinizin veya iş yerinizin önünde dört lastiğin değişimi ve balans ayarı için mobil yerinde değişim hizmetimiz de var (en fazla 5 km). 4x4, hafif ticari, RFT ve premium araçlar için ayrı fiyat uygulanır.',
                'Mecidiyeköy trafiğinde aracı servise getirmek istemeyenler için pratik bir seçenektir; müsaitlik için şubeyi arayın.'
            ],
            maslak: [
                'Maslak ve çevresinde lastik arızası yaşadığınızda şubemizden yol yardımı talep edebilirsiniz. Ekip, mesafeye göre motosiklet ya da araçla gelir; 3 km ve 15 km mesafeler için farklı fiyatlar vardır, yerinde yapılan işçilik ayrıca hesaplanır.',
                'Mobil yerinde değişim hizmetimizle aracınız plaza otoparkındayken dört lastiği değiştirip balans ayarını yapıyoruz (en fazla 5 km). Premium ve 4x4 araçlar için ayrı fiyat uygulanır.',
                'Ekip çıkışı yoğunluğa bağlı olduğu için önce şubeyi arayıp uygunluğu teyit etmenizi öneririz.'
            ]
        }
    },
    {
        slug: 'jant-pres-kaynak',
        categorySlug: 'jant-pres-ve-kaynak-hizmetleri',
        name: 'Jant Pres ve Kaynak',
        summary: 'Eğilen demir ve çelik jantların presle düzeltilmesi, torna kaynak.',
        text: {
            'sisli-mecidiyekoy': [
                'Çukura ya da kaldırıma sert giriş sonrası jantınız eğildiyse lastik hava kaçırabilir ve direksiyonda titreme başlar. Şişli şubemizde eğilen jantları presle eski formuna getiriyoruz.',
                'Demir jantlar için 13"-16" pres, çelik jantlar için 13"-16", 17"-18" ve 19" ve üzeri pres seçenekleri var. Çatlak ya da kırık çelik jantlarda torna kaynak yapılabiliyor; kaynak fiyatlarına işçilik dahil değildir.',
                'Pres sonrası jant lastikle birlikte balans makinesinde kontrol edilir; hasar onarım sınırını aşıyorsa jant değişimi için uygun seçenekleri gösteririz.'
            ],
            maslak: [
                'Maslak şubemizde darbe nedeniyle eğilmiş jantları pres makinesinde düzeltiyoruz. Yamuk jant lastiğin jantla temasını bozarak yavaş hava kaçağına ve balans sorunlarına neden olur; erken müdahale lastiği de korur.',
                'Çelik jantlarda çap grubuna göre pres ve torna kaynak hizmeti veriyoruz. Kaynak işlemi, çatlağın yeri ve büyüklüğü incelendikten sonra yapılır; kaynak fiyatlarına işçilik dahil değildir.',
                'Onarım mümkün değilse şubede aracınıza uygun jant seçeneklerini birlikte değerlendirebiliriz.'
            ]
        }
    },
    {
        slug: 'jant-boyama',
        categorySlug: 'jant-firin-ve-boyama-hizmetleri',
        name: 'Jant Boyama (Fırında)',
        summary: 'Çelik jantların takım halinde fırında boyanması.',
        text: {
            'sisli-mecidiyekoy': [
                'Kaldırım sürtmesi, taş izleri ya da solmuş boya jantlarınızın görüntüsünü bozduysa takım halinde jant boyama yaptırabilirsiniz. Boyama fırında yapılır; fırın boya, sprey boyaya göre daha dayanıklı ve pürüzsüz bir yüzey verir.',
                'Fiyatlar dört jantlık takım içindir ve jant çapına göre belirlenir: 13"-16", 17"-18" ve 19" ve üzeri. Jantlarınızı Şişli şubemize bırakırken renk ve teslim süresi bilgisini şubeden alabilirsiniz.'
            ],
            maslak: [
                'Maslak şubemiz üzerinden çelik jantlarınızı takım halinde fırında boyatabilirsiniz. Boyadan önce jant yüzeyi temizlenir ve eski boya kalıntıları giderilir; fırında kurutulan boya uzun süre solmadan kalır.',
                'Takım fiyatları jant çapına göre üç gruptadır. Boyama sürecinde aracınız için geçici çözüm ve teslim süresi konusunda şubemizden bilgi alabilirsiniz.'
            ]
        }
    },
    {
        slug: 'sibop-degisimi',
        categorySlug: 'sibop-fiyatlari-hizmetleri',
        name: 'Sibop Değişimi',
        summary: 'Normal ve çelik sibop değişimi; işçilik dahil.',
        text: {
            'sisli-mecidiyekoy': [
                'Sibop, lastiğin havasını tutan küçük ama kritik bir parçadır; zamanla lastiği çatlar ve yavaş hava kaçağına yol açar. Şişli şubemizde sibop değişimini işçilik dahil fiyatla yapıyoruz.',
                'Oto, 4x4 ve hafif ticari araçlar için standart sibop ile daha dayanıklı çelik sibop seçenekleri var. Yeni lastik taktırırken sibobu da yenilemenizi öneririz.'
            ],
            maslak: [
                'Lastiğinizin havası sürekli azalıyor ama delik bulunamıyorsa sebep çoğu zaman sibop olur. Maslak şubemizde sibobu kontrol edip gerekiyorsa işçilik dahil değiştiriyoruz.',
                'Performans ve premium araçlarda tercih edilen çelik sibop da stoklarımızda. Lastik değişimi sırasında sibop yenilemek sonraki hava kaçağı riskini ortadan kaldırır.'
            ]
        }
    },
    {
        slug: 'far-ayari',
        categorySlug: 'diger-hizmetler',
        name: 'Far Ayarı',
        summary: 'Far yüksekliği ve açısının ayarlanması.',
        text: {
            'sisli-mecidiyekoy': [
                'Yanlış ayarlanmış farlar hem yolu yeterince aydınlatmaz hem de karşıdan gelen sürücülerin gözünü alır. Şişli şubemizde farlarınızın yüksekliğini ve açısını ayarlıyoruz.',
                'Far ampulü değişiminden sonra, ön takımda işlem yapıldığında ya da araç muayenesine girmeden önce far ayarı yaptırmanızı öneririz. Rot-balans veya lastik değişimi için geldiğinizde aynı ziyarette yaptırabilirsiniz.'
            ],
            maslak: [
                'Maslak şubemizde far ayarı ile farların yolu doğru mesafeden aydınlatmasını sağlıyoruz. Düşük ayarlı far görüş mesafesini kısaltır, yüksek ayarlı far ise diğer sürücüleri rahatsız eder.',
                'Araç muayenesi öncesinde ya da gece sürüşünde görüşünüzün azaldığını fark ettiğinizde far ayarı yaptırabilirsiniz; lastik işlemleriyle aynı ziyarette tamamlanır.'
            ]
        }
    }
];

export function getServiceGroup(slug: string): ServiceGroup | undefined {
    return SERVICE_GROUPS.find(g => g.slug === slug);
}

export const CATEGORY_NAME_TO_GROUP: Record<string, string> = {
    'Lastik Tamir Hizmetleri': 'lastik-tamiri-mantar-yama',
    'Rot ve Balans Hizmetleri': 'rot-balans-ayari',
    'Lastik Oteli Hizmetleri': 'lastik-oteli',
    'Yazlık Kışlık Lastik Değişim Hizmetleri': 'yazlik-kislik-lastik-degisimi',
    'Mobil Yol Yardım Hizmetleri': 'mobil-yol-yardim',
    'Jant Pres ve Kaynak Hizmetleri': 'jant-pres-kaynak',
    'Jant Fırın ve Boyama Hizmetleri': 'jant-boyama',
    'Sibop Fiyatları & Hizmetleri': 'sibop-degisimi',
    'Diğer Hizmetler': 'far-ayari'
};
