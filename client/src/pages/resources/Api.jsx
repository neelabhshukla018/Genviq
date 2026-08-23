import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code,
  Zap,
  ChevronRight,
  Sparkles,
  Cpu,
  Database,
  Globe,
  Shield,
  Clipboard,
  Check,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { motion } from 'framer-motion';

const endpoints = [
  {
    name: 'Image Generation',
    method: 'POST',
    path: '/api/v1/images/generate',
    description:
      'Generate high-quality images from text prompts with flexible size and style controls.',
    icon: <Cpu className="w-5 h-5" />,
  },
  {
    name: 'Background Removal',
    method: 'POST',
    path: '/api/v1/images/remove-background',
    description:
      'Automatically remove image backgrounds while preserving important subject details.',
    icon: <Database className="w-5 h-5" />,
  },
  {
    name: 'Object Removal',
    method: 'POST',
    path: '/api/v1/images/remove-object',
    description:
      'Remove unwanted objects from images with clean and natural-looking results.',
    icon: <Globe className="w-5 h-5" />,
  },
  {
    name: 'Text Analysis',
    method: 'POST',
    path: '/api/v1/text/analyze',
    description:
      'Analyze, process and extract useful information from your text using Tivion APIs.',
    icon: <Shield className="w-5 h-5" />,
  },
];

const codeSamples = {
  javascript: `const response = await fetch(
  'https://api.tivion.ai/api/v1/images/generate',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({
      prompt: 'A futuristic city at sunset',
      width: 1024,
      height: 768,
      style: 'photorealistic'
    })
  }
);

const data = await response.json();
console.log(data);`,

  python: `import requests

response = requests.post(
    'https://api.tivion.ai/api/v1/images/generate',
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    },
    json={
        'prompt': 'A futuristic city at sunset',
        'width': 1024,
        'height': 768,
        'style': 'photorealistic'
    }
)

print(response.json())`,

  curl: `curl -X POST \\
  https://api.tivion.ai/api/v1/images/generate \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "prompt": "A futuristic city at sunset",
    "width": 1024,
    "height": 768,
    "style": "photorealistic"
  }'`,
};

