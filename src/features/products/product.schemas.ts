import { z } from "zod";

export const productFormSchema = z.object({
  sector: z.enum(["calcados", "roupas"]),
  name: z.string().min(3, "Informe um nome mais descritivo."),
  sku: z.string().min(5, "SKU precisa ter pelo menos 5 caracteres."),
  internalCode: z.string().min(3, "Código interno obrigatório."),
  barcode: z.string().min(8, "Código de barras inválido."),
  brandId: z.string().min(1, "Selecione a marca."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  subcategory: z.string().min(2, "Preencha a subcategoria."),
  gender: z.string().min(1, "Selecione o gênero."),
  material: z.string().min(2, "Informe o material."),
  color: z.string().min(2, "Informe a cor."),
  costPrice: z.number().positive("Preço de custo deve ser maior que zero."),
  salePrice: z.number().positive("Preço de venda deve ser maior que zero."),
  promotionalPrice: z.number().positive().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["active", "inactive"]),
  imageHint: z.string().min(3, "Informe uma referência visual."),
  imageDataUrl: z.string().startsWith("data:image", "Use uma imagem válida para a miniatura.").optional(),
  sizes: z
    .array(
      z.object({
        size: z.string().min(2, "Informe a numeração."),
        stock: z.number().min(0)
      })
    )
    .min(1, "Cadastre ao menos uma numeração.")
});

export type ProductFormSchema = z.infer<typeof productFormSchema>;
