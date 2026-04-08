import { create } from "zustand";
import type { CartItem, PaymentMethod } from "@/types/domain";

interface PdvState {
  customerId?: string;
  discount: number;
  paymentMethods: PaymentMethod[];
  cart: CartItem[];
  setCustomerId: (customerId?: string) => void;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  togglePaymentMethod: (method: PaymentMethod) => void;
  clearCart: () => void;
}

export const usePdvStore = create<PdvState>((set) => ({
  customerId: undefined,
  discount: 0,
  paymentMethods: ["Pix"],
  cart: [],
  setCustomerId: (customerId) => set({ customerId }),
  addItem: (item) =>
    set((state) => {
      const existing = state.cart.find(
        (cartItem) => cartItem.productId === item.productId && cartItem.size === item.size
      );

      if (existing) {
        return {
          cart: state.cart.map((cartItem) =>
            cartItem.productId === item.productId && cartItem.size === item.size
              ? { ...cartItem, quantity: cartItem.quantity + (item.quantity ?? 1) }
              : cartItem
          )
        };
      }

      return {
        cart: [
          ...state.cart,
          {
            ...item,
            quantity: item.quantity ?? 1
          }
        ]
      };
    }),
  removeItem: (productId, size) =>
    set((state) => ({
      cart: state.cart.filter((item) => !(item.productId === productId && item.size === size))
    })),
  updateQuantity: (productId, size, quantity) =>
    set((state) => ({
      cart: state.cart
        .map((item) =>
          item.productId === productId && item.size === size
            ? { ...item, quantity: Math.max(quantity, 1) }
            : item
        )
        .filter((item) => item.quantity > 0)
    })),
  setDiscount: (discount) => set({ discount: Math.max(discount, 0) }),
  togglePaymentMethod: (method) =>
    set((state) => {
      const exists = state.paymentMethods.includes(method);
      if (exists) {
        return {
          paymentMethods: state.paymentMethods.length === 1
            ? state.paymentMethods
            : state.paymentMethods.filter((entry) => entry !== method)
        };
      }

      return {
        paymentMethods: [...state.paymentMethods, method]
      };
    }),
  clearCart: () => set({ cart: [], discount: 0, customerId: undefined, paymentMethods: ["Pix"] })
}));
