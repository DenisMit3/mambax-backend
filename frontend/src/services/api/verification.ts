import { httpClient } from "@/lib/http-client";

export interface VerificationStatus {
    status: "none" | "pending" | "approved" | "rejected";
    rejection_reason: string | null;
    submitted_at: string | null;
}

export const verificationApi = {
    getStatus: (): Promise<VerificationStatus> =>
        httpClient.get("/users/me/verification-status"),

    uploadPhoto: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return httpClient.post("/users/me/verification-photo", formData);
    },
};
