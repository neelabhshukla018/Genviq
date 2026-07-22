import React, { useState } from 'react';
import {
  Edit,
  Sparkles,
  Crown,
  Copy,
  Zap,
  Clock,
  FileText,
  Loader,
  CheckCircle,
} from 'lucide-react';

import axios from 'axios';
import { useAuth, Protect } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import Markdown from 'react-markdown';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const WriteArticle = () => {
  const articleLength = [
    {
      length: 800,
      text: 'Short',
      description: '500-800 words',
    },
    {
      length: 1200,
      text: 'Medium',
      description: '800-1200 words',
    },
    {
      length: 1600,
      text: 'Long',
      description: '1200+ words',
    },
  ];

  const [selectedLength, setSelectedLength] = useState(
    articleLength[0]
  );

  const [input, setInput] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { getToken } = useAuth();

  // ==========================================
  // GENERATE ARTICLE
  // ==========================================

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!input.trim()) {
      toast.error('Please enter an article topic.');
      return;
    }

    try {
      setLoading(true);
      setContent('');

      const prompt = `
Write a professional, engaging and well-structured article.

Topic:
${input.trim()}

Target length:
${selectedLength.description}

Requirements:
- Use a clear title
- Use meaningful headings and subheadings
- Write naturally and professionally
- Make the article informative
- Avoid unnecessary repetition
- Use readable paragraphs
- Use bullet points where appropriate
`;

      const token = await getToken();

      const { data } = await axios.post(
        '/api/ai/generate-article',

        {
          prompt,
          length: selectedLength.length,
        },

        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (data.success) {
        setContent(data.content);

        toast.success(
          'Article generated successfully!'
        );
      } else {
        toast.error(
          data.message ||
            'Failed to generate article.'
        );
      }
    } catch (error) {
      console.error(
        '❌ Article generation error:',
        error
      );

      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Failed to generate article.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // COPY ARTICLE
  // ==========================================

  const copyToClipboard = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      toast.success(
        'Article copied to clipboard!'
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
        'Failed to copy article.'
      );
    }
  };

  return (
    <div className="h-full overflow-y-scroll p-6 bg-gradient-to-br from-gray-900 to-black">

      <div className="max-w-7xl mx-auto">

        {/* =====================================
            HEADER
        ===================================== */}

        <div className="text-center mb-6">

          {/* ===================================
              DYNAMIC CLERK PLAN BADGE
          =================================== */}

          <Protect
            plan="pro_user"

            fallback={
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  px-4
                  py-2
                  rounded-full
                  border
                  border-gray-500/20
                  bg-gray-500/10
                  text-xs
                  mb-3
                "
              >

                <Sparkles className="w-3 h-3 text-gray-400" />

                <span className="text-gray-300 font-medium">
                  FREE
                </span>

              </div>
            }
          >

            <div
              className="
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                border-yellow-500/20
                bg-yellow-500/10
                text-xs
                mb-3
              "
            >

              <Crown
                className="
                  w-3
                  h-3
                  text-yellow-400
                  fill-yellow-400
                "
              />

              <span className="text-yellow-400 font-medium">

                GENVIQ PRO

              </span>

            </div>

          </Protect>

          <h1
            className="
              text-2xl
              font-bold
              mb-2
              bg-gradient-to-r
              from-white
              to-gray-300
              bg-clip-text
              text-transparent
            "
          >

            AI Article Writer

          </h1>

          <p className="text-sm text-gray-400">

            Create professional articles with AI

          </p>

        </div>

        {/* =====================================
            MAIN GRID
        ===================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* ===================================
              LEFT PANEL
          =================================== */}

          <div className="space-y-4">

            {/* ARTICLE TOPIC */}

            <div
              className="
                bg-gradient-to-br
                from-gray-800
                to-gray-900
                rounded-xl
                border
                border-yellow-500/20
                p-4
              "
            >

              <div className="flex items-center gap-3 mb-4">

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-yellow-400
                    to-amber-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Edit className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">

                    Article Topic

                  </h2>

                  <p className="text-xs text-gray-400">

                    What would you like to write about?

                  </p>

                </div>

              </div>

              <input
                onChange={(e) =>
                  setInput(e.target.value)
                }

                value={input}

                type="text"

                className="
                  w-full
                  p-3
                  text-sm
                  bg-gray-700/50
                  border
                  border-gray-600
                  rounded-lg
                  text-white
                  placeholder-gray-400
                  focus:border-yellow-500
                  focus:ring-1
                  focus:ring-yellow-500/20
                  outline-none
                  transition-all
                "

                placeholder="Example: The future of artificial intelligence"

                required
              />

            </div>

            {/* =================================
                ARTICLE LENGTH
            ================================= */}

            <div
              className="
                bg-gradient-to-br
                from-gray-800
                to-gray-900
                rounded-xl
                border
                border-yellow-500/20
                p-4
              "
            >

              <div className="flex items-center gap-3 mb-4">

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-amber-400
                    to-orange-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Clock className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">

                    Article Length

                  </h2>

                  <p className="text-xs text-gray-400">

                    Choose your preferred length

                  </p>

                </div>

              </div>

              <div className="space-y-2">

                {articleLength.map(
                  (item, index) => (

                    <button
                      type="button"

                      onClick={() =>
                        setSelectedLength(item)
                      }

                      className={`
                        w-full
                        text-left
                        p-3
                        rounded-lg
                        border
                        cursor-pointer
                        transition-all

                        ${
                          selectedLength.text ===
                          item.text

                            ? 'bg-yellow-500/10 border-yellow-500/50'

                            : 'bg-gray-700/30 border-gray-600 hover:border-yellow-500/30'
                        }
                      `}

                      key={index}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className={`
                            w-2
                            h-2
                            rounded-full

                            ${
                              selectedLength.text ===
                              item.text

                                ? 'bg-yellow-400'

                                : 'bg-gray-400'
                            }
                          `}
                        />

                        <div>

                          <h3
                            className={`
                              text-sm
                              font-medium

                              ${
                                selectedLength.text ===
                                item.text

                                  ? 'text-yellow-300'

                                  : 'text-white'
                              }
                            `}
                          >

                            {item.text}

                          </h3>

                          <p className="text-xs text-gray-400">

                            {item.description}

                          </p>

                        </div>

                      </div>

                    </button>

                  )
                )}

              </div>

            </div>

            {/* =================================
                GENERATE BUTTON
            ================================= */}

            <button
              type="button"

              onClick={onSubmitHandler}

              disabled={
                loading ||
                !input.trim()
              }

              className="
                w-full
                bg-gradient-to-r
                from-yellow-400
                to-amber-500
                hover:from-yellow-500
                hover:to-amber-600
                text-black
                font-semibold
                py-3
                px-4
                rounded-lg
                transition-all
                disabled:opacity-50
                disabled:cursor-not-allowed
                flex
                items-center
                justify-center
                gap-2
                text-sm
              "
            >

              {loading ? (
                <>

                  <Loader className="w-4 h-4 animate-spin" />

                  Generating...

                </>
              ) : (
                <>

                  <Zap className="w-4 h-4" />

                  Generate Article

                </>
              )}

            </button>

          </div>

          {/* ===================================
              RIGHT PANEL
          =================================== */}

          <div
            className="
              bg-gradient-to-br
              from-gray-800
              to-gray-900
              rounded-xl
              border
              border-yellow-500/20
              p-4
            "
          >

            {/* RESULT HEADER */}

            <div className="flex items-center justify-between mb-4">

              <div className="flex items-center gap-3">

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-green-400
                    to-emerald-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <FileText className="w-5 h-5 text-black" />

                </div>

                <div>

                  <h2 className="text-sm font-semibold text-white">

                    Generated Article

                  </h2>

                  <p className="text-xs text-gray-400">

                    AI-powered content

                  </p>

                </div>

              </div>

              {/* COPY */}

              {content && !loading && (

                <button
                  type="button"

                  onClick={copyToClipboard}

                  className="
                    flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    bg-yellow-500/10
                    border
                    border-yellow-500/30
                    text-yellow-400
                    rounded-lg
                    hover:bg-yellow-500/20
                    transition-all
                    text-xs
                  "
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

            {/* =================================
                LOADING
            ================================= */}

            {loading ? (

              <div className="flex flex-col items-center justify-center py-12">

                <div
                  className="
                    w-12
                    h-12
                    rounded-lg
                    bg-gradient-to-br
                    from-yellow-400
                    to-amber-500
                    flex
                    items-center
                    justify-center
                    mb-4
                  "
                >

                  <Loader className="w-6 h-6 text-black animate-spin" />

                </div>

                <h3 className="text-lg font-semibold text-white mb-2">

                  Creating Your Article

                </h3>

                <p className="text-sm text-gray-400 mb-4 text-center">

                  Genviq AI is writing your article.
                  Please wait...

                </p>

                <div className="w-48 bg-gray-700 rounded-full h-1.5 mb-3">

                  <div
                    className="
                      bg-gradient-to-r
                      from-yellow-400
                      to-amber-500
                      h-1.5
                      rounded-full
                      animate-pulse
                      w-2/3
                    "
                  />

                </div>

                <div className="flex gap-4 text-xs text-gray-400">

                  <div className="text-center">

                    <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce mx-auto mb-1" />

                    <span>
                      Researching
                    </span>

                  </div>

                  <div className="text-center">

                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce mx-auto mb-1" />

                    <span>
                      Writing
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

              /* ===============================
                 EMPTY STATE
              =============================== */

              <div className="flex flex-col items-center justify-center py-12">

                <div
                  className="
                    w-16
                    h-16
                    rounded-lg
                    border
                    border-gray-600
                    flex
                    items-center
                    justify-center
                    mb-4
                  "
                >

                  <FileText className="w-8 h-8 text-gray-500" />

                </div>

                <h3 className="text-sm font-semibold text-white mb-2">

                  No Article Generated

                </h3>

                <p className="text-xs text-gray-400 text-center max-w-xs">

                  Enter your topic, select a length,
                  and generate your article.

                </p>

              </div>

            ) : (

              /* ===============================
                 GENERATED ARTICLE
              =============================== */

              <div className="max-h-[500px] overflow-y-auto">

                <div
                  className="
                    bg-gray-700/30
                    rounded-lg
                    p-4
                    border
                    border-gray-600/30
                  "
                >

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
                            className="text-white mb-1"
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

                {/* =============================
                    ARTICLE STATS
                ============================= */}

                <div className="mt-3 grid grid-cols-3 gap-2">

                  {/* WORDS */}

                  <div
                    className="
                      text-center
                      p-2
                      bg-gray-700/30
                      rounded
                      border
                      border-gray-600/30
                    "
                  >

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

                  {/* SENTENCES */}

                  <div
                    className="
                      text-center
                      p-2
                      bg-gray-700/30
                      rounded
                      border
                      border-gray-600/30
                    "
                  >

                    <div className="text-sm font-bold text-yellow-400">

                      {
                        content
                          .split(/[.!?]+/)
                          .filter(
                            (sentence) =>
                              sentence.trim()
                          ).length
                      }

                    </div>

                    <div className="text-xs text-gray-400">

                      Sentences

                    </div>

                  </div>

                  {/* LENGTH */}

                  <div
                    className="
                      text-center
                      p-2
                      bg-gray-700/30
                      rounded
                      border
                      border-gray-600/30
                    "
                  >

                    <div className="text-sm font-bold text-yellow-400">

                      {selectedLength.text}

                    </div>

                    <div className="text-xs text-gray-400">

                      Length

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

export default WriteArticle;