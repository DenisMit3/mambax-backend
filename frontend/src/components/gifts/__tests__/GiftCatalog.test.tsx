import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { GiftCatalog } from "../GiftCatalog";
import { authService } from "@/services/api";

// Mock api
jest.mock("@/services/api", () => ({
    authService: {
        getGiftsCatalog: jest.fn(),
    },
}));

const mockGifts = {
    categories: [
        { id: "1", name: "Cat1", icon: "🐱", sort_order: 1 },
        { id: "2", name: "Cat2", icon: "🐶", sort_order: 2 },
    ],
    gifts: [
        { id: "g1", name: "Gift1", price: 10, currency: "XTR", category_id: "1", image_url: "/img1.png" },
        { id: "g2", name: "Gift2", price: 20, currency: "XTR", category_id: "2", image_url: "/img2.png" },
    ],
};

describe("GiftCatalog", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.getGiftsCatalog as jest.Mock).mockResolvedValue(mockGifts);
    });

    it("renders loading state initially", () => {
        render(<GiftCatalog />);
        expect(screen.getByText("Loading gifts...")).toBeInTheDocument();
    });

    it("renders categories and gifts after loading", async () => {
        render(<GiftCatalog />);

        await waitFor(() => {
            expect(screen.getByText("Cat1")).toBeInTheDocument();
            expect(screen.getByText("Gift1")).toBeInTheDocument();
        });
    });

    it("filters gifts by category", async () => {
        render(<GiftCatalog />);
        await waitFor(() => screen.getByText("Cat1")); // Wait load

        fireEvent.click(screen.getByText("Cat2"));

        expect(screen.queryByText("Gift1")).not.toBeInTheDocument();
        expect(screen.getByText("Gift2")).toBeInTheDocument();
    });

    it("filters gifts by search", async () => {
        render(<GiftCatalog />);
        await waitFor(() => screen.getByText("Gift1"));

        const searchInput = screen.getByPlaceholderText("Search gifts...");
        fireEvent.change(searchInput, { target: { value: "Gift2" } });

        expect(screen.queryByText("Gift1")).not.toBeInTheDocument();
        expect(screen.getByText("Gift2")).toBeInTheDocument();
    });
});
