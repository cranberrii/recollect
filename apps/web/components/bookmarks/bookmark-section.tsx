'use client';

import { useState } from 'react';
import { SearchBar } from './search-bar';
import { AddBookmarkForm } from './add-bookmark-form';
import { DeleteBookmarkButton } from './delete-bookmark-button';

interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  favicon_url: string | null;
  created_at: string;
  tags?: string[];
  bookmark_categories?: Array<{ categories: { name: string } }>;
}

interface SearchResult {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  summary: string | null;
  favicon_url: string | null;
  created_at: string | null;
  semantic_score: number;
  category_score: number;
  rrf_score: number;
  matched_categories: string[];
}

interface BookmarkSectionProps {
  initialBookmarks: Bookmark[];
}

export function BookmarkSection({ initialBookmarks }: BookmarkSectionProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const displayBookmarks = searchResults !== null ? searchResults : initialBookmarks;
  const showingSearchResults = searchResults !== null;

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Your Bookmarks</h2>
        <p className="text-gray-600 mb-4">
          {showingSearchResults
            ? `${searchResults.length} results found`
            : `${initialBookmarks.length} bookmarks saved`}
        </p>
        <div className="space-y-3">
          <SearchBar onResults={setSearchResults} onSearching={setIsSearching} />
          <AddBookmarkForm />
        </div>
      </div>

      {displayBookmarks.length > 0 ? (
        <div className="grid gap-4">
          {displayBookmarks.map((bookmark) => {
            const isSearchResult = 'rrf_score' in bookmark;
            const searchResult = isSearchResult ? (bookmark as SearchResult) : null;
            const regularBookmark = !isSearchResult ? (bookmark as Bookmark) : null;

            return (
              <div
                key={bookmark.id}
                className="group relative bg-white p-4 rounded-lg border hover:shadow-md transition-all duration-300"
              >
                {/* Search result scores */}
                {searchResult && searchResult.rrf_score > 0 && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 text-xs text-gray-400">
                    <span title="Combined score">
                      Score: {searchResult.rrf_score.toFixed(3)}
                    </span>
                  </div>
                )}

                {/* Categories for regular bookmarks */}
                {regularBookmark?.bookmark_categories && regularBookmark.bookmark_categories.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {regularBookmark.bookmark_categories.map((bc) => (
                      <span
                        key={bc.categories.name}
                        className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full"
                      >
                        #{bc.categories.name.toLowerCase().replace(/\s+/g, '-')}
                      </span>
                    ))}
                  </div>
                )}

                {/* Matched categories for search results */}
                {searchResult?.matched_categories && searchResult.matched_categories.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {searchResult.matched_categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full"
                      >
                        #{cat.toLowerCase().replace(/\s+/g, '-')}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pr-32">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {bookmark.title || bookmark.url}
                  </a>
                </div>
                <p className="text-gray-500 text-xs italic mt-1 truncate">
                  {bookmark.url}
                </p>
                {bookmark.description && (
                  <p className="text-gray-600 text-sm mt-1">
                    {bookmark.description}
                  </p>
                )}
                {regularBookmark?.tags && regularBookmark.tags.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {regularBookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <DeleteBookmarkButton bookmarkId={bookmark.id} />
                </div>
                {bookmark.summary && (
                  <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                    <div className="overflow-hidden">
                      <div className="pt-3 mt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                          Summary
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {bookmark.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border">
          {showingSearchResults ? (
            <>
              <p className="text-gray-600">No bookmarks match your search.</p>
              <p className="text-sm text-gray-500 mt-2">
                Try different keywords or search mode.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600">No bookmarks yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Install the browser extension to start saving bookmarks.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
