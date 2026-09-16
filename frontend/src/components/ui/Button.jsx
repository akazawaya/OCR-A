const colorClasses = {
  gray: "bg-gray-200 text-black enabled:hover:bg-gray-400",
  indigo: "bg-indigo-500 text-white enabled:hover:bg-indigo-600",
  red: "bg-red-500 text-white enabled:hover:bg-red-600",
};

const Button = ({ className = "", color = "indigo", ...props }) => {
  return (
    <button
      className={`w-fit rounded-md px-2 py-1 transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-400 ${colorClasses[color]} ${className}`}
      {...props}
    />
  );
};

export default Button;
