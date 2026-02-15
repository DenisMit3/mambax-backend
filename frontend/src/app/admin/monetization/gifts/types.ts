import { VirtualGift } from "@/services/admin";

export interface GiftFormData {
    name: string;
    description: string;
    image_url: string;
    animation_url: string;
    price: number;
    currency: string;
    is_animated: boolean;
    is_premium: boolean;
    is_limited: boolean;
    is_active: boolean;
    category_id: string;
    sort_order: number;
    available_until: string;
    max_quantity: number | null;
}

export const defaultGiftForm: GiftFormData = {
    name: "",
    description: "",
    image_url: "",
    animation_url: "",
    price: 10,
    currency: "XTR",
    is_animated: false,
    is_premium: false,
    is_limited: false,
    is_active: true,
    category_id: "",
    sort_order: 0,
    available_until: "",
    max_quantity: null
};
