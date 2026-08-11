import {
  useState,
} from 'react';

import {
  Hash,
  Image,
  Sparkles,
  Crown,
  Download,
  CheckCircle,
  Zap,
  Loader,
} from 'lucide-react';

import axios from 'axios';

import {
  useAuth,
} from '@clerk/clerk-react';

import toast from 'react-hot-toast';

import {
  useUsage,
} from '../context/UsageContext.jsx';

axios.defaults.baseURL =
  import.meta.env.VITE_BASE_URL;

const GenerateImages = () => {

  const ImageStyle = [

    'Realistic',

    'Ghibli',

    'Anime',

    'Cartoon',

    'Fantasy',

    '3D',

    'Portrait',

  ];


  const [
    selectedStyle,
    setSelectedStyle,
  ] = useState(
    'Realistic'
  );


  const [
    input,
    setInput,
  ] = useState('');


  const [
    publish,
    setPublish,
  ] = useState(false);


  const [
    content,
    setContent,
  ] = useState('');


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    downloaded,
    setDownloaded,
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


  const imageUsage =
    usage?.image || {

      used: 0,

      remaining: 5,

      limit: 5,

    };

  const imageRemaining =
    Number(

      imageUsage.remaining ?? 5

    );

  const imageLimit =
    Number(

      imageUsage.limit ?? 5

    );


  const imageUsed =
    Number(

      imageUsage.used ?? 0

    );

  const imageUsagePercentage =
    imageLimit > 0

      ? Math.max(

          0,

          Math.min(

            100,

            (
              imageRemaining /
              imageLimit
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
          'Please enter an image description'
        );

        return;

      }

      if (
        !isPro &&
        !hasCredits(
          'image'
        )
      ) {

        toast.error(
          'You have used all 5 free Image Generation credits. Upgrade to Tivion Pro to continue.'
        );

        return;

      }

      try {

        setLoading(
          true
        );


        setDownloaded(
          false
        );

        const prompt =

          `Generate an image of ${input.trim()} in the style ${selectedStyle}`;

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

          '/api/ai/generate-image',

          {

            prompt,

            publish,

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


          setDownloaded(
            false
          );

          if (
            data.usage &&
            !data.usage.unlimited
          ) {

            updateFeatureUsage(

              'image',

              data.usage

            );

          }

          if (isPro) {

            toast.success(
              'Image generated successfully!'
            );

          } else {

            const newRemaining =

              data?.usage?.remaining ??

              Math.max(

                imageRemaining - 1,

                0

              );


            toast.success(

              `Image generated! ${newRemaining}/${imageLimit} free generations remaining.`

            );

          }

        } else {

          toast.error(

            data.message ||

            'Failed to generate image'

          );

        }

      } catch (error) {

        console.error(

          'Image generation error:',

          error

        );

        const status =
          error?.response?.status;

        const message =

          error?.response?.data
            ?.message ||

          error?.message ||

          'Failed to generate image. Please try again.';

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

  const downloadImage =
    async () => {

      if (!content) {

        toast.error(
          'No generated image available.'
        );

        return;

      }


      try {

        const response =
          await fetch(
            content
          );


        if (!response.ok) {

          throw new Error(
            'Unable to download image.'
          );

        }

        const blob =
          await response.blob();


        const url =
          window.URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            'a'
          );


        link.href =
          url;


        link.download =
          `ai-generated-image-${Date.now()}.png`;


        document.body.appendChild(
          link
        );


        link.click();


        document.body.removeChild(
          link
        );


        window.URL.revokeObjectURL(
          url
        );


        setDownloaded(
          true
        );


        toast.success(
          'Image downloaded successfully!'
        );


        setTimeout(

          () =>
            setDownloaded(
              false
            ),

          2000

        );

      } catch (error) {

        console.error(

          'Image download error:',

          error

        );


        toast.error(
          'Failed to download image'
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
                  imageRemaining > 0

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
                    imageRemaining > 0

                      ? 'text-gray-400'

                      : 'text-red-400'
                  }
                `}
              />

              <span
                className={`
                  font-medium

                  ${
                    imageRemaining > 0

                      ? 'text-gray-300'

                      : 'text-red-300'
                  }
                `}
              >

                FREE · {imageRemaining}/{imageLimit} LEFT

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

            AI Image Generator

          </h1>


          <p
            className="
              text-sm
              text-gray-400
            "
          >

            Create stunning images with AI

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

                  Image generation credits

                </span>


                <span
                  className="
                    text-gray-300
                    font-medium
                  "
                >

                  {imageRemaining}/{imageLimit}

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
                      `${imageUsagePercentage}%`,

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

                {imageRemaining > 0

                  ? `${imageUsed} used · ${imageRemaining} remaining`

                  : 'Free image generation limit reached'}

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

                    Describe Your Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    What do you want to see?

                  </p>

                </div>

              </div>

              <textarea

                onChange={
                  (e) =>
                    setInput(
                      e.target.value
                    )
                }

                value={
                  input
                }

                rows={
                  4
                }

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

                  transition-all
                  resize-none
                "

                placeholder="Describe what you want to see in the image..."

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

                  Be descriptive for better AI-generated results

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

                  <Image
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

                    Style

                  </h2>

                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    Choose image style

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

                {ImageStyle.map(
                  (item) => (

                    <span

                      onClick={
                        () =>
                          setSelectedStyle(
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
                          selectedStyle === item

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

                    </span>

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

                  Selected style

                </span>


                <span
                  className="
                    text-xs
                    text-yellow-300
                    font-medium
                  "
                >

                  {selectedStyle}

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
                "
              >

                <div
                  className="
                    flex
                    items-center
                    gap-3
                    flex-1
                  "
                >

                  <label
                    className="
                      relative
                      cursor-pointer
                    "
                  >

                    <input

                      className="
                        sr-only
                        peer
                      "

                      type="checkbox"

                      checked={
                        publish
                      }

                      onChange={
                        (e) =>
                          setPublish(
                            e.target.checked
                          )
                      }

                    />


                    <div
                      className="
                        w-9
                        h-5
                        bg-gray-600
                        rounded-full
                        peer-checked:bg-yellow-500
                        transition
                      "
                    />

                    <span
                      className="
                        absolute
                        left-1
                        top-1
                        w-3
                        h-3
                        bg-white
                        rounded-full
                        transition
                        peer-checked:translate-x-4
                      "
                    />

                  </label>


                  <div>

                    <p
                      className="
                        text-sm
                        font-medium
                        text-white
                      "
                    >

                      Make this image public

                    </p>


                    <p
                      className="
                        text-xs
                        text-gray-400
                      "
                    >

                      Share your creation with others

                    </p>

                  </div>

                </div>

                <span
                  className={`
                    text-[10px]
                    px-2
                    py-1
                    rounded-full
                    border
                    shrink-0

                    ${
                      publish

                        ? `
                          text-green-400
                          bg-green-500/10
                          border-green-500/20
                        `

                        : `
                          text-gray-400
                          bg-gray-700/30
                          border-gray-600/50
                        `
                    }
                  `}
                >

                  {publish
                    ? 'Public'
                    : 'Private'}

                </span>

              </div>

            </div>

            {!isPro &&
              imageRemaining <= 0 && (

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

                        Free image generation limit reached

                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          mt-1
                          leading-relaxed
                        "
                      >

                        You've used all {imageLimit} free
                        Image Generation credits. Upgrade
                        to Tivion Pro to continue generating
                        AI images.

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
                  imageRemaining <= 0
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
                imageRemaining <= 0

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

                  <Image
                    className="
                      w-4
                      h-4
                    "
                  />

                  Generate Image

                  {!isPro && (

                    <span
                      className="
                        ml-1
                        text-black/60
                        font-medium
                      "
                    >

                      ({imageRemaining}/{imageLimit})

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
              imageRemaining > 0 && (

                <p
                  className="
                    text-center
                    text-[10px]
                    text-gray-500
                  "
                >

                  1 credit is used only after an image
                  is generated successfully.

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

                  <Image
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

                    Generated Image

                  </h2>


                  <p
                    className="
                      text-xs
                      text-gray-400
                    "
                  >

                    AI-powered creation

                  </p>

                </div>

              </div>

              {content && (

                <button

                  type="button"

                  onClick={
                    downloadImage
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

                  {downloaded ? (

                    <CheckCircle
                      className="
                        w-3
                        h-3
                        text-green-400
                      "
                    />

                  ) : (

                    <Download
                      className="
                        w-3
                        h-3
                      "
                    />

                  )}


                  {downloaded
                    ? 'Downloaded!'
                    : 'Download'}

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

                  Creating Your Image

                </h3>


                <p
                  className="
                    text-sm
                    text-gray-400
                    mb-4
                    text-center
                  "
                >

                  AI is bringing your imagination to life...

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
                      Understanding
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
                      Generating
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
                      Finalizing
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
                    the image is generated successfully.

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

                  <Image
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

                  No Image Generated

                </h3>


                <p
                  className="
                    text-xs
                    text-gray-400
                    text-center
                    max-w-xs
                  "
                >

                  Enter a prompt and choose a style to
                  generate your AI image

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

                        Unlimited image generation

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

                        {imageRemaining}/{imageLimit}
                        {' '}free generations left

                      </span>

                    </>

                  )}

                </div>

                {!isPro &&
                  imageRemaining <= 0 && (

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

                        Image generated successfully

                      </p>


                      <p
                        className="
                          text-[10px]
                          text-gray-500
                          mt-0.5
                        "
                      >

                        Your AI-generated image is ready

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

                      {imageRemaining}/{imageLimit} left

                    </div>

                  )}

                </div>

                <div
                  className="
                    bg-gray-700/30
                    rounded-lg
                    p-3
                    border
                    border-gray-600/30
                  "
                >

                  <img

                    src={
                      content
                    }

                    alt="AI Generated"

                    className="
                      w-full
                      h-auto
                      rounded-lg
                      max-h-[420px]
                      object-contain
                      mx-auto
                    "

                  />

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

                      {selectedStyle}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Style

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
                      className={`
                        text-sm
                        font-bold

                        ${
                          publish
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      `}
                    >

                      {publish
                        ? 'Public'
                        : 'Private'}

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Visibility

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

                      AI

                    </div>


                    <div
                      className="
                        text-xs
                        text-gray-400
                        mt-1
                      "
                    >

                      Generated

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

                      Prompt

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

                      Image ready to download

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

                      {imageRemaining}/{imageLimit} remaining

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

                  Downloading this image does not use
                  another AI generation credit.

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

                <Image
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

                  Image Generation Usage

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

                    {imageRemaining}/{imageLimit} Remaining

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
                    : 'Waiting for Prompt'}

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

                      Style: {selectedStyle}

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

                    Free AI Image Generation

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
                    {imageLimit} AI Image Generation uses.

                    {' '}

                    A credit is counted only after an
                    image is generated successfully.

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
                        imageRemaining > 0
                          ? 'text-white'
                          : 'text-red-400'
                      }
                    `}
                  >

                    {imageRemaining}/{imageLimit}

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
                        `${imageUsagePercentage}%`,

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

                  {imageUsed} of {imageLimit} used

                </p>

              </div>

            </div>

          </div>

        )}

        {!isPro &&
          imageRemaining <= 0 && (

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

                    You've used all free Image Generation credits

                  </p>


                  <p
                    className="
                      text-xs
                      text-gray-400
                      mt-1
                      leading-relaxed
                    "
                  >

                    Your {imageLimit} free AI Image Generation
                    uses have been consumed. Upgrade to
                    Tivion Pro for continued image generation.

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
                  AI Image Generation without the free
                  5-generation limit.

                </p>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};

export default GenerateImages;