const TextInput = ({ className = "", type = "text", ...props }) => {
  return (
    <input
      className={`w-fit rounded border border-gray-300 bg-gray-100 p-1 text-left leading-1 text-gray-700 transition-colors duration-200 outline-none focus:border-indigo-500 focus:bg-transparent focus:ring-2 focus:ring-indigo-200 ${className}`}
      type={type}
      {...props}
    />
  );
};

export default TextInput;
