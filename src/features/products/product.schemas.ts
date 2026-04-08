import { z } from "zod";

export const productFormSchema = z.object({
  sector: z.enum(["calcados", "roupas"]),
  name: z.string().min(3, "Informe um nome mais descritivo."),
  sku: z.string().min(5, "SKU precisa ter pelo menos 5 caracteres."),
  internalCode: z.string().min(3, "Codigo interno obrigatorio."),
  barcode: z.string().min(8, "Codigo de barras invalido."),
  brandId: z.string().min(1, "Selecione a marca."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  subcategory: z.string().min(2, "Preencha a subcategoria."),
  gender: z.string().min(1, "Selecione o genero."),
  material: z.string().min(2, "Informe o material."),
  color: z.string().min(2, "Informe a cor."),
  costPrice: z.number().positive("Preco de custo deve ser maior que zero."),
  salePrice: z.number().positive("Preco de venda deve ser maior que zero."),
  promotionalPrice: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]),
  imageHint: z.string().min(3, "Informe uma referencia visual."),
  sizes: z
    .array(
      z.object({
        size: z.string().min(2),
        stock: z.number().min(0)
      })
    )
    .min(1, "Cadastre ao menos uma numeracao.")
});

export type ProductFormSchema = z.infer<typeof productFormSchema>;
