export interface AnalyticsData {
    profileViews: {
        total: number;
        change: number;
        chartData: { date: string; views: number }[];
    };
    likes: {
        received: number;
        sent: number;
        matches: number;
        changeReceived: number;
        changeSent: number;
        changeMatches: number;
    };
    superLikes: {
        received: number;
        sent: number;
        changeReceived: number;
        changeSent: number;
    };
    messages: {
        sent: number;
        received: number;
        responseRate: number;
        changeSent: number;
        changeReceived: number;
        changeResponseRate: number;
    };
    peakActivity: {
        day: string;
        hour: string;
        engagement: number;
    };
    demographics: {
        ageGroups: { range: string; percentage: number }[];
        locations: { city: string; percentage: number }[];
    };
}

export interface AdvancedAnalyticsDashboardProps {
    data: AnalyticsData;
    isPremium: boolean;
    onUpgradeToPremium: () => void;
}
