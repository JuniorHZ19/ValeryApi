import type { ContentItem, ProductWrite, SiteSettings } from './types';

// Initial content, loaded into an empty database. Only facts from the brand banner and the
// business's public pages: prices and sizes are left empty on purpose (admin fills them in).

export const SEED_SITE: SiteSettings = {
  name: "Creaciones Valery's",
  tagline: 'Amigurumis únicos y personalizados',
  whatsappNumber: '51947191624',
  whatsappDisplay: '947 191 624',
  defaultMessage: "¡Hola Creaciones Valery's! Quiero un amigurumi personalizado.",
  facebookUrl: 'https://www.facebook.com/valerystejido',
  instagramHandle: '@valerystejido',
  instagramUrl: 'https://www.instagram.com/valerystejido/',
  location: 'San Juan de Miraflores, Lima',
  address: 'Jr. Alejandro Tirado 290, San Juan de Miraflores, Perú 15803',
  logoUrl: '/images/logo.jpg',
  heroImageUrl: '/images/dolls-group.jpg',
};

/** Seed products are all amigurumis: they go into the "peluches" category created by the migrations. */
export type SeedProduct = Omit<ProductWrite, 'categoryId'>;

const product = (
  sortOrder: number,
  slug: string,
  name: string,
  imageUrl: string,
  imageAlt: string,
  description: string,
  details: string[],
): SeedProduct => ({
  slug,
  name,
  imageUrl,
  imageAlt,
  description,
  details,
  price: null,
  sizeInfo: null,
  isVisible: true,
  sortOrder,
});

export const SEED_PRODUCTS: SeedProduct[] = [
  product(
    1,
    'con-su-nombre',
    'Con su nombre',
    '/images/doll-1.jpg',
    'Amigurumi de una mujer con lentes dorados, polo rojo y gafete con su nombre',
    'Con su uniforme de trabajo, sus lentes dorados y un gafete con su nombre. Un detalle perfecto para una compañera o una maestra.',
    ['Lentes dorados', 'Gafete personalizado', 'Uniforme de trabajo'],
  ),
  product(
    2,
    'su-estilo-unico',
    'Su estilo único',
    '/images/doll-2.jpg',
    'Amigurumi de una mujer de cabello largo negro, lentes y conjunto azul marino',
    'Cabello largo tejido hebra por hebra, lentes y su conjunto favorito: cada detalle refleja su estilo.',
    ['Cabello largo', 'Lentes', 'Su ropa favorita'],
  ),
  product(
    3,
    'listo-para-el-trabajo',
    'Listo para el trabajo',
    '/images/doll-3.jpg',
    'Amigurumi de un hombre con casco blanco y polo rojo con el logo de su empresa',
    'Con su casco de seguridad y el polo de su empresa. Ideal para celebrar a alguien que ama lo que hace.',
    ['Casco de seguridad', 'Logo de la empresa', 'Uniforme'],
  ),
  product(
    4,
    'con-sus-pasiones',
    'Con sus pasiones',
    '/images/doll-4.jpg',
    'Amigurumi de un joven con polera gris sosteniendo una laptop con stickers',
    'Su polera favorita, zapatillas y una laptop llena de stickers: un amigurumi que cuenta lo que le apasiona.',
    ['Polera con estampado', 'Laptop con stickers', 'Zapatillas'],
  ),
  product(
    5,
    'grupo-personalizado',
    'Grupo personalizado',
    '/images/dolls-group.jpg',
    'Cuatro amigurumis personalizados juntos, cada uno con su propia ropa y accesorios',
    'Teje a todo tu equipo, tu familia o tu grupo de amigos: cada integrante con su peinado, su ropa y sus accesorios.',
    ['Varios personajes', 'Cada uno personalizado', 'Ideal para regalos de equipo'],
  ),
];

type SeedItem = Omit<ContentItem, 'id'>;
const item = (section: ContentItem['section'], sortOrder: number, icon: string, title: string, text = ''): SeedItem => ({
  section,
  sortOrder,
  icon,
  title,
  text,
});

export const SEED_CONTENT: SeedItem[] = [
  item('highlight', 1, 'hand', 'Hecho a mano', 'Cada amigurumi se teje punto por punto, con dedicación y mucho amor.'),
  item('highlight', 2, 'sparkle', '100% personalizado', 'Cabello, ropa, lentes, gorras y hasta el logo de su trabajo.'),
  item('highlight', 3, 'ruler', 'Elige el tamaño', 'Escoge el tamaño que más te guste para tu regalo.'),
  item('step', 1, 'chat', 'Escríbenos', 'Contáctanos por WhatsApp y cuéntanos para quién es tu regalo.'),
  item('step', 2, 'camera', 'Envía fotos', 'Mándanos fotos y detalles: peinado, ropa, accesorios, logos.'),
  item('step', 3, 'ruler', 'Elige el tamaño', 'Escoge el tamaño y confirmamos juntos todos los detalles.'),
  item('step', 4, 'gift', 'Recibe tu regalo', 'Tejemos tu amigurumi a mano y coordinamos la entrega contigo.'),
  item('occasion', 1, 'cake', 'Cumpleaños'),
  item('occasion', 2, 'heart', 'Aniversarios'),
  item('occasion', 3, 'cap', 'Graduaciones'),
  item('occasion', 4, 'briefcase', 'Compañeros de trabajo'),
  item('occasion', 5, 'gift', 'Día de la Madre y del Padre'),
  item('occasion', 6, 'tree', 'Navidad'),
];
