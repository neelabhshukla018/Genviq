import { useState } from 'react';
import {
  Hash,
  Sparkles,
  Crown,
  Copy,
  CheckCircle,
} from 'lucide-react';

import axios from 'axios';
import {
  Protect,
  useAuth,
} from '@clerk/clerk-react';

import toast from 'react-hot-toast';
import Markdown from 'react-markdown';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const BlogTitles = () => {
  const blogCategories = [
    'General',
    'Technology',
    'Business',
    'Health',
    'Lifestyle',
    'Education',
    'Travel',
    'Food',
  ];

  const [selectedCategory, setSelectedCategory] =
    useState('General');

  const [input, setInput] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { getToken } = useAuth();

  // ==========================================
  // GENERATE BLOG TITLES
  // ==========================================

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!input.trim()) {
      toast.error('Please enter a keyword or blog topic.');
      return;
    }

    try {
      setLoading(true);
      setContent('');

      const prompt = `
Generate creative, engaging, and SEO-friendly blog titles.

Keyword/Topic: ${input.trim()}
Category: ${selectedCategory}

Generate multiple high-quality blog title ideas.
Keep the titles clear, compelling, and relevant to the topic.
`;

      const token = await getToken();

      const { data } = await axios.post(
        '/api/ai/generate-blog-title',
        {
          prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setContent(data.content);

        toast.success('Blog titles generated successfully!');
      } else {
        toast.error(
          data.message || 'Failed to generate blog titles.'
        );
      }
    } catch (error) {
      console.error(
        '❌ Blog title generation error:',
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to generate blog titles.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COPY GENERATED TITLES
  // ==========================================

  const copyToClipboard = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      toast.success(
        'Blog titles copied to clipboard!'
      );

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error(
        '❌ Clipboard error:',
        error
      );

      toast.error(
        'Failed to copy titles.'
      );
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-6 bg-gradient-to-br from-gray-900 to-black">

      <div className="max-w-7xl mx-auto">

        {/* ======================================
            HEADER
        ====================================== */}

        <div className="text-center mb-6">

          {/* DYNAMIC CLERK PLAN BADGE */}

          <Protect
            plan="pro_user"
            fallback={
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-500/20 bg-gray-500/10 text-xs mb-3">

                <Sparkles className="w-3 h-3 text-gray-400" />

                <span className="text-gray-300 font-medium">
                  FREE
                </span>

              </div>
            }
          >

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-xs mb-3">

              <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />

              <span className="text-yellow-400 font-medium">
                GENVIQ PRO
              </span>

            </div>

          </Protect>

          <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">

            AI Blog Title Generator

          </h1>

          <p className="text-sm text-gray-400">

            Create compelling blog titles with AI

          </p>

        </div>

        {/* ======================================
            MAIN GRID
        ====================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* ====================================
              LEFT PANEL
          ==================================== */}

          <div className="space-y-4">

            {/* KEYWORD INPUT */}

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-yellow-500/20 p-4">

              <div className="flex items-center gap-3 mb-4">

                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">

                  <Sparkles className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">
                    Keyword
                  </h2>

                  <p className="text-xs text-gray-400">
                    Enter your blog topic
                  </p>

                </div>

              </div>

              <input
                onChange={(e) =>
                  setInput(e.target.value)
                }
                value={input}
                type="text"
                className="w-full p-3 text-sm bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/20 outline-none transition-all"
                placeholder="Example: Future of backend development"
                required
              />

            </div>

            {/* ==================================
                CATEGORY SELECTION
            ================================== */}

            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-yellow-500/20 p-4">

              <div className="flex items-center gap-3 mb-4">

                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">

                  <Hash className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">
                    Category
                  </h2>

                  <p className="text-xs text-gray-400">
                    Choose blog category
                  </p>

                </div>

              </div>

              <div className="flex gap-2 flex-wrap">

                {blogCategories.map((item) => (

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategory(item)
                    }
                    className={`text-xs px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      selectedCategory === item
                        ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-300'
                        : 'bg-gray-700/30 border-gray-600 text-gray-400 hover:border-yellow-500/30 hover:text-yellow-200'
                    }`}
                    key={item}
                  >

                    {item}

                  </button>

                ))}

              </div>

            </div>

            {/* ==================================
                GENERATE BUTTON
            ================================== */}

            <button
              type="button"
              onClick={onSubmitHandler}
              disabled={
                loading ||
                !input.trim()
              }
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >

              {loading ? (
                <>

                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-black animate-spin" />

                  Generating...

                </>
              ) : (
                <>

                  <Hash className="w-4 h-4" />

                  Generate Titles

                </>
              )}

            </button>

          </div>

          {/* ====================================
              RIGHT PANEL
          ==================================== */}

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-yellow-500/20 p-4">

            {/* RESULT HEADER */}

            <div className="flex items-center justify-between mb-4">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">

                  <Hash className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">
                    Generated Titles
                  </h2>

                  <p className="text-xs text-gray-400">
                    AI-powered blog titles
                  </p>

                </div>

              </div>

              {/* COPY BUTTON */}

              {content && !loading && (

                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-all text-xs"
                >

                  {copied ? (

                    <CheckCircle className="w-3 h-3 text-green-400" />

                  ) : (

                    <Copy className="w-3 h-3" />

                  )}

                  {copied
                    ? 'Copied!'
                    : 'Copy'}

                </button>

              )}

            </div>

            {/* ==================================
                LOADING STATE
            ================================== */}

            {loading ? (

              <div className="flex flex-col items-center justify-center py-12">

                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-4">

                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent border-black animate-spin" />

                </div>

                <h3 className="text-lg font-semibold text-white mb-2">

                  Creating Your Titles

                </h3>

                <p className="text-sm text-gray-400 mb-4 text-center">

                  Genviq AI is generating your blog
                  titles. Please wait...

                </p>

                <div className="w-48 bg-gray-700 rounded-full h-1.5 mb-3">

                  <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-1.5 rounded-full animate-pulse w-2/3" />

                </div>

                <div className="flex gap-4 text-xs text-gray-400">

                  <div className="text-center">

                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce mx-auto mb-1" />

                    <span>
                      Analyzing
                    </span>

                  </div>

                  <div className="text-center">

                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce mx-auto mb-1" />

                    <span>
                      Generating
                    </span>

                  </div>

                  <div className="text-center">

                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce mx-auto mb-1" />

                    <span>
                      Finalizing
                    </span>

                  </div>

                </div>

              </div>

            ) : !content ? (

              /* ================================
                 EMPTY STATE
              ================================= */

              <div className="flex flex-col items-center justify-center py-12">

                <div className="w-16 h-16 rounded-lg border border-gray-600 flex items-center justify-center mb-4">

                  <Hash className="w-8 h-8 text-gray-500" />

                </div>

                <h3 className="text-sm font-semibold text-white mb-2">

                  No Titles Generated

                </h3>

                <p className="text-xs text-gray-400 text-center max-w-xs">

                  Enter a keyword, select a category,
                  and generate your blog titles.

                </p>

              </div>

            ) : (

              /* ================================
                 GENERATED CONTENT
              ================================= */

              <div className="max-h-[500px] overflow-y-auto">

                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">

                  <div className="text-white">

                    <Markdown
                      components={{
                        h1: ({
                          node,
                          ...props
                        }) => (
                          <h1
                            className="text-white text-xl font-bold mb-4"
                            {...props}
                          />
                        ),

                        h2: ({
                          node,
                          ...props
                        }) => (
                          <h2
                            className="text-white text-lg font-bold mb-3"
                            {...props}
                          />
                        ),

                        h3: ({
                          node,
                          ...props
                        }) => (
                          <h3
                            className="text-white text-base font-bold mb-2"
                            {...props}
                          />
                        ),

                        p: ({
                          node,
                          ...props
                        }) => (
                          <p
                            className="text-white mb-3 leading-relaxed"
                            {...props}
                          />
                        ),

                        li: ({
                          node,
                          ...props
                        }) => (
                          <li
                            className="text-white mb-2"
                            {...props}
                          />
                        ),

                        strong: ({
                          node,
                          ...props
                        }) => (
                          <strong
                            className="text-yellow-300 font-bold"
                            {...props}
                          />
                        ),

                        em: ({
                          node,
                          ...props
                        }) => (
                          <em
                            className="text-amber-300 italic"
                            {...props}
                          />
                        ),

                        code: ({
                          node,
                          ...props
                        }) => (
                          <code
                            className="bg-gray-600 text-yellow-300 px-1 py-0.5 rounded text-sm"
                            {...props}
                          />
                        ),

                        pre: ({
                          node,
                          ...props
                        }) => (
                          <pre
                            className="bg-gray-600 text-yellow-300 p-3 rounded-lg overflow-x-auto my-3"
                            {...props}
                          />
                        ),

                        blockquote: ({
                          node,
                          ...props
                        }) => (
                          <blockquote
                            className="border-l-4 border-gray-500 pl-4 text-gray-300 my-3"
                            {...props}
                          />
                        ),
                      }}
                    >

                      {content}

                    </Markdown>

                  </div>

                </div>

                {/* ==============================
                    STATS
                ============================== */}

                <div className="mt-3 grid grid-cols-3 gap-2">

                  {/* TITLES */}

                  <div className="text-center p-2 bg-gray-700/30 rounded border border-gray-600/30">

                    <div className="text-sm font-bold text-yellow-400">

                      {
                        content
                          .split('\n')
                          .filter(
                            (line) =>
                              line.trim()
                          ).length
                      }

                    </div>

                    <div className="text-xs text-gray-400">
                      Titles
                    </div>

                  </div>

                  {/* WORDS */}

                  <div className="text-center p-2 bg-gray-700/30 rounded border border-gray-600/30">

                    <div className="text-sm font-bold text-yellow-400">

                      {
                        content
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .length
                      }

                    </div>

                    <div className="text-xs text-gray-400">
                      Words
                    </div>

                  </div>

                  {/* CATEGORY */}

                  <div className="text-center p-2 bg-gray-700/30 rounded border border-gray-600/30">

                    <div className="text-sm font-bold text-yellow-400">

                      {selectedCategory}

                    </div>

                    <div className="text-xs text-gray-400">
                      Category
                    </div>

                  </div>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default BlogTitles;