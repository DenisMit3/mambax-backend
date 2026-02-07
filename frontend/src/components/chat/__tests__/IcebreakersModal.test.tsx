import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IcebreakersModal } from "../IcebreakersModal";
import { authService } from "@/services/api";

jest.mock("@/services/api", () => ({
    authService: {
        getIcebreakers: jest.fn(),
        recordIcebreakerUsed: jest.fn(),
    },
}));

jest.mock("@/hooks/useHaptic", () => ({
    useHaptic: () => ({
        medium: jest.fn(),
    }),
}));

jest.mock("@/hooks/useReducedMotion", () => ({
    useReducedMotion: () => false,
}));

const mockIcebreakers = ["Hi! How are you?", "What do you like to do for fun?", "Two truths and a lie?"];

describe("IcebreakersModal", () => {
    const onClose = jest.fn();
    const onSelectIcebreaker = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (authService.getIcebreakers as jest.Mock).mockResolvedValue({ icebreakers: mockIcebreakers });
        (authService.recordIcebreakerUsed as jest.Mock).mockResolvedValue({});
    });

    it("does not render when closed", () => {
        render(
            <IcebreakersModal
                isOpen={false}
                onClose={onClose}
                matchId="match-1"
                onSelectIcebreaker={onSelectIcebreaker}
            />
        );
        expect(screen.queryByText("Начни диалог")).not.toBeInTheDocument();
    });

    it("renders and fetches icebreakers when open", async () => {
        render(
            <IcebreakersModal
                isOpen={true}
                onClose={onClose}
                matchId="match-1"
                onSelectIcebreaker={onSelectIcebreaker}
            />
        );
        expect(authService.getIcebreakers).toHaveBeenCalledWith("match-1");
        await waitFor(() => {
            expect(screen.getByText("Начни диалог 💬")).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText(mockIcebreakers[0])).toBeInTheDocument();
        });
    });

    it("calls onSelectIcebreaker and onClose when an icebreaker is clicked", async () => {
        render(
            <IcebreakersModal
                isOpen={true}
                onClose={onClose}
                matchId="match-1"
                onSelectIcebreaker={onSelectIcebreaker}
            />
        );
        await waitFor(() => screen.getByText(mockIcebreakers[0]));
        fireEvent.click(screen.getByText(mockIcebreakers[0]));
        expect(authService.recordIcebreakerUsed).toHaveBeenCalledWith("match-1");
        expect(onSelectIcebreaker).toHaveBeenCalledWith(mockIcebreakers[0]);
        expect(onClose).toHaveBeenCalled();
    });

    it("shows refresh button when icebreakers are loaded", async () => {
        render(
            <IcebreakersModal
                isOpen={true}
                onClose={onClose}
                matchId="match-1"
                onSelectIcebreaker={onSelectIcebreaker}
            />
        );
        await waitFor(() => screen.getByText("Обновить"));
        expect(screen.getByText("Обновить")).toBeInTheDocument();
    });
});
