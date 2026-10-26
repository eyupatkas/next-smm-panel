/**
 * Kamuya açık rotalar. Giriş yapmadan erişilebilir.
 * @type {string[]}
 */
export const publicRoutes = [
  "/",
  "/services",
  "/blog",
  "/api-docs",
  "/forgot-password",
  "/error",
  "/contact",
];

export const publicRoutePrefixes = [
  "/blog/",
  "/tools/",
  "/legal/",
];

/**
 * Kimlik doğrulama rotaları. Giriş yapmış kullanıcılar yönlendirilir.
 * @type {string[]}
 */
export const authRoutes = [
  "/login",
  "/signup",
  "/error",
];

/**
 * API kimlik doğrulama rotası prefix'i.
 * @type {string}
 */
export const apiAuthPrefix = "/api/auth";

/**
 * Admin rotası prefix'i.
 * @type {string}
 */
export const adminRoutes = "/admin";

/**
 * Başarılı giriş sonrası yönlendirilecek rota.
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = "/dashboard";
