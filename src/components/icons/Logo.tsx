export default function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-[10px] bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center overflow-hidden`}
    >
      <img
        src="/images/memoracare.png"
        alt="MemoryCare"
        className="w-full h-full object-contain scale-[1.2] [filter:brightness(0)_invert(1)]"
      />
    </div>
  );
}