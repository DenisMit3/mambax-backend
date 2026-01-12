import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SendGiftModal } from "../SendGiftModal";
import { authService } from "@/services/api";

jest.mock("@/services/api", () => ({
    authService: {
        getGiftsCatalog: jest.fn(),
        sendGift: jest.fn(),
        sendGiftDirectPurchase: jest.fn(),
    },
}));

jest.mock("@/services/websocket", () => ({
    wsService: {
        on: jest.fn(),
        off: jest.fn(),
    }
}));

const mockData = {
    categories: [],
    gifts: [
        { id: "g1", name: "Gift1", price: 10, currency: "XTR", image_url: "/img.png" },
    ],
};

describe("SendGiftModal", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.getGiftsCatalog as jest.Mock).mockResolvedValue(mockData);
    });

    it("does not render when closed", () => {
        render(<SendGiftModal isOpen={false} onClose={jest.fn()} receiverId="u1" />);
        expect(screen.queryByText("Send a Gift")).not.toBeInTheDocument();
    });

    it("renders and selects gift", async () => {
        render(<SendGiftModal isOpen={true} onClose={jest.fn()} receiverId="u1" />);

        await waitFor(() => screen.getByText("Gift1"));

        fireEvent.click(screen.getByText("Gift1"));

        expect(screen.getByText("Confirm Gift")).toBeInTheDocument();
    });

    it("sends gift successfully", async () => {
        (authService.sendGift as jest.Mock).mockResolvedValue({ success: true });

        render(<SendGiftModal isOpen={true} onClose={jest.fn()} receiverId="u1" />);

        // Select gift
        await waitFor(() => screen.getByText("Gift1"));
        fireEvent.click(screen.getByText("Gift1"));

        // Send
        const sendBtn = screen.getByText(/Send Gift/i);
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(authService.sendGift).toHaveBeenCalledWith("g1", "u1", undefined, false);
            expect(screen.getByText("Gift Sent Successfully!")).toBeInTheDocument();
        });
    });
});