const Api = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('javascript');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeSamples[activeTab]);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#090b0a] text-white overflow-x-hidden">
      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-50 bg-[#090b0a]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <Navbar />
      </div>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">

        {/* Subtle Background Glow */}
        <div className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#7fa68a]/[0.06] blur-[120px] rounded-full" />

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-[#7fa68a]/20 bg-[#7fa68a]/[0.06] text-[#9fbea8] text-sm">
            <span className="w-2 h-2 rounded-full bg-[#7fa68a] animate-pulse" />
            Tivion Developer Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Tivion API
          </h1>

          <p className="text-gray-400 text-base sm:text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            Simple, powerful APIs that let you integrate Tivion capabilities
            directly into your applications.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <div className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-sm text-gray-400">
              REST API
            </div>

            <div className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-sm text-gray-400">
              JSON
            </div>

            <div className="px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.07] text-sm text-gray-400">
              Secure
            </div>
          </div>
        </motion.section>

        {/* API Endpoints */}
        <section className="mb-28">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#8eaa97] mb-2">
                Available endpoints
              </p>

              <h2 className="text-2xl sm:text-3xl font-semibold">
                Build with Tivion
              </h2>
            </div>

            <p className="text-sm text-gray-500 max-w-md sm:text-right">
              Everything you need to connect Tivion services with your own
              products and workflows.
            </p>
          </div>

          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                },
              },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {endpoints.map((endpoint, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.45,
                    },
                  },
                }}
                whileHover={{
                  y: -4,
                }}
                className="
                  group
                  p-5 sm:p-6
                  rounded-2xl
                  border border-white/[0.07]
                  bg-white/[0.025]
                  backdrop-blur-xl
                  hover:border-[#7fa68a]/30
                  hover:bg-[#7fa68a]/[0.025]
                  transition-all duration-300
                "
              >
                <div className="flex items-start gap-4">

                  {/* Icon */}
                  <div
                    className="
                      flex-shrink-0
                      w-11 h-11
                      flex items-center justify-center
                      rounded-xl
                      bg-[#7fa68a]/[0.08]
                      border border-[#7fa68a]/20
                      text-[#9fbea8]
                      group-hover:bg-[#7fa68a]/[0.13]
                      transition-colors
                    "
                  >
                    {endpoint.icon}
                  </div>

                  <div className="flex-1 min-w-0">

                    {/* Title */}
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-100">
                        {endpoint.name}
                      </h3>

                      <span
                        className="
                          px-2.5 py-1
                          rounded-md
                          text-[11px]
                          font-semibold
                          tracking-wide
                          bg-[#7fa68a]/10
                          text-[#a8c4b0]
                          border border-[#7fa68a]/20
                        "
                      >
                        {endpoint.method}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-5">
                      {endpoint.description}
                    </p>

                    {/* Endpoint */}
                    <div
                      className="
                        w-full
                        px-3.5 py-3
                        rounded-lg
                        bg-black/25
                        border border-white/[0.06]
                        font-mono
                        text-xs sm:text-sm
                        text-gray-400
                        overflow-x-auto
                        whitespace-nowrap
                      "
                    >
                      <span className="text-[#9fbea8] mr-2">
                        {endpoint.method}
                      </span>

                      {endpoint.path}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Code Samples */}
        <motion.section
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-28"
        >
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.2em] text-[#8eaa97] mb-3">
              Developer friendly
            </p>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start building in minutes
            </h2>

            <p className="text-gray-400 max-w-2xl mx-auto">
              Use your preferred language and connect to Tivion with a simple
              API request.
            </p>
          </div>

          {/* Language Tabs */}
          <div className="flex justify-center mb-5">
            <div
              className="
                flex flex-wrap
                items-center justify-center
                gap-1
                p-1
                rounded-xl
                bg-white/[0.03]
                border border-white/[0.07]
              "
            >
              {['javascript', 'python', 'curl'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveTab(lang)}
                  className={`
                    px-4 sm:px-6
                    py-2.5
                    rounded-lg
                    text-sm
                    font-medium
                    transition-all duration-200
                    ${
                      activeTab === lang
                        ? 'bg-[#7fa68a]/15 text-[#b0cbb7] border border-[#7fa68a]/20'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                    }
                  `}
                >
                  {lang === 'javascript'
                    ? 'JavaScript'
                    : lang === 'python'
                    ? 'Python'
                    : 'cURL'}
                </button>
              ))}
            </div>
          </div>

          {/* Code Window */}
          <div
            className="
              relative
              rounded-2xl
              overflow-hidden
              border border-white/[0.07]
              bg-[#0c0f0d]
              shadow-2xl shadow-black/30
            "
          >
            {/* Window Header */}
            <div
              className="
                flex flex-col sm:flex-row
                sm:items-center
                sm:justify-between
                gap-3
                px-4 sm:px-6
                py-4
                border-b border-white/[0.06]
                bg-white/[0.02]
              "
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                </div>

                <Code className="w-4 h-4 text-[#91ad99]" />

                <span className="text-xs sm:text-sm font-mono text-gray-500 truncate">
                  {endpoints[0].path}
                </span>
              </div>

              <button
                onClick={copyToClipboard}
                className="
                  flex items-center justify-center
                  gap-2
                  px-3.5 py-2
                  rounded-lg
                  text-xs sm:text-sm
                  text-gray-400
                  bg-white/[0.04]
                  border border-white/[0.06]
                  hover:text-white
                  hover:border-[#7fa68a]/30
                  hover:bg-[#7fa68a]/[0.06]
                  transition-all
                "
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#9fbea8]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Clipboard className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Code */}
            <pre
              className="
                p-4 sm:p-6 lg:p-8
                overflow-x-auto
                text-xs sm:text-sm
                leading-7
                font-mono
                text-gray-300
                min-h-[280px]
              "
            >
              <code>{codeSamples[activeTab]}</code>
            </pre>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div
            className="
              relative
              overflow-hidden
              px-5 sm:px-8
              py-12 sm:py-16
              rounded-3xl
              border border-[#7fa68a]/15
              bg-[#7fa68a]/[0.035]
            "
          >
            {/* CTA Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-[#7fa68a]/[0.08] blur-[80px]" />

            <div className="relative">
              <div
                className="
                  inline-flex
                  items-center
                  justify-center
                  w-12 h-12
                  mb-5
                  rounded-xl
                  bg-[#7fa68a]/10
                  border border-[#7fa68a]/20
                  text-[#9fbea8]
                "
              >
                <Sparkles className="w-5 h-5" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                Ready to build with Tivion?
              </h2>

              <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-sm sm:text-base leading-relaxed">
                Create your account, get your API key and start integrating
                Tivion into your application.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">

                {/* Get API Key */}
                <motion.button
                  onClick={() => navigate('/signup')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="
                    flex items-center justify-center
                    gap-2.5
                    px-7 py-3.5
                    rounded-xl
                    bg-[#7fa68a]
                    text-[#0b100c]
                    font-semibold
                    hover:bg-[#91b09a]
                    transition-all duration-300
                    group
                  "
                >
                  <Zap className="w-4 h-4" />

                  <span>Get API Key</span>

                  <ChevronRight
                    className="
                      w-4 h-4
                      transition-transform
                      group-hover:translate-x-1
                    "
                  />
                </motion.button>

                {/* Documentation */}
                <motion.button
                  onClick={() => navigate('/documentation')}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="
                    flex items-center justify-center
                    gap-2.5
                    px-7 py-3.5
                    rounded-xl
                    border border-white/[0.1]
                    bg-white/[0.025]
                    text-gray-300
                    font-semibold
                    hover:bg-white/[0.05]
                    hover:border-[#7fa68a]/30
                    hover:text-white
                    transition-all duration-300
                    group
                  "
                >
                  <Sparkles className="w-4 h-4" />

                  <span>Documentation</span>

                  <ChevronRight
                    className="
                      w-4 h-4
                      opacity-0
                      -translate-x-1
                      group-hover:opacity-100
                      group-hover:translate-x-0
                      transition-all
                    "
                  />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default Api;

//have to add an things or page for Get API key

//have to add documentation for this api

//see that have to add for some others api

//have to add an things or page for Get API key

//have to add documentation for this api

//see that have to add for some others api

//neelabh shukla is a kind of the

//see that have to add for some others api


//see that have to add for some others api


//see that have to add for some others api


//have to add apii some other documents

//have to add the documents kdcmkodckodkc
//neelabh shukla is a kind of the

//tell me okk you are adding teh api key but which

//what to add on what to not

//have to delete all the old version of its api

//but wait what to change

//delete old apis restfull

//API keys are enough

//but what about those changes which came midway

//git changes to something which is unique anyhow