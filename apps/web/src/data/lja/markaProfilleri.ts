// LJA marka sayfaları için elle yazılmış marka profilleri (yalnızca lastikjantavm.com).
// Sayılar ve stok bilgisi burada YOK — onlar /api/brand-seo'dan canlı gelir (bkz. lib/brandText.ts).
// Burada yalnızca değişmeyen bilgiler durur: marka tanıtımı, güçlü yönler, desen açıklamaları.
// Desen anahtarı: desen adının küçük harfli, yalnız harf/rakam hâli (ör. "Pilot Sport 5" → "pilotsport5").

export type BrandKind = 'lastik' | 'agir' | 'zincir' | 'palet' | 'corap' | 'jant' | 'aksesuar';

export interface BrandProfile {
    kind: BrandKind;
    display: string;
    // Markanın konumu, tek cümle (meta açıklama ve giriş için)
    tagline: string;
    about: string[];
    strengths: string[];
    forWhom: string;
    series?: Record<string, string>;
    faqs?: { q: string; a: string }[];
    related?: string[];
}

export const BRAND_PROFILES: Record<string, BrandProfile> = {
    michelin: {
        kind: 'lastik',
        display: 'Michelin',
        tagline: 'uzun ömür, ıslak zemin güvenliği ve düşük yuvarlanma direnciyle bilinen Fransız premium lastik üreticisi',
        about: [
            'Michelin, 1889’da André ve Édouard Michelin kardeşlerin Fransa’nın Clermont-Ferrand kentinde kurduğu ve bugün dünyanın en büyük lastik üreticileri arasında yer alan bir markadır. Radyal lastik teknolojisini 1946’da “Michelin X” ile seri üretime taşıması, otomobil lastiklerinin bugünkü yapısının temelini oluşturmuştur. Markanın restoran rehberi olarak bilinen Michelin Rehberi de aslında sürücüleri daha çok yol yapmaya teşvik etmek için başlatılmış bir yayındır.',
            'Michelin’in lastik geliştirme yaklaşımı “lastik yeniyken değil, aşındığında da güvenli olmalı” fikrine dayanır. Bu nedenle Primacy ve CrossClimate gibi serilerde ıslak zemin frenleme performansının diş derinliği azaldıkça korunması öncelikli hedeftir. Pilot Sport ailesi ise yüksek performanslı otomobiller ve sportif sürüş için geliştirilmiştir; birçok premium otomobil üreticisi araçlarını fabrika çıkışında Pilot Sport lastiklerle donatır.',
            'Michelin grubu BFGoodrich ve Kleber gibi markaları da bünyesinde barındırır. Arazi ve pick-up segmentindeki BFGoodrich All-Terrain lastikleri de bu çatı altında üretilir.'
        ],
        strengths: [
            'Aşınma boyunca korunan ıslak zemin frenleme performansı',
            'Uzun kilometre ömrü ve dengeli aşınma',
            'Düşük yuvarlanma direnci sayesinde yakıt ve menzil tasarrufu',
            'Yaz, kış ve dört mevsim için geniş seri seçeneği',
            'Premium otomobil üreticilerinin fabrika çıkışında tercih ettiği seriler'
        ],
        forWhom: 'Michelin; yüksek kilometre yapan, lastiğini uzun süre kullanmak isteyen ve ıslak zemin güvenliğinden ödün vermek istemeyen sürücüler için güçlü bir tercihtir. Aile otomobillerinde Primacy, yıl boyu tek lastikle gitmek isteyenlerde CrossClimate, performans otomobillerinde ise Pilot Sport serileri öne çıkar.',
        series: {
            primacy5: 'Konfor ve ıslak zemin güvenliği odaklı touring yaz lastiği; Primacy serisinin en yeni kuşağıdır ve sessiz sürüşüyle aile otomobillerinde sık tercih edilir.',
            primacy4: 'Aşındıkça ıslak zemin performansını koruyacak şekilde tasarlanmış, uzun ömürlü touring yaz lastiği.',
            primacy3: 'Konfor ve güvenlik odaklı touring yaz lastiği.',
            primacy3zp: 'Primacy 3’ün Run Flat (ZP) sürümü.',
            pilotalpin5suv: 'Güçlü SUV’lar için performans kış lastiği.',
            alpin5: 'Binek otomobiller için kış lastiği.',
            pilotsportev: 'Elektrikli performans otomobilleri için geliştirilmiş yaz lastiği.',
            crossclimate: 'Kış onaylı dört mevsim lastiği (CrossClimate ailesinin ilk kuşağı).',
            agiliscrossclimate: 'Hafif ticari araçlar için kış onaylı dört mevsim lastiği.',
            primacy5energy: 'Primacy 5’in düşük yuvarlanma direnci odaklı sürümü; yakıt tüketimini azaltmayı hedefler.',
            crossclimate3: 'Kış onaylı (3PMSF) dört mevsim lastiği; yazın yaz lastiğine yakın tutuş, hafif kışta güvenli frenleme sunar.',
            crossclimate3sport: 'CrossClimate 3’ün daha sportif otomobiller için geliştirilmiş, büyük jant çaplarında sunulan sürümü.',
            crossclimate2: 'Yaz ve hafif kış koşullarında tek lastikle gitmek isteyenler için 3PMSF onaylı dört mevsim lastiği.',
            crossclimate2suv: 'CrossClimate 2’nin SUV ve crossover araçlar için güçlendirilmiş sürümü.',
            pilotsport5: 'Spor kompakt ve sedanlar için yüksek performans yaz lastiği; hassas direksiyon tepkisi ve uzun ömrü birlikte sunar.',
            pilotsport4: 'Kuru ve ıslak zeminde dengeli tutuş sunan, birçok otomobilde fabrika çıkışı tercih edilen performans yaz lastiği.',
            pilotsport4s: 'Süper spor ve yüksek güçlü otomobiller için geliştirilmiş, pistten ilham alan yüksek performans yaz lastiği.',
            pilotsport4suv: 'Güçlü SUV’lar için Pilot Sport 4 teknolojisini kullanan yüksek performans yaz lastiği.',
            pilotalpin5: 'Yüksek performanslı otomobiller ve SUV’lar için kış lastiği; karlı ve ıslak zeminde sportif sürüş karakterini korur.',
            alpin7: 'Binek otomobiller için kış lastiği; karda çekiş ve ıslak zeminde frenleme dengesiyle öne çıkar.',
            alpin6: 'Aşındıkça kar ve ıslak zemin performansını koruyacak şekilde tasarlanmış kış lastiği.',
            latitudesport3: 'SUV’lar için yol odaklı, yüksek hızlarda dengeli yaz lastiği.',
            eprimacy: 'Elektrikli ve hibrit araçlar için düşük yuvarlanma direnci odaklı yaz lastiği; menzili artırmaya yardımcı olur.',
            agilis3: 'Hafif ticari araçlar için uzun ömürlü, yük taşıma kapasitesi yüksek yaz lastiği.'
        },
        faqs: [
            { q: 'Michelin lastikler neden daha uzun ömürlü kabul edilir?', a: 'Michelin, sırt hamuru ve sırt deseni geliştirirken aşınma dayanımını ve lastik aşındıkça performansın korunmasını öncelikli hedef olarak alır. Bu nedenle bağımsız testlerde kilometre ömrü sonuçlarında çoğunlukla üst sıralarda yer alır. Gerçek ömür; doğru hava basıncı, rot-balans ayarı ve sürüş tarzına göre değişir.' }
        ],
        related: ['bf-goodrich']
    },
    pirelli: {
        kind: 'lastik',
        display: 'Pirelli',
        tagline: 'Formula 1 tecrübesini yol lastiklerine taşıyan, performans ve premium otomobillerin tercihi İtalyan lastik markası',
        about: [
            'Pirelli, 1872’de Giovanni Battista Pirelli tarafından Milano’da kurulmuş, 150 yılı aşkın geçmişe sahip İtalyan lastik üreticisidir. Marka, 2011’den bu yana Formula 1’in tek lastik tedarikçisidir ve pistte edindiği bilgi birikimini yol lastiklerine aktarır. 1987’de tanıtılan P Zero, yüksek performanslı otomobil lastiklerinin simgesi hâline gelmiştir.',
            'Pirelli bugün özellikle premium ve prestij otomobil segmentine odaklanır. Birçok üst segment otomobil üreticisi araçlarını fabrika çıkışında Pirelli lastiklerle donatır; bu lastiklerin yanağında üreticiye özel onay işaretleri (ör. BMW için yıldız, Mercedes için MO, Audi için AO, Porsche için N) bulunur. Aracınızın üreticisinin onayladığı lastiği seçmek, araç ile lastiğin birlikte ayarlanmış sürüş karakterini korur.',
            'Pirelli; Cinturato ailesiyle günlük kullanım ve konfor, Scorpion ailesiyle SUV, Winter Sottozero ve Cinturato Winter ile kış, Cinturato All Season ve Scorpion All Season ile dört mevsim ihtiyaçlarına çözüm sunar. Run Flat (RFT) ve Elect (elektrikli araç) seçenekleri de geniştir.'
        ],
        strengths: [
            'Formula 1 tecrübesiyle geliştirilen yüksek performans serileri',
            'Premium otomobil üreticilerinin onaylı (yıldız, MO, AO, N) lastik seçenekleri',
            'Geniş Run Flat ve elektrikli araç (Elect) yelpazesi',
            'Büyük jant çaplarında (19”–23”) güçlü ürün gamı',
            'Yaz, kış ve dört mevsim serilerinin tümü'
        ],
        forWhom: 'Pirelli; performans ve premium otomobil kullananlar, aracının fabrika çıkışındaki lastik karakterini korumak isteyenler ve sportif sürüşten keyif alan sürücüler için öne çıkar. Günlük kullanımda konfor arayanlar için Cinturato, SUV sahipleri için Scorpion serileri dengeli seçeneklerdir.',
        series: {
            pzeropz4: 'Premium ve spor otomobiller için yüksek performans yaz lastiği; birçok üreticinin onaylı fabrika lastiğidir.',
            pzero: 'Pirelli’nin simge yüksek performans yaz lastiği ailesi; spor ve süper spor otomobillerde tercih edilir.',
            pzerorunflat: 'P Zero’nun patlak hâlde sınırlı mesafe gidebilen Run Flat sürümü.',
            cinturatop7: 'Konfor, düşük gürültü ve yakıt verimliliği odaklı yaz lastiği; sedan ve aile otomobillerinde yaygındır.',
            cinturatop7p7c2: 'Cinturato P7’nin yeni kuşağı (P7C2); ıslak zemin frenleme ve verimlilik iyileştirilmiştir.',
            cinturatop1verde: 'Küçük ve kompakt otomobiller için ekonomik, verimli yaz lastiği.',
            cinturatop7runflat: 'Cinturato P7’nin Run Flat sürümü.',
            powergyallseasonsf: 'Uygun fiyatlı, kış onaylı dört mevsim lastiği.',
            scorpionverdeallseasonrunflat: 'Scorpion Verde All Season’ın Run Flat sürümü.',
            scorpionwinterrunflat: 'SUV’lar için Run Flat kış lastiği.',
            carrierallseason: 'Hafif ticari araçlar için dört mevsim lastiği.',
            cinturatoallseasonsf3: 'Kış onaylı dört mevsim lastiği; yıl boyu tek lastikle gitmek isteyen binek otomobiller için.',
            cinturatowinter2: 'Cinturato Winter’ın yeni kuşağı; karlı zeminde çekiş ve frenleme geliştirilmiştir.',
            scorpionverde: 'SUV’lar için düşük yuvarlanma direnci ve konfor odaklı yaz lastiği.',
            scorpionverdeallseason: 'SUV’lar için konfor odaklı dört mevsim lastiği.',
            scorpionallseasonsf3: 'SUV ve crossover’lar için kış onaylı dört mevsim lastiği.',
            scorpion: 'SUV’lar için yeni nesil yaz lastiği ailesi; konfor ve yol tutuşunu dengeler.',
            wintersottozero3runflat: 'Winter Sottozero 3’ün Run Flat sürümü; patlak hâlde sınırlı mesafe gidilebilir.',
            powergy: 'Pirelli kalitesini daha erişilebilir fiyatla sunan, günlük kullanıma yönelik yaz lastiği.',
            powergy2: 'Powergy’nin yeni kuşağı; günlük kullanımda dengeli performans ve uzun ömür.'
        },
        faqs: [
            { q: 'Pirelli lastiğin yanındaki yıldız, MO, AO veya N işareti ne anlama gelir?', a: 'Bu işaretler lastiğin belirli bir otomobil üreticisi için geliştirildiğini ve onaylandığını gösterir: yıldız BMW/MINI, MO Mercedes-Benz, AO Audi, N Porsche, J Jaguar, VOL Volvo onayıdır. Aracınızın fabrika çıkışındaki lastiklerde bu işaret varsa, aynı onaylı lastiği seçmeniz önerilir.' }
        ]
    },
    continental: {
        kind: 'lastik',
        display: 'Continental',
        tagline: 'frenleme performansı ve mühendislik altyapısıyla öne çıkan Alman premium lastik üreticisi',
        about: [
            'Continental, 1871’de Almanya’nın Hannover kentinde kurulmuş bir lastik ve otomotiv teknolojileri şirketidir. Bugün hem lastik hem de fren, elektronik ve sürüş destek sistemleri alanında dünyanın önde gelen otomotiv tedarikçilerinden biridir. Bu geniş mühendislik altyapısı, Continental lastiklerinin özellikle kısa fren mesafeleriyle anılmasının temel nedenlerindendir.',
            'Continental’in binek ürün gamı net biçimde ayrılır: PremiumContact konfor ve güvenlik, EcoContact düşük yakıt tüketimi ve uzun ömür, SportContact yüksek performans, UltraContact ise günlük kullanımda dengeli bir paket sunar. Kışın WinterContact, yıl boyu kullanım için AllSeasonContact serileri tercih edilir. Elektrikli araçlara uygun lastikler yanakta “EV” veya “Contisilent” (iç yüzeydeki ses emici köpük) ibareleriyle işaretlenir.',
            'Continental grubu Barum, Matador, General Tire, Semperit ve Avrupa’da Uniroyal markalarını da bünyesinde barındırır.'
        ],
        strengths: [
            'Kuru ve ıslak zeminde kısa fren mesafeleri',
            'Konfor (PremiumContact), verimlilik (EcoContact) ve performans (SportContact) için ayrı seriler',
            'Ses emici köpüklü (ContiSilent) ve elektrikli araç uyumlu seçenekler',
            'Patlak hâlde gidebilen SSR Run Flat ve ContiSeal kendini onaran lastikler',
            'SUV ve 4x4 araçlar için güçlü ürün gamı'
        ],
        forWhom: 'Continental; frenleme güvenliğini ön planda tutan, aile otomobili ya da SUV kullanan ve konforlu, sessiz bir sürüş arayan sürücüler için öne çıkar. Yakıt tasarrufu önceliğinizse EcoContact, sportif bir otomobiliniz varsa SportContact serilerine bakabilirsiniz.',
        series: {
            allseasoncontact2: 'Kış onaylı dört mevsim lastiği; yaz performansı ile hafif kış güvenliğini birleştirir.',
            ultracontact: 'Günlük kullanımda ıslak zemin güvenliği, uzun ömür ve verimliliği dengeleyen yaz lastiği.',
            ecocontact6: 'Düşük yuvarlanma direnci ve uzun ömür odaklı yaz lastiği; yakıt tüketimini azaltmaya yardımcı olur.',
            ecocontact6q: 'EcoContact 6’nın elektrikli ve premium araçlar için sessizlik ve menzil odaklı sürümü.',
            ecocontact7: 'EcoContact ailesinin yeni kuşağı; verimlilik ve aşınma dayanımı geliştirilmiştir.',
            premiumcontact6: 'Konfor, sessizlik ve güvenli frenleme odaklı premium yaz lastiği.',
            premiumcontact7: 'PremiumContact ailesinin yeni kuşağı; ıslak zemin frenleme ve aşınma ömrü iyileştirilmiştir.',
            contisportcontact5: 'Yüksek performanslı otomobiller için hassas yol tutuşu sunan yaz lastiği.',
            sportcontact7: 'Spor otomobiller için en yeni yüksek performans yaz lastiği; kuru ve ıslak zeminde güçlü tutuş.',
            sportcontact6: 'Ultra yüksek performanslı otomobiller için geliştirilmiş, yüksek hızlarda kararlı yaz lastiği.',
            wintercontactts870p: 'Büyük jantlı otomobil ve SUV’lar için kış lastiği; karda ve ıslakta kısa fren mesafesi.',
            wintercontactts870: 'Binek otomobiller için kış lastiği; karlı ve ıslak zeminde güvenli frenleme.',
            wintercontactts860s: 'Spor ve premium otomobiller için yüksek performans kış lastiği.',
            vancontactasultra: 'Hafif ticari araçlar için uzun ömürlü dört mevsim lastiği.',
            allseasoncontact: 'Kış onaylı dört mevsim lastiği.',
            conticrosscontactlxsport: 'SUV’lar için konfor ve yol tutuşu odaklı lastik.',
            vancontactultra: 'Hafif ticari araçlar için uzun ömürlü yaz lastiği.',
            contivancontact100: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            ultracontactnxt: 'Yenilenebilir ve geri dönüştürülmüş malzeme oranı yüksek, verimlilik odaklı yaz lastiği.',
            contiwintercontactts830p: 'Premium otomobiller için kış lastiği.',
            contisportcontact5p: 'Süper spor ve yüksek güçlü otomobiller için yaz lastiği.',
            contisportcontact5suv: 'Güçlü SUV’lar için yüksek performans yaz lastiği.',
            contipremiumcontact5: 'Konfor ve güvenlik odaklı yaz lastiği.',
            wintercontactts850p: 'Binek otomobil ve SUV’lar için kış lastiği.',
            vancontactwinter: 'Hafif ticari araçlar için kış lastiği.'
        },
        related: ['barum', 'matador', 'general', 'semperit', 'uniroyal']
    },
    goodyear: {
        kind: 'lastik',
        display: 'Goodyear',
        tagline: 'yüksek performans ve dört mevsim serileriyle bilinen, 1898’den beri lastik üreten Amerikan markası',
        about: [
            'Goodyear, 1898’de Frank Seiberling tarafından ABD’nin Ohio eyaletindeki Akron kentinde kuruldu. Marka adını, kauçuğun vulkanizasyon yöntemini bulan Charles Goodyear’dan alır. Goodyear bugün dünyanın en büyük lastik üreticileri arasındadır ve Türkiye’de de uzun yıllardır üretim yapmaktadır.',
            'Goodyear’ın binek ürün gamında Eagle F1 Asymmetric yüksek performans, EfficientGrip verimlilik ve konfor, Vector 4Seasons dört mevsim, UltraGrip ise kış serisidir. Özellikle Vector 4Seasons, Avrupa’da dört mevsim lastik kategorisinin yaygınlaşmasında öncü serilerden biri olmuştur. Goodyear’ın ticari araç ürün gamında ise hafif ticari araçlar için Cargo serisi ile kış koşullarına yönelik UltraGrip Cargo ve WinterCommand gibi seçenekler bulunur.',
            'Goodyear grubu Dunlop (Avrupa), Debica, Sava ve Fulda markalarını da bünyesinde barındırır.'
        ],
        strengths: [
            'Eagle F1 Asymmetric ile kuru ve ıslak zeminde yüksek performans',
            'Vector 4Seasons ile kış onaylı dört mevsim seçeneği',
            'UltraGrip serisiyle kar ve buzda güvenli çekiş',
            'Run Flat (ROF) ve SUV seçenekleri',
            'Türkiye’de uzun üretim geçmişi'
        ],
        forWhom: 'Goodyear; sportif sürüşte Eagle F1, günlük kullanımda düşük tüketim için EfficientGrip, yıl boyu tek lastik isteyenler için Vector 4Seasons ile farklı ihtiyaçlara geniş bir yelpaze sunar. Kışı karlı geçen bölgelerde UltraGrip serisi güçlü bir seçenektir.',
        series: {
            eaglef1asymmetric6: 'Eagle F1 ailesinin en yeni kuşağı; ıslak zeminde frenleme ve viraj tutuşu odaklı yüksek performans yaz lastiği.',
            eaglef1asymmetric5: 'Premium ve spor otomobiller için ıslak ve kuru zeminde güçlü yaz lastiği.',
            eaglef1asymmetric3: 'Kısa fren mesafesiyle bilinen yüksek performans yaz lastiği.',
            eaglef1asymmetric3suv: 'Eagle F1 Asymmetric 3’ün güçlü SUV’lar için sürümü.',
            vector4seasonsgen3: 'Kış onaylı (3PMSF) dört mevsim lastiği; yıl boyu tek lastikle gitmek isteyenler için.',
            vector4seasonssuvgen3: 'Vector 4Seasons Gen-3’ün SUV ve crossover sürümü.',
            ultragripperformance: 'Binek otomobiller için kış lastiği; kar, buz ve ıslak zeminde güvenli sürüş.',
            ultragripperformance3: 'UltraGrip Performance ailesinin yeni kuşağı; karda çekiş ve ıslak frenleme geliştirilmiştir.',
            wintercommand: 'Ekonomik kış lastiği seçeneği; şehir içi ve şehirler arası kış kullanımı için.',
            eaglesport2: 'Günlük kullanıma yönelik, sportif karakterli ve ekonomik yaz lastiği.',
            eaglesport2uhp: 'Eagle Sport 2’nin büyük jantlı otomobiller için yüksek performans sürümü.',
            eaglesport4seasons: 'Uygun fiyatlı, kış onaylı dört mevsim lastiği.',
            efficientgripperformance: 'Düşük yuvarlanma direnci ve ıslak zemin güvenliği odaklı yaz lastiği.',
            efficientgripperformance2: 'EfficientGrip Performance’ın yeni kuşağı; aşınma ömrü ve verimlilik iyileştirilmiştir.',
            efficientgrip: 'Yakıt tasarrufu ve konfor odaklı yaz lastiği.',
            efficientgrip2suv: 'SUV’lar için verimlilik ve konfor odaklı yaz lastiği.',
            efficientgripcargo2: 'Hafif ticari araçlar için uzun ömürlü yaz lastiği.',
            vector4seasonscargo: 'Hafif ticari araçlar için dört mevsim lastiği.',
            eaglesport2suv: 'SUV’lar için ekonomik yaz lastiği.',
            ultragrip8performance: 'Binek otomobiller için kış lastiği.',
            ultragripperformancegen1: 'Binek otomobiller için kış lastiği.',
            eaglef1asymmetric2: 'Yüksek performans yaz lastiği.',
            eaglef1asymmetric3rof: 'Eagle F1 Asymmetric 3’ün Run Flat sürümü.',
            wintercommandcargo: 'Hafif ticari araçlar için kış lastiği.'
        },
        related: ['dunlop', 'debica', 'sava']
    },
    bridgestone: {
        kind: 'lastik',
        display: 'Bridgestone',
        tagline: 'Japon mühendisliğiyle geliştirilen, Türkiye’de Brisa ortaklığıyla üretilen dünya devi',
        about: [
            'Bridgestone, 1931’de Shojiro Ishibashi tarafından Japonya’nın Kurume kentinde kuruldu. Marka adı, kurucusunun soyadının (Ishibashi: “taş köprü”) İngilizceye çevrilmesiyle oluşmuştur. Bugün dünyanın en büyük lastik üreticilerinden biridir; Firestone ve Dayton markaları da grubun bünyesindedir.',
            'Bridgestone lastikleri Türkiye’de Sabancı Holding ile kurulan ortaklık Brisa tarafından üretilir. Turanza serisi konfor ve ıslak zemin güvenliği, Potenza performans, Blizzak kış, Turanza All Season ve Weather Control ise dört mevsim ihtiyacına yöneliktir. Bridgestone’un ENLITEN teknolojisi, lastiğin ağırlığını ve yuvarlanma direncini azaltarak verimliliği artırmayı hedefler; bu teknolojiyi taşıyan lastiklerin yanağında ENLITEN ibaresi bulunur.',
            'Bridgestone, DriveGuard adlı Run Flat teknolojisiyle standart jantlara takılabilen ve patlak hâlde sınırlı mesafe gidebilen lastikler de sunar.'
        ],
        strengths: [
            'Turanza serisiyle konfor ve ıslak zemin güvenliği',
            'Blizzak serisiyle kar ve buzda güçlü çekiş',
            'ENLITEN teknolojisiyle düşük yuvarlanma direnci',
            'Run Flat (RFT) ve DriveGuard seçenekleri',
            'Türkiye’de Brisa tesislerinde üretim'
        ],
        forWhom: 'Bridgestone; konforlu ve güvenli bir aile otomobili lastiği arayanlar (Turanza), karlı bölgelerde yaşayanlar (Blizzak) ve Run Flat lastik kullanan BMW/MINI gibi araçların sahipleri için öne çıkar.',
        series: {
            turanza6: 'Konfor, ıslak zemin güvenliği ve uzun ömür odaklı yeni nesil touring yaz lastiği.',
            turanzaallseason6: 'Turanza 6’nın kış onaylı dört mevsim sürümü.',
            turanzat005: 'Islak zeminde kısa fren mesafesiyle bilinen touring yaz lastiği.',
            turanzat005rft: 'Turanza T005’in Run Flat sürümü.',
            blizzak6: 'Binek otomobiller için yeni nesil kış lastiği; karda ve ıslakta dengeli performans.',
            blizzaklm005: 'Islak ve karlı zeminde frenleme performansıyla öne çıkan kış lastiği.',
            blizzaklm005driveguardrft: 'Standart janta takılabilen, patlak hâlde gidebilen DriveGuard kış lastiği.',
            blizzaklm001rft: 'Run Flat kış lastiği; RFT lastikle donatılmış premium araçlar için.',
            potenzasport: 'Spor ve premium otomobiller için yüksek performans yaz lastiği.',
            duravisallseasonevo: 'Hafif ticari araçlar için uzun ömürlü dört mevsim lastiği.',
            duravisvan: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            duravisvanwinter: 'Hafif ticari araçlar için kış lastiği.',
            duelerat002: 'SUV ve pick-up’lar için yol ve hafif arazi kullanımına uygun lastik.',
            duelerhpsportrft: 'SUV’lar için Run Flat yaz lastiği.',
            potenzas001: 'Premium ve spor otomobiller için yüksek performans yaz lastiği.',
            potenzas001rft: 'Potenza S001’in Run Flat sürümü; premium otomobillerde fabrika çıkışı tercih edilir.',
            weathercontrola005evo: 'Kış onaylı dört mevsim lastiği; ıslak zeminde güçlü frenleme.',
            alenza001rft: 'SUV’lar için Run Flat yaz lastiği.',
            ecopiaep150: 'Düşük yuvarlanma direnci odaklı, ekonomik yaz lastiği.',
            ecopiaep500: 'Elektrikli ve küçük şehir otomobilleri için verimlilik odaklı lastik.',
            blizzaklm001: 'Binek otomobiller için kış lastiği.',
            duravisr660: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            alenza001: 'SUV’lar için konfor ve yol tutuşunu dengeleyen yaz lastiği.'
        },
        related: ['lassa', 'dayton']
    },
    lassa: {
        kind: 'lastik',
        display: 'Lassa',
        tagline: 'Brisa tarafından Türkiye’de üretilen, fiyat-performans dengesiyle yaygın yerli marka',
        about: [
            'Lassa, Sabancı Holding ve Bridgestone ortaklığı olan Brisa’nın kendi markasıdır ve Türkiye’de İzmit ile Aksaray’daki tesislerde üretilir. Türkiye yolları ve iklimi düşünülerek geliştirilen Lassa, binek otomobilden SUV’a, hafif ticariden ağır vasıtaya kadar geniş bir ürün gamına sahiptir ve Avrupa başta olmak üzere birçok ülkeye ihraç edilir.',
            'Lassa’nın binek ürün gamında Revola ve Driveways Sport+ performans, Greenways verimlilik, Competus SUV ve 4x4, Snoways ve Wintus kış, Multiways ise dört mevsim serisidir. Transway serisi hafif ticari araçların yük taşıma ihtiyacına yöneliktir.',
            'Yerli üretim olması, Lassa lastiklerinde güncel üretim tarihli ürünlere ulaşmayı ve yaygın ebatlarda stok bulmayı kolaylaştırır.'
        ],
        strengths: [
            'Türkiye’de üretim ve güncel üretim tarihli stok',
            'Fiyat-performans dengesi',
            'Binek, SUV ve hafif ticari için geniş ebat yelpazesi',
            'Snoways ve Competus Winter ile kış seçenekleri',
            'Multiways ile uygun fiyatlı dört mevsim alternatifi'
        ],
        forWhom: 'Lassa; bütçesini dengeli kullanmak isteyen, şehir içi ve şehirler arası günlük kullanımda güvenilir bir lastik arayan sürücüler ile hafif ticari araç sahipleri için öne çıkar.',
        series: {
            revola: 'Binek otomobiller için sportif karakterli, yeni nesil yaz lastiği.',
            multiways2: 'Kış onaylı dört mevsim lastiği; yıl boyu tek lastikle gitmek isteyenler için ekonomik seçenek.',
            multiwaysc: 'Hafif ticari araçlar için dört mevsim lastiği.',
            competushp3: 'SUV’lar için yol odaklı, konforlu yaz lastiği.',
            competushp2: 'SUV’lar için yol odaklı yaz lastiği.',
            competusat3: 'SUV ve pick-up’lar için yol ve hafif arazi kullanımına uygun lastik.',
            competuswinter2: 'SUV’lar için kış lastiği.',
            snoways4: 'Binek otomobiller için kış lastiği; karlı ve ıslak zeminde güvenli sürüş.',
            snoways5: 'Snoways ailesinin yeni kuşağı; karda çekiş ve frenleme geliştirilmiştir.',
            greenways: 'Düşük yuvarlanma direnci odaklı, ekonomik yaz lastiği.',
            drivewayssport: 'Büyük jantlı otomobiller için yüksek performans yaz lastiği.',
            transway3: 'Hafif ticari araçlar için dayanıklı, uzun ömürlü yaz lastiği.',
            transway: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            wintus2: 'Hafif ticari araçlar için kış lastiği.',
            wintus3: 'Hafif ticari araçlar için yeni nesil kış lastiği.',
            transway2: 'Hafif ticari araçlar için yaz lastiği.',
            snoways3: 'Binek otomobiller için kış lastiği.',
            competushp: 'SUV’lar için yol odaklı yaz lastiği.',
            driveways: 'Binek otomobiller için performans yaz lastiği.',
            iceways2: 'Buzlu ve karlı zemin için kış lastiği.'
        },
        related: ['bridgestone']
    },
    petlas: {
        kind: 'lastik',
        display: 'Petlas',
        tagline: 'Kırşehir’de üretilen, binekten ağır vasıtaya geniş ürün gamına sahip yerli lastik markası',
        about: [
            'Petlas, Kırşehir’deki tesislerinde üretim yapan yerli lastik üreticisidir. Binek, SUV, hafif ticari, ağır vasıta, tarım ve iş makinesi lastikleri üreten Petlas, ürünlerini Türkiye’nin yanı sıra çok sayıda ülkeye ihraç eder.',
            'Petlas’ın binek ürün gamında Velox Sport ve Prestige Sport performans, Imperium ve Progreen konfor ve verimlilik, Elegant günlük kullanım, Explero SUV ve 4x4, Snowmaster kış, MultiAction ise dört mevsim serisidir. Hafif ticari araçlar için Fullpower yaz, Fullgrip kış ve Vanmaster dört mevsim lastikleri sunulur.',
            'Yerli üretim olması sayesinde Petlas lastiklerinde yaygın ebatlarda stok bulmak kolaydır ve ürünler genellikle güncel üretim tarihlidir.'
        ],
        strengths: [
            'Türkiye’de üretim, güncel üretim tarihli stok',
            'Uygun fiyatlı yaz, kış ve dört mevsim seçenekleri',
            'Hafif ticari araçlar için geniş ürün gamı (Fullpower, Fullgrip, Vanmaster)',
            'SUV ve 4x4 için Explero serisi',
            'Ekonomik fiyatla güvenli günlük kullanım'
        ],
        forWhom: 'Petlas; ekonomik ve güvenilir bir lastik arayan binek araç sahipleri, yük taşıyan hafif ticari araç kullanıcıları ve yerli üretimi tercih eden sürücüler için öne çıkar.',
        series: {
            prestigesport: 'Binek otomobiller için sportif karakterli yaz lastiği.',
            multiactionpt565: 'Kış onaylı dört mevsim lastiği; yıl boyu kullanım için ekonomik seçenek.',
            veloxsportpt741: 'Büyük jantlı otomobiller için yüksek performans yaz lastiği.',
            vanmasteras: 'Hafif ticari araçlar için dört mevsim lastiği.',
            primecomfort: 'Konfor ve sessizlik odaklı yaz lastiği.',
            fullpowerpt825plus: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            expleropt431ht: 'SUV’lar için yol odaklı yaz lastiği.',
            expleropt411as: 'SUV’lar için dört mevsim lastiği.',
            expleropt421at: 'SUV ve pick-up’lar için yol ve hafif arazi lastiği.',
            explerowinterw671: 'SUV’lar için kış lastiği.',
            peaklanderat: 'Pick-up ve arazi araçları için arazi lastiği.',
            fullpowerpt835: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            fullpowerpt825: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            fullgrippt925: 'Hafif ticari araçlar için kış lastiği.',
            snowmaster2: 'Binek otomobiller için kış lastiği.',
            snowmaster2sport: 'Büyük jantlı otomobiller için performans kış lastiği.',
            elegantpt311: 'Küçük ve kompakt otomobiller için ekonomik yaz lastiği.',
            imperiumpt515: 'Orta sınıf otomobiller için konfor odaklı yaz lastiği.',
            fullgrippt935: 'Hafif ticari araçlar için kış lastiği.',
            suvmasteras: 'SUV’lar için dört mevsim lastiği.',
            progreenpt525: 'Düşük yuvarlanma direnci odaklı yaz lastiği.'
        },
        related: ['starmaxx']
    },
    hankook: {
        kind: 'lastik',
        display: 'Hankook',
        tagline: 'premium otomobil üreticilerinin fabrika çıkışında da kullandığı Güney Koreli lastik markası',
        about: [
            'Hankook, 1941’de Seul’de kurulmuş Güney Koreli lastik üreticisidir. Bugün Avrupa, Asya ve Amerika’daki fabrikalarıyla dünyanın en büyük lastik üreticileri arasında yer alır; birçok Avrupa otomobil üreticisi araçlarını fabrika çıkışında Hankook lastiklerle donatır.',
            'Hankook’un binek ürün gamında Ventus performans, Kinergy konfor ve dört mevsim, Winter i*cept kış serisidir. iON ailesi ise doğrudan elektrikli araçlar için geliştirilmiştir: yüksek tork ve ağırlığa dayanıklı yapı, düşük yuvarlanma direnci ve kabin sessizliği odaklıdır. Hafif ticari araçlar için Vantra serisi sunulur. Laufenn markası da Hankook grubuna aittir.'
        ],
        strengths: [
            'Ventus serisiyle yüksek performans',
            'Elektrikli araçlara özel iON serisi',
            'Winter i*cept ile kış güvenliği',
            'Kinergy ile dört mevsim ve konfor seçenekleri',
            'Fiyat-performans dengesi'
        ],
        forWhom: 'Hankook; premium markalara yakın performansı daha erişilebilir fiyatla isteyen sürücüler ve elektrikli araç sahipleri için öne çıkar.',
        series: {
            wintericeptrs3w462: 'Binek otomobiller için kış lastiği; karda ve ıslakta dengeli performans.',
            wintericeptevo3w330: 'Performans otomobilleri için kış lastiği.',
            wintericeptioniw01a: 'Elektrikli araçlar için geliştirilmiş kış lastiği.',
            kinergyeco2k435: 'Ekonomik ve verimli günlük kullanım lastiği.',
            ventusprime4k135: 'Konfor ve ıslak zemin güvenliği odaklı yaz lastiği.',
            ventusevosuvk137a: 'SUV’lar için yüksek performans yaz lastiği.',
            kinergy4s2xh750a: 'SUV’lar için kış onaylı dört mevsim lastiği.',
            kinergy4s2h750b: 'Kış onaylı dört mevsim lastiği.',
            ventusprime4k135a: 'SUV’lar için konfor odaklı yaz lastiği.',
            ventuss1evo3k127: 'Yüksek performans yaz lastiği.',
            wintericeptevo4w340: 'Performans otomobilleri için yeni nesil kış lastiği.',
            wintericeptevo3w330chrs: 'Performans otomobilleri için kış lastiği.',
            wintericeptevo2suvw320a: 'SUV’lar için kış lastiği.',
            ionflexclimate: 'Elektrikli araçlar için kış onaylı dört mevsim lastiği.',
            vantraltra18: 'Hafif ticari araçlar için dayanıklı yaz lastiği.',
            ventuss1evo3suvk127a: 'SUV’lar için yüksek performans yaz lastiği.',
            ventuss1evo3evk127e: 'Elektrikli araçlar için yüksek performans yaz lastiği.',
            vantrastas2ra30: 'Hafif ticari araçlar için dört mevsim lastiği.'
        },
        related: ['laufenn']
    },
    laufenn: {
        kind: 'lastik',
        display: 'Laufenn',
        tagline: 'Hankook güvencesiyle üretilen, ekonomik segmentteki Güney Koreli marka',
        about: [
            'Laufenn, Hankook’un 2014’te tanıttığı ikinci markasıdır ve Hankook fabrikalarında üretilir. Adını Almanca “koşmak” anlamındaki “laufen” fiilinden alır. Amaç, Hankook’un üretim kalitesini daha uygun fiyatlı bir ürün gamıyla sunmaktır.',
            'Laufenn ürün gamında S Fit serisi yaz, I Fit serisi kış, G Fit 4S dört mevsim, X Fit SUV, Z Fit yüksek performans ve X Fit Van / I Fit Van hafif ticari ihtiyaçlarına yöneliktir.'
        ],
        strengths: [
            'Hankook fabrikalarında üretim',
            'Uygun fiyat',
            'Yaz, kış ve dört mevsim seçenekleri',
            'Hafif ticari araçlar için Van serileri'
        ],
        forWhom: 'Laufenn; bütçesini dengelemek isteyen ama üretim kalitesinden ödün vermek istemeyen, şehir içi ağırlıklı kullanan sürücüler için öne çıkar.',
        series: {
            ifitplus: 'Binek otomobiller için kış lastiği (I Fit+ LW31).',
            ifit: 'Binek otomobiller için kış lastiği.',
            sfiteq: 'Verimlilik odaklı yaz lastiği.',
            gfit4s: 'Kış onaylı dört mevsim lastiği.',
            sfit2lk12: 'Yeni nesil yaz lastiği; ıslak zemin güvenliği geliştirilmiştir.',
            sfiteqplus: 'Verimlilik odaklı yaz lastiği.',
            zfiteq: 'Büyük jantlı otomobiller için performans yaz lastiği.',
            xfitvan: 'Hafif ticari araçlar için yaz lastiği.',
            ifitvan: 'Hafif ticari araçlar için kış lastiği.',
            sfit2suvlk12a: 'SUV’lar için yaz lastiği.'
        },
        related: ['hankook']
    },
    falken: {
        kind: 'lastik',
        display: 'Falken',
        tagline: 'Japon Sumitomo Rubber güvencesiyle üretilen, motor sporlarından gelen lastik markası',
        about: [
            'Falken, Japonya’nın köklü lastik üreticilerinden Sumitomo Rubber Industries’in markasıdır. Marka özellikle Nürburgring 24 Saat gibi dayanıklılık yarışlarında yer alarak performans imajı edinmiştir. Sumitomo Rubber’ın Türkiye’de Tekirdağ Çerkezköy’de de üretim tesisi bulunur.',
            'Falken’in binek ürün gamında Azenis yüksek performans, Ziex ve Sincera günlük kullanım ve verimlilik, Eurowinter kış, EuroAll Season ise dört mevsim serisidir.'
        ],
        strengths: [
            'Azenis serisiyle sportif yol tutuşu',
            'EuroAll Season ile kış onaylı dört mevsim seçeneği',
            'Japon üretim kalitesi',
            'Fiyat-performans dengesi'
        ],
        forWhom: 'Falken; premium markalara alternatif olarak sportif yol tutuşu ve dengeli fiyat arayan sürücüler için öne çıkar.',
        series: {
            euroallseasonas210: 'Kış onaylı dört mevsim lastiği.',
            euroallseasonas220pro: 'SUV ve büyük jantlı otomobiller için kış onaylı dört mevsim lastiği.',
            azenisfk520: 'Yüksek performans yaz lastiği; kuru ve ıslak zeminde güçlü tutuş.',
            eurowinterhs02: 'Binek otomobiller için kış lastiği.',
            ziexze320: 'Günlük kullanıma yönelik, konfor ve verimlilik odaklı yaz lastiği.',
            ziexze310ecorun: 'Düşük yuvarlanma direnci odaklı yaz lastiği.',
            sincerasn110ecorun: 'Küçük ve kompakt otomobiller için verimli yaz lastiği.'
        }
    },
    kumho: {
        kind: 'lastik',
        display: 'Kumho',
        tagline: 'performans ve dört mevsim serileriyle öne çıkan Güney Koreli lastik üreticisi',
        about: [
            'Kumho Tire, 1960’ta Güney Kore’nin Gwangju kentinde kurulmuştur. Kore, Çin, Vietnam ve ABD’deki fabrikalarıyla dünya genelinde lastik üretir ve birçok otomobil üreticisine fabrika çıkışı lastik sağlar.',
            'Kumho’nun binek ürün gamında Ecsta performans, Solus konfor ve dört mevsim, WinterCraft kış, Crugen SUV ve PorTran hafif ticari serisidir.'
        ],
        strengths: [
            'Ecsta serisiyle sportif performans',
            'Solus 4S ile kış onaylı dört mevsim seçeneği',
            'Fiyat-performans dengesi',
            'SUV ve hafif ticari seçenekleri'
        ],
        forWhom: 'Kumho; uygun fiyatla sportif bir yaz lastiği ya da yıl boyu kullanılabilecek bir dört mevsim lastiği arayanlar için öne çıkar.',
        series: {
            solus4sha32: 'Kış onaylı dört mevsim lastiği.',
            ecstasportps72: 'Yüksek performans yaz lastiği.',
            ecstasportsps72: 'Spor otomobiller için yüksek performans yaz lastiği.',
            ecstahs52: 'Konfor ve yol tutuşunu dengeleyen yaz lastiği.',
            ecstahs51: 'Günlük kullanıma yönelik sportif yaz lastiği.',
            ecstaps71: 'Performans yaz lastiği.',
            ecstaps71suv: 'SUV’lar için performans yaz lastiği.',
            wintercraftwp52: 'Binek otomobiller için kış lastiği.',
            wintercraftwp72: 'Performans otomobilleri için kış lastiği.',
            wintercraftsuvws71: 'SUV’lar için kış lastiği.',
            portrankc55: 'Hafif ticari araçlar için yaz lastiği.',
            solusta21: 'Konfor odaklı, ekonomik yaz lastiği.',
            portrankc53: 'Hafif ticari araçlar için yaz lastiği.',
            crugenhp71: 'SUV’lar için konfor odaklı yaz lastiği.',
            ecowinges31: 'Verimlilik odaklı yaz lastiği.',
            crugenpremiumkl33: 'SUV’lar için yaz lastiği.'
        }
    },
    nexen: {
        kind: 'lastik',
        display: 'Nexen',
        tagline: 'Güney Kore menşeli, fiyat-performans odaklı lastik markası',
        about: [
            'Nexen Tire, kökleri 1942’ye uzanan Güney Koreli bir lastik üreticisidir. Kore, Çin ve Çek Cumhuriyeti’ndeki fabrikalarında üretim yapar ve bazı Avrupa otomobil üreticilerine de fabrika çıkışı lastik sağlar.',
            'Nexen’in ürün gamında N’Fera performans, N’blue verimlilik, WinGuard kış serisidir.'
        ],
        strengths: ['Uygun fiyat', 'WinGuard serisiyle kış seçenekleri', 'Büyük jantlı SUV seçenekleri'],
        forWhom: 'Nexen; uygun fiyatla güvenli bir kış lastiği ya da büyük jantlı SUV lastiği arayanlar için değerlendirilebilir.',
        series: {
            winguardsport3: 'Performans otomobilleri için kış lastiği.',
            winguardsport2suv: 'SUV’lar için kış lastiği.',
            winguardsport2: 'Binek otomobiller için kış lastiği.',
            nferaprimus: 'Konfor odaklı yaz lastiği.'
        }
    },
    dunlop: {
        kind: 'lastik',
        display: 'Dunlop',
        tagline: 'şişirilebilir lastiğin mucidinin adını taşıyan, Goodyear grubundaki köklü marka',
        about: [
            'Dunlop, 1888’de şişirilebilir (pnömatik) lastiğin patentini alan İskoç veteriner John Boyd Dunlop’un adını taşır. Markanın motor sporlarında, özellikle Le Mans ve motosiklet yarışlarında uzun bir geçmişi vardır. Avrupa’da Dunlop otomobil lastikleri bugün Goodyear grubu tarafından üretilir.',
            'Dunlop’un binek ürün gamında Sport Maxx performans, Sport BluResponse verimlilik ve ıslak zemin güvenliği, SP Sport ve SP Touring günlük kullanım serileridir.'
        ],
        strengths: ['Islak zemin performansı', 'Sportif sürüş karakteri', 'Goodyear grubunun üretim altyapısı'],
        forWhom: 'Dunlop; ıslak zemin güvenliği yüksek, sportif karakterli bir yaz lastiği arayan sürücüler için öne çıkar.',
        series: {
            blueresponsetg: 'Islak zemin güvenliği ve düşük yuvarlanma direnci odaklı yaz lastiği.',
            spsportlm705: 'Günlük kullanıma yönelik, konforlu yaz lastiği.',
            sptouringr1: 'Küçük ve kompakt otomobiller için ekonomik yaz lastiği.',
            spsportmaxx060: 'Yüksek performans yaz lastiği.'
        },
        related: ['goodyear']
    },
    debica: {
        kind: 'lastik',
        display: 'Debica',
        tagline: 'Goodyear grubuna ait, Polonya’da üretilen ekonomik lastik markası',
        about: [
            'Debica, 1937’de Polonya’nın Dębica kentinde kurulmuş bir lastik üreticisidir ve bugün Goodyear grubunun bir parçasıdır. Goodyear’ın teknoloji ve kalite standartlarıyla üretilen Debica, ekonomik segmentte güvenilir bir seçenek olarak konumlanır.',
            'Debica’nın ürün gamında Presto yaz, Frigo kış ve Navigator dört mevsim serisidir; SUV’lar için Presto SUV ve Frigo SUV sürümleri bulunur.'
        ],
        strengths: ['Goodyear güvencesi', 'Uygun fiyat', 'Navigator 3 ile kış onaylı dört mevsim seçeneği'],
        forWhom: 'Debica; bütçesini korumak isteyen, şehir içi ağırlıklı kullanan sürücüler için öne çıkar.',
        series: {
            navigator3: 'Kış onaylı dört mevsim lastiği.',
            navigator2: 'Dört mevsim lastiği.',
            frigohp2: 'Binek otomobiller için kış lastiği.',
            frigosuv2: 'SUV’lar için kış lastiği.',
            frigo2: 'Küçük ve kompakt otomobiller için kış lastiği.',
            prestouhp2: 'Büyük jantlı otomobiller için performans yaz lastiği.',
            presto: 'Ekonomik yaz lastiği.',
            prestohp2: 'Orta sınıf otomobiller için yaz lastiği.',
            prestohp: 'Orta sınıf otomobiller için yaz lastiği.',
            prestosuv: 'SUV’lar için yaz lastiği.',
            passio2: 'Küçük otomobiller için ekonomik yaz lastiği.'
        },
        related: ['goodyear', 'sava']
    },
    sava: {
        kind: 'lastik',
        display: 'Sava',
        tagline: 'Goodyear grubuna ait, Slovenya kökenli ekonomik lastik markası',
        about: [
            'Sava, kökleri Slovenya’nın Kranj kentine dayanan bir lastik markasıdır ve bugün Goodyear grubunun bünyesindedir. Goodyear’ın üretim altyapısıyla geliştirilen Sava, ekonomik segmentte dengeli bir seçenek sunar.',
            'Sava’nın ürün gamında Intensa yaz, Eskimo kış, All Weather ve Adapto dört mevsim serisidir; Perfecta küçük otomobiller, Trenta hafif ticari araçlar içindir.'
        ],
        strengths: ['Goodyear güvencesi', 'Uygun fiyat', 'All Weather ile dört mevsim seçeneği'],
        forWhom: 'Sava; ekonomik bir lastikle güvenli günlük kullanım isteyen sürücüler için öne çıkar.',
        series: {
            allweather: 'Kış onaylı dört mevsim lastiği.',
            intensahp2: 'Orta sınıf otomobiller için yaz lastiği.',
            intensahp: 'Orta sınıf otomobiller için yaz lastiği.',
            adapto: 'Dört mevsim lastiği.',
            adaptohp: 'Dört mevsim lastiği.',
            intensauhp2: 'Büyük jantlı otomobiller için performans yaz lastiği.',
            intensasuv2: 'SUV’lar için yaz lastiği.',
            perfecta: 'Küçük otomobiller için ekonomik yaz lastiği.',
            eskimohp2: 'Binek otomobiller için kış lastiği.',
            eskimosuv2: 'SUV’lar için kış lastiği.',
            eskimos3: 'Küçük ve kompakt otomobiller için kış lastiği.',
            eskimolt: 'Hafif ticari araçlar için kış lastiği.',
            trenta2: 'Hafif ticari araçlar için yaz lastiği.'
        },
        related: ['goodyear', 'debica']
    },
    matador: {
        kind: 'lastik',
        display: 'Matador',
        tagline: 'Continental grubuna ait, Slovakya kökenli ekonomik lastik markası',
        about: [
            'Matador, 1905’te Slovakya’nın Púchov kentinde kurulmuş bir lastik markasıdır ve bugün Continental grubunun bünyesindedir. Continental’in teknolojisini ekonomik segmentte sunan Matador, özellikle Orta ve Doğu Avrupa’da yaygın kullanılır.',
            'Matador’un ürün gamında Hectorra yaz, Nordicca kış ve MP 62 All Weather dört mevsim serisidir; Hectorra Van ve Nordicca Van hafif ticari araçlar içindir.'
        ],
        strengths: ['Continental güvencesi', 'Uygun fiyat', 'Hafif ticari seçenekleri'],
        forWhom: 'Matador; Continental altyapısıyla üretilmiş ekonomik bir lastik arayan sürücüler için öne çıkar.',
        series: {
            hectorra5: 'Binek otomobiller için yeni nesil yaz lastiği.',
            mp47hectorra3: 'Binek otomobiller için yaz lastiği.',
            mp93nordicca: 'Binek otomobiller için kış lastiği.',
            mp62allweatherevo: 'Kış onaylı dört mevsim lastiği.',
            hectorravan: 'Hafif ticari araçlar için yaz lastiği.',
            nordiccavan: 'Hafif ticari araçlar için kış lastiği.'
        },
        related: ['continental', 'barum']
    },
    barum: {
        kind: 'lastik',
        display: 'Barum',
        tagline: 'Continental grubuna ait, Çek Cumhuriyeti kökenli ekonomik lastik markası',
        about: [
            'Barum, adını kurucu şirketlerin (Baťa, Rubena ve Mitas) baş harflerinden alır ve kökleri Çek Cumhuriyeti’nin Otrokovice kentine dayanır. 1993’ten bu yana Continental grubunun bir parçasıdır ve Continental’in teknolojisini ekonomik fiyatla sunar.',
            'Barum’un ürün gamında Bravuris yaz, Polaris kış, Quartaris dört mevsim, Vanis hafif ticari serisidir.'
        ],
        strengths: ['Continental güvencesi', 'Uygun fiyat', 'Kış onaylı Polaris ve Quartaris serileri'],
        forWhom: 'Barum; Continental altyapısıyla üretilmiş, fiyatı uygun ve güvenilir bir lastik arayanlar için öne çıkar.',
        series: {
            bravuris6: 'Binek otomobiller için yeni nesil yaz lastiği.',
            bravuris5hm: 'Binek otomobiller için performans odaklı yaz lastiği.',
            bravuris5: 'Binek otomobiller için yaz lastiği.',
            vanis3: 'Hafif ticari araçlar için yaz lastiği.',
            quartaris5: 'Kış onaylı dört mevsim lastiği.',
            polaris6: 'Binek otomobiller için yeni nesil kış lastiği.',
            polaris5: 'Binek otomobiller için kış lastiği.',
            snovanis3: 'Hafif ticari araçlar için kış lastiği.',
            brillantis2: 'Küçük otomobiller için ekonomik yaz lastiği.'
        },
        related: ['continental', 'matador']
    },
    dayton: {
        kind: 'lastik',
        display: 'Dayton',
        tagline: 'Bridgestone grubuna ait, ekonomik segmentteki lastik markası',
        about: [
            'Dayton, kökleri ABD’ye dayanan ve bugün Bridgestone grubuna ait olan bir lastik markasıdır. Avrupa’da Bridgestone’un ekonomik segmentteki markası olarak konumlanır.',
            'Dayton ürün gamında Touring yaz, DW510 kış ve Van serileri hafif ticari araçlar içindir.'
        ],
        strengths: ['Bridgestone güvencesi', 'Uygun fiyat', 'Hafif ticari seçenekleri'],
        forWhom: 'Dayton; Bridgestone güvencesi taşıyan ekonomik bir lastik arayan sürücüler ve hafif ticari araç sahipleri için öne çıkar.',
        series: {
            touring2: 'Binek otomobiller için ekonomik yaz lastiği.',
            van: 'Hafif ticari araçlar için yaz lastiği.',
            vanwinter: 'Hafif ticari araçlar için kış lastiği.',
            dw510evo: 'Binek otomobiller için kış lastiği.'
        },
        related: ['bridgestone']
    },
    'bf-goodrich': {
        kind: 'lastik',
        display: 'BFGoodrich',
        tagline: 'arazi ve pick-up lastiklerinin efsanevi Amerikan markası',
        about: [
            'BFGoodrich, 1870’te Benjamin Franklin Goodrich tarafından ABD’de kurulmuştur ve bugün Michelin grubunun bir parçasıdır. Marka; 1976’da tanıttığı All-Terrain T/A lastiğiyle arazi lastiği kategorisinin öncülerinden olmuş, Baja 1000 ve Dakar gibi zorlu yarışlarda uzun bir geçmiş edinmiştir.',
            'All-Terrain T/A KO serisi, hem asfaltta hem de toprak, çakıl ve taşlı zeminde kullanılmak üzere geliştirilmiştir. Kalın yanak yapısı ve keskin kenara dayanıklı sırt hamuru, arazi kullanımında yanak kesiklerine karşı direnç sağlar.'
        ],
        strengths: [
            'Arazi ve pick-up lastiklerinde köklü deneyim',
            'Yanak kesiğine dayanıklı yapı',
            'Kar onaylı (3PMSF) arazi lastikleri',
            'Michelin grubunun üretim kalitesi'
        ],
        forWhom: 'BFGoodrich; arazi aracı, pick-up veya SUV’sini düzenli olarak asfalt dışında kullanan sürücüler için öne çıkar.',
        series: {
            allterraintako3: 'Asfalt ve arazi için çok yönlü lastik; kar onaylıdır, yanak dayanımı yüksektir.',
            allterraintaorwl: 'All-Terrain T/A’nın beyaz yazılı yanaklı sürümü.',
            trailterrainta: 'Ağırlıklı olarak asfaltta kullanılan SUV ve pick-up’lar için hafif arazi lastiği.'
        },
        related: ['michelin']
    },
    general: {
        kind: 'lastik',
        display: 'General Tire',
        tagline: 'SUV ve arazi lastikleriyle bilinen, Continental grubundaki Amerikan markası',
        about: [
            'General Tire, 1915’te ABD’nin Akron kentinde kurulmuş ve 1987’den bu yana Continental grubunun bir parçası olan lastik markasıdır. Marka özellikle Grabber ailesiyle SUV, pick-up ve arazi lastiklerinde tanınır.'
        ],
        strengths: ['SUV ve arazi lastiklerinde uzmanlık', 'Continental güvencesi'],
        forWhom: 'General Tire; SUV ve pick-up’ını asfaltın yanı sıra arazide de kullanan sürücüler için öne çıkar.',
        series: {
            trailterrainta: 'SUV ve pick-up’lar için hafif arazi lastiği.'
        },
        related: ['continental']
    },
    nankang: {
        kind: 'lastik',
        display: 'Nankang',
        tagline: 'zor bulunan ebatlarda seçenek sunan Tayvanlı lastik üreticisi',
        about: [
            'Nankang, 1959’da Tayvan’da kurulmuş bir lastik üreticisidir. Marka özellikle zor bulunan ebatlarda, düşük profilli ve büyük jantlı otomobiller ile modifiye araçlar için geniş seçenek sunmasıyla bilinir.'
        ],
        strengths: ['Zor bulunan ebatlar', 'Uygun fiyat', 'Performans ve arazi seçenekleri'],
        forWhom: 'Nankang; aracı için diğer markalarda bulamadığı bir ebatı arayan ya da uygun fiyatlı bir performans lastiği isteyen sürücüler için değerlendirilebilir.',
        series: {
            as3: 'Düşük profilli yüksek performans yaz lastiği.',
            as2: 'Yüksek performans yaz lastiği.',
            sv55: 'SUV’lar için kış lastiği.',
            at5: 'SUV ve pick-up’lar için arazi lastiği.',
            ar1: 'Pist ve yarış odaklı yarı slik lastik.',
            cw25: 'Hafif ticari araçlar için lastik.'
        }
    },
    milestone: {
        kind: 'lastik',
        display: 'Milestone',
        tagline: 'ekonomik segmentte binek, SUV ve hafif ticari seçenekleri sunan lastik markası',
        about: [
            'Milestone, ekonomik segmentte binek otomobil, SUV ve hafif ticari araçlar için lastik sunan bir markadır. CarMile serisi binek otomobiller, SuvMile SUV’lar, VanMile ve EvoVan hafif ticari araçlar içindir; kış için CarMile Winter ve Wintide seçenekleri bulunur.'
        ],
        strengths: ['Uygun fiyat', 'Yaz ve kış seçenekleri', 'Hafif ticari seçenekleri'],
        forWhom: 'Milestone; ekonomik bir lastikle şehir içi ve şehirler arası günlük kullanım ihtiyacını karşılamak isteyen sürücüler için değerlendirilebilir.',
        series: {
            carmilesport: 'Binek otomobiller için sportif karakterli yaz lastiği.',
            carmile: 'Binek otomobiller için ekonomik lastik serisi.',
            carmilewinter: 'Binek otomobiller için kış lastiği.',
            suvmileht: 'SUV’lar için yol odaklı yaz lastiği.',
            vanmile: 'Hafif ticari araçlar için yaz lastiği.',
            evovan: 'Hafif ticari araçlar için yaz lastiği.'
        }
    },
    starmaxx: {
        kind: 'lastik',
        display: 'Starmaxx',
        tagline: 'Türkiye’de Petlas tesislerinde üretilen ekonomik yerli lastik markası',
        about: [
            'Starmaxx, Türkiye’de Kırşehir’deki Petlas tesislerinde üretilen yerli bir lastik markasıdır. Ekonomik segmentte binek, SUV ve hafif ticari araçlar için yaz, kış ve dört mevsim seçenekleri sunar ve birçok ülkeye ihraç edilir.',
            'Starmaxx ürün gamında Ultrasport ve Dynamix Sport performans, Naturen ve Tolero günlük kullanım, Incurro SUV, Polarmaxx kış, Maxx Out ise dört mevsim serisidir; Provan ve Prowin hafif ticari araçlar içindir.'
        ],
        strengths: ['Türkiye’de üretim', 'Uygun fiyat', 'Yaz, kış ve dört mevsim seçenekleri', 'Hafif ticari seçenekleri'],
        forWhom: 'Starmaxx; yerli üretim ve ekonomik fiyat arayan sürücüler için öne çıkar.',
        series: {
            maxxoutst582: 'Kış onaylı dört mevsim lastiği.',
            dynamixsport: 'Binek otomobiller için sportif yaz lastiği.',
            polarmaxxsport: 'Büyük jantlı otomobiller için kış lastiği.',
            polarmaxx: 'Binek otomobiller için kış lastiği.',
            provanst850plus: 'Hafif ticari araçlar için yaz lastiği.',
            controlmax: 'Binek otomobiller için yaz lastiği.',
            vanmaxxas: 'Hafif ticari araçlar için dört mevsim lastiği.',
            tolerost330: 'Küçük otomobiller için ekonomik yaz lastiği.',
            prowinst960: 'Hafif ticari araçlar için kış lastiği.',
            prowinst950: 'Hafif ticari araçlar için kış lastiği.',
            ultrasportst760: 'Büyük jantlı otomobiller için performans yaz lastiği.',
            suvmaxxas: 'SUV’lar için dört mevsim lastiği.',
            incurrohtst450: 'SUV’lar için yol odaklı yaz lastiği.',
            naturenst562: 'Konfor ve verimlilik odaklı yaz lastiği.',
            incurrowinterw870: 'SUV’lar için kış lastiği.'
        },
        related: ['petlas']
    },
    accelera: {
        kind: 'lastik',
        display: 'Accelera',
        tagline: 'büyük jantlı otomobiller için uygun fiyatlı performans lastikleri sunan marka',
        about: [
            'Accelera, özellikle büyük jant çaplarında ve düşük profilli ebatlarda uygun fiyatlı yüksek performans yaz lastikleri sunan bir markadır. Iota serisi SUV’lar, PHI serisi ise performans otomobilleri içindir; EV ibareli ürünler elektrikli araçlara uygundur.'
        ],
        strengths: ['Büyük jantlarda uygun fiyat', 'Düşük profilli ebat seçenekleri', 'Elektrikli araç uyumlu seçenekler'],
        forWhom: 'Accelera; 18–21 inç jantlı otomobil veya SUV’si için ekonomik bir yaz lastiği arayan sürücüler için değerlendirilebilir.',
        series: {
            iotaevt: 'SUV’lar için performans yaz lastiği.',
            lotaevt: 'SUV’lar için performans yaz lastiği.',
            iotast68: 'SUV’lar için yaz lastiği.',
            phi: 'Performans otomobilleri için yaz lastiği.',
            phi2: 'PHI serisinin yeni kuşağı.',
            ecoplush: 'Konfor ve verimlilik odaklı yaz lastiği.'
        }
    },
    funtoma: {
        kind: 'lastik',
        display: 'Funtoma',
        tagline: 'ekonomik segmentte binek ve hafif ticari lastikleri sunan marka',
        about: [
            'Funtoma, ekonomik segmentte binek otomobil ve hafif ticari araçlar için yaz ve kış lastikleri sunan bir markadır. RoadFun ve RoadFun Sport binek otomobiller, VanFun hafif ticari araçlar içindir; kış için RoadFun Winter ve VanFun Winter seçenekleri bulunur.'
        ],
        strengths: ['Uygun fiyat', 'Binek ve hafif ticari seçenekleri', 'Güncel üretim tarihli stok'],
        forWhom: 'Funtoma; bütçe öncelikli, şehir içi ağırlıklı kullanan sürücüler için değerlendirilebilir.',
        series: {
            roadfunsport: 'Binek otomobiller için sportif karakterli yaz lastiği.',
            roadfun: 'Binek otomobiller için ekonomik yaz lastiği.',
            vanfun: 'Hafif ticari araçlar için yaz lastiği.',
            roadfunwinter: 'Binek otomobiller için kış lastiği.',
            vanfunwinter: 'Hafif ticari araçlar için kış lastiği.'
        }
    },
    sentury: {
        kind: 'lastik',
        display: 'Sentury',
        tagline: 'ekonomik segmentte performans yaz lastikleri sunan marka',
        about: [
            'Sentury, ekonomik segmentte binek otomobil ve SUV’lar için lastik sunan bir markadır. Qirin 990 serisi, büyük jantlı otomobiller için uygun fiyatlı bir yaz lastiği seçeneğidir.'
        ],
        strengths: ['Uygun fiyat', 'Büyük jant seçenekleri'],
        forWhom: 'Sentury; büyük jantlı otomobili için uygun fiyatlı bir yaz lastiği arayan sürücüler için değerlendirilebilir.',
        series: { qirin990: 'Binek otomobil ve SUV’lar için yaz lastiği.' },
        related: ['landsail']
    },
    landsail: {
        kind: 'lastik',
        display: 'Landsail',
        tagline: 'Sentury grubunun ekonomik segmentteki lastik markası',
        about: [
            'Landsail, Sentury grubuna ait, ekonomik segmentte binek otomobiller için lastik sunan bir markadır. Sitemizdeki Landsail ürünleri Qirin 990 yaz lastiği serisindendir.'
        ],
        strengths: ['Uygun fiyat'],
        forWhom: 'Landsail; uygun fiyatlı bir yaz lastiği arayan sürücüler için değerlendirilebilir.',
        series: { qirin990: 'Binek otomobiller için yaz lastiği.' },
        related: ['sentury']
    },
    winrun: {
        kind: 'lastik',
        display: 'Winrun',
        tagline: 'ekonomik segmentte düşük profilli yaz lastikleri sunan marka',
        about: [
            'Winrun, ekonomik segmentte binek otomobiller için lastik sunan bir markadır. R330 serisi düşük profilli, sportif görünümlü otomobiller için uygun fiyatlı bir yaz lastiği seçeneğidir.'
        ],
        strengths: ['Uygun fiyat', 'Düşük profilli ebatlar'],
        forWhom: 'Winrun; düşük profilli jantlara uygun fiyatlı bir yaz lastiği arayan sürücüler için değerlendirilebilir.',
        series: { r330: 'Düşük profilli binek otomobiller için yaz lastiği.' }
    },
    triangle: {
        kind: 'lastik',
        display: 'Triangle',
        tagline: 'Çin’in büyük lastik üreticilerinden, ekonomik segmentte seçenek sunan marka',
        about: [
            'Triangle, 1976’da Çin’in Weihai kentinde kurulmuş, binek, ticari ve iş makinesi lastikleri üreten büyük bir lastik üreticisidir. Sitemizdeki Triangle ürünleri kış lastiklerinden oluşur.'
        ],
        strengths: ['Uygun fiyat'],
        forWhom: 'Triangle; ekonomik bir kış lastiği arayan sürücüler için değerlendirilebilir.'
    },
    formula: {
        kind: 'agir',
        display: 'Formula',
        tagline: 'ağır vasıta için ekonomik ve dayanıklı lastikler sunan marka',
        about: [
            'Formula, Pirelli grubundan doğmuş bir lastik markasıdır. Sitemizdeki Formula ürünleri Türkiye’de üretilen ağır vasıta lastikleridir: çekici ve kamyonlarda çeker (drive) ve düz (steer) aks pozisyonları için 17.5 ve 22.5 inç jantlarda seçenekler sunulur.'
        ],
        strengths: ['Ağır vasıtada uygun fiyat', 'Türkiye’de üretim', 'Çeker ve düz aks seçenekleri'],
        forWhom: 'Formula; filo işletmeleri ve ağır vasıta sahipleri için ekonomik bir lastik çözümüdür.'
    },
    prometeon: {
        kind: 'agir',
        display: 'Prometeon',
        tagline: 'Pirelli’nin endüstriyel lastik geleneğini sürdüren ağır vasıta lastiği üreticisi',
        about: [
            'Prometeon Tyre Group, Pirelli’nin endüstriyel (kamyon, otobüs, tarım) lastik bölümünün 2017’de ayrılmasıyla kurulmuş, merkezi Milano’da bulunan bir ağır vasıta lastiği üreticisidir. Pirelli markalı ağır vasıta lastiklerinin üretim ve geliştirme geleneğini sürdürür.',
            'Prometeon ürünleri, uzun yol taşımacılığından bölgesel dağıtıma ve şantiye kullanımına kadar farklı görevler için çeker (drive), düz (steer) ve dorse (trailer) pozisyonlarında sunulur. Profuel serisi uzun yolda yakıt verimliliğine odaklanır.'
        ],
        strengths: ['Pirelli kökenli ağır vasıta tecrübesi', 'Uzun yolda yakıt verimliliği (Profuel)', 'Çeker, düz ve dorse pozisyonları için seçenekler'],
        forWhom: 'Prometeon; uzun yol taşımacılığı yapan filolar ve ağır vasıta sahipleri için öne çıkar.'
    },
    konak: {
        kind: 'zincir',
        display: 'Konak',
        tagline: 'binek otomobilden ağır vasıtaya kar zinciri seçenekleri sunan yerli üretici',
        about: [
            'Konak, binek otomobil, SUV, hafif ticari ve ağır vasıtalar için kar zinciri üreten yerli bir markadır. Ürün gamında otomobiller için pratik takılan modellerden ağır vasıtalar için Avusturya tipi serme zincirlere kadar farklı seçenekler bulunur.'
        ],
        strengths: ['Yerli üretim', 'Binekten ağır vasıtaya geniş ebat yelpazesi', 'Ağır vasıta için serme zincir seçenekleri'],
        forWhom: 'Konak; karlı ve buzlu yollarda güvenli çekiş isteyen binek araç sahipleri ve ağır vasıta kullanıcıları için öne çıkar.'
    },
    mefatech: {
        kind: 'zincir',
        display: 'Mefatech',
        tagline: 'otomobil ve 4x4 araçlar için takmatik ve serme kar zincirleri',
        about: [
            'Mefatech, otomobil, SUV/4x4 ve hafif ticari araçlar için kar zinciri sunan yerli bir markadır. Ürün gamında hızlı takılan takmatik modeller ile merdiven tipi, mahmuzlu serme zincirler bulunur.'
        ],
        strengths: ['Takmatik ve serme seçenekleri', '4x4 araçlar için modeller', 'Uygun fiyat'],
        forWhom: 'Mefatech; kışın karlı yollara çıkan otomobil ve 4x4 sahipleri için pratik bir kar zinciri çözümüdür.'
    },
    snowwolf: {
        kind: 'zincir',
        display: 'Snowwolf',
        tagline: 'otomobil ve hafif ticari araçlar için kar zinciri ve kar paleti seçenekleri',
        about: [
            'Snowwolf, otomobil ve hafif ticari araçlar için kar zinciri ve kar paleti sunan bir markadır. Classic serisi, küçük jant çaplarından hafif ticari ebatlarına kadar geniş bir yelpazede sunulur.'
        ],
        strengths: ['Geniş ebat yelpazesi', 'Hafif ticari seçenekleri', 'Uygun fiyat'],
        forWhom: 'Snowwolf; kışın ara sıra karlı yollara çıkan sürücüler için ekonomik bir kar zinciri seçeneğidir.'
    },
    carset: {
        kind: 'zincir',
        display: 'Carset',
        tagline: 'otomobiller için takmatik kar zincirleri',
        about: [
            'Carset, otomobiller için kar zinciri ve araç bakım ürünleri sunan bir markadır. Seri X takmatik kar zincirleri, lastiğe hızlı takılabilecek şekilde tasarlanmıştır.'
        ],
        strengths: ['Takmatik (hızlı takılan) yapı', 'Uygun fiyat'],
        forWhom: 'Carset; kar zincirini nadiren kullanan ve hızlı takılabilen bir model arayan otomobil sahipleri için uygundur.'
    },
    'spikes-spider': {
        kind: 'palet',
        display: 'Spikes-Spider',
        tagline: 'tekerleğe saniyeler içinde takılan kar paleti sistemi',
        about: [
            'Spikes-Spider, klasik kar zincirine alternatif olarak geliştirilmiş bir kar paleti sistemidir. Jant bijonlarına monte edilen bir adaptör sayesinde palet, tekerleğe saniyeler içinde, aracı kaldırmadan ve lastiğin arkasına uzanmadan takılabilir.'
        ],
        strengths: ['Çok hızlı takma-çıkarma', 'Lastik arkasına uzanmadan montaj', 'Farklı araç tipleri için modeller'],
        forWhom: 'Spikes-Spider; kışın sık sık karlı yollara çıkan ve kar zinciri takmakla uğraşmak istemeyen sürücüler için öne çıkar.'
    },
    'great-spider': {
        kind: 'palet',
        display: 'Great Spider',
        tagline: 'kar paleti yedek parça ve aksesuarları',
        about: ['Great Spider sayfasında kar paleti sistemleri için yedek parça ve aksesuarlar listelenir.'],
        strengths: ['Yedek parça'],
        forWhom: 'Kar paleti kullanıcıları için yedek parça ihtiyacına yöneliktir.'
    },
    matte: {
        kind: 'corap',
        display: 'Matte',
        tagline: 'otomobil ve SUV’lar için kar çorabı',
        about: [
            'Matte, otomobil, SUV/4x4 ve ağır vasıtalar için kar çorabı sunan bir markadır. Kar çorabı, tekstil esaslı yapısıyla lastiğin üzerine geçirilir; metal zincire göre çok daha hafif ve kolay takılır, jant ve lastiğe zarar vermez.',
            'Matte ürünleri lastik ebadına göre beden (Large, X-Large vb.) olarak sunulur. Doğru bedeni seçmek için lastiğinizin yanağındaki ebadı (ör. 205/55R16) kullanmanız yeterlidir.'
        ],
        strengths: ['Çok kolay takılma', 'Jant ve lastiğe zarar vermeyen tekstil yapı', 'Otomobil, SUV ve ağır vasıta için bedenler'],
        forWhom: 'Matte; kışın ara sıra karla karşılaşan, pratik ve hafif bir çözüm arayan sürücüler için uygundur.'
    },
    akd: {
        kind: 'jant',
        display: 'LJA',
        tagline: 'LastikJantAVM’nin kendi markası jant ve jant aksesuarları',
        about: [
            'LJA, LastikJantAVM’nin kendi markasıdır. Bu sayfada LJA markalı alüminyum jantlar ile sibop, bijon, bilezik (merkezleme halkası) ve hava uzatma aparatı gibi jant ve lastik aksesuarları listelenir.',
            'Jant seçerken jant çapı ve genişliği, bijon deliği düzeni (PCD, ör. 5x112), ET (offset) değeri ve merkez deliği (göbek çapı) aracınıza uygun olmalıdır. Merkez deliği aracınızınkinden büyük olan jantlarda bilezik kullanılarak merkezleme sağlanır.'
        ],
        strengths: ['Kendi markamız', 'Jant ve aksesuar bir arada', 'Bilezik ve bijon gibi montaj parçaları'],
        forWhom: 'LJA ürünleri; aracına uygun jant arayanlar ve jant montajı için gerekli aksesuarları tek yerden almak isteyenler içindir.'
    },
    ljx: {
        kind: 'jant',
        display: 'LJX',
        tagline: 'binek otomobil ve SUV’lar için alüminyum jant modelleri',
        about: [
            'LJX sayfasında binek otomobil, SUV ve hafif ticari araçlar için alüminyum jant modelleri listelenir. Ürün adlarında jant çapı, genişlik, bijon düzeni (PCD), ET (offset) ve merkez deliği bilgisi ile uyumlu araç modelleri yer alır.',
            'Jant seçerken jant çapı ve genişliği, bijon deliği düzeni (PCD, ör. 5x112), ET (offset) değeri ve merkez deliği (göbek çapı) aracınıza uygun olmalıdır.'
        ],
        strengths: ['Geniş PCD ve çap yelpazesi', 'Ürün adında uyumlu araç bilgisi', 'Ön ve arka farklı ölçülü (staggered) seçenekler'],
        forWhom: 'LJX jantlar; aracının görünümünü yenilemek ya da hasarlı jantını değiştirmek isteyen sürücüler içindir.'
    },
    tiresoul: {
        kind: 'aksesuar',
        display: 'Tiresoul',
        tagline: 'lastik parlatıcı ve besleyici solüsyon',
        about: [
            'Tiresoul, lastik yanaklarını parlatan ve kauçuğu besleyen bakım solüsyonları sunar. Düzenli kullanım lastik yanaklarının görünümünü yeniler.'
        ],
        strengths: ['Lastik yanağına parlaklık', 'Farklı ambalaj boyutları'],
        forWhom: 'Aracının lastiklerinin bakımlı görünmesini isteyen sürücüler içindir.'
    }
};

export function getBrandProfile(slug: string): BrandProfile | null {
    return BRAND_PROFILES[slug] || null;
}
