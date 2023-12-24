import React, { useState, useRef } from "react";
import { Send } from "react-feather";

interface ResizeableTextAreaProps {
  outputExpanded: boolean;
  message: string | number | readonly string[] | undefined;
  handleClick: () => void;
  loading: boolean;
  setMessage: (arg0: string) => void;
  isDisabled: boolean;
  ref?: React.RefObject<HTMLTextAreaElement>;
  placeholder: string;
  displayAtBottom?: boolean;
  transition?: boolean;
}

const ResizeableTextArea: React.FC<ResizeableTextAreaProps> = ({
  outputExpanded,
  message,
  handleClick,
  loading,
  setMessage,
  isDisabled,
  placeholder,
  displayAtBottom,
  transition,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  return (
    <div
      className={`flex h-20 mt-auto sticky transition-all duration-1000 ${
        displayAtBottom ? "absolute bottom-2 w-[98%]" : "w-full"
      } ${
        transition && outputExpanded ? "opacity-0" : "opacity-100"
      } ${transition}
      `}
    >
      <div className="w-full relative">
        <textarea
          ref={textAreaRef}
          aria-label="chat input"
          value={message}
          disabled={isDisabled}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className={`w-full scrollbar-hide min-h-[5rem] h-20 resize-none rounded-md border bg-white pl-6 pr-24 py-[25px] text-lg font-semibold placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-4 focus:ring-green-500/10 ${
            !outputExpanded
              ? "border-slate-900/10 shadow-[0_10px_40px_0px_rgba(0,0,0,0.15)]"
              : "border-none"
          }`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleClick();
            }
          }}
        />
        {!isDisabled && (
          <button
            onClick={(e) => {
              e.preventDefault();
              handleClick();
            }}
            className=" transition-all flex w-14 h-14 items-center justify-center rounded-full px-3 text-sm  bg-green-600 font-semibold text-white hover:bg-green-700 active:bg-green-800 absolute right-2 bottom-3 disabled:bg-green-100 disabled:text-green-400"
            type="submit"
            aria-label="Send"
            disabled={!message || loading}
          >
            <Send />
          </button>
        )}
      </div>
    </div>
  );
};

export default ResizeableTextArea;
