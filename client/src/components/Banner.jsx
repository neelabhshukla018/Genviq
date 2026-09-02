import React from 'react';
import { motion } from 'framer-motion';

const Banner = () => {
  const bannerItems = [
    {
      id: 1,
      text: "Star Us on GitHub",
      link: "https://github.com/neelabhshukla018",
    },
    {
      id: 2,
      text: "Follow on Instagram",
      link: "https://www.instagram.com/satyam_shukla_1845/",
    },
    {
      id: 3,
      text: "Connect on LinkedIn",
      link: "https://www.linkedin.com/in/neelabh18shukla/",
    },
    {
      id: 4,
      text: "Follow on Facebook",
      link: "https://www.facebook.com/profile.php?fb_profile_edit_entry_point=%7B%22click_point%22%3A%22edit_profile_button%22%2C%22feature%22%3A%22profile_header%22%7D&id=61575832483919&sk=about",
    },
    {
      id: 5,
      text: "Follow on Twitter",
      link: "https://x.com/Neelabh01845",
    },
  ];

  const duplicatedItems = [...bannerItems, ...bannerItems];

  return (
    <div className="w-full bg-[#F6F6F6] py-6 overflow-hidden border-y-2 border-purple-400/30 relative">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 25,
            ease: "linear",
          },
        }}
      >
        {duplicatedItems.map((item, index) => (
          <a
            key={`${item.id}-${index}`}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mx-6 px-5 py-3 bg-black/90 backdrop-blur-sm rounded-xl border border-purple-400/40 shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all duration-300 hover:scale-105 hover:border-purple-400/70 group cursor-pointer relative"
          >
           
            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-full group-hover:translate-x-full" />
            </div>

            {item.icon && (
              <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">
                {item.icon}
              </span>
            )}

            <span className="text-white font-semibold text-base tracking-wide group-hover:text-purple-200 transition-colors duration-300">
              {item.text}
            </span>

            <div className="ml-3 w-1.5 h-1.5 bg-purple-400 rounded-full group-hover:animate-pulse" />
          </a>
        ))}
      </motion.div>

      <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-[#F6F6F6] to-transparent z-10" />
      <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-[#F6F6F6] to-transparent z-10" />
    </div>
  );
};

export default Banner;


//banner have to add it a subscription route