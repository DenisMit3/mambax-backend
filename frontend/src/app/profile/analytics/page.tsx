'use client';

import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';

const MOCK_ANALYTICS_DATA = {
    profileViews: {
        total: 1245,
        change: 12.5,
        chartData: [
            { date: 'Mon', views: 45 },
            { date: 'Tue', views: 52 },
            { date: 'Wed', views: 38 },
            { date: 'Thu', views: 65 },
            { date: 'Fri', views: 42 },
            { date: 'Sat', views: 89 },
            { date: 'Sun', views: 74 }
        ]
    },
    likes: {
        received: 342,
        sent: 156,
        matches: 48,
        changeReceived: 8.4,
        changeSent: 5.2,
        changeMatches: 12.1
    },
    superLikes: {
        received: 12,
        sent: 5,
        changeReceived: 33.3,
        changeSent: 0
    },
    messages: {
        sent: 450,
        received: 423,
        responseRate: 94,
        changeSent: 15.3,
        changeReceived: 14.2,
        changeResponseRate: 2.1
    },
    peakActivity: {
        day: 'Saturday',
        hour: '21:00',
        engagement: 85
    },
    demographics: {
        ageGroups: [
            { range: '18-24', percentage: 45 },
            { range: '25-34', percentage: 35 },
            { range: '35+', percentage: 20 }
        ],
        locations: [
            { city: 'Moscow', percentage: 60 },
            { city: 'St. Petersburg', percentage: 25 },
            { city: 'Other', percentage: 15 }
        ]
    }
};

export default function AnalyticsPage() {
    return (
        <main>
            <AdvancedAnalyticsDashboard
                data={MOCK_ANALYTICS_DATA}
                isPremium={true}
                onUpgradeToPremium={() => console.log('Upgrade clicked')}
            />
        </main>
    );
}
