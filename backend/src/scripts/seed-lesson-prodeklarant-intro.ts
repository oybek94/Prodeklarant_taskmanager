import { prisma } from '../prisma';

const LESSON_HTML_CONTENT = `<section id="hero">
        <h1>Prodeklarant — Bojxona brokerlik korxonasi haqida</h1>
        <p>Ushbu darsda siz Prodeklarant kompaniyasi haqida to'liq ma'lumot olasiz. Bu dars yangi xodimlar uchun kompaniya bilan tanishish va mavjud xodimlar uchun kompaniya qadriyatlarini chuqurroq tushunish uchun mo'ljallangan. Bojxona brokerlik sohasida ishlashda qanday mas'uliyat va ehtiyotkorlik talab qilinishini bilib olasiz.</p>
    </section>

    <section id="prodeklarant-qanday-korxona">
        <h2>1. Prodeklarant qanday korxona?</h2>
        <p>Prodeklarant — bu bojxona brokerlik korxonasi. Bu nima degani? Bojxona brokerlik korxonasi — bu import va eksport qilinayotgan tovarlar uchun bojxona rasmiylashtirish jarayonlarini mijozlar nomidan amalga oshiradigan litsenziyalangan tashkilot.</p>
        <p>Prodeklarant sifatida biz quyidagi vazifalarni bajaramiz:</p>
        <ul>
            <li><strong>Bojxona deklaratsiyalarini tayyorlash va topshirish</strong> — tovarlar haqida barcha kerakli hujjatlarni to'plash, tekshirish va bojxona organlariga topshirish</li>
            <li><strong>Bojxona to'lovlarini hisoblash va to'lash</strong> — bojxona yig'imlari, qo'shimcha to'lovlar va boshqa majburiy to'lovlarni to'g'ri hisoblash</li>
            <li><strong>Hujjatlarni tekshirish va tasdiqlash</strong> — Invoice, ST-1, FITO, shartnomalar va boshqa hujjatlarning to'g'riligini tekshirish</li>
            <li><strong>Mijozlar bilan muloqot</strong> — bojxona jarayonlari haqida ma'lumot berish va maslahat berish</li>
        </ul>
        <p><strong>Yuridik mas'uliyat:</strong> Bojxona brokerlik korxonasi sifatida biz har bir deklaratsiya, har bir hujjat uchun yuridik mas'uliyatni o'z zimamizga olamiz. Agar xatolik bo'lsa, bu nafaqat moliyaviy zarar, balki yuridik muammolarga ham olib kelishi mumkin. Shuning uchun har bir qadamda ehtiyotkorlik va to'g'rilik talab qilinadi.</p>
        <p><strong>Haqiqiy misol:</strong> Faraz qilaylik, mijoz Xitoydan elektronika import qilmoqda. Bizning vazifamiz — Invoice, ST-1, shartnoma va boshqa hujjatlarni to'g'ri tekshirish, bojxona deklaratsiyasini to'g'ri to'ldirish va bojxona to'lovlarini to'g'ri hisoblash. Agar biz Invoice'dagi narxni noto'g'ri o'qib, kamroq bojxona to'lovi hisoblasak, bu yuridik muammoga olib kelishi mumkin.</p>
    </section>

    <section id="prodeklarant-maqsadi">
        <h2>2. Prodeklarantning asosiy maqsadi</h2>
        <p>Prodeklarantning asosiy maqsadi — bojxona jarayonlarini to'g'ri, tez va xavfsiz amalga oshirish. Biz tezlik va aniq o'rtasida muvozanatni saqlaymiz, lekin hech qachon tezlikni aniq o'rniga qo'ymaymiz.</p>
        <p><strong>Xatoliklarni oldini olish:</strong> Bizning eng muhim vazifamiz — xatoliklarni oldini olish. Har bir hujjat, har bir raqam, har bir ma'lumot to'g'ri bo'lishi kerak. Xatolik bo'lganda, bu nafaqat kompaniyaga, balki mijozga ham zarar yetkazadi.</p>
        <p><strong>Qonuniylik:</strong> Biz har doim qonun va qoidalarga rioya qilamiz. Hech qanday qisqa yo'l, hech qanday "optimizatsiya" qonunni buzishga olib kelmasligi kerak.</p>
        <p><strong>Tezlik va aniq o'rtasidagi muvozanat:</strong> Ba'zida mijozlar tezroq bo'lishini so'rashadi, lekin biz tezlikni aniq o'rniga qo'ymaymiz. Agar hujjat to'g'ri emas bo'lsa, biz uni tuzatishni so'ramiz, garchi bu vaqt olishi mumkin bo'lsa ham.</p>
        <p><strong>Haqiqiy misollar:</strong></p>
        <ul>
            <li><strong>Invoice misoli:</strong> Agar Invoice'dagi tovar nomi ST-1'dagi tovar nomiga mos kelmasa, biz darhol mijozga murojaat qilamiz va to'g'ri ma'lumotni so'ramiz. Biz "taxminan shunday" deb o'tib ketmaymiz.</li>
            <li><strong>ST-1 misoli:</strong> Agar ST-1'dagi og'irlik ma'lumoti Invoice'dagi og'irlik ma'lumotiga mos kelmasa, biz buni darhol aniqlaymiz va tuzatishni so'ramiz.</li>
            <li><strong>Deklaratsiya misoli:</strong> Bojxona deklaratsiyasini to'ldirishda har bir raqam, har bir kod to'g'ri bo'lishi kerak. Biz "taxminan" yoki "ehtimol" so'zlarini ishlatmaymiz.</li>
        </ul>
    </section>

    <section id="prodeklarant-qadriyatlari">
        <h2>3. Prodeklarant qadriyatlari</h2>
        
        <h3>Mas'uliyat</h3>
        <p><strong>Tushuntirish:</strong> Har bir xodim o'z ishining har bir bosqichida to'liq mas'uliyatni o'z zimasiga oladi. Bu nafaqat "men vazifani bajaraman" degani, balki "men natijaning to'g'riligiga kafolat beraman" degani.</p>
        <p><strong>Amaliy misol:</strong> Faraz qilaylik, siz Invoice'ni tekshiryapsiz. Siz faqat "ko'rib chiqdim" deb yozib qo'yib bo'lmaydi. Siz har bir raqamni, har bir tovar nomini, har bir narxni tekshirishingiz va agar biror narsa noto'g'ri bo'lsa, darhol mijozga murojaat qilishingiz kerak. Agar siz xatoni ko'rmasangiz va keyin muammo chiqsa, bu sizning mas'uliyatingizdir.</p>

        <h3>Aniqlik va tekshiruv</h3>
        <p><strong>Tushuntirish:</strong> Biz har bir ma'lumotni, har bir hujjatni, har bir raqamni tekshiramiz. Biz "taxminan to'g'ri" yoki "ehtimol to'g'ri" deb o'tib ketmaymiz. Har bir narsa aniq va tasdiqlangan bo'lishi kerak.</p>
        <p><strong>Amaliy misol:</strong> Agar siz ST-1 hujjatini tekshiryapsiz va u yerda tovar og'irligi 1000 kg ko'rsatilgan bo'lsa, lekin Invoice'da 950 kg ko'rsatilgan bo'lsa, siz darhol bu farqni aniqlashingiz va mijozga murojaat qilishingiz kerak. Siz "ehtimol bir xil" deb o'tib ketmay siz.</p>

        <h3>Shaffoflik (xatolarni yashirmaslik)</h3>
        <p><strong>Tushuntirish:</strong> Agar xatolik bo'lsa, biz uni yashirmaymiz. Biz uni darhol aniqlaymiz, xabar beramiz va tuzatamiz. Xatolarni yashirish kattaroq muammolarga olib keladi.</p>
        <p><strong>Amaliy misol:</strong> Faraz qilaylik, siz deklaratsiyada xatoga yo'l qo'ydingiz va bu aniqlandi. Siz bu xatoni yashirishga harakat qilmay siz. Siz darhol rahbaringizga xabar berasiz, mijozga xabar berasiz va tuzatish rejasini tayyorlay siz. Agar siz xatoni yashirsangiz, bu keyinchalik kattaroq muammoga aylanadi.</p>

        <h3>Tizim intizomi</h3>
        <p><strong>Tushuntirish:</strong> Biz har bir jarayonni tizimli va tartibli amalga oshiramiz. Har bir bosqich, har bir hujjat, har bir tekshiruv o'z o'rnida bo'lishi kerak. Biz "qisqa yo'l" yoki "optimizatsiya" deb tizimni buzmaymiz.</p>
        <p><strong>Amaliy misol:</strong> Har bir yangi vazifa kelganda, siz avval barcha hujjatlarni to'plash, keyin ularni tekshirish, keyin deklaratsiyani tayyorlash, keyin yana bir bor tekshirish va keyin topshirish jarayonini amalga oshirishingiz kerak. Siz "tezroq bo'lishi uchun" biror bosqichni o'tkazib yuborishga harakat qilmay siz.</p>
    </section>

    <section id="prodeklarant-ichki-tuzilmasi">
        <h2>4. Prodeklarant ichki tuzilmasi</h2>
        <p>Prodeklarantning ish jarayoni zanjir kabi. Har bir bo'g'in, har bir bosqich, har bir xodim bir-biriga bog'liq. Agar bir joyda xatolik bo'lsa, bu butun zanjirga ta'sir qiladi.</p>
        <p><strong>Bo'limlar va bosqichlar:</strong></p>
        <ul>
            <li><strong>Hujjatlarni qabul qilish bo'limi:</strong> Mijozdan hujjatlarni qabul qilish va dastlabki tekshiruvdan o'tkazish</li>
            <li><strong>Hujjatlarni tekshirish bo'limi:</strong> Invoice, ST-1, FITO va boshqa hujjatlarni chuqur tekshirish</li>
            <li><strong>Deklaratsiya tayyorlash bo'limi:</strong> Bojxona deklaratsiyasini to'g'ri to'ldirish</li>
            <li><strong>Tasdiqlash bo'limi:</strong> Tayyor deklaratsiyani yana bir bor tekshirish va tasdiqlash</li>
            <li><strong>Topshirish bo'limi:</strong> Bojxona organlariga topshirish va natijani kuzatish</li>
        </ul>
        <p><strong>Nima uchun bir xatolik butun jarayonni buzadi?</strong></p>
        <p>Agar siz hujjatlarni qabul qilish bosqichida xatoga yo'l qo'ysangiz (masalan, noto'g'ri hujjatni qabul qilsangiz), bu keyingi barcha bosqichlarga ta'sir qiladi. Hujjatlarni tekshirish bo'limi noto'g'ri ma'lumot bilan ishlaydi, deklaratsiya tayyorlash bo'limi noto'g'ri ma'lumot bilan deklaratsiya tayyorlaydi, va oxirida bojxona organlari noto'g'ri deklaratsiyani rad etadi. Bu esa vaqt yo'qotish, qayta ishlash va mijozning ishonchsizligiga olib keladi.</p>
        <p><strong>Haqiqiy misol:</strong> Faraz qilaylik, siz Invoice'ni qabul qildingiz va u yerda tovar narxi 10,000 dollar ko'rsatilgan. Lekin aslida bu narx noto'g'ri edi va to'g'ri narx 12,000 dollar edi. Agar siz buni darhol aniqlab, mijozga murojaat qilmasangiz, keyingi barcha bosqichlar noto'g'ri ma'lumot bilan ishlaydi. Deklaratsiya noto'g'ri to'ldiriladi, bojxona to'lovi noto'g'ri hisoblanadi, va oxirida hamma narsani qayta ishlash kerak bo'ladi.</p>
    </section>

    <section id="ish-madaniyati-va-muloqot">
        <h2>5. Ish madaniyati va muloqot</h2>
        <p>Prodeklarantda muloqot qoidalari aniq va tizimli. Biz hujjatlarga asoslangan muloqotni afzal ko'ramiz.</p>
        <p><strong>Muloqot qoidalari:</strong></p>
        <ul>
            <li><strong>Hujjatlarga asoslangan muloqot:</strong> Har bir muloqot, har bir savol, har bir javob hujjatlarga asoslangan bo'lishi kerak. Biz "men shunday deb o'ylayman" yoki "ehtimol shunday" degan so'zlarni ishlatmaymiz.</li>
            <li><strong>Aniq va qisqa xabarlar:</strong> Har bir xabar aniq, qisqa va tushunarli bo'lishi kerak. Biz keraksiz so'zlar yoki noaniq ifodalarni ishlatmaymiz.</li>
            <li><strong>Vaqtida javob berish:</strong> Har bir savolga, har bir murojaatga vaqtida javob berish kerak. Biz "keyinroq" yoki "vaqt topganda" degan javoblarni bermaymiz.</li>
        </ul>
        <p><strong>To'g'ri va noto'g'ri xabar misollari:</strong></p>
        <p><strong>Noto'g'ri xabar:</strong> "Invoice'ni ko'rib chiqdim, hamma narsa yaxshi ko'rinadi. Lekin biror narsa noto'g'ri bo'lishi mumkin, men to'liq ishonch hosil qila olmayman."</p>
        <p><strong>To'g'ri xabar:</strong> "Invoice'ni tekshirdim. Barcha ma'lumotlar to'g'ri: tovar nomlari, narxlar, og'irliklar. Lekin ST-1 hujjatida tovar og'irligi Invoice'dagi og'irlikdan 50 kg farq qiladi. Iltimos, to'g'ri og'irlik ma'lumotini yuboring."</p>
        <p><strong>Noto'g'ri xabar:</strong> "Deklaratsiya tayyor, lekin biror narsa noto'g'ri bo'lishi mumkin."</p>
        <p><strong>To'g'ri xabar:</strong> "Deklaratsiya tayyor. Barcha ma'lumotlar tekshirildi va tasdiqlandi. Invoice, ST-1 va FITO hujjatlari mos keladi. Bojxona to'lovi hisoblandi: 1,500 dollar. Keyingi bosqich — bojxona organlariga topshirish."</p>
    </section>

    <section id="xodimdan-kutiladigan-yondashuv">
        <h2>6. Xodimdan kutiladigan yondashuv</h2>
        <p>Prodeklarantda har bir xodim nafaqat ma'lumot kirituvchi, balki xavf menejeri sifatida ishlaydi. Siz har bir bosqichda "bu to'g'rimi?", "bu xavfsizmi?", "bu qonuniyatlimi?" degan savollarni o'zingizga berishingiz kerak.</p>
        <p><strong>Faol yondashuv:</strong></p>
        <ul>
            <li><strong>Savol berish:</strong> Agar biror narsa noaniq bo'lsa, siz savol berasiz. Siz "taxminan shunday" deb o'tib ketmay siz.</li>
            <li><strong>Xavfni aniqlash:</strong> Siz har bir bosqichda potentsial xavflarni aniqlaysiz va ularni darhol xabar berasiz.</li>
            <li><strong>Yechim taklif qilish:</strong> Agar muammo bo'lsa, siz nafaqat muammoni aniqlaysiz, balki yechimni ham taklif qilasiz.</li>
        </ul>
        <p><strong>Topshirishdan oldin tekshiruv:</strong></p>
        <p>Har bir hujjatni, har bir deklaratsiyani topshirishdan oldin siz uni yana bir bor tekshirasiz. Siz "ehtimol to'g'ri" deb o'tib ketmay siz. Siz "100% to'g'ri" deb ishonch hosil qilasiz.</p>
        <p><strong>Haqiqiy misol:</strong> Faraz qilaylik, siz bojxona deklaratsiyasini tayyorladingiz. Siz uni topshirishdan oldin yana bir bor tekshirasiz: barcha raqamlar to'g'rimi? Barcha kodlar to'g'rimi? Barcha hujjatlar mos keladimi? Agar biror narsa shubhali bo'lsa, siz uni darhol aniqlaysiz va tuzatasiz. Siz "ehtimol to'g'ri, topshirib ko'ramiz" deb o'tib ketmay siz.</p>
    </section>

    <section id="prodeklarant-va-xodim-kelishuvi">
        <h2>7. Prodeklarant va xodim o'rtasidagi kelishuv</h2>
        <p>Prodeklarant va xodim o'rtasida o'zaro ishonch va mas'uliyat asosida kelishuv mavjud.</p>
        <p><strong>Prodeklarantning majburiyatlari:</strong></p>
        <ul>
            <li><strong>To'liq ma'lumot berish:</strong> Kompaniya har bir xodimga o'z vazifalari, mas'uliyatlari va kutilayotgan natijalar haqida to'liq ma'lumot beradi.</li>
            <li><strong>Qo'llab-quvvatlash:</strong> Kompaniya har bir xodimga kerakli resurslar, vositalar va yordamni ta'minlaydi.</li>
            <li><strong>O'qitish va rivojlantirish:</strong> Kompaniya har bir xodimni doimiy o'qitish va rivojlantirish imkoniyatlarini ta'minlaydi.</li>
            <li><strong>Adolatli baholash:</strong> Kompaniya har bir xodimning ishini adolatli baholaydi va mukofotlaydi.</li>
        </ul>
        <p><strong>Xodimning majburiyatlari:</strong></p>
        <ul>
            <li><strong>Mas'uliyatli ishlash:</strong> Har bir xodim o'z vazifalarini to'liq mas'uliyat bilan bajaradi.</li>
            <li><strong>Aniqlik va tekshiruv:</strong> Har bir xodim o'z ishining har bir bosqichida aniqlik va tekshiruvni ta'minlaydi.</li>
            <li><strong>Shaffoflik:</strong> Har bir xodim xatolarni yashirmaydi va ularni darhol xabar beradi.</li>
            <li><strong>Tizim intizomi:</strong> Har bir xodim tizim qoidalariga rioya qiladi va ularni buzmaydi.</li>
        </ul>
        <p><strong>O'zaro ishonch:</strong></p>
        <p>Prodeklarant va xodim o'rtasida o'zaro ishonch mavjud. Kompaniya xodimga ishonadi va unga mas'uliyatli vazifalar beradi. Xodim esa kompaniyaga ishonadi va o'z vazifalarini to'liq bajaradi. Bu o'zaro ishonch tufayli biz samarali va xavfsiz ishlaymiz.</p>
    </section>

    <section id="summary">
        <h2>8. Xulosa</h2>
        <p>Ushbu darsda siz Prodeklarant kompaniyasi haqida quyidagi asosiy bilimlarni oldingiz:</p>
        <ul>
            <li><strong>Prodeklarant qanday korxona:</strong> Bojxona brokerlik korxonasi sifatida biz import va eksport qilinayotgan tovarlar uchun bojxona rasmiylashtirish jarayonlarini amalga oshiramiz va har bir bosqichda yuridik mas'uliyatni o'z zimamizga olamiz.</li>
            <li><strong>Asosiy maqsad:</strong> Bojxona jarayonlarini to'g'ri, tez va xavfsiz amalga oshirish, xatoliklarni oldini olish va qonuniyatni ta'minlash.</li>
            <li><strong>Qadriyatlar:</strong> Mas'uliyat, aniqlik va tekshiruv, shaffoflik va tizim intizomi — bu bizning asosiy qadriyatlarimizdir.</li>
            <li><strong>Ichki tuzilma:</strong> Bizning ish jarayonimiz zanjir kabi, har bir bo'g'in bir-biriga bog'liq va bir xatolik butun jarayonni buzishi mumkin.</li>
            <li><strong>Ish madaniyati:</strong> Hujjatlarga asoslangan muloqot, aniq va qisqa xabarlar, vaqtida javob berish — bu bizning muloqot qoidalarimizdir.</li>
            <li><strong>Xodimdan kutiladigan yondashuv:</strong> Har bir xodim xavf menejeri sifatida ishlaydi, faol yondashuv ko'rsatadi va topshirishdan oldin tekshiruvni amalga oshiradi.</li>
            <li><strong>Kelishuv:</strong> Prodeklarant va xodim o'rtasida o'zaro ishonch va mas'uliyat asosida kelishuv mavjud.</li>
        </ul>
        <p><strong>Asosiy xulosa:</strong> Prodeklarantda ishlash — bu nafaqat vazifalarni bajarish, balki har bir bosqichda to'liq mas'uliyat, aniqlik va ehtiyotkorlikni namoyish etishdir. Biz har bir hujjatni, har bir raqamni, har bir ma'lumotni tekshiramiz va to'g'riligiga kafolat beramiz. Bu nafaqat kompaniyaning muvaffaqiyati, balki sizning professional rivojlanishingiz uchun ham muhimdir.</p>
</section>`;

