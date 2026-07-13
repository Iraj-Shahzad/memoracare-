export default function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-[10px] bg-white flex items-center justify-center overflow-hidden`}
    >
      <img
        src="/images/memoracare.png"
        alt="MemoryCare"
        className="w-full h-full object-contain"
      />
    </div>
  );
}