import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  ChevronRight,
  Loader2,
  CheckCircle,
  X,
} from "lucide-react";

import Navbar from "../components/Navbar";

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupType, setPopupType] = useState("success");
  const [activeHelp, setActiveHelp] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Reach out for support or business inquiries",
      details: "support@tivion.ai",
      link: "mailto:supporttivion@gmail.com",
    },

    {
      icon: Phone,
      title: "Call Us",
      description: "Monday - Friday",
      details: "+91 7307551612",
      link: "tel:+917307551612",
    },

{
  icon: MapPin,
  title: "Location",
  description: "Visit Our Location",
  details: "Indira Nagar Sector-11, Lucknow, Uttar Pradesh",
  link: "https://www.google.com/maps/search/?api=1&query=Indira+Nagar+Sector+11+Lucknow+Uttar+Pradesh",
},

    {
      icon: Clock,
      title: "Response Time",
      description: "Average Response",
      details: "Within 2–4 Hours",
      link: "#",
    },
  ];

  const quickHelp = [
    {
      question: "How do I get started with Tivion?",
      answer:
        "Create your free account and instantly receive 30 free AI generations. Pick any AI tool, enter your prompt, and start creating.",
    },
    {
      question: "How do the 30 free AI generations work?",
      answer:
        "Every new user receives 30 free AI generations that can be used across all Tivion AI tools before upgrading to Tivion Pro.",
    },
    {
      question: "What AI tools are available?",
      answer:
        "Tivion includes AI Article Writer, AI Image Generator, Resume Reviewer, Blog Title Generator, Background Remover, Object Remover, and many more.",
    },
    {
      question: "How can I contact Tivion Support?",
      answer:
        "Use the contact form on this page or email us directly. Our support team is always happy to help.",
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      await fetch("https://formspree.io/f/xykrazzn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      setPopupType("success");

      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setPopupType("error");
    } finally {
      setIsSubmitting(false);
      setShowPopup(true);

      setTimeout(() => {
        setShowPopup(false);
      }, 5000);
    }
  };

  return (
  <div className="min-h-screen bg-black text-white relative overflow-hidden">
    <Navbar />

    {/* Background Glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]" />
    </div>

    {/* Background Video */}
    <div className="fixed bottom-0 left-0 w-full h-1/2 z-0">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
      >
        <source src="/videos/footer.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent backdrop-blur-[2px]" />
    </div>

    {/* Success / Error Popup */}

    <AnimatePresence>
      {showPopup && (
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div
            className={`relative rounded-2xl border backdrop-blur-xl shadow-2xl overflow-hidden p-6 ${
              popupType === "success"
                ? "bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/30"
                : "bg-gradient-to-r from-red-900/40 to-orange-900/40 border-red-500/30"
            }`}
          >
            <button
              onClick={() => setShowPopup(false)}
              className="absolute right-3 top-3 p-1 rounded-lg bg-white/10 border border-white/20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">

              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                  popupType === "success"
                    ? "bg-green-500/20 border-green-500/30"
                    : "bg-red-500/20 border-red-500/30"
                }`}
              >
                {popupType === "success" ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <X className="w-6 h-6 text-red-400" />
                )}
              </div>

              <div>
                <h3
                  className={`text-lg font-bold ${
                    popupType === "success"
                      ? "text-green-200"
                      : "text-red-200"
                  }`}
                >
                  {popupType === "success"
                    ? "Message Sent Successfully 🎉"
                    : "Something Went Wrong"}
                </h3>

                <p className="text-sm text-gray-200 mt-1">
                  {popupType === "success"
                    ? "Thank you for contacting Tivion. We'll get back to you shortly."
                    : "Please try again or contact us via email."}
                </p>
              </div>
            </div>

            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              className={`absolute bottom-0 left-0 h-1 w-full origin-left ${
                popupType === "success"
                  ? "bg-green-400"
                  : "bg-red-400"
              }`}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Hero Section */}

    <section className="relative pt-32 pb-20 px-4 sm:px-20 xl:px-32 z-10">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.15 }}
        className="max-w-6xl mx-auto text-center"
      >

        <motion.h1
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
        >
          CONTACT US
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: .15 }}
          className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto"
        >
          Have questions about Tivion or need assistance?
          Our team is always here to help you.
        </motion.p>

      </motion.div>

      {/* Contact Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">

        {contactInfo.map((item, index) => (

          <motion.a
            key={index}
            href={item.link}
            whileHover={{
              y: -8,
              scale: 1.02
            }}
            className="group rounded-2xl bg-gray-900/80 border border-gray-700/40 backdrop-blur-xl p-6 transition-all duration-300 hover:border-purple-500/50"
          >

            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-5">
              <item.icon className="w-6 h-6 text-purple-400" />
            </div>

            <h3 className="text-xl font-bold">
              {item.title}
            </h3>

            <p className="text-gray-400 mt-2 text-sm">
              {item.description}
            </p>

            <p className="text-white mt-3 font-medium">
              {item.details}
            </p>

          </motion.a>

        ))}

      </div>

    </section>

    <section className="py-20 px-4 sm:px-20 xl:px-32 relative z-10">

  <div className="max-w-6xl mx-auto">

    <div className="grid lg:grid-cols-2 gap-12 items-start">

      {/* Contact Form */}

      <motion.div
        initial={{ opacity: 0, scale: .96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="rounded-2xl bg-gray-900/40 backdrop-blur-xl border border-white/10 shadow-2xl p-8 relative overflow-hidden"
      >

        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />

        <div className="relative z-10">

          <div className="flex items-center gap-3 mb-8">

            <MessageCircle className="w-6 h-6 text-purple-400" />

            <h2 className="text-3xl font-bold">
              Send us a Message
            </h2>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div className="grid md:grid-cols-2 gap-6">

              <input
                name="name"
                placeholder="Your Name"
                required
                value={formData.name}
                onChange={(e)=>setFormData({...formData,name:e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 outline-none"
              />

              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={formData.email}
                onChange={(e)=>setFormData({...formData,email:e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 outline-none"
              />

            </div>

            <input
              name="subject"
              placeholder="Subject"
              required
              value={formData.subject}
              onChange={(e)=>setFormData({...formData,subject:e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-400 outline-none"
            />

            <textarea
              rows="6"
              name="message"
              placeholder="Write your message..."
              required
              value={formData.message}
              onChange={(e)=>setFormData({...formData,message:e.target.value})}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 resize-none focus:border-purple-400 outline-none"
            />

            <motion.button
              whileHover={{ scale:1.02 }}
              whileTap={{ scale:.98 }}
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 font-semibold flex justify-center items-center gap-3 disabled:opacity-50"
            >

              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin"/>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5"/>
                  Send Message
                </>
              )}

            </motion.button>

          </form>

        </div>

      </motion.div>

      {/* Right Side */}

      <motion.div
        initial={{ opacity:0,y:50 }}
        whileInView={{ opacity:1,y:0 }}
        viewport={{ once:true }}
        className="space-y-8"
      >

        <h2 className="text-5xl font-bold">
          Let's <span className="text-purple-400">Connect</span>
        </h2>

        <p className="text-lg text-gray-300 leading-relaxed">
          Whether you have questions about Tivion,
          your AI generations, subscriptions or features,
          our team is always ready to help.
        </p>

        {/* Quick Help */}

        <div className="rounded-2xl bg-gray-900/60 border border-white/10 backdrop-blur-md p-6">

          <h3 className="text-2xl font-bold mb-6">
            Quick Help
          </h3>

          <div className="space-y-3">

            {quickHelp.map((item,index)=>(

              <div
                key={index}
                className="border-b border-white/10 last:border-none pb-3"
              >

                <button
                  onClick={()=>setActiveHelp(activeHelp===index?null:index)}
                  className="w-full flex justify-between items-center text-left"
                >

                  <span className="font-medium text-white">
                    {item.question}
                  </span>

                  <motion.div
                    animate={{
                      rotate:activeHelp===index?90:0
                    }}
                    transition={{duration:.25}}
                  >
                    <ChevronRight className="w-5 h-5 text-purple-400"/>
                  </motion.div>

                </button>

                <AnimatePresence>

                  {activeHelp===index && (

                    <motion.div
                      initial={{height:0,opacity:0}}
                      animate={{height:"auto",opacity:1}}
                      exit={{height:0,opacity:0}}
                      transition={{duration:.25}}
                      className="overflow-hidden"
                    >

                      <p className="text-gray-400 leading-relaxed mt-3">
                        {item.answer}
                      </p>

                    </motion.div>

                  )}

                </AnimatePresence>

              </div>

            ))}

          </div>

        </div>

      </motion.div>

    </div>

  </div>

</section>

</div>
);
};

export default Contact;