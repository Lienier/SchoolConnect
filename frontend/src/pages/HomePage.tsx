import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { APP_NAME } from "@/constants";
import { HeroAlertBanner, AlertAnnouncement } from "@/features/announcements/components/HeroAlertBanner";
import { SocialFeedCard, FeedItem } from "@/features/announcements/components/SocialFeedCard";

const MOCK_ALERTS: AlertAnnouncement[] = [
  {
    id: "a1",
    title: "Campus Closure - Extreme Weather",
    body: "Due to incoming typhoon, all classes are suspended tomorrow. Stay safe.",
    priority: "urgent",
    is_pinned: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "a2",
    title: "Midterm Examination Schedule Released",
    body: "Please check your respective department portals for the detailed schedule.",
    priority: "important",
    is_pinned: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  }
];

const MOCK_FEED_ITEMS: FeedItem[] = [
  {
    id: "f1",
    type: "event",
    title: "Annual Tech Symposium 2026",
    body: "Join us for the biggest technology event of the year! Featuring guest speakers from top tech companies, workshops on AI and web development, and networking opportunities.",
    author_id: "u1",
    author_name: "Dr. Alan Turing",
    author_role: "teacher",
    department: "Computer Science",
    created_at: new Date(Date.now() - 7200000).toISOString(),
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    location: "Main Auditorium",
    capacity: 200,
    registered_count: 145,
    registration_deadline: new Date(Date.now() + 86400000 * 4).toISOString(),
    tags: ["tech", "symposium", "networking"],
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "f2",
    type: "announcement",
    title: "Library Renovation Update",
    body: "The 2nd floor of the main library will be closed for renovation starting next week. Please use the study areas on the 1st and 3rd floors.",
    author_id: "u2",
    author_name: "Admin Staff",
    author_role: "admin",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    tags: ["facilities", "library"],
  },
  {
    id: "f3",
    type: "event",
    title: "Student Council Election Debates",
    body: "Hear from your candidates for the upcoming student council elections. Ask questions and get to know their platforms.",
    author_id: "u3",
    author_name: "Jane Doe",
    author_role: "student_council",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    location: "Student Union Hall",
    capacity: 500,
    registered_count: 320,
    tags: ["elections", "student-life"],
  }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("All Updates");
  const [searchQuery, setSearchQuery] = useState("");
  
  const tabs = ["All Updates", "Announcements", "Events", "My Department"];

  const filteredItems = MOCK_FEED_ITEMS.filter(item => {
    if (activeTab === "Announcements" && item.type !== "announcement") return false;
    if (activeTab === "Events" && item.type !== "event") return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.body.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Top Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{APP_NAME}</span>
          </div>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6">
        {/* Hero Alert Banner */}
        <HeroAlertBanner announcements={MOCK_ALERTS} />

        {/* Filters and Search */}
        <div className="mt-8 mb-6 sticky top-20 z-40 bg-gray-50 pt-2 pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Tabs */}
            <div className="flex overflow-x-auto w-full md:w-auto hide-scrollbar gap-2 pb-2 md:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-6">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
              <SocialFeedCard key={item.id} item={item} />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              No updates found matching your criteria.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
