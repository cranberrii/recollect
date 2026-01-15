import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TabInfo {
  url: string;
  title: string;
}

export function Popup() {
  const [tab, setTab] = useState<TabInfo | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get current tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setTab({
          url: tabs[0].url || '',
          title: tabs[0].title || '',
        });
      }
    });

    // Check auth status
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const saveBookmark = async () => {
    if (!tab) return;

    setSaving(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in first');
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          url: tab.url,
          title: tab.title,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save bookmark');
      }

      setSaved(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openDashboard = () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-bold mb-4">Bookmark Orchestrator</h1>
        <p className="text-gray-600 mb-4">Please sign in to save bookmarks.</p>
        <button
          onClick={openDashboard}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Open Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-bold mb-4">Bookmark Orchestrator</h1>

      {tab && (
        <div className="mb-4">
          <p className="font-medium truncate">{tab.title}</p>
          <p className="text-sm text-gray-500 truncate">{tab.url}</p>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

      {saved ? (
        <div className="text-center py-4">
          <p className="text-green-600 font-medium">Bookmark saved!</p>
          <button
            onClick={openDashboard}
            className="mt-2 text-blue-600 hover:underline text-sm"
          >
            View in Dashboard
          </button>
        </div>
      ) : (
        <button
          onClick={saveBookmark}
          disabled={saving || !tab}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Bookmark'}
        </button>
      )}

      <button
        onClick={openDashboard}
        className="w-full mt-2 text-gray-600 py-2 hover:text-gray-900 text-sm"
      >
        Open Dashboard
      </button>
    </div>
  );
}
