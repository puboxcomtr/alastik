
export interface VehicleBrandProfile {
    display: string;
    tagline: string;
    about: string[];
    tireIntro?: string;
    tireNotes: string[];
    faqs?: { q: string; a: string }[];
}

export const VEHICLE_BRAND_PROFILES: Record<string, VehicleBrandProfile> = {
    toyota: {
        display: 'Toyota',
        tagline: 'Türkiye’de Sakarya’da üretim yapan, güvenilirlik ve düşük bakım maliyetiyle tanınan Japon üretici',
        about: [
            'Toyota, 1937’de Kiichiro Toyoda tarafından kurulan ve uzun yıllardır dünyanın en çok otomobil satan üreticileri arasında yer alan Japon markasıdır. Markanın Türkiye’deki yeri yalnızca satışla sınırlı değildir: Sakarya Arifiye’deki Toyota Otomotiv Sanayi Türkiye fabrikası 1994’ten bu yana üretim yapar; Corolla ve C-HR gibi modeller buradan Avrupa’ya ihraç edilir. Bu nedenle Türkiye yollarında Toyota, özellikle Corolla ve C-HR ile çok yaygındır.',
            'Toyota’nın mühendislik yaklaşımı “sorunsuz uzun ömür” üzerine kuruludur. Hibrit teknolojisinde öncü olan marka, Corolla Hybrid, C-HR Hybrid, Yaris Hybrid ve RAV4 Hybrid ile Türkiye’de hibrit pazarının büyük bölümünü oluşturur. Hibrit modellerde aracın ağırlığı ve anlık tork, lastik aşınma karakterini etkiler; bu yüzden Toyota hibritlerinde düşük yuvarlanma dirençli ve yük endeksi yüksek lastikler fabrika çıkışı tercih edilir.',
            'Model yelpazesi Aygo ve Yaris gibi küçük şehir otomobillerinden Corolla ve Camry sedanlara, C-HR, RAV4 ve Land Cruiser gibi SUV ve arazi araçlarına, Hilux pick-up ve Proace ticari araçlara kadar uzanır. Bu genişlik, lastik ebatlarının da 14 inçten 20 inç ve üzerine kadar geniş bir aralığa yayılması anlamına gelir.'
        ],
        tireIntro: 'Toyota sahiplerinin lastik seçiminde dikkat etmesi gereken noktalar:',
        tireNotes: [
            'Hibrit modellerde (Corolla, C-HR, Yaris, RAV4) yakıt ekonomisini korumak için AB etiketinde yakıt verimliliği A–B sınıfı lastikler tercih edin; yuvarlanma direnci düşük lastik, hibrit menzilini doğrudan etkiler.',
            'Corolla’nın farklı nesillerinde 15, 16 ve 17 inç jant seçenekleri bir arada bulunur; ebatı kapı sütunundaki etikete göre, nesil tablosuyla doğrulayarak seçin.',
            'Hilux ve Land Cruiser gibi 4x4 modellerde yük endeksi yüksek, gerekiyorsa C (ticari) veya AT (all-terrain) desenli lastikleri değerlendirin; şehir içi ağırlıklı kullanımda HT (highway) desen daha sessiz ve ekonomiktir.',
            'Kış aylarında kış lastiği zorunluluğu olan illerde Toyota sedanlar için 3PMSF işaretli kış lastiği veya kış onaylı 4 mevsim lastik kullanın; ön çekişli Toyota modellerinde dört lastiğin de aynı tipte olması önemlidir.',
            'Lastik basıncını kapı sütunundaki değere göre ayarlayın; hibrit modellerde üretici genellikle yük durumuna göre iki ayrı değer verir.'
        ],
        faqs: [
            { q: 'Toyota Corolla hangi lastik ebatını kullanır?', a: 'Corolla’nın nesline ve donanımına göre 15, 16 ve 17 inç ebatlar fabrika çıkışı kullanılır; 12. nesil (2019 sonrası) Corolla’da 205/55 R16 ve 225/40 R18 yaygındır. Modelin sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' },
            { q: 'Toyota hibrit araçlara özel lastik gerekir mi?', a: 'Özel bir lastik şart değildir ama düşük yuvarlanma dirençli, yük endeksi fabrika değerinin altına inmeyen lastikler önerilir. Hibrit bataryası nedeniyle araç benzinli eşdeğerinden daha ağırdır; yük endeksini düşürmeyin.' }
        ]
    },
    nissan: {
        display: 'Nissan',
        tagline: 'Qashqai ile crossover sınıfını yaygınlaştıran, Türkiye’de SUV ve pick-up modelleriyle öne çıkan Japon üretici',
        about: [
            'Nissan, 1933’te Japonya’da kurulan ve Renault–Nissan–Mitsubishi ittifakının parçası olan bir otomobil üreticisidir. Türkiye pazarında markanın adı uzun süre Qashqai ile özdeşleşmiştir: 2007’de piyasaya çıkan Qashqai, kompakt crossover sınıfını Avrupa’da popülerleştiren model olarak kabul edilir ve Türkiye’de hâlâ en çok satılan SUV’lardan biridir.',
            'Markanın Türkiye yelpazesinde Micra ve Note gibi küçük otomobiller, Juke ve Qashqai crossover’lar, X-Trail ve Pathfinder gibi daha büyük SUV’lar ile Navara pick-up bulunur. Elektrikli tarafta Nissan Leaf, dünyanın ilk seri üretim elektrikli otomobillerinden biri olarak markanın teknoloji iddiasını temsil eder.',
            'Nissan SUV ve crossover modellerinde jant çapı donanıma göre belirgin biçimde değişir: aynı Qashqai nesli 16 inçten 19 inç ve üzerine kadar farklı jantlarla satılmıştır. Bu nedenle Nissan sahiplerinin lastik alırken yalnızca modele değil, donanım seviyesine de bakması gerekir.'
        ],
        tireNotes: [
            'Qashqai ve Juke’ta aynı nesil içinde birden fazla jant çapı bulunur; lastik ebatını aracın üzerindeki jantın çapına ve kapı sütunu etiketine göre seçin.',
            'X-Trail ve Pathfinder gibi 4x4 modellerde dört lastiğin aynı desen ve aşınma seviyesinde olması, dört çeker sistemini korur; tek lastik değişiminden kaçının.',
            'Navara pick-up’ta yük taşıyorsanız yük endeksi yüksek, mümkünse takviyeli (XL veya C) lastik seçin.',
            'Leaf gibi elektrikli modellerde anlık tork yüksektir; aşınmaya dayanıklı ve düşük gürültülü, elektrikli araçlara uygun lastikler menzili ve konforu korur.',
            'Kış lastiği zorunlu illerde crossover modellerde kış onaylı (3PMSF) 4 mevsim lastik pratik bir çözümdür; ağır kış koşullarında ise gerçek kış lastiği daha güvenlidir.'
        ],
        faqs: [
            { q: 'Nissan Qashqai lastik ebatı kaç?', a: 'Qashqai’nin nesline ve donanımına göre 215/65 R16, 215/60 R17, 215/55 R18 ve 235/45 R19 gibi ebatlar fabrika çıkışı kullanılır. Doğru ebat için model sayfasındaki nesil tablosuna ve aracınızın jant çapına bakın.' }
        ]
    },
    volkswagen: {
        display: 'Volkswagen',
        tagline: 'Golf, Polo ve Passat ile Avrupa’nın en çok satan markası; Türkiye’de geniş model ve ebat çeşitliliği',
        about: [
            'Volkswagen, 1937’de Almanya’nın Wolfsburg kentinde kurulmuş, bugün Audi, Škoda, Seat, Porsche ve daha birçok markayı çatısı altında toplayan Volkswagen Grubu’nun ana markasıdır. Beetle ile başlayan hikâye, 1974’te çıkan Golf ile Avrupa’nın en çok satan otomobil ailesine dönüşmüştür. Türkiye’de Polo, Golf, Passat, Jetta ve Tiguan uzun yıllardır en yaygın modeller arasındadır.',
            'Volkswagen modellerinin büyük bölümü grup içinde paylaşılan MQB platformu üzerine kuruludur. Bu, aynı dönemin Golf, Tiguan, T-Roc, Seat Leon ve Škoda Octavia gibi modellerinde benzer bijon düzeni (5x112) ve benzer lastik ebatlarının kullanılması anlamına gelir; jant uyumluluğu açısından Volkswagen sahipleri için seçenek geniştir.',
            'Ticari tarafta Caddy, Transporter, Crafter ve Amarok; elektrikli tarafta ID.3, ID.4 ve ID.5 markanın Türkiye’deki yelpazesini tamamlar. Binek modellerde 15 inçten 20 inç ve üzerine, ticari modellerde C (ticari) işaretli yük lastiklerine kadar geniş bir ebat aralığı söz konusudur.'
        ],
        tireNotes: [
            'Golf ve Polo’da aynı nesil içinde birkaç jant çapı bulunur (ör. 15/16/17 inç); lastik ebatını aracın jant çapına ve kapı sütunundaki etikete göre seçin.',
            'Passat ve Arteon gibi uzun yol otomobillerinde sessiz ve konfor odaklı touring lastikler, yüksek hızda stabilite ve düşük gürültü sağlar.',
            'Tiguan, Touareg ve Amarok’ta yük endeksi yüksek, SUV/4x4 için geliştirilmiş desenleri tercih edin; Amarok’ta ağır yük taşıyorsanız C işaretli lastik gerekebilir.',
            'Transporter ve Caddy ticari kullanımda C (ticari) yük lastikleriyle gelir; binek lastik takmak yük kapasitesini ve ruhsat uyumunu etkiler.',
            'ID serisi elektrikli modellerde yuvarlanma direnci düşük ve elektrikli araçlar için güçlendirilmiş lastikler menzili korur; yük endeksini fabrika değerinin altına indirmeyin.'
        ],
        faqs: [
            { q: 'Volkswagen Golf lastik ebatı nedir?', a: 'Golf’ün nesline ve donanımına göre 195/65 R15, 205/55 R16, 225/45 R17 ve 225/40 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil (Golf 7, Golf 8 vb.) ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' },
            { q: 'Volkswagen jantları başka markalara uyar mı?', a: 'Aynı dönemin Seat, Škoda ve Audi modelleriyle bijon düzeni (5x112) ve çoğu zaman göbek çapı (57.1 mm) ortaktır; ancak ofset (ET) ve jant genişliği modele göre değişir. Jant seçerken üç değeri de kontrol edin.' }
        ]
    },
    mercedes: {
        display: 'Mercedes-Benz',
        tagline: 'premium segmentin öncüsü; Türkiye’de binek, SUV ve ticari araçlarıyla yaygın bir Alman üretici',
        about: [
            'Mercedes-Benz, 1886’da Karl Benz’in ürettiği ilk otomobile kadar uzanan tarihiyle dünyanın en köklü otomobil markasıdır. Stuttgart merkezli üretici, Türkiye’de de güçlü bir sanayi varlığına sahiptir: Mercedes-Benz Türk’ün Hoşdere’deki otobüs ve Aksaray’daki kamyon fabrikaları yıllardır üretim yapar; binek tarafta A, B, C, E ve S serileri ile GLA, GLB, GLC ve GLE SUV’ları Türkiye yollarında yaygındır.',
            'Mercedes modellerinde lastik ebatı, aynı seri içinde donanım paketine (AMG Line gibi) göre belirgin biçimde değişir; birçok modelde ön ve arka akslarda farklı genişlikte lastik kullanılır. Bu “karışık ebat” uygulaması özellikle C, E ve S serilerinin AMG donanımlarında ve AMG performans modellerinde yaygındır.',
            'Marka, bazı modellerinde fabrika çıkışı run-flat (MOExtended) lastik kullanır ve üretici onaylı lastikler “MO” işaretiyle ayrılır. Ticari tarafta Vito, Sprinter ve Citan, elektrikli tarafta EQA, EQB, EQC ve EQS markanın yelpazesini tamamlar.'
        ],
        tireNotes: [
            'Ön ve arka aks ebatları farklı olan modellerde (karışık ebat) iki ebatı da doğru seçin; aks başına ikişer lastik değiştirin.',
            'Fabrika çıkışı run-flat (MOExtended) lastikli modellerde normal lastiğe geçilebilir, ancak araçta stepne veya tamir kiti bulunduğundan emin olun.',
            'MO (Mercedes Original) işaretli lastikler üreticiyle birlikte geliştirilmiştir; şart değildir ama aynı ebat ve endekste onaylı desen varsa öncelik verin.',
            'GLE, GLS ve G-Serisi gibi ağır SUV’larda yük endeksi yüksek, SUV için geliştirilmiş lastikler kullanın; büyük jant çaplarında (20–22 inç) yanak inceldiği için jant hasarına karşı basınca dikkat edin.',
            'Vito ve Sprinter ticari modellerde C işaretli yük lastikleri gerekir; EQ serisi elektrikli modellerde yüksek yük endeksli, düşük dirençli lastikler menzili korur.'
        ],
        faqs: [
            { q: 'Mercedes-Benz araçlarda ön ve arka lastik ebatı neden farklı?', a: 'Arkadan itişli ve güçlü modellerde arka aksa daha geniş lastik takılarak çekiş ve denge artırılır. Bu araçlarda lastikler aks başına çift olarak değiştirilir; çapraz rotasyon yapılmaz.' },
            { q: 'Mercedes’te MO işaretli lastik şart mı?', a: 'Yasal bir zorunluluk değildir. MO işareti, lastiğin Mercedes-Benz ile birlikte geliştirildiğini gösterir. Aynı ebat, yük ve hız endeksine sahip uygun lastikler de kullanılabilir; run-flat gereksinimi varsa ona dikkat edin.' }
        ]
    },
    hyundai: {
        display: 'Hyundai',
        tagline: 'İzmit’te üretim yapan, i10, i20 ve Tucson ile Türkiye’nin en çok satan markalarından Koreli üretici',
        about: [
            'Hyundai, 1967’de Güney Kore’de kurulan ve Kia ile birlikte Hyundai Motor Group’u oluşturan üreticidir. Türkiye ile bağı özellikle güçlüdür: İzmit’teki Hyundai Assan fabrikası 1997’den bu yana üretim yapar ve i10, i20 gibi modeller buradan Avrupa’ya ihraç edilir. Bu nedenle i20, Türkiye’de en yaygın otomobillerden biridir.',
            'Markanın yelpazesi i10 ve i20 gibi küçük otomobillerden Elantra ve i30’a, Bayon, Kona, Tucson ve Santa Fe gibi SUV’lara, IONIQ 5 ve IONIQ 6 elektrikli modellere kadar uzanır. Tucson, Türkiye’de uzun süre en çok satan SUV’lardan biri olmuştur.',
            'Hyundai’nin son yıllarda tasarım ve elektrikli araç alanındaki atılımı, lastik ebatlarını da büyütmüştür: IONIQ 5 ve Tucson’un üst donanımları 19–20 inç jantlarla gelirken i10 ve i20 hâlâ 14–16 inç ekonomik ebatları kullanır.'
        ],
        tireNotes: [
            'i20’nin farklı nesil ve donanımlarında 15, 16 ve 17 inç jant bulunur; ebatı aracın jant çapına ve kapı sütunundaki etikete göre seçin.',
            'Tucson ve Santa Fe’de SUV için geliştirilmiş, yük endeksi yüksek lastikler tercih edin; hibrit ve plug-in hibrit sürümler daha ağır olduğundan yük endeksi özellikle önemlidir.',
            'IONIQ 5 ve IONIQ 6 gibi elektrikli modellerde elektrikli araçlar için güçlendirilmiş, düşük gürültülü ve düşük dirençli lastikler menzil ve konforu korur.',
            'i10 ve Bayon gibi şehir otomobillerinde yakıt ekonomisi için AB etiketi yakıt sınıfı yüksek lastikler bütçeye katkı sağlar.',
            'Kış lastiği zorunlu illerde Hyundai’nin ön çekişli modellerinde dört lastiğin de kış lastiği olması gerekir; yalnızca ön aksa kış lastiği takmak kaymayı artırır.'
        ],
        faqs: [
            { q: 'Hyundai i20 lastik ebatı kaç?', a: 'i20’nin nesil ve donanımına göre 185/65 R15, 195/55 R16 ve 215/45 R17 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre doğru ölçüyü görebilirsiniz.' }
        ]
    },
    kia: {
        display: 'Kia',
        tagline: 'Sportage ve Picanto ile tanınan, 7 yıl garantisiyle öne çıkan Koreli üretici',
        about: [
            'Kia, 1944’te Güney Kore’de kurulan ve 1998’den bu yana Hyundai Motor Group bünyesinde yer alan bir otomobil üreticisidir. Marka, 2000’li yıllarda tasarım odaklı bir dönüşüm geçirmiş ve Avrupa’da sunduğu 7 yıl garanti ile güven algısını güçlendirmiştir. Türkiye’de Picanto, Rio, Ceed, Sportage ve Sorento en yaygın modellerdir.',
            'Kia modelleri, Hyundai ile platform ve teknik altyapıyı paylaşır: Sportage ile Tucson, Ceed ile i30, Picanto ile i10 aynı temeller üzerine kuruludur. Bu, bijon düzeni ve lastik ebatlarının da kardeş modellerle büyük ölçüde örtüşmesi anlamına gelir.',
            'Elektrikli tarafta EV6 ve EV9, hibrit tarafta Niro ve Sportage Hybrid markanın güncel yelpazesini oluşturur. Küçük modellerde 14–16 inç, SUV ve elektrikli modellerde 18–21 inç jantlar fabrika çıkışı kullanılır.'
        ],
        tireNotes: [
            'Sportage’ın her neslinde birkaç jant çapı bulunur (16–19 inç); ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'Picanto ve Rio gibi küçük modellerde yakıt ekonomisi ve düşük gürültü odaklı lastikler şehir kullanımında en iyi sonucu verir.',
            'Sorento ve EV9 gibi büyük ve ağır modellerde yük endeksi fabrika değerinin altına inmeyen, SUV için geliştirilmiş lastikler şarttır.',
            'EV6 ve Niro EV’de elektrikli araçlar için güçlendirilmiş, düşük dirençli lastikler menzili korur; yüksek anlık tork aşınmayı hızlandırdığından rotasyonu ihmal etmeyin.',
            'Kış lastiği zorunlu illerde Kia’nın ön çekişli modellerinde dört tekerleğe de kış lastiği takın.'
        ],
        faqs: [
            { q: 'Kia Sportage lastik ebatı nedir?', a: 'Sportage’ın nesline ve donanımına göre 215/70 R16, 225/60 R17, 235/55 R18 ve 235/50 R19 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    ford: {
        display: 'Ford',
        tagline: 'Kocaeli ve Eskişehir’de üretim yapan, Transit ve Focus ile Türkiye’nin en köklü otomotiv markalarından',
        about: [
            'Ford, 1903’te Henry Ford tarafından Detroit’te kurulmuş ve seri üretim bandıyla otomobili kitlelere ulaştırmıştır. Türkiye’de Ford Otosan ortaklığı 1959’a kadar uzanır; Kocaeli Gölcük ve Yeniköy fabrikaları ile Eskişehir motor fabrikası, Transit, Transit Custom ve Courier modellerini dünyaya ihraç eden en büyük Ford üretim üslerindendir. Bu nedenle Transit ailesi Türkiye yollarında olağanüstü yaygındır.',
            'Binek tarafta Fiesta, Focus, Mondeo ve Kuga uzun yıllar Türkiye’de en çok satanlar arasında yer almıştır; Puma ve Mustang Mach-E markanın güncel crossover ve elektrikli temsilcileridir. Pick-up segmentinde Ranger, Türkiye’de de sık tercih edilen bir modeldir.',
            'Ford’un ticari ve binek modellerinin bir arada olması, lastik ihtiyacını da iki uca yayar: Focus ve Puma 16–18 inç binek lastikleri kullanırken Transit ve Ranger’da yük endeksi yüksek, C işaretli ticari lastikler veya AT desenler gerekir.'
        ],
        tireNotes: [
            'Transit, Transit Custom ve Courier ticari kullanımda C (ticari) işaretli, yük endeksi yüksek lastiklerle gelir; binek lastik takmak taşıma kapasitesini düşürür.',
            'Focus ve Fiesta’da aynı nesil içinde 15–18 inç jant seçenekleri bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'Kuga ve Puma gibi crossover modellerde SUV için geliştirilmiş, sessiz ve ıslak zemin performansı yüksek lastikler uzun yol konforunu artırır.',
            'Ranger’da arazi kullanımı varsa AT (all-terrain), ağırlıklı asfalt kullanımında HT (highway) desen tercih edin; dört lastiğin aynı desen olması dört çeker sistemini korur.',
            'Mustang Mach-E gibi elektrikli modellerde elektrikli araçlar için güçlendirilmiş, düşük dirençli lastikler menzili ve sessizliği korur.'
        ],
        faqs: [
            { q: 'Ford Transit lastik ebatı kaç?', a: 'Transit’in nesline ve gövde tipine göre 215/75 R16C ve 235/65 R16C yaygın fabrika ebatlarıdır; Transit Custom’da 215/65 R16C ve 215/60 R17C, Courier’de 195/60 R16C ve 205/60 R16C kullanılır. Ticari modellerde C işaretli lastik şarttır.' },
            { q: 'Ford Focus hangi lastik ebatını kullanır?', a: 'Focus’un nesline ve donanımına göre 205/55 R16, 215/50 R17 ve 235/40 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    fiat: {
        display: 'Fiat',
        tagline: 'Bursa’da üretilen Egea ile Türkiye’nin en çok satan otomobilini üreten İtalyan marka',
        about: [
            'Fiat, 1899’da Torino’da kurulmuş, bugün Stellantis grubunun parçası olan İtalyan üreticidir. Türkiye’deki tarihi Tofaş ile 1968’e kadar uzanır; Bursa’daki Tofaş fabrikasında üretilen Egea (yurt dışında Tipo), yıllardır Türkiye’nin en çok satan otomobilidir. Egea Sedan, Hatchback ve Cross gövdeleriyle Türkiye yollarında en sık görülen araçtır.',
            'Markanın Türkiye yelpazesinde Egea ailesinin yanında 500 ve Panda gibi küçük şehir otomobilleri, Doblo ve Fiorino hafif ticari araçlar ile Ducato büyük van bulunur. Doblo ve Fiorino da Bursa’da üretilmiştir ve ticari kullanımda çok yaygındır.',
            'Fiat modellerinde bijon düzeni ağırlıklı olarak 4x98 ve 5x98 (Egea, Doblo) ile 4x100’dür; bu ölçü İtalyan grubuna özgüdür ve jant seçiminde dikkat gerektirir. Egea’da 16 ve 17 inç, Doblo ve Fiorino’da 15–16 inç ebatlar yaygındır.'
        ],
        tireNotes: [
            'Egea’da 195/55 R16, 205/55 R16 ve 225/45 R17 ebatları donanıma göre değişir; Cross sürümünde 225/45 R17 ve 215/55 R17 kullanılır. Ebatı aracın jant çapına göre seçin.',
            'Egea Sedan uzun yolda çok kullanıldığından ıslak zemin frenlemesi iyi, sessiz touring lastikler konforu artırır; şehir içi kullanımda yakıt sınıfı yüksek lastikler bütçeye katkı sağlar.',
            'Doblo ve Fiorino ticari kullanımda C (ticari) veya yük endeksi yüksek lastik gerektirir; binek sürümlerde (Doblo Combi) binek lastik kullanılabilir.',
            'Fiat jantlarının bijon düzeni (4x98 / 5x98) birçok markadan farklıdır; jant alırken bijon, göbek çapı (58.1 mm) ve ofset değerlerini mutlaka kontrol edin.',
            'Kış lastiği zorunlu illerde Egea için 3PMSF işaretli kış lastiği veya kış onaylı 4 mevsim lastik kullanın; dört lastik aynı tipte olmalıdır.'
        ],
        faqs: [
            { q: 'Fiat Egea lastik ebatı nedir?', a: 'Egea’da donanıma göre 195/55 R16, 205/55 R16 ve 225/45 R17 fabrika çıkışı kullanılır; Egea Cross’ta 215/55 R17 ve 225/45 R17 yaygındır. Model sayfasında motor ve donanım seçeneğine göre tam ölçüyü görebilirsiniz.' },
            { q: 'Fiat Egea jant bijon ölçüsü kaç?', a: 'Egea’nın bijon düzeni 5x98, göbek çapı 58.1 mm’dir. Aynı ölçü Doblo ve bazı Alfa Romeo / Jeep modellerinde de kullanılır; jant seçerken ofset (ET) değerini de kontrol edin.' }
        ]
    },
    renault: {
        display: 'Renault',
        tagline: 'Bursa’da Clio ve Megane üreten, Türkiye’nin en köklü ve en yaygın otomobil markalarından Fransız üretici',
        about: [
            'Renault, 1899’da Louis Renault tarafından Paris yakınlarında kurulmuş Fransız üreticidir. Türkiye ile bağı 1969’da Bursa’da kurulan Oyak Renault fabrikasıyla başlar; Clio, Megane ve daha önce Symbol ile Fluence burada üretilmiş, Türkiye pazarının en çok satan modelleri arasında yer almıştır. Türkiye yollarında Clio, Megane ve Symbol olağanüstü yaygındır.',
            'Markanın yelpazesi Clio ve Captur gibi küçük otomobil ve crossover’lardan Megane, Austral ve Koleos’a, Kangoo, Trafic ve Master ticari araçlara kadar uzanır. Elektrikli tarafta Zoe ve Megane E-Tech markanın öncü modelleridir; Renault, Avrupa’da elektrikli araçta en erken yatırım yapan üreticilerdendir.',
            'Renault modellerinde bijon düzeni ağırlıklı olarak 4x100 (Clio, Symbol, Captur) ve 5x114.3 (Megane, Koleos, Austral) olup lastik ebatları 15 inçten 20 inç’e kadar değişir. Clio ve Megane’ın birçok nesli olduğundan ebat seçiminde nesil bilgisi özellikle önemlidir.'
        ],
        tireNotes: [
            'Clio’nun farklı nesillerinde 15, 16 ve 17 inç jantlar bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'Megane 4’te 16, 17 ve 18 inç seçenekler donanıma göre değişir; sedan ve hatchback gövdelerde ebat farklı olabilir.',
            'Kangoo, Trafic ve Master ticari kullanımda C işaretli yük lastikleri gerektirir; Kangoo binek (Combi) sürümlerinde binek lastik kullanılabilir.',
            'Zoe ve Megane E-Tech elektrikli modellerde düşük dirençli, elektrikli araçlar için güçlendirilmiş lastikler menzili korur.',
            'Kış lastiği zorunlu illerde Renault’nun ön çekişli modellerinde dört tekerleğe de kış lastiği takın; tek aks kış lastiği güvenli değildir.'
        ],
        faqs: [
            { q: 'Renault Clio lastik ebatı kaç?', a: 'Clio’nun nesline göre 185/65 R15, 195/55 R16 ve 205/45 R17 yaygın fabrika ebatlarıdır. Model sayfasında nesil (Clio 4, Clio 5 vb.) ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' },
            { q: 'Renault Megane hangi lastik ebatını kullanır?', a: 'Megane’ın nesline ve donanımına göre 205/55 R16, 205/50 R17 ve 225/40 R18 yaygındır. Sedan ve hatchback gövdelerde ebat farklı olabilir; model sayfasındaki nesil tablosuna bakın.' }
        ]
    },
    opel: {
        display: 'Opel',
        tagline: 'Corsa ve Astra ile Türkiye’de yıllardır yaygın olan, bugün Stellantis bünyesindeki Alman marka',
        about: [
            'Opel, 1862’de Adam Opel tarafından Rüsselsheim’da kurulmuş, uzun yıllar General Motors bünyesinde kaldıktan sonra 2017’de PSA’ya, ardından Stellantis grubuna katılmış bir Alman üreticidir. Türkiye’de Corsa, Astra, Vectra ve Insignia uzun yıllar en çok satan modeller arasında yer almış; Astra özellikle 2000’li yıllarda Türkiye’nin en yaygın otomobillerinden biri olmuştur.',
            'Stellantis dönemiyle birlikte Opel modelleri Peugeot ve Citroën ile platform paylaşır: yeni Corsa ile Peugeot 208, yeni Astra ile Peugeot 308, Grandland ile 3008 teknik altyapıyı ortak kullanır. Bu durum bijon düzeninin de değişmesine yol açmıştır: eski GM dönemi Opel’lerde 5x110 ve 4x100 kullanılırken yeni nesil modellerde 4x108 ve 5x108 görülür.',
            'Markanın güncel yelpazesinde Corsa, Astra, Mokka, Crossland ve Grandland ile Combo, Vivaro ve Movano ticari araçlar bulunur; Corsa-e ve Mokka-e elektrikli sürümlerdir.'
        ],
        tireNotes: [
            'Opel’de nesil değişimiyle bijon düzeni değişmiştir (5x110 → 5x108, 4x100 → 4x108); eski jantı yeni nesil araca takmadan önce ölçüleri mutlaka kontrol edin.',
            'Astra ve Corsa’da aynı nesil içinde 15–18 inç jant seçenekleri bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'Grandland ve Mokka gibi crossover modellerde SUV için geliştirilmiş, sessiz ve ıslak zeminde güçlü lastikler konforu artırır.',
            'Combo, Vivaro ve Movano ticari kullanımda C işaretli yük lastikleri gerektirir.',
            'Corsa-e ve Mokka-e elektrikli modellerde düşük dirençli, yük endeksi yüksek lastikler menzili korur.'
        ],
        faqs: [
            { q: 'Opel Astra lastik ebatı nedir?', a: 'Astra’nın nesline ve donanımına göre 205/55 R16, 225/45 R17 ve 225/40 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil (Astra J, K, L vb.) ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    peugeot: {
        display: 'Peugeot',
        tagline: '208, 308 ve 3008 ile tanınan, tasarım odaklı Fransız üretici; Stellantis grubunun parçası',
        about: [
            'Peugeot, kökleri 1810’a uzanan ve 1889’dan bu yana otomobil üreten, dünyanın en eski otomobil markalarından biridir. Fransız üretici bugün Stellantis grubunun parçasıdır ve Citroën, Opel, Fiat gibi markalarla platform paylaşır. Türkiye’de 206, 207 ve 208 ile 301, 308 ve 3008 uzun yıllardır yaygın modellerdir; 3008, Türkiye’de en çok satan SUV’lar arasında yer almıştır.',
            'Peugeot modellerinde bijon düzeni 4x108 (208, 2008, 301, 308) ve 5x108 (3008, 5008, 508) olarak ayrılır; bu ölçü Citroën ve yeni nesil Opel modelleriyle ortaktır. Lastik ebatları 15 inçten 20 inç’e kadar değişir; 3008 ve 5008’in üst donanımlarında 19 inç jant yaygındır.',
            'Markanın yelpazesinde Partner, Expert ve Boxer ticari araçlar ile e-208, e-2008 ve e-3008 elektrikli modeller de bulunur. Peugeot, i-Cockpit adını verdiği küçük direksiyonlu sürüş pozisyonuyla tanınır.'
        ],
        tireNotes: [
            '208 ve 308’de aynı nesil içinde 16–18 inç jant seçenekleri bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            '3008 ve 5008’de SUV için geliştirilmiş, yük endeksi yüksek ve sessiz lastikler tercih edin; 19 inç jantlarda yanak ince olduğundan basınç takibi önemlidir.',
            'Partner, Expert ve Boxer ticari kullanımda C işaretli yük lastikleri gerektirir; Rifter gibi binek sürümlerde binek lastik kullanılabilir.',
            'e-208 ve e-2008 elektrikli modellerde elektrikli araçlar için güçlendirilmiş, düşük dirençli lastikler menzili korur.',
            'Kış lastiği zorunlu illerde ön çekişli Peugeot modellerinde dört tekerleğe de kış lastiği takın.'
        ],
        faqs: [
            { q: 'Peugeot 3008 lastik ebatı kaç?', a: '3008’in nesline ve donanımına göre 215/65 R17, 225/55 R18 ve 235/50 R19 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    mazda: {
        display: 'Mazda',
        tagline: 'Skyactiv motorları ve Kodo tasarımıyla tanınan, sürüş keyfini öne çıkaran Japon üretici',
        about: [
            'Mazda, 1920’de Hiroşima’da kurulmuş ve uzun süre Wankel (döner pistonlu) motorlarıyla farklılaşmış bir Japon üreticidir. Markanın bugünkü kimliği, düşük ağırlık ve yüksek verimlilik hedefleyen Skyactiv teknolojileri ile Kodo tasarım dilidir. Türkiye’de Mazda2, Mazda3, Mazda6, CX-3, CX-30 ve CX-5 en yaygın modellerdir; MX-5 roadster ise markanın sürüş keyfi iddiasının simgesidir.',
            'Mazda, rakiplerinden farklı olarak küçük motor–turbo yerine büyük hacimli, yüksek sıkıştırmalı atmosferik motorları tercih etmiş; bu da modellerin ağırlık dağılımı ve direksiyon hissi üzerinde hassas bir ayar yapıldığı anlamına gelir. Lastik seçimi bu karakteri doğrudan etkiler: sert ve sportif lastikler Mazda’nın direksiyon tepkisini öne çıkarırken konfor lastikleri yol gürültüsünü azaltır.',
            'Modellerde bijon düzeni 5x114.3 yaygındır (Mazda3, Mazda6, CX-5, CX-30); Mazda2’de 4x100 kullanılır. Lastik ebatları 15 inçten 20 inç’e kadar değişir; CX-5 ve CX-60’ın üst donanımlarında 19–20 inç jant bulunur.'
        ],
        tireNotes: [
            'Mazda3 ve CX-30’da aynı nesil içinde 16 ve 18 inç jant seçenekleri bulunur; ebatı aracın jant çapına göre seçin.',
            'CX-5 ve CX-60 gibi SUV modellerde yük endeksi yüksek, SUV için geliştirilmiş sessiz lastikler konforu korur.',
            'MX-5’te hafif ve sportif karakteri korumak için yüksek tutuşlu yaz lastikleri; kışın ise mutlaka kış lastiği kullanın (arkadan itiş).',
            'Mazda6 gibi uzun yol sedanlarında ıslak zemin frenlemesi güçlü touring lastikler güvenliği artırır.',
            'Kış lastiği zorunlu illerde dört tekerleğe de kış lastiği takın; CX-5 AWD sürümlerinde dört lastiğin aynı desen ve aşınmada olması dört çeker sistemini korur.'
        ],
        faqs: [
            { q: 'Mazda CX-5 lastik ebatı kaç?', a: 'CX-5’in nesline ve donanımına göre 225/65 R17 ve 225/55 R19 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    volvo: {
        display: 'Volvo',
        tagline: 'güvenlik alanındaki öncülüğüyle tanınan, XC40, XC60 ve XC90 ile Türkiye’de yaygın İsveçli premium üretici',
        about: [
            'Volvo, 1927’de Göteborg’da kurulmuş ve üç noktalı emniyet kemerini 1959’da icat edip patentini tüm üreticilere açmasıyla otomotiv güvenliğinin simgesi hâline gelmiş İsveçli üreticidir. 2010’dan bu yana Çinli Geely grubuna bağlı olan marka, premium segmentte Alman üreticilere alternatif olarak konumlanır. Türkiye’de XC40, XC60 ve XC90 SUV’lar ile S60, S90 ve V60 sedan/station modelleri yaygındır.',
            'Volvo, 2020’lerde tüm modellerini hibrit veya elektrikli hâle getirme yolunda ilerlemektedir; Recharge plug-in hibrit ve EX30, EX90, C40 gibi tam elektrikli modeller yelpazeyi oluşturur. Bu araçlar ağır bataryalar taşıdığından yük endeksi yüksek ve elektrikli araçlara uygun lastikler fabrika çıkışı kullanılır.',
            'Modellerde bijon düzeni 5x108 yaygındır; XC90 ve XC60’ın üst donanımlarında 20–22 inç jantlar bulunur. Büyük jant çapı, lastik yanağını inceltir ve basınç takibini daha önemli kılar.'
        ],
        tireNotes: [
            'XC60 ve XC90’da 18–22 inç arası jant seçenekleri donanıma göre değişir; ebatı aracın jant çapına göre seçin ve büyük çaplarda yanak hasarına karşı basınca dikkat edin.',
            'Recharge (plug-in hibrit) ve EX serisi elektrikli modellerde yük endeksi fabrika değerinin altına inmeyen, elektrikli araçlar için güçlendirilmiş lastikler şarttır.',
            'Volvo, bazı modellerinde fabrika çıkışı Volvo onaylı (VOL işaretli) lastikler kullanır; şart değildir ama aynı ebatta onaylı desen varsa öncelik verin.',
            'AWD sürümlerde dört lastiğin aynı desen ve aşınmada olması dört çeker sistemini korur; tek lastik değişiminden kaçının.',
            'Kış aylarında İskandinav tasarımlı Volvo’larda bile kış lastiği gerekir; 3PMSF işaretli kış lastiği veya kış onaylı 4 mevsim kullanın.'
        ],
        faqs: [
            { q: 'Volvo XC60 lastik ebatı nedir?', a: 'XC60’ın nesline ve donanımına göre 235/60 R18, 235/55 R19, 255/45 R20 ve 265/40 R21 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    mitsubishi: {
        display: 'Mitsubishi',
        tagline: 'L200 pick-up ve Outlander ile tanınan, 4x4 geleneği güçlü Japon üretici',
        about: [
            'Mitsubishi Motors, kökleri 1870’lere uzanan Mitsubishi grubunun otomobil koludur ve 1917’de Japonya’nın ilk seri üretim otomobilini üretmiştir. Marka bugün Renault–Nissan–Mitsubishi ittifakının parçasıdır. Türkiye’de en yaygın modeli, uzun yıllardır pick-up pazarının liderlerinden olan L200’dür; Outlander, ASX ve Eclipse Cross SUV tarafını, Space Star ve Attrage ise küçük sınıfı temsil eder.',
            'Mitsubishi’nin ralli geçmişi (Lancer Evolution, Pajero ile Dakar zaferleri) markanın dört çeker teknolojisindeki tecrübesini yansıtır. Super Select 4WD sistemi L200 ve Pajero’da kullanılır; bu araçlarda lastiklerin dört tekerlekte de aynı desen ve çapta olması sistemin sağlığı için önemlidir.',
            'Modellerde bijon düzeni 5x114.3 (Lancer, Outlander, ASX) ve 6x139.7 (L200, Pajero) olarak ayrılır. L200’de 16–18 inç, Outlander’da 18–20 inç, Space Star’da 14–15 inç ebatlar yaygındır.'
        ],
        tireNotes: [
            'L200’de arazi ve yük kullanımı varsa AT (all-terrain) veya yük endeksi yüksek C işaretli lastik; asfalt ağırlıklı kullanımda HT (highway) desen daha sessiz ve ekonomiktir.',
            'Outlander PHEV ağır bir araçtır; yük endeksi fabrika değerinin altına inmeyen, SUV için geliştirilmiş lastikler kullanın.',
            'Super Select 4WD sistemli modellerde dört lastiğin aynı desen, çap ve aşınma seviyesinde olması şarttır.',
            'Space Star ve Attrage gibi küçük modellerde yakıt ekonomisi odaklı lastikler bütçeye katkı sağlar.',
            'Kış lastiği zorunlu illerde L200 için 3PMSF işaretli kış veya 4 mevsim AT lastikleri değerlendirin.'
        ],
        faqs: [
            { q: 'Mitsubishi L200 lastik ebatı kaç?', a: 'L200’ün nesline ve donanımına göre 205/80 R16, 245/70 R16, 245/65 R17 ve 265/60 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve donanıma göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    honda: {
        display: 'Honda',
        tagline: 'Civic ve CR-V ile tanınan, motor teknolojisindeki tecrübesiyle öne çıkan Japon üretici',
        about: [
            'Honda, 1948’de Soichiro Honda tarafından kurulmuş ve önce motosiklet, sonra otomobil üretimiyle dünyanın en büyük motor üreticisi hâline gelmiştir. Türkiye’de markanın adı Civic ile özdeşleşmiştir: Civic Sedan, 1997–2021 arasında Gebze’deki Honda Türkiye fabrikasında üretilmiş ve Türkiye’nin en çok satan otomobilleri arasında yer almıştır. CR-V, HR-V ve Jazz da yaygın modellerdir.',
            'Honda’nın VTEC motorları ve hibrit sistemleri (e:HEV) markanın teknoloji kimliğini oluşturur. Civic’in sportif Type R sürümü, ön çekişli otomobiller arasında performans referansı kabul edilir ve yüksek performans lastikleriyle gelir.',
            'Modellerde bijon düzeni 5x114.3 yaygındır (Civic, CR-V, Accord); Jazz’da 4x100 kullanılır. Civic’te 16–18 inç, CR-V’de 17–19 inç, Jazz’da 15–16 inç ebatlar fabrika çıkışı bulunur.'
        ],
        tireNotes: [
            'Civic’in farklı nesillerinde 16, 17 ve 18 inç jant seçenekleri bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'CR-V ve HR-V’de SUV için geliştirilmiş, sessiz ve ıslak zemin performansı yüksek lastikler uzun yol konforunu artırır; e:HEV hibrit sürümlerde yük endeksine dikkat edin.',
            'Civic Type R gibi performans modellerinde fabrika hız endeksini düşürmeyin; yüksek tutuşlu yaz lastikleri kullanın.',
            'Jazz gibi küçük modellerde yakıt ekonomisi odaklı lastikler şehir kullanımında avantaj sağlar.',
            'Kış lastiği zorunlu illerde ön çekişli Honda modellerinde dört tekerleğe de kış lastiği takın.'
        ],
        faqs: [
            { q: 'Honda Civic lastik ebatı nedir?', a: 'Civic’in nesline ve donanımına göre 205/55 R16, 215/50 R17 ve 235/40 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    suzuki: {
        display: 'Suzuki',
        tagline: 'Vitara, Swift ve Jimny ile tanınan, küçük ve hafif araçlarda uzman Japon üretici',
        about: [
            'Suzuki, 1909’da dokuma tezgâhı üreticisi olarak kurulmuş, 1955’ten bu yana otomobil üreten Japon markasıdır. Küçük ve hafif araçlardaki uzmanlığıyla bilinir; Hindistan’da Maruti Suzuki ortaklığıyla dünyanın en büyük küçük otomobil üreticilerinden biridir. Türkiye’de Swift, Vitara, S-Cross ve Jimny en yaygın modellerdir.',
            'Suzuki’nin AllGrip dört çeker sistemi Vitara ve S-Cross’ta, gerçek arazi kabiliyetiyle tanınan Jimny ise kompakt 4x4 sınıfında kendi başına bir efsanedir. Markanın çoğu modeli hafif olduğundan küçük hacimli motorlarla düşük yakıt tüketimi sunar; hafif araçlarda yuvarlanma direnci düşük lastiğin etkisi daha belirgindir.',
            'Modellerde bijon düzeni 5x114.3 (Vitara, S-Cross, Swift yeni nesil) ve 4x100 (Swift eski nesil, Celerio) ile Jimny’de 5x139.7 kullanılır. Swift’te 15–16 inç, Vitara’da 16–17 inç, Jimny’de 15 inç ebatlar fabrika çıkışıdır.'
        ],
        tireNotes: [
            'Jimny’de arazi kullanımı varsa AT (all-terrain) desen; asfalt ağırlıklı kullanımda HT desen daha sessiz ve ekonomiktir. 195/80 R15 ebatı Jimny’ye özgüdür.',
            'Vitara ve S-Cross AllGrip sürümlerinde dört lastiğin aynı desen ve aşınmada olması dört çeker sistemini korur.',
            'Swift gibi hafif modellerde düşük yuvarlanma dirençli lastikler yakıt tüketimine belirgin katkı sağlar.',
            'Swift Sport’ta fabrika hız endeksini düşürmeyin; yüksek tutuşlu yaz lastikleri sürüş karakterini korur.',
            'Kış lastiği zorunlu illerde 3PMSF işaretli kış lastiği veya kış onaylı 4 mevsim kullanın.'
        ],
        faqs: [
            { q: 'Suzuki Vitara lastik ebatı kaç?', a: 'Vitara’nın donanımına göre 215/60 R16 ve 215/55 R17 yaygın fabrika ebatlarıdır; S-Cross’ta 215/55 R17 kullanılır. Model sayfasında motor ve donanıma göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    lexus: {
        display: 'Lexus',
        tagline: 'Toyota’nın premium markası; hibrit teknolojisi ve sessizlik odaklı SUV ve sedanlarıyla tanınır',
        about: [
            'Lexus, Toyota’nın 1989’da ABD pazarı için kurduğu premium markasıdır ve kısa sürede Alman premium üreticilere güçlü bir alternatif hâline gelmiştir. Markanın kimliği olağanüstü işçilik, sessizlik ve güvenilirlik üzerine kuruludur; Lexus, premium segmentte hibrit teknolojisini ilk yaygınlaştıran marka olmuştur. Türkiye’de NX, RX ve UX SUV’lar ile ES ve IS sedanlar yaygındır.',
            'Lexus modelleri Toyota platformlarını paylaşır (NX ile RAV4, UX ile C-HR, ES ile Camry) ancak süspansiyon ayarları konfor ve sessizlik öncelikli yapılır. Bu nedenle Lexus sahipleri genellikle sessiz, konfor odaklı premium lastikleri tercih eder; F Sport donanımları ise daha sportif lastiklerle gelir.',
            'Modellerde bijon düzeni 5x114.3 yaygındır; RX ve NX’in üst donanımlarında 20–21 inç jantlar bulunur. Hibrit ve plug-in hibrit sürümler ağır olduğundan yük endeksi yüksek lastikler fabrika çıkışı kullanılır.'
        ],
        tireNotes: [
            'Sessizlik Lexus’un ana vaadi olduğundan AB etiketinde gürültü değeri düşük (A sınıfı veya 68 dB altı) lastikler markanın karakterini korur.',
            'RX ve NX hibritleri ağır araçlardır; yük endeksini fabrika değerinin altına indirmeyin.',
            '20–21 inç jantlı donanımlarda ince yanak nedeniyle basınç takibi ve çukurlara karşı dikkat önemlidir.',
            'F Sport donanımlarında fabrika hız endeksini düşürmeyin; performans odaklı lastikler direksiyon hissini korur.',
            'Kış lastiği zorunlu illerde AWD sürümlerde bile dört tekerleğe kış lastiği gerekir.'
        ]
    },
    subaru: {
        display: 'Subaru',
        tagline: 'simetrik dört çeker ve boxer motoruyla tanınan, Forester ve XV ile Türkiye’de bilinen Japon üretici',
        about: [
            'Subaru, 1953’te kurulan Fuji Heavy Industries’in (bugünkü Subaru Corporation) otomobil markasıdır. Markanın iki teknik imzası vardır: yatay karşıt silindirli boxer motor ve neredeyse tüm modellerde standart olan simetrik dört çeker (Symmetrical AWD) sistemi. Ralli dünyasında Impreza WRX ile kazanılan şampiyonluklar markanın kimliğini şekillendirmiştir. Türkiye’de Forester, XV (Crosstrek), Outback ve Impreza en bilinen modellerdir.',
            'Simetrik dört çeker sistemi, lastik seçiminde özel bir disiplin gerektirir: dört lastiğin çapı, deseni ve aşınma seviyesi birbirine çok yakın olmalıdır; aksi hâlde merkez diferansiyel zorlanır. Subaru, tek lastik değişiminde kalan üç lastiğin de aşınma farkının sınırlı olmasını önerir.',
            'Modellerde bijon düzeni 5x100 (Impreza, XV, Forester eski nesil) ve 5x114.3 (Forester, Outback, Levorg yeni nesil) kullanılır. Forester’da 17–18 inç, XV’de 17–18 inç, Outback’te 18 inç ebatlar yaygındır.'
        ],
        tireNotes: [
            'Dört lastiği birlikte değiştirin; tek lastik değişimi gerekiyorsa kalanlarla aşınma farkı çok küçük olmalıdır (AWD sistemi için).',
            'Forester ve Outback’te hafif arazi kullanımı varsa 4 mevsim veya hafif AT desenler, asfalt kullanımında SUV touring lastikler idealdir.',
            'WRX gibi performans modellerinde fabrika hız endeksini düşürmeyin; yüksek tutuşlu yaz lastikleri AWD çekişi en iyi değerlendirir.',
            'Kışın AWD avantajı tutuşta değil çekiştedir; frenleme için mutlaka 3PMSF işaretli kış lastiği kullanın.',
            'Rotasyonu düzenli yapın (her 8–10 bin km); AWD sistemlerde eşit aşınma kritiktir.'
        ],
        faqs: [
            { q: 'Subaru’da tek lastik değiştirilebilir mi?', a: 'Önerilmez. Simetrik dört çeker sistemi dört lastiğin çapının eşit olmasını ister; tek lastik değişiminde kalan lastiklerle aşınma farkı çok küçük olmalıdır. Mümkünse dört lastiği birlikte, en azından aks başına çift değiştirin.' }
        ]
    },
    seat: {
        display: 'Seat',
        tagline: 'Volkswagen Grubu’nun İspanyol markası; Leon ve Ibiza ile sportif ve genç bir konumlanma',
        about: [
            'Seat, 1950’de İspanya’da devlet ortaklığıyla kurulmuş, 1986’dan bu yana Volkswagen Grubu bünyesinde olan Barselona merkezli üreticidir. Marka, grup içinde sportif ve genç kitleye yönelik konumlanır; Cupra ise 2018’de ayrı bir performans markası hâline gelmiştir. Türkiye’de Ibiza ve Leon uzun yıllardır yaygındır; Arona ve Ateca crossover tarafını temsil eder.',
            'Seat modelleri Volkswagen platformlarını paylaşır: Ibiza ile Polo, Leon ile Golf, Ateca ile Tiguan aynı temeller üzerine kuruludur. Bu, bijon düzeninin (5x100 Ibiza/Arona, 5x112 Leon/Ateca) ve lastik ebatlarının Volkswagen kardeş modelleriyle büyük ölçüde örtüşmesi anlamına gelir.',
            'Leon’un FR ve Cupra donanımları daha büyük jant ve performans lastikleriyle gelir; Ibiza’da 15–17 inç, Leon’da 16–19 inç ebatlar fabrika çıkışı bulunur.'
        ],
        tireNotes: [
            'Leon ve Ibiza’da aynı nesil içinde birkaç jant çapı bulunur; ebatı aracın jant çapına ve kapı sütunu etiketine göre seçin.',
            'FR ve Cupra donanımlarında fabrika hız endeksini düşürmeyin; yüksek tutuşlu yaz lastikleri sportif karakteri korur.',
            'Ateca ve Tarraco gibi SUV modellerde yük endeksi yüksek, SUV için geliştirilmiş lastikler kullanın.',
            'Volkswagen, Škoda ve Audi jantları çoğu Seat modeline bijon ve göbek çapı olarak uyar; ofset (ET) değerini mutlaka kontrol edin.',
            'Kış lastiği zorunlu illerde ön çekişli Seat modellerinde dört tekerleğe de kış lastiği takın.'
        ],
        faqs: [
            { q: 'Seat Leon lastik ebatı nedir?', a: 'Leon’un nesline ve donanımına göre 205/55 R16, 225/45 R17 ve 225/40 R18 yaygın fabrika ebatlarıdır; Cupra sürümlerinde 235/35 R19 kullanılır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    lada: {
        display: 'LADA',
        tagline: 'Niva ile tanınan, sade ve dayanıklı araçlar üreten Rus marka',
        about: [
            'LADA, 1966’da Tolyatti’de kurulan AvtoVAZ’ın markasıdır ve uzun yıllar Fiat 124 temelli modellerle Doğu Avrupa’nın en yaygın otomobili olmuştur. Türkiye’de markanın adı 1990’larda Samara ve Vega ile, bugün ise efsanevi Niva ile anılır. Niva (bugünkü adıyla Niva Legend), 1977’den bu yana üretilen, sade mekaniği ve gerçek arazi kabiliyetiyle tanınan kompakt 4x4’tür.',
            'LADA modelleri basit ve onarımı kolay mekanikleriyle öne çıkar. Niva’nın sürekli dört çeker sistemi ve kısa dingil mesafesi, onu kırsal kullanımda hâlâ tercih edilen bir araç yapar; Granta ve Vesta ise markanın modern binek modelleridir.',
            'Niva’da bijon düzeni 5x139.7, 16 inç jant ve 175/80 R16 ile 185/75 R16 ebatlar kullanılır; Granta ve Vesta’da 4x98 bijon ve 14–16 inç ebatlar bulunur.'
        ],
        tireNotes: [
            'Niva’da arazi kullanımı varsa AT (all-terrain) veya MT (mud-terrain) desen; asfalt ağırlıklı kullanımda HT desen daha sessiz ve ekonomiktir.',
            'Niva sürekli dört çeker olduğundan dört lastiğin aynı desen, çap ve aşınma seviyesinde olması önemlidir.',
            'Granta ve Vesta’da 4x98 bijon düzeni Fiat ile ortaktır; jant seçerken göbek çapı ve ofset değerlerini kontrol edin.',
            'Kış lastiği zorunlu illerde Niva için 3PMSF işaretli kış veya 4 mevsim AT lastikleri değerlendirin.',
            'Lastik basıncını kapı sütunu etiketine göre ayarlayın; yüksek profilli lastiklerde düşük basınç yanak aşınmasını hızlandırır.'
        ],
        faqs: [
            { q: 'LADA Niva lastik ebatı kaç?', a: 'Niva’da fabrika çıkışı 175/80 R16 ve 185/75 R16 kullanılır; bijon düzeni 5x139.7’dir. Arazi kullanımı için AT desenli aynı ebat lastikler tercih edilebilir.' }
        ]
    },
    mini: {
        display: 'MINI',
        tagline: 'BMW Grubu’nun ikonik İngiliz markası; go-kart hissi ve kişiselleştirme ile tanınır',
        about: [
            'MINI, 1959’da Alec Issigonis’in tasarladığı orijinal Mini ile başlayan ve 2001’den bu yana BMW Grubu bünyesinde üretilen İngiliz markasıdır. Modern MINI, kompakt boyutlarına rağmen premium segmentte konumlanır ve “go-kart hissi” olarak adlandırılan keskin direksiyon tepkisiyle tanınır. Türkiye’de MINI Cooper (3 ve 5 kapı), Countryman ve Clubman en yaygın modellerdir.',
            'MINI modelleri BMW ile platform ve teknoloji paylaşır; Countryman, BMW X1 ile aynı temeller üzerine kuruludur. Marka, birçok modelde fabrika çıkışı run-flat lastik kullanır ve BMW onaylı lastikler yıldız (★) işaretiyle ayrılır.',
            'Modellerde bijon düzeni 4x100 (2014 öncesi) ve 5x112 (2014 sonrası) olarak nesle göre değişir; bu, jant seçiminde önemli bir ayrıntıdır. Cooper’da 15–18 inç, Countryman’de 17–19 inç ebatlar yaygındır.'
        ],
        tireNotes: [
            'Fabrika çıkışı run-flat lastikli modellerde normal lastiğe geçilebilir; ancak stepne bulunmadığından tamir kiti edinin.',
            'Nesle göre bijon düzeni değişir (4x100 → 5x112); eski jantı yeni nesil araca takmadan önce kontrol edin.',
            'Go-kart hissini korumak için direksiyon tepkisi keskin, yanak sert yaz lastikleri; konfor isteyenler için touring lastikler tercih edilebilir.',
            'Cooper S ve JCW performans sürümlerinde fabrika hız endeksini düşürmeyin.',
            'Kış lastiği zorunlu illerde 3PMSF işaretli kış lastiği kullanın; MINI’nin kısa dingil mesafesi karda kış lastiğini daha da önemli kılar.'
        ],
        faqs: [
            { q: 'MINI Cooper lastik ebatı nedir?', a: 'MINI Cooper’ın nesline ve donanımına göre 175/65 R15, 195/55 R16, 205/45 R17 ve 205/40 R18 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    porsche: {
        display: 'Porsche',
        tagline: '911 ile tanımlanan, Cayenne ve Macan ile SUV segmentine taşınan Alman spor otomobil üreticisi',
        about: [
            'Porsche, 1931’de Ferdinand Porsche tarafından Stuttgart’ta kurulmuş ve 1948’den bu yana spor otomobil üreten Alman markasıdır. 911, 1963’ten bu yana kesintisiz üretilen ve arkadan motorlu yapısıyla otomobil dünyasının en ikonik modellerinden biridir. Marka, 2002’de Cayenne ile SUV segmentine girmiş, Macan ile hacmini katlamış ve Taycan ile elektrikli performansa adım atmıştır. Türkiye’de Cayenne, Macan ve 911 en yaygın modellerdir.',
            'Porsche, lastik konusunda en titiz üreticilerdendir: her model için üreticiyle birlikte geliştirilen ve N işareti (N0, N1, N2…) ile onaylanan lastikler belirler. Arkadan motorlu 911’de ön ve arka aks lastik ebatları belirgin biçimde farklıdır; bu “karışık ebat” Cayenne ve Macan’ın üst donanımlarında da görülür.',
            'Modellerde bijon düzeni 5x130 (911, Cayenne, Panamera) ve 5x112 (Macan) kullanılır. Jant çapları 19 inçten 22 inç’e kadar çıkar; Taycan ve Cayenne’de 21–22 inç yaygındır.'
        ],
        tireNotes: [
            'N işaretli (Porsche onaylı) lastikler aracın süspansiyon ayarıyla birlikte geliştirilmiştir; mümkünse N işaretli, en azından aynı ebat ve endekste premium performans lastiği kullanın.',
            'Ön ve arka aks ebatları farklıdır; aks başına çift değiştirin, çapraz rotasyon yapmayın.',
            'Hız endeksini fabrika değerinin (çoğu modelde Y veya ZR) altına indirmeyin.',
            'Taycan gibi elektrikli ve Cayenne E-Hybrid gibi plug-in modellerde yük endeksi yüksek, elektrikli araçlar için güçlendirilmiş lastikler şarttır.',
            'Kış aylarında Porsche için de 3PMSF işaretli, N işaretli kış lastikleri bulunur; yaz lastiğiyle kışa girmeyin.'
        ],
        faqs: [
            { q: 'Porsche’de N işaretli lastik şart mı?', a: 'Yasal zorunluluk değildir ama Porsche, araç garantisi ve sürüş karakteri için N işaretli (üreticiyle birlikte geliştirilmiş) lastikleri önerir. N işaretli lastik yoksa aynı ebat, yük ve hız endeksine sahip premium performans lastiği kullanılabilir.' }
        ]
    },
    'land-rover': {
        display: 'Land Rover',
        tagline: 'Defender, Discovery ve Range Rover ile lüks arazi aracının referansı olan İngiliz üretici',
        about: [
            'Land Rover, 1948’de Rover tarafından tarım ve arazi kullanımı için tasarlanmış ilk modelle doğmuş, bugün Jaguar Land Rover (Tata Motors) bünyesinde yer alan İngiliz markasıdır. Marka üç aileden oluşur: Range Rover (lüks SUV’lar), Discovery (aile ve macera odaklı SUV’lar) ve Defender (gerçek arazi aracı). Türkiye’de Range Rover Evoque, Velar, Sport ve Discovery Sport yaygın modellerdir; yeni Defender da hızla ilgi görmüştür.',
            'Land Rover’ın Terrain Response sistemi tüm modellerde standart dört çeker ile birlikte gelir; bu, lastiklerin dört tekerlekte de aynı desen ve aşınma seviyesinde olmasını gerektirir. Marka, modelleri için üreticiyle birlikte geliştirilmiş onaylı lastikler belirler; bazı modellerde fabrika çıkışı run-flat kullanılmıştır.',
            'Modellerde bijon düzeni 5x108 (Evoque, Discovery Sport, Velar) ve 5x120 (Range Rover, Range Rover Sport, Discovery, Defender) olarak ayrılır. Jant çapları 17 inçten 23 inç’e kadar çıkar; Range Rover’da 21–22 inç yaygındır.'
        ],
        tireNotes: [
            'Dört lastiğin aynı desen, çap ve aşınma seviyesinde olması sürekli dört çeker ve Terrain Response sistemi için şarttır.',
            'Defender ve Discovery’de arazi kullanımı varsa AT (all-terrain) desen; asfalt ağırlıklı kullanımda SUV touring lastikleri daha sessiz ve ekonomiktir.',
            'Range Rover ve Range Rover Sport ağır araçlardır; yük endeksi fabrika değerinin altına inmeyen, SUV için geliştirilmiş lastikler kullanın. 21–22 inç jantlarda yanak ince olduğundan basınç takibi önemlidir.',
            'Plug-in hibrit (PHEV) sürümler daha da ağırdır; yük endeksine özellikle dikkat edin.',
            'Kış lastiği zorunlu illerde dört çeker olsa da dört tekerleğe 3PMSF işaretli kış lastiği gerekir; dört çeker frenleme mesafesini kısaltmaz.'
        ],
        faqs: [
            { q: 'Range Rover Evoque lastik ebatı nedir?', a: 'Evoque’un nesline ve donanımına göre 225/65 R17, 235/60 R18, 235/55 R19 ve 245/45 R20 yaygın fabrika ebatlarıdır. Model sayfasında nesil ve motor seçeneğine göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    tesla: {
        display: 'Tesla',
        tagline: 'elektrikli otomobili yaygınlaştıran Amerikalı üretici; Model Y ve Model 3 ile Türkiye’de hızla büyüyor',
        about: [
            'Tesla, 2003’te kurulmuş ve 2012’de Model S ile premium elektrikli otomobil segmentini yaratmış Amerikalı üreticidir. Model 3 ve Model Y, dünyanın en çok satan elektrikli otomobilleri olmuş; Model Y, 2023’te tüm motor türleri arasında dünyanın en çok satan otomobili unvanını almıştır. Tesla Türkiye’ye 2023’te resmi olarak giriş yapmış ve Model Y kısa sürede Türkiye’nin en çok satan elektrikli otomobili hâline gelmiştir.',
            'Elektrikli araçlarda lastik, içten yanmalı araçlara göre daha fazla zorlanır: batarya ağırlığı, anlık yüksek tork ve motor sesinin olmaması nedeniyle duyulur hâle gelen yol gürültüsü, lastik seçimini belirler. Tesla, bu nedenle modellerinde köpük kaplı (gürültü azaltıcı), yük endeksi yüksek ve düşük yuvarlanma dirençli lastikler kullanır; onaylı lastikler T0, T1 gibi işaretlerle ayrılır.',
            'Model 3 ve Model Y’de bijon düzeni 5x114.3, Model S ve Model X’te 5x120’dir. Model 3’te 18–20 inç, Model Y’de 19–21 inç jantlar fabrika çıkışı kullanılır; büyük jantlar menzili ölçülebilir biçimde azaltır.'
        ],
        tireNotes: [
            'Yük endeksini fabrika değerinin altına indirmeyin; Tesla modelleri aynı boyuttaki benzinli araçlardan 300–500 kg daha ağırdır.',
            'Düşük yuvarlanma dirençli (AB etiketi yakıt sınıfı A–B) lastikler menzili doğrudan etkiler; Model Y’de lastik seçimi menzilde %5–10 fark yaratabilir.',
            'Gürültü azaltıcı köpük kaplı veya elektrikli araçlar için geliştirilmiş sessiz lastikler, motor sesi olmayan kabinde konforu belirgin biçimde artırır.',
            'Anlık tork aşınmayı hızlandırır; rotasyonu her 8–10 bin km’de yapın ve aşınmaya dayanıklı desenleri tercih edin.',
            'Kış lastiği zorunlu illerde Tesla için elektrikli araçlara uygun, 3PMSF işaretli kış lastiği kullanın; Dual Motor (AWD) sürümlerde dört lastik aynı olmalıdır.'
        ],
        faqs: [
            { q: 'Tesla Model Y lastik ebatı kaç?', a: 'Model Y’de jant donanımına göre 255/45 R19 (Gemini), 255/40 R20 (Induction) ve 255/35 R21 (Überturbine) fabrika çıkışı kullanılır. Model sayfasında donanıma göre tam ölçüyü görebilirsiniz.' },
            { q: 'Tesla’ya normal lastik takılır mı?', a: 'Takılabilir; ancak yük endeksi fabrika değerinin altına inmemeli ve mümkünse elektrikli araçlar için geliştirilmiş (düşük dirençli, sessiz, aşınmaya dayanıklı) lastikler tercih edilmelidir. Aksi hâlde menzil ve kabin sessizliği belirgin biçimde azalır.' }
        ]
    },
    smart: {
        display: 'Smart',
        tagline: 'şehir otomobilinin simgesi fortwo ile tanınan, bugün elektrikli SUV’lara geçen Mercedes-Benz ortaklığı',
        about: [
            'Smart, 1990’larda Mercedes-Benz ve saat üreticisi Swatch ortaklığıyla doğmuş, 1998’de piyasaya çıkan fortwo ile şehir otomobili kavramını yeniden tanımlamış bir markadır. 2,7 metrelik uzunluğuyla fortwo, dar şehir sokaklarında ve park alanlarında rakipsiz bir pratiklik sunar; forfour ise dört kapılı sürümdür. Marka 2020’den bu yana Mercedes-Benz ve Geely ortaklığıyla yalnızca elektrikli modeller üretir: #1 ve #3 kompakt elektrikli SUV’lar.',
            'Klasik fortwo’nun en belirgin özelliği, ön ve arka aksta farklı genişlikte lastik kullanmasıdır: arkadan motorlu ve arkadan itişli yapı nedeniyle arka lastikler daha geniştir. Bu nedenle fortwo’da lastik değişimi aks başına yapılır ve rotasyon mümkün değildir.',
            'fortwo ve forfour’da bijon düzeni 4x100 ile 15–16 inç ebatlar kullanılır; #1 ve #3’te 5x114.3 bijon ve 19–20 inç jantlar bulunur.'
        ],
        tireNotes: [
            'fortwo’da ön ve arka ebatlar farklıdır (ör. ön 165/65 R15, arka 185/60 R15); iki ebatı da doğru seçin, rotasyon yapmayın.',
            '#1 ve #3 elektrikli modellerde yük endeksi yüksek, elektrikli araçlar için geliştirilmiş düşük dirençli lastikler menzili korur.',
            'fortwo hafif ve kısa dingil mesafeli bir araçtır; ıslak zemin frenlemesi güçlü lastikler güvenliği belirgin biçimde artırır.',
            'Kış lastiği zorunlu illerde fortwo için de dört tekerleğe kış lastiği gerekir; arkadan itiş karda kış lastiğini daha da önemli kılar.',
            'Lastik basıncını kapı sütunu etiketine göre ayarlayın; küçük lastiklerde düşük basıncın etkisi büyüktür.'
        ]
    },
    mg: {
        display: 'MG',
        tagline: 'köklü İngiliz markasının SAIC bünyesinde yeniden doğuşu; ZS, HS ve MG4 ile Türkiye’de hızla yaygınlaşıyor',
        about: [
            'MG, 1924’te Oxford’da Morris Garages adıyla kurulmuş ve spor otomobilleriyle ün kazanmış köklü bir İngiliz markasıdır. 2007’den bu yana Çinli SAIC Motor bünyesinde olan marka, 2020’lerde uygun fiyatlı SUV ve elektrikli modellerle Avrupa’da hızla büyümüştür. Türkiye’de ZS, HS ve MG4 Electric ile MG5 en yaygın modellerdir; MG, Türkiye pazarına 2022’de girmesine rağmen kısa sürede yüksek satış rakamlarına ulaşmıştır.',
            'MG’nin güncel yelpazesi SUV ve elektrikli ağırlıklıdır: ZS (benzinli ve EV), HS (benzinli ve plug-in hibrit), MG4 Electric ve Marvel R. Elektrikli sürümler ağır bataryalar taşıdığından yük endeksi yüksek lastiklerle gelir; MG4, arkadan itişli yapısıyla sınıfında ayrışır.',
            'Modellerde bijon düzeni 5x112 (ZS, HS, MG4, MG5) yaygındır. ZS’de 17 inç, HS’de 18–19 inç, MG4’te 17–18 inç ebatlar fabrika çıkışı kullanılır.'
        ],
        tireNotes: [
            'ZS EV ve MG4 Electric gibi elektrikli modellerde yük endeksini fabrika değerinin altına indirmeyin; düşük dirençli, sessiz lastikler menzili ve konforu korur.',
            'HS plug-in hibrit ağır bir araçtır; SUV için geliştirilmiş, yük endeksi yüksek lastikler kullanın.',
            'MG4 arkadan itişlidir; kış aylarında dört tekerleğe 3PMSF işaretli kış lastiği şarttır.',
            'MG5 ve ZS gibi uygun fiyatlı modellerde ıslak zemin frenlemesi iyi orta segment lastikler fiyat–performans dengesi sağlar.',
            'Bijon düzeni 5x112 Volkswagen grubuyla ortaktır ancak göbek çapı ve ofset farklı olabilir; jant seçerken üç değeri de kontrol edin.'
        ],
        faqs: [
            { q: 'MG ZS lastik ebatı kaç?', a: 'MG ZS’de 215/55 R17 (benzinli ve EV) fabrika çıkışı kullanılır; HS’de 235/50 R18 ve 235/45 R19, MG4 Electric’te 215/55 R17 ve 235/45 R18 yaygındır. Model sayfasında donanıma göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    infiniti: {
        display: 'Infiniti',
        tagline: 'Nissan’ın premium markası; Q50, Q30 ve QX serisiyle tanınır',
        about: [
            'Infiniti, Nissan’ın 1989’da ABD pazarı için kurduğu premium markasıdır; Lexus (Toyota) ve Acura (Honda) ile aynı dönemde doğmuştur. Marka, Türkiye’ye 2010’lu yıllarda girmiş, Q50 sedan, Q30 ve QX30 kompakt modeller ile QX70 SUV ile tanınmıştır; 2020’de Avrupa pazarından çekilmiştir, ancak Türkiye yollarında bu modeller hâlâ kullanımdadır.',
            'Infiniti modelleri Nissan platformlarını paylaşır: Q50 ile Nissan Skyline, QX70 ile Nissan Murano/FX ortak temellere sahiptir; Q30 ve QX30 ise Mercedes-Benz A sınıfı platformu üzerine kurulmuştur ve Mercedes bijon düzenini (5x112) kullanır.',
            'Q50 ve QX70’te bijon düzeni 5x114.3, Q30 ve QX30’da 5x112’dir. Q50’de 17–19 inç, QX70’te 20–21 inç jantlar yaygındır; QX70’in sportif karakteri nedeniyle performans lastikleri fabrika çıkışı kullanılmıştır.'
        ],
        tireNotes: [
            'Q50 arkadan itişli ve güçlüdür; kış aylarında dört tekerleğe 3PMSF işaretli kış lastiği şarttır.',
            'QX70’in 20–21 inç jantlarında ince yanak nedeniyle basınç takibi ve çukurlara karşı dikkat önemlidir.',
            'Q30 ve QX30’da Mercedes A sınıfı ile aynı ebat ve bijon kullanılır; jant seçerken göbek çapı ve ofseti kontrol edin.',
            'Avrupa’dan çekilen markada bazı özel ebatlar için seçenek daralmıştır; eşdeğer ebat ararken yük ve hız endeksini düşürmeyin.',
            'Fabrika hız endeksini korumak Infiniti’nin sportif karakteri için önemlidir.'
        ]
    },
    lancia: {
        display: 'Lancia',
        tagline: 'Delta ve Ypsilon ile tanınan, ralli tarihine damga vurmuş İtalyan marka',
        about: [
            'Lancia, 1906’da Torino’da kurulmuş ve mühendislik yenilikleriyle (ilk monokok gövde, ilk V6 motor) otomobil tarihine iz bırakmış İtalyan markasıdır. Ralli dünyasında Stratos, 037 ve Delta Integrale ile kazanılan şampiyonluklar markayı efsaneleştirmiştir. Bugün Stellantis bünyesinde olan marka uzun süre yalnızca Ypsilon ile İtalya pazarında kalmış, 2024’te yeni elektrikli Ypsilon ile Avrupa’ya dönüş planlamıştır. Türkiye yollarında Delta, Ypsilon, Musa ve Thema kullanımdadır.',
            'Lancia modelleri Fiat ile platform paylaşır: Ypsilon ile Fiat 500/Panda, Musa ile Fiat Idea, Delta ile Fiat Bravo ortak temellere sahiptir. Bu nedenle bijon düzeni Fiat’a özgü 4x98 ve 5x98 ölçülerindedir.',
            'Ypsilon’da 15–16 inç, Delta’da 16–18 inç, Thema’da 18–20 inç ebatlar fabrika çıkışı kullanılmıştır.'
        ],
        tireNotes: [
            'Fiat ile ortak 4x98 / 5x98 bijon düzeni nedeniyle jant seçiminde göbek çapı (58.1 mm) ve ofseti mutlaka kontrol edin.',
            'Ypsilon gibi küçük modellerde yakıt ekonomisi odaklı, ıslak zemin frenlemesi iyi lastikler şehir kullanımında idealdir.',
            'Delta’nın büyük jantlı donanımlarında ince yanak nedeniyle basınç takibi önemlidir.',
            'Kış lastiği zorunlu illerde ön çekişli Lancia modellerinde dört tekerleğe de kış lastiği takın.',
            'Üretimi durmuş modellerde özel ebatlar için eşdeğer ebat ararken yük ve hız endeksini düşürmeyin.'
        ]
    },
    lamborghini: {
        display: 'Lamborghini',
        tagline: 'V10 ve V12 süper spor otomobilleriyle tanınan, Urus ile SUV segmentine giren İtalyan üretici',
        about: [
            'Lamborghini, 1963’te traktör üreticisi Ferruccio Lamborghini tarafından Sant’Agata Bolognese’de kurulmuş ve 1998’den bu yana Volkswagen Grubu (Audi) bünyesinde olan İtalyan süper spor otomobil üreticisidir. Miura ile orta motorlu süper spor otomobil formülünü yaratan marka, Huracán (V10) ve Aventador/Revuelto (V12) ile bu geleneği sürdürür; 2018’de çıkan Urus SUV ise markanın satışlarını katlamıştır.',
            'Lamborghini modellerinde lastik, performansın en kritik parçasıdır: üreticiyle birlikte geliştirilmiş ve onaylı lastikler kullanılır; ön ve arka aks ebatları belirgin biçimde farklıdır ve arka lastikler 305–355 mm genişliğe ulaşır. Dört çeker sistemi (Huracán, Aventador, Urus) dört lastiğin uyumlu olmasını gerektirir.',
            'Modellerde bijon düzeni 5x112 (Huracán, Urus) ve 5x120 (Aventador) kullanılır; jant çapları 19 inçten 23 inç’e kadar çıkar.'
        ],
        tireNotes: [
            'Üretici onaylı (Pirelli P Zero, Trofeo gibi) lastikleri tercih edin; hız endeksi Y / (Y) altına inmemelidir.',
            'Ön ve arka ebatlar farklıdır; aks başına çift değiştirin, rotasyon yapmayın.',
            'Urus ağır ve çok güçlü bir SUV’dur; yük endeksi fabrika değerinin altına inmeyen, SUV performans lastikleri şarttır.',
            'Dört çeker sistemli modellerde dört lastiğin aynı desen ve aşınma seviyesinde olması gerekir.',
            'Kış kullanımı için üretici onaylı kış lastikleri mevcuttur; yaz lastiğiyle soğukta (7 °C altı) yüksek performans sürüşü güvenli değildir.'
        ]
    },
    ferrari: {
        display: 'Ferrari',
        tagline: 'Formula 1 mirasıyla dünyanın en bilinen spor otomobil markası; Maranello’dan çıkan V8 ve V12 modeller',
        about: [
            'Ferrari, 1939’da Enzo Ferrari tarafından kurulmuş ve 1947’den bu yana Maranello’da yol otomobili üreten İtalyan markasıdır. Formula 1 tarihinin en başarılı takımı olan Scuderia Ferrari’nin mirası, markanın yol otomobillerinin de temelini oluşturur. 458, 488, F8, Roma, Portofino, 296 ve Purosangue gibi modeller markanın güncel yelpazesini oluşturur; Türkiye’de de koleksiyoner ve meraklıları tarafından kullanılan Ferrari’ler bulunur.',
            'Ferrari modellerinde lastik, aracın süspansiyon ve elektronik sistemleriyle birlikte geliştirilir; üretici onaylı lastikler belirli işaretler (örneğin K1, K2) taşır. Orta motorlu modellerde ön ve arka aks ebatları belirgin biçimde farklıdır; arka lastikler 285–325 mm genişliğindedir.',
            'Modellerde bijon düzeni 5x114.3 (458, 488, F8, Roma, Portofino) yaygındır; jant çapları 19–22 inç arasındadır. Purosangue, markanın ilk dört kapılı ve yüksek gövdeli modeli olarak 22–23 inç jantlarla gelir.'
        ],
        tireNotes: [
            'Üretici onaylı lastikleri tercih edin; hız endeksi Y / (Y) altına inmemelidir.',
            'Ön ve arka ebatlar farklıdır; aks başına çift değiştirin, çapraz rotasyon yapmayın.',
            'Yüksek performans yaz lastikleri 7 °C altında sertleşir; soğuk havada veya kışın üretici onaylı kış lastiği kullanın.',
            'Düşük yanak profilli büyük jantlarda basınç takibi ve çukurlara karşı dikkat önemlidir.',
            'Az kullanılan araçlarda lastik yaşına dikkat edin: diş derinliği yeterli olsa da 6 yaşını geçen lastik sertleşir ve tutuş kaybeder.'
        ]
    },
    proton: {
        display: 'Proton',
        tagline: '1990’larda Türkiye’de satılan, Mitsubishi tabanlı modelleriyle tanınan Malezyalı üretici',
        about: [
            'Proton, 1983’te Malezya’nın ulusal otomobil markası olarak kurulmuş ve ilk modellerini Mitsubishi lisansıyla üretmiştir. 1996’da İngiliz spor otomobil üreticisi Lotus’u satın alan marka, bugün Çinli Geely ortaklığıyla üretim yapar. Türkiye’ye 1990’larda giren Proton, Saga, Wira, Persona, Gen-2 ve Savvy gibi modellerle uygun fiyatlı segmentte yer almış; bu araçların bir kısmı hâlâ kullanımdadır.',
            'Proton modellerinin Mitsubishi tabanlı olması, yedek parça ve lastik ebatlarında Mitsubishi Lancer ve Colt ile ortaklık sağlar. Bijon düzeni 4x100 (Saga, Wira, Persona, Gen-2, Savvy) yaygındır.',
            'Wira ve Persona’da 14–15 inç, Gen-2’de 15–16 inç, Savvy’de 14 inç ebatlar fabrika çıkışı kullanılmıştır.'
        ],
        tireNotes: [
            'Üretimi durmuş modellerde özel ebat ararken eşdeğer ebatı yük ve hız endeksini düşürmeden seçin.',
            '4x100 bijon düzeni Mitsubishi, Honda ve birçok markayla ortaktır; jant seçerken göbek çapı ve ofseti kontrol edin.',
            'Yaşlı araçlarda lastik yaşına dikkat edin; 6 yaşını geçen lastikler diş derinliği yeterli olsa da sertleşir.',
            'Ekonomik segmentte ıslak zemin frenlemesi iyi orta segment lastikler fiyat–performans dengesi sağlar.',
            'Kış lastiği zorunlu illerde dört tekerleğe de kış lastiği takın.'
        ]
    },
    isuzu: {
        display: 'Isuzu',
        tagline: 'D-Max pick-up ile tanınan, Türkiye’de Anadolu Isuzu ortaklığıyla üretim yapan Japon ticari araç üreticisi',
        about: [
            'Isuzu, 1916’ya uzanan tarihiyle Japonya’nın en eski otomobil üreticilerinden biridir ve bugün dizel motor ile ticari araç alanında dünya liderleri arasındadır. Türkiye’de Anadolu Isuzu ortaklığı 1984’ten bu yana Çayırova fabrikasında kamyon, midibüs ve otobüs üretir. Binek tarafta markanın adı D-Max pick-up ile anılır; D-Max, Türkiye’de iş ve arazi kullanımında yaygın bir modeldir.',
            'D-Max, yüksek yük kapasitesi ve dayanıklı dizel motoruyla ticari ve tarımsal kullanımda tercih edilir; 4x4 sürümleri gerçek arazi kabiliyeti sunar. Bu kullanım profili, lastik seçiminde yük endeksi ve desen tipini (HT/AT/MT) belirleyici kılar.',
            'D-Max’te bijon düzeni 6x139.7, jant çapı 16–18 inç, yaygın ebatlar 245/70 R16, 255/65 R17 ve 255/60 R18’dir.'
        ],
        tireNotes: [
            'Yük taşıyorsanız yük endeksi yüksek, gerekiyorsa C (ticari) işaretli lastikler seçin; D-Max’in taşıma kapasitesi lastik yük endeksiyle sınırlıdır.',
            'Arazi ve şantiye kullanımında AT (all-terrain), çamur ağırlıklı kullanımda MT (mud-terrain); asfalt ağırlıklı kullanımda HT (highway) desen daha sessiz ve ekonomiktir.',
            '4x4 sürümlerde dört lastiğin aynı desen, çap ve aşınma seviyesinde olması dört çeker sistemini korur.',
            'Kış lastiği zorunlu illerde 3PMSF işaretli kış veya 4 mevsim AT lastikleri değerlendirin.',
            'Yüklü ve yüksüz durum için üreticinin verdiği iki farklı basınç değerine uyun.'
        ],
        faqs: [
            { q: 'Isuzu D-Max lastik ebatı kaç?', a: 'D-Max’in nesline ve donanımına göre 245/70 R16, 255/65 R17 ve 255/60 R18 yaygın fabrika ebatlarıdır; bijon düzeni 6x139.7’dir. Model sayfasında nesil ve donanıma göre tam ölçüyü görebilirsiniz.' }
        ]
    },
    lincoln: {
        display: 'Lincoln',
        tagline: 'Ford’un lüks markası; Navigator ve Aviator gibi büyük SUV’larıyla tanınır',
        about: [
            'Lincoln, 1917’de kurulmuş ve 1922’den bu yana Ford Motor Company’nin lüks markası olarak konumlanmış Amerikalı üreticidir. Uzun yıllar ABD başkanlık araçlarını üreten marka, Continental ve Town Car gibi klasik sedanlarla tanınmış; bugün yelpazesi Navigator, Aviator, Nautilus ve Corsair gibi SUV’lardan oluşur. Türkiye’de Lincoln resmi olarak satılmaz; yollardaki araçlar bireysel ithalat yoluyla gelmiştir.',
            'Lincoln modelleri Ford platformlarını paylaşır: Navigator ile Ford Expedition, Aviator ile Explorer, Nautilus ile Edge ortak temellere sahiptir. Bu nedenle bijon düzeni ve lastik ebatları Ford kardeş modelleriyle büyük ölçüde örtüşür ve Türkiye’de Ford üzerinden eşdeğer ebat bulmak kolaydır.',
            'Navigator ve Aviator’da bijon düzeni 6x135 ve 5x114.3, jant çapları 20–22 inç; Nautilus ve Corsair’de 5x108 bijon ve 18–21 inç jantlar kullanılır.'
        ],
        tireNotes: [
            'Navigator ve Aviator ağır SUV’lardır; yük endeksi fabrika değerinin altına inmeyen, SUV için geliştirilmiş lastikler şarttır.',
            '20–22 inç jantlarda ince yanak nedeniyle basınç takibi ve çukurlara karşı dikkat önemlidir.',
            'Bireysel ithal araçlarda ABD ebatları (örneğin P işaretli veya inç ebatlı) Avrupa karşılığıyla eşleştirilir; yük ve hız endeksini düşürmeyin.',
            'AWD sürümlerde dört lastiğin aynı desen ve aşınmada olması dört çeker sistemini korur.',
            'Kış lastiği zorunlu illerde dört tekerleğe 3PMSF işaretli kış lastiği gerekir.'
        ]
    },
};
