import { db as prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const socialCategoryTree = [
  {
    id: "cat-instagram",
    name: "Instagram",
    children: [
      { id: "cat-instagram-followers", name: "Takipci" },
      { id: "cat-instagram-likes", name: "Begeni" },
      { id: "cat-instagram-views", name: "Izlenme" },
      { id: "cat-instagram-comments", name: "Yorum" },
      { id: "cat-instagram-reels", name: "Reels" },
      { id: "cat-instagram-story", name: "Hikaye" },
      { id: "cat-instagram-saves", name: "Kaydetme" },
    ],
  },
  {
    id: "cat-tiktok",
    name: "TikTok",
    children: [
      { id: "cat-tiktok-followers", name: "Takipci" },
      { id: "cat-tiktok-likes", name: "Begeni" },
      { id: "cat-tiktok-views", name: "Izlenme" },
      { id: "cat-tiktok-comments", name: "Yorum" },
      { id: "cat-tiktok-shares", name: "Paylasim" },
      { id: "cat-tiktok-live", name: "Canli Yayin" },
    ],
  },
  {
    id: "cat-youtube",
    name: "YouTube",
    children: [
      { id: "cat-youtube-subscribers", name: "Abone" },
      { id: "cat-youtube-views", name: "Izlenme" },
      { id: "cat-youtube-likes", name: "Begeni" },
      { id: "cat-youtube-comments", name: "Yorum" },
      { id: "cat-youtube-shorts", name: "Shorts" },
      { id: "cat-youtube-watchtime", name: "Izlenme Suresi" },
    ],
  },
  {
    id: "cat-twitter",
    name: "X / Twitter",
    children: [
      { id: "cat-twitter-followers", name: "Takipci" },
      { id: "cat-twitter-likes", name: "Begeni" },
      { id: "cat-twitter-retweets", name: "Retweet" },
      { id: "cat-twitter-views", name: "Goruntulenme" },
      { id: "cat-twitter-comments", name: "Yorum / Yanit" },
      { id: "cat-twitter-bookmarks", name: "Kaydetme" },
    ],
  },
  {
    id: "cat-facebook",
    name: "Facebook",
    children: [
      { id: "cat-facebook-followers", name: "Takipci" },
      { id: "cat-facebook-likes", name: "Begeni" },
      { id: "cat-facebook-views", name: "Izlenme" },
      { id: "cat-facebook-comments", name: "Yorum" },
      { id: "cat-facebook-group", name: "Grup Uyeleri" },
      { id: "cat-facebook-page", name: "Sayfa Etkilesimi" },
    ],
  },
  {
    id: "cat-telegram",
    name: "Telegram",
    children: [
      { id: "cat-telegram-members", name: "Kanal Uyeleri" },
      { id: "cat-telegram-postviews", name: "Gonderi Izlenme" },
      { id: "cat-telegram-reactions", name: "Reaksiyon" },
      { id: "cat-telegram-poll", name: "Anket Oyu" },
    ],
  },
  {
    id: "cat-spotify",
    name: "Spotify",
    children: [
      { id: "cat-spotify-followers", name: "Takipci" },
      { id: "cat-spotify-streams", name: "Dinlenme" },
      { id: "cat-spotify-playlists", name: "Playlist Takipci" },
      { id: "cat-spotify-monthly", name: "Aylik Dinleyici" },
    ],
  },
  {
    id: "cat-twitch",
    name: "Twitch",
    children: [
      { id: "cat-twitch-followers", name: "Takipci" },
      { id: "cat-twitch-views", name: "Izlenme" },
      { id: "cat-twitch-chat", name: "Chat Etkilesimi" },
      { id: "cat-twitch-live", name: "Canli Yayin Izlenme" },
    ],
  },
  {
    id: "cat-linkedin",
    name: "LinkedIn",
    children: [
      { id: "cat-linkedin-followers", name: "Takipci" },
      { id: "cat-linkedin-likes", name: "Begeni" },
      { id: "cat-linkedin-comments", name: "Yorum" },
      { id: "cat-linkedin-connections", name: "Baglanti" },
    ],
  },
  {
    id: "cat-discord",
    name: "Discord",
    children: [
      { id: "cat-discord-members", name: "Sunucu Uyeleri" },
      { id: "cat-discord-online", name: "Online Uyeler" },
      { id: "cat-discord-boost", name: "Boost" },
    ],
  },
];

// Her alt kategori için demo paket fiyat/miktar bilgileri
const packageTemplates = [
  { suffix: "Starter", quantity: 100, price: 9.99, retailPrice: 14.99, desc: "Hizli baslangic paketi" },
  { suffix: "Standard", quantity: 500, price: 29.99, retailPrice: 44.99, desc: "En cok tercih edilen paket" },
  { suffix: "Premium", quantity: 1000, price: 49.99, retailPrice: 74.99, desc: "Profesyonel kullanim icin" },
  { suffix: "VIP", quantity: 5000, price: 199.99, retailPrice: 299.99, desc: "Isletmeler icin buyuk hacimli paket" },
];

async function seedSocialCategories() {
  // Eski demo kategori ve bağlı servisleri temizle
  try {
    await prisma.package.deleteMany({ where: { service: { categoryId: "demo-category-social" } } });
    await prisma.service.deleteMany({ where: { categoryId: "demo-category-social" } });
    await prisma.category.deleteMany({ where: { id: "demo-category-social" } });
  } catch { /* zaten yoksa sorun yok */ }

  let rootSort = 1;

  for (const root of socialCategoryTree) {
    await prisma.category.upsert({
      where: { id: root.id },
      update: {
        name: root.name,
        parentId: null,
        sortOrder: rootSort,
        status: true,
      },
      create: {
        id: root.id,
        name: root.name,
        parentId: null,
        sortOrder: rootSort,
        status: true,
      },
    });

    let childSort = 1;
    for (const child of root.children) {
      await prisma.category.upsert({
        where: { id: child.id },
        update: {
          name: child.name,
          parentId: root.id,
          sortOrder: childSort,
          status: true,
        },
        create: {
          id: child.id,
          name: child.name,
          parentId: root.id,
          sortOrder: childSort,
          status: true,
        },
      });

      // Her alt kategori için demo servis oluştur
      const serviceId = `svc-${child.id}`;
      await prisma.service.upsert({
        where: { id: serviceId },
        update: {
          name: `${root.name} ${child.name}`,
          categoryId: child.id,
          status: true,
        },
        create: {
          id: serviceId,
          name: `${root.name} ${child.name}`,
          description: `${root.name} platformu icin ${child.name.toLowerCase()} servisi`,
          categoryId: child.id,
          min: 10,
          max: 100000,
          price: 10,
          retailPrice: 15,
          resellerPrice: 8,
          status: true,
        },
      });

      // Her alt kategori için demo paketler oluştur
      let pkgSort = 1;
      for (const tpl of packageTemplates) {
        const packageId = `pkg-${child.id}-${tpl.suffix.toLowerCase()}`;
        const showOnHomepage = tpl.suffix === "Premium" || tpl.suffix === "VIP";
        await prisma.package.upsert({
          where: { id: packageId },
          update: {
            name: `${child.name} ${tpl.suffix}`,
            quantity: tpl.quantity,
            price: tpl.price,
            retailPrice: tpl.retailPrice,
            showOnHomepage,
            status: true,
            sortOrder: pkgSort,
          },
          create: {
            id: packageId,
            name: `${child.name} ${tpl.suffix}`,
            description: tpl.desc,
            quantity: tpl.quantity,
            price: tpl.price,
            retailPrice: tpl.retailPrice,
            resellerPrice: tpl.price * 0.8,
            showOnHomepage,
            sortOrder: pkgSort,
            status: true,
            categoryId: child.id,
            serviceId: serviceId,
          },
        });
        pkgSort += 1;
      }

      childSort += 1;
    }

    rootSort += 1;
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeding is disabled in production. Use pnpm admin:reset to create an administrator.");
  }
  const hashedPassword = await bcrypt.hash("Admin123!", 10);
  const userPassword = await bcrypt.hash("User123!", 10);
  const resellerPassword = await bcrypt.hash("Bayi123!", 10);

  // Admin Hesabı
  await prisma.user.upsert({
    where: { email: "admin@smmpanel.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@smmpanel.com",
      name: "SMM Admin",
      username: "admin",
      password: hashedPassword,
      role: Role.ADMIN,
      balance: 1000.00,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { password: hashedPassword },
    create: {
      email: "admin@example.com",
      name: "Admin Example",
      username: "adminexample",
      password: hashedPassword,
      role: Role.ADMIN,
      balance: 1000.0,
    },
  });

  // Standart Kullanıcı
  await prisma.user.upsert({
    where: { email: "user@smmpanel.com" },
    update: { password: userPassword },
    create: {
      email: "user@smmpanel.com",
      name: "Test Kullanıcı",
      username: "testuser",
      password: userPassword,
      role: Role.USER,
      balance: 1000.00,
    },
  });

  // Bayi (Reseller) Hesabı
  const reseller = await prisma.user.upsert({
    where: { email: "bayi@smmpanel.com" },
    update: { password: resellerPassword },
    create: {
      email: "bayi@smmpanel.com",
      name: "SMM Bayi",
      username: "bayi",
      password: resellerPassword,
      role: Role.RESELLER,
      balance: 1000.00,
    },
  });

  await prisma.user.update({
    where: { email: "user@smmpanel.com" },
    data: {
      parentId: reseller.id,
    },
  });

  await seedSocialCategories();

  await prisma.setting.upsert({
    where: { key: "provider_sync_interval_ms" },
    update: { value: "60000" },
    create: { key: "provider_sync_interval_ms", value: "60000" },
  });

  await prisma.setting.upsert({
    where: { key: "provider_sync_batch_limit" },
    update: { value: "25" },
    create: { key: "provider_sync_batch_limit", value: "25" },
  });

  console.log("Demo hesaplar başarıyla oluşturuldu.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
