import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = z.union([z.literal(''), z.url().max(500)]);

export const productInputSchema = z.object({
  name: text(120).min(2, 'El nombre debe tener al menos 2 caracteres.'),
  description: text(2000).default(''),
  details: z
    .array(text(80))
    .max(12)
    .default([])
    .transform((list) => [...new Set(list.filter((d) => d.length > 0))]),
  imageUrl: text(500).min(1, 'La imagen es obligatoria.'),
  imageAlt: text(300).default(''),
  price: z.number().min(0).max(100000).nullable().default(null),
  sizeInfo: text(200)
    .nullable()
    .default(null)
    .transform((v) => (v ? v : null)),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  categoryId: z.number({ error: 'Elige una categoría.' }).int().positive('Elige una categoría.'),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: text(60).min(1, 'Escribe un nombre.'),
  description: text(300).default(''),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const siteSettingsSchema = z.object({
  name: text(80).min(1),
  tagline: text(160).default(''),
  whatsappNumber: z.string().trim().regex(/^\d{8,15}$/, 'Solo dígitos, con código de país (ej. 51947191624).'),
  whatsappDisplay: text(30).min(1),
  defaultMessage: text(300).default(''),
  facebookUrl: optionalUrl.default(''),
  instagramHandle: text(60).default(''),
  instagramUrl: optionalUrl.default(''),
  location: text(120).default(''),
  address: text(200).default(''),
  logoUrl: text(500).min(1),
  heroImageUrl: text(500).min(1),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});
