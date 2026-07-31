import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, HelpCircle, Sparkles, Zap } from 'lucide-react';

const Faqs = () => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [showAllFaqs, setShowAllFaqs] = useState(false);

  const faqData = [
   {
    question: "What is Tivion?",
    answer:
      "Tivion is an all-in-one AI platform that helps you generate articles, blog titles, AI images, remove image backgrounds and objects, review resumes, and much more—all from a single, easy-to-use platform."
  },
  {
    question: "Do I need any technical knowledge to use Tivion?",
    answer:
      "Not at all! Tivion is built for everyone. Simply sign up, choose an AI tool, enter your prompt, and let our AI do the work in seconds."
  },
  {
    question: "Is Tivion free to use?",
    answer:
      "Yes! Every new user receives **30 free AI generations** to explore all of Tivion's powerful tools. Once you've used your free generations, you can upgrade to Tivion Pro for higher limits and premium features."
  },
  {
    question: "What AI tools does Tivion offer?",
    answer:
      "Tivion includes AI Article Writer, Blog Title Generator, AI Image Generator, Background Remover, Object Remover, Resume Reviewer, and many more productivity tools, with new features added regularly."
  },
  {
    question: "Is my data safe on Tivion?",
    answer:
      "Absolutely. Your privacy and security are our top priorities. Tivion uses secure authentication, encrypted connections, and industry-standard security practices to keep your data safe."
  },
  {
    question: "How can I contact Tivion support?",
    answer:
      "Need help? You can reach our support team anytime through the Contact page or by email. We'll be happy to assist you with any questions or issues."
  }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  const displayedFaqs = showAllFaqs ? faqData : faqData.slice(0, 6);

  return (
    <div className="px-4 sm:px-20 xl:px-32 py-20 bg-black relative overflow-hidden">
      {/* Floating gradient elements - purple/blue theme for dark background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 text-center max-w-6xl mx-auto">

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-white text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
        >
          FAQs
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed"
        >
          Find answers to common questions about our AI tools and services
        </motion.p>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto mt-16">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          {/* Left Side - Image */}
       
<motion.div
  initial={{ opacity: 0, x: -100 }}
  whileInView={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.7 }}
  viewport={{ once: true }}
  className="lg:w-2/5 w-full hidden lg:flex justify-center"
>
  <div className="w-[420px] h-[420px] rounded-3xl overflow-hidden border border-gray-700 bg-gray-900 shadow-xl">
    <img
     src="/images/forfavicon.jpeg" alt="FAQ"
      className="w-full h-full object-cover"
    />
  </div>
</motion.div>

          {/* Right Side - FAQs */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            viewport={{ once: true }}
            className="lg:w-3/5 w-full"
          >
            <div className="space-y-2">
              {displayedFaqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <motion.div
                    className="p-4 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/20 shadow-md hover:shadow-[0_5px_15px_rgba(168,85,247,0.1)] transition-all duration-200 cursor-pointer overflow-hidden relative"
                    onClick={() => toggleFAQ(index)}
                    whileHover={{ scale: 1.005 }}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 overflow-hidden z-0 rounded-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 -translate-x-full group-hover:translate-x-full group-hover:duration-800" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500/10 rounded-md flex items-center justify-center shadow-sm backdrop-blur-sm border border-purple-500/15 transition-all duration-200 group-hover:scale-102 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] group-hover:border-purple-400/30">
                            <HelpCircle className="w-4 h-4 text-purple-400" />
                          </div>
                          <h3 className="text-base font-medium text-white group-hover:text-purple-100 transition-colors duration-200 pr-3">
                            {faq.question}
                          </h3>
                        </div>
                        <motion.div
                          animate={{ rotate: activeIndex === index ? 180 : 0 }}
                          transition={{ duration: 0.15 }}
                          className="w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center border border-gray-600 group-hover:border-purple-500/30 group-hover:bg-purple-500/5 transition-all duration-200 flex-shrink-0"
                        >
                          <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-purple-400 transition-colors duration-200" />
                        </motion.div>
                      </div>

                      <AnimatePresence>
                        {activeIndex === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <motion.p
                              initial={{ opacity: 0, y: -3 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: 0.05 }}
                              className="text-gray-300 text-sm leading-relaxed mt-3 pl-11 border-t border-gray-700/30 pt-3"
                            >
                              {faq.answer}
                            </motion.p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>

          

            
          </motion.div>
        </div>
      </div>

   
    </div>
  );
};

export default Faqs;