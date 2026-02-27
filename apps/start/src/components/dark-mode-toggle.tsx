import { IconCloud, IconStar } from "@tabler/icons-react";
import { motion } from "motion/react";
import type { Theme } from "@/lib/theme";

interface DarkModeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export function DarkModeToggle({ theme, onToggle }: DarkModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`p-1 w-11 rounded-full flex shadow-md relative bg-linear-to-br ${
        theme === "light"
          ? "justify-end from-blue-500 to-sky-300"
          : "justify-start from-secondary to-border"
      }`}
    >
      <Thumb mode={theme} />
      {theme === "light" && <Clouds />}
      {theme === "dark" && <Stars />}
    </button>
  );
}

function Thumb({ mode }: { mode: Theme }) {
  return (
    <motion.div
      layout
      transition={{
        duration: 0.75,
        type: "spring",
      }}
      className="size-4 rounded-full overflow-hidden shadow-md relative"
    >
      <div
        className={`absolute inset-0 ${
          mode === "dark"
            ? "bg-slate-100"
            : "animate-pulse bg-gradient-to-tr from-amber-300 to-yellow-500 rounded-full"
        }`}
      />
      {mode === "light" && <SunCenter />}
      {mode === "dark" && <MoonSpots />}
    </motion.div>
  );
}

function SunCenter() {
  return <div className="absolute inset-0.5 rounded-full bg-amber-300" />;
}

function MoonSpots() {
  return (
    <>
      <motion.div
        initial={{ x: -2, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="size-1.5 rounded-full bg-slate-300 absolute right-1 bottom-0.5"
      />
      <motion.div
        initial={{ x: -2, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="size-1.5 rounded-full bg-slate-300 absolute left-0.5 bottom-1.5"
      />
      <motion.div
        initial={{ x: -2, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="size-1 rounded-full bg-slate-300 absolute right-0.5 top-0.5"
      />
    </>
  );
}

function Stars() {
  return (
    <>
      <motion.span
        animate={{
          scale: [0.75, 1, 0.75],
          opacity: [0.75, 1, 0.75],
        }}
        transition={{
          repeat: Infinity,
          duration: 5,
          ease: "easeIn",
        }}
        className="text-slate-300 absolute right-5 top-0.5"
      >
        <IconStar className="size-1.5" />
      </motion.span>
      <motion.span
        animate={{
          scale: [1, 0.75, 1],
          opacity: [0.5, 0.25, 0.5],
        }}
        transition={{
          repeat: Infinity,
          duration: 3.5,
          ease: "easeIn",
        }}
        style={{ rotate: "-45deg" }}
        className="text-slate-300 absolute right-2 top-1"
      >
        <IconStar className="size-2" />
      </motion.span>
      <motion.span
        animate={{
          scale: [1, 0.5, 1],
          opacity: [1, 0.5, 1],
        }}
        style={{ rotate: "45deg" }}
        transition={{
          repeat: Infinity,
          duration: 2.5,
          ease: "easeIn",
        }}
        className="text-slate-300 absolute right-4 bottom-0.5"
      >
        <IconStar className="size-1.5" />
      </motion.span>
    </>
  );
}

function Clouds() {
  return (
    <>
      <motion.span
        animate={{ x: [-10, -7, -5, -2, 0], opacity: [0, 1, 0.75, 1, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          delay: 0.25,
        }}
        className="text-white absolute left-5 top-0"
      >
        <IconCloud className="size-1.5" />
      </motion.span>
      <motion.span
        animate={{ x: [-5, 0, 5, 10, 15], opacity: [0, 1, 0.75, 1, 0] }}
        transition={{
          duration: 20,
          repeat: Infinity,
          delay: 0.5,
        }}
        className="text-white absolute left-2 top-1.5"
      >
        <IconCloud className="size-2" />
      </motion.span>
      <motion.span
        animate={{ x: [-3, 0, 3, 7, 10], opacity: [0, 1, 0.75, 1, 0] }}
        transition={{
          duration: 12.5,
          repeat: Infinity,
        }}
        className="text-white absolute left-4.5 bottom-0.5"
      >
        <IconCloud className="size-1.5" />
      </motion.span>
      <motion.span
        animate={{ x: [-7, 0, 7, 14, 20], opacity: [0, 1, 0.75, 1, 0] }}
        transition={{
          duration: 25,
          repeat: Infinity,
          delay: 0.75,
        }}
        className="text-white absolute left-7 top-1.5"
      >
        <IconCloud className="size-1.5" />
      </motion.span>
    </>
  );
}
