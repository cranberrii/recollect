'use client';

import { useState } from 'react';
import { SearchBar } from './search-bar';
import { AddBookmarkForm } from './add-bookmark-form';
import { DeleteBookmarkButton } from './delete-bookmark-button';
import { ExternalLink, Calendar, Sparkles } from 'lucide-react';

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

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function BookmarkSection({ initialBookmarks }: BookmarkSectionProps) {
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const displayBookmarks = searchResults !== null ? searchResults : initialBookmarks;
  const showingSearchResults = searchResults !== null;

  return (
    <>
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-surface-900 dark:text-surface-100 tracking-tight">
              {showingSearchResults ? 'Search Results' : 'Your Bookmarks'}
            </h2>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              {showingSearchResults
                ? `${searchResults.length} results found`
                : `${initialBookmarks.length} bookmarks in your collection`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <SearchBar onResults={setSearchResults} onSearching={setIsSearching} />
          <AddBookmarkForm />
        </div>
      </div>

      {/* Bookmarks Grid */}
      {displayBookmarks.length > 0 ? (
        <div className="grid gap-4">
          {displayBookmarks.map((bookmark, index) => {
            const isSearchResult = 'rrf_score' in bookmark;
            const searchResult = isSearchResult ? (bookmark as SearchResult) : null;
            const regularBookmark = !isSearchResult ? (bookmark as Bookmark) : null;

            return (
              <article
                key={bookmark.id}
                className="group relative bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-5 hover-lift opacity-0 animate-slide-up transition-colors duration-300"
                style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'forwards' }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-50/0 to-sage-50/0 group-hover:from-accent-50/30 group-hover:to-sage-50/20 dark:group-hover:from-accent-900/20 dark:group-hover:to-sage-900/10 transition-all duration-300 pointer-events-none" />

                <div className="relative">
                  {/* Top Row: Favicon + Title + Actions */}
                  <div className="flex items-start gap-4">
                    {/* Favicon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {bookmark.favicon_url ? (
                        <img
                          src={bookmark.favicon_url}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover ring-1 ring-surface-200 dark:ring-surface-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-800 dark:to-surface-700 flex items-center justify-center">
                          <span className="text-lg font-display font-semibold text-surface-400">
                            {(bookmark.title || getDomain(bookmark.url))[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Categories */}
                      {(regularBookmark?.bookmark_categories?.length || searchResult?.matched_categories?.length) ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(regularBookmark?.bookmark_categories || []).map((bc) => (
                            <span
                              key={bc.categories.name}
                              className="inline-flex items-center gap-1 text-xs font-medium bg-sage-50 dark:bg-sage-900/30 text-sage-700 dark:text-sage-400 border border-sage-200 dark:border-sage-800 px-2 py-0.5 rounded-full"
                            >
                              {bc.categories.name}
                            </span>
                          ))}
                          {(searchResult?.matched_categories || []).map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center gap-1 text-xs font-medium bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 border border-accent-200 dark:border-accent-800 px-2 py-0.5 rounded-full"
                            >
                              <Sparkles className="w-3 h-3" />
                              {cat}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Title */}
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/link inline-flex items-center gap-2 text-surface-900 dark:text-surface-100 hover:text-accent-700 dark:hover:text-accent-400 transition-colors"
                      >
                        <h3 className="font-display font-semibold text-lg leading-snug line-clamp-1">
                          {bookmark.title || getDomain(bookmark.url)}
                        </h3>
                        <ExternalLink className="w-4 h-4 opacity-0 -translate-x-1 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all duration-200" />
                      </a>

                      {/* Domain + Date */}
                      <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                        <span className="font-mono text-xs">{getDomain(bookmark.url)}</span>
                        <span className="w-1 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(bookmark.created_at)}
                        </span>
                        {searchResult && searchResult.rrf_score > 0 && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
                            <span className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                              {(searchResult.rrf_score * 100).toFixed(0)}% match
                            </span>
                          </>
                        )}
                      </div>

                      {/* Description */}
                      {bookmark.description && (
                        <p className="text-surface-600 dark:text-surface-400 text-sm mt-3 line-clamp-2 leading-relaxed">
                          {bookmark.description}
                        </p>
                      )}

                      {/* Tags */}
                      {regularBookmark?.tags && regularBookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {regularBookmark.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-2 py-0.5 rounded-md"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <DeleteBookmarkButton bookmarkId={bookmark.id} />
                    </div>
                  </div>

                  {/* Expandable Summary */}
                  {bookmark.summary && (
                    <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
                      <div className="overflow-hidden">
                        <div className="pt-4 mt-4 border-t border-surface-100 dark:border-surface-800">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-accent-500" />
                            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                              Summary
                            </span>
                          </div>
                          <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                            {bookmark.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 transition-colors duration-300">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-surface-400" />
          </div>
          {showingSearchResults ? (
            <>
              <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-100 mb-2">
                No results found
              </h3>
              <p className="text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                Try different keywords or adjust your search mode for better results.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display font-semibold text-lg text-surface-900 dark:text-surface-100 mb-2">
                Start building your collection
              </h3>
              <p className="text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
                Add your first bookmark above or install the browser extension to save pages instantly.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