async function seedLesson() {
  try {
    console.log('Starting seed script for Prodeklarant intro lesson...');

    // 1. Create or find Training
    let training = await prisma.training.findFirst({
      where: {
        title: 'Prodeklarant Internal Academy',
      },
    });

    if (!training) {
      training = await prisma.training.create({
        data: {
          title: 'Prodeklarant Internal Academy',
          description: 'Prodeklarant kompaniyasi ichki o\'qitish akademiyasi',
          orderIndex: 1,
          active: true,
        },
      });
      console.log('Created Training: Prodeklarant Internal Academy');
    } else {
      console.log('Training already exists: Prodeklarant Internal Academy');
    }

    // 2. Create or find TrainingStage
    let stage = await prisma.trainingStage.findFirst({
      where: {
        trainingId: training.id,
        title: '1. Modul: Kompaniya bilan tanishuv',
      },
    });

    if (!stage) {
      stage = await prisma.trainingStage.create({
        data: {
          trainingId: training.id,
          title: '1. Modul: Kompaniya bilan tanishuv',
          description: 'Prodeklarant kompaniyasi bilan tanishish moduli',
          orderIndex: 1,
        },
      });
      console.log('Created TrainingStage: 1. Modul: Kompaniya bilan tanishuv');
    } else {
      console.log('TrainingStage already exists: 1. Modul: Kompaniya bilan tanishuv');
    }

    // 3. Create or find TrainingStep
    let step = await prisma.trainingStep.findFirst({
      where: {
        stageId: stage.id,
        title: 'Prodeklarant — Bojxona brokerlik korxonasi haqida',
      },
    });

    if (!step) {
      step = await prisma.trainingStep.create({
        data: {
          stageId: stage.id,
          title: 'Prodeklarant — Bojxona brokerlik korxonasi haqida',
          description: 'Prodeklarant kompaniyasi haqida to\'liq ma\'lumot',
          orderIndex: 1,
        },
      });
      console.log('Created TrainingStep: Prodeklarant — Bojxona brokerlik korxonasi haqida');
    } else {
      console.log('TrainingStep already exists: Prodeklarant — Bojxona brokerlik korxonasi haqida');
    }

    // 4. Create or find TrainingMaterial
    const existingMaterial = await prisma.trainingMaterial.findFirst({
      where: {
        stepId: step.id,
        title: 'Prodeklarant — Bojxona brokerlik korxonasi haqida',
      },
    });

    if (!existingMaterial) {
      const material = await prisma.trainingMaterial.create({
        data: {
          stepId: step.id,
          trainingId: null, // Step ichiga material bo'lsa, trainingId null
          title: 'Prodeklarant — Bojxona brokerlik korxonasi haqida',
          content: LESSON_HTML_CONTENT,
          type: 'TEXT',
          orderIndex: 1,
        },
      });
      console.log('Created TrainingMaterial with full HTML content');
      console.log(`Material ID: ${material.id}`);
    } else {
      // Update existing material with new content
      await prisma.trainingMaterial.update({
        where: { id: existingMaterial.id },
        data: {
          content: LESSON_HTML_CONTENT,
        },
      });
      console.log('Updated existing TrainingMaterial with new HTML content');
    }

    console.log('Seed script completed successfully!');
  } catch (error) {
    console.error('Error in seed script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedLesson()
  .then(() => {
    console.log('Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });

