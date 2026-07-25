import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const baseInputClassName = `w-full rounded border border-gray-300 bg-gray-100 p-1 text-left leading-1 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200 `;
const TextInput = ({ className = "", type = "text", ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  if (type !== "password") {
    return (
      <input
        className={`${baseInputClassName} ${className}`}
        type={type}
        {...props}
      />
    );
  }
  return (
    <div className="relative w-full">
      <input
        className={`${baseInputClassName} ${className}`}
        type={isPasswordVisible ? "text" : "password"}
        {...props}
      />
      <button
        className="absolute top-1/2 right-1 -translate-y-1/2 p-1"
        type="button"
        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
      >
        {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export default TextInput;
