import {
  useState,
} from 'react';

import {
  Hash,
  Sparkles,
  Crown,
  Copy,
  CheckCircle,
  Zap,
  Loader,
} from 'lucide-react';

import axios from 'axios';

import {
  useAuth,
} from '@clerk/clerk-react';

import toast from 'react-hot-toast';

import Markdown from 'react-markdown';

import {
  useUsage,
} from '../context/UsageContext.jsx';


axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;

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

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState(
    'General'
  );


  const [
    input,
    setInput,
  ] = useState('');


  const [
    content,
    setContent,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    copied,
    setCopied,
  ] = useState(false);


  const {
    getToken,
  } = useAuth();


  const {

    isPro,

    usage,

    updateFeatureUsage,

    hasCredits,

  } = useUsage();


  const blogTitleUsage =
    usage?.blogTitle || {

      used: 0,

      remaining: 5,

      limit: 5,

    };


  const blogTitleRemaining =
    Number(

      blogTitleUsage.remaining ?? 5

    );


  const blogTitleLimit =
    Number(

      blogTitleUsage.limit ?? 5

    );


  const blogTitleUsed =
    Number(

      blogTitleUsage.used ?? 0

    );


  const blogTitleUsagePercentage =
    blogTitleLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              blogTitleRemaining /
              blogTitleLimit
            ) * 100

          )

        )

      : 0;

  const onSubmitHandler =
    async (e) => {

      e.preventDefault();


      if (
        !input.trim()
      ) {

        toast.error(
          'Please enter a keyword or blog topic.'
        );

        return;

      }

      if (
        !isPro &&
        !hasCredits(
          'blogTitle'
        )
      ) {

        toast.error(
          'You have used all 5 free Blog Title credits. Upgrade to Tivion Pro to continue.'
        );

        return;

      }


      try {

        setLoading(
          true
        );


        setContent(
          ''
        );


        setCopied(
          false
        );


const prompt = `
Generate exactly 10 SEO-friendly blog titles.

Keyword: ${input.trim()}

Category: ${selectedCategory}

Rules:
- Return ONLY the titles.
- Each title must be on a NEW LINE.
- Do NOT combine titles into a paragraph.
- Do NOT write introductions or explanations.
- Do NOT use markdown headings.
- Number each title from 1 to 10.

Example:

1. Future of Artificial Intelligence

2. AI Trends Every Developer Should Know

3. How AI is Transforming Modern Business

4. The Rise of Intelligent Automation

5. AI in Healthcare: A New Era

6. The Future of Machine Learning

7. Artificial Intelligence for Beginners

8. Top AI Innovations in 2026

9. Ethical Challenges of AI

10. Why AI Will Shape the Future
`;

        const token =
          await getToken();


        if (!token) {

          throw new Error(
            'Unable to get authentication token. Please sign in again.'
          );

        }

        const {
          data,
        } = await axios.post(

          '/api/ai/generate-blog-title',

          {

            prompt,

          },

          {

            headers: {

              Authorization:
                `Bearer ${token}`,

            },

          }

        );

        if (
          data.success
        ) {

          setContent(
            data.content
          );


          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'blogTitle',

              data.usage

            );

          }

          if (isPro) {

            toast.success(
              'Blog titles generated successfully!'
            );

          } else {

            const newRemaining =

              data?.usage?.remaining ??

              Math.max(

                blogTitleRemaining - 1,

                0

              );


            toast.success(

              `Blog titles generated! ${newRemaining}/${blogTitleLimit} free generations remaining.`

            );

          }

        } else {

          toast.error(

            data.message ||

            'Failed to generate blog titles.'

          );

        }

      } catch (error) {

        console.error(

          'Blog title generation error:',

          error

        );

        const status =
          error?.response?.status;


        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Failed to generate blog titles.';

        if (
          status === 403
        ) {

          toast.error(
            message
          );

          return;

        }


        toast.error(
          message
        );

      } finally {

        setLoading(
          false
        );

      }

    };


  const copyToClipboard =
    async () => {

      if (!content) {

        return;

      }


      try {

        await navigator.clipboard.writeText(
          content
        );


        setCopied(
          true
        );


        toast.success(
          'Blog titles copied to clipboard!'
        );


        setTimeout(

          () => {

            setCopied(
              false
            );

          },

          2000

        );

      } catch (error) {

        console.error(

          'Clipboard error:',

          error

        );


        toast.error(
          'Failed to copy titles.'
        );

      }

    };


  return (

    <div
      className="
        h-full
        overflow-y-scroll
        p-6
        bg-gradient-to-br
        from-gray-900
        to-black
      "
    >

      <div
        className="
          max-w-7xl
          mx-auto
        "
      >

        <div
          className="
            text-center
            mb-6
          "
        >

       
          {isPro ? (

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


              <span
                className="
                  text-yellow-400
                  font-medium
                "
              >

                Tivion PRO · UNLIMITED

              </span>

            </div>

          ) : (

            <div
              className={`
                inline-flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                border
                text-xs
                mb-3

                ${
                  blogTitleRemaining > 0

                    ? `
                      border-gray-500/20
                      bg-gray-500/10
                    `

                    : `
                      border-red-500/30
                      bg-red-500/10
                    `
                }
              `}
            >

              <Sparkles
                className={`
                  w-3
                  h-3

                  ${
                    blogTitleRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />


              <span
                className={`
                  font-medium

                  ${
                    blogTitleRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {blogTitleRemaining}/{blogTitleLimit} LEFT

              </span>

            </div>

          )}

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

            AI Blog Title Generator

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Create compelling blog titles with AI

          </p>

          {!isPro && (

            <div
              className="
                max-w-xs
                mx-auto
                mt-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  justify-between
                  text-xs
                  mb-1.5
                "
              >

                <span
                  className="
                    text-gray-500
                  "
                >

                  Blog title credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {blogTitleRemaining}/{blogTitleLimit}

                </span>

              </div>


              <div
                className="
                  w-full
                  h-1.5
                  bg-gray-700
                  rounded-full
                  overflow-hidden
                "
              >

                <div
                  className="
                    h-full
                    bg-gradient-to-r
                    from-yellow-400
                    to-amber-500
                    rounded-full
                    transition-all
                    duration-500
                  "

                  style={{

                    width:
                      `${blogTitleUsagePercentage}%`,

                  }}
                />

              </div>


              <p
                className="
                  text-[10px]
                  text-gray-500
                  mt-1.5
                "
              >

                {blogTitleRemaining > 0

                  ? `${blogTitleUsed} used · ${blogTitleRemaining} remaining`

                  : 'Free blog title limit reached'}

              </p>

            </div>

          )}

        </div>

        <div
          className="
            grid
            grid-cols-1
            xl:grid-cols-2
            gap-4
          "
        >        

          <div
            className="
              space-y-4
            "
          >

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

              <div
                className="
                  flex
                  items-center
                  gap-3
                  mb-4
                "
              >

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

                  <Sparkles
                    className="
                      w-5
                      h-5
                      text-black
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-white
                    "
                  >

                    Keyword

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Enter your blog topic

                  </p>

                </div>

              </div>

              <input

                onChange={
                  (e) =>
                    setInput(
                      e.target.value
                    )
                }

                value={
                  input
                }

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

                placeholder="Example: Future of backend development"

                required

              />

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  mt-2
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >

                  Enter a clear topic for better title ideas

                </p>


                <span
                  className="
                    text-[10px]
                    text-gray-500
                    shrink-0
                  "
                >

                  {input.length} characters

                </span>

              </div>

            </div>

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

              <div
                className="
                  flex
                  items-center
                  gap-3
                  mb-4
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    rounded-lg
                    bg-gradient-to-br
                    from-purple-500
                    to-pink-500
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Hash
                    className="
                      w-5
                      h-5
                      text-black
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-white
                    "
                  >

                    Category

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Choose blog category

                  </p>

                </div>

              </div>

              <div
                className="
                  flex
                  gap-2
                  flex-wrap
                "
              >

                {blogCategories.map(
                  (item) => (

                    <button

                      type="button"

                      onClick={
                        () =>
                          setSelectedCategory(
                            item
                          )
                      }

                      className={`
                        text-xs
                        px-3
                        py-2
                        rounded-lg
                        border
                        cursor-pointer
                        transition-all

                        ${
                          selectedCategory === item

                            ? `
                              bg-yellow-500/10
                              border-yellow-500/50
                              text-yellow-300
                            `

                            : `
                              bg-gray-700/30
                              border-gray-600
                              text-gray-400

                              hover:border-yellow-500/30
                              hover:text-yellow-200
                            `
                        }
                      `}

                      key={
                        item
                      }

                    >

                      {item}

                    </button>

                  )
                )}

              </div>

              <div
                className="
                  mt-3
                  pt-3
                  border-t
                  border-gray-700/50
                  flex
                  items-center
                  justify-between
                  gap-3
                "
              >

                <span
                  className="
                    text-[10px]
                    text-gray-500
                  "
                >

                  Selected category

                </span>


                <span
                  className="
                    text-xs
                    text-yellow-300
                    font-medium
                  "
                >

                  {selectedCategory}

                </span>

              </div>

            </div>

            {!isPro &&
              blogTitleRemaining <= 0 && (

                <div
                  className="
                    p-4
                    rounded-xl
                    border
                    border-red-500/20
                    bg-red-500/5
                  "
                >

                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >

                    <div
                      className="
                        w-9
                        h-9
                        shrink-0
                        rounded-lg
                        bg-red-500/10
                        border
                        border-red-500/20
                        flex
                        items-center
                        justify-center
                      "
                    >

                      <Zap
                        className="
                          w-4
                          h-4
                          text-red-400
                        "
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-sm
                          font-semibold
                          text-red-300
                        "
                      >

                        Free Blog Title limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {blogTitleLimit} free
                        Blog Title generations. Upgrade to
                       Tivion Pro to continue generating
                        AI blog titles.

                      </p>

                    </div>

                  </div>

                </div>

              )}


            <button

              type="button"

              onClick={
                onSubmitHandler
              }

              disabled={

                loading ||

                !input.trim() ||

                (
                  !isPro &&
                  blogTitleRemaining <= 0
                )

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

                  <Loader
                    className="
                      w-4
                      h-4
                      animate-spin
                    "
                  />

                  Generating...

                </>

              ) : (

                !isPro &&
                blogTitleRemaining <= 0

              ) ? (

                <>

                  <Crown
                    className="
                      w-4
                      h-4
                    "
                  />

                  Free Limit Reached

                </>

              ) : (

                <>

                  <Hash
                    className="
                      w-4
                      h-4
                    "
                  />

                  Generate Titles

                  {!isPro && (

                    <span
                      className="
                        ml-1
                        text-black/60
                        font-medium
                      "
                    >

                      ({blogTitleRemaining}/{blogTitleLimit})

                    </span>

                  )}

                  {isPro && (

                    <Crown
                      className="
                        w-3.5
                        h-3.5
                        ml-1
                      "
                    />

                  )}

                </>

              )}

            </button>

            {!isPro &&
              blogTitleRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after blog titles
                  are generated successfully.

                </p>

              )}

          </div>

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

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                mb-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

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
                    shrink-0
                  "
                >

                  <Hash
                    className="
                      w-5
                      h-5
                      text-black
                    "
                  />

                </div>


                <div>

                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-white
                    "
                  >

                    Generated Titles

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    AI-powered blog titles

                  </p>

                </div>

              </div>

              {content &&
                !loading && (

                  <button

                    type="button"

                    onClick={
                      copyToClipboard
                    }

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
                      shrink-0
                    "
                  >

                    {copied ? (

                      <CheckCircle
                        className="
                          w-3
                          h-3
                          text-green-400
                        "
                      />

                    ) : (

                      <Copy
                        className="
                          w-3
                          h-3
                        "
                      />

                    )}


                    {copied
                      ? 'Copied!'
                      : 'Copy'}

                  </button>

                )}

            </div>

            {loading ? (

              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  py-12
                "
              >

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

                  <Loader
                    className="
                      w-6
                      h-6
                      text-black
                      animate-spin
                    "
                  />

                </div>


                <h3
                  className="
                    text-lg
                    font-semibold
                    text-white
                    mb-2
                  "
                >

                  Creating Your Titles

                </h3>


                <p
                  className="
                    text-sm
                    text-gray-400
                    mb-4
                    text-center
                  "
                >

                  AI is generating creative blog title ideas...

                </p>

                <div
                  className="
                    w-48
                    bg-gray-700
                    rounded-full
                    h-1.5
                    mb-2
                    overflow-hidden
                  "
                >

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

                <div
                  className="
                    flex
                    gap-4
                    text-xs
                    text-gray-400
                  "
                >

                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-yellow-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Analyzing
                    </span>

                  </div>


                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-amber-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Creating
                    </span>

                  </div>


                  <div
                    className="
                      text-center
                    "
                  >

                    <div
                      className="
                        w-1.5
                        h-1.5
                        bg-orange-400
                        rounded-full
                        animate-bounce
                        mx-auto
                        mb-1
                      "
                    />

                    <span>
                      Refining
                    </span>

                  </div>

                </div>

                {!isPro && (

                  <p
                    className="
                      text-[10px]
                      text-gray-500
                      mt-5
                      text-center
                    "
                  >

                    Your credit will be counted only after
                    the titles are generated successfully.

                  </p>

                )}

              </div>

            ) : !content ? (

              <div
                className="
                  flex
                  flex-col
                  items-center
                  justify-center
                  py-12
                "
              >

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

                  <Hash
                    className="
                      w-8
                      h-8
                      text-gray-500
                    "
                  />

                </div>


                <h3
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mb-2
                  "
                >

                  No Titles Generated

                </h3>


                <p
                  className="
                    text-xs
                    text-gray-400
                    text-center
                    max-w-xs
                  "
                >

                  Enter a keyword and choose a category
                  to generate creative blog titles

                </p>

                <div
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    px-3
                    py-2
                    bg-gray-800/60
                    border
                    border-gray-700
                    rounded-lg
                  "
                >

                  {isPro ? (

                    <>

                      <Crown
                        className="
                          w-3.5
                          h-3.5
                          text-yellow-400
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-yellow-300
                        "
                      >

                        Unlimited blog title generation

                      </span>

                    </>

                  ) : (

                    <>

                      <Sparkles
                        className="
                          w-3.5
                          h-3.5
                          text-yellow-400
                        "
                      />

                      <span
                        className="
                          text-xs
                          text-gray-300
                        "
                      >

                        {blogTitleRemaining}/{blogTitleLimit}
                        {' '}free generations left

                      </span>

                    </>

                  )}

                </div>

                {!isPro &&
                  blogTitleRemaining <= 0 && (

                    <p
                      className="
                        text-xs
                        text-red-400
                        mt-4
                      "
                    >

                      Upgrade to Tivion Pro to continue.

                    </p>

                  )}

              </div>

            ) : (

              <div
                className="
                  space-y-4
                "
              >

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    justify-between
                    gap-3
                    p-3
                    rounded-lg
                    bg-green-500/5
                    border
                    border-green-500/10
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <div
                      className="
                        w-8
                        h-8
                        rounded-full
                        bg-green-500/10
                        border
                        border-green-500/20
                        flex
                        items-center
                        justify-center
                        shrink-0
                      "
                    >

                      <CheckCircle
                        className="
                          w-4
                          h-4
                          text-green-400
                        "
                      />

                    </div>


                    <div>

                      <p
                        className="
                          text-xs
                          font-medium
                          text-green-400
                        "
                      >

                        Blog titles generated successfully

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-gray-500
                          mt-0.5
                        "
                      >

                        Your AI-generated title ideas are ready

                      </p>

                    </div>

                  </div>

                  {isPro ? (

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        self-start
                        sm:self-auto
                        px-2.5
                        py-1.5
                        rounded-full
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                        text-[10px]
                        text-yellow-300
                      "
                    >

                      <Crown
                        className="
                          w-3
                          h-3
                        "
                      />

                      Pro Access

                    </div>

                  ) : (

                    <div
                      className="
                        inline-flex
                        items-center
                        gap-1.5
                        self-start
                        sm:self-auto
                        px-2.5
                        py-1.5
                        rounded-full
                        bg-gray-800
                        border
                        border-gray-700
                        text-[10px]
                        text-gray-300
                      "
                    >

                      <Sparkles
                        className="
                          w-3
                          h-3
                          text-yellow-400
                        "
                      />

                      {blogTitleRemaining}/{blogTitleLimit} left

                    </div>

                  )}

                </div>

                <div
                  className="
                    bg-gray-700/30
                    rounded-lg
                    p-4
                    border
                    border-gray-600/30
                    max-h-[420px]
                    overflow-y-auto
                  "
                >

                  <div
                    className="
                      text-sm
                      text-gray-200
                      leading-relaxed

                      [&_h1]:text-xl
                      [&_h1]:font-bold
                      [&_h1]:text-white
                      [&_h1]:mb-3

                      [&_h2]:text-lg
                      [&_h2]:font-semibold
                      [&_h2]:text-white
                      [&_h2]:mb-2
                      [&_h2]:mt-3

                      [&_h3]:text-base
                      [&_h3]:font-semibold
                      [&_h3]:text-white
                      [&_h3]:mb-2

                      [&_p]:text-gray-300
                      [&_p]:mb-2

                      [&_ul]:space-y-2
                      [&_ul]:my-2

                      [&_ol]:space-y-2
                      [&_ol]:my-2

                      [&_li]:text-gray-200

                      [&_strong]:text-yellow-300
                      [&_strong]:font-semibold
                    "
                  >

                    <Markdown>

                      {content}

                    </Markdown>

                  </div>

                </div>

                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-3
                    gap-2
                  "
                >

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-yellow-400
                      "
                    >

                      {
                        content

                          .split('\n')

                          .filter(
                            (line) =>
                              line.trim().length > 0
                          )

                          .length
                      }

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Titles

                    </div>

                  </div>

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-yellow-400
                      "
                    >

                      {
                        content
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .length
                      }

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Words

                    </div>

                  </div>

                  <div
                    className="
                      text-center
                      p-3
                      bg-gray-700/30
                      rounded-lg
                      border
                      border-gray-600/30
                    "
                  >

                    <div
                      className="
                        text-sm
                        font-bold
                        text-yellow-400
                        truncate
                      "
                    >

                      {selectedCategory}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Category

                    </div>

                  </div>

                </div>

                <div
                  className="
                    px-3
                    py-3
                    bg-gray-700/20
                    border
                    border-gray-700/50
                    rounded-lg
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      mb-2
                    "
                  >

                    <Hash
                      className="
                        w-3.5
                        h-3.5
                        text-yellow-400
                      "
                    />


                    <span
                      className="
                        text-xs
                        font-medium
                        text-gray-300
                      "
                    >

                      Keyword / Topic

                    </span>

                  </div>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      leading-relaxed
                      break-words
                    "
                  >

                    {input}

                  </p>

                </div>

                <div
                  className="
                    flex
                    flex-col
                    sm:flex-row
                    sm:items-center
                    justify-between
                    gap-3
                    px-3
                    py-2.5
                    bg-gray-700/20
                    border
                    border-gray-700/50
                    rounded-lg
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >

                    <CheckCircle
                      className="
                        w-3.5
                        h-3.5
                        text-green-400
                      "
                    />


                    <span
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Titles ready to use

                    </span>

                  </div>


                  {isPro ? (

                    <div
                      className="
                        flex
                        items-center
                        gap-1.5
                      "
                    >

                      <Crown
                        className="
                          w-3
                          h-3
                          text-yellow-400
                        "
                      />


                      <span
                        className="
                          text-xs
                          font-medium
                          text-yellow-300
                        "
                      >

                        Unlimited

                      </span>

                    </div>

                  ) : (

                    <span
                      className="
                        text-xs
                        font-medium
                        text-white
                      "
                    >

                      {blogTitleRemaining}/{blogTitleLimit} remaining

                    </span>

                  )}

                </div>

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  Copying these titles does not use
                  another AI credit.

                </p>

              </div>

            )}

          </div>

        </div>

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            gap-3
            mt-5
          "
        >

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className={`
                  w-9
                  h-9
                  rounded-lg
                  flex
                  items-center
                  justify-center
                  shrink-0

                  ${
                    isPro
                      ? `
                        bg-yellow-500/10
                        border
                        border-yellow-500/20
                      `
                      : `
                        bg-gray-700/50
                        border
                        border-gray-600/50
                      `
                  }
                `}
              >

                {isPro ? (

                  <Crown
                    className="
                      w-4
                      h-4
                      text-yellow-400
                      fill-yellow-400
                    "
                  />

                ) : (

                  <Sparkles
                    className="
                      w-4
                      h-4
                      text-gray-300
                    "
                  />

                )}

              </div>


              <div>

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >

                  Current Plan

                </p>


                <p
                  className={`
                    text-sm
                    font-semibold
                    mt-0.5

                    ${
                      isPro
                        ? 'text-yellow-300'
                        : 'text-white'
                    }
                  `}
                >

                  {isPro
                    ? 'Tivion Pro'
                    : 'Free Plan'}

                </p>

              </div>

            </div>

          </div>

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-green-500/10
                  border
                  border-green-500/20
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                <Hash
                  className="
                    w-4
                    h-4
                    text-green-400
                  "
                />

              </div>

              <div
                className="
                  flex-1
                  min-w-0
                "
              >
                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >

                  Blog Title Usage

                </p>


                {isPro ? (

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-green-400
                      mt-0.5
                    "
                  >

                    Unlimited

                  </p>

                ) : (

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-white
                      mt-0.5
                    "
                  >

                    {blogTitleRemaining}/{blogTitleLimit} Remaining

                  </p>

                )}

              </div>

            </div>

          </div>

          <div
            className="
              bg-gradient-to-br
              from-gray-800/70
              to-gray-900
              border
              border-gray-700/50
              rounded-xl
              p-4
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  w-9
                  h-9
                  rounded-lg
                  bg-blue-500/10
                  border
                  border-blue-500/20
                  flex
                  items-center
                  justify-center
                  shrink-0
                "
              >

                {content ? (

                  <CheckCircle
                    className="
                      w-4
                      h-4
                      text-blue-400
                    "
                  />

                ) : (

                  <Sparkles
                    className="
                      w-4
                      h-4
                      text-blue-400
                    "
                  />

                )}

              </div>


              <div
                className="
                  min-w-0
                "
              >

                <p
                  className="
                    text-[10px]
                    text-gray-500
                    uppercase
                    tracking-wide
                  "
                >

                  Generation Status

                </p>


                <p
                  className="
                    text-sm
                    font-semibold
                    text-white
                    mt-0.5
                  "
                >

                  {loading
                    ? 'Generating...'
                    : content
                    ? 'Completed'
                    : input.trim()
                    ? 'Ready to Generate'
                    : 'Waiting for Keyword'}

                </p>


                {input.trim() &&
                  !content &&
                  !loading && (

                    <p
                      className="
                        text-[10px]
                        text-gray-500
                        mt-0.5
                      "
                    >

                      Category: {selectedCategory}

                    </p>

                  )}

              </div>

            </div>

          </div>

        </div>

        {!isPro && (

          <div
            className="
              mt-4
              p-4
              rounded-xl
              bg-gradient-to-r
              from-yellow-500/5
              via-gray-800/50
              to-amber-500/5
              border
              border-yellow-500/10
            "
          >

            <div
              className="
                flex
                flex-col
                sm:flex-row
                sm:items-center
                justify-between
                gap-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  gap-3
                "
              >

                <div
                  className="
                    w-9
                    h-9
                    shrink-0
                    rounded-lg
                    bg-yellow-500/10
                    border
                    border-yellow-500/20
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Zap
                    className="
                      w-4
                      h-4
                      text-yellow-400
                    "
                  />

                </div>


                <div>

                  <p
                    className="
                      text-sm
                      font-medium
                      text-white
                    "
                  >

                    Free AI Blog Title Generation

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your free Tivion account includes{' '}
                    {blogTitleLimit} Blog Title generations.

                    {' '}

                    One credit is counted only after
                    titles are generated successfully.

                  </p>

                </div>

              </div>

              <div
                className="
                  shrink-0
                  min-w-[130px]
                  bg-black/20
                  border
                  border-gray-700/60
                  rounded-lg
                  px-4
                  py-3
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    mb-2
                  "
                >

                  <span
                    className="
                      text-[10px]
                      text-gray-500
                    "
                  >

                    Remaining

                  </span>


                  <span
                    className={`
                      text-sm
                      font-bold

                      ${
                        blogTitleRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {blogTitleRemaining}/{blogTitleLimit}

                  </span>

                </div>

                <div
                  className="
                    w-full
                    h-1.5
                    bg-gray-700
                    rounded-full
                    overflow-hidden
                  "
                >

                  <div
                    className="
                      h-full
                      bg-gradient-to-r
                      from-yellow-400
                      to-amber-500
                      rounded-full
                      transition-all
                      duration-500
                    "

                    style={{

                      width:
                        `${blogTitleUsagePercentage}%`,

                    }}
                  />

                </div>

                <p
                  className="
                    text-[9px]
                    text-gray-500
                    mt-2
                  "
                >

                  {blogTitleUsed} of {blogTitleLimit} used

                </p>

              </div>

            </div>

          </div>

        )}

        {!isPro &&
          blogTitleRemaining <= 0 && (

            <div
              className="
                mt-4
                p-4
                rounded-xl
                bg-red-500/5
                border
                border-red-500/20
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >

                <div
                  className="
                    w-10
                    h-10
                    shrink-0
                    rounded-lg
                    bg-red-500/10
                    border
                    border-red-500/20
                    flex
                    items-center
                    justify-center
                  "
                >

                  <Crown
                    className="
                      w-5
                      h-5
                      text-red-400
                    "
                  />

                </div>


                <div>

                  <p
                    className="
                      text-sm
                      font-semibold
                      text-red-300
                    "
                  >

                    You've used all free Blog Title credits

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {blogTitleLimit} free Blog Title
                    generations have been consumed.

                    {' '}

                    Upgrade to Tivion  Pro to continue
                    generating AI blog titles.

                  </p>

                </div>

              </div>

            </div>

          )}

        {isPro && (

          <div
            className="
              mt-4
              p-4
              rounded-xl
              bg-gradient-to-r
              from-yellow-500/10
              via-gray-800/50
              to-amber-500/10
              border
              border-yellow-500/20
            "
          >

            <div
              className="
                flex
                items-center
                gap-3
              "
            >
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
                  shrink-0
                  shadow-lg
                  shadow-yellow-500/20
                "
              >

                <Crown
                  className="
                    w-5
                    h-5
                    text-black
                  "
                />

              </div>


              <div>

                <p
                  className="
                    text-sm
                    font-semibold
                    text-yellow-300
                  "
                >

                  Tivion Pro Active

                </p>


                <p
                  className="
                    text-xs
                    text-gray-400
                    mt-1
                    leading-relaxed
                  "
                >

                  Your Pro plan has full access to
                  AI Blog Title generation without
                  the free 5-generation limit.

                </p>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};

export default BlogTitles;
